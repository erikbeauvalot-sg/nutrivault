# Feature Requests - Custom Fields Enhancement

## Méthodologie BMAD
- **B**usiness Value : Valeur métier / Impact utilisateur
- **M**easurable Criteria : Critères mesurables
- **A**cceptance Criteria : Critères d'acceptation
- **D**ependencies : Dépendances techniques

---

## Feature 1: Category Color Coding

### BMAD Analysis

**Business Value:**
- Améliore la lisibilité et l'organisation visuelle des informations patient
- Permet une identification rapide des catégories par code couleur
- Réduit le temps de navigation entre les sections
- Impact utilisateur: ★★★★☆ (Haute priorité UX)

**Measurable Criteria:**
- Temps de repérage d'une catégorie réduit de 30%
- 100% des catégories peuvent avoir une couleur personnalisée
- La couleur est visible sur tous les affichages de la catégorie

**Acceptance Criteria:**
- [ ] Un champ "color" est ajouté à la table `custom_field_categories`
- [ ] L'interface admin permet de choisir/modifier la couleur via un color picker
- [ ] La couleur est affichée dans les tabs de la page patient (bordure, badge, ou background)
- [ ] La couleur par défaut est définie automatiquement si non spécifiée
- [ ] Les couleurs sont sauvegardées et persistent après modification
- [ ] Prévisualisation en temps réel dans l'éditeur de catégorie

**Dependencies:**
- Migration de base de données pour ajouter le champ `color`
- Librairie color picker pour React (ex: react-color)
- Mise à jour du modèle `CustomFieldCategory`
- Mise à jour des composants d'affichage (tabs)

---

### User Story 1.1: Add Color Field to Category Model

**As a** system administrator
**I want** to be able to assign a color to each custom field category
**So that** I can visually organize and differentiate patient information sections

