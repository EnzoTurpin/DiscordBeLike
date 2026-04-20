const express = require('express');
const { createServer } = require('http');
const { Server } = require('socket.io');
const fs = require('fs');
const path = require('path');

const PORT = 3001;
const DB_PATH = path.join(__dirname, 'data.json');

// ─── Persistance JSON simple ───

let db = { users: {}, friendships: [], messages: [] };

function loadDb() {
  try {
    db = JSON.parse(fs.readFileSync(DB_PATH, 'utf-8'));
  } catch {
    db = { users: {}, friendships: [], messages: [] };
  }
}

function saveDb() {
  fs.writeFileSync(DB_PATH, JSON.stringify(db, null, 2));
}

loadDb();

// ─── Helpers ───

function getConversationId(a, b) {
  return [a, b].sort().join('::');
}

function getFriendships(userId) {
  const accepted = db.friendships
    .filter(f => f.status === 'accepted' && (f.from === userId || f.to === userId))
    .map(f => {
      const friendId = f.from === userId ? f.to : f.from;
      return db.users[friendId] ? { id: friendId, ...db.users[friendId] } : null;
    })
    .filter(Boolean);

  const pendingOut = db.friendships
    .filter(f => f.status === 'pending' && f.from === userId)
    .map(f => db.users[f.to] ? { id: f.to, ...db.users[f.to] } : null)
    .filter(Boolean);

  const pendingIn = db.friendships
    .filter(f => f.status === 'pending' && f.to === userId)
    .map(f => db.users[f.from] ? { id: f.from, ...db.users[f.from] } : null)
    .filter(Boolean);

  return { accepted, pendingOut, pendingIn };
}

function hasFriendship(a, b) {
  return db.friendships.some(f =>
    (f.from === a && f.to === b) || (f.from === b && f.to === a)
  );
}

// ─── Serveur ───

const app = express();
const httpServer = createServer(app);
const io = new Server(httpServer, {
  cors: { origin: '*' },
});

// socketId → userId
const connectedUsers = new Map();
// userId → socketId
const userSockets = new Map();

