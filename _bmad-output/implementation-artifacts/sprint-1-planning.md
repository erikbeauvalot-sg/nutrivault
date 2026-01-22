# Sprint Planning - Sprint 1: Fondation

**Sprint:** 1
**Durée:** 2 semaines (21 Jan - 3 Feb 2026)
**Objectif:** Premier prototype fonctionnel avec authentification et gestion patients
**Thème:** "Hello NutriVault" - Version minimum viable pour démonstration

## 🎯 Sprint Goal

Construire les fondations de NutriVault avec un système d'authentification robuste et une gestion basique des patients, permettant une première démonstration fonctionnelle aux parties prenantes.

## ⚠️ CRITICAL: Sprint 1 Extended - i18n Remediation Required

**Date Identified**: 21 Jan 2026
**Status**: 🔴 PRODUCTION BLOCKER
**New Sprint End Date**: Feb 4, 2026 (+1 day)

**Context**: Code review identified 6 critical i18n violations violating project requirement: "always translate all string on the frontend using the i18n system" (copilot-instructions.md:72). French users currently see English in dialogs and error messages.

**Detailed Plan**: See `/I18N-REMEDIATION-PLAN.md`

**Impact**: Sprint 1 cannot be considered complete until remediation is done.

## 👥 Équipe Sprint

- **Product Owner:** Équipe produit
- **Scrum Master:** Équipe technique
- **Développeurs:** Fullstack JS (Frontend + Backend)
- **QA:** Tests intégrés dans le développement

## 📋 User Stories Sprint 1

### Epic 1: Authentification (8 points)

#### US-1.1: Inscription diététicien (3 points)
**En tant que** nouveau diététicien
**Je veux** pouvoir m'inscrire avec email/mot de passe
**Afin de** créer mon compte professionnel

**Critères d'acceptation:**
- ✅ Formulaire inscription avec validation email
- ✅ Mot de passe fort (8+ chars, maj/min/num/spécial)
- ✅ Email de confirmation envoyé
- ✅ Redirection vers login après inscription
- ✅ Gestion erreurs (email existant, format invalide)

**Tâches techniques:**
- [ ] Créer modèle User avec migrations
- [ ] Implémenter route POST /api/auth/register
- [ ] Ajouter validation express-validator
- [ ] Intégrer bcrypt pour hashage
- [ ] Configurer nodemailer pour emails
- [ ] Créer template email confirmation
- [ ] Tests unitaires + intégration

#### US-1.2: Connexion diététicien (2 points)
**En tant que** diététicien inscrit
**Je veux** pouvoir me connecter avec mes identifiants
**Afin d** accéder à mon espace sécurisé

**Critères d'acceptation:**
- ✅ Formulaire login fonctionnel
- ✅ Génération JWT access + refresh tokens
- ✅ Stockage sécurisé tokens (localStorage/sessionStorage)
- ✅ Gestion erreurs (identifiants invalides)
- ✅ Redirection vers dashboard après connexion

**Tâches techniques:**
- [x] Implémenter route POST /api/auth/login
- [x] Créer service JWT avec tokens
- [x] Middleware authentification
- [x] Gestion refresh token
- [ ] Tests authentification

#### US-1.3: Déconnexion sécurisée (1 point)
**En tant que** diététicien connecté
**Je veux** pouvoir me déconnecter
**Afin de** protéger mes données

**Critères d'acceptation:**
- ✅ Bouton déconnexion visible
- ✅ Invalidation tokens côté serveur
- ✅ Nettoyage stockage local
- ✅ Redirection vers page login

**Tâches techniques:**
- [x] Route POST /api/auth/logout
- [x] Invalidation tokens
- [x] Middleware cleanup
- [x] Tests déconnexion

### Epic 2: Gestion Patients (10 points)

#### US-2.1: Création dossier patient (3 points)
**En tant que** diététicien
**Je veux** créer un nouveau dossier patient
**Afin de** commencer le suivi d'un patient

**Critères d'acceptation:**
- ✅ Formulaire création patient complet
- ✅ Validation données (nom, prénom, email obligatoires)
- ✅ Sauvegarde en base avec user_id diététicien
- ✅ Gestion erreurs et validation côté frontend
- ✅ Redirection vers liste patients après création

**Tâches techniques:**
- [x] Créer modèle Patient avec migrations
- [x] Route POST /api/patients
- [x] Validation express-validator
- [x] Composant React CreatePatientModal
- [x] Intégration API frontend
- [x] Tests CRUD patients

#### US-2.2: Liste patients avec recherche (3 points)
**En tant que** diététicien
**Je veux** voir la liste de mes patients
**Afin de** naviguer facilement dans mes dossiers

