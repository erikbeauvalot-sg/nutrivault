# Déploiement Sprint 3 en Staging

**Date:** 24 janvier 2026
**Sprint:** Sprint 3 - Measures Tracking Foundation
**Branch:** `feature/US-5.3.1-measures-tracking`
**Commits:** 62 commits depuis main

---

## Pré-requis

- [ ] Environnement staging configuré
- [ ] Accès SSH au serveur staging
- [ ] Base de données staging accessible
- [ ] Variables d'environnement staging configurées
- [ ] Tests passent localement

---

## Checklist de Déploiement

### Phase 1: Préparation (15 min)

- [ ] **Backup de la base de données staging**
  ```bash
  # Sur le serveur staging
  cd /path/to/nutrivault
  cp backend/data/database.sqlite backend/data/database.sqlite.backup-$(date +%Y%m%d-%H%M%S)
  ```

- [ ] **Vérifier que tous les tests passent**
  ```bash
  # Backend
  cd backend
  npm test

  # Frontend
  cd ../frontend
  npm test
  ```

- [ ] **Merger main dans la feature branch**
  ```bash
  git checkout main
  git pull origin main
  git checkout feature/US-5.3.1-measures-tracking
  git merge main
  # Résoudre les conflits si nécessaire
  ```

### Phase 2: Déploiement Backend (20 min)

- [ ] **Push la branche vers staging**
  ```bash
  git push origin feature/US-5.3.1-measures-tracking
  ```

- [ ] **Sur le serveur staging, pull les changements**
  ```bash
  ssh user@staging-server
  cd /path/to/nutrivault
  git fetch origin
  git checkout feature/US-5.3.1-measures-tracking
  git pull origin feature/US-5.3.1-measures-tracking
  ```

- [ ] **Installer les dépendances backend**
  ```bash
  cd backend
  npm install
  ```

- [ ] **Exécuter les migrations** ⚠️ CRITIQUE
  ```bash
  npx sequelize-cli db:migrate
  ```

  **Migrations attendues:**
  - `20260124120000-create-measures-tables.js` (tables + 5 index)

- [ ] **Exécuter les seeders dans l'ordre**
  ```bash
  # 1. Mesures par défaut (10 types)
  npx sequelize-cli db:seed --seed 20260124122000-default-measure-definitions.js

  # 2. Permissions RBAC (4 permissions + 10 assignations)
  npx sequelize-cli db:seed --seed 20260124134038-add-measures-permissions.js
  ```

- [ ] **Vérifier les migrations**
  ```bash
  npx sequelize-cli db:migrate:status
  ```

- [ ] **Redémarrer le serveur backend**
  ```bash
  pm2 restart nutrivault-backend
  # OU
  systemctl restart nutrivault-backend
  ```

- [ ] **Vérifier les logs backend**
  ```bash
  pm2 logs nutrivault-backend --lines 50
  # OU
  tail -f backend/backend.log
  ```

### Phase 3: Déploiement Frontend (15 min)

- [ ] **Installer les dépendances frontend**
  ```bash
  cd frontend
  npm install
  ```

- [ ] **Build de production**
  ```bash
  npm run build
  ```

- [ ] **Vérifier le build**
  ```bash
  ls -lh dist/
  # Doit contenir index.html, assets/, etc.
  ```

- [ ] **Redémarrer le serveur frontend**
  ```bash
  pm2 restart nutrivault-frontend
  # OU copier dist/ vers nginx
  cp -r dist/* /var/www/nutrivault/
  systemctl restart nginx
  ```

### Phase 4: Vérification Post-Déploiement (20 min)

- [ ] **Health check API**
  ```bash
  curl https://staging.nutrivault.com/api/health
  # Doit retourner: {"status":"healthy","timestamp":"..."}
  ```

- [ ] **Vérifier les permissions**
  ```bash
  # Test endpoint avec auth
  curl -H "Authorization: Bearer YOUR_TOKEN" \
    https://staging.nutrivault.com/api/measures
  # Doit retourner les mesures, PAS 403 Forbidden
  ```

- [ ] **Tester l'interface web**
  - [ ] Se connecter en tant qu'admin
  - [ ] Aller sur /settings/measures
  - [ ] Vérifier que les 10 mesures par défaut sont présentes
  - [ ] Créer une nouvelle mesure
  - [ ] Aller sur un patient
  - [ ] Ouvrir l'onglet "Measures"
  - [ ] Enregistrer une mesure
  - [ ] Vérifier le tableau se rafraîchit
  - [ ] Vérifier le graphique s'affiche
  - [ ] Tester Edit/Delete

- [ ] **Vérifier les logs d'erreur**
  ```bash
  # Backend
  pm2 logs nutrivault-backend --err --lines 100

  # Frontend (dans le navigateur)
  # Ouvrir DevTools → Console
  # Ne devrait pas avoir d'erreurs rouges
  ```

### Phase 5: Tests Fonctionnels (30 min)

#### Test 1: Création de mesure par l'admin
- [ ] Login admin
- [ ] /settings/measures → New Measure
- [ ] Remplir le formulaire (Weight - kg - numeric)
- [ ] Submit → Vérifier success
- [ ] Vérifier dans la liste

