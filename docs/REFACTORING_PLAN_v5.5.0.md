# Plan de Refactoring NutriVault v5.5.0

**Version:** 5.5.0
**Date:** 2026-01-30
**Objectifs:** Application plus rapide, plus légère, cohérente et sans régression

---

## Table des Matières

1. [Vision & Objectifs](#vision--objectifs)
2. [Epic Overview](#epic-overview)
3. [Phase 1 - Fondations](#phase-1---fondations-sprint-1-2)
4. [Phase 2 - Qualité du Code](#phase-2---qualité-du-code-sprint-3-4)
5. [Phase 3 - Cohérence UI](#phase-3---cohérence-ui-sprint-5-6)
6. [Phase 4 - i18n & Tests](#phase-4---i18n--tests-sprint-7)
7. [Phase 5 - Backend Optimization](#phase-5---backend-optimization-sprint-8)
8. [Critères de Validation](#critères-de-validation)
9. [Risques & Mitigations](#risques--mitigations)

---

## Vision & Objectifs

### Objectifs Principaux

| Objectif | Métrique Actuelle | Cible v5.5.0 |
|----------|-------------------|--------------|
| **Performance** | Non mesuré | Lighthouse > 90 |
| **Bundle Size** | ~300 KB | < 200 KB |
| **Console.logs** | 149 occurrences | 0 en production |
| **Tests** | 4 fichiers (~10%) | > 80% coverage |
| **Strings hardcodées** | 812 occurrences | 0 |
| **Cohérence pages** | 6+ patterns | 1 pattern unifié |

### Contraintes Absolues

- ✅ **Zero Régression** - Tous les tests existants doivent passer
- ✅ **Compatibilité API** - Aucun breaking change backend
- ✅ **Fonctionnalités préservées** - Toutes les features actuelles fonctionnelles

---

## Epic Overview

```
EPIC-1: Refactoring NutriVault v5.5.0
├── PHASE-1: Fondations (Sprint 1-2)
│   ├── US-1.1: Infrastructure de test
│   ├── US-1.2: Normalisation API
│   └── US-1.3: Hooks personnalisés
│
├── PHASE-2: Qualité du Code (Sprint 3-4)
│   ├── US-2.1: Logging & Debug
│   ├── US-2.2: Composants modulaires
│   └── US-2.3: Error Boundaries
│
├── PHASE-3: Cohérence UI (Sprint 5-6)
│   ├── US-3.1: Pattern List Pages
│   ├── US-3.2: Pattern Detail Pages
│   ├── US-3.3: Pattern Modal/Form
│   └── US-3.4: Pattern Table/Pagination
│
├── PHASE-4: i18n & Tests (Sprint 7)
│   ├── US-4.1: Audit i18n complet
│   ├── US-4.2: Tests E2E critiques
│   └── US-4.3: Tests unitaires
│
└── PHASE-5: Backend Optimization (Sprint 8)
    ├── US-5.1: Service Layer Refactoring
    ├── US-5.2: Query Optimization
    └── US-5.3: Response Standardization
```

---

## Phase 1 - Fondations (Sprint 1-2)

### Objectif
Établir les bases techniques pour un refactoring sécurisé avec tests et patterns standardisés.

---

### US-1.1: Infrastructure de Test Renforcée

**Description:** Renforcer l'infrastructure de test pour garantir zéro régression.

**Critères d'acceptation:**
- [ ] Tests existants passent à 100%
- [ ] Configuration CI/CD pour tests automatiques
- [ ] Coverage report généré automatiquement
- [ ] Snapshot tests pour composants critiques

#### Tâches

| ID | Tâche | Priorité | Estimation |
|----|-------|----------|------------|
| T-1.1.1 | Auditer et réparer les 4 tests existants | Critique | 2h |
| T-1.1.2 | Configurer coverage reporting dans Vitest | Haute | 1h |
| T-1.1.3 | Ajouter scripts npm pour tests + coverage | Haute | 30min |
| T-1.1.4 | Créer snapshot tests pour Layout, ConfirmModal | Moyenne | 2h |
| T-1.1.5 | Documenter stratégie de test dans TESTING.md | Basse | 1h |

**Fichiers concernés:**
- `frontend/vitest.config.js`
- `frontend/package.json`
- `frontend/src/components/__tests__/`
- `docs/TESTING.md` (nouveau)

---

### US-1.2: Normalisation des Réponses API

**Description:** Créer une couche de transformation unifiée pour les réponses API.

**Problème actuel:**
```javascript
// 6+ patterns différents utilisés:
response.data.data || response.data || response
response.data?.data || response.data
response.data?.data || response.data || []
response.data || []
```

**Solution:**
```javascript
// Nouveau pattern unifié
import { normalizeResponse } from '@/utils/apiResponse';
const { data, pagination, error } = normalizeResponse(response);
```

**Critères d'acceptation:**
- [ ] Utilitaire `apiResponse.js` créé
- [ ] Tous les services frontend mis à jour
- [ ] Tests unitaires pour normalizeResponse
- [ ] Aucune régression fonctionnelle

#### Tâches

| ID | Tâche | Priorité | Estimation |
|----|-------|----------|------------|
| T-1.2.1 | Créer `utils/apiResponse.js` avec normalizeResponse | Critique | 1h |
| T-1.2.2 | Créer tests pour apiResponse.js | Critique | 1h |
| T-1.2.3 | Migrer patientService.js | Haute | 1h |
| T-1.2.4 | Migrer visitService.js | Haute | 1h |
| T-1.2.5 | Migrer billingService.js | Haute | 1h |
| T-1.2.6 | Migrer tous les autres services (23 restants) | Haute | 4h |
| T-1.2.7 | Tester manuellement toutes les pages principales | Critique | 2h |

**Fichiers concernés:**
- `frontend/src/utils/apiResponse.js` (nouveau)
- `frontend/src/services/*.js` (26 fichiers)

---

### US-1.3: Hooks Personnalisés Réutilisables

**Description:** Créer des hooks personnalisés pour éliminer la duplication de code.

**Problème actuel:**
- 339 occurrences de patterns `setLoading, setError, setXYZ`
- Logique de pagination dupliquée dans 15+ pages
- Gestion de modales dupliquée

**Solution:**
```javascript
// Nouveaux hooks
const { data, loading, error, refetch } = useFetch(fetchFn, deps);
const { page, limit, setPage, totalPages } = usePagination(total);
const { isOpen, open, close, toggle } = useModal();
const isMobile = useIsMobile();
```

#### Tâches

| ID | Tâche | Priorité | Estimation |
|----|-------|----------|------------|
| T-1.3.1 | Créer `hooks/useFetch.js` avec tests | Critique | 2h |
| T-1.3.2 | Créer `hooks/usePagination.js` avec tests | Haute | 1h |
| T-1.3.3 | Créer `hooks/useModal.js` avec tests | Haute | 1h |
| T-1.3.4 | Créer `hooks/useIsMobile.js` avec tests | Moyenne | 1h |
| T-1.3.5 | Créer `hooks/useDebounce.js` avec tests | Moyenne | 30min |
| T-1.3.6 | Créer `hooks/index.js` pour exports centralisés | Basse | 15min |
| T-1.3.7 | Documenter hooks dans hooks/README.md | Basse | 30min |

**Fichiers concernés:**
- `frontend/src/hooks/` (nouveau dossier)
  - `useFetch.js`
  - `usePagination.js`
  - `useModal.js`
  - `useIsMobile.js`
  - `useDebounce.js`
  - `index.js`
  - `README.md`

---

## Phase 2 - Qualité du Code (Sprint 3-4)

### Objectif
Améliorer la qualité du code, supprimer le code mort, et modulariser les composants.

---

### US-2.1: Logging & Debug Cleanup

**Description:** Supprimer tous les console.log et implémenter un système de logging propre.

**Problème actuel:**
- 149 console.log dans le code frontend
- Logs non filtrés en production
- Debug info exposée

**Solution:**
```javascript
// utils/logger.js
export const logger = {
  debug: (msg, data) => import.meta.env.DEV && console.log(msg, data),
  info: (msg, data) => import.meta.env.DEV && console.info(msg, data),
  warn: (msg, data) => console.warn(msg, data),
  error: (msg, err) => console.error(msg, err),
};
```

#### Tâches

| ID | Tâche | Priorité | Estimation |
|----|-------|----------|------------|
| T-2.1.1 | Créer `utils/logger.js` | Critique | 30min |
| T-2.1.2 | Scanner et lister tous les console.log | Critique | 30min |
| T-2.1.3 | Supprimer console.log inutiles (pages) | Haute | 2h |
| T-2.1.4 | Supprimer console.log inutiles (composants) | Haute | 2h |
| T-2.1.5 | Supprimer console.log inutiles (services) | Haute | 1h |
| T-2.1.6 | Remplacer logs utiles par logger.debug | Moyenne | 1h |
| T-2.1.7 | Nettoyer i18n.js (console.log initialization) | Haute | 15min |
| T-2.1.8 | Vérifier build prod: aucun log | Critique | 30min |

**Fichiers concernés:**
- `frontend/src/utils/logger.js` (nouveau)
- `frontend/src/**/*.js` (tous les fichiers avec console.log)
- `frontend/src/i18n.js`

---

### US-2.2: Modularisation des Composants Monolithiques

**Description:** Diviser les pages et composants trop volumineux en sous-composants.

**Pages à refactoriser (> 800 LOC):**
| Page | LOC Actuel | Cible | Sous-composants |
|------|------------|-------|-----------------|
| PatientDetailPage | 1,248 | < 300 | 5 sous-composants |
| EditVisitPage | 1,065 | < 300 | 4 sous-composants |
| VisitDetailPage | 1,015 | < 300 | 4 sous-composants |
| CustomFieldsPage | 937 | < 300 | 3 sous-composants |
| AIConfigPage | 852 | < 300 | 3 sous-composants |

#### Tâches

| ID | Tâche | Priorité | Estimation |
|----|-------|----------|------------|
| T-2.2.1 | Refactoriser PatientDetailPage | Critique | 4h |
| T-2.2.1a | → Extraire PatientBasicInfo | - | - |
| T-2.2.1b | → Extraire PatientMeasuresSection | - | - |
| T-2.2.1c | → Extraire PatientInvoicesSection | - | - |
| T-2.2.1d | → Extraire PatientDocumentsSection | - | - |
| T-2.2.1e | → Extraire PatientVisitsSection | - | - |
| T-2.2.2 | Refactoriser EditVisitPage | Haute | 3h |
| T-2.2.2a | → Extraire VisitFormBasic | - | - |
| T-2.2.2b | → Extraire VisitMeasuresForm | - | - |
| T-2.2.2c | → Extraire VisitCustomFieldsForm | - | - |
| T-2.2.2d | → Extraire VisitDocumentsForm | - | - |
| T-2.2.3 | Refactoriser VisitDetailPage | Haute | 3h |
| T-2.2.4 | Refactoriser CustomFieldsPage | Moyenne | 2h |
| T-2.2.5 | Refactoriser AIConfigPage | Moyenne | 2h |
| T-2.2.6 | Tests de régression après refactoring | Critique | 2h |

**Fichiers concernés:**
- `frontend/src/pages/PatientDetailPage.jsx` → split
- `frontend/src/pages/EditVisitPage.jsx` → split
- `frontend/src/pages/VisitDetailPage.jsx` → split
- `frontend/src/pages/CustomFieldsPage.jsx` → split
- `frontend/src/pages/AIConfigPage.jsx` → split
- `frontend/src/components/patient/` (nouveau)
- `frontend/src/components/visit/` (nouveau)

---

### US-2.3: Error Boundaries & Gestion d'Erreurs

**Description:** Implémenter une gestion d'erreurs robuste avec Error Boundaries React.

#### Tâches

| ID | Tâche | Priorité | Estimation |
|----|-------|----------|------------|
| T-2.3.1 | Créer composant ErrorBoundary | Critique | 1h |
| T-2.3.2 | Créer page ErrorFallback | Haute | 1h |
| T-2.3.3 | Wrapper App.jsx avec ErrorBoundary | Haute | 30min |
| T-2.3.4 | Ajouter ErrorBoundary aux routes critiques | Moyenne | 1h |
| T-2.3.5 | Standardiser messages d'erreur API | Moyenne | 1h |
| T-2.3.6 | Tests pour ErrorBoundary | Haute | 1h |

**Fichiers concernés:**
- `frontend/src/components/ErrorBoundary.jsx` (nouveau)
- `frontend/src/pages/ErrorFallback.jsx` (nouveau)
- `frontend/src/App.jsx`

---

## Phase 3 - Cohérence UI (Sprint 5-6)

### Objectif
Standardiser les patterns UI entre toutes les pages pour une expérience cohérente.

---

### US-3.1: Pattern Unifié - Pages Liste

**Description:** Créer un pattern standard pour toutes les pages de type "liste".

**Pages concernées:**
- PatientsPage
- VisitsPage
- BillingPage
- DocumentsPage
- UsersPage
- TemplatesPage

**Pattern cible:**
```jsx
<ListPage
  title={t('patients.title')}
  items={patients}
  loading={loading}
  error={error}
  columns={columnsConfig}
  filters={filtersConfig}
  actions={actionsConfig}
  onSearch={handleSearch}
  onFilter={handleFilter}
  pagination={paginationProps}
/>
```

#### Tâches

| ID | Tâche | Priorité | Estimation |
|----|-------|----------|------------|
| T-3.1.1 | Analyser patterns actuels des 6 pages liste | Critique | 2h |
| T-3.1.2 | Définir composant ListPageLayout | Critique | 2h |
| T-3.1.3 | Créer composant DataTable générique | Haute | 3h |
| T-3.1.4 | Créer composant FilterBar générique | Haute | 2h |
| T-3.1.5 | Migrer PatientsPage vers nouveau pattern | Haute | 2h |
| T-3.1.6 | Migrer VisitsPage vers nouveau pattern | Haute | 2h |
| T-3.1.7 | Migrer BillingPage vers nouveau pattern | Haute | 2h |
| T-3.1.8 | Migrer DocumentsPage vers nouveau pattern | Moyenne | 2h |
| T-3.1.9 | Migrer UsersPage vers nouveau pattern | Moyenne | 2h |
| T-3.1.10 | Migrer TemplatesPage vers nouveau pattern | Moyenne | 2h |
| T-3.1.11 | Tests de régression visuels | Critique | 2h |

**Fichiers concernés:**
- `frontend/src/components/layout/ListPageLayout.jsx` (nouveau)
- `frontend/src/components/DataTable.jsx` (nouveau ou refactorisé)
- `frontend/src/components/FilterBar.jsx` (nouveau)
- `frontend/src/pages/*Page.jsx` (6 pages)

---

### US-3.2: Pattern Unifié - Pages Détail

**Description:** Créer un pattern standard pour toutes les pages de type "détail".

**Pages concernées:**
- PatientDetailPage
- VisitDetailPage
- InvoiceDetailPage
- DocumentDetailPage
- UserDetailPage

**Pattern cible:**
```jsx
<DetailPage
  title={entity.name}
  loading={loading}
  error={error}
  breadcrumbs={breadcrumbsConfig}
  tabs={tabsConfig}
  actions={actionsConfig}
>
  <TabContent />
</DetailPage>
```

#### Tâches

| ID | Tâche | Priorité | Estimation |
|----|-------|----------|------------|
| T-3.2.1 | Analyser patterns actuels des pages détail | Critique | 2h |
| T-3.2.2 | Créer composant DetailPageLayout | Critique | 2h |
| T-3.2.3 | Créer composant Breadcrumbs unifié | Haute | 1h |
| T-3.2.4 | Créer composant TabsContainer unifié | Haute | 2h |
| T-3.2.5 | Migrer PatientDetailPage | Haute | 3h |
| T-3.2.6 | Migrer VisitDetailPage | Haute | 3h |
| T-3.2.7 | Migrer InvoiceDetailPage | Moyenne | 2h |
| T-3.2.8 | Tests de régression visuels | Critique | 2h |

**Fichiers concernés:**
- `frontend/src/components/layout/DetailPageLayout.jsx` (nouveau)
- `frontend/src/components/Breadcrumbs.jsx` (nouveau ou refactorisé)
- `frontend/src/components/TabsContainer.jsx` (nouveau)

---

### US-3.3: Pattern Unifié - Modales & Formulaires

**Description:** Standardiser les modales et formulaires à travers l'application.

**Problème actuel:**
- 15+ composants modales avec patterns différents
- Validation incohérente
- Gestion d'état dupliquée

**Pattern cible:**
```jsx
<FormModal
  title={t('patient.create')}
  isOpen={isOpen}
  onClose={close}
  onSubmit={handleSubmit}
  loading={submitting}
>
  <FormField name="firstName" label={t('common.firstName')} required />
  <FormField name="lastName" label={t('common.lastName')} required />
</FormModal>
```

#### Tâches

| ID | Tâche | Priorité | Estimation |
|----|-------|----------|------------|
| T-3.3.1 | Analyser patterns modales actuels | Haute | 1h |
| T-3.3.2 | Créer composant FormModal générique | Critique | 3h |
| T-3.3.3 | Créer composant FormField générique | Critique | 2h |
| T-3.3.4 | Créer hook useForm pour validation | Haute | 2h |
| T-3.3.5 | Migrer PatientModal | Haute | 2h |
| T-3.3.6 | Migrer VisitModal | Haute | 2h |
| T-3.3.7 | Migrer InvoiceModal | Moyenne | 2h |
| T-3.3.8 | Migrer autres modales (10+) | Moyenne | 5h |
| T-3.3.9 | Tests unitaires pour FormModal | Haute | 2h |

**Fichiers concernés:**
- `frontend/src/components/forms/FormModal.jsx` (nouveau)
- `frontend/src/components/forms/FormField.jsx` (nouveau)
- `frontend/src/hooks/useForm.js` (nouveau)
- `frontend/src/components/*Modal.jsx` (15+ fichiers)

---

### US-3.4: Pattern Unifié - Tables & Pagination

**Description:** Créer un système de tables et pagination cohérent.

**Incohérences actuelles:**
| Aspect | Pattern A | Pattern B |
|--------|-----------|-----------|
| Pagination | `currentPage, totalPages` | `filters.page, pagination` |
| Tri | `sortBy, sortOrder` | `sort: {field, direction}` |
| Sélection | `selected: []` | `selectedIds: Set()` |

#### Tâches

| ID | Tâche | Priorité | Estimation |
|----|-------|----------|------------|
| T-3.4.1 | Auditer patterns table/pagination | Haute | 1h |
| T-3.4.2 | Créer composant Pagination unifié | Critique | 2h |
| T-3.4.3 | Créer composant SortableHeader | Haute | 1h |
| T-3.4.4 | Créer hook useTableState | Haute | 2h |
| T-3.4.5 | Migrer toutes les tables vers pattern unifié | Haute | 4h |
| T-3.4.6 | Tests pour composants table | Haute | 2h |

**Fichiers concernés:**
- `frontend/src/components/table/Pagination.jsx` (nouveau)
- `frontend/src/components/table/SortableHeader.jsx` (nouveau)
- `frontend/src/hooks/useTableState.js` (nouveau)

---

## Phase 4 - i18n & Tests (Sprint 7)

### Objectif
Éliminer toutes les chaînes hardcodées et augmenter la couverture de tests.

---

### US-4.1: Audit et Correction i18n Complet

**Description:** Identifier et traduire toutes les chaînes hardcodées (812 occurrences).

**Catégories de strings:**
1. **Boutons** - "Create", "Delete", "Save", "Cancel"
2. **Labels** - "Name", "Date", "Status"
3. **Messages d'erreur** - "Error loading data", "Invalid input"
4. **Titres** - "Patient Details", "Visit History"
5. **Placeholders** - "Search...", "Enter name"

#### Tâches

| ID | Tâche | Priorité | Estimation |
|----|-------|----------|------------|
| T-4.1.1 | Script d'audit automatique des strings hardcodées | Critique | 2h |
| T-4.1.2 | Catégoriser les 812 occurrences | Haute | 2h |
| T-4.1.3 | Créer nouvelles clés dans en.json | Haute | 3h |
| T-4.1.4 | Créer traductions dans fr.json | Haute | 3h |
| T-4.1.5 | Migrer strings - Pages (priorité haute) | Critique | 4h |
| T-4.1.6 | Migrer strings - Composants | Haute | 4h |
| T-4.1.7 | Migrer strings - Messages d'erreur | Haute | 2h |
| T-4.1.8 | Validation: aucune string hardcodée | Critique | 1h |
| T-4.1.9 | Organiser structure i18n (namespaces) | Moyenne | 2h |

**Fichiers concernés:**
- `frontend/src/locales/en.json`
- `frontend/src/locales/fr.json`
- `frontend/src/pages/*.jsx` (42 fichiers)
- `frontend/src/components/*.jsx` (68 fichiers)

---

### US-4.2: Tests E2E Critiques

**Description:** Ajouter des tests E2E pour les parcours utilisateurs critiques.

**Parcours critiques:**
1. Connexion → Dashboard → Navigation
2. CRUD Patient complet
3. CRUD Visite complet
4. Création Facture
5. Upload Document

#### Tâches

| ID | Tâche | Priorité | Estimation |
|----|-------|----------|------------|
| T-4.2.1 | Setup Playwright ou Cypress | Critique | 2h |
| T-4.2.2 | Test E2E: Login flow | Critique | 2h |
| T-4.2.3 | Test E2E: Patient CRUD | Critique | 3h |
| T-4.2.4 | Test E2E: Visit CRUD | Haute | 3h |
| T-4.2.5 | Test E2E: Invoice creation | Haute | 2h |
| T-4.2.6 | Test E2E: Document upload | Moyenne | 2h |
| T-4.2.7 | Intégration CI/CD | Haute | 1h |

**Fichiers concernés:**
- `frontend/e2e/` (nouveau dossier)
- `frontend/playwright.config.js` ou `cypress.config.js` (nouveau)
- `frontend/package.json`

---

### US-4.3: Tests Unitaires Composants

**Description:** Augmenter la couverture de tests unitaires à > 80%.

**Composants prioritaires:**
- Tous les hooks personnalisés
- FormModal, FormField
- DataTable, Pagination
- Error Boundary

#### Tâches

| ID | Tâche | Priorité | Estimation |
|----|-------|----------|------------|
| T-4.3.1 | Tests pour hooks (useFetch, usePagination, etc.) | Critique | 3h |
| T-4.3.2 | Tests pour FormModal, FormField | Haute | 2h |
| T-4.3.3 | Tests pour DataTable, Pagination | Haute | 2h |
| T-4.3.4 | Tests pour ErrorBoundary | Haute | 1h |
| T-4.3.5 | Tests pour services (mocked) | Moyenne | 3h |
| T-4.3.6 | Générer rapport coverage > 80% | Critique | 1h |

---

## Phase 5 - Backend Optimization (Sprint 8)

### Objectif
Optimiser les performances backend et standardiser les réponses API.

---

### US-5.1: Service Layer Refactoring

**Description:** Réorganiser les services backend (45 fichiers, 20,532 LOC).

**Problèmes actuels:**
- Services trop volumineux (billing: 1,333 LOC)
- Pas de séparation repository/service
- Logique métier mélangée avec accès données

**Architecture cible:**
```
services/
├── patient/
│   ├── patient.repository.js (accès données)
│   ├── patient.service.js (logique métier)
│   └── patient.validator.js (validation)
├── visit/
├── billing/
└── shared/
    ├── base.repository.js
    └── base.service.js
```

#### Tâches

| ID | Tâche | Priorité | Estimation |
|----|-------|----------|------------|
| T-5.1.1 | Créer architecture repository pattern | Haute | 2h |
| T-5.1.2 | Refactoriser patient service | Haute | 3h |
| T-5.1.3 | Refactoriser visit service | Haute | 3h |
| T-5.1.4 | Refactoriser billing service (1,333 LOC) | Critique | 4h |
| T-5.1.5 | Refactoriser document service | Moyenne | 2h |
| T-5.1.6 | Refactoriser autres services | Moyenne | 6h |
| T-5.1.7 | Tests d'intégration backend | Critique | 4h |

---

### US-5.2: Query Optimization

**Description:** Optimiser les requêtes Sequelize pour éviter N+1 et améliorer performance.

#### Tâches

| ID | Tâche | Priorité | Estimation |
|----|-------|----------|------------|
| T-5.2.1 | Auditer requêtes N+1 potentielles | Haute | 2h |
| T-5.2.2 | Ajouter eager loading où nécessaire | Haute | 3h |
| T-5.2.3 | Optimiser queries list pages | Haute | 2h |
| T-5.2.4 | Ajouter index base de données | Moyenne | 2h |
| T-5.2.5 | Benchmark avant/après | Critique | 1h |

---

### US-5.3: Standardisation Réponses API

**Description:** Unifier le format des réponses API backend.

**Format cible:**
```javascript
// Succès
{
  success: true,
  data: { ... } | [...],
  pagination: { page, limit, total, totalPages },
  meta: { ... }
}

// Erreur
{
  success: false,
  error: {
    code: 'VALIDATION_ERROR',
    message: 'Description',
    details: [...]
  }
}
```

#### Tâches

| ID | Tâche | Priorité | Estimation |
|----|-------|----------|------------|
| T-5.3.1 | Créer middleware responseFormatter | Critique | 2h |
| T-5.3.2 | Créer middleware errorHandler unifié | Haute | 2h |
| T-5.3.3 | Migrer controllers vers nouveau format | Haute | 4h |
| T-5.3.4 | Mettre à jour documentation API | Moyenne | 2h |
| T-5.3.5 | Tests API responses | Haute | 2h |

---

## Critères de Validation

### Definition of Done (DoD) - Par User Story

- [ ] Code implémenté et revu
- [ ] Tests unitaires passent (coverage > 80%)
- [ ] Tests E2E passent pour parcours critiques
- [ ] Aucune régression fonctionnelle
- [ ] Performance non dégradée
- [ ] Documentation mise à jour
- [ ] Merge dans branche 5.5.0

### Critères de Release v5.5.0

| Critère | Seuil | Obligatoire |
|---------|-------|-------------|
| Tests Existants | 100% pass | ✅ |
| Coverage Unitaire | > 80% | ✅ |
| Tests E2E | 100% pass | ✅ |
| Strings Hardcodées | 0 | ✅ |
| Console.logs Prod | 0 | ✅ |
| Lighthouse Score | > 90 | ⚠️ Cible |
| Bundle Size | < 200KB | ⚠️ Cible |

---

## Risques & Mitigations

| Risque | Probabilité | Impact | Mitigation |
|--------|-------------|--------|------------|
| Régression fonctionnelle | Moyenne | Critique | Tests avant/après chaque US |
| Breaking changes API | Basse | Critique | Versioning API, tests intégration |
| Délais sous-estimés | Moyenne | Moyen | Buffer 20% par sprint |
| Conflits merge | Moyenne | Moyen | Commits fréquents, PRs petites |
| Performance dégradée | Basse | Moyen | Benchmarks continus |

---

## Planning Récapitulatif

| Sprint | Phase | User Stories | Estimation |
|--------|-------|--------------|------------|
| 1-2 | Fondations | US-1.1, US-1.2, US-1.3 | 25-30h |
| 3-4 | Qualité Code | US-2.1, US-2.2, US-2.3 | 35-40h |
| 5-6 | Cohérence UI | US-3.1, US-3.2, US-3.3, US-3.4 | 50-60h |
| 7 | i18n & Tests | US-4.1, US-4.2, US-4.3 | 35-40h |
| 8 | Backend | US-5.1, US-5.2, US-5.3 | 35-40h |

**Total estimé:** 180-210 heures de développement

---

## Annexes

### A. Liste des 42 Pages

1. LoginPage
2. DashboardPage
3. PatientsPage
4. PatientDetailPage
5. CreatePatientPage
6. EditPatientPage
7. VisitsPage
8. VisitDetailPage
9. CreateVisitPage
10. EditVisitPage
11. BillingPage
12. InvoiceDetailPage
13. CreateInvoicePage
14. DocumentsPage
15. UsersPage
16. UserDetailPage
17. CreateUserPage
18. EditUserPage
19. SettingsPage
20. ProfilePage
21. TemplatesPage
22. CustomFieldsPage
23. MeasureDefinitionsPage
24. AIConfigPage
25-42. [Autres pages secondaires]

### B. Liste des 68 Composants

[Liste complète disponible via analyse du code]

### C. Fichiers de Traduction

- `frontend/src/locales/en.json` (73 KB)
- `frontend/src/locales/fr.json` (90 KB)

---

*Document généré le 2026-01-30*
*Version: 5.5.0-plan-v1*
