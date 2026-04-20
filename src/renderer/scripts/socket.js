// ─── Client Socket.io ───
// Gère la connexion temps réel avec le serveur.

const SOCKET_URL = "http://172.20.10.3:3001";

let _socket = null;
let _myUserId = null;
let _currentRealDmPartnerId = null;
let _currentRealDmPartnerName = null;
let _connected = false;
let _typingTimeout = null;
const _realUnread = new Set(); // convIds avec messages non lus

// ─── Init ───

function initSocket(username) {
  _socket = io(SOCKET_URL, {
    reconnectionAttempts: 5,
    timeout: 5000,
  });

  _socket.on("connect", () => {
    _connected = true;
    _socket.emit("register", { username });
    setConnectionBadge("online");
  });

  _socket.on("connect_error", () => {
    _connected = false;
    setConnectionBadge("offline");
  });

  _socket.on("disconnect", () => {
    _connected = false;
    setConnectionBadge("offline");
  });

  _socket.on("registered", ({ userId }) => {
    _myUserId = userId;
    window._myUserId = userId;
  });

  _socket.on("friends:updated", (data) => {
    window._realFriends = data;
    if (activeServerId === "home") {
      const server = getServerById("home");
      if (server) renderChannelSidebar(server);
    }
    renderFriendRequestBadge(data.pendingIn.length);
  });

  _socket.on("friends:request:incoming", ({ fromName }) => {
    showToast(`Nouvelle demande d'ami de ${fromName}`);
  });

  _socket.on("friend:online", ({ userId }) => {
    updateRealFriendStatus(userId, "online");
  });

  _socket.on("friend:offline", ({ userId }) => {
    updateRealFriendStatus(userId, "offline");
  });

  _socket.on("dm:message", (msg) => {
    const channelId = "real::" + msg.conversationId;
    const formatted = formatServerMsg(msg);

    if (!SESSION_MESSAGES[channelId]) SESSION_MESSAGES[channelId] = [];
    SESSION_MESSAGES[channelId].push(formatted);

    if (activeChannelId === channelId) {
      appendNewMessage(channelId, formatted);
    } else {
      _realUnread.add(msg.conversationId);
      updateRealDmBadge(msg.conversationId);
      showToast(
        `Message de ${msg.authorName}: ${msg.content.slice(0, 40)}${msg.content.length > 40 ? "…" : ""}`,
      );
    }
  });

  _socket.on("dm:history", ({ convId, messages }) => {
    const channelId = "real::" + convId;
    SESSION_MESSAGES[channelId] = messages.map(formatServerMsg);

    if (activeChannelId === channelId) {
      renderMessages(channelId, _currentRealDmPartnerName, "dm");
    }
  });

  _socket.on("typing:update", ({ fromId, typing }) => {
    if (!_myUserId) return;
    const convId = getConversationId(_myUserId, fromId);
    if (activeChannelId === "real::" + convId) {
      if (typing) {
        const name = fromId.split("#")[0];
        showTypingIndicator(name);
      } else {
        hideTypingIndicator();
      }
    }
  });

  _socket.on("error", ({ message }) => {
    showToast(message, "error");
  });
}

// ─── Helpers ───

function formatServerMsg(msg) {
  return {
    id: msg.id,
    authorId: msg.authorId === _myUserId ? "me" : msg.authorId,
    author: msg.authorName,
    avatar: msg.authorAvatar,
    content: msg.content,
    timestamp: new Date(msg.timestamp),
    isMine: msg.authorId === _myUserId,
  };
}

function getConversationId(a, b) {
  return [a, b].sort().join("::");
}

function isRealDmChannel(channelId) {
  return typeof channelId === "string" && channelId.startsWith("real::");
}

// ─── Actions ───

function socketAddFriend(targetId) {
  if (!_socket || !_connected) {
    showToast("Non connecté au serveur.", "error");
    return;
  }
  _socket.emit("friends:request", { targetId });
}

function socketAcceptFriend(requesterId) {
  _socket?.emit("friends:accept", { requesterId });
}

function socketDeclineFriend(requesterId) {
  _socket?.emit("friends:decline", { requesterId });
}

function socketCancelRequest(targetId) {
  _socket?.emit("friends:cancel", { targetId });
}

function socketRemoveFriend(friendId) {
  _socket?.emit("friends:remove", { friendId });
}

function socketSendDm(content) {
  if (!_socket || !_currentRealDmPartnerId || !content.trim()) return;
  _socket.emit("dm:send", {
    toId: _currentRealDmPartnerId,
    content: content.trim(),
  });
}

