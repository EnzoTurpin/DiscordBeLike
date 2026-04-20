let activeServerId = 'home';
let activeChannelId = null;
let _activeChannelType = null;
let _activeChannelName = null;

// ─── Read state (persisté en localStorage) ───
const _readState = JSON.parse(localStorage.getItem('discord-read-state') || '{}');

function _saveReadState() {
  localStorage.setItem('discord-read-state', JSON.stringify(_readState));
}

function _getDmMessageCount(channelId) {
  return (MOCK_MESSAGES[channelId] || []).length;
}

function _getUnreadCount(channelId) {
  const total = _getDmMessageCount(channelId);
  const read = _readState[channelId] ?? 0;
  return Math.max(0, total - read);
}

function _markAsRead(channelId) {
  _readState[channelId] = _getDmMessageCount(channelId);
  _saveReadState();
}

function setTitlebarTitle(title) {
  document.querySelector('.titlebar-title').textContent = title;
}

function selectServer(serverId) {
  activeServerId = serverId;
  activeChannelId = null;

  document.querySelectorAll('.server-item').forEach((el) => {
    el.classList.toggle('active', el.dataset.id === serverId);
  });

  const server = getServerById(serverId);
  if (!server) return;

  setTitlebarTitle(server.name);
  renderChannelSidebar(server);

  // Close members panel when switching server
  closeMembersPanel();

  // Show/hide members button depending on server type
  const membersBtn = document.getElementById('btn-members');
  if (membersBtn) membersBtn.style.display = server.type === 'home' ? 'none' : 'flex';

  const defaultChannel = getDefaultChannel(server);
  if (defaultChannel) {
    selectChannel(defaultChannel.id, defaultChannel.name, defaultChannel.type);
  } else {
    renderEmptyChatState();
  }
}

function selectChannel(channelId, channelName, channelType) {
  activeChannelId = channelId;
  _activeChannelType = channelType;
  _activeChannelName = channelName;

  document.querySelectorAll('.channel-item, .dm-item').forEach((el) => {
    el.classList.toggle('active', el.dataset.id === channelId);
  });

  // Clear unread on selected channel
  const chEl = document.querySelector(`[data-id="${channelId}"]`);
  if (chEl) {
    chEl.classList.remove('has-unread');
    chEl.querySelector('.unread-badge')?.remove();
  }

  if (channelType === 'dm') _markAsRead(channelId);

  const server = getServerById(activeServerId);
  if (server) {
    const prefix = channelType === 'dm' ? '' : '#';
    setTitlebarTitle(`${server.name} — ${prefix}${channelName}`);
  }

  updateChatHeader(channelId, channelName, channelType);

  if (channelType === 'voice') {
    showVoiceConnectedBar(channelName);
  } else {
    renderMessages(channelId, channelName, channelType);
  }

  // Update input placeholder
  const input = document.getElementById('message-input');
  if (input) {
    const prefix = channelType === 'dm' ? '' : '#';
    input.dataset.placeholder = `Envoyer un message à ${prefix}${channelName}`;
  }
}

function renderChannelSidebar(server) {
  const header = document.getElementById('server-header-name');
  const channelList = document.getElementById('channel-list');

  header.textContent = server.name;
  channelList.innerHTML = '';

  if (server.type === 'home') {
    renderDmList(server, channelList);
  } else {
    renderCategoryList(server, channelList);
  }
}

