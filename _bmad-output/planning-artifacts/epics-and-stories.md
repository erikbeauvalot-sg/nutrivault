# Epics & User Stories - NutriVault

**Auteur:** Product Manager (BMAD)
**Date:** 2026-01-21
**Basé sur:** PRD + Architecture Technique

## Vue d'Ensemble

Décomposition du MVP NutriVault en epics et user stories implementables. Structure basée sur les 4 parcours utilisateurs critiques définis dans le PRD.

## Epic 1: Authentification & Autorisation

**Objectif:** Système d'authentification sécurisé pour diététiciens
**Critères d'acceptation:** Login/logout fonctionnel, sessions persistantes, sécurité JWT

### Stories
**US-1.1:** En tant que diététicien, je veux pouvoir m'inscrire avec email/mot de passe pour créer mon compte
- Critères: Validation email, mot de passe fort, confirmation email
- Estimation: 3 jours
- Priorité: High

**US-1.2:** En tant que diététicien, je veux pouvoir me connecter avec mes identifiants pour accéder à mon espace
- Critères: JWT tokens, refresh token, session persistence
- Estimation: 2 jours
- Priorité: High

**US-1.3:** En tant que diététicien, je veux pouvoir me déconnecter sécurisément pour protéger mes données
- Critères: Token invalidation, nettoyage session
- Estimation: 1 jour
- Priorité: High

## Epic 2: Gestion des Patients (CRM)

**Objectif:** Système complet de gestion des dossiers patients
**Critères d'acceptation:** CRUD patients, recherche, profils détaillés

### Stories
**US-2.1:** En tant que diététicien, je veux pouvoir créer un nouveau dossier patient avec informations de base
- Critères: Formulaire création, validation données, sauvegarde DB
- Estimation: 3 jours
- Priorité: High

**US-2.2:** En tant que diététicien, je veux pouvoir consulter la liste de mes patients avec recherche et filtres
- Critères: Liste paginée, recherche nom/email, filtres actifs/inactifs
- Estimation: 2 jours
- Priorité: High

**US-2.3:** En tant que diététicien, je veux pouvoir modifier les informations d'un patient existant
- Critères: Formulaire édition, validation, mise à jour DB
- Estimation: 2 jours
- Priorité: High

**US-2.4:** En tant que diététicien, je veux pouvoir désactiver un dossier patient (soft delete) pour archivage
- Critères: Bouton désactivation, confirmation, filtrage des inactifs
- Estimation: 1 jour
- Priorité: Medium

**US-2.5:** En tant que diététicien, je veux pouvoir taguer mes patients pour segmentation (ex: sportifs, végétariens)
- Critères: Système de tags, interface ajout/suppression, filtrage par tags
- Estimation: 2 jours
- Priorité: Medium

## Epic 3: Agenda & Gestion des Visites

**Objectif:** Système d'agenda intégré pour gestion des consultations
**Critères d'acceptation:** Calendrier, planification visites, suivi statut

### Stories
**US-3.1:** En tant que diététicien, je veux voir mon agenda quotidien avec mes consultations planifiées
- Critères: Vue calendrier, liste rendez-vous, informations patient
- Estimation: 4 jours
- Priorité: High

**US-3.2:** En tant que diététicien, je veux pouvoir planifier une nouvelle consultation pour un patient
- Critères: Formulaire planification, sélection patient, date/heure/durée
- Estimation: 3 jours
- Priorité: High

**US-3.3:** En tant que diététicien, je veux pouvoir modifier ou annuler une consultation existante
- Critères: Modification date/heure, annulation avec motif, notification
- Estimation: 2 jours
- Priorité: High

**US-3.4:** En tant que diététicien, je veux pouvoir marquer une consultation comme terminée avec notes
- Critères: Bouton "Terminer", formulaire notes, mesures, sauvegarde
- Estimation: 2 jours
- Priorité: High

**US-3.5:** En tant que diététicien, je veux pouvoir reprogrammer une consultation à une date ultérieure
- Critères: Sélection nouvelle date, mise à jour automatique
- Estimation: 1 jour
- Priorité: Medium

## Epic 4: Double Dashboard (Ma Journée / Mon Cabinet)

**Objectif:** Interface adaptative avec deux modes d'utilisation
**Critères d'acceptation:** Bascule fluide, optimisation mobile, actions contextuelles

### Stories
**US-4.1:** En tant que diététicien, je veux avoir un dashboard "Ma Journée" optimisé pour consultation
- Critères: Vue mobile-first, patient actuel, notes rapides, accès mesures
- Estimation: 3 jours
- Priorité: High

