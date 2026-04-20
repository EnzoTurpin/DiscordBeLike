const SESSION_MESSAGES = {};
const MESSAGE_REACTIONS = {};

let _currentChannelId = null;
let _replyTarget = null;
let _typingUserTimeout = null;
let _fakeTypingTimeout = null;

function processContent(text) {
  let s = text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
  s = s.replace(/`([^`\n]+)`/g, '<code class="inline-code">$1</code>');
  s = s.replace(/\*\*([^*]+)\*\*/g, '<strong>$1</strong>');
  s = s.replace(/\*([^*\n]+)\*/g, '<em>$1</em>');
  s = s.replace(/\n/g, '<br>');
  return s;
}

function formatTime(date) {
  return date.toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' });
}

function formatTimestamp(date) {
  const now = new Date();
  const yesterday = new Date(now);
  yesterday.setDate(yesterday.getDate() - 1);
  if (date.toDateString() === now.toDateString()) return `aujourd'hui à ${formatTime(date)}`;
  if (date.toDateString() === yesterday.toDateString()) return `hier à ${formatTime(date)}`;
  return date.toLocaleDateString('fr-FR', { day: 'numeric', month: 'long', year: 'numeric' }) + ` à ${formatTime(date)}`;
}

function shouldGroup(prev, curr) {
  if (!prev || prev.authorId !== curr.authorId) return false;
  return (curr.timestamp - prev.timestamp) < 5 * 60 * 1000;
}

function getChannelMessages(channelId) {
  if (!SESSION_MESSAGES[channelId]) {
    SESSION_MESSAGES[channelId] = (MOCK_MESSAGES[channelId] || []).map(m => ({
      ...m,
      timestamp: m.timestamp instanceof Date ? m.timestamp : new Date(m.timestamp),
    }));
  }
  return SESSION_MESSAGES[channelId];
}

function pushMessage(channelId, content) {
  const msgs = getChannelMessages(channelId);
  const cfg = window._userConfig || { username: 'Utilisateur' };
  const initials = cfg.username.split(/\s+/).map(w => w[0]?.toUpperCase() ?? '').slice(0, 2).join('') || 'U';
  const msg = {
    id: `msg-${Date.now()}`,
    authorId: 'me',
    author: cfg.username,
    avatar: initials,
    content,
    timestamp: new Date(),
    isMine: true,
  };
  msgs.push(msg);
  return msg;
}

// ─── DOM builders ───

function buildToolbar() {
  const div = document.createElement('div');
  div.className = 'message-toolbar';
  div.innerHTML = `
    <button class="toolbar-btn" data-action="react" title="Ajouter une réaction">
      <svg viewBox="0 0 24 24" width="16" height="16">
        <path fill="currentColor" d="M11.99 2C6.47 2 2 6.48 2 12s4.47 10 9.99 10C17.52 22 22 17.52 22 12S17.52 2 11.99 2zM12 20c-4.42 0-8-3.58-8-8s3.58-8 8-8 8 3.58 8 8-3.58 8-8 8zm3.5-9c.83 0 1.5-.67 1.5-1.5S16.33 8 15.5 8 14 8.67 14 9.5s.67 1.5 1.5 1.5zm-7 0c.83 0 1.5-.67 1.5-1.5S9.33 8 8.5 8 7 8.67 7 9.5 7.67 11 8.5 11zm3.5 6.5c2.33 0 4.31-1.46 5.11-3.5H6.89c.8 2.04 2.78 3.5 5.11 3.5z"/>
      </svg>
    </button>
    <button class="toolbar-btn" data-action="reply" title="Répondre">
      <svg viewBox="0 0 24 24" width="16" height="16">
        <path fill="currentColor" d="M10 9V5l-7 7 7 7v-4.1c5 0 8.5 1.6 11 5.1-1-5-4-10-11-11z"/>
      </svg>
    </button>
    <button class="toolbar-btn" data-action="more" title="Plus d'options">
      <svg viewBox="0 0 24 24" width="16" height="16">
        <path fill="currentColor" d="M6 10c-1.1 0-2 .9-2 2s.9 2 2 2 2-.9 2-2-.9-2-2-2zm12 0c-1.1 0-2 .9-2 2s.9 2 2 2 2-.9 2-2-.9-2-2-2zm-6 0c-1.1 0-2 .9-2 2s.9 2 2 2 2-.9 2-2-.9-2-2-2z"/>
      </svg>
    </button>
  `;
  return div;
}

