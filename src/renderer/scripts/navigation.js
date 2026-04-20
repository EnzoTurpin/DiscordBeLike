let activeServerId = 'home';
let activeChannelId = null;
let _activeChannelType = null;
let _activeChannelName = null;

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

  const server = getServerById(activeServerId);
  if (server) {
    const prefix = channelType === 'dm' ? '' : '#';
    setTitlebarTitle(`${server.name} — ${prefix}${channelName}`);
  }

  updateChatHeader(channelId, channelName, channelType);
  renderMessages(channelId, channelName, channelType);

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

    // Show unread dot if has messages
    const hasMessages = (MOCK_MESSAGES[dm.id] || []).length > 0;

    item.innerHTML = `
      <div class="dm-avatar">
        <span class="dm-avatar-text">${dm.avatar}</span>
        <span class="dm-status status-${dm.status}"></span>
      </div>
      <span class="dm-name">${dm.name}</span>
      ${hasMessages ? '<span class="unread-badge"></span>' : ''}
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

      const hasUnread = (MOCK_MESSAGES[ch.id] || []).length > 0 && ch.type === 'text';
      if (hasUnread) chEl.classList.add('has-unread');

      const icon = ch.type === 'voice' ? ICONS.voice : ICONS.text;
      chEl.innerHTML = `
        <span class="channel-icon">${icon}</span>
        <span class="channel-name-text">${ch.name}</span>
        ${hasUnread ? '<span class="unread-badge"></span>' : ''}
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