function socketNotifyTyping() {
  if (!_socket || !_currentRealDmPartnerId) return;
  _socket.emit("typing:start", { toId: _currentRealDmPartnerId });
  clearTimeout(_typingTimeout);
  _typingTimeout = setTimeout(() => {
    _socket.emit("typing:stop", { toId: _currentRealDmPartnerId });
  }, 3000);
}

// ─── Navigation vers un DM réel ───

function selectRealDmChannel(friendId, friendName) {
  if (!_myUserId) {
    showToast("Connexion au serveur en cours…", "error");
    return;
  }

  const convId = getConversationId(_myUserId, friendId);
  const channelId = "real::" + convId;

  _currentRealDmPartnerId = friendId;
  _currentRealDmPartnerName = friendName;

  activeChannelId = channelId;
  _activeChannelType = "dm";
  _activeChannelName = friendName;

  _realUnread.delete(convId);
  updateRealDmBadge(convId, 0);

  document
    .querySelectorAll(".channel-item, .dm-item, .real-friend-item")
    .forEach((el) => {
      el.classList.toggle(
        "active",
        el.dataset.id === channelId || el.dataset.friendId === friendId,
      );
    });

  setTitlebarTitle(`Messages Privés — ${friendName}`);
  updateChatHeader(channelId, friendName, "dm");

  const input = document.getElementById("message-input");
  if (input) input.dataset.placeholder = `Envoyer un message à ${friendName}`;

  closeMembersPanel?.();

  const container = document.getElementById("messages-container");
  const staticEmpty = document.getElementById("chat-empty-state");
  if (staticEmpty) staticEmpty.style.display = "none";

  if (SESSION_MESSAGES[channelId]) {
    renderMessages(channelId, friendName, "dm");
  } else {
    container.innerHTML =
      '<div class="real-dm-loading">Chargement des messages…</div>';
    _socket?.emit("dm:history", { withId: friendId });
  }
}

// ─── UI helpers ───

function setConnectionBadge(status) {
  let badge = document.getElementById("socket-status-badge");
  if (!badge) {
    badge = document.createElement("div");
    badge.id = "socket-status-badge";
    badge.className = "socket-status-badge";
    document.getElementById("user-panel")?.appendChild(badge);
  }
  badge.dataset.status = status;
  badge.title = status === "online" ? "Serveur connecté" : "Serveur hors ligne";
}

function updateRealFriendStatus(userId, status) {
  const el = document.querySelector(
    `.real-friend-item[data-friend-id="${userId}"] .dm-status`,
  );
  if (el) {
    el.className = `dm-status status-${status}`;
  }
}

function updateRealDmBadge(convId, count) {
  const unreadCount =
    count !== undefined ? count : _realUnread.has(convId) ? 1 : 0;
  const el = document.querySelector(
    `.real-friend-item[data-conv-id="${convId}"] .unread-badge`,
  );
  if (el) {
    el.style.display = unreadCount > 0 ? "" : "none";
  }
  // Ajoute/retire la classe has-unread
  const item = document.querySelector(
    `.real-friend-item[data-conv-id="${convId}"]`,
  );
  if (item) item.classList.toggle("has-unread", unreadCount > 0);
}

function renderFriendRequestBadge(count) {
  const btn = document.getElementById("add-friend-btn");
  if (!btn) return;
  let badge = btn.querySelector(".request-badge");
  if (count > 0) {
    if (!badge) {
      badge = document.createElement("span");
      badge.className = "request-badge";
      btn.appendChild(badge);
    }
    badge.textContent = count;
  } else {
    badge?.remove();
  }
}

// ─── Toast notification ───

function showToast(message, type = "info") {
  const existing = document.getElementById("socket-toast");
  existing?.remove();

  const toast = document.createElement("div");
  toast.id = "socket-toast";
  toast.className = `socket-toast ${type}`;
  toast.textContent = message;
  document.body.appendChild(toast);

  requestAnimationFrame(() => toast.classList.add("visible"));
  setTimeout(() => {
    toast.classList.remove("visible");
    setTimeout(() => toast.remove(), 300);
  }, 3500);
}

window._socketClient = {
  isRealDmChannel,
  sendDm: socketSendDm,
  notifyTyping: socketNotifyTyping,
  addFriend: socketAddFriend,
  acceptFriend: socketAcceptFriend,
  declineFriend: socketDeclineFriend,
  cancelRequest: socketCancelRequest,
  removeFriend: socketRemoveFriend,
  openDm: selectRealDmChannel,
};
