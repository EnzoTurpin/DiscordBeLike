const _DND_KEY = 'discord-server-order';

let _listState = null;
let _dragId = null;

// ── State ─────────────────────────────────────────────────────────────────────

function _loadListState() {
  try {
    const raw = localStorage.getItem(_DND_KEY);
    if (raw) {
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed)) return parsed;
    }
  } catch (_) {}
  return SERVERS.map(s => ({ type: 'server', id: s.id }));
}

function _saveListState() {
  localStorage.setItem(_DND_KEY, JSON.stringify(_listState));
}

function _syncWithServers() {
  const known = new Set();
  _listState.forEach(item => {
    if (item.type === 'server') known.add(item.id);
    else if (item.type === 'folder') item.serverIds.forEach(id => known.add(id));
  });
  SERVERS.forEach(s => {
    if (!known.has(s.id)) _listState.push({ type: 'server', id: s.id });
  });
  const validIds = new Set(SERVERS.map(s => s.id));
  for (let i = _listState.length - 1; i >= 0; i--) {
    const item = _listState[i];
    if (item.type === 'server' && !validIds.has(item.id)) {
      _listState.splice(i, 1);
    } else if (item.type === 'folder') {
      item.serverIds = item.serverIds.filter(id => validIds.has(id));
      if (item.serverIds.length <= 1) {
        _listState.splice(i, 1, ...item.serverIds.map(id => ({ type: 'server', id })));
      }
    }
  }
}

// ── Helpers ───────────────────────────────────────────────────────────────────

function _isTopLevelFolder(id) {
  return _listState.some(item => item.id === id && item.type === 'folder');
}

function _getTopLevelItemData(id) {
  return _listState.find(item => item.id === id) ?? { type: 'server', id };
}

function _detach(id) {
  const idx = _listState.findIndex(item => item.id === id);
  if (idx !== -1) { _listState.splice(idx, 1); return; }
  _listState.forEach(item => {
    if (item.type === 'folder') {
      const i = item.serverIds.indexOf(id);
      if (i !== -1) item.serverIds.splice(i, 1);
    }
  });
  for (let i = _listState.length - 1; i >= 0; i--) {
    const item = _listState[i];
    if (item.type === 'folder' && item.serverIds.length <= 1) {
      _listState.splice(i, 1, ...item.serverIds.map(id => ({ type: 'server', id })));
    }
  }
}

// ── Mutations ─────────────────────────────────────────────────────────────────

function _toggleFolder(folderId) {
  const folder = _listState.find(item => item.id === folderId);
  if (folder?.type === 'folder') {
    folder.expanded = !folder.expanded;
    _saveListState();
    renderServerList();
  }
}

function _createFolder(idA, idB) {
  const idxA = _listState.findIndex(item =>
    item.id === idA || (item.type === 'folder' && item.serverIds.includes(idA))
  );
  const idxB = _listState.findIndex(item =>
    item.id === idB || (item.type === 'folder' && item.serverIds.includes(idB))
  );
  const insertAt = Math.min(...[idxA, idxB].filter(i => i !== -1), _listState.length);

  _detach(idA);
  _detach(idB);

  const folder = {
    type: 'folder',
    id: 'folder-' + Date.now(),
    name: 'Nouveau dossier',
    color: getServerById(idA)?.color ?? '#5865F2',
    serverIds: [idA, idB],
    expanded: true,
  };

  _listState.splice(Math.min(insertAt, _listState.length), 0, folder);
  _saveListState();
  renderServerList();
}

function _dissolveFolder(folderId) {
  const idx = _listState.findIndex(item => item.id === folderId);
  if (idx === -1) return;
  const { serverIds } = _listState[idx];
  _listState.splice(idx, 1, ...serverIds.map(id => ({ type: 'server', id })));
  _saveListState();
  renderServerList();
}

function _renameFolder(folderId, name) {
  const folder = _listState.find(item => item.id === folderId);
  if (folder?.type === 'folder') {
    folder.name = name;
    _saveListState();
    renderServerList();
  }
}

function _applyDrop(dragId, targetId, zone, targetFolderId) {
  if (dragId === targetId) return;

  if (zone === 'create-folder') {
    if (_isTopLevelFolder(dragId) || _isTopLevelFolder(targetId)) return;
    _createFolder(dragId, targetId);
    return;
  }

  if (zone === 'into') {
    const folderId = targetFolderId || targetId;
    const folder = _listState.find(item => item.id === folderId && item.type === 'folder');
    if (!folder || folder.serverIds.includes(dragId)) return;
    _detach(dragId);
    folder.serverIds.push(dragId);
    _saveListState();
    renderServerList();
    return;
  }

  // above / below
  const dragData = _getTopLevelItemData(dragId);

  if (targetFolderId && !_isTopLevelFolder(dragId)) {
    const folder = _listState.find(item => item.id === targetFolderId && item.type === 'folder');
    if (!folder) return;
    _detach(dragId);
    const f2 = _listState.find(item => item.id === targetFolderId && item.type === 'folder');
    if (!f2) {
      _listState.push({ type: 'server', id: dragId });
    } else {
      const ti = f2.serverIds.indexOf(targetId);
      const pos = ti === -1 ? f2.serverIds.length : (zone === 'above' ? ti : ti + 1);
      f2.serverIds.splice(pos, 0, dragId);
    }
  } else {
    _detach(dragId);
    const ti = _listState.findIndex(item =>
      item.id === targetId || (item.type === 'folder' && item.serverIds.includes(targetId))
    );
    const pos = ti === -1 ? _listState.length : (zone === 'above' ? ti : ti + 1);
    _listState.splice(pos, 0, dragData);
  }

  _saveListState();
  renderServerList();
}

