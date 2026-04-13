# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Commands

```bash
# Development server (http://localhost:4200)
npm start

# Production build (output: dist/pointage-agents/)
npm run build

# Run tests (Karma + Jasmine)
npm test

# Watch mode build
npm run watch

# Docker deployment
docker-compose up
```

No dedicated lint script is configured; TypeScript strict mode (`tsconfig.json`) acts as the primary static check.

## Architecture Overview

**PointIC** is an Angular 19 enterprise admin dashboard for workforce management (attendance/pointage, HR, scheduling, stock, absences) with French localization (fr-FR) and real-time WebSocket updates.

### Auth & Routing Flow

All routes are lazy-loaded via `loadComponent()`. Public routes (`/home`, `/code-pin`, `/forgot-password`, `/reset-password`, `/super-admin-login`) are open. Protected routes (`/admin/**`, `/change-password`) require `AuthGuard`.

`AuthGuard` checks for a valid JWT in `localStorage`. `AuthInterceptor` (`src/app/auth.interceptor.ts`) automatically attaches the JWT to every outgoing HTTP request and handles token expiry.

### Admin Shell

`AdminComponent` (`src/app/adminPage/admin/`) is the protected shell: it renders a `HeaderComponent`, `SidebarComponent`, and a `<router-outlet>` for 25+ lazy-loaded child feature modules (employees, planning, stock, absences, etc.).

Sidebar items are shown/hidden based on `ModulesAutorises` permissions decoded from the JWT via `LoginService`. Permissions are propagated reactively via `BehaviorSubject`.

### Service Layer

Business logic lives in `src/app/services/` (36+ services). Key ones:

- `login.service.ts` — JWT decode, role/permission extraction, stored in `localStorage`
- `auth.interceptor.ts` — HTTP JWT injection
- `websocket.service.ts` — STOMP over SockJS (`ws://localhost:8080/ws`), topics: `/topic/annulationRequests`, `/topic/annulationDecisions`, `/user/queue/annulationResponses`
- `pointage.service.ts` — Attendance API calls
- `planification.service.ts` — Scheduling
- `stock.service.ts` — Inventory

### Backend

REST API at `http://localhost:8080/api` (dev) — configured in `src/environments/environment.ts`. All HTTP calls pass through `AuthInterceptor`. WebSocket endpoint: `ws://localhost:8080/ws`.

### Key Patterns

- **Standalone Components** — Angular 19; no NgModules
- **RBAC** — `ModulesAutorises` model controls UI visibility per user role
- **Reactive state** — RxJS `BehaviorSubject` for permissions and live data
- **Models** — Typed interfaces in `src/app/models/` (20 files)
- **PDF/Excel export** — jsPDF + jspdf-autotable, XLSX library used in several feature components
- **Localization** — fr-FR locale registered globally in `app.config.ts`

### Feature Areas Under `/admin`

| Path segment | Purpose |
|---|---|
| `rh/` | Human Resources management |
| `employes/`, `employes-complet/` | Employee data (partial vs. complete views) |
| `planification/`, `calendrier/` | Scheduling & calendar (FullCalendar) |
| `pointages/`, `pointage-historique/` | Today's and historical attendance |
| `absences-temps-reel/`, `absences-historique/` | Real-time and historical absences |
| `agences/` | Branch/agency management |
| `stock/` | Inventory (products, entrees, sorties, tracking) |
| `collecte-des-besoins/`, `suivi-commandes/` | Supply collection & order tracking |
| `gestion-privilege/` | Permission management |
| `ferie/` | Holiday management |
| `notification/` | Notification system |
