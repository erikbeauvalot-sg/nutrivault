# Plan iOS Natif - NutriVault

> Audit et plan d'amelioration pour rendre l'app Capacitor plus native iOS.
> Chaque section peut etre cochee au fur et a mesure de l'implementation.

---

## Etat actuel

L'app a deja de bonnes bases natives :
- Safe areas correctement gerees (`env(safe-area-inset-*)`)
- Haptics integres (bottom tab bar)
- Pull-to-refresh basique
- Momentum scrolling (`-webkit-overflow-scrolling: touch`)
- Bottom tab bar avec glass-morphism + blur
- Gestion du clavier via Capacitor Keyboard
- Biometrie (Face ID / Touch ID)
- Splash screen anime

Mais l'UX reste "web dans un wrapper" sur plusieurs points cles.

---

## 1. Configuration de l'URL serveur (Impact: CRITIQUE)

**Probleme** : L'URL API est hardcodee dans `.env.native` (`https://nutrivault.beauvalot.com/api`). Sur l'app native, il est impossible de changer le serveur cible sans rebuilder. Un utilisateur qui heberge sa propre instance (ex: `http://localhost:3001`) ne peut pas se connecter.

**Objectif** : Permettre a l'utilisateur de configurer l'URL du serveur depuis l'app, avec `https://nutrivault.beauvalot.com` comme valeur par defaut.

### Fonctionnalite

- [x] Creer un ecran `ServerConfigScreen.jsx` accessible depuis la page de login (petit lien "Configurer le serveur")
- [x] Input pour saisir l'URL custom (ex: `http://192.168.1.50:3001`, `https://mon-serveur.com/api`)
- [x] Bouton "Tester la connexion" qui fait un `GET /health` (endpoint existant dans `backend/src/server.js:59`)
- [x] Indicateur visuel : vert = serveur accessible, rouge = erreur de connexion
- [x] Sauvegarder l'URL choisie dans `@capacitor/preferences` (persiste entre les relances)
- [x] Bouton "Reinitialiser" pour revenir a l'URL par defaut (`https://nutrivault.beauvalot.com/api`)
- [x] Modifier `api.js` : au demarrage, lire l'URL depuis Preferences avant de fallback sur `import.meta.env.VITE_API_URL`
- [x] Mettre a jour dynamiquement `axios.defaults.baseURL` quand l'URL change (sans reload)
- [x] Gerer le cas web (non-native) : ignorer la config Preferences, utiliser `VITE_API_URL` comme avant
- [x] Afficher l'URL du serveur actuel en bas de l'ecran de config (pour debug)
- [x] Traductions FR/EN pour toutes les chaines i18n

### Tests

- [x] **Tests unitaires** — `serverConfigService.test.js` (17 tests) :
  - `getServerUrl()` retourne l'URL par defaut quand aucune preference n'est sauvee
  - `getServerUrl()` retourne l'URL sauvegardee quand elle existe dans Preferences
  - `setServerUrl(url)` sauvegarde correctement dans Preferences
  - `resetServerUrl()` supprime la preference et retourne l'URL par defaut
  - Validation d'URL : rejette les URLs invalides (pas de protocole, caracteres speciaux)
  - Gestion web (non-native) : utilise `VITE_API_URL` sans toucher Preferences
  - `testConnection()` retourne success/error selon la reponse du serveur
- [x] **Tests composant** — `ServerConfigScreen.test.jsx` (12 tests) :
  - Affiche l'URL par defaut au chargement
  - Saisie d'une URL custom met a jour le champ
  - "Tester la connexion" appelle `GET /health` sur l'URL saisie
  - Affiche indicateur vert quand le serveur repond 200
  - Affiche indicateur rouge quand le serveur ne repond pas (timeout, erreur reseau)
  - "Reinitialiser" remet l'URL par defaut
  - Bouton retour ramene a la page de login
- [ ] **Tests integration** — `serverConfig.integration.test.js` (optionnel, flux E2E) :
  - Flux complet : config URL → login → verifier que les appels API utilisent la bonne URL

### Backend / Deploiement

- [x] **Endpoint `/health`** : Verifie accessible sans authentification (deja le cas, `server.js:59`)
- [x] **CORS** : Verifie — `capacitor://localhost` et requetes sans origin sont deja autorisees dans `server.js`
- [x] **Migration** : Aucune migration necessaire (pas de changement de schema DB — tout est cote frontend/Preferences)
- [x] **Seed** : Aucun seed necessaire
- [x] **Deploy bare-metal** : Verifie — `scripts/deploy-bare-metal.sh` n'est pas impacte (config URL 100% cote client)
- [x] **Info.plist iOS** : Ajoute `NSAllowsLocalNetworking = true` dans `NSAppTransportSecurity` pour autoriser HTTP vers localhost/IP locales

