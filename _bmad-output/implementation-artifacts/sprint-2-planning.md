# Sprint Planning - Sprint 2: Advanced Custom Fields

**Sprint:** 2
**Durée:** 2 semaines (4 Feb - 17 Feb 2026)
**Objectif:** Extend custom fields with advanced formula capabilities and common templates
**Thème:** "Power to the Fields" - Advanced calculated fields and dependencies

---

## 🎯 Sprint Goal

Enhance the custom fields system with common pre-built calculated fields (BMI, Age) and implement dependency tracking for automatic recalculation, enabling practitioners to leverage powerful analytics without manual calculations.

---

## 📊 Sprint Status Overview

### Work Already Completed (Pre-Sprint)
✅ **US-5.1.1:** RBAC Management UI (5 pts) - Completed 22 Jan
✅ **US-5.1.2:** Remove Birth Date from Patient Views (2 pts) - Completed 22 Jan
✅ **US-5.1.3:** Custom Fields in Patient List View (3 pts) - Completed 23 Jan
✅ **US-5.1.4:** Fix Alerts - Visits Without Custom Fields (3 pts) - Completed 23 Jan
✅ **US-5.2.1:** Calculated Field Type (13 pts) - Completed 24 Jan

**Pre-Sprint Total:** 26 story points completed ✅

### Remaining Sprint 2 Work
🔄 **US-5.2.2:** Common Calculated Fields (3 pts) - **NEXT**
🔄 **US-5.2.3:** Calculated Field Dependencies (5 pts) - **NEXT**

**Remaining Total:** 8 story points

**Sprint 2 Original Scope:** 34 story points
**Current Progress:** 76% complete (26/34 points)

---

## 👥 Équipe Sprint

- **Product Owner:** Équipe produit
- **Scrum Master:** Équipe technique
- **Développeurs:** Fullstack JS (Frontend + Backend)
- **QA:** Tests intégrés dans le développement

---

## 📋 User Stories Sprint 2

### Epic 5: Advanced Custom Fields (Sprint 2)

#### ✅ US-5.1.1: RBAC Management UI (5 points) - COMPLETED
**En tant qu'** administrateur système
**Je veux** gérer les rôles et permissions via une interface web
**Afin de** contrôler finement les accès sans modifier la base de données

**Status:** ✅ Completed 22 Jan 2026
**Branch:** `feature/US-5.1.1-rbac-ui`

**Critères d'acceptation:**
- ✅ Page admin/roles avec liste des rôles
- ✅ CRUD complet sur les rôles (Create, Read, Update, Delete)
- ✅ Gestion permissions par rôle avec checkboxes
- ✅ Tests d'accès et validation RBAC
- ✅ UI responsive et accessible

---

#### ✅ US-5.1.2: Remove Birth Date from Patient Views (2 points) - COMPLETED
**En tant qu'** utilisateur
**Je veux** que la date de naissance ne soit plus affichée dans les vues patients
**Afin de** respecter les nouvelles exigences de confidentialité

**Status:** ✅ Completed 22 Jan 2026
**Branch:** `feature/US-5.1.2-remove-birth-date`

**Critères d'acceptation:**
- ✅ Champ birth_date supprimé des formulaires patients
- ✅ Colonne birth_date retirée des vues liste
- ✅ Pages détail patient mises à jour
- ✅ Migration base de données préservant les données existantes
- ✅ Tests de non-régression

---

#### ✅ US-5.1.3: Custom Fields in Patient List View (3 points) - COMPLETED
**En tant que** diététicien
**Je veux** voir certains custom fields directement dans ma liste patients
**Afin de** filtrer et trier rapidement sans ouvrir chaque dossier

**Status:** ✅ Completed 23 Jan 2026
**Branch:** `feature/US-5.1.3-custom-fields-list`

**Critères d'acceptation:**
- ✅ Flag `show_in_list` sur custom field definitions
- ✅ Colonnes additionnelles dans PatientsPage table
- ✅ Tri par custom fields fonctionnel
- ✅ Filtre recherche inclut custom fields
- ✅ Performance optimisée (pas de N+1 queries)

---

#### ✅ US-5.1.4: Fix Alerts - Visits Without Custom Fields (3 points) - COMPLETED
**En tant que** diététicien
**Je veux** que les alertes de visites sans données utilisent les custom fields
**Afin de** avoir des alertes cohérentes avec le nouveau système

