# Integration Architecture

## Overview
NutriVault follows a classic Client-Server architecture.

```mermaid
graph LR
    A[Frontend (React)] -- HTTP/JSON --> B[Backend API (Express)]
    B -- SQL Queries --> C[Database (SQLite)]
```

## Integration Points

### Frontend to Backend
- **Protocol**: HTTP/HTTPS
- **Format**: JSON
- **Authentication**: Likely Token-based (JWT) based on `backend/src/auth` and `RefreshToken` model.
- **Key Endpoints**: Defined in `backend/src/routes`.

### Shared Resources
- **Database Models**: The `models/` directory at the root suggests that database models might be shared or at least centrally managed, primarily used by the Backend.

## Data Flow
1. User interacts with Frontend UI.
2. Frontend `services/` make async HTTP requests to Backend.
3. Backend `controllers/` process requests, utilizing `services/` for business logic.
4. `models/` are used to interact with the SQLite database.
5. Response is sent back to Frontend.
