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

const _AVATAR_COLORS = [
  '#5865f2', '#57f287', '#fee75c', '#eb459e',
  '#ed4245', '#3ba55d', '#faa61a', '#00a8fc',
];

function getAvatarColor(seed) {
  let hash = 0;
  for (let i = 0; i < seed.length; i++) hash = seed.charCodeAt(i) + (hash << 5) - hash;
  return _AVATAR_COLORS[Math.abs(hash) % _AVATAR_COLORS.length];
}

const MOCK_MESSAGES = {
  'ch-general': [
    { id: 'g1', authorId: 'zephy', author: 'Zephyr', avatar: 'ZP', content: 'Yo les gars quelqu\'un joue à Valorant ce soir ?', timestamp: new Date('2026-04-20T14:00:00') },
    { id: 'g2', authorId: 'nova', author: 'NovaStrike', avatar: 'NS', content: 'Oui je suis là ! On fait une full team ?', timestamp: new Date('2026-04-20T14:01:00') },
    { id: 'g3', authorId: 'zephy', author: 'Zephyr', avatar: 'ZP', content: 'Sick, faut qu\'on soit 5', timestamp: new Date('2026-04-20T14:01:30') },
    { id: 'g4', authorId: 'zephy', author: 'Zephyr', avatar: 'ZP', content: 'Vous connaissez quelqu\'un de dispo ?', timestamp: new Date('2026-04-20T14:01:50') },
    { id: 'g5', authorId: 'rex', author: 'RexGamer', avatar: 'RG', content: 'Je peux pas avant 21h, boulot 😩', timestamp: new Date('2026-04-20T14:02:00') },
    { id: 'g6', authorId: 'nova', author: 'NovaStrike', avatar: 'NS', content: '21h c\'est bon pour moi aussi', timestamp: new Date('2026-04-20T14:02:15') },
    { id: 'g7', authorId: 'zephy', author: 'Zephyr', avatar: 'ZP', content: 'Top ! On se retrouve à 21h alors', timestamp: new Date('2026-04-20T14:02:45') },
    { id: 'g8', authorId: 'luna', author: 'LunaGG', avatar: 'LG', content: 'Comptez sur moi 🎮', timestamp: new Date('2026-04-20T14:03:00') },
    { id: 'g9', authorId: 'rex', author: 'RexGamer', avatar: 'RG', content: 'GG on a notre team !', timestamp: new Date('2026-04-20T14:03:20') },
  ],
  'ch-memes': [
    { id: 'me1', authorId: 'luna', author: 'LunaGG', avatar: 'LG', content: 'Le mème du jour 😂😂😂', timestamp: new Date('2026-04-20T10:00:00') },
    { id: 'me2', authorId: 'nova', author: 'NovaStrike', avatar: 'NS', content: 'XDDDDD j\'en peux plus', timestamp: new Date('2026-04-20T10:01:00') },
    { id: 'me3', authorId: 'zephy', author: 'Zephyr', avatar: 'ZP', content: 'Trop relatable ce mème fr fr', timestamp: new Date('2026-04-20T10:01:30') },
  ],
  'ch-announce': [
    { id: 'an1', authorId: 'zephy', author: 'Zephyr', avatar: 'ZP', content: '📢 **Bienvenue sur le serveur Gaming !**\n\nRespectez les règles et amusez-vous bien.', timestamp: new Date('2026-04-01T09:00:00') },
    { id: 'an2', authorId: 'zephy', author: 'Zephyr', avatar: 'ZP', content: '🏆 Tournoi Valorant ce samedi 19h ! Inscrivez-vous dans #général', timestamp: new Date('2026-04-18T14:00:00') },
  ],
  'ch-dev-general': [
    { id: 'd1', authorId: 'alex', author: 'Alex_Dev', avatar: 'AD', content: 'Quelqu\'un a déjà utilisé Bun en prod ?', timestamp: new Date('2026-04-20T09:00:00') },
    { id: 'd2', authorId: 'sam', author: 'Samira', avatar: 'SM', content: 'Oui chez nous depuis 3 mois, c\'est stable', timestamp: new Date('2026-04-20T09:01:00') },
    { id: 'd3', authorId: 'alex', author: 'Alex_Dev', avatar: 'AD', content: 'La perf est vraiment meilleure que Node ?', timestamp: new Date('2026-04-20T09:01:30') },
    { id: 'd4', authorId: 'sam', author: 'Samira', avatar: 'SM', content: 'Build 3x plus rapide et startup quasi instantané', timestamp: new Date('2026-04-20T09:02:00') },
    { id: 'd5', authorId: 'sam', author: 'Samira', avatar: 'SM', content: 'Et le watch mode est vraiment bien foutu', timestamp: new Date('2026-04-20T09:02:10') },
    { id: 'd6', authorId: 'theo', author: 'TheoCode', avatar: 'TC', content: 'Par contre l\'éco npm est pas encore parfait, quelques edge cases', timestamp: new Date('2026-04-20T09:02:30') },
    { id: 'd7', authorId: 'alex', author: 'Alex_Dev', avatar: 'AD', content: 'Compris, je vais tester sur un projet side d\'abord', timestamp: new Date('2026-04-20T09:03:00') },
    { id: 'd8', authorId: 'sam', author: 'Samira', avatar: 'SM', content: 'Bonne approche 👍', timestamp: new Date('2026-04-20T09:03:15') },
  ],
  'ch-js': [
    { id: 'js1', authorId: 'theo', author: 'TheoCode', avatar: 'TC', content: 'Quelqu\'un peut m\'expliquer `structuredClone` vs JSON.parse/stringify ?', timestamp: new Date('2026-04-20T11:00:00') },
    { id: 'js2', authorId: 'sam', author: 'Samira', avatar: 'SM', content: '`structuredClone` est natif, gère les types spéciaux (Date, Map, Set)', timestamp: new Date('2026-04-20T11:01:00') },
    { id: 'js3', authorId: 'sam', author: 'Samira', avatar: 'SM', content: '`JSON.parse/stringify` ne gère pas les dates correctement et est plus lent', timestamp: new Date('2026-04-20T11:01:20') },
    { id: 'js4', authorId: 'theo', author: 'TheoCode', avatar: 'TC', content: 'Ah ouais c\'est exactement ce que je cherchais, merci !', timestamp: new Date('2026-04-20T11:02:00') },
  ],
  'ch-dev-help': [
    { id: 'h1', authorId: 'alex', author: 'Alex_Dev', avatar: 'AD', content: 'Comment gérer les erreurs async/await proprement ?', timestamp: new Date('2026-04-19T15:00:00') },
    { id: 'h2', authorId: 'theo', author: 'TheoCode', avatar: 'TC', content: 'Pattern classique :\n```\ntry {\n  const data = await fetch(url);\n} catch (err) {\n  console.error(err);\n}\n```', timestamp: new Date('2026-04-19T15:02:00') },
    { id: 'h3', authorId: 'sam', author: 'Samira', avatar: 'SM', content: 'Ou utiliser une lib comme `neverthrow` pour le Result pattern', timestamp: new Date('2026-04-19T15:03:00') },
  ],
  'ch-fr-general': [
    { id: 'fr1', authorId: 'marie', author: 'Marie', avatar: 'MA', content: 'Les gars vous avez vu le film ce week-end ?', timestamp: new Date('2026-04-20T16:00:00') },
    { id: 'fr2', authorId: 'paul', author: 'Paul', avatar: 'PA', content: 'Oui c\'était trop bien ! La fin m\'a choqué', timestamp: new Date('2026-04-20T16:01:00') },
    { id: 'fr3', authorId: 'marie', author: 'Marie', avatar: 'MA', content: 'Même, j\'avais pas vu venir du tout 😱', timestamp: new Date('2026-04-20T16:01:30') },
    { id: 'fr4', authorId: 'leo', author: 'Léo', avatar: 'LE', content: 'J\'ai pas pu venir 😢 vous spoilez pas !', timestamp: new Date('2026-04-20T16:02:00') },
    { id: 'fr5', authorId: 'paul', author: 'Paul', avatar: 'PA', content: 'Haha ok ok on te dit rien 🤐', timestamp: new Date('2026-04-20T16:02:30') },
  ],
  'ch-fr-plans': [
    { id: 'fp1', authorId: 'marie', author: 'Marie', avatar: 'MA', content: 'On fait quoi ce samedi ?', timestamp: new Date('2026-04-20T12:00:00') },
    { id: 'fp2', authorId: 'leo', author: 'Léo', avatar: 'LE', content: 'Bowling ? ça fait longtemps', timestamp: new Date('2026-04-20T12:01:00') },
    { id: 'fp3', authorId: 'paul', author: 'Paul', avatar: 'PA', content: '+1 bowling', timestamp: new Date('2026-04-20T12:01:30') },
    { id: 'fp4', authorId: 'marie', author: 'Marie', avatar: 'MA', content: 'On réserve pour combien ?', timestamp: new Date('2026-04-20T12:02:00') },
    { id: 'fp5', authorId: 'leo', author: 'Léo', avatar: 'LE', content: '5 personnes avec Sophie et Thomas', timestamp: new Date('2026-04-20T12:02:30') },
    { id: 'fp6', authorId: 'marie', author: 'Marie', avatar: 'MA', content: 'Ok je réserve pour 18h ?', timestamp: new Date('2026-04-20T12:03:00') },
    { id: 'fp7', authorId: 'paul', author: 'Paul', avatar: 'PA', content: 'Parfait pour moi 👌', timestamp: new Date('2026-04-20T12:03:15') },
  ],
  'ch-mu-partages': [
    { id: 'mu1', authorId: 'iris', author: 'Iris', avatar: 'IR', content: 'Vous connaissez Arooj Aftab ? La voix est incroyable', timestamp: new Date('2026-04-20T17:00:00') },
    { id: 'mu2', authorId: 'noe', author: 'Noé', avatar: 'NO', content: 'Oui son album Vulture Prince est chef-d\'œuvre', timestamp: new Date('2026-04-20T17:01:30') },
    { id: 'mu3', authorId: 'iris', author: 'Iris', avatar: 'IR', content: 'Exactement !! Mujhe Pata Hota en boucle depuis une semaine', timestamp: new Date('2026-04-20T17:02:00') },
  ],
  'dm-alice': [
    { id: 'a1', authorId: 'alice', author: 'Alice Moreau', avatar: 'AM', content: 'Salut ! T\'as avancé sur le projet ?', timestamp: new Date('2026-04-20T13:00:00') },
    { id: 'a2', authorId: 'me', author: 'Utilisateur', avatar: 'U', content: 'Ouais j\'ai terminé la partie auth hier soir 🎉', timestamp: new Date('2026-04-20T13:01:00') },
    { id: 'a3', authorId: 'alice', author: 'Alice Moreau', avatar: 'AM', content: 'Nice ! Et la partie dashboard ?', timestamp: new Date('2026-04-20T13:01:30') },
    { id: 'a4', authorId: 'me', author: 'Utilisateur', avatar: 'U', content: 'En cours, j\'ai un problème avec les charts', timestamp: new Date('2026-04-20T13:02:00') },
    { id: 'a5', authorId: 'me', author: 'Utilisateur', avatar: 'U', content: 'Les données ne se mettent pas à jour correctement', timestamp: new Date('2026-04-20T13:02:20') },
    { id: 'a6', authorId: 'alice', author: 'Alice Moreau', avatar: 'AM', content: 'Je peux regarder si tu veux, envoie le code', timestamp: new Date('2026-04-20T13:03:00') },
    { id: 'a7', authorId: 'me', author: 'Utilisateur', avatar: 'U', content: 'Merci c\'est sympa ! Je t\'envoie ça', timestamp: new Date('2026-04-20T13:03:30') },
  ],
  'dm-bob': [
    { id: 'b1', authorId: 'bob', author: 'Bob Lefevre', avatar: 'BL', content: 'T\'es dispo pour le call de cet aprem ?', timestamp: new Date('2026-04-20T11:00:00') },
    { id: 'b2', authorId: 'me', author: 'Utilisateur', avatar: 'U', content: 'Oui 15h c\'est bon pour moi', timestamp: new Date('2026-04-20T11:01:00') },
    { id: 'b3', authorId: 'bob', author: 'Bob Lefevre', avatar: 'BL', content: 'Parfait, je t\'envoie le lien Teams', timestamp: new Date('2026-04-20T11:01:30') },
    { id: 'b4', authorId: 'bob', author: 'Bob Lefevre', avatar: 'BL', content: 'https://teams.microsoft.com/join/xyz (fictif)', timestamp: new Date('2026-04-20T11:01:45') },
  ],
  'dm-clara': [
    { id: 'c1', authorId: 'clara', author: 'Clara Dupont', avatar: 'CD', content: 'Coucou ! Tu viens à la soirée vendredi ?', timestamp: new Date('2026-04-19T18:00:00') },
    { id: 'c2', authorId: 'me', author: 'Utilisateur', avatar: 'U', content: 'Je sais pas encore, j\'attends de voir si j\'ai fini le projet', timestamp: new Date('2026-04-19T18:05:00') },
    { id: 'c3', authorId: 'clara', author: 'Clara Dupont', avatar: 'CD', content: 'Ok tiens moi au courant 🤞', timestamp: new Date('2026-04-19T18:06:00') },
  ],
  'dm-david': [
    { id: 'dav1', authorId: 'david', author: 'David Nguyen', avatar: 'DN', content: 'Yo t\'as le cours de vendredi ?', timestamp: new Date('2026-04-18T10:00:00') },
    { id: 'dav2', authorId: 'me', author: 'Utilisateur', avatar: 'U', content: 'Ouais je t\'envoie', timestamp: new Date('2026-04-18T10:05:00') },
    { id: 'dav3', authorId: 'david', author: 'David Nguyen', avatar: 'DN', content: 'Merci 🙏', timestamp: new Date('2026-04-18T10:06:00') },
  ],
  'dm-emma': [
    { id: 'e1', authorId: 'emma', author: 'Emma Bernard', avatar: 'EB', content: 'Heyy ! Tu regardes quoi en ce moment comme série ?', timestamp: new Date('2026-04-20T20:00:00') },
    { id: 'e2', authorId: 'me', author: 'Utilisateur', avatar: 'U', content: 'Severance sur Apple TV, c\'est dingue', timestamp: new Date('2026-04-20T20:02:00') },
    { id: 'e3', authorId: 'emma', author: 'Emma Bernard', avatar: 'EB', content: 'Oh j\'ai entendu que c\'est bien !', timestamp: new Date('2026-04-20T20:02:30') },
    { id: 'e4', authorId: 'emma', author: 'Emma Bernard', avatar: 'EB', content: 'La saison 2 est sortie non ?', timestamp: new Date('2026-04-20T20:02:45') },
    { id: 'e5', authorId: 'me', author: 'Utilisateur', avatar: 'U', content: 'Ouais et elle est encore meilleure', timestamp: new Date('2026-04-20T20:03:00') },
  ],
};