**Critères d'acceptation:**
- ✅ Affichage liste patients paginée
- ✅ Recherche par nom/prénom/email
- ✅ Filtres actifs/inactifs
- ✅ Tri par nom/date création
- ✅ Isolation données (patients du diététicien uniquement)

**Tâches techniques:**
- [x] Route GET /api/patients avec filtres
- [x] Composant PatientsPage avec table
- [x] Recherche et pagination frontend
- [x] Middleware RBAC pour isolation
- [x] Tests requêtes filtrées

#### US-2.3: Modification patient (2 points)
**En tant que** diététicien
**Je veux** modifier les informations d'un patient
**Afin de** maintenir les données à jour

**Critères d'acceptation:**
- ✅ Bouton édition dans liste patients
- ✅ Formulaire pré-rempli avec données actuelles
- ✅ Validation et sauvegarde modifications
- ✅ Gestion erreurs et confirmation

**Tâches techniques:**
- [x] Route PUT /api/patients/:id
- [x] Composant EditPatientModal
- [x] Validation permissions (owner only)
- [x] Tests modifications

### Epic 4: Dashboard de Base (5 points)

#### US-4.1: Dashboard "Ma Journée" (3 points)
**En tant que** diététicien
**Je veux** un dashboard optimisé pour consultation
**Afin d** accéder rapidement aux informations critiques

**Critères d'acceptation:**
- ✅ Interface mobile-first responsive
- ✅ Affichage nom utilisateur connecté
- ✅ Métriques simples (nb patients actifs)
- ✅ Navigation vers fonctionnalités principales
- ✅ Design professionnel et intuitif

**Tâches techniques:**
- [x] Créer page DashboardPage
- [x] Layout responsive avec sidebar
- [x] Composants métriques de base
- [x] Navigation et routing
- [x] Tests UI composants

#### US-4.2: Bascule dashboard (2 points)
**En tant que** diététicien
**Je veux** basculer entre vues "Ma Journée" et "Mon Cabinet"
**Afin d** adapter l'interface à mon contexte d'usage

**Critères d'acceptation:**
- ✅ Bouton bascule visible et intuitif
- ✅ Changement layout et contenu
- ✅ Persistence préférence utilisateur
- ✅ Adaptation responsive maintenue

**Tâches techniques:**
- [x] État global pour mode dashboard
- [x] Logique bascule interface
- [x] Storage préférences utilisateur
- [ ] Tests changement mode

### Epic 5: i18n Remediation (CRITICAL - 8 points)

#### US-5.1: Setup i18n Linting (1 point) 🔴 BLOCKER
**En tant que** développeur
**Je veux** avoir un linter qui détecte les chaînes non traduites
**Afin de** prévenir les futures violations i18n

**Critères d'acceptation:**
- [ ] ESLint + eslint-plugin-i18next installés
- [ ] Configuration ESLint avec règle no-literal-string
- [ ] Script npm run lint fonctionnel
- [ ] CI/CD intégration (pré-commit hook)

**Tâches techniques:**
- [ ] Installer eslint, eslint-plugin-react, eslint-plugin-i18next
- [ ] Créer eslint.config.js avec règles i18n
- [ ] Ajouter scripts lint/lint:fix dans package.json
- [ ] Tester linting sur codebase
- [ ] Configurer git pre-commit hook

**Référence**: I18N-REMEDIATION-PLAN.md Part 1

#### US-5.2: Fix window.confirm() i18n violations (2 points) 🔴 BLOCKER
**En tant qu'** utilisateur français
**Je veux** voir les dialogues de confirmation en français
**Afin de** comprendre les actions critiques

**Critères d'acceptation:**
- [ ] Tous les window.confirm() utilisent t()
- [ ] Clés de traduction ajoutées dans fr.json et en.json
- [ ] Tests manuels en français confirmés
- [ ] Aucune erreur ESLint i18n

**Tâches techniques:**
- [ ] Fix PatientsPage.jsx:74 - t('patients.confirmDelete')
- [ ] Fix BillingPage.jsx:129 - t('billing.confirmDeleteInvoice')
- [ ] Fix EditVisitPage.jsx:306 - t('visits.confirmDeleteMeasurement')
- [ ] Fix VisitsPage.jsx:104 - t('visits.confirmDelete')
- [ ] Ajouter 4 clés de traduction (fr + en)
- [ ] Tests manuels de suppression

**Référence**: I18N-REMEDIATION-PLAN.md Part 2, Issue #1

#### US-5.3: Fix error messages i18n violations (3 points) 🔴 BLOCKER
**En tant qu'** utilisateur français
**Je veux** voir les messages d'erreur en français
**Afin de** comprendre ce qui s'est mal passé

