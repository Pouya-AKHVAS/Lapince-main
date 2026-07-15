# Procédure de déploiement — La Pince

Serveur : `pouya-server` (VPS-Hetzner)
Domaine : `https://lapince.pooya-dev.com`
Repo : `git@github.com:Pouya-AKHVAS/Lapince-main.git`
Répertoire sur le serveur : `/var/www/lapince`

---

## 1. Déploiement automatique (flux normal)

Le déploiement est **entièrement automatisé** via GitHub Actions. À chaque `git push` sur la branche `main` :

1. GitHub Actions se connecte au serveur en SSH (action `appleboy/ssh-action`)
2. Le serveur exécute :
   ```bash
   cd /var/www/lapince
   git fetch origin main
   git reset --hard origin/main

   docker compose -f docker-compose.prod.yml --env-file .env down --remove-orphans
   docker compose -f docker-compose.prod.yml --env-file .env up -d --build
   ```
3. L'API régénère le client Prisma (`prisma generate`) et compile le TypeScript (`npm run build`) pendant le build de l'image Docker
4. Au démarrage du conteneur API, `prisma db push` puis `prisma db seed` synchronisent le schéma et les catégories par défaut

**Aucune action manuelle n'est nécessaire** pour un déploiement courant — un simple `git push origin main` (après merge d'une PR) suffit.

⚠️ **Avant de push sur `main`**, toujours vérifier en local que le build ne casse pas :
```bash
cd api && npm run build
```

---

## 2. Premier déploiement sur un nouveau serveur (setup initial)

Cette section ne concerne que la mise en place initiale du serveur, pas les mises à jour courantes.

### 2.1 Prérequis sur le serveur

```bash
docker --version
docker compose version
```

Si Docker n'est pas installé :
```bash
curl -fsSL https://get.docker.com | sh
sudo usermod -aG docker $USER
newgrp docker
```

### 2.2 Cloner le dépôt

```bash
sudo mkdir -p /var/www/lapince
cd /var/www/lapince
git clone git@github.com:Pouya-AKHVAS/Lapince-main.git .
```

### 2.3 Créer le fichier `.env` de production

```bash
cp .env.example .env
nano .env
```

Variables clés à renseigner (voir `.env.example` pour la liste complète) :
- `POSTGRES_USER`, `POSTGRES_PASSWORD`, `POSTGRES_DB`
- `JWT_SECRET` (générer avec `openssl rand -hex 32`)
- `DATABASE_URL`
- `CORS_ORIGIN` et `ALLOWED_ORIGINS` (doivent pointer vers `https://lapince.pooya-dev.com`)
- `SMTP_HOST`, `SMTP_PORT`, `SMTP_USER`, `SMTP_PASS` (relais Brevo)
- `VITE_API_BASE_URL=/api`

⚠️ Ne jamais commiter ce fichier `.env` (il est dans `.gitignore`). Ne jamais partager ses valeurs en clair (JWT_SECRET, mots de passe, clés SMTP).

### 2.4 Configurer Nginx et le certificat SSL

Le service `client` (conteneur Nginx) monte la configuration depuis `src/client/nginx.conf` et les certificats depuis `/etc/letsencrypt` (Let's Encrypt / Certbot) présents sur l'hôte. Générer le certificat au préalable avec Certbot si ce n'est pas déjà fait :
```bash
sudo certbot certonly --standalone -d lapince.pooya-dev.com
```

### 2.5 Démarrer les conteneurs

```bash
docker compose -f docker-compose.prod.yml --env-file .env up -d --build
```

### 2.6 Configurer le secret GitHub Actions

Dans les paramètres du repo GitHub (`Settings > Secrets and variables > Actions`), renseigner les secrets utilisés par le workflow SSH (`HOST`, `USERNAME`, `KEY` — clé privée SSH du serveur) pour que les prochains push déclenchent le déploiement automatique.

---

## 3. Vérifier que tout tourne

```bash
docker compose -f docker-compose.prod.yml ps
docker compose -f docker-compose.prod.yml logs api --tail=50
docker compose -f docker-compose.prod.yml logs client --tail=50
```

L'application est accessible sur : `https://lapince.pooya-dev.com`

---

## 4. Commandes utiles (maintenance)

```bash
# Arrêter les conteneurs
docker compose -f docker-compose.prod.yml down

# Arrêter ET supprimer les volumes (⚠ efface la base de données)
docker compose -f docker-compose.prod.yml down -v

# Redémarrer un seul service
docker compose -f docker-compose.prod.yml restart api

# Ouvrir un shell dans l'API
docker compose -f docker-compose.prod.yml exec api sh

# Voir les logs en temps réel
docker compose -f docker-compose.prod.yml logs -f

# Relancer le seed manuellement
docker compose -f docker-compose.prod.yml exec api npx prisma db seed
```

---

## 5. En cas de problème

**Conteneur qui redémarre en boucle :**
```bash
docker compose -f docker-compose.prod.yml logs api --tail=100
```

**Erreur de connexion à la base de données :**
- Vérifier que `DATABASE_URL` correspond à `POSTGRES_USER` / `POSTGRES_PASSWORD` / `POSTGRES_DB`
- Vérifier le healthcheck : `docker compose -f docker-compose.prod.yml ps` → colonne `STATUS` doit indiquer `healthy`

**Le déploiement automatique (GitHub Actions) échoue :**
- Consulter l'onglet `Actions` du repo GitHub pour voir le log détaillé de l'étape SSH
- Vérifier que le build local (`npm run build` dans `api/`) passe avant de push, pour éviter qu'un build cassé stoppe le déploiement en pleine coupure de service

**Rebuild propre (si cache Docker problématique) :**
```bash
docker compose -f docker-compose.prod.yml down
docker compose -f docker-compose.prod.yml build --no-cache
docker compose -f docker-compose.prod.yml up -d
```