function renderDmList(server, container) {
  const section = document.createElement('div');
  section.className = 'dm-section';

  const label = document.createElement('div');
  label.className = 'dm-section-label';
  label.textContent = 'MESSAGES PRIVÉS';
  section.appendChild(label);

  server.channels.forEach((dm) => {
    const item = document.createElement('div');
    item.className = 'dm-item channel-item';
    item.dataset.id = dm.id;

    const unread = _getUnreadCount(dm.id);
    if (unread > 0) item.classList.add('has-unread');

    item.innerHTML = `
      <div class="dm-avatar">
        <span class="dm-avatar-text">${dm.avatar}</span>
        <span class="dm-status status-${dm.status}"></span>
      </div>
      <span class="dm-name">${dm.name}</span>
      ${unread > 0 ? `<span class="unread-badge">${unread}</span>` : ''}
      <button class="dm-close-btn" title="Fermer">✕</button>
    `;

    item.addEventListener('click', () => selectChannel(dm.id, dm.name, 'dm'));

    item.addEventListener('contextmenu', (e) => {
      e.preventDefault();
      window.electronAPI.showContextMenu({ type: 'dm', id: dm.id });
    });

    section.appendChild(item);
  });

  container.appendChild(section);
}

function renderCategoryList(server, container) {
  server.categories.forEach((category) => {
    const catEl = document.createElement('div');
    catEl.className = 'channel-category';
    catEl.dataset.id = category.id;

    const header = document.createElement('div');
    header.className = 'category-header';
    header.innerHTML = `
      <svg class="category-arrow" viewBox="0 0 24 24" width="12" height="12">
        <path fill="currentColor" d="M16.59 8.59L12 13.17 7.41 8.59 6 10l6 6 6-6-1.41-1.41z"/>
      </svg>
      <span class="category-name">${category.name}</span>
      <button class="category-add-btn" title="Créer un salon">
        <svg viewBox="0 0 18 18" width="16" height="16">
          <path fill="currentColor" d="M16 9a1 1 0 01-1 1H9v6a1 1 0 11-2 0V10H1a1 1 0 110-2h6V2a1 1 0 112 0v6h6a1 1 0 011 1z"/>
        </svg>
      </button>
    `;

    header.addEventListener('click', () => toggleCategory(catEl));

    const channelsEl = document.createElement('div');
    channelsEl.className = 'category-channels';

    category.channels.forEach((ch) => {
      const chEl = document.createElement('div');
      chEl.className = 'channel-item';
      chEl.dataset.id = ch.id;
      chEl.dataset.type = ch.type;

      const icon = ch.type === 'voice' ? ICONS.voice : ICONS.text;
      chEl.innerHTML = `
        <span class="channel-icon">${icon}</span>
        <span class="channel-name-text">${ch.name}</span>
        <div class="channel-actions">
          <button class="channel-action-btn" title="Inviter">
            <svg viewBox="0 0 24 24" width="16" height="16">
              <path fill="currentColor" d="M13 10a4 4 0 100-8 4 4 0 000 8zm-9 8a6 6 0 1112 0H4zm16-5a1 1 0 00-2 0v2h-2a1 1 0 000 2h2v2a1 1 0 002 0v-2h2a1 1 0 000-2h-2v-2z"/>
            </svg>
          </button>
          <button class="channel-action-btn" title="Paramètres">
            <svg viewBox="0 0 24 24" width="16" height="16">
              <path fill="currentColor" d="M19.14 12.94c.04-.3.06-.61.06-.94s-.02-.64-.07-.94l2.03-1.58c.18-.14.23-.41.12-.61l-1.92-3.32c-.12-.22-.37-.29-.59-.22l-2.39.96c-.5-.38-1.03-.7-1.62-.94l-.36-2.54c-.04-.24-.24-.41-.48-.41h-3.84c-.24 0-.43.17-.47.41l-.36 2.54c-.59.24-1.13.57-1.62.94l-2.39-.96c-.22-.08-.47 0-.59.22L2.74 8.87c-.12.21-.08.47.12.61l2.03 1.58c-.05.3-.09.63-.09.94s.02.64.07.94l-2.03 1.58c-.18.14-.23.41-.12.61l1.92 3.32c.12.22.37.29.59.22l2.39-.96c.5.38 1.03.7 1.62.94l.36 2.54c.05.24.24.41.48.41h3.84c.24 0 .44-.17.47-.41l.36-2.54c.59-.24 1.13-.56 1.62-.94l2.39.96c.22.08.47 0 .59-.22l1.92-3.32c.12-.22.07-.47-.12-.61l-2.01-1.58zM12 15.6c-1.98 0-3.6-1.62-3.6-3.6s1.62-3.6 3.6-3.6 3.6 1.62 3.6 3.6-1.62 3.6-3.6 3.6z"/>
            </svg>
          </button>
        </div>
      `;

      chEl.addEventListener('click', () => selectChannel(ch.id, ch.name, ch.type));

      chEl.addEventListener('contextmenu', (e) => {
        e.preventDefault();
        window.electronAPI.showContextMenu({ type: 'channel', id: ch.id });
      });

      channelsEl.appendChild(chEl);
    });

    catEl.appendChild(header);
    catEl.appendChild(channelsEl);
    container.appendChild(catEl);
  });
}

