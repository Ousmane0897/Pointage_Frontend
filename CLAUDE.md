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
| `exploitation-v2/` | Module Exploitation (5.1 Production Chimie + 5.2 Terrain Nettoyage/Phytosanitaire) |
| `gestion-privilege/` | Permission management |
| `notification/` | Notification system |
| `stock/` | ⚠️ ANCIEN module Stock (legacy, à supprimer après bascule sur stock-v2/) |
| `stock-v2/` | NOUVEAU module Stock complet (Stocks & Approvisionnement, Contrôle des mouvements, Analyse des consommations, Valorisation financière) |

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
- Contrats — upload d'un fichier de contrat (PDF/DOC/DOCX) via zone drag-and-drop. Le `ContratService.creerContrat` / `modifierContrat` passent à `FormData` (blob JSON `contrat` + champ `fichier`). Le DTO `Contrat` retourné par le backend expose les champs optionnels **`fichierContratUrl`**, **`fichierContratNom`**, **`fichierContratMimeType`** (la taille n'est pas renvoyée). Méthodes `telechargerContrat(id)` (Blob) et `supprimerFichierContrat(id)`.
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

---

## Module Exploitation (`src/app/adminPage/exploitation-v2/`)

> **Note historique :** un ancien module `exploitation/` (dashboard global, pointages,
> absences, planification, calendrier, agences, employés, fériés, stock, collecte &
> livraison) a été **entièrement supprimé**. Ses composants, ses services dédiés
> (`dashboard`, `dashboard-par-agence`, `absences`, `employe`, `employe-complet`,
> `agences`, `ferie`, `besoins`, `produit`, `stock`) et ses modèles dédiés (`absent`,
> `agences`, `employe`, `employe-complet`, `ferie`, `produit`, `CollecteBesoins`,
> `MouvementEntreeStock`, `MouvementSortieStock`, `item`) n'existent plus.
> Les éléments **partagés** qu'il utilisait ont été **conservés** :
> `pointage.service`/`pointage.model` (kiosque de pointage + terrain),
> `planification.service`/`planification.model` (super-admin), `pageResponse.model`
> (pagination générique app-wide), et les transverses `login`/`websocket`/`auth`/
> `confirm-dialog`. La redirection post-login pointe désormais vers
> `/admin/exploitation-v2/dashboard`. Les fonctionnalités stock / collecte & livraison /
> agences / fériés n'ont pas d'équivalent v2 et ont donc disparu de l'application.

### Sous-modules Exploitation v2 (`src/app/adminPage/exploitation-v2/`)

Module en construction, découpé en 2 sous-modules :
- **5.1 Production Chimie** — formulations, OF, lots & traçabilité,
  contrôle qualité, gestion MP, conditionnement, tableau de bord
- **5.2 Exploitation Terrain** — sites clients, planning, pointage GPS,
  alertes, fiches intervention, contrôle qualité terrain, matériel,
  phytosanitaire, tableau de bord

**Statut : ✅ Terminé (2/2 sous-modules livrés)**

#### 5.1 Production Chimie (`exploitation-v2/production-chimie/`)