### Flux utilisateur

1. Premier lancement → ecran de login avec URL par defaut
2. Tap sur "Configurer le serveur" → saisie de l'URL custom
3. "Tester la connexion" → validation
4. Sauvegarde → retour au login, l'app utilise la nouvelle URL
5. Les lancements suivants reutilisent l'URL sauvegardee

### Fichiers concernes

- `frontend/src/services/api.js` (lecture dynamique de l'URL, lignes 13-14 et 174)
- `frontend/.env.native` (URL par defaut, inchangee)
- `backend/src/server.js` (endpoint `/health`, ligne 59 — verifier CORS)
- `ios/App/App/Info.plist` (NSAppTransportSecurity pour HTTP local)
- Nouveau : `frontend/src/pages/ServerConfigScreen.jsx`
- Nouveau : `frontend/src/services/serverConfigService.js` (get/set URL dans Preferences)
- Nouveau : `frontend/src/services/__tests__/serverConfigService.test.js`
- Nouveau : `frontend/src/services/__tests__/api.serverConfig.test.js`
- Nouveau : `frontend/src/pages/__tests__/ServerConfigScreen.test.jsx`
- `frontend/src/App.jsx` (route pour la config serveur)
- Page de login (lien vers la config)

---

## 2. Transitions de pages (Impact: CRITIQUE - anciennement #1)

**Probleme** : Les pages swappent instantanement via React Router. Aucune animation de navigation.

**Objectif** : Reproduire le push/pop iOS (slide depuis la droite en avant, slide vers la droite en arriere).

- [ ] Creer un composant `AnimatedRoutes` wrappant les routes avec `framer-motion` ou `react-transition-group`
- [ ] Animation **push** : nouvelle page slide depuis la droite (300ms, ease-out)
- [ ] Animation **pop** : page actuelle slide vers la droite quand on revient en arriere
- [ ] Detecter la direction de navigation (push vs pop) via un contexte ou `useNavigationType()`
- [ ] Ajouter un header iOS-style avec bouton retour + titre anime (shrink/grow comme iOS)
- [ ] Optionnel : Support du swipe-back gesture (glisser depuis le bord gauche pour revenir)

**Fichiers concernes** :
- `frontend/src/App.jsx` (routes)
- `frontend/src/components/layout/Layout.jsx`
- `frontend/src/components/layout/PatientPortalLayout.jsx`
- Nouveau : `frontend/src/components/ios/AnimatedRoutes.jsx`

---

## 3. Bottom Sheets (remplacer les modals centres) (Impact: ELEVE)

**Probleme** : Tous les modals utilisent `<Modal centered>` de Bootstrap = dialog centre web. iOS utilise des bottom sheets.

**Objectif** : Creer un composant `BottomSheet` reutilisable qui slide depuis le bas, avec geste de dismiss (swipe down).

- [ ] Creer `BottomSheet.jsx` : slide-up depuis le bas, overlay semi-transparent
- [ ] Geste de dismiss : swipe vers le bas pour fermer (avec seuil de distance)
- [ ] "Drag handle" visuel en haut du sheet (petite barre grise)
- [ ] Snap points : mi-hauteur et pleine hauteur (optionnel)
- [ ] Migrer `ConfirmModal` vers bottom sheet sur mobile
- [ ] Migrer `CreatePatientModal` vers bottom sheet
- [ ] Migrer `LogMeasureModal` vers bottom sheet
- [ ] Migrer `CreateVisitModal` vers bottom sheet
- [ ] Migrer `CreateInvoiceModal` vers bottom sheet
- [ ] Conserver le modal centre sur desktop (> 768px)

**Fichiers concernes** :
- Nouveau : `frontend/src/components/ios/BottomSheet.jsx`
- `frontend/src/components/common/ConfirmModal.jsx`
- Tous les modals existants (migration progressive)

---

## 4. Toggle Switch iOS (Impact: ELEVE)

**Probleme** : Les checkboxes utilisent `Form.Check` de Bootstrap = checkbox web carree.

**Objectif** : Composant toggle switch iOS (capsule avec animation de slide).

- [ ] Creer `IOSToggle.jsx` : toggle capsule avec animation smooth
- [ ] Couleurs : vert (#34C759) actif, gris (#E9E9EB) inactif (couleurs iOS standard)
- [ ] Haptic feedback `selectionChanged()` au toggle
- [ ] Remplacer les checkboxes dans les parametres/preferences
- [ ] Remplacer dans les formulaires ou c'est pertinent (on/off, actif/inactif)

**Fichiers concernes** :
- Nouveau : `frontend/src/components/ios/IOSToggle.jsx`
- Pages de parametres, preferences, formulaires avec boolean

---

## 5. Action Sheets (Impact: MOYEN-ELEVE)

**Probleme** : Les actions destructives (supprimer, annuler) utilisent un modal de confirmation centre.

**Objectif** : Action sheet iOS qui slide depuis le bas avec bouton destructif en rouge.

- [ ] Creer `ActionSheet.jsx` : liste d'actions qui slide depuis le bas
- [ ] Bouton destructif en rouge (`#FF3B30` iOS)
- [ ] Bouton "Annuler" separe en bas (bold, separe visuellement)
- [ ] Backdrop tap pour dismiss
- [ ] Haptic feedback `notification('Warning')` pour les actions destructives
- [ ] Utiliser pour : suppression patient, suppression mesure, deconnexion, etc.

**Fichiers concernes** :
- Nouveau : `frontend/src/components/ios/ActionSheet.jsx`
- `frontend/src/components/common/ConfirmModal.jsx` (pour les cas destructifs)

---

## 6. Listes style iOS (Impact: MOYEN)

**Probleme** : Les listes mobiles utilisent des cards generiques. Pas le look "grouped table view" iOS.

**Objectif** : Style de liste iOS avec sections, separateurs subtils, fond gris clair.

- [ ] Creer des styles CSS `.ios-grouped-list` : fond gris clair `#F2F2F7`, sections blanches arrondies
- [ ] Separateurs entre les elements : ligne fine 0.5px en `#C6C6C8` avec indent a gauche
- [ ] Section headers : texte uppercase petit gris au-dessus des groupes
- [ ] Border-radius des sections : 10px (standard iOS)
- [ ] Chevron `>` a droite des elements cliquables
- [ ] Touch highlight : fond qui flash subtilement au tap
- [ ] Appliquer sur la liste des patients
- [ ] Appliquer sur la liste des mesures
- [ ] Appliquer sur les listes dans le portail patient

**Fichiers concernes** :
- `frontend/src/styles/MobileListCards.css` (refactor)
- Nouveau : `frontend/src/styles/ios-lists.css`
- Pages de listes (patients, mesures, factures, etc.)

---

## 7. Skeleton Loaders (Impact: MOYEN)

**Probleme** : Le chargement affiche un gros spinner Bootstrap tournant. Non natif.

**Objectif** : Skeleton screens qui miment la structure de la page pendant le chargement.

- [ ] Creer `SkeletonLoader.jsx` avec variantes : `text`, `avatar`, `card`, `list-item`
- [ ] Animation shimmer subtile (gradient qui glisse, comme iOS)
- [ ] Couleurs : gris clair pulse `#E5E5EA` -> `#F2F2F7`
- [ ] Remplacer le spinner central dans `App.jsx` Suspense fallback
- [ ] Ajouter des skeletons dans les pages de listes (patients, mesures)
- [ ] Ajouter des skeletons dans le dashboard

**Fichiers concernes** :
- Nouveau : `frontend/src/components/ios/SkeletonLoader.jsx`
- `frontend/src/App.jsx` (Suspense fallback)
- Pages avec chargement de donnees

---

## 8. Barre de recherche iOS (Impact: MOYEN)

**Probleme** : Pas de barre de recherche proeminente. Le search est cache dans des dropdowns.

**Objectif** : Barre de recherche iOS en haut des listes, avec bouton "Annuler".

- [ ] Creer `IOSSearchBar.jsx` : input arrondi avec icone loupe, placeholder, bouton Annuler
- [ ] Animation : le champ s'etend et le bouton "Annuler" apparait au focus
- [ ] Fond gris clair `#E5E5EA` pour l'input, coins arrondis 10px
- [ ] Fermeture du clavier au scroll (via touch event)
- [ ] Integrer dans la liste des patients
- [ ] Integrer dans la liste des mesures

**Fichiers concernes** :
- Nouveau : `frontend/src/components/ios/IOSSearchBar.jsx`
- Pages de listes

---

## 9. Segmented Controls iOS (Impact: MOYEN)

**Probleme** : Utilisation de tabs Bootstrap ou d'onglets custom. Pas de segmented control iOS.

**Objectif** : Composant segmented control avec fond unifie et curseur anime.

- [ ] Creer `SegmentedControl.jsx` : fond gris, curseur blanc qui slide entre les segments
- [ ] Animation du curseur : spring/ease-out 200ms
- [ ] Haptic feedback `selectionChanged()` au changement
- [ ] Utiliser pour les filtres (ex: Tous / Actifs / Archives)
- [ ] Utiliser dans `ResponsiveTabs.jsx` sur mobile a la place des tabs

**Fichiers concernes** :
- Nouveau : `frontend/src/components/ios/SegmentedControl.jsx`
- `frontend/src/components/common/ResponsiveTabs.jsx`

---

## 10. Header iOS avec Large Title (Impact: MOYEN)

**Probleme** : Les headers sont des navbars Bootstrap classiques, sans le pattern "Large Title" d'iOS.

**Objectif** : Header qui affiche un grand titre qui shrink en scrollant (comme iOS Settings, Mail, etc.).

- [ ] Creer `IOSHeader.jsx` : grand titre (34px, bold) qui se reduit en scrollant
- [ ] Le titre passe de "large" (sous la navbar) a "small" (dans la navbar) au scroll
- [ ] Bouton retour avec chevron `<` et label de la page precedente
- [ ] Integration avec le scroll container de la page
- [ ] Transition fluide du titre (interpolation de taille/position)

**Fichiers concernes** :
- Nouveau : `frontend/src/components/ios/IOSHeader.jsx`
- `frontend/src/components/layout/Header.jsx`
- Layouts

---

## 11. Spinner et indicateurs de chargement subtils (Impact: FAIBLE-MOYEN)

**Probleme** : Gros spinner Bootstrap avec texte "Loading page...".

**Objectif** : Indicateur de chargement subtil iOS (petit spinner gris, discret).

- [ ] Creer `IOSSpinner.jsx` : petit spinner circulaire gris, 20px, style UIActivityIndicator
- [ ] Utiliser dans les boutons pendant les requetes (spinner inline)
- [ ] Remplacer les `<Spinner>` Bootstrap existants
- [ ] Pull-to-refresh : utiliser le petit spinner iOS au lieu du gros

**Fichiers concernes** :
- Nouveau : `frontend/src/components/ios/IOSSpinner.jsx`
- Tous les endroits avec `<Spinner>` Bootstrap

---

## 12. Scroll et section headers sticky (Impact: FAIBLE)

**Probleme** : Pas de sticky headers dans les listes. Pas de rubber-banding custom.

**Objectif** : Headers de sections qui restent colles en haut pendant le scroll.

- [ ] Ajouter `position: sticky; top: 0` sur les headers de section dans les listes
- [ ] Fond semi-transparent avec blur pour les sticky headers
- [ ] Restauration de la position de scroll au retour sur une page (scroll restoration)
- [ ] Ameliorer le pull-to-refresh avec un feedback plus iOS (spinner qui descend avec le contenu)

**Fichiers concernes** :
- CSS des listes
- `frontend/src/hooks/usePullToRefresh.js`

---

## 13. Haptics supplementaires (Impact: FAIBLE)

**Probleme** : Haptics utilises seulement sur le tab bar. Beaucoup d'interactions sans retour haptique.

**Objectif** : Ajouter du feedback haptique la ou iOS le fait naturellement.

- [ ] Toggle switch : `selectionChanged()` au changement
- [ ] Bouton de soumission de formulaire : `notification('Success')` au succes
- [ ] Pull-to-refresh : `impact('Medium')` au declenchement
- [ ] Swipe actions : `impact('Light')` au seuil d'activation
- [ ] Suppression : `notification('Warning')` avant l'action sheet
- [ ] Long press : `impact('Heavy')` au declenchement

**Fichiers concernes** :
- `frontend/src/hooks/useHaptics.js` (deja existant)
- Composants de formulaires, listes, actions

---

## Ordre de priorite recommande

| Priorite | Section | Effort | Impact UX |
|----------|---------|--------|-----------|
| 1 | **Config URL serveur** (#1) | Moyen | Critique |
| 2 | **Transitions de pages** (#2) | Eleve | Critique |
| 3 | **Bottom Sheets** (#3) | Moyen | Eleve |
| 4 | **Toggle Switch** (#4) | Faible | Eleve |
| 5 | **Action Sheets** (#5) | Moyen | Moyen-Eleve |
| 6 | **Listes iOS** (#6) | Moyen | Moyen |
| 7 | **Skeleton Loaders** (#7) | Moyen | Moyen |
| 8 | **Segmented Controls** (#9) | Faible | Moyen |
| 9 | **Barre de recherche** (#8) | Moyen | Moyen |
| 10 | **Header Large Title** (#10) | Eleve | Moyen |
| 11 | **Spinner iOS** (#11) | Faible | Faible-Moyen |
| 12 | **Sticky headers** (#12) | Faible | Faible |
| 13 | **Haptics** (#13) | Faible | Faible |

---

## Notes techniques

- **Librarie recommandee** : `framer-motion` pour les animations (transitions, bottom sheets, gestures)
- **Approche** : Composants iOS dans `frontend/src/components/ios/` — reutilisables partout
- **Mobile only** : Ces changements s'appliquent uniquement sur mobile (`useIsMobile()`). Desktop garde le look actuel.
- **Progressive** : Chaque section est independante, on peut les implementer une par une
- **Pas de breaking changes** : Les composants existants restent fonctionnels, on les remplace progressivement
