

# Cahier des charges — Projet libre

> Template pour votre cahier des charges. Adaptez-le à votre projet.

## 1. Informations générales

- **Nom du projet** : Build and Jump
- **Membres de l'équipe** : Theo Bensaci, Maxime Regenass, Santiago Sugrañes
- **Lien du dépôt Git** :

## 2. Description du projet

Un petit platformeur web où l'on peut créer un niveau avec un editeur et affronter d'autre jouer (que l'on voit en temps réel (comme des fantômes dans les jeux de course) ) pour voir qui sais est le plus rappide

Un peu un genre de mario maker si on veut.
Si le temps le permette, le but serais de pouvoir faire des courses sur des niveaux crée par les joueur, mais si non, un mode time attaque serais déja un bon début

## 3. Objectifs
L'utilisateur dois pouvoir :
- crée un niveaux
- upload un niveaux et permettre a d'autre de le jouer
- jouer un niveaux crée par un autre utilisateur
- crée une salle (pour fair un time attaque contre d'autre joueur)
- rejoindre une salle
- voir les autre joueur de la salle ce déplacer en temps réel
- voir les meilleurs temps de tous les joueur de la salle de la session actuel
- voir le top 5 des meilleur temps du niveaux


Objectifs principaux du point de vue utilisateur (par ex. *"permettre à un·e utilisateur·rice de…"*).

## 4. Fonctionnalités

### 4.1 Principales

- jeu
  - jouer un niveaux en local
  - pouvoire recommencer un niveaux facilement
  - avoir un selection d'objet plus grande simplement des bloces (donc par exemple, des piques, des platforme qui bouge, des checkpoints, etc...)
  - pouvoir avoir la majorité des mecanique de base qu'a democtratiser "celeste" (https://maddythorson.medium.com/celeste-forgiveness-31e4a40399f1), sois dans notre cas :
    - Coyote time
    - Buffer system
    - Halved-Gravity Jump Peak
    - Jump Corner Correction
    - Semi-Solid Popping (si nos mecanique nous le permette)
    - Lift Momentum Storage

- editeur
  - load un niveaux depuis un fichier local
  - jouer le niveaux
  - sauvegarder le niveaux en local (fichier json)
  - selection un outile parmit une selections
  - pouvoir placer tous les objets que propose le jeu (on doit pouvoir crée un niveau qu'avec l'editeur sans devoir passer par du code ou d'autre moyen)
- online
  - niveaux
    - upload un niveaux sur le server
      - chaque niveaux dois être attrbuer a un ID sur le sever
    - download un niveaux crée par un autre utilisateur depuis le server
  - salle
    - crée une sallee time attaque sur le server
      - y attribuer un niveaux
      - la salle est relier a ID
    - les autre joueur peuvent rejoindre une salle
      - pouvoir rejoindre la salle vier un ID
    - voir les autre joueur de la salle ce déplacer en temps réel
    - voir les meilleur temps des joueur de la salle
  - upload un temps sur le sever relier un niveaux et un nom de psodo
  - voir les top 5 meilleur temps du niveau qu'on est en train de fair

Les fonctionnalités que votre application **doit** offrir pour être considérée
comme aboutie.

- …

### 4.2 Optionnelles

- plus d'objet de jeu (a voir)
- mode alternatife de salle (knock out ou race)
- compte utilisateur
- mode Jam (où N joueur doivent crée un niveaux dans un temps impartie, puis c'est N joueur devront faire la course sur chaqu'un des niveaux crée, le gagant étant le joueur avec le meilleur placement moyen)

## 5. Technologies

Listez les technologies envisagées et **justifiez brièvement chaque choix**.

- **Moteur de jeu** : moteur fait maison durant la durée du projet par nos soins :] (en vanila JS)
  - **Frontend** : Canvas (géré par la moteur de jeu)
- **Comunication** : WebSocket
- **Base de données** : Firebase/FireStore
- **Back-end** : Express


## 6. Architecture

Vue d'ensemble des composants et de leurs interactions (client, serveur, base
de données, services tiers…). Un petit schéma est bienvenu.

## 7. Évolutions possibles


*(Optionnel)* Pistes d'évolution identifiées mais hors périmètre du labo.