// ── Context menu ──────────────────────────────────────────────────────────────

function _showFolderCtxMenu(e, folderId) {
  document.querySelectorAll('.folder-ctx-menu').forEach(m => m.remove());
  const folder = _listState.find(item => item.id === folderId);
  if (!folder) return;

  const menu = document.createElement('div');
  menu.className = 'folder-ctx-menu';
  menu.style.left = Math.min(e.clientX, window.innerWidth - 180) + 'px';
  menu.style.top = Math.min(e.clientY, window.innerHeight - 80) + 'px';
  menu.innerHTML = `
    <div class="folder-ctx-item" data-action="rename">Renommer</div>
    <div class="folder-ctx-item folder-ctx-danger" data-action="dissolve">Dissoudre le dossier</div>
  `;
  document.body.appendChild(menu);

  const close = () => menu.remove();
  menu.addEventListener('click', ev => {
    const action = ev.target.closest('[data-action]')?.dataset.action;
    if (action === 'rename') {
      close();
      const name = prompt('Nom du dossier :', folder.name);
      if (name?.trim()) _renameFolder(folderId, name.trim());
    } else if (action === 'dissolve') {
      close();
      _dissolveFolder(folderId);
    }
  });
  setTimeout(() => document.addEventListener('click', close, { once: true }), 0);
}

// ── DOM builders ──────────────────────────────────────────────────────────────

function _buildServerEl(server, draggable, folderId, folderColor) {
  const li = document.createElement('li');
  li.className = 'server-item';
  li.dataset.id = server.id;
  li.title = server.name;
  if (draggable) li.setAttribute('draggable', 'true');
  if (folderId) {
    li.dataset.folderId = folderId;
    li.classList.add('server-item--child');
    if (folderColor) li.style.setProperty('--folder-color', folderColor);
  }

  li.appendChild(Object.assign(document.createElement('div'), { className: 'server-pill' }));

  if (server.type === 'home') {
    li.innerHTML += `<div class="server-icon server-icon-home"><svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" width="28" height="28"><path fill="currentColor" d="M10 20v-6h4v6h5v-8h3L12 3 2 12h3v8z"/></svg></div>`;
  } else {
    const hasUnread = server.categories?.some(cat =>
      cat.channels.some(ch => ch.type === 'text' && _getUnreadCount(ch.id) > 0)
    );
    if (hasUnread) li.classList.add('has-unread');
    li.innerHTML += `<div class="server-icon" style="--server-color:${server.color}"><span class="server-abbr">${server.abbr}</span></div>`;
  }

  li.addEventListener('click', () => selectServer(server.id));
  li.addEventListener('contextmenu', e => {
    e.preventDefault();
    if (server.type !== 'home') window.electronAPI.showContextMenu({ type: 'server', id: server.id });
  });

  return li;
}

function _buildFolderEl(folder) {
  const li = document.createElement('li');
  li.className = 'server-item server-folder-item' + (folder.expanded ? ' is-expanded' : '');
  li.dataset.id = folder.id;
  li.dataset.isFolder = 'true';
  li.title = folder.name;
  li.setAttribute('draggable', 'true');

  li.appendChild(Object.assign(document.createElement('div'), { className: 'server-pill' }));

  const icon = document.createElement('div');
  icon.className = 'server-icon server-folder-icon';
  icon.style.setProperty('--folder-color', folder.color);

  const grid = document.createElement('div');
  grid.className = 'folder-mini-grid';
  folder.serverIds.slice(0, 4).forEach(sid => {
    const s = getServerById(sid);
    const mini = document.createElement('div');
    mini.className = 'folder-mini-icon';
    mini.style.background = s?.color ?? '#5865F2';
    mini.textContent = s?.abbr?.[0] ?? '?';
    grid.appendChild(mini);
  });

  icon.appendChild(grid);
  li.appendChild(icon);

  li.addEventListener('click', () => _toggleFolder(folder.id));
  li.addEventListener('contextmenu', e => { e.preventDefault(); _showFolderCtxMenu(e, folder.id); });

  return li;
}

// ── Render ────────────────────────────────────────────────────────────────────

