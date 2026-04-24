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
- **Icônes Lucide** — toute icône utilisée dans un template (`<lucide-icon name="Xxx">`) doit être enregistrée dans [src/app/lucide-icons.ts](src/app/lucide-icons.ts) (import + `LucideAngularModule.pick({...})`). Sans enregistrement, l'icône ne rend rien sans erreur. Noms en **PascalCase strict** (pas de kebab-case). Liste officielle : https://lucide.dev/icons/

### Feature Areas Under `/admin`

| Path segment | Purpose |
|---|---|
| `ressources-humaines/` | Module RH complet (voir section dédiée ci-dessous) |
| `exploitation/` | Module Exploitation (Nettoyage & Entretien phytosanitaire) |
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

Module Ressources Humaines complet, découpé en 4 sous-modules — **✅ Terminé (4/4 sous-modules livrés)**. Contexte métier : droit du travail sénégalais (IPRES, CSS, barème IR sénégalais). Toutes les interfaces sont en français.

> **Bilan global module RH :** 33 composants, 19 services, 13 modèles, 1 fichier de constantes réglementaires.

### 6.1 Gestion du personnel (`ressources-humaines/gestion-du-personnel/`)

- **Dossier employé** — fiche complète : identité, photo, poste, département, site affecté, date d'entrée, contacts, personne à prévenir
- **Contrats de travail** — génération CDD/CDI/stage, suivi renouvellements avec alertes avant échéance, historique des avenants
- **Organigramme hiérarchique** — vue arborescente par département, liée au référentiel employés, mise à jour dynamique
- **Suivi période d'essai** — alertes automatiques avant fin de période d'essai, workflow de validation pour titularisation
- **Documents employé** — stockage numérique des pièces : CNI, diplômes, certificats, attestations, accès sécurisé

**Statut : ✅ Terminé** (6 composants créés)
**Entité centrale :** le dossier employé est le référentiel partagé par tous les autres sous-modules.

