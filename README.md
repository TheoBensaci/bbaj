# Build and Jump

Plateformer 2D Vanilla JS, avec un éditeur de niveaux intégré et un mode multijoueur en ligne.

## Prérequis

- **Node.js** >= 12.19
- **MongoDB** (pour les fonctionnalités en ligne : stockage des maps et classements)
- **npm** (fourni avec Node.js)

## Installation

```bash
git clone https://github.com/Me-Theo/Build_And_Jump
cd Build_And_Jump
npm install
```

Assurez-vous que MongoDB tourne sur `mongodb://localhost:27017` avant de lancer le serveur.

## Lancer le projet

### Mode développement (rechargement automatique)

```bash
npm run watch
```

### Mode production

```bash
npm start
```

Le serveur démarre sur le port **3000**. Ouvrir `http://localhost:3000` dans un navigateur.

## Fonctionnalités

- **Mode Local** — Jouer aux niveaux de la campagne ou importer un niveau
- **Mode Build** — Éditeur de niveaux complet (tuiles, plateformes mobiles, pics, tremplins, etc.)
- **Mode Online** — Créer ou rejoindre une room pour des courses chronométrées avec fantômes des autres joueurs

## Auteurs

Theo Bensaci, Maxime Regenass et Santiago Sugrañes
