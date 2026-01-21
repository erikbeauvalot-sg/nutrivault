# Architecture Technique - NutriVault

**Auteur:** Architecte IA (BMAD)
**Date:** 2026-01-21
**Basé sur:** PRD NutriVault v1.0

## Vue d'Ensemble

NutriVault est une plateforme SaaS B2B verticale pour diététiciens libéraux, conçue pour optimiser la gestion administrative et renforcer l'engagement patient. L'architecture suit les principes du PRD : simplicité, performance mobile, et conformité santé.

## Architecture Générale

### Pattern Architectural
- **Single-Codebase Multi-Tenant** : Base de code unique avec isolation logique par praticien
- **Web-First Mobile-Responsive** : Interface adaptative priorisant l'expérience mobile
- **API-First** : Architecture orientée API pour évolutivité future

### Principes Fondamentaux
- **Sécurité First** : Chiffrement, RBAC, auditabilité
- **Performance Mobile** : <1s de chargement, optimisation réseau
- **Conformité Santé** : Préparation HDS, RGPD natif
- **Évolutivité** : Architecture modulaire pour growth features

## Architecture Technique Détaillée

### 1. Architecture Frontend

#### Framework & Technologies
```
React 18 + Vite
├── React Router v6 (SPA routing)
├── React Bootstrap (UI components)
├── React i18next (Internationalisation)
├── Axios (API client)
├── React Hook Form + Yup (Form management)
├── Chart.js (Dashboard analytics)
└── PWA capabilities (Future)
```

#### Structure d'Application
```
src/
├── components/          # Composants réutilisables
│   ├── common/         # UI génériques (Button, Modal, etc.)
│   ├── forms/          # Composants formulaire
│   ├── layout/         # Layout et navigation
│   └── domain/         # Composants métier (Patient, Visit, etc.)
├── pages/              # Pages principales
├── services/           # API clients et logique métier
├── hooks/              # Custom React hooks
├── contexts/           # React contexts (Auth, Theme, etc.)
├── utils/              # Utilitaires (formatters, validators)
├── locales/            # Traductions i18n
└── types/              # TypeScript definitions
```

#### Patterns UX Critiques
- **Double Dashboard** : Vue "Ma Journée" vs "Mon Cabinet"
- **Mobile-First** : Interface optimisée pour smartphone
- **Quick Actions** : Workflows accélérés (Flash Patient)
- **Batch Processing** : Actions groupées pour administration

### 2. Architecture Backend

#### Framework & Technologies
```
Node.js 18+ LTS + Express.js
├── Sequelize ORM (Database abstraction)
├── JWT + bcrypt (Authentication)
├── Multer (File uploads)
├── Nodemailer (Email sending)
├── PDF-lib (Document generation)
├── Helmet + CORS (Security)
└── Winston (Logging)
```

#### Structure d'API
```
API Routes: /api/v1/
├── /auth/*           # Authentification
├── /users/*          # Gestion utilisateurs
├── /patients/*       # Gestion patients
├── /visits/*         # Gestion visites
├── /billing/*        # Facturation
├── /documents/*      # Gestion documents
├── /content/*        # Bibliothèque contenu
└── /admin/*          # Administration
```

#### Modèle de Données (Entités Principales)

```sql
-- Utilisateurs (Multi-tenant)
Users {
  id, email, password_hash, role_id,
  first_name, last_name, is_active,
  created_at, updated_at,
  tenant_id (Future multi-tenant)
}

-- Patients
Patients {
  id, user_id (dietitian),
  first_name, last_name, email, phone,
  date_of_birth, medical_record_number,
  address, emergency_contact,
  dietary_restrictions, medical_conditions,
  tags[], is_active, created_at, updated_at
}

-- Visites
Visits {
  id, patient_id, dietitian_id,
  scheduled_date, duration, status,
  notes, measurements{}, next_visit_date,
  created_at, updated_at
}

-- Facturation
Invoices {
  id, visit_id, patient_id,
  amount, status, due_date,
  pdf_path, sent_at, paid_at,
  created_at, updated_at
}

-- Contenu (Bibliothèque)
Content {
  id, user_id, title, type,
  file_path, tags[], is_public,
  created_at, updated_at
}
```

### 3. Architecture Base de Données

#### Choix Technologique
- **Développement** : SQLite (Simplicité, zéro config)
- **Production** : PostgreSQL (Performance, JSON, extensions)
- **Migration Path** : Scripts automatisés pour transition

#### Stratégie Multi-Tenant
- **Logique Isolation** : Filtrage par `user_id` (practitioner)
- **Sécurité** : Row Level Security (PostgreSQL)
- **Performance** : Indexes optimisés pour queries fréquentes
- **Évolutivité** : Préparation partitionnement futur

#### Optimisations Performance
- **Indexes** : user_id, dates, status, tags
- **Caching** : Redis (Future) pour sessions et lookups fréquents
- **Pagination** : Cursor-based pour grandes listes
- **Archivage** : Soft deletes avec cleanup automatique

### 4. Architecture Sécurité

#### Authentification & Autorisation
```
JWT Strategy:
├── Access Token (15min) : API access
├── Refresh Token (7j) : Token renewal
└── Session Storage : Client-side persistence

RBAC Model:
├── Admin : Full access
├── Dietitian : Patients, visits, billing, content
├── Assistant : Read + basic CRUD (Future)
└── Viewer : Read-only (Future)
```

