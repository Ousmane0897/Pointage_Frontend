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
