# Guide Utilisateur NutriVault

**Version:** 5.0
**Dernière mise à jour:** Janvier 2026

---

## Table des matières

1. [Introduction](#introduction)
2. [Connexion et Navigation](#connexion-et-navigation)
3. [Gestion des Patients](#gestion-des-patients)
4. [Gestion des Visites](#gestion-des-visites)
5. [Suivi IA (Follow-up)](#suivi-ia-follow-up)
6. [Facturation](#facturation)
7. [Modèles d'emails](#modèles-demails)
8. [Rappels de rendez-vous](#rappels-de-rendez-vous)
9. [Configuration IA (Admin)](#configuration-ia-admin)
10. [Mesures et Analyses](#mesures-et-analyses)

---

## Introduction

NutriVault est une application de gestion de cabinet pour diététiciens. Elle permet de :

- Gérer les dossiers patients
- Planifier et documenter les visites
- Générer des factures automatiquement
- Envoyer des emails de suivi personnalisés avec l'IA
- Suivre les mesures et l'évolution des patients
- Envoyer des rappels de rendez-vous automatiques

---

## Connexion et Navigation

### Connexion

1. Accédez à l'application via votre navigateur
2. Entrez votre **nom d'utilisateur** et **mot de passe**
3. Cliquez sur **Se connecter**

### Menu principal (Barre latérale)

| Icône | Menu | Description |
|-------|------|-------------|
| 📊 | Tableau de bord | Vue d'ensemble et statistiques |
| 👥 | Patients | Liste et gestion des patients |
| 📅 | Agenda | Calendrier des rendez-vous |
| 📋 | Visites | Liste de toutes les visites |
| 💰 | Facturation | Gestion des factures |
| ⚙️ | Paramètres | Configuration (Admin uniquement) |

---

## Gestion des Patients

### Créer un patient

1. Cliquez sur **Patients** dans le menu
2. Cliquez sur **+ Nouveau patient**
3. Remplissez les informations :
   - Nom et prénom (obligatoires)
   - Email (pour les communications)
   - Téléphone
   - Date de naissance
   - Adresse
4. Cliquez sur **Enregistrer**

### Modifier un patient

1. Cliquez sur le nom du patient dans la liste
2. Cliquez sur **Modifier**
3. Effectuez vos modifications
4. Cliquez sur **Enregistrer**

---

## Gestion des Visites

### Créer une visite

1. Cliquez sur **Visites** > **+ Nouvelle visite**
2. Sélectionnez le **patient**
3. Sélectionnez le **diététicien**
4. Choisissez la **date et heure**
5. Sélectionnez le **type de visite** :
   - Consultation initiale
   - Suivi
   - Bilan final
6. Cliquez sur **Créer**

### Documenter une visite

1. Ouvrez la visite en cliquant dessus
2. Remplissez les champs :
   - **Motif de consultation** : Raison de la visite
   - **Évaluation** : Votre analyse clinique
   - **Recommandations** : Conseils donnés au patient
   - **Notes** : Informations complémentaires
3. Ajoutez les **mesures** (poids, taille, etc.)
4. Cliquez sur **Enregistrer**

### Changer le diététicien d'une visite

1. Ouvrez la visite en mode édition
2. Dans le menu déroulant **Diététicien**, sélectionnez le nouveau praticien
3. Cliquez sur **Enregistrer**

---

## Suivi IA (Follow-up)

La fonctionnalité **Suivi IA** permet de générer automatiquement des emails de suivi personnalisés pour vos patients après une consultation.

### Où trouver cette fonctionnalité ?

1. Allez dans **Visites**
2. Cliquez sur une visite pour ouvrir le détail
3. Cliquez sur le bouton **Suivi IA** (icône robot)

### Comment ça marche ?

#### Étape 1 : Configuration

Lorsque vous cliquez sur "Suivi IA", une fenêtre s'ouvre avec les options suivantes :

| Option | Description |
|--------|-------------|
| **Langue** | Français ou Anglais |
| **Ton** | Professionnel, Amical ou Formel |
| **Inclure les prochaines étapes** | Ajoute les recommandations dans l'email |
| **Inclure le prochain RDV** | Mentionne la date du prochain rendez-vous |

#### Étape 2 : Génération

1. Configurez vos options
2. Cliquez sur **Générer**
3. L'IA crée un email personnalisé basé sur :
   - Le nom du patient
   - Le motif de consultation
   - Votre évaluation
   - Vos recommandations
   - La date du prochain rendez-vous (si renseignée)

#### Étape 3 : Révision et modification

- L'email généré s'affiche en prévisualisation
- Vous pouvez **modifier** le contenu si nécessaire
- Vérifiez que toutes les informations sont correctes

#### Étape 4 : Envoi

1. Cliquez sur **Envoyer**
2. L'email est envoyé à l'adresse du patient
3. L'envoi est enregistré dans l'historique

### Prérequis

- Le patient doit avoir une adresse email valide
- La visite doit contenir des informations (motif, évaluation, recommandations)
- Un fournisseur IA doit être configuré (voir Configuration IA)

### Conseils d'utilisation

- **Remplissez bien les champs de la visite** : Plus vous documentez, meilleur sera l'email généré
- **Relisez toujours** avant d'envoyer
- **Personnalisez** si nécessaire pour ajouter des détails spécifiques

---

## Facturation

### Création automatique de facture

Lorsqu'une visite passe au statut **Terminée**, une facture est automatiquement créée.

### Envoyer une facture

1. Allez dans **Facturation**
2. Trouvez la facture souhaitée
3. Cliquez sur **Envoyer par email**

### Personnaliser vos factures

En tant qu'administrateur :

1. Allez dans **Paramètres** > **Personnalisation factures**
2. Configurez :
   - Logo de votre cabinet
   - Couleurs
   - Signature
   - Informations de contact
   - Texte de pied de page

---

## Modèles d'emails

### Accéder aux modèles (Admin)

1. Allez dans **Paramètres** > **Modèles d'emails**
2. Vous verrez la liste des modèles par catégorie

### Catégories de modèles

| Catégorie | Utilisation |
|-----------|-------------|
| Facture | Envoi de factures |
| Rappel de paiement | Relance impayés |
| Rappel de rendez-vous | Notification avant RDV |
| Suivi | Emails post-consultation |
| Général | Communications diverses |

### Créer un modèle

1. Cliquez sur **+ Créer un modèle**
2. Remplissez :
   - Nom du modèle
   - Catégorie
   - Objet de l'email
   - Contenu HTML
3. Utilisez les **variables** pour personnaliser :
   - `{{patient_name}}` - Nom du patient
   - `{{appointment_date}}` - Date du RDV
   - `{{dietitian_name}}` - Nom du diététicien
   - `{{amount_total}}` - Montant facture

### Traductions

1. Cliquez sur l'icône **Globe** sur un modèle
2. Sélectionnez la langue
3. Traduisez le contenu
4. Cliquez sur **Enregistrer**

Langues disponibles : Français, Anglais, Espagnol, Néerlandais, Allemand

---

## Rappels de rendez-vous

### Fonctionnement automatique

Le système envoie automatiquement des rappels :
- **24 heures** avant le rendez-vous
- **1 semaine** avant le rendez-vous

### Envoi manuel

1. Ouvrez une visite avec statut **Planifiée**
2. Cliquez sur **Envoyer un rappel**
3. Confirmez l'envoi

### Désabonnement patient

Chaque email de rappel contient un lien de désabonnement. Si un patient clique dessus, il ne recevra plus de rappels automatiques.

---

## Configuration IA (Admin)

### Accéder à la configuration

1. Connectez-vous en tant qu'**Administrateur**
2. Allez dans **Paramètres** > **Configuration IA**

### Choisir un fournisseur

Trois fournisseurs sont disponibles :

| Fournisseur | Modèles disponibles | Tarification |
|-------------|---------------------|--------------|
| **Mistral AI** | Mistral Small, Medium, Large | Gratuit à payant |
| **OpenAI** | GPT-4, GPT-3.5 Turbo | Payant |
| **Anthropic** | Claude 3 Haiku, Sonnet, Opus | Payant |

### Configurer un fournisseur

1. **Obtenez une clé API** sur le site du fournisseur
2. **Ajoutez la clé** dans le fichier `.env` du serveur :
   ```
   MISTRAL_API_KEY=votre_cle_mistral
   OPENAI_API_KEY=votre_cle_openai
   ANTHROPIC_API_KEY=votre_cle_anthropic
   ```
3. **Redémarrez** le serveur
4. Dans l'interface, le fournisseur apparaîtra comme **Configuré**

### Sélectionner le modèle actif

1. Cliquez sur le fournisseur souhaité
2. Choisissez le modèle dans la liste
3. Cliquez sur **Tester la connexion** pour vérifier
4. Cliquez sur **Enregistrer**

### Comparaison des prix

La page affiche un tableau comparatif des prix par million de tokens (entrée/sortie) pour vous aider à choisir.

**Recommandation** : Pour commencer, utilisez **Mistral Small** qui offre un bon rapport qualité/prix ou des options gratuites.

---

## Mesures et Analyses

### Ajouter des mesures à une visite

1. Ouvrez la visite
2. Allez dans l'onglet **Mesures**
3. Remplissez les champs :
   - Poids (kg)
   - Taille (cm)
   - Tour de taille
   - Tension artérielle
   - Masse grasse (%)
   - Masse musculaire (%)
4. L'IMC est calculé automatiquement
5. Cliquez sur **Enregistrer**

### Voir l'évolution

1. Ouvrez le dossier patient
2. Allez dans l'onglet **Graphiques**
3. Visualisez l'évolution des mesures dans le temps

### Alertes

Le système peut vous alerter si une mesure est hors des valeurs normales. Configurez les seuils dans **Paramètres** > **Mesures**.

---

## Support

Pour toute question ou problème :

- Consultez cette documentation
- Contactez votre administrateur système

---

*Documentation NutriVault - Tous droits réservés*