**Corrections ultérieures :**
- Dossier employé — nouveaux champs d'identité : matricule saisi manuellement (obligatoire, unicité serveur), numéro d'identification (CNI), situation matrimoniale (`CELIBATAIRE` | `MARIE`), nombre d'enfants (toujours visible, optionnel, min 0 — on peut avoir des enfants et être célibataire).
- Dossier employé — nouveaux champs de poste : supérieur hiérarchique (select alimenté par les employés `ACTIF` ou `EN_PERIODE_ESSAI`, l'employé courant est exclu en mode édition), durée de la période d'essai en mois (visible + requise uniquement si `statut === 'EN_PERIODE_ESSAI'`).
- Contrats — le type `ALTERNANCE` est remplacé par `PRESTATION` dans le `TypeContrat`, avec mise à jour des radios du formulaire, de l'option du filtre et des mappings de badges (liste-contrats, avenants).
- Contrats — upload d'un fichier de contrat (PDF/DOC/DOCX) via zone drag-and-drop. Le `ContratService.creerContrat` / `modifierContrat` passent à `FormData` (blob JSON `contrat` + champ `fichier`) avec les champs optionnels `fichierUrl`, `fichierNom`, `tailleFichier` sur l'interface. Nouvelles méthodes `telechargerContrat(id)` (Blob) et `supprimerFichierContrat(id)`.
- Import Excel des employés — depuis la liste des dossiers employés, un lien « Importer depuis Excel » (icône `FileSpreadsheet`, à gauche du bouton « Nouvel employé ») ouvre une modale `MatDialog` avec téléchargement d'un template (22 colonnes + feuille « Consignes »), upload drag-and-drop `.xlsx/.xls`, pré-validation ligne-par-ligne (fail-soft — toutes les erreurs collectées, rapport Excel exportable), confirmation avant import et spinner pendant l'appel serveur. L'import consomme `POST /gestion-personnel/employes/bulk` — **transactionnel all-or-nothing côté serveur** : en cas d'erreur sur une ligne, aucun employé n'est créé. Le backend résout les `superieurHierarchiqueMatricule` → `id` pour les managers internes au batch et ceux déjà en base, ce qui permet d'importer des hiérarchies profondes en un seul appel. Le champ photo n'est pas importable via Excel (à éditer ensuite dans la fiche). Composant : [import-excel-modal/](src/app/adminPage/ressources-humaines/gestion-du-personnel/dossier-employe/import-excel-modal/). Service : [import-employe-excel.service.ts](src/app/services/import-employe-excel.service.ts). Modèles : [import-employe.model.ts](src/app/models/import-employe.model.ts). Méthode service API : `DossierEmployeService.importerBulk(payload)`.

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

**Corrections ultérieures :**
- Formulaire d'absence — quand le type sélectionné est `AUTRE`, un champ texte "Précisez le type d'absence" apparaît et devient obligatoire. La valeur est stockée dans `Absence.typeAutrePrecision` (optionnel) et envoyée dans le `FormData` de soumission. Dans le tableau de la liste, le type `AUTRE` est affiché enrichi : `Autre (précision saisie)` via le helper `getTypeLibelle(a)`.

### 6.3 Paie (`ressources-humaines/paie/`)

- **Grille salariale** — paramétrage du salaire de base par catégorie professionnelle (Cadre, Agent de maîtrise, Employé, Ouvrier, Stagiaire), configuration des primes (transport, assiduité, risque) et indemnités, CRUD complet avec `FormArray` pour primes/indemnités dynamiques
- **Calcul bulletin de paie** — sélection employé + période, récupération automatique du récapitulatif mensuel (6.2), calcul intégral côté client : brut = base + primes + HS majorées + indemnités, cotisations IPRES (RG 5,6/8,4 % plafonnées à 432 000, RC 2,4/3,6 % plafonnées à 1 296 000), CSS (AT/MP 1 % sal / 3 % emp, PF 7 % emp), IR barème progressif 6 tranches, TRIMF, net à payer
- **Génération bulletins PDF** — bulletin conforme aux standards sénégalais via jsPDF + jspdf-autotable : entête entreprise + employé, corps en 3 blocs (gains, retenues salariales, cotisations patronales), net à payer, cumuls annuels. Téléchargement, impression et aperçu iframe
- **Historique des paies** — archive paginée par employé avec filtres (département, période, statut), évolution salariale en histogramme inline (CSS pur, sans dépendance chart), workflow de statut (Brouillon → Validé → Payé / Annulé), cumuls annuels brut/net/IR
- **Déclarations sociales** — agrégation des bulletins validés par période, génération des déclarations IPRES (mensuelle/annuelle), CSS (mensuelle/annuelle), Inspection du Travail, exports PDF et Excel (XLSX)

**Statut : ✅ Terminé** (9 composants créés)
**Composants :** `liste-categories`, `formulaire-categorie`, `calcul-bulletin`, `preview-bulletin`, `generation-bulletin`, `liste-bulletins`, `fiche-bulletin`, `liste-declarations`, `generation-declaration`
**Services :** `grille-salariale.service.ts`, `bulletin-paie.service.ts` (calcul pur côté client + CRUD), `bulletin-pdf.service.ts` (jsPDF), `declaration-sociale.service.ts` (CRUD + exports PDF/Excel)
**Modèles :** `grille-salariale.model.ts`, `bulletin-paie.model.ts`, `declaration-sociale.model.ts`
**Constantes :** `src/app/constants/paie.constants.ts` — taux IPRES, CSS, barème IR, TRIMF, majorations HS, paramètres généraux. Tous les taux sont centralisés et configurables (aucune valeur en dur dans les composants).
**Dépendances :** consomme `RecapitulatifMensuelService` (6.2) + `EmployeCompletService` (6.1) automatiquement. Utilise jsPDF + jspdf-autotable + XLSX (déjà dans le projet). `ReactiveFormsModule` exclusivement (pas de `FormsModule` / `ngModel`).

**Corrections ultérieures :**
- Grille salariale — en plus des primes et indemnités, la `CategorieProfessionnelle` supporte 3 nouvelles listes configurables : `prets[]` et `avances[]` (avec `libelle`, `montant`, `dureeMois`) et `retenues[]` (avec `libelle`, `montant` — pas de durée). Le formulaire expose 3 `FormArray` supplémentaires suivant exactement le pattern existant.
- Calcul bulletin — ces rubriques génèrent des lignes de nature `RETENUE_PERSONNELLE` (nouvelle valeur de `LigneBulletin.nature`) et sont **soustraites après les cotisations légales**. Elles n'entrent donc PAS dans l'assiette IR/IPRES/CSS. Le net à payer est désormais : `brut − totalCotisationsSalariales − totalRetenuesPersonnelles`. Le nouveau total `bulletin.totalRetenuesPersonnelles` est exposé pour le preview (section dédiée "Prêts, avances & retenues" visible uniquement si non vide) et pour le pied du PDF.

### 6.4 Développement RH (`ressources-humaines/developpement-rh/`)

- **Plan de formation** — identification des besoins, planification des sessions, suivi des participations et évaluations
- **Évaluations périodiques** — grilles d'évaluation personnalisées, objectifs fixés, auto-évaluation, entretien annuel avec notation
- **Sanctions & disciplinaire** — registre des avertissements, mises à pied, historique disciplinaire par employé
- **Tableau de bord RH** — KPIs : effectif total, turnover, taux d'absentéisme, masse salariale, répartition par département, graphiques interactifs

**Statut : ✅ Terminé** (4 composants créés)
**Composants :** `plan-formation`, `evaluations`, `sanctions-disciplinaire`, `tableau-bord-rh`
**Services :** `formation.service.ts`, `evaluation.service.ts`, `sanction.service.ts`, `tableau-bord-rh.service.ts`
**Modèles :** `formation.model.ts`, `evaluation.model.ts`, `sanction.model.ts`
**Charts :** ng2-charts + Chart.js pour les graphiques du tableau de bord RH (dépendances déjà installées dans le projet : `chart.js ^4.4.4`, `ng2-charts ^8.0.0`)
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