function renderServerList() {
  const list = document.getElementById('server-list');
  if (!list) return;

  const activeId = typeof activeServerId !== 'undefined' ? activeServerId : null;

  // Auto-expand folder containing active server
  if (activeId) {
    _listState.forEach(item => {
      if (item.type === 'folder' && item.serverIds.includes(activeId)) item.expanded = true;
    });
  }

  list.innerHTML = '';

  _listState.forEach(item => {
    if (item.type === 'server') {
      const server = getServerById(item.id);
      if (!server) return;
      list.appendChild(_buildServerEl(server, server.id !== 'home', null, null));
      if (server.id === 'home') {
        list.appendChild(Object.assign(document.createElement('li'), { className: 'server-separator' }));
      }
    } else if (item.type === 'folder') {
      list.appendChild(_buildFolderEl(item));
      if (item.expanded) {
        item.serverIds.forEach(sid => {
          const server = getServerById(sid);
          if (server) list.appendChild(_buildServerEl(server, true, item.id, item.color));
        });
      }
    }
  });

  const addBtn = document.createElement('li');
  addBtn.className = 'server-item server-add';
  addBtn.title = 'Ajouter un serveur';
  addBtn.innerHTML = `<div class="server-icon server-icon-add"><svg viewBox="0 0 24 24" width="24" height="24"><path fill="currentColor" d="M19 13h-6v6h-2v-6H5v-2h6V5h2v6h6v2z"/></svg></div>`;
  list.appendChild(addBtn);

  const discoverBtn = document.createElement('li');
  discoverBtn.className = 'server-item server-discover';
  discoverBtn.title = 'Explorer les serveurs publics';
  discoverBtn.innerHTML = `<div class="server-icon server-icon-discover"><svg viewBox="0 0 24 24" width="24" height="24"><path fill="currentColor" d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-1.41 13.09l-2.58-2.59L9.42 11l1.17 1.17 4.24-4.24 1.41 1.41-5.65 5.75z"/></svg></div>`;
  list.appendChild(discoverBtn);

  if (activeId) {
    list.querySelector(`[data-id="${activeId}"]`)?.classList.add('active');
  }

  _attachDnD(list);
}

// ── Drag & Drop ───────────────────────────────────────────────────────────────

function _attachDnD(list) {
  if (list.dataset.dndReady) return;
  list.dataset.dndReady = 'true';

  let overEl = null;
  let overZone = null;

  list.addEventListener('dragstart', e => {
    const item = e.target.closest('[draggable="true"]');
    if (!item) return;
    _dragId = item.dataset.id;
    e.dataTransfer.effectAllowed = 'move';
    e.dataTransfer.setData('text/plain', _dragId);
    requestAnimationFrame(() => item.classList.add('dragging'));
  });

  list.addEventListener('dragend', () => {
    list.querySelectorAll('.dragging').forEach(el => el.classList.remove('dragging'));
    _clearIndicators(list);
    _dragId = null;
    overEl = null;
    overZone = null;
  });

  list.addEventListener('dragover', e => {
    e.preventDefault();
    if (!_dragId) return;

    const target = e.target.closest('.server-item:not(.server-add):not(.server-discover)');
    if (!target) return;

    const targetId = target.dataset.id;
    if (targetId === _dragId || targetId === 'home') return;

    const isDragFolder = _isTopLevelFolder(_dragId);
    const isTargetFolder = target.dataset.isFolder === 'true';
    const rect = target.getBoundingClientRect();
    const pct = (e.clientY - rect.top) / rect.height;

    let zone;
    if (isDragFolder) {
      zone = pct < 0.5 ? 'above' : 'below';
    } else if (isTargetFolder) {
      zone = pct < 0.3 ? 'above' : pct > 0.7 ? 'below' : 'into';
    } else {
      zone = pct < 0.35 ? 'above' : pct > 0.65 ? 'below' : 'create-folder';
    }

    if (target !== overEl || zone !== overZone) {
      _clearIndicators(list);
      overEl = target;
      overZone = zone;
      if (zone === 'above') target.classList.add('dnd-above');
      else if (zone === 'below') target.classList.add('dnd-below');
      else target.classList.add('dnd-into');
    }
  });

  list.addEventListener('dragleave', e => {
    if (!list.contains(e.relatedTarget)) {
      _clearIndicators(list);
      overEl = null;
      overZone = null;
    }
  });

  list.addEventListener('drop', e => {
    e.preventDefault();
    if (!_dragId || !overEl || !overZone) return;
    const targetId = overEl.dataset.id;
    const targetFolderId = overEl.dataset.folderId || null;
    _clearIndicators(list);
    _applyDrop(_dragId, targetId, overZone, targetFolderId);
    overEl = null;
    overZone = null;
  });
}

function _clearIndicators(list) {
  list.querySelectorAll('.dnd-above, .dnd-below, .dnd-into').forEach(el => {
    el.classList.remove('dnd-above', 'dnd-below', 'dnd-into');
  });
}

// ── Init ──────────────────────────────────────────────────────────────────────

function initServerListDnD() {
  _listState = _loadListState();
  _syncWithServers();
  renderServerList();
}