#### Conformité Santé
- **Chiffrement** : TLS 1.3, AES-256 at rest
- **Audit Trail** : Tous les accès loggés (Qui, Quoi, Quand)
- **Data Minimization** : Collecte minimale obligatoire
- **HDS Ready** : Architecture compatible OVH Healthcare/AWS

#### Sécurité Applicative
- **Input Validation** : Sanitization + schema validation
- **Rate Limiting** : API protection contre abus
- **CORS** : Domaines autorisés configurables
- **Headers Security** : Helmet.js configuration complète

### 5. Architecture Déploiement

#### Infrastructure
```
Development:
├── Local : SQLite + Node.js dev server
└── Staging : PostgreSQL + Docker

Production:
├── App : Node.js (PM2 clustering)
├── DB : PostgreSQL (Managed)
├── Storage : Object storage (S3 compatible)
├── CDN : Assets statiques
└── Monitoring : Health checks + logs
```

#### CI/CD Pipeline
```
GitHub Actions:
├── Tests : Jest + Playwright E2E
├── Build : Docker image
├── Security : SAST + dependency scanning
├── Deploy : Blue/green strategy
└── Rollback : Automated rollback on failure
```

#### Monitoring & Observabilité
- **Application** : Response times, error rates, user metrics
- **Infrastructure** : CPU, memory, disk, network
- **Business** : User adoption, feature usage, conversion rates
- **Alerting** : SLA breaches, security incidents

### 6. Architecture d'Intégration

#### APIs Externes (Future)
- **Paiement** : Stripe/PayPal pour facturation en ligne
- **Email** : SendGrid/Mailgun pour communications
- **SMS** : Twilio pour rappels (Future)
- **Calendrier** : Google Calendar sync (Future)

#### Webhooks & Automation
- **Facturation** : Auto-génération post-consultation
- **Relances** : Emails automatiques pour paiements en retard
- **Content Drip** : Envois programmés de contenu éducatif
- **Churn Detection** : Alertes proactives sur risque décrochage

### 7. Architecture de Performance

#### Optimisations Frontend
- **Code Splitting** : Lazy loading des routes
- **Asset Optimization** : Compression, minification
- **Caching Strategy** : Service Worker + HTTP caching
- **Bundle Analysis** : Monitoring taille bundle

#### Optimisations Backend
- **Database** : Connection pooling, query optimization
- **API** : Response compression, ETag caching
- **Files** : CDN pour uploads, thumbnail generation
- **Background Jobs** : Queue system pour tâches lourdes

#### Métriques Cibles
- **Mobile Loading** : <1s (3G/4G)
- **API Response** : <200ms (médiane)
- **Bundle Size** : <500KB gzipped
- **Lighthouse Score** : >90/100

### 8. Architecture d'Évolutivité

#### Scaling Strategy
- **Vertical** : Ressources serveur augmentées
- **Horizontal** : Load balancer + multiple instances
- **Database** : Read replicas + sharding preparation
- **Storage** : Object storage scaling

#### Feature Flags
- **Implementation** : Configuration-driven feature activation
- **Testing** : A/B testing capabilities
- **Rollback** : Instantané via configuration
- **Gradual Rollout** : Pourcentage-based deployment

#### Microservices Preparation
- **Modular Architecture** : Services indépendants
- **API Contracts** : Interfaces clairement définies
- **Event-Driven** : Préparation architecture events
- **Container Ready** : Docker + orchestration

## Décisions Architecturales Clés

### 1. Choix Technologiques
- **React/Vite** : Performance et DX optimales pour mobile-first
- **Node.js/Express** : Fullstack JS, communauté santé
- **SQLite→PostgreSQL** : Simplicité dev → robustesse prod

### 2. Patterns de Conception
- **Repository Pattern** : Abstraction couche données
- **Service Layer** : Logique métier centralisée
- **Middleware Chain** : Auth, validation, logging
- **Observer Pattern** : Events système (audit, notifications)

### 3. Stratégies de Résilience
- **Graceful Degradation** : Fonctionnement offline limité
- **Circuit Breaker** : Protection contre pannes externes
- **Retry Logic** : Réseau mobile unreliable
- **Data Backup** : Stratégie 3-2-1 chiffrée

### 4. Conformité & Régulation
- **RGPD by Design** : Privacy-first architecture
- **HDS Compatible** : Hébergement certifié obligatoire
- **Audit Trail** : Traçabilité complète des accès
- **Data Portability** : Export patient data facilité

## Risques & Mitigations

### Risques Techniques
- **Performance Mobile** : Optimisations agressives + monitoring continu
- **Sécurité Données Santé** : Chiffrement end-to-end + audits réguliers
- **Évolutivité** : Architecture modulaire + feature flags

### Risques Business
- **Adoption** : UX mobile-first + quick wins immédiats
- **Concurrence** : Différenciation par contenu + automation
- **Régulation** : Conformité native + préparation évolutive

### Plan de Contingence
- **Incident Response** : Runbook détaillé + équipe 24/7
- **Data Recovery** : Backups chiffrés + tests réguliers
- **Communication** : Templates crise + transparence

---

*Cette architecture constitue la base technique solide pour NutriVault, alignée sur les objectifs du PRD et préparée pour l'évolutivité future.*