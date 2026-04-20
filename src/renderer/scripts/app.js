document.addEventListener('DOMContentLoaded', async () => {
  initTitlebar();
  await initUserPanel();
  initServerList();
  initChatInput();
  initMembersToggle();
  initSearchBar();
  selectServer('home');
});

async function initUserPanel() {
  const config = await window.electronAPI.getUserConfig();
  window._userConfig = config;

  const avatar = document.querySelector('#user-panel .user-avatar');
  const name = document.querySelector('#user-panel .user-name');
  const tag = document.querySelector('#user-panel .user-tag');

  name.textContent = config.username;
  tag.textContent = `#${config.tag}`;

  const initials = config.username
    .split(/\s+/)
    .map((w) => w[0]?.toUpperCase() ?? '')
    .slice(0, 2)
    .join('');
  avatar.textContent = initials || 'U';

  // Update MOCK_MESSAGES 'me' author name to match config
  Object.values(MOCK_MESSAGES).forEach((msgs) => {
    msgs.forEach((m) => {
      if (m.authorId === 'me') {
        m.author = config.username;
        m.avatar = initials || 'U';
      }
    });
  });
}

function initTitlebar() {
  document.getElementById('btn-minimize').addEventListener('click', () => {
    window.electronAPI.minimizeWindow();
  });

  const btnMaximize = document.getElementById('btn-maximize');
  btnMaximize.addEventListener('click', () => {
    window.electronAPI.maximizeWindow();
  });

  document.getElementById('btn-close').addEventListener('click', () => {
    window.electronAPI.closeWindow();
  });

  window.electronAPI.onMaximizeChange((isMaximized) => {
    btnMaximize.title = isMaximized ? 'Restaurer' : 'Agrandir';
    btnMaximize.querySelector('.icon-maximize').style.display = isMaximized ? 'none' : 'inline';
    btnMaximize.querySelector('.icon-restore').style.display = isMaximized ? 'inline' : 'none';
  });

  document.getElementById('user-panel').addEventListener('contextmenu', (e) => {
    e.preventDefault();
    window.electronAPI.showContextMenu({ type: 'user' });
  });
}

function initChatInput() {
  const input = document.getElementById('message-input');

  input.addEventListener('keydown', (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      const content = input.innerText.trim();
      if (content && activeChannelId) {
        sendMessage(content);
        input.innerHTML = '';
      }
    }
  });

  input.addEventListener('input', () => {
    if (activeChannelId) onUserTyping(activeChannelId);
  });
}

function initMembersToggle() {
  const btn = document.getElementById('btn-members');
  if (btn) btn.addEventListener('click', () => toggleMembersPanel());
}

function initSearchBar() {
  const searchBtn = document.querySelector('.chat-header-btn[title="Rechercher"]');
  if (!searchBtn) return;

  searchBtn.addEventListener('click', () => {
    const existing = document.getElementById('search-overlay');
    if (existing) {
      existing.remove();
      searchBtn.classList.remove('active');
      return;
    }

    searchBtn.classList.add('active');

    const overlay = document.createElement('div');
    overlay.id = 'search-overlay';
    overlay.className = 'search-overlay';
    overlay.innerHTML = `
      <div class="search-bar-wrap">
        <svg class="search-icon" viewBox="0 0 24 24" width="16" height="16">
          <path fill="currentColor" d="M15.5 14h-.79l-.28-.27C15.41 12.59 16 11.11 16 9.5 16 5.91 13.09 3 9.5 3S3 5.91 3 9.5 5.91 16 9.5 16c1.61 0 3.09-.59 4.23-1.57l.27.28v.79l5 4.99L20.49 19l-4.99-5zm-6 0C7.01 14 5 11.99 5 9.5S7.01 5 9.5 5 14 7.01 14 9.5 11.99 14 9.5 14z"/>
        </svg>
        <input id="search-input" class="search-input" type="text" placeholder="Rechercher dans ce salon…" autocomplete="off" />
        <span class="search-hint">ESC pour fermer</span>
      </div>
    `;

    const chatMain = document.getElementById('chat-main');
    chatMain.insertBefore(overlay, chatMain.firstChild.nextSibling);

    const input = overlay.querySelector('#search-input');
    input.focus();

    input.addEventListener('keydown', (e) => {
      if (e.key === 'Escape') {
        overlay.remove();
        searchBtn.classList.remove('active');
      }
    });

    overlay.querySelector('.search-bar-wrap').addEventListener('click', (e) => e.stopPropagation());

    document.addEventListener('keydown', function escHandler(e) {
      if (e.key === 'Escape') {
        overlay.remove();
        searchBtn.classList.remove('active');
        document.removeEventListener('keydown', escHandler);
      }
    });
  });
}

function initServerList() {
  const list = document.getElementById('server-list');

  SERVERS.forEach((server) => {
    const item = document.createElement('li');
    item.className = 'server-item';
    item.dataset.id = server.id;
    item.title = server.name;

    const pill = document.createElement('div');
    pill.className = 'server-pill';
    item.appendChild(pill);

    if (server.type === 'home') {
      item.innerHTML += `
        <div class="server-icon server-icon-home">
          <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" width="28" height="28">
            <path fill="currentColor" d="M10 20v-6h4v6h5v-8h3L12 3 2 12h3v8z"/>
          </svg>
        </div>
      `;
    } else {
      // Check if any channel in this server has messages (unread indicator)
      const hasUnread = server.categories?.some((cat) =>
        cat.channels.some((ch) => (MOCK_MESSAGES[ch.id] || []).length > 0 && ch.type === 'text')
      );
      if (hasUnread) item.classList.add('has-unread');

      item.innerHTML += `
        <div class="server-icon" style="--server-color: ${server.color}">
          <span class="server-abbr">${server.abbr}</span>
        </div>
      `;
    }

    item.addEventListener('click', () => selectServer(server.id));

    item.addEventListener('contextmenu', (e) => {
      e.preventDefault();
      if (server.type !== 'home') {
        window.electronAPI.showContextMenu({ type: 'server', id: server.id });
      }
    });

    list.appendChild(item);
  });

  const separator = document.createElement('li');
  separator.className = 'server-separator';
  list.insertBefore(separator, list.children[1]);

  const addBtn = document.createElement('li');
  addBtn.className = 'server-item server-add';
  addBtn.title = 'Ajouter un serveur';
  addBtn.innerHTML = `
    <div class="server-icon server-icon-add">
      <svg viewBox="0 0 24 24" width="24" height="24">
        <path fill="currentColor" d="M19 13h-6v6h-2v-6H5v-2h6V5h2v6h6v2z"/>
      </svg>
    </div>
  `;
  list.appendChild(addBtn);

  const discoverBtn = document.createElement('li');
  discoverBtn.className = 'server-item server-discover';
  discoverBtn.title = 'Explorer les serveurs publics';
  discoverBtn.innerHTML = `
    <div class="server-icon server-icon-discover">
      <svg viewBox="0 0 24 24" width="24" height="24">
        <path fill="currentColor" d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-1.41 13.09l-2.58-2.59L9.42 11l1.17 1.17 4.24-4.24 1.41 1.41-5.65 5.75z"/>
      </svg>
    </div>
  `;
  list.appendChild(discoverBtn);
}