**Critères d'acceptation:**
- [ ] Tous les messages d'erreur utilisent t() avec interpolation
- [ ] Clés de traduction ajoutées pour toutes les erreurs
- [ ] Tests d'erreurs en français validés
- [ ] Pattern réutilisable documenté

**Tâches techniques:**
- [ ] Fix PatientsPage.jsx:65,83 - erreurs patients
- [ ] Fix BillingPage.jsx:84,100,137 - erreurs factures
- [ ] Fix EditVisitPage.jsx:314 - erreur mesures
- [ ] Fix VisitsPage.jsx:111 - erreur visites
- [ ] Ajouter 7+ clés errors.* (fr + en)
- [ ] Fix label "Error:" → t('common.error')
- [ ] Tests manuels erreurs réseau

**Référence**: I18N-REMEDIATION-PLAN.md Part 2, Issue #2 & #3

#### US-5.4: Backend route conflict fix (1 point) 🔴 BLOCKER
**En tant que** développeur
**Je veux** des routes backend correctement ordonnées
**Afin d'** éviter les conflits et 404 errors

**Critères d'acceptation:**
- [ ] Route /api/patients/tags/all supprimée (doublon)
- [ ] Routes spécifiques placées AVANT routes paramétrées
- [ ] Tests API validés
- [ ] Aucune régression sur endpoints patients

**Tâches techniques:**
- [ ] Supprimer lignes 405-410 dans patients.js
- [ ] Vérifier ordre des routes (specifiques avant /:id)
- [ ] Tests GET /api/patients/tags
- [ ] Tests GET /api/patients/:id

**Référence**: I18N-REMEDIATION-PLAN.md Part 3

#### US-5.5: Audit complet i18n + LIKE sanitization (1 point)
**En tant que** développeur
**Je veux** auditer tout le code pour i18n manquants
**Afin d'** assurer 100% de couverture

**Critères d'acceptation:**
- [ ] Audit grep sur toutes les pages
- [ ] Toutes les violations trouvées et corrigées
- [ ] LIKE query sanitization implémentée
- [ ] npm run lint passe à 100%

**Tâches techniques:**
- [ ] Audit: grep -r "window\\.confirm\\|alert(" frontend/src/
- [ ] Audit: grep -r ">\s*[A-Z]" pages/ sans t()
- [ ] Fix patient.service.js LIKE query escape
- [ ] Tests recherche avec caractères spéciaux (%, _)
- [ ] Documentation pattern i18n dans AGENTS.md

**Référence**: I18N-REMEDIATION-PLAN.md Part 4 & 5

## 📊 Sprint Capacity & Planning

### Velocity Estimation
- **Sprint Capacity Original:** 21 points (3 développeurs × 2 semaines × 3.5 points/jour)
- **Sprint 1 Original:** 21 points ✅ COMPLETED
- **Sprint 1 Extension (i18n):** +8 points 🔴 CRITICAL
- **Total Sprint 1 Extended:** 29 points

### Sprint Backlog Original (21 points) - ✅ COMPLETED
1. US-1.1: Inscription (3 pts) ✅
2. US-1.2: Connexion (2 pts) ✅
3. US-1.3: Déconnexion (1 pt) ✅
4. US-2.1: Création patient (3 pts) ✅
5. US-2.2: Liste patients (3 pts) ✅
6. US-2.3: Modification patient (2 pts) ✅
7. US-4.1: Dashboard base (3 pts) ✅
8. US-4.2: Bascule dashboard (2 pts) ✅

**Total Original:** 21 points - ✅ **COMPLETED**

### Sprint Backlog Extension (8 points) - 🔴 BLOCKER
9. US-5.1: Setup i18n Linting (1 pt) 🔴
10. US-5.2: Fix window.confirm() violations (2 pts) 🔴
11. US-5.3: Fix error messages violations (3 pts) 🔴
12. US-5.4: Backend route conflict fix (1 pt) 🔴
13. US-5.5: Audit complet i18n (1 pt) ⚠️

**Total Extension:** 8 points - 🔴 **MUST COMPLETE FOR SPRINT 1 DoD**

**Total Sprint 1 Final:** 29 points

## 📅 Sprint Timeline

### Semaine 1: Authentification & Backend ✅ COMPLETED
**Jour 1-2:** Setup projet + Authentification backend ✅
**Jour 3-4:** Tests auth + début patients backend ✅
**Jour 5:** Revue semaine 1 + ajustements ✅

### Semaine 2: Frontend & Intégration ✅ COMPLETED
**Jour 6-7:** Interface auth + début patients frontend ✅
**Jour 8-9:** Dashboard + intégration complète ✅
**Jour 10:** Tests finaux + préparation démo ✅

