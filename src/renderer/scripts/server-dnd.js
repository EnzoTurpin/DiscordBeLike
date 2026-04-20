const _DND_KEY = 'discord-server-order';
const _DRAG_THRESHOLD = 5;

let _listState = null;
let _didDrag = false;
let _drag = null; // { id, itemEl, ghost, line, dropResult }

// ── State ─────────────────────────────────────────────────────────────────────

function _loadListState() {
  try {
    const raw = localStorage.getItem(_DND_KEY);
    if (raw) {
      const p = JSON.parse(raw);
      if (Array.isArray(p)) return p;
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
  const valid = new Set(SERVERS.map(s => s.id));
  for (let i = _listState.length - 1; i >= 0; i--) {
    const item = _listState[i];
    if (item.type === 'server' && !valid.has(item.id)) {
      _listState.splice(i, 1);
    } else if (item.type === 'folder') {
      item.serverIds = item.serverIds.filter(id => valid.has(id));
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
  const findIdx = id => _listState.findIndex(item =>
    item.id === id || (item.type === 'folder' && item.serverIds.includes(id))
  );
  const insertAt = Math.min(...[findIdx(idA), findIdx(idB)].filter(i => i !== -1), _listState.length);
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

// ── Drop application ──────────────────────────────────────────────────────────

function _applyDropResult(dragId, result) {
  if (!result) return;

  if (result.type === 'into') {
    const targetEl = result.el;
    const targetId = targetEl.dataset.id;
    const isFolder = targetEl.dataset.isFolder === 'true';

    if (isFolder) {
      if (_isTopLevelFolder(dragId)) return;
      const folder = _listState.find(item => item.id === targetId && item.type === 'folder');
      if (!folder || folder.serverIds.includes(dragId)) return;
      _detach(dragId);
      folder.serverIds.push(dragId);
      _saveListState();
      renderServerList();
    } else {
      if (_isTopLevelFolder(dragId)) return;
      _createFolder(dragId, targetId);
    }
    return;
  }

  // 'gap' — reorder
  const { before, after } = result;
  const refEl = before || after;
  if (!refEl) return;

  const dragData = _getTopLevelItemData(dragId);
  const targetId = refEl.dataset.id;
  const targetFolderId = refEl.dataset.folderId || null;
  const zone = before ? 'above' : 'below';

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
  if (draggable) li.dataset.draggable = 'true';
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

  li.addEventListener('click', () => {
    if (_didDrag) { _didDrag = false; return; }
    selectServer(server.id);
  });
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
  li.dataset.draggable = 'true';
  li.title = folder.name;

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

  li.addEventListener('click', () => {
    if (_didDrag) { _didDrag = false; return; }
    _toggleFolder(folder.id);
  });
  li.addEventListener('contextmenu', e => { e.preventDefault(); _showFolderCtxMenu(e, folder.id); });

  return li;
}

// ── Render ────────────────────────────────────────────────────────────────────

function renderServerList() {
  const list = document.getElementById('server-list');
  if (!list) return;

  const activeId = typeof activeServerId !== 'undefined' ? activeServerId : null;

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

  _initDnD(list);
}

// ── Pointer-based Drag & Drop ─────────────────────────────────────────────────

function _initDnD(list) {
  if (list.dataset.dndReady) return;
  list.dataset.dndReady = 'true';

  list.addEventListener('pointerdown', e => {
    if (e.button !== 0) return;
    const item = e.target.closest('[data-draggable="true"]');
    if (!item) return;

    const startX = e.clientX;
    const startY = e.clientY;
    let started = false;

    const onMove = ev => {
      if (!started && Math.hypot(ev.clientX - startX, ev.clientY - startY) > _DRAG_THRESHOLD) {
        started = true;
        _didDrag = true;
        _startDrag(item, ev.clientX, ev.clientY);
      }
      if (started) _updateDrag(ev.clientX, ev.clientY);
    };

    const onUp = ev => {
      document.removeEventListener('pointermove', onMove);
      document.removeEventListener('pointerup', onUp);
      if (started) _endDrag(ev.clientX, ev.clientY);
    };

    document.addEventListener('pointermove', onMove);
    document.addEventListener('pointerup', onUp);
  });
}

function _startDrag(itemEl, clientX, clientY) {
  const iconEl = itemEl.querySelector('.server-icon');
  const iconRect = iconEl.getBoundingClientRect();

  const ghost = iconEl.cloneNode(true);
  Object.assign(ghost.style, {
    position: 'fixed',
    width: iconRect.width + 'px',
    height: iconRect.height + 'px',
    left: (clientX - iconRect.width / 2) + 'px',
    top: (clientY - iconRect.height / 2) + 'px',
    pointerEvents: 'none',
    zIndex: '10000',
    opacity: '0.9',
    transform: 'scale(1.1) rotate(-4deg)',
    borderRadius: '16px',
    transition: 'none',
    overflow: 'hidden',
  });
  document.body.appendChild(ghost);

  const line = document.createElement('div');
  line.className = 'dnd-insert-line';
  line.style.display = 'none';
  document.body.appendChild(line);

  itemEl.classList.add('dragging');
  document.body.style.cursor = 'grabbing';

  _drag = { id: itemEl.dataset.id, itemEl, ghost, line, dropResult: null };
}

function _updateDrag(clientX, clientY) {
  if (!_drag) return;
  const { ghost, line, id } = _drag;

  ghost.style.left = (clientX - 24) + 'px';
  ghost.style.top = (clientY - 24) + 'px';

  const list = document.getElementById('server-list');
  const result = _calcDropTarget(list, id, clientX, clientY);
  _drag.dropResult = result;

  list.querySelectorAll('.dnd-into').forEach(el => el.classList.remove('dnd-into'));
  line.style.display = 'none';

  if (!result) return;

  if (result.type === 'into') {
    result.el.classList.add('dnd-into');
  } else {
    const wrapperRect = document.getElementById('server-list-wrapper').getBoundingClientRect();
    line.style.display = 'block';
    line.style.left = (wrapperRect.left + 12) + 'px';
    line.style.top = result.y + 'px';
    line.style.width = '48px';
  }
}

function _endDrag() {
  if (!_drag) return;
  const { ghost, line, id, itemEl, dropResult } = _drag;

  ghost.remove();
  line.remove();
  itemEl.classList.remove('dragging');
  document.getElementById('server-list')?.querySelectorAll('.dnd-into').forEach(el => el.classList.remove('dnd-into'));
  document.body.style.cursor = '';
  _drag = null;

  if (dropResult) _applyDropResult(id, dropResult);
}

function _calcDropTarget(list, dragId, clientX, clientY) {
  const wrapper = document.getElementById('server-list-wrapper');
  if (!wrapper) return null;
  const wrapperRect = wrapper.getBoundingClientRect();
  if (clientX < wrapperRect.left || clientX > wrapperRect.right) return null;

  const all = [...list.querySelectorAll('.server-item:not(.server-add):not(.server-discover)')];
  const targets = all.filter(el => el.dataset.id !== dragId && el.dataset.id !== 'home');

  // Check if cursor is directly over an icon → into (create folder / add to folder)
  for (const item of targets) {
    const icon = item.querySelector('.server-icon');
    if (!icon) continue;
    const r = icon.getBoundingClientRect();
    if (clientX >= r.left && clientX <= r.right && clientY >= r.top && clientY <= r.bottom) {
      return { type: 'into', el: item };
    }
  }

  // Find gap between items → reorder
  for (let i = 0; i < targets.length; i++) {
    const rect = targets[i].getBoundingClientRect();
    if (clientY < rect.top + rect.height / 2) {
      return { type: 'gap', before: targets[i], after: targets[i - 1] || null, y: rect.top - 3 };
    }
  }

  const last = targets[targets.length - 1];
  if (last) {
    const r = last.getBoundingClientRect();
    return { type: 'gap', before: null, after: last, y: r.bottom + 3 };
  }

  return null;
}

// ── Init ──────────────────────────────────────────────────────────────────────

function initServerListDnD() {
  _listState = _loadListState();
  _syncWithServers();
  renderServerList();
}