function toggleCategory(catEl) {
  catEl.classList.toggle('collapsed');
}

// ─── Voice connected bar ───

let _connectedVoiceChannel = null;

function showVoiceConnectedBar(channelName) {
  _connectedVoiceChannel = channelName;

  let bar = document.getElementById('voice-bar');
  if (!bar) {
    bar = document.createElement('div');
    bar.id = 'voice-bar';
    const userPanel = document.getElementById('user-panel');
    userPanel.parentNode.insertBefore(bar, userPanel);
  }

  bar.innerHTML = `
    <div class="voice-bar-status">
      <span class="voice-bar-dot"></span>
      <span class="voice-bar-label">Vocal connecté</span>
    </div>
    <div class="voice-bar-channel">${channelName}</div>
    <div class="voice-bar-actions">
      <button class="voice-bar-btn" title="Couper le son">
        <svg viewBox="0 0 24 24" width="16" height="16"><path fill="currentColor" d="M12 3a1 1 0 00-1 1v4a1 1 0 002 0V4a1 1 0 00-1-1zM7 9a5 5 0 0010 0 1 1 0 00-2 0 3 3 0 01-6 0 1 1 0 00-2 0zm5 7a7 7 0 006.93-6H18a6 6 0 01-12 0H4.07A7 7 0 0012 16zm-1 2v2a1 1 0 002 0v-2a1 1 0 00-2 0z"/></svg>
      </button>
      <button class="voice-bar-btn" title="Partage d'écran">
        <svg viewBox="0 0 24 24" width="16" height="16"><path fill="currentColor" d="M20 3H4c-1.1 0-2 .9-2 2v11c0 1.1.9 2 2 2h3l-1 1v2h12v-2l-1-1h3c1.1 0 2-.9 2-2V5c0-1.1-.9-2-2-2zm0 13H4V5h16v11z"/></svg>
      </button>
      <button class="voice-bar-btn voice-bar-disconnect" title="Se déconnecter" id="voice-disconnect">
        <svg viewBox="0 0 24 24" width="16" height="16"><path fill="currentColor" d="M12 9c-1.6 0-3.15.25-4.6.72v3.1c0 .39-.23.74-.56.9-.98.49-1.87 1.12-2.66 1.85-.18.18-.43.28-.7.28-.28 0-.53-.11-.71-.29L.29 13.08a.99.99 0 01-.29-.7c0-.28.11-.53.29-.71C3.34 8.78 7.46 7 12 7s8.66 1.78 11.71 4.67c.18.18.29.43.29.71 0 .28-.11.53-.29.71l-2.48 2.48c-.18.18-.43.29-.71.29-.27 0-.52-.1-.7-.28-.79-.73-1.68-1.36-2.66-1.85a.996.996 0 01-.56-.9v-3.1C15.15 9.25 13.6 9 12 9z"/></svg>
      </button>
    </div>
  `;

  bar.querySelector('#voice-disconnect').addEventListener('click', disconnectVoice);

  // Show voice channel view
  const container = document.getElementById('messages-container');
  const staticEmpty = document.getElementById('chat-empty-state');
  if (staticEmpty) staticEmpty.style.display = 'none';
  container.innerHTML = `
    <div class="voice-channel-view">
      <div class="voice-channel-icon">
        ${ICONS.voice}
      </div>
      <div class="voice-channel-title">${channelName}</div>
      <div class="voice-channel-desc">Vous êtes connecté au salon vocal</div>
      <div class="voice-participants">
        <div class="voice-participant">
          <div class="voice-participant-avatar" style="background-color:${getAvatarColor('me')}">
            ${window._userConfig ? (window._userConfig.username.split(/\s+/).map(w => w[0]?.toUpperCase() ?? '').slice(0, 2).join('') || 'U') : 'U'}
          </div>
          <div class="voice-participant-speaking"></div>
          <span class="voice-participant-name">${window._userConfig?.username || 'Utilisateur'}</span>
        </div>
      </div>
    </div>
  `;
}