**Status:** ✅ Completed 23 Jan 2026
**Branch:** `feature/US-5.1.4-fix-alerts-custom-fields`

**Critères d'acceptation:**
- ✅ Alertes backend utilisent custom_field_values au lieu de visit.notes
- ✅ Frontend affiche correctement les nouvelles alertes
- ✅ Migration données existantes
- ✅ Tests validation
- ✅ Aucune régression sur autres alertes

---

#### ✅ US-5.2.1: Calculated Field Type (13 points) - COMPLETED
**En tant qu'** administrateur
**Je veux** créer des champs personnalisés calculés avec des formules
**Afin de** automatiser les calculs (ex: BMI, ratios nutritionnels)

**Status:** ✅ Completed 24 Jan 2026
**Branch:** `feature/US-5.2.1-calculated-fields`
**Completion Document:** `/US-5.2.1-COMPLETED.md`

**Critères d'acceptation:**
- ✅ Nouveau type de champ "calculated" dans custom field definition
- ✅ Éditeur de formule avec syntaxe: `{field_name} operator {field_name}`
- ✅ Opérateurs supportés: `+`, `-`, `*`, `/`, `^` (puissance)
- ✅ Fonctions supportées: `sqrt()`, `abs()`, `round()`, `floor()`, `ceil()`, `min()`, `max()`
- ✅ Aperçu en temps réel du résultat de la formule
- ✅ Gestion des erreurs (division par zéro, champs non définis)
- ✅ Validation de la formule avant sauvegarde
- ✅ Auto-recalculation quand les dépendances changent
- ✅ Auto-calculation on page load si dépendances existent
- ✅ Affichage read-only dans les formulaires avec icône 🧮
- ✅ 10 templates de formules pré-construites
- ✅ 50 tests unitaires passants

**Phases Implémentées:**
1. ✅ Database Migration (4 colonnes ajoutées)
2. ✅ Formula Engine Service (441 lignes, algorithme Shunting Yard)
3. ✅ Backend Integration (models, services, validations)
4. ✅ Frontend Components (modal, input, display)
5. ✅ Formula Validation & Preview API
6. ✅ Formula Templates (10 templates communs)
7. ✅ Auto-Calculation & Dependencies (recalcul automatique)

**Bugs Corrigés (24 Jan):**
- ✅ Backend validation rejecting 'calculated' type
- ✅ Modal scrolling issues (8 modals fixed)
- ✅ PropTypes validation warnings
- ✅ Model getValue/setValue not handling 'calculated' type
- ✅ Auto-calculation triggering issues

---

#### 🔄 US-5.2.2: Common Calculated Fields (3 points) - IN PROGRESS
**En tant que** praticien
**Je veux** des champs calculés pré-construits pour BMI et Âge
**Afin de** déployer rapidement sans créer mes propres formules

**Status:** 🔄 Ready to Start
**Priority:** MEDIUM
**Dependencies:** US-5.2.1 (completed)

**Critères d'acceptation:**
- [ ] Template BMI disponible: `{poids} / ({taille} * {taille})`
- [ ] Template Âge disponible: `(today - {date_naissance}) / 365.25`
- [ ] Fonctions de date: `today`, `year()`, `month()`, `day()`
- [ ] Précision décimale configurable (0-4 décimales)
- [ ] Interface "Quick Add" pour templates communs
- [ ] Documentation des templates dans help text
- [ ] Tests unitaires pour formules de date
- [ ] Tests validation BMI avec différentes unités

**Tâches techniques:**
- [ ] Étendre formula engine avec fonctions de date
- [ ] Créer service de templates (`formulaTemplates.service.js`)
- [ ] Ajouter "Quick Add Templates" dans CustomFieldDefinitionModal
- [ ] Implémenter calcul `today` dynamique
- [ ] Ajouter tests pour date functions
- [ ] Documenter templates disponibles

**Estimated Effort:** 1.5 jours
**Complexité:** Medium

---

#### 🔄 US-5.2.3: Calculated Field Dependencies (5 points) - PENDING
**En tant qu'** administrateur
**Je veux** que les champs calculés se mettent à jour automatiquement quand leurs dépendances changent
**Afin de** garantir la cohérence des données calculées

**Status:** 🔄 Ready to Start
**Priority:** MEDIUM
**Dependencies:** US-5.2.1 (completed), US-5.2.2 (in progress)

