# La Pince

Application web de gestion de finances personnelles.
Objectif du projet : permettre à l'utilisateur de suivre ses revenus, dépenses, catégories et budgets, avec des alertes automatiques en cas de dépassement, sur une base technique propre, collaborative et déployable.

Application en production : https://lapince.pooya-dev.com

## Sommaire

- Présentation du projet
- Stack technique
- Prérequis
- Installation
- Configuration des variables d'environnement
- Lancement du projet
- Organisation du travail
- Conventions Git
- Règles de pull request
- Structure du projet
- Dépannage

---

## Présentation du projet

**La Pince** est une application web permettant de suivre ses finances personnelles de façon simple et intuitive.

Fonctionnalités principales :
- Inscription (avec confirmation par e-mail) et connexion sécurisée
- Consultation et modification du profil utilisateur, suppression de compte (RGPD)
- Gestion complète des transactions (dépenses / revenus)
- Consultation des catégories
- Définition de budgets par catégorie, avec suivi en temps réel
- Génération automatique d'alertes en cas de dépassement de budget
- Tableau de bord avec statistiques (vue d'ensemble, analyse mensuelle, répartition par catégorie)

---

## Stack technique

### Front-end
- React 19
- TypeScript
- Vite
- Tailwind CSS 4
- React Router
- Recharts (graphiques)
- TanStack Query

### Back-end
- Node.js 22
- Express 5
- TypeScript
- Prisma (ORM) + adaptateur natif `@prisma/adapter-pg`
- Zod (validation)
- JWT (access + refresh token, cookies httpOnly)
- Argon2 (hachage des mots de passe)
- Nodemailer (relais SMTP Brevo / Mailtrap en dev)

### Base de données
- PostgreSQL 17

### DevOps
- Docker / Docker Compose
- Nginx (reverse proxy + certificat SSL Let's Encrypt)
- GitHub Actions (déploiement automatique sur push vers `main`)

### Qualité et collaboration
- Vitest + Supertest (tests unitaires et d'intégration)
- Git / GitHub
- Pull Requests avec revue de code obligatoire

---

## Prérequis

Avant de commencer, installer :
- Node.js (v22 recommandé)
- npm
- Docker
- Docker Compose
- Git

Vérifier les versions si besoin :
```bash
node -v
npm -v
git --version
docker -v
docker compose version
```

---

## Installation

### 1. Cloner le dépôt
```bash
git clone git@github.com:Pouya-AKHVAS/Lapince-main.git
cd Lapince-main
```

### 2. Créer le `.env` à la racine du projet
Créer un fichier `.env` à partir de `.env.example` et renseigner les valeurs (voir `.env.example` pour la liste complète des variables : base de données, JWT, SMTP, CORS...).

### Règles importantes
- Le fichier `.env` ne doit **jamais** être commité (il est dans `.gitignore`).
- Le fichier `.env.example` doit rester dans le dépôt et être tenu à jour.
- Chaque membre doit utiliser exactement les mêmes noms de variables (voir `.env.example`).

---

## Lancement du projet

### En développement (avec hot reload)
À la racine du projet :
```bash
docker compose up -d --build
```
Ceci démarre PostgreSQL, l'API (avec rechargement à chaud via `tsx --watch`) et le client (Vite dev server, accessible sur `http://localhost:5173`).

Pour lancer une migration Prisma pendant le développement :
```bash
docker exec -it <NOM_DU_CONTENEUR_API> npx prisma migrate dev --name <NOM_MIGRATION>
```

### En production
Voir [`DEPLOYMENT.md`](./DEPLOYMENT.md) pour la procédure complète (déploiement automatisé via GitHub Actions).

---

## Conventions Git

### Branches
- `main` : branche de production (protégée, déploiement automatique à chaque push)
- `dev` : branche d'intégration
- `feat/nom-fonctionnalite` : nouvelle fonctionnalité
- `fix/nom-bug` : correction
- `chore/nom-tache` : tâche technique

### Règles
- Ne jamais travailler directement sur `main`.
- Toute modification passe par une Pull Request vers `dev`.
- Une PR doit être relue et approuvée par au moins 1 membre avant fusion.
- Chaque modification notable doit être ajoutée au [`CHANGELOG.md`](./CHANGELOG.md) avant le merge.

### Exemples
```bash
git checkout -b feat/auth-register
git checkout -b fix/navbar-responsive
git checkout -b chore/docker-setup
```

---

## Règles de pull request

Chaque Pull Request doit contenir :
- Un titre clair
- Une description de ce qui a été fait
- Le pourquoi de la modification
- Les étapes pour tester
- Les captures d'écran si nécessaire

### Avant merge
- Code relu
- 1 approve minimum
- Tests passés (`npm run test` côté `api` et `client`)
- Build TypeScript vérifié (`npm run build`)
- Aucun conflit non résolu
- Entrée ajoutée au `CHANGELOG.md`

---

## Dépannage

### Problème de base de données
Vérifier que le conteneur PostgreSQL est bien lancé et en bonne santé :
```bash
docker compose ps
```

### Problème de migration Prisma
```bash
cd api
npx prisma migrate dev
```
ou, depuis un conteneur en cours d'exécution :
```bash
docker exec -it <NOM_DU_CONTENEUR_API> npx prisma migrate dev --name <NOM_MIGRATION>
```

### Problème de dépendances
```bash
npm install
```

### Problème de port déjà utilisé
Vérifier qu'aucune autre application n'utilise le port `3007` côté API ou `5173` côté client (dev).

---

## Bonnes pratiques

- Commiter souvent avec des messages clairs.
- Garder les PR petites et lisibles.
- Synchroniser le front et le back sur les formats d'API (voir `openapi.yaml` pour la spécification complète des routes).
- Documenter toute décision technique importante dans le `CHANGELOG.md`.
- Exécuter `npm run build` en local avant chaque push sur `main` pour éviter de casser le déploiement automatique.
- Mettre à jour ce README si une commande ou une structure change.