**Technical Tasks:**
- [ ] Create migration `add-color-to-categories.js`
  - Add `color` VARCHAR(7) column (hex format: #RRGGBB)
  - Default value: generate automatically based on display_order
- [ ] Update `CustomFieldCategory` model with `color` field
- [ ] Update seed script to include default colors for existing categories
- [ ] Write unit tests for color validation (hex format)

**Estimation:** 2 points

---

### User Story 1.2: Color Picker in Category Admin UI

**As a** system administrator
**I want** to select a color using a visual color picker when creating/editing a category
**So that** I can easily choose the perfect color without knowing hex codes

**Technical Tasks:**
- [ ] Install `react-colorful` package (lightweight, no dependencies)
- [ ] Add color picker to `CustomFieldCategoryModal.jsx`
- [ ] Show current color preview badge
- [ ] Add color input with validation (hex format with #)
- [ ] Add "Reset to Default" button
- [ ] Update category service to handle color field

**Estimation:** 3 points

---

### User Story 1.3: Display Category Colors in Patient View

**As a** dietitian
**I want** to see color-coded tabs in the patient detail page
**So that** I can quickly identify and navigate to the right information category

**Technical Tasks:**
- [ ] Update `PatientDetailPage.jsx` to apply category colors to tabs
- [ ] Add colored badge or border to tab headers
- [ ] Ensure color contrast for accessibility (WCAG AA compliance)
- [ ] Add subtle background color to active tab content area
- [ ] Test with various color combinations

**Estimation:** 3 points

**Total Story Points for Feature 1:** 8 points

---

## Feature 2: Advanced Filtering and Search

### BMAD Analysis

**Business Value:**
- Réduit drastiquement le temps de recherche d'informations spécifiques
- Améliore l'efficacité pour les dossiers patients complexes
- Permet de gérer efficacement un grand nombre de custom fields (50+)
- Impact utilisateur: ★★★★★ (Critique pour scalabilité)

**Measurable Criteria:**
- Capacité de filtrer parmi 100+ custom fields en <1 seconde
- Recherche textuelle avec résultats en temps réel
- Historique des recherches récentes sauvegardé

**Acceptance Criteria:**
- [ ] Barre de recherche globale pour tous les custom fields
- [ ] Dropdown de filtre par catégorie (multi-sélection)
- [ ] Recherche dans field_name, field_label, et help_text
- [ ] Highlighting des résultats trouvés
- [ ] Compteur de résultats "X champs trouvés"
- [ ] Bouton "Effacer filtres" visible quand des filtres sont actifs
- [ ] Les filtres persistent pendant la session (localStorage)

**Dependencies:**
- Aucune nouvelle librairie requise (utilisation de React state)
- Optimisation des requêtes backend si nécessaire
- Indexes sur les champs texte pour performance

---

### User Story 2.1: Search Bar in Custom Fields Admin

**As a** system administrator
**I want** to search for custom fields by name, label, or description
**So that** I can quickly find and edit specific fields in a large list

**Technical Tasks:**
- [ ] Add search input above the fields table in `CustomFieldsPage.jsx`
- [ ] Implement client-side filtering on field_name, field_label, help_text
- [ ] Add debounced search (300ms delay) for performance
- [ ] Highlight matching text in search results
- [ ] Show "No results found" message when appropriate
- [ ] Add clear search button (X icon)

**Estimation:** 3 points

---

### User Story 2.2: Category Filter Dropdown

**As a** system administrator
**I want** to filter custom fields by category
**So that** I can focus on managing fields from specific sections

**Technical Tasks:**
- [ ] Add multi-select dropdown for categories in `CustomFieldsPage.jsx`
- [ ] Use React Bootstrap Dropdown with checkboxes
- [ ] Show selected categories as badges
- [ ] "Select All" / "Deselect All" options
- [ ] Combine with search filter (AND logic)
- [ ] Update field count badge when filters are active

**Estimation:** 3 points

---

### User Story 2.3: Search in Patient Custom Fields

**As a** dietitian
**I want** to search within patient custom fields
**So that** I can quickly find specific information without scrolling through all tabs

**Technical Tasks:**
- [ ] Add search bar above tabs in `PatientDetailPage.jsx`
- [ ] Search across all custom field values for the patient
- [ ] Auto-switch to the tab containing the first result
- [ ] Highlight matching fields in yellow
- [ ] Show breadcrumb: "Found in: Category > Field Name"
- [ ] "Next" / "Previous" buttons to navigate results

**Estimation:** 5 points

---

### User Story 2.4: Filter State Persistence

**As a** user
**I want** my search and filter preferences to be remembered
**So that** I don't have to re-apply them every time I navigate

**Technical Tasks:**
- [ ] Save filter state to localStorage
- [ ] Restore filters on component mount
- [ ] Add "Reset to Default" option
- [ ] Clear filters when logging out
- [ ] Implement per-page filter persistence (admin vs patient view)

**Estimation:** 2 points

**Total Story Points for Feature 2:** 13 points

---

## Feature 3: Internationalization (i18n) Support

### BMAD Analysis

**Business Value:**
- Support multi-langue natif pour les labels et descriptions
- Permet l'utilisation de l'application dans différents contextes linguistiques
- Améliore l'accessibilité pour les patients non-francophones
- Impact utilisateur: ★★★★☆ (Important pour l'expansion)

**Measurable Criteria:**
- 100% des catégories et champs traduisibles
- Support FR et EN minimum
- Changement de langue instantané (sans rechargement)
- Traductions stockées de manière structurée

**Acceptance Criteria:**
- [ ] Nouvelle table `custom_field_translations` pour stocker les traductions
- [ ] Interface admin pour gérer les traductions par champ
- [ ] Support des langues FR et EN (extensible à d'autres)
- [ ] Fallback automatique vers la langue par défaut si traduction manquante
- [ ] Les traductions suivent le changement de langue utilisateur
- [ ] Export/Import des traductions en JSON pour édition externe

**Dependencies:**
- Migration pour créer table `custom_field_translations`
- Extension du modèle de données
- Mise à jour de tous les services pour inclure les traductions
- Interface de gestion des traductions (future feature)

---

### User Story 3.1: Translation Database Schema

**As a** developer
**I want** a flexible translation system for custom fields
**So that** we can support multiple languages without modifying the core structure

**Technical Tasks:**
- [ ] Create migration `create-custom-field-translations.js`
  ```sql
  CREATE TABLE custom_field_translations (
    id UUID PRIMARY KEY,
    entity_type ENUM('category', 'field_definition'),
    entity_id UUID,
    language_code VARCHAR(5),
    field_name VARCHAR(50),
    translated_value TEXT,
    UNIQUE(entity_id, language_code, field_name)
  )
  ```
- [ ] Create `CustomFieldTranslation` model
- [ ] Add foreign key constraints
- [ ] Create indexes for performance

**Estimation:** 3 points

---

### User Story 3.2: Backend Translation Service

**As a** backend developer
**I want** a service to manage translations efficiently
**So that** I can retrieve localized content with minimal overhead

**Technical Tasks:**
- [ ] Create `customFieldTranslation.service.js`
- [ ] Implement `getTranslations(entityId, languageCode)`
- [ ] Implement `setTranslation(entityId, languageCode, fieldName, value)`
- [ ] Implement `bulkImportTranslations(data)`
- [ ] Add translation support to category/definition services
- [ ] Update API responses to include translations based on user language
- [ ] Add fallback logic (FR → EN → original)

**Estimation:** 5 points

---

### User Story 3.3: Admin UI for Translations

**As a** system administrator
**I want** to add/edit translations for categories and fields
**So that** the system can be used in multiple languages

**Technical Tasks:**
- [ ] Add "Translations" tab in `CustomFieldCategoryModal.jsx`
- [ ] Add "Translations" tab in `CustomFieldDefinitionModal.jsx`
- [ ] Create language selector (FR/EN buttons)
- [ ] Show translation inputs for:
  - Category: name, description
  - Field: field_label, help_text, select_options (if applicable)
- [ ] Visual indicator for translated/untranslated fields
- [ ] "Copy from French" button for quick translation starting point

**Estimation:** 5 points

---

### User Story 3.4: Dynamic Translation in Patient View

**As a** dietitian
**I want** to see custom fields in my preferred language
**So that** I can work comfortably in French or English

**Technical Tasks:**
- [ ] Update `customFieldService.getPatientCustomFields()` to accept language parameter
- [ ] Modify backend to return translated labels based on user language
- [ ] Update `CustomFieldInput.jsx` to use translated labels
- [ ] Update tab titles with translated category names
- [ ] Add language switch in patient detail page (optional)
- [ ] Cache translations in frontend state for performance

**Estimation:** 4 points

**Total Story Points for Feature 3:** 17 points

---

## Feature 4: Unique Email Constraint with Cross-Entity Support

### BMAD Analysis

**Business Value:**
- Prévient les doublons d'emails dans chaque entité
- Permet à une personne d'être à la fois patient et utilisateur (employé)
- Améliore la qualité des données
- Facilite la recherche par email
- Impact utilisateur: ★★★☆☆ (Important pour intégrité des données)

**Measurable Criteria:**
- 0 emails dupliqués au sein des patients
- 0 emails dupliqués au sein des utilisateurs
- Email peut exister à la fois dans patients ET users
- Messages d'erreur clairs en cas de duplication

**Acceptance Criteria:**
- [ ] Contrainte unique sur `patients.email` (si non null)
- [ ] Contrainte unique sur `users.email`
- [ ] Un email peut exister dans les 2 tables simultanément
- [ ] Message d'erreur explicite côté backend et frontend
- [ ] Recherche d'email case-insensitive
- [ ] Validation d'email côté client avant soumission

**Dependencies:**
- Migration pour ajouter contraintes uniques
- Mise à jour des validators
- Gestion des erreurs frontend améliorée
- Potentiel conflit avec données existantes (nécessite nettoyage)

---

### User Story 4.1: Database Unique Constraints

**As a** database administrator
**I want** unique email constraints on patients and users tables
**So that** we maintain data integrity without duplicates

**Technical Tasks:**
- [ ] Create migration `add-unique-email-constraints.js`
- [ ] Check for existing duplicate emails in patients
- [ ] Check for existing duplicate emails in users
- [ ] Add unique constraint on `patients.email` (where email IS NOT NULL)
- [ ] Verify unique constraint exists on `users.email`
- [ ] Add index for case-insensitive email search
- [ ] Write rollback logic

**Estimation:** 3 points

---

### User Story 4.2: Backend Validation and Error Handling

**As a** backend developer
**I want** clear error messages when email duplicates are detected
**So that** the frontend can inform users appropriately

**Technical Tasks:**
- [ ] Update patient service to catch unique constraint errors
- [ ] Update user service to catch unique constraint errors
- [ ] Return specific error codes:
  - `EMAIL_ALREADY_EXISTS_PATIENT`
  - `EMAIL_ALREADY_EXISTS_USER`
- [ ] Add validation in controllers before DB insert
- [ ] Normalize emails (lowercase, trim) before saving
- [ ] Update API documentation with error codes

**Estimation:** 3 points

---

### User Story 4.3: Frontend Validation and UX

**As a** user
**I want** to be notified immediately if an email is already in use
**So that** I can correct it before submitting the form

**Technical Tasks:**
- [ ] Add real-time email validation in `CreatePatientModal.jsx`
- [ ] Add real-time email validation in `UserModal.jsx`
- [ ] Debounced API call to check email uniqueness (500ms)
- [ ] Show inline error with clear message: "This email is already used by another patient"
- [ ] Add email normalization (lowercase, trim) in frontend
- [ ] Disable submit button if email is duplicate
- [ ] Update form validation schema (yup)

**Estimation:** 4 points

---

### User Story 4.4: Email Search Enhancement

**As a** administrator
**I want** to search for patients or users by email efficiently
**So that** I can quickly find records even with case variations

**Technical Tasks:**
- [ ] Add case-insensitive search for patients by email
- [ ] Add case-insensitive search for users by email
- [ ] Update patient list search to include email
- [ ] Update user list search to include email
- [ ] Show search results grouped by entity type (patient/user)
- [ ] Add "View as Patient" / "View as User" actions if same email found in both

**Estimation:** 3 points

**Total Story Points for Feature 4:** 13 points

---

## Feature 5: Multi-Entity Custom Fields (Patient & Visit Support)

### BMAD Analysis

**Business Value:**
- Permet d'utiliser les custom fields pour les patients ET les visites
- Évite la duplication des définitions de champs (poids, taille, etc.)
- Flexibilité maximale: certains champs uniquement pour patients, d'autres pour visites, d'autres pour les deux
- Meilleure organisation des données selon le contexte (données statiques patient vs données évolutives visite)
- Impact utilisateur: ★★★★★ (Critique pour scalabilité et réutilisabilité)

**Measurable Criteria:**
- 100% des catégories peuvent être assignées à Patient, Visit, ou Both
- Les champs n'apparaissent que dans les contextes appropriés
- Pas de duplication de définitions entre entités
- Performance maintenue avec filtrage par entity_type

**Acceptance Criteria:**
- [ ] Nouveau champ `entity_types` dans `custom_field_categories` (peut contenir 'patient', 'visit', ou les deux)
- [ ] Interface admin avec checkboxes pour sélectionner les entités applicables
- [ ] Les catégories Patient-only apparaissent uniquement dans les pages patient
- [ ] Les catégories Visit-only apparaissent uniquement dans les pages visit
- [ ] Les catégories Both apparaissent dans les deux contextes
- [ ] Les valeurs sont stockées séparément (patient_custom_field_values vs visit_custom_field_values)
- [ ] Validation: au moins une entité doit être sélectionnée

**Dependencies:**
- Migration pour ajouter `entity_types` à `custom_field_categories`
- Nouvelle table `visit_custom_field_values` (similaire à `patient_custom_field_values`)
- Nouveau service `visitCustomField.service.js`
- Pages Visit detail/edit à créer ou modifier
- Filtrage dans toutes les requêtes de custom fields

---

### User Story 5.1: Database Schema for Multi-Entity Support

**As a** database administrator
**I want** to mark categories as applicable to patients, visits, or both
**So that** the same field definitions can be reused across different contexts

**Technical Tasks:**
- [ ] Create migration `add-entity-types-to-categories.js`
  - Add `entity_types` JSON column to `custom_field_categories`
  - Default value: `["patient"]` (backward compatibility)
  - Examples: `["patient"]`, `["visit"]`, `["patient", "visit"]`
- [ ] Create migration `create-visit-custom-field-values.js`
  - Same structure as `patient_custom_field_values`
  - Foreign key to `visits` table instead of `patients`
- [ ] Update `CustomFieldCategory` model with `entity_types` field
- [ ] Create `VisitCustomFieldValue` model
- [ ] Add validation: entity_types must be non-empty array
- [ ] Create indexes for performance

**Estimation:** 3 points

---

### User Story 5.2: Admin UI for Entity Type Selection

**As a** system administrator
**I want** to specify whether a category applies to patients, visits, or both
**So that** I can organize custom fields by their context of use

**Technical Tasks:**
- [ ] Update `CustomFieldCategoryModal.jsx`
  - Add section "Applies to:" with checkboxes:
    - ☐ Patients
    - ☐ Visits
  - Both can be selected simultaneously
  - At least one must be checked (validation)
  - Show helper text explaining the difference
- [ ] Update category service to save/update `entity_types`
- [ ] Display entity badges in category list (Patient | Visit | Both)
- [ ] Add filter in CustomFieldsPage to show only categories for a specific entity
- [ ] Update seed script with entity_types for existing categories

**Estimation:** 3 points

---

### User Story 5.3: Backend Service for Visit Custom Fields

**As a** backend developer
**I want** a service to manage visit custom field values
**So that** visits can have the same flexible data structure as patients

**Technical Tasks:**
- [ ] Create `visitCustomField.service.js` (similar to `patientCustomField.service.js`)
  - `getVisitCustomFields(user, visitId, requestMetadata)`
  - `setVisitCustomField(user, visitId, definitionId, value, requestMetadata)`
  - `bulkUpdateVisitFields(user, visitId, fields, requestMetadata)`
  - `deleteVisitCustomField(user, visitId, fieldValueId, requestMetadata)`
- [ ] Create `visitCustomFieldController.js`
- [ ] Add routes to `/backend/src/routes/visits.js`:
  - `GET /api/visits/:visitId/custom-fields`
  - `PUT /api/visits/:visitId/custom-fields`
  - `DELETE /api/visits/:visitId/custom-fields/:fieldValueId`
- [ ] Add RBAC: same logic as patients (ADMIN all, DIETITIAN assigned only)
- [ ] Add audit logging for all operations
- [ ] Filter custom field categories by `entity_types` containing 'visit'

**Estimation:** 5 points

---

### User Story 5.4: Frontend Display in Patient Pages

**As a** dietitian
**I want** to see only patient-relevant custom fields in patient pages
**So that** I'm not cluttered with visit-specific fields

**Technical Tasks:**
- [ ] Update `customFieldService.getPatientCustomFields()` to filter by entity_type
- [ ] Backend returns only categories where `entity_types` includes 'patient'
- [ ] No frontend changes needed (automatic filtering via backend)
- [ ] Test that visit-only categories don't appear
- [ ] Test that "both" categories do appear

**Estimation:** 2 points

---

### User Story 5.5: Frontend Display in Visit Pages

**As a** dietitian
**I want** to fill out custom fields when creating/editing a visit
**So that** I can capture visit-specific measurements and observations

**Technical Tasks:**
- [ ] Create `visitCustomFieldService.js` (frontend)
  - `getVisitCustomFields(visitId)`
  - `updateVisitCustomFields(visitId, fields)`
- [ ] Update `VisitDetailPage.jsx` (or create if doesn't exist)
  - Add tabs for custom field categories (where entity_types includes 'visit')
  - Display fields using `CustomFieldDisplay.jsx` (read-only)
- [ ] Update `EditVisitModal.jsx` or `CreateVisitModal.jsx`
  - Add tabs for custom field categories
  - Use `CustomFieldInput.jsx` for editing
  - Include custom fields in form submission
- [ ] Backend filters to return only categories where `entity_types` includes 'visit'
- [ ] Test that patient-only categories don't appear
- [ ] Test that "both" categories do appear

**Estimation:** 5 points

---

### User Story 5.6: Data Migration for Existing Categories

**As a** system administrator
**I want** existing categories to be automatically marked as "patient-only"
**So that** the upgrade doesn't break existing functionality

**Technical Tasks:**
- [ ] Migration sets `entity_types = ["patient"]` for all existing categories
- [ ] Script to identify which categories should be "both" (based on field usage)
- [ ] Admin UI shows clear indication of entity_types on existing data
- [ ] Document migration process in README
- [ ] Test rollback scenario

**Estimation:** 2 points

---

### User Story 5.7: Shared Categories Best Practices

**As a** system administrator
**I want** guidance on when to use shared vs dedicated categories
**So that** I can organize fields optimally

**Technical Tasks:**
- [ ] Add help text in modal explaining:
  - Patient-only: Static data (family situation, medical history)
  - Visit-only: Dynamic measurements (weight, blood pressure this visit)
  - Both: Common fields needed in both contexts (notes, observations)
- [ ] Add examples in seed data showing all three patterns
- [ ] Documentation page explaining the feature
- [ ] Best practices guide in admin docs

**Estimation:** 2 points

**Total Story Points for Feature 5:** 22 points

---

## Summary & Prioritization

| Feature | Story Points | Priority | Business Value | Complexity |
|---------|--------------|----------|----------------|------------|
| Feature 1: Category Colors | 8 | HIGH | ★★★★☆ | LOW |
| Feature 2: Filtering & Search | 13 | CRITICAL | ★★★★★ | MEDIUM |
| Feature 3: Internationalization | 17 | MEDIUM | ★★★★☆ | HIGH |
| Feature 4: Email Uniqueness | 13 | HIGH | ★★★☆☆ | MEDIUM |
| Feature 5: Multi-Entity Support | 22 | CRITICAL | ★★★★★ | HIGH |

**Total Story Points:** 73 points

---

## Recommended Implementation Order

### Sprint 1 (21 points)
1. **Feature 1: Category Colors** (8 points) - Quick win, high visual impact
2. **Feature 2: Filtering & Search** (13 points) - Critical for usability with many fields

### Sprint 2 (22 points)
3. **Feature 5: Multi-Entity Support** (22 points) - Critical for data model scalability, foundational for visit tracking

### Sprint 3 (13 points)
4. **Feature 4: Email Uniqueness** (13 points) - Important data integrity, less complex

### Sprint 4 (17 points)
5. **Feature 3: Internationalization** (17 points) - Most complex, can be deferred

---

## Technical Dependencies Graph

```
Feature 1 (Colors)
  └─> No dependencies

Feature 2 (Search/Filter)
  └─> No dependencies
  └─> Enhanced by Feature 5 (filter by entity type)

Feature 3 (i18n)
  └─> New table + service layer
  └─> Can build incrementally
  └─> Should consider Feature 5 entity types in translation schema

Feature 4 (Email Unique)
  └─> Migration (potential data cleanup)
  └─> Depends on current data state

Feature 5 (Multi-Entity Support)
  └─> New table (visit_custom_field_values)
  └─> Migration to add entity_types column
  └─> Visit pages must exist or be created
  └─> FOUNDATIONAL: Affects future features
  └─> Blocked by: None
  └─> Blocks: None (but enhances Feature 2 & 3)
```

---

## Next Steps

1. **Validate business priorities** with stakeholders
2. **Check existing data** for email duplicates (Feature 4)
3. **Assess visit tracking requirements** for Feature 5 (do visit pages exist? what's the current structure?)
4. **Create detailed technical design docs** for Feature 3 & 5 (most complex)
5. **Assign features to sprints** based on team capacity
6. **Set up feature branches** for parallel development

---

## Notes on Feature 5 (Multi-Entity Support)

**Important Considerations:**
- This feature assumes Visit management exists in the application
- If Visits are not yet implemented, this becomes a larger project
- The entity_types approach is extensible (future: measurements, consultations, etc.)
- Consider backward compatibility: all existing categories default to ["patient"]

**Questions to Answer:**
- [ ] Do we have Visit CRUD pages already?
- [ ] What's the current Visit data model?
- [ ] Are there any existing custom data needs for visits?
- [ ] Should we support other entities in the future (measurements, sessions)?

---

*Document créé le: 2026-01-23*
*Dernière mise à jour: 2026-01-23 (Added Feature 5)*
