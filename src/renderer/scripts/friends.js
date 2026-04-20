// ─── UI Friends ───
// Rendu de la section amis dans la sidebar et modal "Ajouter un ami".

window._realFriends = { accepted: [], pendingOut: [], pendingIn: [] };

// ─── Section amis dans la sidebar ───

function renderRealFriendsSection(container) {
  const existing = document.getElementById('real-friends-section');
  existing?.remove();

  const section = document.createElement('div');
  section.id = 'real-friends-section';
  section.className = 'real-friends-section';

  // En-tête avec bouton ajouter
  const header = document.createElement('div');
  header.className = 'real-friends-header';
  header.innerHTML = `
    <span class="real-friends-label">AMIS</span>
    <button id="add-friend-btn" class="add-friend-btn" title="Ajouter un ami">
      <svg viewBox="0 0 24 24" width="14" height="14">
        <path fill="currentColor" d="M13 10a4 4 0 100-8 4 4 0 000 8zm-9 8a6 6 0 1112 0H4zm16-5a1 1 0 00-2 0v2h-2a1 1 0 000 2h2v2a1 1 0 002 0v-2h2a1 1 0 000-2h-2v-2z"/>
      </svg>
    </button>
  `;
  header.querySelector('#add-friend-btn').addEventListener('click', openAddFriendModal);
  section.appendChild(header);

  const friends = window._realFriends;

  // Demandes reçues
  if (friends.pendingIn.length > 0) {
    const pendingLabel = document.createElement('div');
    pendingLabel.className = 'real-friends-sublabel';
    pendingLabel.textContent = `EN ATTENTE — ${friends.pendingIn.length}`;
    section.appendChild(pendingLabel);

    friends.pendingIn.forEach(f => {
      const item = buildPendingItem(f, 'in');
      section.appendChild(item);
    });
  }

  // Demandes envoyées
  if (friends.pendingOut.length > 0) {
    const sentLabel = document.createElement('div');
    sentLabel.className = 'real-friends-sublabel';
    sentLabel.textContent = 'ENVOYÉES';
    section.appendChild(sentLabel);

    friends.pendingOut.forEach(f => {
      const item = buildPendingItem(f, 'out');
      section.appendChild(item);
    });
  }

  // Amis acceptés
  if (friends.accepted.length > 0) {
    const acceptedLabel = document.createElement('div');
    acceptedLabel.className = 'real-friends-sublabel';
    acceptedLabel.textContent = `EN LIGNE — ${friends.accepted.length}`;
    section.appendChild(acceptedLabel);

    friends.accepted.forEach(f => {
      const item = buildFriendItem(f);
      section.appendChild(item);
    });
  }

  if (friends.accepted.length === 0 && friends.pendingIn.length === 0 && friends.pendingOut.length === 0) {
    const empty = document.createElement('div');
    empty.className = 'real-friends-empty';
    empty.textContent = 'Aucun ami pour l\'instant.';
    section.appendChild(empty);
  }

  container.insertBefore(section, container.firstChild);
}

function buildFriendItem(friend) {
  const initials = friend.username.split(/\s+/).map(w => w[0]?.toUpperCase() ?? '').slice(0, 2).join('') || '?';
  const color = getAvatarColor(friend.id);
  const convId = window._myUserId ? getConversationId(window._myUserId, friend.id) : '';
  const hasUnread = window._socketClient ? false : false; // géré par socket.js

  const item = document.createElement('div');
  item.className = 'dm-item channel-item real-friend-item';
  item.dataset.friendId = friend.id;
  item.dataset.convId = convId;
  if (window._myUserId) item.dataset.id = 'real::' + convId;

  item.innerHTML = `
    <div class="dm-avatar">
      <span class="dm-avatar-text" style="background-color:${color}">${initials}</span>
      <span class="dm-status status-online"></span>
    </div>
    <div class="real-friend-info">
      <span class="dm-name">${friend.username}</span>
    </div>
    <span class="unread-badge" style="display:none"></span>
  `;

  item.addEventListener('click', () => {
    selectRealDmChannel(friend.id, friend.username);
  });

  return item;
}