function buildItemEl(msg, channelId) {
  const div = document.createElement('div');
  div.className = 'message-item';
  div.dataset.id = msg.id;

  const timeEl = document.createElement('span');
  timeEl.className = 'message-time-left';
  timeEl.textContent = formatTime(msg.timestamp);

  const textEl = document.createElement('div');
  textEl.className = 'message-text';
  textEl.innerHTML = processContent(msg.content);

  const reactionsEl = document.createElement('div');
  reactionsEl.className = 'message-reactions';

  const toolbar = buildToolbar();
  toolbar.querySelector('[data-action="react"]').addEventListener('click', (e) => {
    e.stopPropagation();
    toggleReactionPicker(div, msg.id, channelId);
  });
  toolbar.querySelector('[data-action="reply"]').addEventListener('click', () => setReplyTarget(msg));

  div.appendChild(timeEl);
  div.appendChild(textEl);
  div.appendChild(toolbar);
  div.appendChild(reactionsEl);
  return div;
}

function buildGroupEl(msg) {
  const color = getAvatarColor(msg.authorId);
  const div = document.createElement('div');
  div.className = 'message-group';
  div.dataset.authorId = msg.authorId;

  const avatarEl = document.createElement('div');
  avatarEl.className = 'message-avatar';
  avatarEl.style.backgroundColor = color;
  avatarEl.textContent = msg.avatar;
  avatarEl.title = msg.author;

  const content = document.createElement('div');
  content.className = 'message-group-content';

  const header = document.createElement('div');
  header.className = 'message-header';
  header.innerHTML = `
    <span class="message-username" style="color:${color}">${processContent(msg.author)}</span>
    <span class="message-timestamp">${formatTimestamp(msg.timestamp)}</span>
  `;

  const items = document.createElement('div');
  items.className = 'message-items';

  content.appendChild(header);
  content.appendChild(items);
  div.appendChild(avatarEl);
  div.appendChild(content);
  return div;
}

function buildChannelWelcome(channelId, channelName, channelType) {
  const div = document.createElement('div');
  div.className = 'channel-welcome';

  const icon = document.createElement('div');
  icon.className = 'channel-welcome-icon';
  icon.innerHTML = channelType === 'dm' ? ICONS.dm : ICONS.text;

  const title = document.createElement('h2');
  title.className = 'channel-welcome-title';
  title.textContent = channelType === 'dm' ? channelName : `#${channelName}`;

  const desc = document.createElement('p');
  desc.className = 'channel-welcome-desc';
  desc.textContent = channelType === 'dm'
    ? `C'est le début de votre conversation avec ${channelName}.`
    : `Bienvenue dans le salon #${channelName} !`;

  div.appendChild(icon);
  div.appendChild(title);
  div.appendChild(desc);
  return div;
}

// ─── Render ───

function renderMessages(channelId, channelName, channelType) {
  _currentChannelId = channelId;

  const container = document.getElementById('messages-container');
  container.innerHTML = '';

  // Hide static empty state
  const staticEmpty = document.getElementById('chat-empty-state');
  if (staticEmpty) staticEmpty.style.display = 'none';

  container.appendChild(buildChannelWelcome(channelId, channelName, channelType));

  const messages = getChannelMessages(channelId);
  if (messages.length === 0) {
    requestAnimationFrame(() => { container.scrollTop = container.scrollHeight; });
    return;
  }

  const fragment = document.createDocumentFragment();
  let prevMsg = null;
  let currentGroupEl = null;

  messages.forEach(msg => {
    if (!shouldGroup(prevMsg, msg)) {
      currentGroupEl = buildGroupEl(msg);
      fragment.appendChild(currentGroupEl);
    }
    currentGroupEl.querySelector('.message-items').appendChild(buildItemEl(msg, channelId));
    prevMsg = msg;
  });

  container.appendChild(fragment);
  _renderAllReactions(channelId, container);

  requestAnimationFrame(() => { container.scrollTop = container.scrollHeight; });
}

function appendNewMessage(channelId, msg) {
  const container = document.getElementById('messages-container');
  const messages = getChannelMessages(channelId);
  const prevMsg = messages.length >= 2 ? messages[messages.length - 2] : null;

  if (shouldGroup(prevMsg, msg)) {
    const lastGroup = container.querySelector('.message-group:last-of-type');
    if (lastGroup && lastGroup.dataset.authorId === msg.authorId) {
      lastGroup.querySelector('.message-items').appendChild(buildItemEl(msg, channelId));
      container.scrollTop = container.scrollHeight;
      return;
    }
  }

  const groupEl = buildGroupEl(msg);
  groupEl.querySelector('.message-items').appendChild(buildItemEl(msg, channelId));
  container.appendChild(groupEl);
  container.scrollTop = container.scrollHeight;
}

function sendMessage(content) {
  if (!_currentChannelId || !content.trim()) return;
  const msg = pushMessage(_currentChannelId, content.trim());
  appendNewMessage(_currentChannelId, msg);
  clearReplyTarget();
  hideTypingIndicator();
}

// ─── Reactions ───

const QUICK_REACTIONS = ['👍', '❤️', '😂', '😮', '😢', '🎉', '🔥', '👀'];

