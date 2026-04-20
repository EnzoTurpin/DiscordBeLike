const SERVERS = [
  {
    id: 'home',
    name: 'Messages Privés',
    type: 'home',
    channels: [
      { id: 'dm-alice', name: 'Alice Moreau', type: 'dm', status: 'online', avatar: 'AM' },
      { id: 'dm-bob', name: 'Bob Lefevre', type: 'dm', status: 'idle', avatar: 'BL' },
      { id: 'dm-clara', name: 'Clara Dupont', type: 'dm', status: 'dnd', avatar: 'CD' },
      { id: 'dm-david', name: 'David Nguyen', type: 'dm', status: 'offline', avatar: 'DN' },
      { id: 'dm-emma', name: 'Emma Bernard', type: 'dm', status: 'online', avatar: 'EB' },
    ],
  },
  {
    id: 'server-gaming',
    name: 'Serveur Gaming',
    abbr: 'SG',
    color: '#5865F2',
    categories: [
      {
        id: 'cat-info',
        name: 'INFORMATIONS',
        channels: [
          { id: 'ch-rules', name: 'règles', type: 'text' },
          { id: 'ch-announce', name: 'annonces', type: 'text' },
        ],
      },
      {
        id: 'cat-text',
        name: 'SALONS TEXTUELS',
        channels: [
          { id: 'ch-general', name: 'général', type: 'text' },
          { id: 'ch-memes', name: 'mèmes', type: 'text' },
          { id: 'ch-captures', name: 'captures', type: 'text' },
        ],
      },
      {
        id: 'cat-voice',
        name: 'SALONS VOCAUX',
        channels: [
          { id: 'ch-vocal1', name: 'Général', type: 'voice' },
          { id: 'ch-vocal2', name: 'Gaming', type: 'voice' },
          { id: 'ch-vocal3', name: 'AFK', type: 'voice' },
        ],
      },
    ],
  },
  {
    id: 'server-dev',
    name: 'Dev Corner',
    abbr: 'DC',
    color: '#57F287',
    categories: [
      {
        id: 'cat-general',
        name: 'GÉNÉRAL',
        channels: [
          { id: 'ch-dev-general', name: 'général', type: 'text' },
          { id: 'ch-dev-help', name: 'aide', type: 'text' },
          { id: 'ch-dev-showcase', name: 'projets', type: 'text' },
        ],
      },
      {
        id: 'cat-langages',
        name: 'LANGAGES',
        channels: [
          { id: 'ch-js', name: 'javascript', type: 'text' },
          { id: 'ch-py', name: 'python', type: 'text' },
          { id: 'ch-rust', name: 'rust', type: 'text' },
          { id: 'ch-go', name: 'go', type: 'text' },
        ],
      },
      {
        id: 'cat-dev-voice',
        name: 'VOCAL',
        channels: [
          { id: 'ch-dev-vc', name: 'Pair programming', type: 'voice' },
        ],
      },
    ],
  },
  {
    id: 'server-friends',
    name: 'Amis IRL',
    abbr: 'AI',
    color: '#FEE75C',
    categories: [
      {
        id: 'cat-friends',
        name: 'TEXTE',
        channels: [
          { id: 'ch-fr-general', name: 'général', type: 'text' },
          { id: 'ch-fr-photos', name: 'photos', type: 'text' },
          { id: 'ch-fr-plans', name: 'plans-soirées', type: 'text' },
        ],
      },
      {
        id: 'cat-friends-vc',
        name: 'VOCAL',
        channels: [
          { id: 'ch-fr-vc', name: 'Vocal', type: 'voice' },
        ],
      },
    ],
  },
  {
    id: 'server-music',
    name: 'Musique & Art',
    abbr: 'M',
    color: '#EB459E',
    categories: [
      {
        id: 'cat-music',
        name: 'GÉNÉRAL',
        channels: [
          { id: 'ch-mu-partages', name: 'partages', type: 'text' },
          { id: 'ch-mu-critiques', name: 'critiques', type: 'text' },
          { id: 'ch-mu-recommendations', name: 'recommandations', type: 'text' },
        ],
      },
      {
        id: 'cat-music-vc',
        name: 'ÉCOUTE',
        channels: [
          { id: 'ch-mu-vc', name: 'Écoute commune', type: 'voice' },
        ],
      },
    ],
  },
];

const CURRENT_USER = {
  name: 'Utilisateur',
  tag: '#0001',
  status: 'online',
  avatar: 'U',
};

function getServerById(id) {
  return SERVERS.find((s) => s.id === id) || null;
}

function getDefaultChannel(server) {
  if (server.type === 'home') {
    return server.channels[0] || null;
  }
  const firstCategory = server.categories?.[0];
  if (!firstCategory) return null;
  return firstCategory.channels[0] || null;
}