#### Test 2: Enregistrement de mesure patient
- [ ] Aller sur un patient
- [ ] Onglet Measures
- [ ] Cliquer "Log Measure"
- [ ] Sélectionner Weight
- [ ] Entrer 75.5 kg
- [ ] Submit → Vérifier success
- [ ] Vérifier dans le tableau
- [ ] Vérifier dans le graphique

#### Test 3: Historique et graphique
- [ ] Ajouter 3-4 mesures supplémentaires avec dates différentes
- [ ] Vérifier le graphique affiche toutes les mesures
- [ ] Changer le type de graphique (Line → Area)
- [ ] Ajuster la plage de dates
- [ ] Vérifier les statistiques (count, avg, min, max)

#### Test 4: Permissions RBAC
- [ ] Login DIETITIAN
- [ ] Vérifier peut voir /settings/measures
- [ ] Vérifier peut créer/modifier/supprimer mesures
- [ ] Login VIEWER
- [ ] Vérifier peut voir measures
- [ ] Vérifier NE PEUT PAS créer/modifier/supprimer

#### Test 5: Mesures lors d'une visite
- [ ] Créer/ouvrir une visite
- [ ] Onglet "Health Measures"
- [ ] Cliquer "Log Measure"
- [ ] Enregistrer une mesure
- [ ] Vérifier elle apparaît dans l'onglet
- [ ] Vérifier visit_id est bien enregistré

---

## Rollback en cas de problème

### Si migration échoue
```bash
# Rollback la dernière migration
npx sequelize-cli db:migrate:undo

# Restaurer le backup
cd backend/data
cp database.sqlite.backup-YYYYMMDD-HHMMSS database.sqlite
```

### Si l'app ne démarre pas
```bash
# Revenir à la version précédente
git checkout main
npm install
pm2 restart all
```

### Si permissions ne marchent pas
```bash
# Ré-exécuter le seeder permissions
npx sequelize-cli db:seed:undo --seed 20260124134038-add-measures-permissions.js
npx sequelize-cli db:seed --seed 20260124134038-add-measures-permissions.js
```

---

## Problèmes Connus et Solutions

### Problème 1: 403 Forbidden sur /api/measures
**Cause:** Permissions pas créées
**Solution:** Exécuter seeder permissions
```bash
npx sequelize-cli db:seed --seed 20260124134038-add-measures-permissions.js
```

### Problème 2: Table ne se rafraîchit pas après ajout
**Cause:** Cache navigateur
**Solution:** Hard refresh (Cmd+Shift+R / Ctrl+Shift+R)

### Problème 3: Graphique vide
**Cause:** Aucune mesure numérique
**Solution:** S'assurer que measure_type = 'numeric' et numeric_value est rempli

### Problème 4: "User is not defined"
**Cause:** Ancienne version du code sans import User
**Solution:** Vérifier que le commit `de196da` est bien déployé

---

## Nouvelles Variables d'Environnement

Aucune nouvelle variable requise pour Sprint 3.

---

## Dépendances NPM Ajoutées

### Backend
- Aucune nouvelle dépendance

### Frontend
- `recharts` v2.x (déjà installé dans Sprint 2)

---

## Monitoring Post-Déploiement

### Métriques à surveiller (premières 24h)

- [ ] **Erreurs 500** (devrait rester à 0)
- [ ] **Temps de réponse API** (<200ms pour GET measures)
- [ ] **Utilisation DB** (nouvelles tables patient_measures, measure_definitions)
- [ ] **Logs d'audit** (vérifier les actions measures.* sont loggées)

### Requêtes SQL à surveiller
```sql
-- Vérifier nombre de mesures
SELECT COUNT(*) FROM patient_measures WHERE deleted_at IS NULL;

-- Vérifier nombre de définitions
SELECT COUNT(*) FROM measure_definitions WHERE deleted_at IS NULL AND is_active = 1;

-- Vérifier permissions
SELECT COUNT(*) FROM permissions WHERE code LIKE 'measures.%';

-- Vérifier index
SELECT name FROM sqlite_master WHERE type='index' AND tbl_name='patient_measures';
```

---

## Contacts en cas de problème

- **Tech Lead:** [Nom]
- **DevOps:** [Nom]
- **Hotline:** [Numéro]

---

## Post-Déploiement

### Actions à faire après déploiement réussi

- [ ] **Notifier l'équipe** (Slack/Email)
- [ ] **Mettre à jour la documentation**
- [ ] **Créer des données de test** pour les testeurs
- [ ] **Former les utilisateurs pilotes** (si applicable)
- [ ] **Planifier revue de déploiement** (J+1)

### Métriques de succès Sprint 3

- ✅ Temps de réponse < 500ms pour requêtes measures
- ✅ 0 erreur 500 après 24h
- ✅ Utilisateurs peuvent créer et visualiser mesures
- ✅ Graphiques s'affichent correctement
- ✅ RBAC fonctionne comme prévu

---

## Notes

- Sprint 3 inclut 62 commits depuis main
- 3/4 user stories complétées (US-5.3.3 reportée)
- ~4,500 lignes de code ajoutées
- Performance optimisée pour 100K+ mesures

**Durée estimée du déploiement:** 60-90 minutes

**Fenêtre recommandée:** Heures creuses (20h-22h ou weekend)

---

**Préparé par:** Claude Sonnet 4.5
**Date:** 24 janvier 2026
**Version:** 1.0
