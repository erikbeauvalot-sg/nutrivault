# Sprint Planning - Sprint 1: Fondation

**Sprint:** 1
**Durée:** 2 semaines (21 Jan - 3 Feb 2026)
**Objectif:** Premier prototype fonctionnel avec authentification et gestion patients
**Thème:** "Hello NutriVault" - Version minimum viable pour démonstration

## 🎯 Sprint Goal

Construire les fondations de NutriVault avec un système d'authentification robuste et une gestion basique des patients, permettant une première démonstration fonctionnelle aux parties prenantes.

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
- [ ] Implémenter route POST /api/auth/login
- [ ] Créer service JWT avec tokens
- [ ] Middleware authentification
- [ ] Gestion refresh token
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
- [ ] Route POST /api/auth/logout
- [ ] Invalidation tokens
- [ ] Middleware cleanup
- [ ] Tests déconnexion

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
- [ ] Créer modèle Patient avec migrations
- [ ] Route POST /api/patients
- [ ] Validation express-validator
- [ ] Composant React CreatePatientModal
- [ ] Intégration API frontend
- [ ] Tests CRUD patients

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
- [ ] Route GET /api/patients avec filtres
- [ ] Composant PatientsPage avec table
- [ ] Recherche et pagination frontend
- [ ] Middleware RBAC pour isolation
- [ ] Tests requêtes filtrées

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
- [ ] Route PUT /api/patients/:id
- [ ] Composant EditPatientModal
- [ ] Validation permissions (owner only)
- [ ] Tests modifications

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
- [ ] Créer page DashboardPage
- [ ] Layout responsive avec sidebar
- [ ] Composants métriques de base
- [ ] Navigation et routing
- [ ] Tests UI composants

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
- [ ] État global pour mode dashboard
- [ ] Logique bascule interface
- [ ] Storage préférences utilisateur
- [ ] Tests changement mode

## 📊 Sprint Capacity & Planning

### Velocity Estimation
- **Sprint Capacity:** 21 points (3 développeurs × 2 semaines × 3.5 points/jour)
- **Total Sprint 1:** 23 points → **Ajustement nécessaire**

### Sprint Backlog Ajusté (21 points)
1. US-1.1: Inscription (3 pts) ✅
2. US-1.2: Connexion (2 pts) ✅
3. US-1.3: Déconnexion (1 pt) ✅
4. US-2.1: Création patient (3 pts) ✅
5. US-2.2: Liste patients (3 pts) ✅
6. US-2.3: Modification patient (2 pts) ✅
7. US-4.1: Dashboard base (3 pts) ✅
8. US-4.2: Bascule dashboard (2 pts) ✅

**Total:** 21 points - **Parfaitement calibré**

## 📅 Sprint Timeline

### Semaine 1: Authentification & Backend
**Jour 1-2:** Setup projet + Authentification backend
**Jour 3-4:** Tests auth + début patients backend
**Jour 5:** Revue semaine 1 + ajustements

### Semaine 2: Frontend & Intégration
**Jour 6-7:** Interface auth + début patients frontend
**Jour 8-9:** Dashboard + intégration complète
**Jour 10:** Tests finaux + préparation démo

### Événements Sprint
- **Daily Scrum:** 15min chaque matin (9h30)
- **Sprint Review:** Jour 10 après-midi
- **Sprint Retrospective:** Jour 10 fin journée
- **Démo:** Vendredi après-midi aux stakeholders

## ✅ Definition of Done (DoD)

Chaque user story doit respecter :
- [ ] Code review passé (2 approuvés minimum)
- [ ] Tests unitaires écrits et passants (>80% coverage)
- [ ] Tests d'intégration fonctionnels
- [ ] Documentation technique mise à jour
- [ ] Tests E2E avec Playwright
- [ ] Performance mobile validée (<1s)
- [ ] Accessibilité WCAG AA respectée
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