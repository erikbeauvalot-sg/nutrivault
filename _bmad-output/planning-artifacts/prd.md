stepsCompleted: ['step-01-init', 'step-02-discovery', 'step-03-success', 'step-04-journeys', 'step-05-domain', 'step-06-innovation', 'step-07-project-type', 'step-08-scoping']
inputDocuments: ['_bmad-output/analysis/brainstorming-session-2026-01-21.md', 'docs/project-overview.md', 'docs/source-tree-analysis.md', 'docs/integration-architecture.md']
workflowType: 'prd'
briefCount: 0
researchCount: 0
brainstormingCount: 1
projectDocsCount: 6
classification:
  projectType: saas_b2b
  domain: healthcare
  complexity: medium
  projectContext: brownfield
---

# Product Requirements Document - nutrivault

**Author:** Erik
**Date:** 2026-01-21

## Success Criteria

### User Success
- **Gain de Temps Admin :** Réduction significative (>30%) du temps passé sur la facturation et les relances grâce aux actions groupées.
- **Sérénité en Consultation :** Élimination de la charge mentale administrative pendant le soin grâce au mode "Ma Journée".
- **Mobilité Totale :** Capacité à gérer agenda et urgences depuis un smartphone sans friction (Web Mobile Responsive).

### Business Success
- **Adoption de la Différenciation :** >80% des utilisateurs actifs utilisent la Bibliothèque de Contenu pour fidéliser leurs patients.
- **Réactivation Patient :** Augmentation du taux de retour des patients chez le diététicien grâce aux relances automatiques empathiques.

### Technical Success
- **Performance Mobile :** Interface fluide et réactive sur réseaux mobiles (3G/4G).
- **Internationalisation (i18n) :** Architecture supportant le Français comme langue native par défaut (et unique pour le MVP), mais prête pour l'extension.
- **Sécurité :** Architecture préparée pour la conformité HDS (Données de santé).

### Measurable Outcomes
- Temps de génération d'une facture : < 3 clics.
- Temps de chargement Dashboard Mobile : < 1 seconde.

## Product Scope

### MVP - Minimum Viable Product
- **Langue & Localisation :** Français par défaut (Interface, Emails, Documents, Dates, Devises).
- **Core Features :** Gestion Dossier Patient, Agenda.
- **UX Diététicien :** Dashboard Contextuel (Vue Soin / Vue Admin).
- **Accessibilité :** Full Responsive Web Design (Desktop + Mobile).
- **Contenu :** Gestionnaire de Ressources perso + Envoi Email manuel.
- **Admin :** Facturation PDF, Relance Email Empathique, Détection simple du risque de décrochage.

### Growth Features (Post-MVP)
- Marketplace Communautaire (Partage de ressources).
- Paiement en ligne intégré (Stripe/Paypal).
- Portail Patient dédié.
- Support multi-langues complet.

### Vision (Future)
- Assistant IA pour la rédaction de bilans et suggestions nutritionnelles.
- Ecosysteme connecté (IoT santé).

## User Journeys

**1. Parcours "Matin Express" (Opérationnel/Mobile)**
- **Persona:** Thomas (Diététicien libéral)
- **Contexte:** Lundi matin dans les transports.
- **Histoire:** Thomas consulte NutriVault sur son mobile. Le Dashboard "Ma Journée" s'affiche immédiatement. Il voit son planning optimisé et les notes clés pour son premier patient de 9h00 (Mme Durand, Allergie Arachide).
- **Valeur:** Accès immédiat à l'information critique sans pollution administrative.

**2. Parcours "Flash Patient" (Nouvelle Acquisition Rapide)**
- **Persona:** Thomas (Au cabinet)
- **Contexte:** Un nouveau patient arrive pour une consultation immédiate.
- **Histoire:** Thomas utilise l'action "+ Flash Patient". Il saisit uniquement Nom/Prénom/Email. Le dossier est actif. À la fin de la séance, un clic sur "Terminer & Facturer" enregistre la visite, génère la facture et l'envoie par email au patient.
- **Valeur:** Zéro friction administrative lors de l'accueil, monétisation immédiate.

**3. Parcours "Fin de Journée Admin" (Gestion Batch)**
- **Persona:** Thomas (Bureau, fin de journée)
- **Contexte:** Traitement administratif de la journée.
- **Histoire:** Bascule sur la vue "Mon Cabinet". Visualisation agrégée des tâches : 3 factures en brouillon, 2 relances paiements. Un clic sur "Tout Traiter" exécute les actions. Une alerte "Risque Décrochage" pour Julie est visible : validation de l'email de réactivation en 1 clic.
- **Valeur:** Gain de temps massif par traitement par lot, sérénité de fin de journée.

**4. Parcours "Content Creator" (Fidélisation)**
- **Persona:** Thomas (Temps calme)
- **Contexte:** Préparation de contenu pour fidéliser sa base.
- **Histoire:** Upload d'une fiche recette PDF. Sélection du tag "Sportifs". Envoi groupé de la ressource à tous les patients taggués avec un message personnalisé.
- **Valeur:** Transformation du diététicien en coach proactif, augmentation de la valeur perçue.

### Journey Requirements Summary
- **Interface Mobile-First:** Dashboard "Consultation" optimisé pour smartphone.
- **Quick Actions:** Workflow de création "Flash" (Patient + Visite + Facture).
- **Batch Processing:** Moteur de traitement par lot pour les tâches administratives.
- **Segmentation:** Système de tags pour ciblage des envois de contenu.
- **Automation:** Déclencheurs automatiques (Facture post-visite, Alerte Churn).

## Domain-Specific Requirements

