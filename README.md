# DiscordBeLike

Réplique visuelle de Discord construite avec **Electron** et enrichie d'une couche **temps réel** via **Socket.IO**.  
Le projet simule l'interface desktop Discord (serveurs, salons, messages, membres, thème clair/sombre, etc.) et ajoute une messagerie privée en direct entre utilisateurs.

## Apercu

- Interface desktop type Discord avec barre de titre personnalisee
- Navigation serveurs/salons + panneau membres
- Chat local (mock) pour la partie UI
- DM reels en temps reel via Socket.IO
- Gestion d'amis (demande, acceptation, refus, suppression)
- Persistance simple des donnees serveur dans `server/data.json`

## Stack technique

- `Electron` (application desktop)
- `Vanilla JavaScript` (front renderer)
- `Socket.IO` / `socket.io-client` (temps reel)
- `Node.js + Express` (serveur realtime)

## Prerequis

- `Node.js` 18+ recommande
- `npm` 9+ recommande
- Windows/macOS/Linux

## Installation

```bash
npm install
```

## Configuration

Le projet lit un fichier `.env` a la racine (charge dans le process Electron).

Variables actuellement utilisees :

- `DISCORD_USERNAME` : nom affiche dans l'interface

Exemple minimal :

```env
DISCORD_USERNAME=Panda_Sauvage
```

## Lancement en developpement

Deux processus doivent tourner en parallele :

1. **Serveur Socket.IO**
2. **Application Electron**

### Terminal 1 - Serveur

```bash
npm run server
```

### Terminal 2 - Electron

```bash
npm run dev
```

Alternative sans watch serveur :

```bash
npm run server
npm start
```

## Scripts npm

- `npm start` : lance Electron
- `npm run dev` : lance Electron avec logs
- `npm run server` : lance le serveur realtime
- `npm run server:dev` : lance le serveur realtime en mode watch

## Structure du projet

```text
DiscordBeLike/
├── server/
│   ├── index.js           # Serveur Express + Socket.IO
│   └── data.json          # Persistance JSON (utilisateurs, amis, messages)
├── src/
│   ├── main/
│   │   ├── main.js        # Process principal Electron (fenetre, tray, IPC)
│   │   ├── preload.js     # Bridge securise vers le renderer
│   │   └── iconGenerator.js
│   └── renderer/
│       ├── index.html
│       ├── scripts/       # Logique UI, navigation, chat, socket, etc.
│       └── styles/        # Feuilles de style par zone fonctionnelle
├── .env
├── package.json
└── README.md
```

## Fonctionnalites principales

### UI / UX

- Barre de titre custom (minimiser, maximiser, fermer)
- Theme clair/sombre
- Recherche dans la zone de chat
- Gestion du statut utilisateur et humeur du jour
- Changement/ajout de comptes locaux
- Creation de serveurs mock

### Temps reel

- Connexion Socket.IO depuis le renderer
- Envoi/reception de DM en direct
- Historique DM recupere depuis le serveur
- Indicateur "est en train d'ecrire"
- Presence ami en ligne/hors ligne
- Badge de demandes d'amis et messages non lus

## Reseau local et IP serveur

Le client socket est actuellement configure sur :

- `http://172.20.10.3:3001` dans `src/renderer/scripts/socket.js`

Le CSP autorise aussi `localhost:3001` dans `src/renderer/index.html`, mais la constante de connexion pointe sur l'IP locale ci-dessus.  
Si ton IP change, mets a jour `SOCKET_URL` dans `src/renderer/scripts/socket.js`.

## Limitations actuelles

- Pas d'authentification securisee (username utilise comme identifiant)
- Persistance basee sur un fichier JSON local (pas de base de donnees)
- Pas de chiffrement ni gestion avancee des permissions
- Fonctionnalite orientee prototype / apprentissage

## Pistes d'amelioration

- Ajouter une authentification reelle (hash + tokens/sessions)
- Remplacer `data.json` par une base SQLite/PostgreSQL
- Externaliser la config serveur (URL Socket via `.env`)
- Ajouter tests unitaires et integration
- Packager l'application (build installable par OS)

## Contribution

1. Cree une branche a partir de `main`
2. Developpe ta fonctionnalite
3. Verifie manuellement l'app + serveur
4. Ouvre une Pull Request claire avec contexte et tests effectues

## Collaboration

Ce projet a été fait en groupe:

- Enzo Turpin
- Maria Bouchene
