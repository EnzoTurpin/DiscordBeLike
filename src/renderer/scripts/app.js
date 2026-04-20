document.addEventListener('DOMContentLoaded', () => {
  initTitlebar();
  initServerList();
  initStatusMenu();
  initThemeToggle();
  selectServer('home');
});

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

function initStatusMenu() {
  const STATUSES = [
    { key: 'online', label: 'En ligne',          color: 'var(--status-online)' },
    { key: 'idle',   label: 'Absent',             color: 'var(--status-idle)' },
    { key: 'dnd',    label: 'Ne pas déranger',    color: 'var(--status-dnd)' },
    { key: 'offline',label: 'Invisible',          color: 'var(--status-offline)' },
  ];

  let currentStatus = 'online';
  const indicator = document.querySelector('.user-status-indicator');

  const menu = document.createElement('div');
  menu.id = 'status-menu';
  menu.className = 'status-menu hidden';

  STATUSES.forEach(({ key, label, color }) => {
    const item = document.createElement('button');
    item.className = 'status-menu-item';
    item.dataset.status = key;
    item.innerHTML = `
      <span class="status-menu-dot" style="background-color:${color}"></span>
      <span class="status-menu-label">${label}</span>
      <span class="status-menu-check ${key === currentStatus ? 'visible' : ''}">✓</span>
    `;
    item.addEventListener('click', () => {
      currentStatus = key;
      indicator.style.backgroundColor = color;
      menu.querySelectorAll('.status-menu-check').forEach(c => c.classList.remove('visible'));
      item.querySelector('.status-menu-check').classList.add('visible');
      menu.classList.add('hidden');
    });
    menu.appendChild(item);
  });

  const separator = document.createElement('div');
  separator.className = 'status-menu-separator';
  menu.appendChild(separator);

  const switchBtn = document.createElement('button');
  switchBtn.className = 'status-menu-item status-menu-switch';
  switchBtn.innerHTML = `
    <svg viewBox="0 0 24 24" width="14" height="14" style="flex-shrink:0">
      <path fill="currentColor" d="M16 11c1.66 0 2.99-1.34 2.99-3S17.66 5 16 5c-1.66 0-3 1.34-3 3s1.34 3 3 3zm-8 0c1.66 0 2.99-1.34 2.99-3S9.66 5 8 5C6.34 5 5 6.34 5 8s1.34 3 3 3zm0 2c-2.33 0-7 1.17-7 3.5V19h14v-2.5c0-2.33-4.67-3.5-7-3.5zm8 0c-.29 0-.62.02-.97.05 1.16.84 1.97 1.97 1.97 3.45V19h6v-2.5c0-2.33-4.67-3.5-7-3.5z"/>
    </svg>
    <span class="status-menu-label">Changer de compte</span>
  `;
  switchBtn.addEventListener('click', () => {
    menu.classList.add('hidden');
    openSwitchAccountModal();
  });
  menu.appendChild(switchBtn);

  document.getElementById('user-panel').appendChild(menu);

  const avatarWrapper = document.querySelector('.user-avatar-wrapper');
  avatarWrapper.style.cursor = 'pointer';
  avatarWrapper.addEventListener('click', (e) => {
    e.stopPropagation();
    menu.classList.toggle('hidden');
  });

  document.addEventListener('click', () => menu.classList.add('hidden'));
}

function openSwitchAccountModal() {
  const overlay = document.createElement('div');
  overlay.className = 'modal-overlay';

  overlay.innerHTML = `
    <div class="modal-box" id="switch-account-modal">
      <div class="modal-header">
        <span class="modal-title">Changer de compte</span>
        <button class="modal-close" id="modal-close-btn">✕</button>
      </div>
      <div class="modal-body">
        <label class="modal-label">Nom d'utilisateur</label>
        <input class="modal-input" id="modal-username" type="text" placeholder="Nouveau nom…" maxlength="32" />
        <label class="modal-label">Tag</label>
        <input class="modal-input" id="modal-tag" type="text" placeholder="ex: #1234" maxlength="5" />
      </div>
      <div class="modal-footer">
        <button class="modal-btn modal-btn-cancel" id="modal-cancel-btn">Annuler</button>
        <button class="modal-btn modal-btn-confirm" id="modal-confirm-btn">Confirmer</button>
      </div>
    </div>
  `;

  document.body.appendChild(overlay);

  const close = () => overlay.remove();

  overlay.querySelector('#modal-close-btn').addEventListener('click', close);
  overlay.querySelector('#modal-cancel-btn').addEventListener('click', close);
  overlay.addEventListener('click', (e) => { if (e.target === overlay) close(); });

  overlay.querySelector('#modal-confirm-btn').addEventListener('click', () => {
    const name = overlay.querySelector('#modal-username').value.trim();
    const tag  = overlay.querySelector('#modal-tag').value.trim();
    if (!name) return;

    document.querySelector('.user-name').textContent = name;
    document.querySelector('.user-tag').textContent = tag || '#0001';
    document.querySelector('.user-avatar').textContent = name.charAt(0).toUpperCase();
    close();
  });

  overlay.querySelector('#modal-username').focus();
}

function initThemeToggle() {
  const btn = document.querySelector('.btn-theme-toggle');
  let isDark = true;

  btn.addEventListener('click', () => {
    isDark = !isDark;
    document.body.classList.toggle('light-theme', !isDark);
    btn.title = isDark ? 'Mode clair' : 'Mode sombre';
    btn.querySelector('.icon-moon').style.display = isDark ? 'block' : 'none';
    btn.querySelector('.icon-sun').style.display = isDark ? 'none' : 'block';
  });
}