### Extension Day: i18n Remediation (21 Jan 2026) 🔴 CURRENT
**Jour 11 (TODAY):** i18n remediation critical work
- **Matin (4h):**
  - Setup ESLint i18n linting (1h)
  - Fix window.confirm() violations (1h)
  - Fix error messages violations (2h)
- **Après-midi (4h):**
  - Backend route conflict fix (30min)
  - Complete i18n audit (1.5h)
  - Testing & validation (2h)

**Livrables Jour 11:**
- [ ] ESLint i18n configuré et fonctionnel
- [ ] Tous les window.confirm() traduits
- [ ] Tous les messages d'erreur traduits
- [ ] Route conflict résolu
- [ ] npm run lint passe à 100%
- [ ] Tests manuels français/anglais OK

### Événements Sprint
- **Daily Scrum:** 15min chaque matin (9h30)
- **Code Review Session:** Jour 11 matin (review findings)
- **Sprint Review REPLANIFIÉE:** Jour 11 fin après-midi (après remediation)
- **Sprint Retrospective:** Jour 11 fin journée
- **Démo aux stakeholders:** À planifier après validation remediation

## ✅ Definition of Done (DoD)

Chaque user story doit respecter :
- [ ] Code review passé (2 approuvés minimum)
- [ ] Tests unitaires écrits et passants (>80% coverage)
- [ ] Tests d'intégration fonctionnels
- [ ] Documentation technique mise à jour
- [ ] Tests E2E avec Playwright
- [ ] Performance mobile validée (<1s)
- [ ] Accessibilité WCAG AA respectée
- [ ] **i18n: Toutes les chaînes utilisateur utilisent t() (CRITICAL)** 🔴 NEW
- [ ] **ESLint i18n linting passe sans erreur** 🔴 NEW
- [ ] Code déployé en staging
- [ ] Validation PO (Product Owner)

## 🎯 Sprint Success Metrics

### Qualité
- **Code Coverage:** >80% backend + frontend
- **Performance:** <1s loading dashboard mobile
- **Sécurité:** 0 vulnérabilités critiques
- **Tests:** 100% user stories avec tests E2E

### Fonctionnalité
- **Authentification:** 100% scénarios fonctionnels
- **CRUD Patients:** Création, lecture, modification opérationnelles
- **Dashboard:** Interface responsive et navigable
- **Isolation données:** Patients d'autres diététiciens invisibles

### Business
- **Prototype Démontrable:** Démo complète possible
- **Feedback Stakeholders:** Recueillir input pour Sprint 2
- **Base Technique:** Fondation solide pour sprints suivants

## ⚠️ Risques & Mitigation

### Risques Identifiés
1. **Complexité Authentification:** Migration dev→prod tokens
   - *Mitigation:* Tests approfondis + documentation

2. **Performance Mobile:** Optimisations requises tôt
   - *Mitigation:* Monitoring continu + optimisations itératives

3. **Isolation Données:** Sécurité multi-tenant critique
   - *Mitigation:* Tests sécurité + audit code

### Plan de Contingence
- **Scope Reduction:** Si retard, prioriser auth + CRUD patients
- **Spike Technique:** Journée dédiée résolution blocages
- **Pair Programming:** Sessions résolution problèmes complexes

## 🚀 Sprint Deliverables

### Fonctionnels
- [ ] Système authentification complet (register/login/logout)
- [ ] Gestion patients basique (CRUD)
- [ ] Dashboard responsive avec bascule modes
- [ ] Interface mobile-first opérationnelle

### Techniques
- [ ] Architecture backend avec API REST
- [ ] Base données avec migrations + seeders
- [ ] Tests automatisés complets
- [ ] CI/CD pipeline fonctionnel
- [ ] Documentation développeur

### Business
- [ ] Prototype démo-ready
- [ ] Feedback stakeholders recueilli
- [ ] Roadmap Sprint 2 validé
- [ ] Métriques succès établies

## 📈 Sprint Burndown Plan

```
Jour 1-2: 21 points restants
Jour 3-4: 15 points restants
Jour 5: 12 points restants (revue)
Jour 6-7: 8 points restants
Jour 8-9: 3 points restants
Jour 10: 0 points (sprint terminé)
```

---

## 🎉 Sprint 1 Ready for Launch!

**Status:** ✅ **SPRINT PLANNING TERMINÉ**

Le Sprint 1 est maintenant planifié avec :
- 8 user stories prioritaires (21 points)
- Timeline détaillée sur 2 semaines
- Critères qualité stricts
- Métriques succès définies
- Risques identifiés et mitigés

**Prochaine étape : Commencer l'implémentation !**

*Le premier prototype NutriVault va prendre vie...* 🚀