io.on('connection', (socket) => {
  // ── Inscription ──
  socket.on('register', ({ username }) => {
    const userId = username;

    db.users[userId] = { username };
    saveDb();

    connectedUsers.set(socket.id, userId);
    userSockets.set(userId, socket.id);

    socket.emit('registered', { userId, username });
    socket.emit('friends:updated', getFriendships(userId));

    // Notifier les amis que cet user est maintenant en ligne
    const { accepted } = getFriendships(userId);
    accepted.forEach(f => {
      const fSocket = userSockets.get(f.id);
      if (fSocket) {
        io.to(fSocket).emit('friend:online', { userId, username });
      }
    });
  });

  // ── Demande d'ami ──
  socket.on('friends:request', ({ targetId }) => {
    const userId = connectedUsers.get(socket.id);
    if (!userId || userId === targetId) return;

    if (!db.users[targetId]) {
      socket.emit('error', { message: `Utilisateur "${targetId}" introuvable.` });
      return;
    }

    if (hasFriendship(userId, targetId)) {
      socket.emit('error', { message: 'Demande déjà envoyée ou vous êtes déjà amis.' });
      return;
    }

    db.friendships.push({ from: userId, to: targetId, status: 'pending' });
    saveDb();

    socket.emit('friends:updated', getFriendships(userId));

    const targetSocket = userSockets.get(targetId);
    if (targetSocket) {
      io.to(targetSocket).emit('friends:updated', getFriendships(targetId));
      io.to(targetSocket).emit('friends:request:incoming', {
        fromId: userId,
        fromName: db.users[userId]?.username || userId,
      });
    }
  });

  // ── Accepter ──
  socket.on('friends:accept', ({ requesterId }) => {
    const userId = connectedUsers.get(socket.id);
    if (!userId) return;

    const f = db.friendships.find(f => f.from === requesterId && f.to === userId && f.status === 'pending');
    if (!f) return;
    f.status = 'accepted';
    saveDb();

    socket.emit('friends:updated', getFriendships(userId));

    const rSocket = userSockets.get(requesterId);
    if (rSocket) io.to(rSocket).emit('friends:updated', getFriendships(requesterId));
  });

  // ── Refuser / Annuler ──
  socket.on('friends:decline', ({ requesterId }) => {
    const userId = connectedUsers.get(socket.id);
    if (!userId) return;

    db.friendships = db.friendships.filter(
      f => !(f.from === requesterId && f.to === userId && f.status === 'pending')
    );
    saveDb();

    socket.emit('friends:updated', getFriendships(userId));
  });

  socket.on('friends:cancel', ({ targetId }) => {
    const userId = connectedUsers.get(socket.id);
    if (!userId) return;

    db.friendships = db.friendships.filter(
      f => !(f.from === userId && f.to === targetId && f.status === 'pending')
    );
    saveDb();

    socket.emit('friends:updated', getFriendships(userId));
  });

  // ── Supprimer ami ──
  socket.on('friends:remove', ({ friendId }) => {
    const userId = connectedUsers.get(socket.id);
    if (!userId) return;

    db.friendships = db.friendships.filter(
      f => !((f.from === userId && f.to === friendId) || (f.from === friendId && f.to === userId))
    );
    saveDb();

    socket.emit('friends:updated', getFriendships(userId));

    const fSocket = userSockets.get(friendId);
    if (fSocket) io.to(fSocket).emit('friends:updated', getFriendships(friendId));
  });

  // ── Envoyer un message DM ──
  socket.on('dm:send', ({ toId, content }) => {
    const userId = connectedUsers.get(socket.id);
    if (!userId || !content?.trim()) return;

    const user = db.users[userId];
    if (!user) return;

    const convId = getConversationId(userId, toId);
    const initials = user.username.split(/\s+/).map(w => w[0]?.toUpperCase() ?? '').slice(0, 2).join('') || 'U';

    const msg = {
      id: `msg-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
      conversationId: convId,
      authorId: userId,
      authorName: user.username,
      authorAvatar: initials,
      content: content.trim(),
      timestamp: Date.now(),
    };

    db.messages.push(msg);
    // Garder max 500 messages par conversation pour éviter que le fichier grossisse trop
    if (db.messages.length > 5000) db.messages = db.messages.slice(-5000);
    saveDb();

    socket.emit('dm:message', msg);

    const toSocket = userSockets.get(toId);
    if (toSocket) io.to(toSocket).emit('dm:message', msg);
  });

  // ── Historique DM ──
  socket.on('dm:history', ({ withId }) => {
    const userId = connectedUsers.get(socket.id);
    if (!userId) return;

    const convId = getConversationId(userId, withId);
    const messages = db.messages
      .filter(m => m.conversationId === convId)
      .slice(-100);

    socket.emit('dm:history', { convId, messages });
  });

  // ── Indicateur de frappe ──
  socket.on('typing:start', ({ toId }) => {
    const userId = connectedUsers.get(socket.id);
    if (!userId) return;
    const toSocket = userSockets.get(toId);
    if (toSocket) io.to(toSocket).emit('typing:update', { fromId: userId, typing: true });
  });

  socket.on('typing:stop', ({ toId }) => {
    const userId = connectedUsers.get(socket.id);
    if (!userId) return;
    const toSocket = userSockets.get(toId);
    if (toSocket) io.to(toSocket).emit('typing:update', { fromId: userId, typing: false });
  });

  // ── Déconnexion ──
  socket.on('disconnect', () => {
    const userId = connectedUsers.get(socket.id);
    if (!userId) return;

    connectedUsers.delete(socket.id);
    userSockets.delete(userId);

    const { accepted } = getFriendships(userId);
    accepted.forEach(f => {
      const fSocket = userSockets.get(f.id);
      if (fSocket) io.to(fSocket).emit('friend:offline', { userId });
    });
  });
});

httpServer.listen(PORT, () => {
  console.log(`\n🟢 Serveur DiscordBeLike démarré sur le port ${PORT}`);
  console.log(`   Les deux instances doivent être sur le même réseau.\n`);
});