**Statut : ✅ Terminé** (livré par PR #1, mergé sur master)

7 sous-modules livrés couvrant l'ensemble du flux production chimique de
l'usine : formulation → ordre de fabrication → lot & traçabilité → contrôle
qualité → matières premières & stock → conditionnement → pilotage par
tableau de bord.

| Sous-module | Composants | Rôle |
|---|---|---|
| `fiches-formulation/` | liste, formulaire, historique-versions, comparaison-versions | Recettes produits avec versioning et lot de référence (`quantiteRef`) |
| `ordres-fabrication/` | liste, kanban, formulaire, detail | OF avec workflow EN_ATTENTE → EN_COURS → TERMINE, calcul auto des MP nécessaires, saisie quantité réelle à la terminaison |
| `lots-tracabilite/` | liste, fiche, tracabilite | Lots générés depuis OF terminés, traçabilité complète (formulation, OF, contrôle, conditionnement) |
| `controle-qualite/` | grille-tests, liste, formulaire, fiche, historique | Grilles de tests paramétrables par produit, fiches de contrôle avec photos authentifiées, décision VALIDE/REJET |
| `matieres-premieres/` | liste, formulaire, reception, mouvements-stock | CRUD MP + entrées/sorties stock chimie, historique des mouvements |
| `conditionnement/` | liste-formats, formulaire-format, generation-etiquettes | Formats de conditionnement + génération PDF des étiquettes produits |
| `tableau-bord-production/` | tableau-bord-production | KPIs (volumes, rendement, taux de perte), graphiques (chart.js), comparaison de périodes, export Excel/PDF |

**Services** (dans [src/app/services/](src/app/services/)) :
`production-formulation.service`, `production-ordre-fabrication.service`,
`production-lot.service`, `production-controle-qualite.service`,
`production-format-conditionnement.service`, `production-tableau-bord.service`,
`production-export.service`, `production-fiche-pdf.service`,
`production-etiquette-pdf.service`, `stock-chimie.service`.

**Modèles** (dans [src/app/models/](src/app/models/)) :
`production-formulation.model`, `production-ordre-fabrication.model`,
`production-lot.model`, `production-controle-qualite.model`,
`production-matiere-premiere.model`, `production-mouvement-stock.model`,
`production-format-conditionnement.model`, `production-tableau-bord.model`.

**Constantes :** [src/app/constants/production-chimie.constants.ts](src/app/constants/production-chimie.constants.ts)
— libellés/couleurs des statuts (OF, lot, contrôle, décision), unités chimie,
palette charts.

**Dépendances backend** : API REST sous `/production-chimie/*` (formulations,
ordres-fabrication, lots, controle-qualite, matieres-premieres, formats,
tableau-bord). Photos contrôle qualité chargées via HttpClient blob +
DomSanitizer (JWT obligatoire — voir [fiche-controle.component.ts](src/app/adminPage/exploitation-v2/production-chimie/controle-qualite/fiche-controle/fiche-controle.component.ts)).

#### 5.2 Exploitation Terrain (`exploitation-v2/terrain/`)

**Statut : ✅ Terminé** (livré par PR à venir, branche `feature/exploitation-v2-terrain`)

9 sous-modules livrés couvrant l'ensemble du flux terrain Nettoyage /
Entretien phytosanitaire : référentiel sites → planning des équipes →
pointage GPS → alertes & escalade temps réel → fiches d'intervention →
contrôle qualité terrain → matériel & maintenance → phytosanitaire
(traçabilité réglementaire) → pilotage par tableau de bord.

| Sous-module | Composants | Rôle |
|---|---|---|
| `sites-clients/` | liste, formulaire, fiche, import-modal | CRUD sites + carte Google Maps + import Excel transactionnel (template + drag&drop + rapport d'erreurs) |
| `shared/` | selecteur-site, selecteur-agent, signature-pad, photo-uploader, geolocation-button, carte-google | Briques transverses : autocompletes, canvas signature `signature_pad`, upload + compression `browser-image-compression`, GPS, Google Maps singleton |
| `planning/` | calendrier-planning, liste-affectations, formulaire-affectation, fiche-affectation, detection-conflits | FullCalendar drag&drop CDK + détection conflits temps réel |
| `pointage/` | suivi-pointages, historique-pointages, fiche-pointage | Le pointage réel est saisi par l'agent depuis la page d'accueil (boutons Arrivée/Départ → code-PIN, modèle `Pointage` via `PointageService`) — pas de création depuis le terrain. `suivi-pointages` affiche les pointages du jour (table de l'ancien module, recherche + pagination, rafraîchissement auto 30 s). `historique-pointages`/`fiche-pointage` restent sur l'ancien modèle GPS `PointageTerrain` (en sursis) |
| `alertes/` | tableau-alertes, recapitulatif-quotidien, parametres-escalade | Alertes WebSocket (topics `/topic/alertes-terrain`, `/user/queue/notifications-terrain`) + workflow escalade superviseur → responsable → DG |
| `fiches-intervention/` | liste, formulaire, detail | Rapport de passage avec checklist, produits, photos `moment` AVANT/APRES/AUTRE, signature client `signature_pad`, géoloc, export PDF jsPDF |
| `controle-qualite/` | grilles-evaluation, liste, formulaire, fiche, historique-site | Grilles paramétrables par site (générique ou spécifique), notation slider 1-5 pondérée, line chart ng2-charts d'évolution |
| `materiel/` | liste, formulaire, suivi-maintenance, historique-materiel + 3 dialogs (Affecter, Programmer, Déclarer) | Inventaire avec alertes maintenance préventive 3 niveaux (CRITIQUE/ATTENTION/INFO), FullCalendar maintenances, timeline événements |
| `phytosanitaire/` | calendrier-phyto, produits, formulaire-application, registre, alertes-delais | Référentiel produits homologués (n° AMM), calendrier coloré par catégorie, registre exportable PDF/Excel pour audits, alertes délais réentrée et nouvelle application |
| `tableau-bord/` | tableau-bord-terrain | KPIs (couverture, satisfaction, incidents) + 4 charts ng2-charts (bar, line × 2, doughnut) + comparaison N vs N-1 + exports Excel/PDF |

**Services** (dans [src/app/services/](src/app/services/)) :
`terrain-site-client.service`, `terrain-planning.service`,
`terrain-pointage.service`, `terrain-alerte.service`,
`terrain-intervention.service`, `terrain-controle-qualite.service`,
`terrain-materiel.service`, `terrain-phytosanitaire.service`,
`terrain-tableau-bord.service`, `terrain-export.service`,
`terrain-pdf.service`, `terrain-geolocation.service`,
`terrain-import-excel.service`, `terrain-google-maps.service`
(14 services). Le `websocket.service.ts` partagé a été étendu pour
exposer les topics `/topic/alertes-terrain`, `/topic/pointages-terrain`
et `/user/queue/notifications-terrain`.

**Modèles** (dans [src/app/models/](src/app/models/)) :
`terrain-site-client.model`, `terrain-planning.model`,
`terrain-pointage.model`, `terrain-alerte.model`,
`terrain-intervention.model`, `terrain-controle-qualite.model`,
`terrain-materiel.model`, `terrain-phytosanitaire.model`,
`terrain-tableau-bord.model` (9 modèles).

**Constantes :** [src/app/constants/terrain.constants.ts](src/app/constants/terrain.constants.ts)
— libellés/couleurs des statuts (affectation, pointage, alerte, intervention,
décision contrôle terrain, matériel, application phyto), seuils
(RAYON_TOLERANCE_GPS_DEFAUT_M, SEUIL_ALERTE_MAINTENANCE_INFO_JOURS,
NOTE_MAX_DEFAUT, SEUIL_CONFORMITE_DEFAUT), palette charts, topics
WebSocket, paramètres de compression photos.

**Dépendances** :
- **`DossierEmployeService` (RH 6.1)** — lecture seule via le composant
  shared `selecteur-agent` (filtre département `Exploitation`). Aucune
  écriture sur les employés depuis le module terrain.
- **`websocket.service.ts`** — topics alertes Phase 5.
- **FullCalendar v6 + locale fr** — calendriers Phases 3, 8, 9.
- **ng2-charts + Chart.js** — Phases 7 et 10.
- **jsPDF + jspdf-autotable + XLSX** — exports PDF/Excel Phases 6, 9, 10.
- **signature_pad** — Phase 6.
- **browser-image-compression** — compression photos Phase 2.
- **@googlemaps/js-api-loader + @types/google.maps** — Phase 1.

**RBAC** : flag `terrain?` optionnel dans
[ModulesAutorises](src/app/models/admin.model.ts) avec 9 sous-flags
(sitesClients, planning, pointage, alertes, interventions, controleQualite,
materiel, phytosanitaire, tableauBord). Backend doit ajouter
`modules.terrain` au claim JWT pour activer le menu en production.

### Conventions nouveau module Exploitation

- **Standalone Components** (pas de NgModules) — Angular 19
- **ReactiveFormsModule** exclusivement (pas de `FormsModule` / `ngModel`)
- **ng2-charts + Chart.js** pour les graphiques (déjà installés)
- **Localisation fr-FR** — dates au format `dd/MM/yyyy`
- **Montants en FCFA**, pas de décimales
- **Lucide icons** — enregistrer toute icône utilisée dans [src/app/lucide-icons.ts](src/app/lucide-icons.ts) (PascalCase strict)
- Services dans [src/app/services/](src/app/services/), modèles dans [src/app/models/](src/app/models/)
- Routes lazy-loadées via `loadComponent()` dans [app.routes.ts](src/app/app.routes.ts)
- RBAC via `ModulesAutorises` + propagation réactive `BehaviorSubject`

---

## Module Stock (`src/app/adminPage/stock-v2/`)

> **Module Stock en construction dans `stock-v2/`. L'ancien `stock/` sera supprimé après bascule complète.**

Module de gestion des stocks, découpé en sous-modules. Toutes les interfaces sont en français.

### 7.3 Stocks & Approvisionnement (`stock-v2/stocks-approvisionnement/`)

- Gestion des articles, niveaux de stock, seuils de réapprovisionnement et commandes fournisseurs.

**Statut : ✅ Terminé (frontend)** — 7 fonctionnalités. Bilan : **14 composants** + **2 partagés**, **11 services**, **9 modèles**, 1 fichier de constantes. Reste à faire côté serveur (endpoints listés plus bas).

| Sous-module | Composants | Rôle |
|---|---|---|
| `catalogue-produits/` | liste-produits, formulaire-produit, fiche-produit, arborescence-categories, import-produits-modal | Référentiel produits (5 types), catégories arborescentes (lazy expand), upload photo + fiche technique PDF, import/export Excel |
| `mouvements-stock/` | liste-mouvements, formulaire-mouvement | Entrées / sorties / transferts inter-sites, saisie rapide avec autocompletes, historique filtrable exportable |
| `etat-stock/` | etat-stock | État temps réel par produit/site, alertes RUPTURE/CRITIQUE/OK, édition inline des seuils, export Excel |
| `inventaires/` | liste-inventaires, planification-inventaire, saisie-inventaire | Workflow BROUILLON→COMPTAGE→VALIDATION→CLOTURE, écart auto, justification au-delà du seuil, PV PDF |
| `synthese-mensuelle/` | synthese-mensuelle | Stock initial/entrées/sorties/final par produit, chart ng2-charts, exports PDF/Excel |
| `approvisionnement-auto/` | approvisionnement-auto | Suggestions (seuil + conso moyenne sur N mois), quantités éditables, bon de commande prévisionnel PDF |
| `tableau-bord-stocks/` | tableau-bord-stocks | KPIs (valeur FCFA, ruptures, alertes, rotation, dormants) + 4 charts (donut, line, bar, table dormants), exports PDF/Excel |

**Composants partagés** (`stocks-approvisionnement/shared/`) : `selecteur-produit`, `selecteur-site` (ControlValueAccessor, autocompletes).

**Services** (préfixe `stock-v2-`, dans [src/app/services/](src/app/services/)) :
`stock-v2-produit`, `stock-v2-categorie`, `stock-v2-mouvement`, `stock-v2-etat-stock`,
`stock-v2-inventaire`, `stock-v2-synthese`, `stock-v2-approvisionnement`,
`stock-v2-tableau-bord`, `stock-v2-import-excel`, `stock-v2-export` (XLSX), `stock-v2-pdf` (jsPDF).

**Modèles** (préfixe `stock-v2-`, dans [src/app/models/](src/app/models/)) :
`stock-v2-produit`, `stock-v2-categorie`, `stock-v2-mouvement`, `stock-v2-etat-stock`,
`stock-v2-inventaire`, `stock-v2-synthese`, `stock-v2-approvisionnement`,
`stock-v2-tableau-bord`, `stock-v2-import`.

**Constantes :** [src/app/constants/stock.constants.ts](src/app/constants/stock.constants.ts).

**Dépendance externe encadrée** : `TerrainSiteClientService.listerActifs()` en **lecture seule**
(via le shared `selecteur-site`) pour référencer les sites des mouvements/transferts. Aucune
écriture, aucun couplage avec l'ancien `stock/` ni avec `stock-chimie`.

**Valorisation** : champ `prixUnitaire` (FCFA) sur le produit (KPIs dashboard 7.3) ; CMUP/FIFO renvoyé à 7.6.

**RBAC** : flag `stock?` optionnel dans [ModulesAutorises](src/app/models/admin.model.ts) avec 7 sous-flags
(catalogue, mouvements, etatStock, inventaires, synthese, approvisionnement, tableauBord). Backend doit
ajouter `modules.stock` au claim JWT pour activer le menu en production.

**Endpoints backend à prévoir** (⚠️ base réelle = `${environment.apiUrl}/stock/…`, soit `/api/stock/…` — **PAS** `/stock-v2/`. Les 8 services HTTP appellent ces routes ; les 3 services Excel/PDF — `stock-v2-import-excel`, `stock-v2-export`, `stock-v2-pdf` — sont **100 % client, aucun endpoint**) :

| Domaine (service) | Endpoints attendus |
|---|---|
| **Produits** (`stock-v2-produit`) | `GET /stock/produits` (filtres q, typeProduit, categorieId, fournisseur, sousSeuil, actif — paginé) · `GET /stock/produits/actifs` (liste légère) · `GET /stock/produits/{id}` · `POST /stock/produits` (multipart : blob JSON `produit` + `photo` + `ficheTechnique`) · `PUT /stock/produits/{id}` (multipart) · `DELETE /stock/produits/{id}` · `GET /stock/produits/{id}/fiche-technique` (blob) · `GET /stock/produits/{id}/photo` (blob) · `POST /stock/produits/bulk` (import **transactionnel all-or-nothing**) |
| **Catégories** (`stock-v2-categorie`) | `GET /stock/categories/racines` · `GET /stock/categories/enfants?parentId=` (lazy) · `GET /stock/categories` (liste plate) · `GET /stock/categories/{id}` · `POST` · `PUT /{id}` · `DELETE /{id}` |
| **Mouvements** (`stock-v2-mouvement`) | `GET /stock/mouvements` (filtres q, produitId, type, motif, siteId, dateDebut, dateFin — paginé) · `GET /stock/mouvements/{id}` · `POST /stock/mouvements` (entrée/sortie/transfert ; serveur déduit l'utilisateur du JWT) |
| **État stock** (`stock-v2-etat-stock`) | `GET /stock/etat-stock` (filtres q, categorieId, typeProduit, siteId, statut, parSite — paginé) · `PUT /stock/etat-stock/seuils` (seuil global produit ou raffiné par site) |
| **Inventaires** (`stock-v2-inventaire`) | `GET /stock/inventaires` (paginé) · `GET /{id}` · `POST` · `PUT /{id}` · `DELETE /{id}` · **transitions** : `POST /{id}/comptage` (fige les qtés théoriques), `PUT /{id}/comptage` (enregistre les comptages), `POST /{id}/validation`, `POST /{id}/cloture` (applique les écarts au stock) |
| **Synthèse** (`stock-v2-synthese`) | `GET /stock/synthese-mensuelle?mois=YYYY-MM&siteId=&categorieId=` |
| **Approvisionnement** (`stock-v2-approvisionnement`) | `GET /stock/approvisionnement/suggestions?nMois=&siteId=&categorieId=&fournisseur=` |
| **Tableau de bord** (`stock-v2-tableau-bord`) | `GET /stock/tableau-bord?dateDebut=&dateFin=&siteId=&categorieId=&moisDormance=` |

**Décisions de modélisation à respecter côté backend** (contrat figé par le frontend ; valeurs littérales exactes des enums dans [stock.constants.ts](src/app/constants/stock.constants.ts) et les modèles `stock-v2-*`) :

- **Produit = référentiel global, sans site.** Le produit ne porte aucun `siteId`. Le stock est tenu **par couple (produitId, siteId)** dans l'état de stock ; un `siteId` absent ⇒ ligne consolidée tous sites. `EtatStock` est recalculé à chaque mouvement.
- **Code produit : saisi manuellement, unique** (champ `code`, contrôle d'unicité serveur). Aucune génération auto imposée par le front.
- **Types de produit (5)** : `PRODUIT_FINI | MATIERE_PREMIERE | CONSOMMABLE | EPI | MATERIEL`.
- **Unités de mesure (10)** : `KG | G | L | ML | PIECE | M2 | M3 | METRE | CARTON | LOT`.
- **Mouvements** : types `ENTREE | SORTIE | TRANSFERT` ; motifs `ACHAT | PRODUCTION | CONSOMMATION | VENTE | TRANSFERT | AJUSTEMENT | RETOUR | PERTE`. Combinaisons valides — ENTREE : ACHAT/PRODUCTION/RETOUR/AJUSTEMENT ; SORTIE : CONSOMMATION/VENTE/PERTE/AJUSTEMENT ; TRANSFERT : TRANSFERT seul. Multi-site via `siteSourceId` (requis SORTIE/TRANSFERT) + `siteDestinationId` (requis ENTREE/TRANSFERT).
- **Catégories : arborescence par `parentId`** (`null` = racine) + `niveau` (0,1,2…). Pas de chemin matérialisé, lazy-load des enfants. Dénormalisés `nbEnfants` / `nbProduits` attendus pour l'affichage de l'arbre.
- **Statut de stock (calculé serveur)** : `RUPTURE` (qté ≤ 0), `CRITIQUE` (0 < qté ≤ `seuilAlerte`), `OK` (qté > seuil).
- **Inventaire** : workflow strict `BROUILLON → COMPTAGE → VALIDATION → CLOTURE` ; périmètre `TOUS | CATEGORIE | SELECTION` ; écart = `qtePhysique − qteTheorique` (calculé) ; `justification` requise si `|écart| > seuilEcartJustification` (**défaut 5**). La clôture applique les écarts au stock réel.
- **Valorisation** : prix unitaire **fixe** porté par le produit (`prixUnitaire`, FCFA, sans décimales) ; valeur = qté × prixUnitaire. **CMUP/FIFO non implémenté ici**, renvoyé au sous-module 7.6.
- **Import Excel** : `POST /stock/produits/bulk` **transactionnel all-or-nothing** ; validation fail-soft ligne-par-ligne **côté client** avant envoi ; le backend résout `categorieLibelle → id` (création si absente) et crée un mouvement `ENTREE` si `stockInitial` est fourni. Le champ photo n'est pas importable via Excel. 12 colonnes (cf. `COLONNES_TEMPLATE_PRODUIT`).
- **Paramètres par défaut** (`PARAMETRES_STOCK`) : pagination 20 ; photo ≤ 5 Mo (jpeg/png/webp) ; fiche ≤ 10 Mo (pdf) ; horizon appro `nMois = 3` ; dormance tableau de bord `6` mois ; top consommations `10`.
- **Sites en lecture seule** via `TerrainSiteClientService.listerActifs()` (shared `selecteur-site`) — aucune écriture, aucun référentiel agences propre au stock.

### 7.4 Contrôle des mouvements (`stock-v2/controle-mouvements/`)

- Catégorisation stricte des entrées/sorties, workflow de validation des mouvements, bons numériques (entrée/sortie), pilotage des plafonds de dotation et analyse de consommation.

**Statut : ✅ Terminé (frontend)** — 9 fonctionnalités. Bilan : **16 composants** + **3 partagés**, **6 services**, **6 modèles**. Reste à faire côté serveur (endpoints listés plus bas).

> **Principe d'intégration (≠ duplication) :** 7.4 n'introduit PAS une nouvelle notion de mouvement. Le `MouvementStock` instantané de 7.3 reste l'**effet** en stock. 7.4 ajoute un document **« Bon » multi-lignes** porteur du workflow ; à la validation (EFFECTIF), le backend **génère les `MouvementStock` de 7.3** (un par ligne) qui mettent à jour `EtatStock` via le mécanisme existant. Aucun mouvement n'affecte le stock sans validation.

| Sous-module | Composants | Rôle |
|---|---|---|
| `categorisation/` | categorisation-entrees, categorisation-sorties | Types figés d'entrée (4) / sortie (4) en lecture seule + statistiques d'usage (doughnut ng2-charts) |
| `bons-entree/` | liste-bons-entree, formulaire-bon-entree, fiche-bon-entree | Bons d'entrée numérotés `BE-AAAAMMJJ-XXX`, édition brouillon, timeline workflow, PDF |
| `bons-sortie/` | liste-bons-sortie, formulaire-bon-sortie, fiche-bon-sortie | Bons de sortie numérotés `BS-AAAAMMJJ-XXX`, destinataire site/agent/client, timeline, PDF |
| `workflow-validation/` | tableau-workflow | Vue **Kanban** (BROUILLON→SOUMIS→VALIDE→EFFECTIF/REFUSE) + table filtrable, WebSocket temps réel, validation/refus (commentaire obligatoire) |
| `plafonds/` | liste-plafonds, formulaire-plafond | Plafonds mensuels site × produit OU site × catégorie, **jauges** conso/plafond colorées, alerte dépassement (toast) |
| `dotation/` | comparatif-dotation | Comparatif mensuel dotation prévue vs réelle, écarts code couleur, exports PDF/Excel |
| `historique-destinataire/` | historique-destinataire | Consommation cumulée par site/agence/client, line chart d'évolution, exports PDF/Excel |
| `rapports-consommation/` | rapports-consommation | Rapports par site/produit/période, KPIs synthétiques (coût moyen/mvt), bar chart, exports PDF/Excel |

**Composants partagés** (`controle-mouvements/shared/`) : `selecteur-employe` (ControlValueAccessor sur `DossierEmployeService`, demandeur/validateur), `editeur-lignes-bon` (FormArray, réutilise le `selecteur-produit` de 7.3), `timeline-workflow` (présentational, historique des actions). Réutilisation directe des `selecteur-produit`/`selecteur-site` de 7.3.

**Services** (préfixe `stock-v2-`) : `stock-v2-bon-entree`, `stock-v2-bon-sortie`, `stock-v2-workflow` (agrège les bons + délègue les transitions selon le sens), `stock-v2-plafond`, `stock-v2-dotation`, `stock-v2-consommation`. Les services `stock-v2-pdf` et `stock-v2-export` de 7.3 ont été **enrichis** (bons, rapports, dotation, historique).

**Modèles** (préfixe `stock-v2-`) : `stock-v2-workflow` (`StatutBon`, `HistoriqueWorkflow`, `NotificationValidationStock`, `BonWorkflow`), `stock-v2-bon-entree` (+ `TypeEntree`), `stock-v2-bon-sortie` (+ `TypeSortie`, `Destinataire`), `stock-v2-plafond`, `stock-v2-dotation`, `stock-v2-consommation`. Le modèle `stock-v2-mouvement` de 7.3 a été enrichi de champs optionnels : `origine` (`DIRECT`|`BON`), `bonId`, `bonReference`, `categorieEntree`, `categorieSortie`.

**Constantes** (ajouts dans [stock.constants.ts](src/app/constants/stock.constants.ts)) : libellés/couleurs/descriptions des `TypeEntree`/`TypeSortie`, `StatutBon` (+ ordre Kanban), actions workflow, granularité plafond, sens d'écart dotation, topics WebSocket, `PARAMETRES_CONTROLE_MOUVEMENTS` (préfixes bons, seuils d'alerte plafond 90 %/100 %).

**WebSocket** : `websocket.service.ts` étendu — topic broadcast `/topic/stock-validations` + queue ciblée `/user/queue/notifications-stock` ; méthode `onStockValidations()`.

**RBAC** : 8 sous-flags ajoutés dans `stock?` de [ModulesAutorises](src/app/models/admin.model.ts) : `categorisation`, `bonsEntree`, `bonsSortie`, `workflowValidation`, `historiqueDestinataire`, `plafonds`, `dotation`, `rapportsConso`. Sidebar : section « Contrôle mouvements » gated par `accessControleMouvements()` / `hasAccess('stock.xxx')`.

**Dépendances en lecture seule** (aucune écriture) : `TerrainSiteClientService.listerActifs()` (sites, via `selecteur-site`) et `DossierEmployeService.getEmployes()` (employés demandeur/validateur, via `selecteur-employe`). Aucun appel à l'ancien `stock.service.ts`, aucun couplage `exploitation-v2`.

**Décisions de modélisation à respecter côté backend** :

- **Bon = document multi-lignes** (header + `lignes[]`) porteur du workflow `BROUILLON → SOUMIS → VALIDE → EFFECTIF` (ou `REFUSE`). Édition/suppression réservées au `BROUILLON`. La **validation génère les `MouvementStock` 7.3** (`origine = BON`, `bonId`/`bonReference` renseignés, catégorie typée) ; stock insuffisant en sortie ⇒ **422** à la validation. L'auteur de chaque action est déduit du JWT et dénormalisé dans `historique[]`.
- **Numérotation atomique côté serveur** : `BE-AAAAMMJJ-XXX` / `BS-AAAAMMJJ-XXX` (compteur séquentiel quotidien).
- **Types d'entrée (4, figés)** : `ACHAT_FOURNISSEUR | RETOUR_PRODUCTION | TRANSFERT_INTER_SITES | REINTEGRATION`. **Types de sortie (4, figés)** : `DISTRIBUTION_AGENCE_SITE_CLIENT | DISTRIBUTION_CHANTIER | VENTE_PRODUIT | CONSOMMATION_INTERNE`. Pas de CRUD (enums dans les constantes).
- **Destinataire d'un bon de sortie** : `type` ∈ `SITE | AGENT | CLIENT` (`siteId` / `agentId` / `clientNom` selon le type).
- **Plafonds** : `granularite` ∈ `PRODUIT | CATEGORIE`, `cibleId` = produitId ou categorieId, `plafondMensuel` (quantité/mois) par `siteId`. Consommation mensuelle agrégée depuis les sorties EFFECTIVES ; dépassement = alerte (toast front + notification WebSocket superviseur attendue côté serveur).

**Endpoints backend à prévoir** (base réelle `${environment.apiUrl}/stock/…`, soit `/api/stock/…`) :

| Domaine (service) | Endpoints attendus |
|---|---|
| **Bons entrée** (`stock-v2-bon-entree`) | `GET /stock/bons-entree` (filtres q, statut, type, siteId, dateDebut, dateFin — paginé) · `GET /{id}` · `POST` · `PUT /{id}` (brouillon) · `DELETE /{id}` (brouillon) · `POST /{id}/soumettre` · `POST /{id}/valider` (→ génère mouvements ENTREE) · `POST /{id}/refuser` (commentaire requis) |
| **Bons sortie** (`stock-v2-bon-sortie`) | mêmes routes sous `/stock/bons-sortie` (→ génère mouvements SORTIE, 422 si stock insuffisant) |
| **Workflow** (`stock-v2-workflow`) | `GET /stock/workflow/bons` (filtres statut, sens, q — liste unifiée `BonWorkflow[]` pour le Kanban) |
| **Catégorisation** (`stock-v2-consommation`) | `GET /stock/categorisation/stats?sens=ENTREE\|SORTIE&dateDebut=&dateFin=` |
| **Plafonds** (`stock-v2-plafond`) | `GET /stock/plafonds` (filtres q, siteId, granularite, actif — paginé) · `GET /{id}` · `POST` · `PUT /{id}` · `DELETE /{id}` · `GET /stock/plafonds/consommation?mois=YYYY-MM&siteId=` |
| **Dotation** (`stock-v2-dotation`) | `GET /stock/dotation/comparatif?mois=YYYY-MM&siteId=&produitId=` |
| **Consommation** (`stock-v2-consommation`) | `GET /stock/consommation/par-destinataire?siteId=&produitId=&dateDebut=&dateFin=` · `GET /stock/consommation/rapport?type=PAR_SITE\|PAR_PRODUIT\|PAR_PERIODE&dateDebut=&dateFin=&siteId=&produitId=&categorieId=` |

> Les services PDF/Excel (`stock-v2-pdf`, `stock-v2-export`) restent **100 % client** (aucun endpoint). Le backend doit publier sur `/topic/stock-validations` (soumission/décision) et `/user/queue/notifications-stock` (validateur ciblé), et ajouter les 8 sous-flags `modules.stock` au claim JWT.

### 7.5 Analyse des consommations (`stock-v2/analyse-consommations/`)

- Statistiques de consommation par article/site/période, graphiques et alertes de surconsommation.

**Statut : ✅ Terminé (frontend)** — 5 fonctionnalités. Bilan : **9 composants** + **1 partagé**, **5 services**, **5 modèles** (4 DTOs analytiques + 1 entité Chantier). Module **analytique LECTURE SEULE** : aucune nouvelle donnée métier, agrège les sorties de 7.4 + le catalogue de 7.3. Seule exception : l'entité légère `Chantier`. Reste à faire côté serveur (endpoints listés plus bas).

| Sous-module | Composants | Rôle |
|---|---|---|
| `vue-mensuelle-site/` | vue-mensuelle-site | KPIs + line (évolution) + bar (top 10 produits) + donut (catégories) + table triable ; filtres site + mois/plage |
| `consommations-chantier/` | liste-chantiers, fiche-chantier, formulaire-chantier | CRUD léger Chantier + détail valorisé (lignes rattachées par `chantierId`), workflow de clôture (EN_COURS→CLOTURE figé), rapport PDF de fin de chantier |
| `consommations-dons/` | consommations-dons | KPIs + donut (par nature) + bar (top bénéficiaires) + line (évolution) + table filtrée ; exports compta analytique |
| `comparatif-mensuel/` | comparatif-mensuel | Matrice site/produit × mois colorisée (heatmap CSS vert/orange/rouge selon écart %), multi-courbes, seuil de surconsommation paramétrable |
| `filtres-croises/` | filtres-croises | Pivot multidimensionnel (axe lignes × colonnes, mesure montant/quantité), totaux de marges, chart adaptatif, requêtes favorites en localStorage |

**Composant partagé** (`analyse-consommations/shared/`) : `selecteur-chantier` (ControlValueAccessor sur `stock-v2-analyse-chantier`, réutilisé par le formulaire bon de sortie 7.4). Réutilise les `selecteur-site`/`selecteur-produit` de 7.3.

**Services** (préfixe `stock-v2-analyse-`) : `stock-v2-analyse-mensuelle`, `stock-v2-analyse-chantier` (CRUD Chantier + détail), `stock-v2-analyse-don`, `stock-v2-analyse-comparatif`, `stock-v2-analyse-croisee` (+ favoris localStorage). Les `stock-v2-export` (XLSX) et `stock-v2-pdf` (jsPDF) ont été **enrichis** (mensuelle, chantier, dons, comparatif, croisé).

**Modèles** : `stock-v2-chantier` (entité + DTO `DetailChantier`), `stock-v2-analyse-mensuelle`, `stock-v2-analyse-don`, `stock-v2-analyse-comparatif`, `stock-v2-analyse-croisee` (DTOs d'affichage).

**Décisions de modélisation (validées, impactent 7.4 et le backend)** :
- **Dons** : 5e valeur `'DON'` ajoutée au `TypeSortie` de 7.4 + champs `natureDon` (`CADEAU_CLIENT | ECHANTILLON | ACTION_SOCIALE | DON_INTERNE_EMPLOYE`) et `beneficiaireDon` sur `BonSortie`/`BonSortiePayload`. Le formulaire bon de sortie 7.4 capture ces champs (conditionnels si `type === 'DON'`).
- **Chantier** : entité légère persistée `Chantier` (`reference, nom, siteId, dateDebut, dateFin?, statut EN_COURS|CLOTURE`) + champ `chantierId` sur le bon de sortie `DISTRIBUTION_CHANTIER`. **Seule entité persistée** de 7.5. À la validation, le mouvement SORTIE propage la nature du don / le `chantierId`.
- **Favoris filtres croisés** : `localStorage` (clé `stockv2.analyse.favoris`), aucun endpoint.

**Constantes** (ajouts dans [stock.constants.ts](src/app/constants/stock.constants.ts)) : `LIBELLES/COULEURS/DESCRIPTIONS_NATURE_DON` + `ORDRE_NATURES_DON`, `LIBELLES/COULEURS_STATUT_CHANTIER` + `ORDRE_STATUTS_CHANTIER`, `DON` ajouté aux maps `TypeSortie`, `COULEURS_ECART`, `PARAMETRES_ANALYSE_CONSO` (`seuilSurconsommationPct: 30`, `topProduits: 10`, `nbMoisDefaut: 12`, `pageSize: 20`, `cleFavorisLocalStorage`).

**RBAC** : 5 sous-flags ajoutés dans `stock?` de [ModulesAutorises](src/app/models/admin.model.ts) : `analyseMensuelle`, `chantiers`, `dons`, `comparatif`, `filtresCroises`. Sidebar : section « Analyse consommations » gated par `accessAnalyseConsommations()` / `hasAccess('stock.xxx')`.

**Dépendances en lecture seule** : `TerrainSiteClientService.listerActifs()` (sites, via `selecteur-site`), catalogue/catégories de 7.3, sorties de 7.4. Aucun appel à l'ancien `stock.service.ts`.

**Endpoints backend à prévoir** (base réelle `${environment.apiUrl}/stock/…`, soit `/api/stock/…`) :

| Domaine (service) | Endpoints attendus |
|---|---|
| **Vue mensuelle** (`stock-v2-analyse-mensuelle`) | `GET /stock/analyse/mensuel?mois=YYYY-MM&moisFin=&siteId=&categorieId=` (KPIs + lignes + séries) |
| **Chantiers** (`stock-v2-analyse-chantier`) | `GET /stock/chantiers` (paginé : q, statut, siteId, dates) · `GET /stock/chantiers/actifs` (sélecteur) · `GET /{id}` (→ `DetailChantier` agrégé) · `POST` · `PUT /{id}` · `POST /{id}/cloture` |
| **Dons** (`stock-v2-analyse-don`) | `GET /stock/analyse/dons?dateDebut=&dateFin=&natureDon=&beneficiaire=&siteId=` |
| **Comparatif** (`stock-v2-analyse-comparatif`) | `GET /stock/analyse/comparatif?axe=SITE\|PRODUIT&dateDebut=YYYY-MM&dateFin=YYYY-MM&siteId=&categorieId=&typeSortie=&seuilPct=` |
| **Filtres croisés** (`stock-v2-analyse-croisee`) | `GET /stock/analyse/croise?axeLignes=&axeColonnes=&mesure=MONTANT\|QUANTITE&dateDebut=&dateFin=&siteId=&produitId=&categorieId=&typeSortie=` (axes : PRODUIT/CATEGORIE/SITE/TYPE_SORTIE/NATURE_DON/MOIS) |

> Les services PDF/Excel restent **100 % client**. Le backend doit ajouter les 5 sous-flags `modules.stock.{analyseMensuelle,chantiers,dons,comparatif,filtresCroises}` au claim JWT, et faire porter au mouvement SORTIE la `natureDon` (bons DON) et le `chantierId` (bons DISTRIBUTION_CHANTIER) à la validation.

### 7.6 Valorisation financière

- Valorisation du stock (FCFA), méthodes de calcul (CMUP/FIFO), états de stock valorisés et exports comptables.

**Statut : 🔲 À faire**

### Conventions module Stock

- **Standalone Components** (pas de NgModules) — Angular 19
- **ReactiveFormsModule** exclusivement (pas de `FormsModule` / `ngModel`)
- **ng2-charts + Chart.js** pour les graphiques (déjà installés)
- **Localisation fr-FR** — dates au format `dd/MM/yyyy`
- **Montants en FCFA**, pas de décimales
- **Lucide icons** — enregistrer toute icône utilisée dans [src/app/lucide-icons.ts](src/app/lucide-icons.ts) (PascalCase strict)
- Services dans [src/app/services/](src/app/services/), modèles dans [src/app/models/](src/app/models/)
- Routes lazy-loadées via `loadComponent()` dans [app.routes.ts](src/app/app.routes.ts)
- RBAC via `ModulesAutorises` + propagation réactive `BehaviorSubject`