**US-4.2:** En tant que diététicien, je veux pouvoir basculer vers le dashboard "Mon Cabinet" pour administration
- Critères: Bouton bascule, vue desktop optimisée, métriques globales
- Estimation: 2 jours
- Priorité: High

**US-4.3:** En tant que diététicien, je veux voir les métriques clés sur mon dashboard (patients actifs, RDV aujourd'hui)
- Critères: Compteurs temps réel, graphiques simples, KPIs pertinents
- Estimation: 2 jours
- Priorité: High

**US-4.4:** En tant que diététicien, je veux avoir des raccourcis rapides pour les actions fréquentes
- Critères: Boutons "Nouveau patient", "Planifier RDV", "Voir agenda"
- Estimation: 1 jour
- Priorité: Medium

## Epic 5: Facturation & Paiements

**Objectif:** Système de facturation intégré avec génération PDF
**Critères d'acceptation:** Génération automatique, PDF conformes, suivi paiements

### Stories
**US-5.1:** En tant que diététicien, je veux que les factures se génèrent automatiquement après chaque consultation
- Critères: Trigger post-consultation, calcul automatique, sauvegarde PDF
- Estimation: 4 jours
- Priorité: High

**US-5.2:** En tant que diététicien, je veux pouvoir consulter la liste de mes factures avec statuts
- Critères: Liste filtrable, statuts (Brouillon, Envoyée, Payée, En retard)
- Estimation: 2 jours
- Priorité: High

**US-5.3:** En tant que diététicien, je veux pouvoir envoyer une facture par email au patient
- Critères: Bouton envoi, template email, pièce jointe PDF
- Estimation: 3 jours
- Priorité: High

**US-5.4:** En tant que diététicien, je veux pouvoir marquer une facture comme payée manuellement
- Critères: Bouton "Marquer payée", date paiement, mise à jour statut
- Estimation: 1 jour
- Priorité: Medium

**US-5.5:** En tant que diététicien, je veux pouvoir générer un export comptable de mes factures
- Critères: Export CSV, format standard, période sélectionnable
- Estimation: 2 jours
- Priorité: Medium

## Epic 6: Bibliothèque de Contenu

**Objectif:** Gestionnaire de ressources éducatives pour fidélisation
**Critères d'acceptation:** Upload, organisation, envois groupés

### Stories
**US-6.1:** En tant que diététicien, je veux pouvoir uploader des documents (PDF, images) dans ma bibliothèque
- Critères: Drag & drop, validation format/taille, stockage sécurisé
- Estimation: 3 jours
- Priorité: High

**US-6.2:** En tant que diététicien, je veux organiser mes ressources avec tags et catégories
- Critères: Système de tags, recherche, organisation par dossiers
- Estimation: 2 jours
- Priorité: High

**US-6.3:** En tant que diététicien, je veux pouvoir envoyer une ressource à un patient spécifique
- Critères: Sélection ressource, sélection patient, envoi email
- Estimation: 2 jours
- Priorité: High

**US-6.4:** En tant que diététicien, je veux pouvoir envoyer une ressource à un groupe de patients (par tags)
- Critères: Sélection multiple patients, envoi groupé, personnalisation
- Estimation: 3 jours
- Priorité: High

**US-6.5:** En tant que diététicien, je veux accéder à une bibliothèque de ressources pré-remplies
- Critères: Contenus "starter pack", recettes génériques, conseils diététiques
- Estimation: 2 jours
- Priorité: Medium

## Epic 7: Actions Rapides & Workflow Accéléré

**Objectif:** Optimisation des workflows pour efficacité maximale
**Critères d'acceptation:** Réduction friction, actions en <3 clics

### Stories
**US-7.1:** En tant que diététicien, je veux créer un "Patient Flash" avec minimum d'informations
- Critères: Formulaire simplifié, création instantanée, complétion ultérieure
- Estimation: 2 jours
- Priorité: High

**US-7.2:** En tant que diététicien, je veux utiliser "Terminer & Facturer" pour clôturer une consultation
- Critères: Bouton unique, génération facture automatique, envoi email
- Estimation: 3 jours
- Priorité: High

**US-7.3:** En tant que diététicien, je veux traiter plusieurs tâches administratives en batch
- Critères: Sélection multiple, actions groupées (envoi factures, relances)
- Estimation: 4 jours
- Priorité: High

**US-7.4:** En tant que diététicien, je veux recevoir des alertes pour les actions urgentes
- Critères: Notifications paiements en retard, RDV sans notes, patients à relancer
- Estimation: 2 jours
- Priorité: Medium

## Epic 8: Sécurité & Conformité

**Objectif:** Mise en place des mesures de sécurité et conformité RGPD/HDS
**Critères d'acceptation:** Chiffrement, audit trail, protection données

### Stories
**US-8.1:** En tant que diététicien, je veux que mes données soient chiffrées en transit et au repos
- Critères: HTTPS obligatoire, chiffrement DB, clés sécurisées
- Estimation: 3 jours
- Priorité: High

**US-8.2:** En tant que diététicien, je veux que tous mes accès aux dossiers patients soient tracés
- Critères: Logs d'audit, timestamp, identification utilisateur
- Estimation: 2 jours
- Priorité: High

**US-8.3:** En tant que diététicien, je veux pouvoir exporter les données d'un patient (RGPD)
- Critères: Bouton export, format JSON/CSV, données complètes
- Estimation: 2 jours
- Priorité: High

**US-8.4:** En tant que diététicien, je veux pouvoir supprimer définitivement un dossier patient
- Critères: Hard delete avec confirmation, logs de suppression
- Estimation: 1 jour
- Priorité: Medium

## Epic 9: Interface Mobile & Responsive

**Objectif:** Optimisation complète pour utilisation mobile
**Critères d'acceptation:** Performance <1s, UX native, offline limité

### Stories
**US-9.1:** En tant que diététicien, je veux une interface qui s'adapte parfaitement à mon smartphone
- Critères: Responsive design, touch optimisé, navigation mobile
- Estimation: 5 jours
- Priorité: High

**US-9.2:** En tant que diététicien, je veux que l'application charge en moins d'1 seconde sur mobile
- Critères: Optimisations bundle, lazy loading, caching agressif
- Estimation: 3 jours
- Priorité: High

**US-9.3:** En tant que diététicien, je veux pouvoir utiliser l'app en mode dégradé (offline limité)
- Critères: Service worker, cache offline, synchronisation reprise
- Estimation: 4 jours
- Priorité: Medium

## Epic 10: Internationalisation & Accessibilité

**Objectif:** Support français natif et accessibilité WCAG
**Critères d'acceptation:** Français par défaut, conformité accessibilité

### Stories
**US-10.1:** En tant que diététicien français, je veux une interface entièrement en français
- Critères: Traduction complète, locale française, formats dates/devises
- Estimation: 3 jours
- Priorité: High

**US-10.2:** En tant qu'utilisateur, je veux pouvoir naviguer l'app avec un lecteur d'écran
- Critères: Labels ARIA, structure sémantique, conformité WCAG AA
- Estimation: 4 jours
- Priorité: High

**US-10.3:** En tant qu'utilisateur, je veux pouvoir naviguer au clavier uniquement
- Critères: Focus visible, ordre tabulation logique, raccourcis clavier
- Estimation: 2 jours
- Priorité: Medium

---

## Plan de Release - MVP (Sprint 1-4)

### Sprint 1: Fondation (2 semaines)
**Focus:** Authentification + Patients de base
- US-1.1, US-1.2, US-1.3 (Authentification)
- US-2.1, US-2.2, US-2.3 (CRUD Patients)
- US-4.1, US-4.2 (Dashboard de base)

**Objectif:** Premier prototype fonctionnel avec login et gestion patients

### Sprint 2: Agenda & Visites (2 semaines)
**Focus:** Planification et suivi consultations
- US-3.1, US-3.2, US-3.3, US-3.4 (Agenda complet)
- US-4.3, US-4.4 (Dashboard enrichi)

**Objectif:** Système de RDV opérationnel

### Sprint 3: Facturation & Contenu (2 semaines)
**Focus:** Monétisation et fidélisation
- US-5.1, US-5.2, US-5.3 (Facturation de base)
- US-6.1, US-6.2, US-6.3 (Bibliothèque contenu)

**Objectif:** Produit "revenue-ready"

### Sprint 4: Optimisation & Polish (2 semaines)
**Focus:** Performance et expérience utilisateur
- US-7.1, US-7.2, US-7.3 (Actions rapides)
- US-9.1, US-9.2 (Mobile optimization)
- US-10.1, US-10.2 (i18n + Accessibilité)

**Objectif:** MVP production-ready

## Métriques de Succès

### Definition of Ready (DoR)
- User story détaillée avec critères d'acceptation
- Estimation validée par équipe
- Dépendances identifiées et résolues
- Tests d'acceptation définis

### Definition of Done (DoD)
- Code review passé
- Tests unitaires + intégration OK
- Tests E2E fonctionnels
- Documentation mise à jour
- Déployé en staging
- Validation PO

### KPIs Clés
- **Velocity:** 20-25 story points par sprint
- **Quality:** 0 bug en production
- **Performance:** <1s loading mobile
- **Adoption:** 80% features utilisés

---

*Cette décomposition transforme la vision produit en livrables concrets et mesurables.*