function buildPendingItem(friend, direction) {
  const initials = friend.username.split(/\s+/).map(w => w[0]?.toUpperCase() ?? '').slice(0, 2).join('') || '?';
  const color = getAvatarColor(friend.id);

  const item = document.createElement('div');
  item.className = 'real-friend-item real-friend-pending';

  if (direction === 'in') {
    item.innerHTML = `
      <div class="dm-avatar">
        <span class="dm-avatar-text" style="background-color:${color}">${initials}</span>
        <span class="dm-status status-idle"></span>
      </div>
      <div class="real-friend-info">
        <span class="dm-name">${friend.username}</span>
      </div>
      <div class="pending-actions">
        <button class="pending-btn accept" title="Accepter">✓</button>
        <button class="pending-btn decline" title="Refuser">✕</button>
      </div>
    `;
    item.querySelector('.accept').addEventListener('click', (e) => {
      e.stopPropagation();
      window._socketClient?.acceptFriend(friend.id);
    });
    item.querySelector('.decline').addEventListener('click', (e) => {
      e.stopPropagation();
      window._socketClient?.declineFriend(friend.id);
    });
  } else {
    item.innerHTML = `
      <div class="dm-avatar">
        <span class="dm-avatar-text" style="background-color:${color}">${initials}</span>
        <span class="dm-status status-offline"></span>
      </div>
      <div class="real-friend-info">
        <span class="dm-name">${friend.username}</span>
        <span class="real-friend-tag">En attente…</span>
      </div>
      <button class="pending-btn decline" title="Annuler">✕</button>
    `;
    item.querySelector('.decline').addEventListener('click', (e) => {
      e.stopPropagation();
      window._socketClient?.cancelRequest(friend.id);
    });
  }

  return item;
}

// ─── Modal "Ajouter un ami" ───

function openAddFriendModal() {
  document.getElementById('add-friend-modal')?.remove();

  const modal = document.createElement('div');
  modal.id = 'add-friend-modal';
  modal.className = 'modal-overlay';
  modal.innerHTML = `
    <div class="modal-box">
      <div class="modal-header">
        <span class="modal-title">Ajouter un ami</span>
        <button class="modal-close">✕</button>
      </div>
      <p class="modal-desc">
        Entre le pseudo exact de ton ami.
        <br>Le tien est : <strong id="my-user-id-display">${window._myUserId || '…'}</strong>
      </p>
      <div class="modal-input-row">
        <input
          id="add-friend-input"
          class="modal-input"
          type="text"
          placeholder="Pseudo"
          autocomplete="off"
          spellcheck="false"
        />
        <button id="add-friend-submit" class="modal-submit">Envoyer</button>
      </div>
      <div id="add-friend-error" class="modal-error" style="display:none"></div>
    </div>
  `;

  document.body.appendChild(modal);

  const input = modal.querySelector('#add-friend-input');
  const submitBtn = modal.querySelector('#add-friend-submit');
  const errorEl = modal.querySelector('#add-friend-error');

  function submit() {
    const value = input.value.trim();
    if (!value) return;

    if (value === window._myUserId) {
      errorEl.textContent = 'Tu ne peux pas t\'ajouter toi-même.';
      errorEl.style.display = 'block';
      return;
    }

    errorEl.style.display = 'none';
    window._socketClient?.addFriend(value);
    closeAddFriendModal();
  }

  submitBtn.addEventListener('click', submit);
  input.addEventListener('keydown', e => { if (e.key === 'Enter') submit(); });
  modal.querySelector('.modal-close').addEventListener('click', closeAddFriendModal);
  modal.addEventListener('click', e => { if (e.target === modal) closeAddFriendModal(); });

  setTimeout(() => input.focus(), 50);
}

function closeAddFriendModal() {
  document.getElementById('add-friend-modal')?.remove();
}

// Helper partagé avec socket.js
function getConversationId(a, b) {
  return [a, b].sort().join('::');
}
