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
| `ressources-humaines/` | Module RH complet (voir section dédiée ci-dessous) |
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

---

## Module RH (`src/app/adminPage/ressources-humaines/`)

Module Ressources Humaines complet, découpé en 4 sous-modules. Contexte métier : droit du travail sénégalais (IPRES, CSS, barème IR sénégalais). Toutes les interfaces sont en français.

### 6.1 Gestion du personnel (`ressources-humaines/gestion-du-personnel/`)

- **Dossier employé** — fiche complète : identité, photo, poste, département, site affecté, date d'entrée, contacts, personne à prévenir
- **Contrats de travail** — génération CDD/CDI/stage, suivi renouvellements avec alertes avant échéance, historique des avenants
- **Organigramme hiérarchique** — vue arborescente par département, liée au référentiel employés, mise à jour dynamique
- **Suivi période d'essai** — alertes automatiques avant fin de période d'essai, workflow de validation pour titularisation
- **Documents employé** — stockage numérique des pièces : CNI, diplômes, certificats, attestations, accès sécurisé

**Statut : ✅ Terminé** (6 composants créés)
**Entité centrale :** le dossier employé est le référentiel partagé par tous les autres sous-modules.

### 6.2 Temps & Présences (`ressources-humaines/temps-et-presences/`)

- **Pointage centralisé** — vue globale tous départements confondus, données de pointage terrain remontées automatiquement depuis le module Exploitation, alertes absences et retards pour tout le personnel (terrain, siège, production, commercial)
- **Gestion des absences** — saisie et catégorisation : congés payés, maladie, permission, absence injustifiée, pièces justificatives
- **Calendrier des congés** — solde de congés par agent, demandes en ligne, workflow d'approbation par le responsable
- **Heures supplémentaires** — déclaration et validation des heures supplémentaires, calcul automatique des majorations
- **Récapitulatif mensuel** — tableau mensuel par agent : jours travaillés, absences, retards, heures supplémentaires, export pour la paie

**Statut : ✅ Terminé** (5 composants créés)
**Composants :** `pointage-centralise`, `gestion-absences`, `calendrier-conges`, `heures-supplementaires`, `recapitulatif-mensuel`
**Services :** `pointage-centralise.service.ts`, `absence.service.ts`, `conge.service.ts`, `heure-supplementaire.service.ts`, `recapitulatif-mensuel.service.ts`
**Modèles :** `pointage-centralise.model.ts`, `absence.model.ts`, `conge.model.ts`, `heure-supplementaire.model.ts`, `recapitulatif-mensuel.model.ts`
**Dépendances :** consomme les données employé de 6.1. Le récapitulatif mensuel alimente directement le calcul de paie (6.3). Le pointage centralisé reçoit des données du module Exploitation existant.

### 6.3 Paie (`ressources-humaines/paie/`)

- **Grille salariale** — paramétrage du salaire de base, primes (ancienneté, rendement, transport), indemnités par catégorie
- **Calcul bulletin de paie** — calcul automatisé : brut, cotisations IPRES/CSS, impôt sur le revenu (barème sénégalais), net à payer
- **Génération bulletins PDF** — création automatisée des bulletins au format PDF, téléchargeables et imprimables
- **Historique des paies** — archive complète par employé : tous les bulletins, évolution salariale, cumuls annuels
- **Déclarations sociales** — génération des déclarations IPRES, CSS, et formulaires Inspection du travail

**Statut : 🔲 À faire**
**Dépendances :** consomme le récapitulatif mensuel de 6.2 + données employé de 6.1. Utilise jsPDF + jspdf-autotable pour la génération PDF (déjà dans le projet).

### 6.4 Développement RH (`ressources-humaines/developpement-rh/`)

- **Plan de formation** — identification des besoins, planification des sessions, suivi des participations et évaluations
- **Évaluations périodiques** — grilles d'évaluation personnalisées, objectifs fixés, auto-évaluation, entretien annuel avec notation
- **Sanctions & disciplinaire** — registre des avertissements, mises à pied, historique disciplinaire par employé
- **Tableau de bord RH** — KPIs : effectif total, turnover, taux d'absentéisme, masse salariale, répartition par département

**Statut : 🔲 À faire**
**Dépendances :** consomme les données de 6.1 (effectif), 6.2 (absentéisme) et 6.3 (masse salariale) pour alimenter les KPIs du tableau de bord.

### Flux de données entre sous-modules RH

```
Gestion du personnel (6.1)
    │
    ├──► Temps & Présences (6.2)  ◄── Module Exploitation (pointage terrain)
    │         │
    │         └──► Paie (6.3)
    │                │
    └──► Développement RH (6.4) ◄── 6.2 + 6.3 (KPIs)
```

### Conventions module RH

- Chaque sous-module a son propre dossier dans `ressources-humaines/`
- Les services RH sont dans `src/app/services/` avec le préfixe correspondant (ex: `contrat.service.ts`, `conge.service.ts`)
- Les modèles/interfaces RH sont dans `src/app/models/`
- Respecter le pattern standalone components (pas de NgModules)
- Toutes les dates au format `dd/MM/yyyy` (locale fr-FR)
- Les montants en FCFA, pas de décimales