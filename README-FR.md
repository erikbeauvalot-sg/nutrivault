# NutriVault

**Logiciel de gestion de cabinet pour diététiciens et nutritionnistes**

NutriVault est une application complète conçue pour aider les professionnels de la nutrition à gérer efficacement leur cabinet. Suivez vos patients, planifiez les visites, surveillez les mesures de santé, générez des factures et communiquez avec vos patients - tout en un seul endroit.

---

## Table des matières

- [Aperçu des fonctionnalités](#aperçu-des-fonctionnalités)
- [Guide de démarrage rapide](#guide-de-démarrage-rapide)
- [Guide utilisateur](#guide-utilisateur)
  - [Tableau de bord](#tableau-de-bord)
  - [Gestion des patients](#gestion-des-patients)
  - [Gestion des visites](#gestion-des-visites)
  - [Mesures de santé](#mesures-de-santé)
  - [Facturation](#facturation)
  - [Champs personnalisés](#champs-personnalisés)
  - [Email et communication](#email-et-communication)
  - [Fonctionnalités IA](#fonctionnalités-ia)
  - [Intégration calendrier](#intégration-calendrier)
- [Installation](#installation)
- [Configuration](#configuration)
- [Documentation technique](#documentation-technique)
- [Support](#support)

---

## Aperçu des fonctionnalités

### Pour les diététiciens

| Fonctionnalité | Description |
|----------------|-------------|
| **Gestion des patients** | Créez et gérez les dossiers patients avec des champs personnalisés |
| **Planification des visites** | Planifiez les rendez-vous avec intégration calendrier |
| **Suivi de santé** | Surveillez le poids, l'IMC, la tension artérielle et des mesures personnalisées |
| **Alertes automatiques** | Soyez notifié lorsque les valeurs des patients dépassent les seuils |
| **Facturation** | Générez et envoyez des factures professionnelles |
| **Suivi IA** | Générez des emails de suivi personnalisés avec l'IA |
| **Rappels par email** | Rappels de rendez-vous automatiques |
| **Export de données** | Exportez les données patients en CSV, Excel ou PDF |

### Pour les administrateurs

| Fonctionnalité | Description |
|----------------|-------------|
| **Gestion des utilisateurs** | Créez et gérez les comptes des diététiciens |
| **Rôles et permissions** | Configurez les contrôles d'accès |
| **Champs personnalisés** | Créez des champs de données personnalisés pour votre cabinet |
| **Définitions de mesures** | Définissez les mesures de santé avec seuils d'alerte |
| **Modèles d'emails** | Créez des modèles d'emails réutilisables |
| **Configuration IA** | Configurez les fournisseurs IA (OpenAI, Claude, Mistral) |

---

## Guide de démarrage rapide

### Première connexion

1. Ouvrez NutriVault dans votre navigateur
2. Entrez votre **nom d'utilisateur** et **mot de passe**
3. Cliquez sur **Se connecter**

### Créer votre premier patient

1. Cliquez sur **Patients** dans la barre latérale
2. Cliquez sur le bouton **+ Nouveau patient**
3. Remplissez les informations du patient :
   - Prénom et Nom (obligatoires)
   - Email (pour les communications)
   - Numéro de téléphone
   - Date de naissance
4. Cliquez sur **Enregistrer**

### Planifier une visite

1. Cliquez sur **Visites** dans la barre latérale
2. Cliquez sur **+ Nouvelle visite**
3. Sélectionnez le patient
4. Choisissez la date et l'heure
5. Sélectionnez le type de visite (Initiale, Suivi, Finale)
6. Cliquez sur **Créer**

### Enregistrer des mesures de santé

1. Ouvrez le profil d'un patient
2. Allez dans l'onglet **Mesures**
3. Cliquez sur **Ajouter une mesure**
4. Entrez les valeurs pour le poids, la taille, la tension artérielle, etc.
5. Cliquez sur **Enregistrer**

---

## Guide utilisateur

### Tableau de bord

Le tableau de bord fournit une vue d'ensemble de votre cabinet :

- **Rendez-vous du jour** - Visites planifiées pour aujourd'hui
- **Patients récents** - Patients récemment consultés ou mis à jour
- **Alertes** - Alertes de mesures de santé nécessitant une attention
- **Actions rapides** - Raccourcis vers les tâches courantes

### Gestion des patients

#### Consulter les patients

- Cliquez sur **Patients** dans la barre latérale pour voir tous les patients
- Utilisez la **barre de recherche** pour trouver des patients par nom ou email
- Utilisez les **filtres** pour affiner les résultats par statut ou diététicien

#### Profil patient

Chaque profil patient contient :

| Onglet | Contenu |
|--------|---------|
| **Aperçu** | Informations de base, coordonnées, champs personnalisés |
| **Visites** | Historique de toutes les visites |
| **Mesures** | Mesures de santé avec graphiques |
| **Documents** | Fichiers téléchargés et documents partagés |
| **Facturation** | Factures et historique des paiements |

#### Modifier les informations d'un patient

1. Ouvrez le profil du patient
2. Cliquez sur le bouton **Modifier**
3. Modifiez les informations
4. Cliquez sur **Enregistrer**

### Gestion des visites

#### Types de visites

| Type | Description |
|------|-------------|
| **Consultation initiale** | Premier rendez-vous avec un nouveau patient |
| **Suivi** | Contrôle régulier des progrès |
| **Visite finale** | Conclusion du traitement |

#### Flux de travail des visites

1. **Créer** - Planifier le rendez-vous
2. **Documenter** - Enregistrer les notes de consultation et les mesures
3. **Terminer** - Marquer comme terminée (génère une facture)
4. **Suivi** - Envoyer un email de suivi généré par l'IA

#### Enregistrer les notes de visite

1. Ouvrez la visite
2. Remplissez les champs :
   - **Motif de la visite** - Pourquoi le patient est venu
   - **Évaluation** - Votre évaluation clinique
   - **Recommandations** - Conseils donnés au patient
   - **Notes** - Informations supplémentaires
3. Ajoutez des mesures de santé si nécessaire
4. Cliquez sur **Enregistrer**

### Mesures de santé

#### Mesures prédéfinies

| Mesure | Unité | Plage normale |
|--------|-------|---------------|
| Poids | kg | — |
| Taille | cm | — |
| IMC | kg/m² | 18.5 - 24.9 |
| Tension artérielle (Systolique) | mmHg | 90 - 120 |
| Tension artérielle (Diastolique) | mmHg | 60 - 80 |
| Fréquence cardiaque | bpm | 60 - 100 |
| Tour de taille | cm | — |
| Glycémie | mg/dL | 70 - 100 |

#### Visualiser les tendances

1. Ouvrez le profil d'un patient
2. Allez dans l'onglet **Mesures**
3. Cliquez sur une mesure pour voir :
   - Graphique historique
   - Toutes les valeurs enregistrées
   - Analyse des tendances

#### Alertes

Lorsqu'une mesure dépasse le seuil configuré :
- Une alerte apparaît sur le tableau de bord
- La mesure est mise en évidence en rouge
- Le diététicien reçoit une notification

Pour acquitter une alerte :
1. Cliquez sur l'alerte
2. Examinez la mesure
3. Cliquez sur **Acquitter**

### Facturation

#### Créer une facture

**Création automatique :**
- Lorsqu'une visite est marquée comme "Terminée", une facture est automatiquement créée

**Création manuelle :**
1. Allez dans **Facturation**
2. Cliquez sur **+ Nouvelle facture**
3. Sélectionnez le patient
4. Ajoutez les lignes (description du service, montant)
5. Cliquez sur **Créer**

#### Envoyer des factures

1. Ouvrez la facture
2. Cliquez sur **Envoyer par email**
3. Le patient reçoit la facture en PDF

#### Enregistrer des paiements

1. Ouvrez la facture
2. Cliquez sur **Enregistrer un paiement**
3. Entrez le montant et le mode de paiement
4. Cliquez sur **Enregistrer**

#### Statuts des factures

| Statut | Description |
|--------|-------------|
| **Brouillon** | Pas encore envoyée |
| **Envoyée** | Livrée au patient |
| **Payée** | Entièrement payée |
| **En retard** | Date d'échéance dépassée |
| **Annulée** | Facture annulée |

#### Personnaliser les factures

1. Allez dans **Paramètres** > **Personnalisation des factures**
2. Téléchargez votre logo
3. Ajoutez les informations de votre entreprise
4. Configurez le texte de pied de page
5. Cliquez sur **Enregistrer**

### Champs personnalisés

Les champs personnalisés vous permettent de collecter des informations supplémentaires spécifiques à votre cabinet.

#### Types de champs

| Type | Cas d'utilisation |
|------|-------------------|
| **Texte** | Texte court (allergies, préférences) |
| **Zone de texte** | Texte long (notes détaillées) |
| **Nombre** | Valeurs numériques |
| **Date** | Sélecteur de date |
| **Liste déroulante** | Sélection parmi des options prédéfinies |
| **Oui/Non** | Interrupteur booléen |
| **Calculé** | Calculé automatiquement à partir de formules |

#### Créer un champ personnalisé

1. Allez dans **Paramètres** > **Champs personnalisés**
2. Sélectionnez ou créez une catégorie
3. Cliquez sur **Ajouter un champ**
4. Configurez :
   - Nom du champ (identifiant interne)
   - Libellé (nom affiché)
   - Type
   - Obligatoire (oui/non)
   - Texte d'aide
5. Cliquez sur **Enregistrer**

#### Exemple de champ calculé : Âge

Formule : `age_years({date_de_naissance})`

Cela calcule automatiquement l'âge du patient à partir de sa date de naissance.

#### Exemple de champ calculé : IMC

Formule : `10000 * {measure:weight} / ({measure:height} * {measure:height})`

Cela calcule l'IMC en utilisant les dernières mesures de poids et de taille.

### Email et communication

#### Rappels de rendez-vous

Les rappels automatiques sont envoyés :
- 24 heures avant le rendez-vous
- 1 semaine avant (configurable)

Les patients peuvent se désabonner via un lien dans l'email.

#### Modèles d'emails

Créez des modèles réutilisables pour :
- Envoi de factures
- Rappels de rendez-vous
- Rappels de paiement
- Messages de suivi

**Variables de modèle :**
- `{{patient_name}}` - Nom complet du patient
- `{{appointment_date}}` - Date de la visite
- `{{dietitian_name}}` - Votre nom
- `{{amount_total}}` - Montant de la facture

#### Envoyer des emails personnalisés

1. Ouvrez un patient ou une visite
2. Cliquez sur **Envoyer un email**
3. Sélectionnez un modèle ou rédigez un contenu personnalisé
4. Cliquez sur **Envoyer**

### Fonctionnalités IA

#### Suivis générés par l'IA

Générez des emails de suivi personnalisés après les consultations :

1. Ouvrez une visite terminée
2. Cliquez sur **Suivi IA**
3. Configurez les options :
   - Langue (Français/Anglais)
   - Ton (Professionnel/Amical/Formel)
   - Inclure les prochaines étapes
   - Inclure la date du prochain rendez-vous
4. Cliquez sur **Générer**
5. Examinez et modifiez l'email
6. Cliquez sur **Envoyer**

#### Prérequis IA

- Un fournisseur IA doit être configuré (OpenAI, Claude ou Mistral)
- La visite doit contenir des notes de consultation
- Le patient doit avoir une adresse email

### Intégration calendrier

#### Synchronisation Google Calendar

Connectez NutriVault à Google Calendar pour une synchronisation bidirectionnelle :

1. Allez dans **Paramètres** > **Calendrier**
2. Cliquez sur **Connecter Google Calendar**
3. Autorisez l'accès
4. Sélectionnez le calendrier à synchroniser

**Fonctionnalités :**
- Les visites apparaissent dans votre Google Calendar
- Les modifications se synchronisent dans les deux sens
- Détection et résolution des conflits

---

## Installation

### Prérequis

- Node.js 18 ou supérieur
- npm ou yarn

### Configuration du backend

```bash
cd backend
npm install
npm run db:migrate
npm run db:seed
npm run dev
```

L'API démarre sur `http://localhost:3001`

### Configuration du frontend

```bash
cd frontend
npm install
npm run dev
```

L'application démarre sur `http://localhost:5173`

### Compte administrateur par défaut

Après avoir exécuté les seeders, connectez-vous avec :
- Nom d'utilisateur : `admin`
- Mot de passe : `admin123`

**Important :** Changez le mot de passe après la première connexion !

---

## Configuration

### Variables d'environnement

Créez un fichier `.env` dans le répertoire backend :

```env
# Application
NODE_ENV=development
PORT=3001

# Authentification
JWT_SECRET=votre-cle-secrete-min-32-chars
REFRESH_TOKEN_SECRET=une-autre-cle-secrete

# Base de données (SQLite)
DB_DIALECT=sqlite
DB_STORAGE=./data/nutrivault.db

# Email (Gmail)
EMAIL_HOST=smtp.gmail.com
EMAIL_PORT=587
EMAIL_USER=votre-email@gmail.com
EMAIL_PASSWORD=votre-mot-de-passe-application
EMAIL_FROM_NAME=Nom de votre cabinet

# Fournisseurs IA (optionnel)
OPENAI_API_KEY=sk-...
ANTHROPIC_API_KEY=sk-ant-...
MISTRAL_API_KEY=...
```

### Options de base de données

**Développement (SQLite) :**
```env
DB_DIALECT=sqlite
DB_STORAGE=./data/nutrivault.db
```

**Production (PostgreSQL) :**
```env
DB_DIALECT=postgres
DB_HOST=localhost
DB_PORT=5432
DB_NAME=nutrivault
DB_USER=postgres
DB_PASSWORD=votre-mot-de-passe
```

---

## Documentation technique

Pour des informations techniques détaillées, consultez :

- [Aperçu de l'architecture](docs/ARCHITECTURE.md) - Conception du système et flux de données
- [Guide de développement](docs/development-guide.md) - Directives de contribution
- [Référence API](docs/integration-architecture.md) - Points d'accès API

---

## Support

### Obtenir de l'aide

- Consultez le [Guide utilisateur](docs/GUIDE_UTILISATEUR.md)
- Parcourez la [FAQ](#faq)
- Contactez votre administrateur système

### FAQ

**Q : J'ai oublié mon mot de passe**
R : Contactez votre administrateur pour le réinitialiser.

**Q : Les emails ne sont pas envoyés**
R : Vérifiez la configuration email dans `.env` et confirmez le mot de passe d'application.

**Q : La synchronisation du calendrier ne fonctionne pas**
R : Reconnectez Google Calendar dans les Paramètres et assurez-vous d'avoir accordé toutes les permissions.

**Q : Le suivi IA affiche une erreur**
R : Vérifiez qu'un fournisseur IA est configuré et possède une clé API valide.

### Signaler des problèmes

- Ouvrez une issue sur le [dépôt GitHub](https://github.com/erikbeauvalot-sg/nutrivault/issues)
- Incluez les étapes pour reproduire le problème
- Joignez des captures d'écran si applicable

---

## Licence

Propriétaire - Tous droits réservés

---

*NutriVault - Au service des professionnels de la nutrition*
