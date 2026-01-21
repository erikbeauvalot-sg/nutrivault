# Project Overview

## Executive Summary
NutriVault is a nutrition and healthcare management system designed to manage patient data, dietary requirements, and potentially billing/visits. It consists of a React-based frontend and a Node.js/Express backend, using a SQLite database managed by Sequelize.

## Technology Stack

| Category | Technology | Description |
|----------|------------|-------------|
| **Frontend** | React | UI Library |
| | Vite | Build tool and dev server |
| | Bootstrap | Styling framework |
| **Backend** | Node.js | Runtime environment |
| | Express | Web framework |
| | Sequelize | ORM for database management |
| **Database** | SQLite | Relational database (likely for dev/poc) |
| **Language** | JavaScript/ES6+ | Primary programming language |

## Architecture Type
**Multi-part Application**: The project is split into distinct `frontend` and `backend` directories, typical of a modern SPA (Single Page Application) architecture.

## Repository Structure
- **Monorepo-style setup**: Root directory contains shared config/models, while specific application logic resides in `frontend` and `backend` subdirectories.

## Documentation Links
- [Source Tree Analysis](./source-tree-analysis.md)
- [Development Guide](./development-guide.md)
- [Architecture](./architecture.md) _(To be generated)_
- [API Contracts](./api-contracts-backend.md) _(To be generated)_