function toggleReactionPicker(itemEl, msgId, channelId) {
  document.querySelectorAll('.reaction-picker').forEach(p => p.remove());

  const picker = document.createElement('div');
  picker.className = 'reaction-picker';

  QUICK_REACTIONS.forEach(emoji => {
    const btn = document.createElement('button');
    btn.className = 'reaction-option';
    btn.textContent = emoji;
    btn.addEventListener('click', (e) => {
      e.stopPropagation();
      _addReaction(channelId, msgId, emoji);
      picker.remove();
      _renderItemReactions(itemEl, channelId, msgId);
    });
    picker.appendChild(btn);
  });

  itemEl.querySelector('.message-toolbar').appendChild(picker);

  setTimeout(() => {
    document.addEventListener('click', () => picker.remove(), { once: true });
  }, 0);
}

function _addReaction(channelId, msgId, emoji) {
  if (!MESSAGE_REACTIONS[channelId]) MESSAGE_REACTIONS[channelId] = {};
  if (!MESSAGE_REACTIONS[channelId][msgId]) MESSAGE_REACTIONS[channelId][msgId] = {};
  MESSAGE_REACTIONS[channelId][msgId][emoji] = (MESSAGE_REACTIONS[channelId][msgId][emoji] || 0) + 1;
}

function _renderItemReactions(itemEl, channelId, msgId) {
  const reactionsEl = itemEl.querySelector('.message-reactions');
  if (!reactionsEl) return;
  const reactions = MESSAGE_REACTIONS[channelId]?.[msgId] || {};
  reactionsEl.innerHTML = '';
  Object.entries(reactions).forEach(([emoji, count]) => {
    const pill = document.createElement('button');
    pill.className = 'reaction-pill';
    pill.innerHTML = `<span>${emoji}</span><span class="reaction-count">${count}</span>`;
    pill.addEventListener('click', () => {
      _addReaction(channelId, msgId, emoji);
      _renderItemReactions(itemEl, channelId, msgId);
    });
    reactionsEl.appendChild(pill);
  });
}

function _renderAllReactions(channelId, container) {
  if (!MESSAGE_REACTIONS[channelId]) return;
  Object.entries(MESSAGE_REACTIONS[channelId]).forEach(([msgId, _reactions]) => {
    const itemEl = container.querySelector(`.message-item[data-id="${msgId}"]`);
    if (itemEl) _renderItemReactions(itemEl, channelId, msgId);
  });
}

// ─── Reply bar ───

function setReplyTarget(msg) {
  _replyTarget = msg;
  let replyBar = document.getElementById('reply-bar');
  if (!replyBar) {
    replyBar = document.createElement('div');
    replyBar.id = 'reply-bar';
    const inputArea = document.getElementById('chat-input-area');
    inputArea.insertBefore(replyBar, inputArea.firstChild);
  }
  replyBar.innerHTML = `
    <span class="reply-bar-text">Répondre à <strong>${processContent(msg.author)}</strong> : <em class="reply-bar-preview">${processContent(msg.content.slice(0, 60))}${msg.content.length > 60 ? '…' : ''}</em></span>
    <button class="reply-bar-close" title="Annuler">✕</button>
  `;
  replyBar.querySelector('.reply-bar-close').addEventListener('click', clearReplyTarget);
  document.getElementById('message-input').focus();
}

function clearReplyTarget() {
  _replyTarget = null;
  document.getElementById('reply-bar')?.remove();
}

// ─── Typing indicator ───

function showTypingIndicator(name) {
  let el = document.getElementById('typing-indicator');
  if (!el) {
    el = document.createElement('div');
    el.id = 'typing-indicator';
    el.className = 'typing-indicator';
    const inputArea = document.getElementById('chat-input-area');
    inputArea.parentNode.insertBefore(el, inputArea);
  }
  el.innerHTML = `
    <div class="typing-dots"><span></span><span></span><span></span></div>
    <span class="typing-text"><strong>${processContent(name)}</strong> est en train d'écrire…</span>
  `;
  el.classList.add('visible');
}

function hideTypingIndicator() {
  document.getElementById('typing-indicator')?.classList.remove('visible');
  clearTimeout(_fakeTypingTimeout);
  _fakeTypingTimeout = null;
}

function onUserTyping(channelId) {
  clearTimeout(_typingUserTimeout);
  clearTimeout(_fakeTypingTimeout);

  const server = getServerById(activeServerId);
  if (!server || server.type !== 'home') return;
  const dm = server.channels.find(c => c.id === channelId);
  if (!dm) return;
  const firstName = dm.name.split(' ')[0];

  _typingUserTimeout = setTimeout(() => {
    showTypingIndicator(firstName);
    _fakeTypingTimeout = setTimeout(hideTypingIndicator, 3000);
  }, 1200);
}