**Critères d'acceptation:**
- [ ] UI affiche l'arbre de dépendances (ex: BMI dépend de poids, taille)
- [ ] Auto-recalculation lors de la sauvegarde d'un champ dépendant
- [ ] Détection et prévention des dépendances circulaires
- [ ] Optimisation performance pour mises à jour en batch
- [ ] Affichage visuel des dépendances dans le formulaire
- [ ] Message d'erreur clair si dépendance circulaire détectée
- [ ] Tests performance (recalcul de 100+ champs <500ms)
- [ ] Tests intégration pour cascading updates

**Tâches techniques:**
- [ ] Créer composant `DependencyTree.jsx` pour visualisation
- [ ] Implémenter détection dépendances circulaires dans formula engine
- [ ] Optimiser `recalculateDependentFields()` pour batch updates
- [ ] Ajouter loading states pendant recalcul
- [ ] Créer tests performance avec gros volumes
- [ ] Documenter stratégie de recalcul dans ARCHITECTURE.md

**Estimated Effort:** 2.5 jours
**Complexité:** High

**Note:** Une partie de cette US est déjà implémentée dans US-5.2.1 (auto-recalculation basique). Cette story se concentre sur:
- Visualisation des dépendances
- Performance optimization
- Tests exhaustifs
- UX améliorée

---

## 📊 Sprint Capacity & Planning

### Velocity Estimation
- **Sprint Capacity:** 21 points (basé sur vélocité Sprint 1)
- **Sprint 2 Original Scope:** 34 points
- **Work Completed Pre-Sprint:** 26 points ✅
- **Remaining Work:** 8 points
- **Capacity Available:** 21 points
- **Capacity Utilization:** 38% (8/21)

### Sprint Backlog (Ordre de priorité)

#### Completed (26 points) ✅
1. US-5.1.1: RBAC Management UI (5 pts) ✅
2. US-5.1.2: Remove Birth Date (2 pts) ✅
3. US-5.1.3: Custom Fields in List (3 pts) ✅
4. US-5.1.4: Fix Alerts Custom Fields (3 pts) ✅
5. US-5.2.1: Calculated Field Type (13 pts) ✅

#### Remaining (8 points) 🔄
6. US-5.2.2: Common Calculated Fields (3 pts) - **NEXT**
7. US-5.2.3: Calculated Field Dependencies (5 pts) - **NEXT**

**Total Sprint 2:** 34 points (76% complete)

---

## 📅 Sprint Timeline

### Semaine 1: Common Calculated Fields & Dependencies Setup
**Jour 1-2:** US-5.2.2 - Common Calculated Fields (3 pts)
- Jour 1: Date functions + formula engine extension
- Jour 2: Templates UI + tests

**Jour 3-5:** US-5.2.3 - Calculated Field Dependencies (5 pts)
- Jour 3: Dependency tree visualization component
- Jour 4: Circular dependency detection + optimization
- Jour 5: Performance tests + integration tests

### Semaine 2: Polish, Testing & Documentation
**Jour 6-7:** Testing & Bug Fixes
- Comprehensive integration testing
- Performance testing with real data volumes
- Bug fixes and edge case handling

**Jour 8-9:** Documentation & Knowledge Transfer
- Update ARCHITECTURE.md with formula system
- Create USER_GUIDE.md for calculated fields
- Video demo for stakeholders

**Jour 10:** Sprint Review & Retrospective
- Demo calculated fields features
- Gather feedback
- Plan Sprint 3

---

## 📅 Sprint Events

- **Daily Scrum:** 15min chaque matin (9h30)
- **Mid-Sprint Check-in:** Jour 5 après-midi (progress review)
- **Sprint Review:** Jour 10 matin (demo stakeholders)
- **Sprint Retrospective:** Jour 10 après-midi
- **Sprint Planning 3:** Jour 10 fin journée

---

## ✅ Definition of Done (DoD)

Chaque user story doit respecter:
- [ ] Code implémenté et testé
- [ ] Tests unitaires écrits et passants (>80% coverage)
- [ ] Tests d'intégration fonctionnels
- [ ] Documentation technique mise à jour
- [ ] ESLint i18n linting passe sans erreur
- [ ] Performance validée (<50ms par calcul)
- [ ] Code review approuvé
- [ ] Déployé en staging
- [ ] Validation PO (Product Owner)
- [ ] User guide mis à jour (si applicable)

---

## 🎯 Sprint Success Metrics

