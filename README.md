# NutriVault

Application de gestion de cabinet pour diététiciens et nutritionnistes.

## Table des matières

- [Installation](#installation)
- [Configuration](#configuration)
- [Champs personnalisés (Custom Fields)](#champs-personnalisés-custom-fields)
- [Mesures (Measures)](#mesures-measures)
- [Champs calculés](#champs-calculés)
- [Formules et fonctions](#formules-et-fonctions)

---

## Installation

### Prérequis

- Node.js 18+
- npm ou yarn

### Backend

```bash
cd backend
npm install
npm run db:migrate
npm run db:seed
npm run dev
```

Le serveur démarre sur `http://localhost:3001`

### Frontend

```bash
cd frontend
npm install
npm run dev
```

L'application démarre sur `http://localhost:5173`

---

## Configuration

### Variables d'environnement

Créez un fichier `.env` à la racine du projet backend :

```env
NODE_ENV=development
PORT=3001
JWT_SECRET=your-secret-key
DATABASE_URL=./data/nutrivault.db
```

---

## Champs personnalisés (Custom Fields)

Les champs personnalisés permettent d'étendre les informations des patients et des visites sans modifier la structure de la base de données.

### Types de champs disponibles

| Type | Description | Exemple |
|------|-------------|---------|
| `text` | Texte court | Nom, prénom |
| `textarea` | Texte long | Notes, commentaires |
| `number` | Nombre | Âge, quantité |
| `date` | Date | Date de naissance |
| `select` | Liste déroulante | Genre, statut |
| `boolean` | Oui/Non | Fumeur, allergies |
| `calculated` | Valeur calculée automatiquement | BMI, âge |

### Créer une catégorie

Les champs sont organisés en catégories. Pour créer une catégorie :

1. Allez dans **Administration > Champs personnalisés**
2. Cliquez sur **Nouvelle catégorie**
3. Renseignez :
   - **Nom** : Nom de la catégorie (ex: "Informations médicales")
   - **Description** : Description optionnelle
   - **Type d'entité** : `patient` ou `visit`
   - **Ordre d'affichage** : Position dans la liste

### Créer un champ

1. Dans une catégorie, cliquez sur **Nouveau champ**
2. Configurez :
   - **Nom du champ** : Identifiant technique (snake_case, ex: `date_naissance`)
   - **Libellé** : Nom affiché (ex: "Date de naissance")
   - **Type** : Sélectionnez le type approprié
   - **Obligatoire** : Cochez si le champ est requis
   - **Texte d'aide** : Instructions pour l'utilisateur

### Options pour les champs `select`

Pour les listes déroulantes, définissez les options au format JSON :

```json
[
  {"value": "male", "label": "Homme"},
  {"value": "female", "label": "Femme"},
  {"value": "other", "label": "Autre"}
]
```

---

## Mesures (Measures)

Les mesures sont des données de santé qui évoluent dans le temps (séries temporelles).

### Mesures prédéfinies

- Poids (weight)
- Taille (height)
- Pression artérielle (blood_pressure_systolic, blood_pressure_diastolic)
- Fréquence cardiaque (heart_rate)
- Glycémie (blood_glucose)
- Tour de taille (waist_circumference)
- Et plus...

### Créer une mesure personnalisée

1. Allez dans **Administration > Mesures**
2. Cliquez sur **Nouvelle mesure**
3. Configurez :
   - **Nom interne** : Identifiant technique (ex: `body_fat`)
   - **Nom affiché** : Libellé (ex: "Masse grasse")
   - **Catégorie** : Anthropométrie, Biologie, etc.
   - **Unité** : kg, cm, %, etc.
   - **Décimales** : Nombre de décimales (0-4)
   - **Plage normale** : Valeurs min/max de référence
   - **Alertes** : Seuils déclenchant des alertes

### Enregistrer une mesure

Les mesures sont enregistrées lors des visites ou directement sur la fiche patient dans l'onglet "Mesures".

---

## Champs calculés

Les champs calculés permettent de créer des valeurs dérivées automatiquement à partir d'autres champs ou mesures.

### Créer un champ calculé

1. Créez un nouveau champ personnalisé
2. Sélectionnez le type **Calculé**
3. Entrez la **formule** de calcul
4. Définissez le nombre de **décimales** (0 pour les entiers comme l'âge)

### Syntaxe des formules

#### Référencer un champ personnalisé

Utilisez des accolades avec le nom du champ :

```
{nom_du_champ}
```

**Exemple** - Calcul simple :
```
{poids} / ({taille} * {taille})
```

#### Référencer une mesure

Pour utiliser la **dernière valeur** d'une mesure, utilisez le préfixe `measure:` :

```
{measure:nom_de_la_mesure}
```

**Exemple** - BMI avec mesures :
```
{measure:weight} / (({measure:height} / 100) * ({measure:height} / 100))
```

> **Note** : Si la taille est en cm, divisez par 100 pour convertir en mètres.

**Formule BMI simplifiée** (taille en cm) :
```
10000 * {measure:weight} / ({measure:height} * {measure:height})
```

### Fonctions disponibles

#### Fonctions mathématiques

| Fonction | Description | Exemple |
|----------|-------------|---------|
| `sqrt(x)` | Racine carrée | `sqrt({valeur})` |
| `abs(x)` | Valeur absolue | `abs({difference})` |
| `round(x, n)` | Arrondir à n décimales | `round({valeur}, 2)` |
| `floor(x)` | Arrondir vers le bas | `floor({valeur})` |
| `ceil(x)` | Arrondir vers le haut | `ceil({valeur})` |
| `min(a, b)` | Minimum | `min({val1}, {val2})` |
| `max(a, b)` | Maximum | `max({val1}, {val2})` |

#### Fonctions de date

| Fonction | Description | Exemple |
|----------|-------------|---------|
| `today()` | Date du jour (jours depuis 1970) | `today()` |
| `year(date)` | Extraire l'année | `year({date_naissance})` |
| `month(date)` | Extraire le mois (1-12) | `month({date_naissance})` |
| `day(date)` | Extraire le jour | `day({date_naissance})` |
| `age_years(date)` | Calculer l'âge en années | `age_years({date_naissance})` |

#### Opérateurs

| Opérateur | Description |
|-----------|-------------|
| `+` | Addition |
| `-` | Soustraction |
| `*` | Multiplication |
| `/` | Division |
| `^` | Puissance |

### Exemples de formules

#### Calcul de l'âge

```
age_years({date_naissance})
```
- **Type** : Calculé
- **Décimales** : 0
- **Dépendance** : `date_naissance` (champ de type `date`)

#### Calcul du BMI (Indice de Masse Corporelle)

```
10000 * {measure:weight} / ({measure:height} * {measure:height})
```
- **Type** : Calculé
- **Décimales** : 2
- **Dépendances** : `measure:weight`, `measure:height`

#### Calcul du BMI alternatif (taille en mètres)

```
{measure:weight} / ({measure:height} * {measure:height})
```

#### Ratio tour de taille / tour de hanches

```
{measure:waist_circumference} / {measure:hip_circumference}
```
- **Décimales** : 2

#### Différence de poids depuis le début

```
{measure:weight} - {poids_initial}
```
- Combine une mesure (dernière valeur) avec un champ personnalisé fixe

### Dépendances et recalcul automatique

- Les champs calculés sont **automatiquement recalculés** quand leurs dépendances changent
- Le système détecte les dépendances à partir de la formule
- Les dépendances circulaires sont détectées et bloquées

### Bonnes pratiques

1. **Nommez clairement vos champs** : Utilisez des noms explicites (ex: `imc` plutôt que `calc1`)

2. **Vérifiez les unités** : Assurez-vous que les unités sont cohérentes dans vos calculs

3. **Définissez les décimales appropriées** :
   - Âge : 0 décimales
   - BMI : 1-2 décimales
   - Pourcentages : 1 décimale

4. **Testez vos formules** : Utilisez l'aperçu de formule avant de sauvegarder

5. **Documentez** : Utilisez le champ "Texte d'aide" pour expliquer le calcul

### Résolution de problèmes

#### Le champ calculé affiche "—"

- Vérifiez que toutes les dépendances ont des valeurs
- Pour les mesures, assurez-vous qu'au moins une mesure existe pour le patient

#### Le résultat est incorrect

- Vérifiez les unités (cm vs m, kg vs g)
- Vérifiez la syntaxe de la formule
- Testez avec des valeurs connues

#### Erreur "Invalid value for variable"

- Le champ référencé n'existe pas ou n'a pas de valeur
- Vérifiez l'orthographe exacte du nom du champ

---

## Support

Pour signaler un bug ou demander une fonctionnalité :
- Ouvrez une issue sur le dépôt GitHub
- Contactez l'équipe de développement

---

## Licence

Propriétaire - Tous droits réservés
