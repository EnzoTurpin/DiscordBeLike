let _membersVisible = false;

function toggleMembersPanel() {
  _membersVisible = !_membersVisible;
  document.getElementById('members-panel').classList.toggle('open', _membersVisible);
  document.querySelector('.chat-header-btn[title="Membres"]')?.classList.toggle('active', _membersVisible);
  if (_membersVisible) renderMembersList(activeServerId);
}

function closeMembersPanel() {
  _membersVisible = false;
  document.getElementById('members-panel').classList.remove('open');
  document.querySelector('.chat-header-btn[title="Membres"]')?.classList.remove('active');
}

function renderMembersList(serverId) {
  const listEl = document.getElementById('members-list');
  listEl.innerHTML = '';

  const members = SERVER_MEMBERS[serverId];
  if (!members) {
    listEl.innerHTML = '<div class="members-empty">Aucun membre à afficher</div>';
    return;
  }

  const online = (members.online || []);
  const offline = (members.offline || []);

  _renderMembersSection(listEl, 'EN LIGNE', online);
  _renderMembersSection(listEl, 'HORS LIGNE', offline);
}

function _renderMembersSection(container, title, membersList) {
  if (!membersList.length) return;
  const section = document.createElement('div');
  section.className = 'members-section';

  const header = document.createElement('div');
  header.className = 'members-section-header';
  header.textContent = `${title} — ${membersList.length}`;
  section.appendChild(header);

  membersList.forEach(member => {
    const color = getAvatarColor(member.id);
    const el = document.createElement('div');
    el.className = 'member-item';
    el.innerHTML = `
      <div class="member-avatar-wrap">
        <div class="member-avatar" style="background-color:${color}">${member.avatar}</div>
        <div class="member-status-dot status-${member.status}"></div>
      </div>
      <div class="member-info">
        <span class="member-name">${member.name}</span>
        ${member.role ? `<span class="member-role">${member.role}</span>` : ''}
      </div>
    `;
    section.appendChild(el);
  });

  container.appendChild(section);
}