### Qualité
- **Code Coverage:** >80% sur nouveaux code
- **Formula Evaluation Performance:** <50ms par calcul
- **Batch Recalculation:** <500ms pour 100 champs
- **Sécurité:** 0 vulnérabilités critiques (eval/Function banned)

### Fonctionnalité
- **Templates Disponibles:** 10+ formules pré-construites
- **Date Functions:** 4+ fonctions de date (today, year, month, day)
- **Dependency Detection:** 100% précision (pas de faux positifs)
- **Auto-Recalculation:** <100ms latence après save

### Business
- **User Adoption:** Templates utilisés dans >50% des nouveaux champs calculés
- **Performance:** Aucune plainte utilisateur sur lenteur
- **Feedback:** Satisfaction >8/10 sur facilité d'utilisation

---

## ⚠️ Risques & Mitigation

### Risques Identifiés

1. **Performance avec Gros Volumes**
   - *Risque:* Recalcul de nombreux champs pourrait ralentir l'UI
   - *Mitigation:* Batch updates + background jobs si >50 champs
   - *Probabilité:* MEDIUM | *Impact:* HIGH

2. **Complexité Formules de Date**
   - *Risque:* Calculs de date (fuseaux horaires, années bissextiles) complexes
   - *Mitigation:* Utiliser bibliothèque éprouvée (date-fns) pour dates
   - *Probabilité:* MEDIUM | *Impact:* MEDIUM

3. **Dépendances Circulaires Non Détectées**
   - *Risque:* Boucle infinie si détection échoue
   - *Mitigation:* Tests exhaustifs + limit de profondeur de recalcul
   - *Probabilité:* LOW | *Impact:* HIGH

4. **Adoption Utilisateur Faible**
   - *Risque:* Templates pas assez intuitifs ou utiles
   - *Mitigation:* Documentation claire + tooltips + exemples
   - *Probabilité:* LOW | *Impact:* MEDIUM

### Plan de Contingence
- **Scope Reduction:** Si retard, US-5.2.3 peut être simplifiée (basic dependency display)
- **Performance Issues:** Implémenter pagination/lazy loading si nécessaire
- **Testing Buffer:** Jours 6-7 dédiés aux ajustements

---

## 🚀 Sprint Deliverables

### Fonctionnels
- [ ] Système de templates pour champs calculés communs (BMI, Âge)
- [ ] Fonctions de date intégrées dans formula engine
- [ ] Visualisation de l'arbre de dépendances
- [ ] Auto-recalculation optimisée pour batch updates
- [ ] Interface "Quick Add" pour templates

### Techniques
- [ ] Formula engine étendu avec date functions
- [ ] Service de templates (`formulaTemplates.service.js`)
- [ ] Composant `DependencyTree.jsx`
- [ ] Détection dépendances circulaires robuste
- [ ] Tests performance pour gros volumes
- [ ] Documentation architecture formules

### Business
- [ ] User guide pour calculated fields
- [ ] Video demo pour stakeholders
- [ ] Feedback recueilli des beta testeurs
- [ ] Métriques d'usage établies

---

## 📈 Sprint Burndown Plan

```
Jour 0: 8 points restants (US-5.2.2: 3pts, US-5.2.3: 5pts)
Jour 1-2: 5 points restants (US-5.2.2 done)
Jour 3-5: 0 points restants (US-5.2.3 done)
Jour 6-10: Polish, testing, documentation
```

**Sprint Velocity Forecast:** 8 points (38% of capacity)
**Stretch Goals:** Possibilité de commencer Sprint 3 stories si temps disponible

---

## 🎉 Sprint 2 Planning Complete!

**Status:** ✅ **SPRINT PLANNING TERMINÉ**

Le Sprint 2 est déjà 76% complété grâce au travail anticipé:
- 26 points sur 34 déjà livrés ✅
- 8 points restants clairement définis
- Timeline réaliste avec buffer pour tests et documentation
- Risques identifiés et mitigés
- Métriques succès établies

**Prochaines étapes:**
1. ✅ Compléter US-5.2.2: Common Calculated Fields (3 pts)
2. ✅ Compléter US-5.2.3: Calculated Field Dependencies (5 pts)
3. ✅ Testing & Documentation
4. ✅ Sprint Review & Retrospective
5. ✅ Planifier Sprint 3

**Sprint 2 est en excellente position pour une livraison réussie!** 🚀

---

**Document créé:** 24 Jan 2026
**Dernière mise à jour:** 24 Jan 2026
**Prochaine revue:** Mi-sprint (Jour 5)
