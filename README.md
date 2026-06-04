# 💊 PharmaSmart – Plateforme intelligente de pharmacies au Maroc

> Trouvez rapidement vos médicaments dans les pharmacies marocaines grâce à la géolocalisation, le stock en temps réel et l'IA.

---

## 🚀 Stack Technique

| Couche | Technologie |
|--------|------------|
| Frontend | React 18, Redux Toolkit, React Router v6 |
| Backend | Django 4.2, Django REST Framework |
| Auth | JWT (SimpleJWT) + Google OAuth2 |
| Base de données | PostgreSQL 15 |
| Cache / File d'attente | Redis + Celery |
| IA | Claude API (Anthropic) |
| Géolocalisation | Geopy + API GPS navigateur |
| Containerisation | Docker + Docker Compose |
| Serveur web | Nginx (frontend) + Gunicorn (backend) |

---

## ✅ Fonctionnalités

### 👤 Utilisateurs
- 🔍 Recherche de médicaments par nom + ville + géolocalisation GPS
- 📍 Classement pharmacies par distance (km)
- 📄 Fiche détaillée : prix, stock, pharmacie, localisation
- 💊 Gestion ordonnances (commande en ligne désactivée si ordonnance requise)
- 🛒 Commandes en ligne pour médicaments sans ordonnance
- 🤖 Assistant IA : explication, comparaison, chat intelligent

### 🏥 Pharmaciens
- 📦 Gestion stock en temps réel (ajout, modification, mise à jour)
- 📋 Traitement des commandes (confirmation, préparation, livraison)
- 🤖 Analyse IA : alertes rupture, prédictions, recommandations
- 🔐 Espace sécurisé (activation requise par l'admin)

### ⚙️ Administrateurs
- ✅ Validation des comptes pharmaciens
- 👥 Gestion des utilisateurs
- 📊 Supervision globale de la plateforme

---

## 🐳 Installation avec Docker (Recommandé)

```bash
# 1. Cloner le projet
git clone <repo-url>
cd pharmasmart

# 2. Configurer les variables d'environnement
cp backend/.env.example backend/.env
# Éditez backend/.env et remplissez les clés API

# 3. Lancer avec Docker Compose
docker-compose up --build -d

# 4. Créer un super-administrateur
docker-compose exec backend python manage.py createsuperuser

# 5. Accéder à l'application
# Frontend : http://localhost:3000
# Backend API : http://localhost:8000/api
# Admin Django : http://localhost:8000/admin
```

---

## 🛠️ Installation manuelle

### Backend (Django)

```bash
cd backend

# Créer un environnement virtuel
python -m venv venv
source venv/bin/activate   # Windows: venv\Scripts\activate

# Installer les dépendances
pip install -r requirements.txt

# Configurer l'environnement
cp .env.example .env
# Éditez .env avec vos paramètres

# Base de données
python manage.py migrate

# Créer un administrateur
python manage.py createsuperuser

# Lancer le serveur
python manage.py runserver
```

### Frontend (React)

```bash
cd frontend

# Installer les dépendances
npm install

# Configurer
cp .env.example .env
# REACT_APP_API_URL=http://localhost:8000/api

# Lancer
npm start
```

---

## ⚙️ Variables d'environnement

Copiez `backend/.env.example` → `backend/.env` et renseignez :

| Variable | Description | Requis |
|----------|-------------|--------|
| `SECRET_KEY` | Clé secrète Django | ✅ |
| `DB_NAME`, `DB_USER`, `DB_PASSWORD`, `DB_HOST`, `DB_PORT` | Connexion PostgreSQL | ✅ |
| `ANTHROPIC_API_KEY` | Clé Claude AI (https://console.anthropic.com) | ✅ pour IA |
| `GOOGLE_MAPS_API_KEY` | Google Maps | ⚠️ optionnel |
| `GOOGLE_OAUTH2_KEY`, `GOOGLE_OAUTH2_SECRET` | Google OAuth | ⚠️ optionnel |
| `REDIS_URL` | URL Redis | ✅ |
| `EMAIL_HOST_USER`, `EMAIL_HOST_PASSWORD` | SMTP email | ⚠️ optionnel |

---

## 📁 Structure du projet

```
pharmasmart/
├── docker-compose.yml
├── README.md
├── backend/
│   ├── Dockerfile
│   ├── requirements.txt
│   ├── .env.example
│   ├── manage.py
│   ├── pharmasmart/
│   │   ├── settings.py
│   │   └── urls.py
│   └── apps/
│       ├── users/           # Auth, profils
│       ├── pharmacies/      # Gestion pharmacies
│       ├── medications/     # Médicaments, stock
│       ├── orders/          # Commandes
│       └── ai_assistant/    # IA Claude
└── frontend/
    ├── Dockerfile
    ├── nginx.conf
    ├── package.json
    └── src/
        ├── App.js
        ├── index.css
        ├── services/api.js   # Axios + interceptors
        ├── store/            # Redux (auth, medications)
        ├── components/       # Navbar, Footer, AIChat, MedicationCard
        └── pages/
            ├── HomePage.js
            ├── SearchPage.js
            ├── MedicationDetailPage.js
            ├── LoginPage.js
            ├── RegisterPage.js
            ├── pharmacist/   # Dashboard, Medications, Orders, AIAnalysis
            └── admin/        # Dashboard
```

---

## 📝 Licence

Projet réalisé dans le cadre du cahier des charges PharmaSmart.
© 2024 PharmaSmart – Tous droits réservés.

---

## ⚕️ Avertissement médical

PharmaSmart est une plateforme d'information et de mise en relation.
**Consultez toujours un médecin ou pharmacien avant de prendre tout médicament.**