### Compliance & Regulatory
- **RGPD (GDPR):** Conformité native obligatoire (Droit d'accès, rectification, suppression, export des données patient).
- **HDS (Hébergement Données de Santé):** Architecture conçue pour être déployée sur un hébergeur certifié HDS (AWS Healthcare / OVH HDS), même si le prototype initial utilise une infrastructure standard.
- **Traceability:** Logs d'accès aux dossiers patients (Qui a vu quoi et quand) pour auditabilité.

### Technical Constraints (Health Data)
- **Encryption:**
    - Chiffrement en transit (HTTPS/TLS 1.2+ obligatoire).
    - Chiffrement au repos (Encryption at rest) pour la base de données.
- **Access Control:** Authentification forte pour les praticiens. Ségrégation stricte des données (Multi-tenancy étanche : un diététicien ne voit jamais les patients d'un autre).
- **Backup:** Sauvegardes quotidiennes chiffrées avec rétention 30 jours (Perte de données dossier patient inacceptable).

### Integration Requirements
- **Export Comptable:** Génération d'un export CSV standard des factures émises (Date, Montant, Patient, Statut) pour import dans les logiciels de comptabilité tiers.
- **Format Facture:** PDFs conformes aux normes fiscales (Mentions légales obligatoires).

### Risk Mitigations
- **Perte d'accès pendant consultation:** Architecture Web App standard (pas de Offline complexe en MVP), mitigée par une infrastructure haute disponibilité (Load Balancer, redondance DB).
- **Fuite de données:** Minimisation des données collectées (Data Minimization). Pas de stockage de données bancaires (délégué à Stripe/Paypal dans le futur).

## Innovation & Novel Patterns

### Detected Innovation Areas
- **"Content Drip" Santé:** Application des concepts de Marketing Automation (Séquences Email) au suivi patient. NutriVault transforme le plan alimentaire statique en accompagnement dynamique via des envois programmés.
- **L'Admin Empathique:** Fusion des flux administratifs (Facturation/Relance) et relationnels (Prise de nouvelles) pour réduire la friction de paiement et augmenter la rétention.

### Market Context & Competitive Landscape
- Les logiciels existants (MonDocteur, etc.) sont focalisés sur la prise de RDV et le dossier médical.
- NutriVault se positionne sur l'engagement et la fidélisation post-consultation, comblant le vide entre deux RDV.

### Validation Approach
- **Métriques d'Engagement:** Taux d'ouverture des emails "Content Drip". Taux de réponse aux relances "Empathiques" vs relances classiques.

### Risk Mitigation
- **Risque de Contenu Vide:** Si le diététicien ne crée pas de contenu, la valeur perçue baisse.
- **Mitigation:** Fournir une bibliothèque de "Starter Packs" (Templates de recettes/conseils génériques) dès l'onboarding.

## SaaS B2B Specific Requirements

### Project-Type Overview
- **Type:** B2B Vertical SaaS (Santé/Bien-être).
- **Architecture:** Single-Codebase, Multi-Tenant Logic (Isolation logique par ).

### Technical Architecture Considerations
- **Tenant Model:** Isolation stricte au niveau applicatif (Chaque requête SQL filtre par ). Pas de partage de données entre praticiens pour le MVP (Cabinet individuel).
- **Authentication:** Authentification standard (Email/Password) avec JWT. Session persistante sécurisée.

### Implementation Considerations
- **Permission Model (RBAC):** Rôle unique "Owner" pour le MVP. Le diététicien a tous les droits sur son compte. Pas de rôle Secrétaire/Collaborateur.
- **Subscription Model:** Préparation de la base de données pour gérer un statut "Abonnement Actif/Inactif", mais logique métier simplifiée à une offre unique "Premium" pour le lancement.
- **Integrations:** Aucune intégration tierce (Google Calendar, Doctolib) pour le MVP. L'agenda est interne et maître.

## Project Scoping & Phased Development

### MVP Strategy & Philosophy
- **MVP Approach:** "Revenue & Efficiency MVP" — Le produit doit immédiatement remplacer les outils actuels (Excel/Agenda papier) en apportant un gain de temps quantifiable et une valeur ajoutée de contenu.
- **Resource Strategy:** Équipe réduite (Fullstack JS) focalisée sur l'UX mobile et la réactivité.

### MVP Feature Set (Phase 1)
- **Core User Journeys:** "Matin Express", "Flash Patient", "Fin de Journée Admin".
- **Must-Have Capabilities:**
    - Gestion CRM Patient & Agenda propriétaire.
    - Dashboard UX "Double Vue" (Ma Journée / Mon Cabinet).
    - Web Mobile Responsive (Indispensable).
    - Gestionnaire de Contenu Personnel (Upload + Envoi).
    - Facturation PDF simple.

### Post-MVP Features (Roadmap)

**Phase 2: Growth (Automatisation & Rétention)**
- Algorithme de détection de risque de décrochage (Churn).
- Séquençage automatique des envois de contenu (Content Drip).
- Paiement en ligne intégré (Stripe).

**Phase 3: Expansion (Effet de Réseau)**
- Marketplace communautaire de ressources (Partage entre pros).
- Portail Patient dédié (Web App).

### Risk Mitigation Strategy
- **Technical Risks (Mobile Performance):** Adoption précoce de stratégies de mise en cache agressives et optimisation payload API pour garantir <1s de chargement sur réseau mobile.
- **Market Risks (Empty State):** Risque de "coquille vide" sur la bibliothèque de contenu. Mitigation : Pré-charger 10-20 contenus de qualité "offerts" (Recettes/Fiches) à l'inscription.
