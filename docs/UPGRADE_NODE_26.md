# Mode opératoire — Montée de version Node.js 20 → 26 (production)

Serveur : `sd-161616` (Debian 13 « trixie », x86_64)
Durée estimée : 20 à 30 min, dont ~5 min d'indisponibilité du backend.

## Contexte

| Élément | Valeur actuelle |
| --- | --- |
| Node.js | 20.20.2 (paquet `nodejs` NodeSource, fin de support avril 2026) |
| Dépôt apt | `/etc/apt/sources.list.d/nodesource.sources` → `node_20.x` |
| Clé du dépôt | `/usr/share/keyrings/nodesource.gpg` (inchangée pour la v26) |
| Service backend | `nutrivault.service` (systemd, user `www-data`, `ExecStart=/usr/bin/node src/server.js`) |
| Base de données | SQLite : `/opt/nutrivault/backend/data/nutrivault.db` |
| Logs backend | `/opt/nutrivault/backend/logs/backend.log` |
| Module natif | `sqlite3` (N-API) : doit être réinstallé après le changement de Node |

Le frontend est un build statique servi par nginx : il n'est pas impacté à l'exécution.

## 0. Prérequis

- [ ] **Node 26 est passé en LTS.** Vérification :

  ```bash
  curl -s https://nodejs.org/dist/index.json | grep -m1 '"v26' | grep -o '"lts":[^,]*'
  ```

  Attendu : `"lts":"<nom de code>"` (et non `"lts":false`). En attendant, Node 24 LTS est l'alternative : remplacer `26` par `24` dans toute la procédure.
- [ ] **La version applicative ≥ 8.9.0 est déjà déployée** (mise à jour des dépendances, `sqlite3` 6). Le déployer d'abord sur Node 20 permet de ne pas mélanger les deux changements.
- [ ] Créneau choisi hors consultations (aucun utilisateur connecté).
- [ ] Connecté en `root` sur `sd-161616`.

## 1. État initial (à noter)

```bash
node -v && npm -v
dpkg -l nodejs | tail -1                 # version exacte du paquet, utile pour le rollback
systemctl status nutrivault --no-pager | head -5
curl -s -o /dev/null -w "%{http_code}\n" http://localhost:3001/health   # attendu : 200
grep '"version"' /opt/nutrivault/package.json
```

## 2. Sauvegardes

```bash
STAMP=$(date +%Y%m%d-%H%M)
mkdir -p /opt/nutrivault/backups/node-upgrade-$STAMP
cd /opt/nutrivault/backups/node-upgrade-$STAMP

# Arrêt du backend pour une copie cohérente de la base
systemctl stop nutrivault
cp -a /opt/nutrivault/backend/data/nutrivault.db* .

# node_modules actuels (rollback rapide sans réinstallation)
tar czf node_modules-node20.tgz -C /opt/nutrivault node_modules backend/node_modules

ls -lh
```

Le backend reste arrêté jusqu'à l'étape 5.

## 3. Bascule du dépôt NodeSource vers Node 26

```bash
cp /etc/apt/sources.list.d/nodesource.sources /root/nodesource.sources.node20.bak
sed -i 's#node_20.x#node_26.x#' /etc/apt/sources.list.d/nodesource.sources
cat /etc/apt/sources.list.d/nodesource.sources      # vérifier : URIs: https://deb.nodesource.com/node_26.x

apt-get update
apt-cache policy nodejs                              # « Candidate » doit être en 26.x
```

## 4. Installation de Node 26

```bash
apt-get install -y nodejs
hash -r
node -v          # attendu : v26.x.x
npm -v           # attendu : 11.x
which node       # attendu : /usr/bin/node (chemin utilisé par le service systemd)
```

## 5. Réinstallation des dépendances et redémarrage

Le script de déploiement fait `npm ci` dans `/`, `backend/` et `frontend/` (recompilation de `sqlite3` pour Node 26), les migrations, le build frontend, les droits et le redémarrage du service :

```bash
cd /opt/nutrivault && ./scripts/deploy-bare-metal.sh -y
```

Si `npm ci` échoue sur `sqlite3` (binaire précompilé introuvable, compilation nécessaire) :

```bash
apt-get install -y build-essential python3
cd /opt/nutrivault && ./scripts/deploy-bare-metal.sh -y
```

## 6. Vérifications

```bash
# Service et santé
systemctl status nutrivault --no-pager | head -5
curl -s -o /dev/null -w "%{http_code}\n" http://localhost:3001/health      # 200

# Le service tourne bien sous Node 26
cat /proc/$(systemctl show -p MainPID --value nutrivault)/cmdline | tr '\0' ' '; echo
/usr/bin/node -v

# Module natif sqlite3 chargé par l'utilisateur du service
cd /opt/nutrivault/backend && sudo -u www-data node -e \
  "const s=require('sqlite3');new s.Database('data/nutrivault.db',s.OPEN_READONLY).get('select count(*) n from users',(e,r)=>console.log(e||r))"

# Logs : aucune erreur au démarrage
tail -n 100 /opt/nutrivault/backend/logs/backend.log | grep -iE "error|exception|failed" | grep -v failed_login
```

Tests fonctionnels dans l'application (web et iOS) :

- [ ] Connexion admin et diététicien
- [ ] Liste et fiche patient
- [ ] Création d'une visite et d'une facture, génération du PDF
- [ ] Envoi d'un email (facture ou document) et réception
- [ ] Export comptable (Finances → export xlsx)
- [ ] Notification push sur l'app iOS
- [ ] Aucun 500 dans la console du navigateur (F12 → Réseau)

## 7. Rollback (si problème)

```bash
systemctl stop nutrivault

# Retour au dépôt Node 20 et réinstallation de la version notée à l'étape 1
cp /root/nodesource.sources.node20.bak /etc/apt/sources.list.d/nodesource.sources
apt-get update
apt-get install -y --allow-downgrades nodejs=20.20.2-1nodesource1
hash -r && node -v                                   # v20.20.2

# Restauration des node_modules compilés pour Node 20
cd /opt/nutrivault
rm -rf node_modules backend/node_modules
tar xzf backups/node-upgrade-<STAMP>/node_modules-node20.tgz -C /opt/nutrivault
chown -R www-data:www-data backend/node_modules

# Uniquement si la base a été corrompue ou migrée de travers
# cp -a backups/node-upgrade-<STAMP>/nutrivault.db* backend/data/

systemctl start nutrivault
curl -s -o /dev/null -w "%{http_code}\n" http://localhost:3001/health
```

## 8. Après la migration

- Passer `firebase-admin` en 14.x (nécessite Node ≥ 22) pour corriger les dernières alertes `npm audit` liées à Google Cloud.
- Ajouter `"engines": { "node": ">=26" }` dans les `package.json` pour documenter la version minimale.
- Supprimer la sauvegarde `node-upgrade-<STAMP>` après quelques jours de fonctionnement normal.