function disconnectVoice() {
  _connectedVoiceChannel = null;
  document.getElementById('voice-bar')?.remove();
  // Return to empty state
  renderEmptyChatState();
}

function updateChatHeader(channelId, channelName, channelType) {
  const icon = document.getElementById('chat-header-icon');
  const name = document.getElementById('chat-header-name');
  const topic = document.getElementById('chat-header-topic');

  const iconSvg = channelType === 'voice' ? ICONS.voice : (channelType === 'dm' ? ICONS.dm : ICONS.text);
  icon.innerHTML = iconSvg;
  name.textContent = channelName;

  if (topic) {
    topic.textContent = channelType === 'dm'
      ? `Conversation privée avec ${channelName}`
      : channelType === 'voice'
        ? 'Salon vocal'
        : `Salon texte #${channelName}`;
  }
}

function renderEmptyChatState() {
  const name = document.getElementById('chat-header-name');
  const icon = document.getElementById('chat-header-icon');
  const container = document.getElementById('messages-container');

  name.textContent = 'Sélectionnez un salon';
  icon.innerHTML = '';

  if (container) {
    container.innerHTML = '';
    const staticEmpty = document.getElementById('chat-empty-state');
    if (!staticEmpty) {
      container.innerHTML = `
        <div id="chat-empty-state">
          <div class="empty-icon-wrapper"><span class="empty-icon"></span></div>
          <div class="empty-title">Bienvenue !</div>
          <div class="empty-desc">Sélectionnez un salon pour commencer.</div>
        </div>
      `;
    } else {
      staticEmpty.style.display = 'flex';
    }
  }
}

const ICONS = {
  text: `<svg viewBox="0 0 24 24" width="16" height="16"><path fill="currentColor" d="M5.43 20.6a1 1 0 01-.35-.06 1 1 0 01-.55-1.3l1.64-4.1A9 9 0 1012 21a8.93 8.93 0 01-4.73-1.35l-1.84-.05zm5.12-14.6a1 1 0 011 1v.57c0 .33.1.64.27.9H15a1 1 0 110 2h-1.12c.08.29.12.59.12.9v.57a1 1 0 01-1 1h-4a1 1 0 110-2h2.29c-.18-.27-.29-.58-.29-.9V11h-2a1 1 0 110-2h2v-.57a1 1 0 01-2 0V8a1 1 0 011-1h2zM12 4a7 7 0 100 14A7 7 0 0012 4z"/></svg>`,
  voice: `<svg viewBox="0 0 24 24" width="16" height="16"><path fill="currentColor" d="M12 3a1 1 0 00-1 1v4a1 1 0 002 0V4a1 1 0 00-1-1zM7 9a5 5 0 0010 0 1 1 0 00-2 0 3 3 0 01-6 0 1 1 0 00-2 0zm5 7a7 7 0 006.93-6H18a6 6 0 01-12 0H4.07A7 7 0 0012 16zm-1 2v2a1 1 0 002 0v-2a1 1 0 00-2 0z"/></svg>`,
  dm: `<svg viewBox="0 0 24 24" width="16" height="16"><path fill="currentColor" d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-2 14.5v-9l6 4.5-6 4.5z"/></svg>`,
};