const SERVER_MEMBERS = {
  'server-gaming': {
    online: [
      { id: 'zephy', name: 'Zephyr', avatar: 'ZP', status: 'online', role: 'Admin' },
      { id: 'nova', name: 'NovaStrike', avatar: 'NS', status: 'online', role: 'Modérateur' },
      { id: 'luna', name: 'LunaGG', avatar: 'LG', status: 'online' },
      { id: 'spike', name: 'Spike_FPS', avatar: 'SF', status: 'idle' },
      { id: 'kira', name: 'KiraXO', avatar: 'KX', status: 'dnd' },
    ],
    offline: [
      { id: 'rex', name: 'RexGamer', avatar: 'RG', status: 'offline' },
      { id: 'pixel', name: 'PixelBro', avatar: 'PB', status: 'offline' },
      { id: 'ghost', name: 'GhostSniper', avatar: 'GS', status: 'offline' },
    ],
  },
  'server-dev': {
    online: [
      { id: 'alex', name: 'Alex_Dev', avatar: 'AD', status: 'online', role: 'Admin' },
      { id: 'sam', name: 'Samira', avatar: 'SM', status: 'online' },
      { id: 'theo', name: 'TheoCode', avatar: 'TC', status: 'idle' },
    ],
    offline: [
      { id: 'marco', name: 'Marco_Rust', avatar: 'MR', status: 'offline' },
      { id: 'yuki', name: 'Yuki_py', avatar: 'YP', status: 'offline' },
    ],
  },
  'server-friends': {
    online: [
      { id: 'marie', name: 'Marie', avatar: 'MA', status: 'online' },
      { id: 'leo', name: 'Léo', avatar: 'LE', status: 'idle' },
    ],
    offline: [
      { id: 'paul', name: 'Paul', avatar: 'PA', status: 'offline' },
      { id: 'sophie', name: 'Sophie', avatar: 'SO', status: 'offline' },
      { id: 'thomas', name: 'Thomas', avatar: 'TH', status: 'offline' },
    ],
  },
  'server-music': {
    online: [
      { id: 'iris', name: 'Iris', avatar: 'IR', status: 'online', role: 'Admin' },
      { id: 'noe', name: 'Noé', avatar: 'NO', status: 'online' },
    ],
    offline: [
      { id: 'clara2', name: 'Clara_Art', avatar: 'CA', status: 'offline' },
      { id: 'lena', name: 'Léna', avatar: 'LN', status: 'offline' },
    ],
  },
};
