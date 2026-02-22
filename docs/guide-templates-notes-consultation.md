comment # Guide utilisateur — Templates de notes de consultation
## NutriVault · À l'attention des diététicien(ne)s

---

## Table des matières

1. [Introduction](#1-introduction)
2. [Accéder aux templates](#2-accéder-aux-templates)
3. [Liste des templates](#3-liste-des-templates)
4. [Créer un nouveau template](#4-créer-un-nouveau-template)
   - 4.1 [Informations générales](#41-informations-générales)
   - 4.2 [Ajouter des éléments](#42-ajouter-des-éléments)
   - 4.3 [Les types d'éléments](#43-les-types-déléments)
   - 4.4 [Aperçu en temps réel](#44-aperçu-en-temps-réel)
5. [Utiliser un template en consultation](#5-utiliser-un-template-en-consultation)
   - 5.1 [Démarrer une consultation](#51-démarrer-une-consultation)
   - 5.2 [Remplir la note](#52-remplir-la-note)
   - 5.3 [Enregistrement automatique](#53-enregistrement-automatique)
   - 5.4 [Finaliser et facturer](#54-finaliser-et-facturer)
6. [Gérer ses templates](#6-gérer-ses-templates)
7. [Bonnes pratiques](#7-bonnes-pratiques)

---

## 1. Introduction

Les **templates de notes de consultation** permettent de standardiser vos prises de notes lors des séances avec vos patients. Au lieu de recommencer une structure vierge à chaque fois, vous préparez un modèle une seule fois — et NutriVault l'applique automatiquement à chaque consultation.

**Ce que vous pouvez inclure dans un template :**

| Type d'élément | Description |
|---|---|
| **Catégorie de champs** | Regroupement de champs personnalisés (antécédents, habitudes alimentaires, etc.) |
| **Mesure clinique** | Poids, IMC, tension artérielle, etc. |
| **Instruction** | Texte de guidage visible lors de la consultation, avec zone de notes libres |

**Avantages :**
- Gain de temps : structure préparée à l'avance
- Cohérence : mêmes informations collectées pour chaque type de consultation
- Traçabilité : notes sauvegardées automatiquement, liées à la visite et au patient

---

## 2. Accéder aux templates

Dans le menu de navigation latéral, cliquez sur **"Templates de consultation"**.

> 📸 *[Capture d'écran — Menu latéral avec "Templates de consultation" mis en évidence]*

---

## 3. Liste des templates

La page d'accueil des templates affiche tous vos modèles existants.

> 📸 *[Capture d'écran — Page liste des templates]*

**Ce que vous voyez :**
- **Nom** du template avec son type (badge coloré)
- **Description** courte
- **Nombre d'éléments** contenus
- **Visibilité** : privé ou partagé avec l'équipe
- **Par défaut** : ⭐ si ce template est votre template favori
- **Actions** : Modifier · Dupliquer · Supprimer

**Filtrer la liste :**

Utilisez la barre de recherche pour filtrer par nom, ou le menu déroulant **Type** pour n'afficher qu'un type de consultation (Anamnèse, Évaluation, Suivi, etc.).

**Types de templates disponibles :**

| Type | Couleur | Usage conseillé |
|---|---|---|
| Anamnèse | Rouge | Première consultation, collecte de l'historique |
| Évaluation | Bleu | Bilan nutritionnel, évaluation clinique |
| Plan alimentaire | Vert | Consultation de prescription diététique |
| Suivi | Orange | Consultations de suivi régulier |
| Général | Violet | Usage polyvalent |
| Personnalisé | Sarcelle | Tout autre cas spécifique |

---

## 4. Créer un nouveau template

Cliquez sur le bouton **"+ Nouveau template"** en haut à droite de la liste.

> 📸 *[Capture d'écran — Bouton "+ Nouveau template"]*

L'éditeur de template s'ouvre en deux colonnes : **la configuration** à gauche, **l'aperçu** à droite (activable).

---

### 4.1 Informations générales

> 📸 *[Capture d'écran — Section "Informations du template"]*

Renseignez les champs suivants :

| Champ | Obligatoire | Description |
|---|---|---|
| **Nom** | ✅ Oui | Ex. : *Bilan nutritionnel initial* |
| **Type** | Non | Catégorisation du template (voir tableau ci-dessus) |
| **Description** | Non | Aide à choisir le bon template en consultation |
| **Visibilité** | Non | *Privé* = vous seul(e) · *Partagé* = toute l'équipe |
| **Couleur** | Non | Code couleur pour identifier visuellement le template |
| **Template par défaut** | Non | Ce template sera pré-sélectionné à chaque nouvelle consultation |
| **Tags** | Non | Mots-clés pour retrouver facilement le template (ex. : *adulte*, *diabète*) |

> 💡 **Astuce** : Un seul template peut être marqué "par défaut". En activer un nouveau désactive automatiquement l'ancien.

---

### 4.2 Ajouter des éléments

La section **"Éléments du template"** affiche les éléments dans l'ordre où ils apparaîtront lors de la consultation.

> 📸 *[Capture d'écran — Section "Éléments du template" avec plusieurs éléments ajoutés]*

**Pour ajouter un élément**, cliquez sur l'un des trois boutons :

```
[ + Catégorie ]   [ + Mesure ]   [ + Instruction ]
```

> 📸 *[Capture d'écran — Boutons d'ajout d'éléments]*

**Pour réorganiser les éléments :**
- Utilisez les flèches ▲ ▼ sur chaque élément
- Ou faites-les glisser (drag & drop) via l'icône ≡ à gauche

**Pour modifier un élément :**
- Cliquez sur la ligne pour l'éditer inline
- Activez/désactivez le toggle **"Obligatoire"** si ce champ doit impérativement être rempli

---

### 4.3 Les types d'éléments

#### ▸ Catégorie de champs personnalisés

> 📸 *[Capture d'écran — Modal de sélection d'une catégorie]*

Un clic sur **"+ Catégorie"** ouvre une fenêtre de sélection. Vous y voyez toutes les catégories de champs disponibles, avec :
- Le nom et la description de la catégorie
- Le nombre de champs inclus
- Un indicateur de niveau :
  - 🔵 **Patient** : données partagées entre toutes les consultations du patient (ex. : antécédents médicaux)
  - 🟠 **Par consultation** : données spécifiques à chaque séance (ex. : évaluation du jour)

> 💡 **Exemple :** La catégorie *"Antécédents médicaux"* est de niveau **Patient** — ses données s'affichent dans toutes les consultations sans avoir à les re-saisir. La catégorie *"Évaluation alimentaire du jour"* est **Par consultation** — ses données ne concernent que la séance en cours.

> 📸 *[Capture d'écran — Élément catégorie dans la liste, avec badge de niveau]*

---

#### ▸ Mesure clinique

> 📸 *[Capture d'écran — Modal de sélection d'une mesure]*

Un clic sur **"+ Mesure"** ouvre la liste des mesures cliniques disponibles :
- Poids, IMC, taille
- Tension artérielle
- Tour de taille, masse grasse
- Glycémie, bilan biologique
- … et toutes les mesures configurées dans votre compte

Chaque mesure affiche son **unité** (kg, cm, mm Hg…) et sa **catégorie**.

> 📸 *[Capture d'écran — Élément mesure dans la liste du template]*

---

#### ▸ Instruction

> 📸 *[Capture d'écran — Élément instruction en cours d'édition]*

Une instruction est un bloc de texte que **vous rédigez à l'avance** pour vous guider pendant la consultation. Elle s'affiche en surligné lors de la prise de note et est accompagnée d'une zone de notes libres.

**Champs à remplir :**
- **Titre** : Ex. *"Évaluation des habitudes alimentaires"*
- **Contenu** : Ex. *"Demander au patient de décrire ses repas types de la semaine. Explorer les horaires, les lieux de repas, les préférences et les aversions."*

> 💡 **Utilisation typique** : Guide de questionnement clinique, rappel de protocole, check-list d'éléments à explorer.

---

### 4.4 Aperçu en temps réel

Cliquez sur le bouton **"Aperçu"** (en haut à droite de l'éditeur) pour afficher un panneau latéral montrant le rendu exact du template tel que la diététicienne le verra lors d'une consultation.

> 📸 *[Capture d'écran — Éditeur avec panneau d'aperçu ouvert à droite]*

L'aperçu se met à jour en temps réel au fur et à mesure que vous ajoutez ou modifiez les éléments.

---

### Sauvegarder le template

Cliquez sur **"Enregistrer"** en haut à droite. Une confirmation verte apparaît.

> 📸 *[Capture d'écran — Bouton Enregistrer et confirmation]*

---

## 5. Utiliser un template en consultation

### 5.1 Démarrer une consultation

1. Ouvrez la fiche du **patient**
2. Cliquez sur la **visite** concernée pour accéder à son détail
3. Cliquez sur le bouton **"Démarrer la consultation"**

> 📸 *[Capture d'écran — Bouton "Démarrer la consultation" dans la page de détail d'une visite]*

Une fenêtre s'ouvre pour **sélectionner un template**.

> 📸 *[Capture d'écran — Modal de sélection du template, avec cartes de templates]*

Chaque carte affiche :
- Le nom et le type du template
- La description courte
- Le nombre d'éléments

Cliquez sur le template souhaité — NutriVault crée automatiquement la note et vous redirige vers l'éditeur de consultation.

---

### 5.2 Remplir la note

> 📸 *[Capture d'écran — Page de l'éditeur de note de consultation, vue d'ensemble]*

L'éditeur affiche les éléments du template dans l'ordre configuré. En-tête de la page : nom du template, statut (Brouillon / Complété), patient, date et diététicienne.

#### Remplir une catégorie de champs

> 📸 *[Capture d'écran — Carte de catégorie avec champs à remplir]*

Les champs apparaissent dans la mise en page configurée dans la catégorie (liste verticale ou grille). Remplissez normalement (saisie texte, listes déroulantes, cases à cocher selon le type de champ).

#### Saisir une mesure

> 📸 *[Capture d'écran — Carte de mesure clinique]*

Entrez la valeur numérique dans le champ prévu. L'unité est affichée à côté.

#### Utiliser une instruction

> 📸 *[Capture d'écran — Carte d'instruction avec texte de guidage et zone de notes]*

Le contenu de l'instruction s'affiche dans un encadré **jaune** — c'est votre aide-mémoire. La zone blanche en dessous est votre **zone de notes libres** pour documenter ce que le patient a répondu ou observé.

#### Résumé de consultation

En bas de page, une grande zone texte permet de saisir un **résumé global** de la consultation.

> 📸 *[Capture d'écran — Zone de résumé en bas de page]*

---

### 5.3 Enregistrement automatique

> 📸 *[Capture d'écran — Indicateur "Sauvegarde auto" dans l'en-tête]*

Vos notes sont **sauvegardées automatiquement** 3 secondes après chaque modification. L'en-tête affiche :
- 🔄 *Spinner* → sauvegarde en cours
- ✅ *"Sauvegarde auto"* (vert) → sauvegarde réussie
- ❌ *"Échec de la sauvegarde auto"* (rouge) → problème réseau, réessayez manuellement

Vous pouvez également cliquer sur le bouton **"Enregistrer"** à tout moment pour forcer une sauvegarde manuelle.

> ⚠️ **Important** : Ne fermez pas l'onglet si l'indicateur "Sauvegarde en cours" est visible. Attendez la confirmation verte.

---

### 5.4 Finaliser et facturer

Quand la consultation est terminée, cliquez sur **"Terminer & Facturer"**.

> 📸 *[Capture d'écran — Bouton "Terminer & Facturer"]*

Une fenêtre de confirmation apparaît avec trois options :

> 📸 *[Capture d'écran — Modal "Terminer & Facturer" avec les options]*

| Option | Description |
|---|---|
| ✅ **Marquer la visite comme TERMINÉE** | Change le statut de la visite |
| ✅ **Générer automatiquement une facture** | Crée une facture pour cette visite |
| ☐ **Envoyer la facture par email** | Envoie la facture au patient (si email renseigné) |

Cliquez **"Confirmer"** — la note passe en statut **Complétée** et ne peut plus être modifiée.

---

## 6. Gérer ses templates

### Dupliquer un template

Pour créer un template similaire à un existant, cliquez sur l'icône **Dupliquer** dans la liste. Une copie identique est créée avec le suffixe *(Copie)* — vous pouvez ensuite la modifier librement.

> 📸 *[Capture d'écran — Bouton Dupliquer dans la liste]*

### Modifier un template existant

Cliquez sur **Modifier** (icône crayon). L'éditeur s'ouvre avec la configuration actuelle.

> ⚠️ **Attention** : Modifier un template ne modifie PAS les notes déjà créées avec ce template. Seules les nouvelles consultations bénéficieront des changements.

### Supprimer un template

Cliquez sur l'icône **Supprimer** (corbeille). Si des notes ont déjà été créées avec ce template, il sera **désactivé** (et non supprimé définitivement) pour préserver l'historique.

---

## 7. Bonnes pratiques

### Organisez par type de consultation

Créez un template distinct pour chaque type de séance :
- *"Bilan initial adulte"* → type Anamnèse
- *"Suivi mensuel"* → type Suivi
- *"Consultation diabète"* → type Évaluation

### Utilisez les tags

Ajoutez des tags pour retrouver facilement vos templates : `adulte`, `enfant`, `diabète`, `grossesse`, `sport`, etc.

### Définissez un template par défaut

Si vous avez un type de consultation récurrent, marquez ce template comme **"Par défaut"** — il sera pré-sélectionné automatiquement à chaque nouvelle consultation.

### Partagez avec votre équipe

Si vous travaillez en cabinet avec d'autres diététiciennes, passez vos templates en **"Partagé"** — toute l'équipe peut les utiliser et vous évitez les doublons.

### Instructions comme aide-mémoire

Rédigez des instructions détaillées pour les protocoles complexes : liste de questions à poser, éléments à évaluer, grilles de scoring. Vos notes libres viendront documenter les réponses du patient directement en regard du protocole.

---

*Document généré pour NutriVault — Usage interne diététicien(ne)s*
*Version logiciel : 8.7.16*
