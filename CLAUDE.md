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
| `exploitation-v2/` | Module Exploitation (5.1 Production Chimie + 5.2 Terrain Nettoyage/Phytosanitaire). ⚠️ Dans la sidebar, 5.1 est présenté sous le menu **Industrie** et 5.2 sous le menu **Exploitation** — les routes restent `exploitation-v2/` pour les deux (voir note Navigation ci-dessous) |
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
- **Contrats de travail** — génération CDD/CDI/stage, suivi renouvellements avec alertes avant échéance, historique des avenants — *gérés depuis l'onglet Contrats de la fiche employé (plus d'entrée de menu dédiée)*
- **Organigramme hiérarchique** — vue arborescente par département, liée au référentiel employés, mise à jour dynamique
- **Suivi période d'essai** — alertes automatiques avant fin de période d'essai, workflow de validation pour titularisation
- **Documents employé** — stockage numérique des pièces : CNI, diplômes, certificats, attestations, accès sécurisé

**Statut : ✅ Terminé** (6 composants créés)
**Entité centrale :** le dossier employé est le référentiel partagé par tous les autres sous-modules.

**Corrections ultérieures :**
- Dossier employé — nouveaux champs d'identité : matricule saisi manuellement (obligatoire, unicité serveur), numéro d'identification (CNI), situation matrimoniale (`CELIBATAIRE` | `MARIE` | `DIVORCE` | `VEUF`), nombre d'enfants (toujours visible, optionnel, min 0 — on peut avoir des enfants et être célibataire). ⚠ Le serveur remettait `nombreEnfants` à `null` dès que la situation n'était pas `MARIE`, ce qui contredisait cette règle et aurait effacé les enfants d'un divorcé ou d'un veuf : cette remise à zéro a été supprimée de `DossierEmployeService.nettoyerChampsOptionnels`. La règle d'import bulk « `MARIE` sans `nombreEnfants` ⇒ erreur » reste, elle, cantonnée à `MARIE`.
- Dossier employé — nouveaux champs de poste : supérieur hiérarchique (select alimenté par les employés `ACTIF` ou `EN_PERIODE_ESSAI`, l'employé courant est exclu en mode édition), durée de la période d'essai en mois (visible + requise uniquement si `statut === 'EN_PERIODE_ESSAI'`).
- Contrats — le type `ALTERNANCE` est remplacé par `PRESTATION` dans le `TypeContrat`, avec mise à jour des radios du formulaire, de l'option du filtre et des mappings de badges (liste-contrats, avenants).
- Contrats — upload d'un fichier de contrat (PDF/DOC/DOCX) via zone drag-and-drop. Le `ContratService.creerContrat` / `modifierContrat` passent à `FormData` (blob JSON `contrat` + champ `fichier`). Le DTO `Contrat` retourné par le backend expose les champs optionnels **`fichierContratUrl`**, **`fichierContratNom`**, **`fichierContratMimeType`** (la taille n'est pas renvoyée). Méthodes `telechargerContrat(id)` (Blob) et `supprimerFichierContrat(id)`.
- Import Excel des employés — depuis la liste des dossiers employés, un lien « Importer depuis Excel » (icône `FileSpreadsheet`, à gauche du bouton « Nouvel employé ») ouvre une modale `MatDialog` avec téléchargement d'un template (22 colonnes + feuille « Consignes »), upload drag-and-drop `.xlsx/.xls`, pré-validation ligne-par-ligne (fail-soft — toutes les erreurs collectées, rapport Excel exportable), confirmation avant import et spinner pendant l'appel serveur. L'import consomme `POST /gestion-personnel/employes/bulk` — **transactionnel all-or-nothing côté serveur** : en cas d'erreur sur une ligne, aucun employé n'est créé. Le backend résout les `superieurHierarchiqueMatricule` → `id` pour les managers internes au batch et ceux déjà en base, ce qui permet d'importer des hiérarchies profondes en un seul appel. Le champ photo n'est pas importable via Excel (à éditer ensuite dans la fiche). Composant : [import-excel-modal/](src/app/adminPage/ressources-humaines/gestion-du-personnel/dossier-employe/import-excel-modal/). Service : [import-employe-excel.service.ts](src/app/services/import-employe-excel.service.ts). Modèles : [import-employe.model.ts](src/app/models/import-employe.model.ts). Méthode service API : `DossierEmployeService.importerBulk(payload)`.
- **Contrats & documents rattachés à la fiche employé** — les rubriques « Contrats de travail » et « Documents employé » ont été retirées du sous-menu *RH > Gestion du Personnel* de la sidebar. Elles sont désormais accessibles via les onglets **Contrats** et **Documents** de la fiche employé ([fiche-employe/](src/app/adminPage/ressources-humaines/gestion-du-personnel/dossier-employe/fiche-employe/)), rendus **inline** dans le template (pas de composant enfant, pas d'`@Input`) et alimentés par le `forkJoin` de `chargerDonnees()`. L'onglet Contrats porte les actions complètes — créer (via la route existante `contrats/nouveau/:employeId`), modifier, avenants, supprimer (`ConfirmDialogComponent` + toastr, puis `rechargerContrats()` qui ne recharge ni la photo ni le dossier), télécharger le fichier (blob, endpoint protégé par JWT) — ainsi qu'une bannière d'alertes d'échéance : `ContratService.getAlertes()` renvoie **toutes** les alertes, filtrées côté client sur `employeId` (aucun endpoint backend à ajouter). Les composants `formulaire-contrat` et `avenants` acceptent un query param **`returnUrl`** pour revenir sur la fiche (`…/dossier-employe/fiche/:id?tab=contrats`, l'onglet étant restauré depuis `?tab=`) ; à défaut ils retombent sur la liste globale des contrats. Les routes `rh/gestion-du-personnel/contrats*` et `.../documents*` ainsi que les flags RBAC `rh.contrats` et `rh.documents` sont **conservés** — les deux restent agrégés dans `sidebar.accessGestionPersonnel()`, sans quoi un profil n'ayant que l'un de ces droits perdrait tout le sous-menu. La **liste globale des contrats** (`rh/gestion-du-personnel/contrats`, sans entrée de menu) reste atteignable par un lien « Contrats de travail » dans la barre d'actions de la page **Dossiers Employés**.
- **Onglet « Congés » de la fiche employé** — 4ᵉ onglet (`ActiveTab = 'infos' | 'contrats' | 'documents' | 'conges'`), seule vue de l'**historique des congés d'un agent** : solde de l'exercice courant, demandes passées par le circuit de validation, et déclarations. Il consomme **`GET /temps-presences/conges/demandes/employe/{id}`** — un endpoint qui existait depuis le lot congés mais qu'**aucun code front n'appelait** (`CongeService.demandesParEmploye()`), plus `GET /soldes/{id}` et `AbsenceService.lister(0, 100, { employeId })`. Côté serveur, seul `DemandeCongeService.getByEmployeId` a changé : il **trie** désormais par `dateDemande` décroissant (`nullsLast`), comme `searchDemandes`. ⚠ **Chargement paresseux à la première ouverture de l'onglet**, délibérément **hors du `forkJoin` de `chargerDonnees()`** qui alimente contrats et documents : d'une part on n'ajoute pas 3 requêtes à chaque ouverture de fiche, d'autre part on ne déclenche pas le **403 de périmètre** chez un utilisateur qui n'ouvrira jamais l'onglet (drapeau `congesCharges`). ⚠ `queryParamMap` émet **avant** que l'id de route soit résolu : le retour depuis le détail d'une demande (`?tab=conges`) est donc relancé depuis le handler de `route.params`, sans quoi `chargerConges()` partirait avec un `employeId` vide. ⚠ Le **403 est un cas nominal** (employé hors périmètre) : il s'affiche **dans l'onglet**, jamais en toast. `detail-demande-conge` accepte désormais `returnUrl` + `tab` pour revenir sur la fiche (même pattern que `formulaire-contrat` / `avenants`). Demandes et déclarations sont **deux référentiels distincts** (`DemandeConge` vs `Absence`) : ils sont affichés côte à côte et **ne s'additionnent jamais**, ce que dit le sous-titre. Aucun nouveau flag RBAC — l'onglet suit `rh.dossierEmploye` et son contenu est borné serveur par le périmètre de visibilité. ⚠ Le libellé de type de déclaration duplique la map inline de `liste-absences` : à factoriser lors du lot qui corrigera la désynchronisation de `TypeAbsence` (cf. 6.2), pas avant.
- **Étape « Contrat » dans l'assistant de création d'employé** — [formulaire-employe/](src/app/adminPage/ressources-humaines/gestion-du-personnel/dossier-employe/formulaire-employe/) compte une étape supplémentaire intercalée **entre « Documents » et « Récapitulatif »**, proposée **à la création uniquement** (6 étapes ; en modification on reste à 5, les contrats d'un employé existant se gérant depuis sa fiche). Le tableau `etapes` est donc devenu mutable — `'Contrat'` y est inséré dans `ngOnInit` si `!isEditMode` — et le récapitulatif est rendu par `*ngIf="etapeCourante === 'Récapitulatif'"` (getter sur `etapes[etapeActuelle - 1]`) et non plus par un index en dur. L'étape est **optionnelle** : `contratForm` (un `FormGroup` séparé de `employeForm`, comme `documentForm`) est sans contrôle `employeId` — injecté à l'envoi — et sans `Validators.required` sur `dateDebut` ; `validerEtapeContrat()` ne s'applique que si `contratRenseigne` (date de début saisie ou fichier joint). La soumission enchaîne `creerEmploye` → `televerserDocuments` → `creerContratSiRenseigne`, chaque cascade avec `catchError(() => of(null))` + toast d'avertissement : **un échec sur les documents ou le contrat n'annule jamais la création de l'employé**, déjà persistée.
- **Affectations — date de fin optionnelle** — dans [formulaire-affectation/](src/app/adminPage/ressources-humaines/gestion-du-personnel/affectations/formulaire-affectation/), le contrôle `dateFin` (label « Date et heure de fin ») n'est plus `required` : une affectation sans fin est **à durée indéterminée**. `AffectationAgent.dateFin` passe à **optionnel** dans [terrain-planning.model.ts](src/app/models/terrain-planning.model.ts) ; tous les affichages ont un repli « Indéterminée » (fiche, liste + exports, durée) et le calendrier rend un **événement ponctuel** (`end: a.dateFin ?? undefined`). Le validateur croisé fin > début et la détection de conflits ne s'appliquent que si la fin est saisie — **un intervalle ouvert ne produit jamais de conflit**, côté front comme côté serveur (`PlanningService.chevauche` renvoie `false` sur un null). ⚠ **Contrat backend** (branche `feature/affectation-date-fin-optionnelle`) : `@NotNull` retiré de `AffectationAgentDto.dateFin` ; le filtre de période de `PlanningService.appliquerFiltres` tolère les `dateFin` nuls (`orOperator` fin ≥ borne **ou** fin absente), sans quoi ces affectations disparaîtraient du calendrier et des listes ; `update()` réaffecte explicitement `dateFin` (le mapper MapStruct ignore les nulls) pour permettre de **retirer** une date de fin existante ; le scheduler laisse volontairement ces affectations en **`EN_COURS`** (clôture humaine : ajout d'une date de fin ou annulation).
- **Dates et jours de travail rattachés au site** — trois informations de l'étape « Poste & Affectation » qui étaient portées au niveau de l'**employé** deviennent propres à chaque **site** du tableau `affectations` ([dossier-employe.model.ts](src/app/models/dossier-employe.model.ts)). `AffectationSite` gagne **`dateEntree`** (arrivée sur ce site, requise), **`dateSortie`** (optionnelle) et **`joursTravail`** (requis, défaut `LUN_VEN`) ; en contrepartie `DossierEmploye.joursTravail` est **supprimé** et `DossierEmploye.dateEntree` est **renommé `dateEmbauche`** (« Date d'embauche »), sans quoi deux champs homonymes désigneraient l'entrée dans l'entreprise et l'entrée sur un site.
  - ⚠ **`dateSortie` naît `disabled`**, et c'est le contrôle désactivé lui-même qui porte le sens « sortie inconnue, l'employé est toujours en poste sur ce site » ; une case à cocher l'active le jour où il quitte le site, et la décocher **vide** la valeur (une date invisible mais persistée sortirait l'employé à son insu). Un contrôle désactivé étant absent de `form.value`, la construction du payload lit **`this.affectations.getRawValue()`** et non `v.poste.affectations` — même piège que le champ Employé du formulaire de demande de congé.
  - ⚠ Le **calendrier de planning terrain** est le seul consommateur réel de ces champs. Dans `appliquerEvenements()` ([calendrier-planning.component.ts](src/app/adminPage/exploitation-v2/terrain/planning/calendrier-planning/calendrier-planning.component.ts)), le test de semaine ouvrée était fait **une fois par employé, avant** la boucle sur les tranches : il est descendu **dans** cette boucle, avec le filtre de période `dateEntree`/`dateSortie`. Les comparaisons se font sur des **chaînes `yyyy-MM-dd`** (`date` vient d'`isoLocale()`) — l'ordre lexicographique ISO est exact, aucune conversion `Date` n'est nécessaire, et un `.slice(0, 10)` absorbe un datetime backend.
  - ⚠ **Le repli rétro-compat ne filtre rien** : la tranche dérivée de `siteAffecte` (calendrier) naît avec `dateEntree: null`, et les gardes sont toutes conditionnées à la présence de la valeur — un dossier antérieur reste affiché à l'identique. Côté formulaire, ce même repli complète en revanche chaque ligne avec `dateEntree = dateEmbauche` et `LUN_VEN`, sinon une fiche ancienne s'ouvrirait invalide.
  - Les libellés de semaine ouvrée étaient déjà **dupliqués dans deux fichiers** : ils sont centralisés en `LIBELLES_JOURS_TRAVAIL` / `OPTIONS_JOURS_TRAVAIL` / `libelleJoursTravail()` exportés **à côté du type `JoursTravail`** dans son modèle, et consommés par `formulaire-employe`, `formulaire-affectation` et `fiche-employe` — ne pas en recopier une troisième version (cf. le tableau des mois dupliqué 6 fois dans le module RH).
  - La **fiche employé** rend désormais la liste des affectations (site, horaires, jours, période) là où elle n'affichait que la string plate `siteAffecte` ; `formulaire-affectation` affiche les jours **par ligne** et non plus une fois pour l'agent.
  - **Import Excel** : colonne `"Date d'entrée *"` → `"Date d'embauche *"`, champ payload `dateEntree` → `dateEmbauche`. Les dates et jours **par site ne sont pas importables** (l'import reste mono-champ `Site affecté *`) : le backend complète chaque affectation dérivée avec `dateEntree = dateEmbauche` et `joursTravail = LUN_VEN`, ce que disent les consignes du template.
  - ⚠ **Contrat backend livré** (branche `feature/affectation-dates-et-jours-par-site`, partant de `main`). `AffectationSite` (entité + DTO) gagne `dateEntree`, `dateSortie` (LocalDate) et `joursTravail` (String) ; MapStruct mappe par nom, rien à écrire. La propagation se fait par une **passe supplémentaire, idempotente, dans `AffectationSiteBackfillRunner`** (plutôt qu'un nouveau runner : il balaie déjà tous les dossiers au démarrage) qui recopie sur chaque affectation `joursTravail` de l'employé et `dateEntree = dateEmbauche`, **sans jamais écraser une valeur saisie**. Sans elle, tout le parc retomberait sur l'échelon permissif du résolveur.
  - ⚠ **Trois écarts assumés par rapport au contrat initialement esquissé ci-dessus :**
    1. **Le champ Mongo n'est PAS renommé.** `DossierEmploye.dateEntree` devient `dateEmbauche` en Java/JSON mais garde `@Field("dateEntree")` (même procédé que `Produit.dateEntree`) : renommer réellement aurait rendu **nulle la date d'embauche de tous les dossiers en base**, alors que seul le nom devait changer. Aucune migration de données n'est donc nécessaire pour ce renommage.
    2. **`joursTravail` reste sur l'employé.** Il n'est plus envoyé par le front, mais c'est le **deuxième échelon de repli** du résolveur (`par site → par employé → aucun filtrage`) et la source de la migration. Le retirer supprimerait la seule information de rythme des dossiers antérieurs.
    3. **`dateEntree` et `joursTravail` ne sont PAS `@NotNull`** sur l'affectation : l'import bulk et `SiteAffecteUtils.affectationsDepuisSiteAffecte` (repli quand le client n'envoie que `siteAffecte`) produisent des affectations **sans aucune date**, et les exiger casserait ces deux flux. Seul `dateSortie >= dateEntree` est vérifié (**422**), ainsi que `joursTravail` contre l'enum.

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
- Sidebar — les deux entrées « Pointage centralisé » et « Historique pointage » du sous-menu **Présences** sont condensées en une seule rubrique **« Pointage »** (→ `rh/temps-et-presences/pointage-centralise`). Les deux routes et les deux composants sont conservés ; la bascule se fait par une **barre d'onglets** « Vue du jour » / « Historique » présente dans les deux templates (elle remplace les anciens liens croisés). ⚠ L'entrée de sidebar n'a **plus** `[routerLinkActiveOptions]="{ exact: true }"` (sans quoi elle se dé-surlignerait sur `/historique`), et inversement l'onglet « Vue du jour » **doit** le porter (sinon il reste actif sur le sous-chemin `/historique`). Le flag RBAC reste l'unique `rh.pointageCentralise`.
- Formulaire d'absence — quand le type sélectionné est `AUTRE`, un champ texte "Précisez le type d'absence" apparaît et devient obligatoire. La valeur est stockée dans `Absence.typeAutrePrecision` (optionnel) et envoyée dans le `FormData` de soumission. Dans le tableau de la liste, le type `AUTRE` est affiché enrichi : `Autre (précision saisie)` via le helper `getTypeLibelle(a)`.
- Sidebar — les entrées « Congés » (qui pointait en réalité sur `rh/temps-et-presences/absences`, l'écran de *déclaration*) et « Calendrier des congés » (`rh/temps-et-presences/conges`) sont condensées en une seule rubrique **« Congés »**, avec une **barre d'onglets** « Calendrier » / « Déclarations » dupliquée dans `calendrier-conges` et `liste-absences`. « Validation congés » et « Mes demandes de congé » **restent des entrées de menu distinctes** ; les boutons croisés « Mes demandes » / « Validation » de l'en-tête du calendrier sont donc supprimés (avec les méthodes `mesDemandes()` / `validation()`), seul « Nouvelle demande » reste. ⚠ **Inversion par rapport à la rubrique Pointage** : ici les deux routes sont **sœurs** (`/conges` et `/absences`), pas parent/enfant — `[routerLinkActiveOptions]="{ exact: true }"` va donc sur l'onglet **Calendrier** (sinon il resterait actif sur `/conges/demande`) et non sur Déclarations (qui doit rester actif sur `/absences/nouvelle` et `/absences/:id/modifier`). ⚠ Le surlignage de l'entrée de sidebar ne peut **pas** passer par `routerLinkActive` (il faudrait exprimer « `/conges` exact **ou** `/absences*`, mais ni `/conges/validation` ni `/conges/mes-demandes` ») : il passe par `estRubriqueConges()` + `[ngClass]`, et la destination par `lienRubriqueConges()` (retombe sur `/absences` si le droit `rh.conges` manque). Les deux flags RBAC `rh.conges` et `rh.absences` sont **conservés** et agrégés en `*ngIf` sur l'entrée — un profil n'ayant que l'un des deux verra l'onglet de l'autre (comportement inchangé, il n'y a pas de guard de route sur ces écrans).

#### Pointage centralisé — une ligne par site, retards et absences sur l'horaire du site

La présence est évaluée **par créneau** (employé × jour × site attendu) et non plus par
employé : un agent affecté à 2 sites produit **2 lignes par jour**, chacune jugée sur le
`horaireDebut` / `horaireFin` **de son propre site**. Le socle des lignes est le
**planning**, les pointages venant s'y rattacher — l'inverse de l'ancien modèle, qui
émettait une ligne par enregistrement de pointage.

- ⚠ **`Pointage.site[]` n'est pas une clé de rattachement, et ne doit jamais le redevenir.**
  `PointageServices.enregistrerPointage` y recopie **tous** les sites de l'agent
  (`site(decouperSites(agent.getSiteAffecte()))`) : l'agent ne choisit jamais le sien. La
  branche « mono-site » de l'ancien `resoudreHeurePrevue` ne se déclenchait donc **jamais**
  pour un multi-sites et retombait sur le `horaireDebut` **le plus tôt de tous ses sites**,
  d'où des retards faux (arrivée 10:20 sur un site à 10:00 comptée « en avance » sur un site
  à 06:00). Ce champ n'est plus qu'un libellé d'affichage sur les lignes hors planning.
  Le test `pointage_multi_sites_dans_un_record_prend_horaire_le_plus_tot`, qui verrouillait
  ce repli, a été **supprimé**.
- **Rattachement par plage horaire**, en deux passes dans `PointageCentraliseService.rattacher` :
  *contenance* (l'arrivée tombe dans `[horaireDebut, horaireFin]` ; sur fenêtres
  chevauchantes, **le début le plus tard gagne** — c'est la fenêtre qui vient de s'ouvrir),
  puis *proximité* (écart croissant, glouton). **Un créneau n'accueille qu'un pointage** ;
  un créneau sans `horaireDebut` n'est gagné par aucune passe.
- **Échelle de statuts**, comparée à la **date-heure** de la ligne (jamais un `LocalTime` nu) :
  pointé ⇒ `PRESENT` / `RETARD` ; sinon `NEUTRE` avant le début, `EN_ATTENTE` pendant,
  `ABSENT` après la fin. ⚠ Cette règle unique règle les trois horizons **sans cas
  particulier** : un jour passé est toujours après la fin (⇒ jamais de `NEUTRE` dans
  l'Historique), un jour futur toujours avant le début (⇒ jamais d'`ABSENT`).
  ⚠ **Horaires nuls : ne rien inventer** (pas de 08:00–17:00 par défaut) — un horaire
  fabriqué produirait un retard faux ; bornes = journée entière, retard 0.
- ⚠ **Nouveau statut `HORS_PLAN`** : un pointage qu'aucun créneau n'explique (plus de
  pointages que de sites, dossier sans affectation, jour non travaillé). Il **ne disparaît
  jamais** et n'est **pas** fondu dans `absents` — c'est justement la branche `default ->`
  attrape-tout de l'ancien `getResume` qui avait rendu le bug invisible. Tuile dédiée.
- ⚠ **`joursTravail` absent ⇒ échelle de replis « par site → par employé → aucun filtrage »**
  ([PlanningAffectationResolver](../Pointage-Cleanic-Backend/src/main/java/com/example/Pointage_Cleanic/services/rh/PlanningAffectationResolver.java)),
  et **surtout pas un repli sur `LUN_VEN`** : dans une société de nettoyage où `LUN_SAM` et
  `LUN_DIM` sont courants, forcer `LUN_VEN` ferait **disparaître toute ligne du samedi et du
  dimanche** d'un dossier legacy — donc masquerait une absence réelle sur l'écran qui sert à
  les tracer. Le faux négatif est ici le pire mode de défaillance. `LUN_VEN` reste le défaut
  d'**affichage** du front (`libelleJoursTravail`), ce qui n'en fait pas une règle de filtrage.
- ⚠ **L'identifiant de ligne appartient au créneau**, pas au pointage
  (`employeId|date|ordinal|site-slug@horaireDebut`) : avec `id = pointage.getId()`, la même
  ligne n'aurait pas d'id avant le pointage puis hériterait de l'`_id` Mongo après, et le
  `trackBy` Angular détruirait/recréerait la ligne à chaque rafraîchissement traversant un
  pointage. L'`_id` réel est porté à part par **`pointageId`**.
- ⚠ **Le filtre `site` passe du prédicat employé au prédicat ligne.** Il testait
  `employe.siteAffecte.contains(...)` : filtrer sur « Yoff » rendait **toutes** les lignes
  d'un agent bi-site. `departement` et `q` restent employé-level (pré-filtre bon marché).
  Le filtrage reste **avant** la pagination, `totalElements` comptant désormais des
  **créneaux** (le libellé front dit « créneau(x) »).
- ⚠ **`ResumeJourneeDto` mélange deux unités, à ne pas additionner** : `totalEmployes` et
  `enConge` comptent des **personnes**, tout le reste des **créneaux**. Nouveaux champs
  `creneauxPrevus`, `enAttente`, `neutres`, `horsPlan`. L'ancien invariant
  `presents + absents + retards + enConge == totalEmployes` était **déjà faux** pour les
  multi-pointages : il est abandonné, remplacé par
  `presents + retards + absents + enAttente + neutres == creneauxPrevus`.
- ⚠ **Un congé approuvé produit UNE seule ligne**, pas une par site : c'est un fait de la
  journée, et le multiplier gonflerait la tuile « En congé ».
- **Horloge injectée** : le service consomme le bean `Clock` de `configurations/TimeConfig`
  (`Africa/Dakar`) au lieu de `LocalDate.now()` en dur — sans quoi l'échelle temporelle
  serait fausse hors Dakar et **intestable**. ⚠ Tous les tests fixent l'horloge
  (`Clock.fixed`) ; l'ancienne suite avait une date de référence future à l'écriture, devenue
  passée, ce qui aurait rendu ses résultats dépendants du jour d'exécution.
- **Front** : `StatutPresence` gagne `NEUTRE | EN_ATTENTE | HORS_PLAN` ; colonne **Horaire
  prévu**, ligne **grisée** sur `NEUTRE`, tuiles *En attente* / *À venir* / *Hors planning*.
  ⚠ **`statutAffiche()` ne dérive plus rien** et renvoie le statut serveur : l'ancienne
  version repliait sur `PRESENT` tout ce qui n'était ni `ABSENT` ni `CONGE`, et aurait donc
  affiché « Présent » sur un créneau non commencé. Cela corrige au passage l'incohérence
  d'origine entre le badge (tolérance appliquée côté client) et le filtre / les tuiles
  (statut brut serveur). Les trois maps de badges, **dupliquées verbatim** dans
  `pointage-centralise` et `historique-pointage-centralise`, sont centralisées dans
  [pointage-retard.util.ts](src/app/adminPage/ressources-humaines/temps-et-presences/pointage-retard.util.ts).
- ⚠ **Impact aval traité** : `TableauBordRhService.calculerTempsPresence` divisait
  `totalAbsents` par un compte **par ligne** — les lignes `NEUTRE` / `EN_ATTENTE` /
  `HORS_PLAN` auraient **dilué silencieusement le taux d'absentéisme**. Elles sont exclues du
  dénominateur. `GET /temps-presences/pointages` borne désormais la plage à **92 jours**
  (une requête Mongo par jour).
- ⚠ **Effet de bord sur le calendrier de planning terrain**, à connaître : `calendrier-planning`
  estompe un jour dès qu'il trouve une ligne `ABSENT` ou `CONGE` pour le couple
  employé/jour. Un agent qui honore un site et en manque un autre produit désormais
  **`PRESENT` + `ABSENT`** le même jour, là où l'ancien modèle ne produisait aucune ligne
  `ABSENT` : sa journée est donc estompée alors qu'elle ne l'était pas. C'est plus fidèle
  (il a bien manqué un créneau), mais c'est un changement visible. Le composant lui-même est
  **inchangé** ; il reçoit simplement plus de lignes (volume ~×nombre de sites, sa fenêtre
  restant sous le plafond de 92 jours).
- ⚠ **Au déploiement les chiffres changent pour tout le monde** : plus de lignes (une par
  site), des retards jusqu'ici faux qui disparaissent, des lignes `HORS_PLAN` qui
  apparaissent. À annoncer, comme les bascules de soldes de congés.
- **Hors périmètre, connu** : `RecapitulatifMensuelService` fige toujours `nombreRetards` à 0
  avec un commentaire devenu faux (« DossierEmploye ne porte pas d'heure de début » — les
  affectations en portent). Lot dédié.
- Backend : branche `feature/affectation-dates-et-jours-par-site` (depuis `main`).

#### Congés — circuit de validation à 3 niveaux + notifications

Une demande de congé n'est plus tranchée par un décideur unique : elle remonte
**le supérieur hiérarchique du demandeur → la RH → la Direction générale**, chaque
niveau étant notifié par e-mail. Statuts :
`EN_ATTENTE_SUPERIEUR → EN_ATTENTE_RH → EN_ATTENTE_DG → APPROUVE`, un refus à
n'importe quel niveau étant **terminal** (`REFUSE`, motif obligatoire).

**Rôles.** Niveau 1 = l'employé désigné comme `superieurHierarchiqueId` du demandeur
(pas un rôle). Niveau 2 = le rôle **`RH` existant**. Niveau 3 = **`SUPERADMIN`** — *la
Direction générale est le super-admin*, **aucun rôle `DIRECTION_GENERALE` n'existe ni
ne doit être créé** (l'alias `ROLE_DIRECTION_GENERALE` de
[roles.constants.ts](src/app/constants/roles.constants.ts) pointe sur `ROLE_SUPERADMIN`,
il n'est là que pour la lisibilité). `SUPERADMIN` peut agir à tous les niveaux.

**Périmètre de visibilité.** Une demande de congé n'est visible que par **son demandeur**,
par **son supérieur hiérarchique** (subordonné direct dans l'organigramme **ou** validateur
figé sur la demande), par la **RH** et par le **super-admin** — ces deux derniers gardant la
vue complète, sans laquelle ils ne pourraient pas instruire les niveaux 2 et 3.

- Le filtrage est **serveur**, unique point de vérité : record
  `services/rh/PerimetreConges` (`voitTout` / `moi` / `employesVisibles`, +
  `voitEmploye()` / `voitDemande()`) résolu par **`CongeIdentiteService.perimetreLecture()`**
  et branché sur `DemandeCongeService.searchDemandes` / `getSoldes` / `getSolde` /
  `getByEmployeId` et `CongeWorkflowService.getPourAppelant`. `mesDemandes`,
  `demandesAValider` et `compteurs` étaient déjà scopés — inchangés.
- ⚠ **`RhAbsenceService` est filtré au même titre** (`search`, `getAll`, `getByEmployeId`,
  `requireById` — donc aussi update/delete/justificatif — et `create`). L'onglet
  « Déclarations » est servi par une autre collection : sans cette garde, la restriction
  posée sur les congés serait contournable en un clic depuis l'onglet voisin de la
  **même rubrique**.
- ⚠ **Le validateur figé fait partie du périmètre** (`voitDemande(employeId,
  superieurHierarchiqueId)`) : après une réorg, le supérieur désigné à la création doit
  pouvoir ouvrir la demande dont il a reçu le lien par e-mail, alors qu'il n'est plus le
  manager courant du demandeur.
- ⚠ **Compte non rattaché à un `DossierEmploye` ⇒ périmètre vide**, jamais total.
- ⚠ **Filtrer avant de paginer** : le filtre s'applique en tête de chaîne, sur l'entité,
  pour que `totalElements` reflète le périmètre (filtrer après donnerait des pages
  partiellement vides et un compteur faux).
- ⚠ **Perf** : `CurrentUserProvider.currentRole()` déclenche 1 à 2 lectures Mongo — **un
  seul `perimetreLecture()` par méthode publique**, le résultat circule en variable locale ;
  jamais `estRh()`/`estSuperAdmin()` dans un stream de filtrage.
- Côté front, `CongePermissionsService.voitTousLesConges()` / `voitPlusieursEmployes()`
  sont **purement cosmétiques** (bandeau de rappel, masquage des filtres Département /
  Recherche / Employé et de la colonne Employé, et non-chargement du trombinoscope de
  `liste-absences`). ⚠ Parti pris **inverse du reste du service** : profil non résolu ⇒
  **restrictif**. Les `<th>` et `<td>` masqués vont **par paire**, sinon les colonnes se
  décalent.
- Codes : **403** (`CongeAccesRefuseException`) sur `GET /demandes/{id}`,
  `GET /soldes/{employeId}`, `GET /demandes/employe/{id}` et les routes `/absences`
  correspondantes, hors périmètre.
- 📄 **Audit de conformité** (2026-09-02) : [docs/backend/conges-perimetre-validation.md](docs/backend/conges-perimetre-validation.md)
  — chaîne d'application complète du périmètre (claim JWT → file de validation → 403), et **trois
  écarts non traités**, dont le plus sérieux : **`PUT /demandes/{id}` n'a aucune garde**
  (`DemandeCongeService.update` : ni périmètre, ni habilitation, ni contrôle de statut — tout
  compte authentifié peut modifier la demande d'autrui, même approuvée).

**Front.** Constantes centralisées dans [conges.constants.ts](src/app/constants/conges.constants.ts)
(libellés/couleurs de statut, niveaux, actions, topics WS, `PARAMETRES_CONGES`) — les maps
inline des composants ont été supprimées. Point unique de vérité des habilitations :
[conge-permissions.service.ts](src/app/services/conge-permissions.service.ts) (+ spec,
21 tests), consommé par `calendrier-conges`, `validation-conges`, `detail-demande-conge`,
`mes-demandes` et `demande-conge`. Nouveaux écrans : **`detail-demande-conge`** (fiche +
stepper des 3 niveaux) et **`mes-demandes`** (auto-service). Le `window.prompt` du refus est
remplacé par `dialogs/refus-conge-dialog` (motif ≥ 10 car.) et le `ConfirmDialogComponent`
de l'approbation par `dialogs/valider-conge-dialog`, qui **transmet enfin le commentaire**
que l'API acceptait sans jamais le recevoir.

- ⚠ **Le front ne calcule jamais l'habilitation** : il consomme `DemandeConge.peutValiderParMoi`
  et `MonProfilConge.niveauxValidables`, calculés serveur. Le JWT ne portant **ni `id` ni
  `employeId`**, « qui suis-je » et « de qui suis-je le supérieur » passent obligatoirement par
  `GET /moi` et `GET /demandes/a-valider` — aucun calcul de subordonnés côté client
  (ce serait un `getEmployes(0, 500)` faux au-delà de 500 employés). Tant que ces champs sont
  absents, le service de permissions est **permissif sur le niveau 1** (repli `TODO` commenté,
  calqué sur `estProprietaire()` du module Stock) et strict sur les niveaux gouvernés par un rôle.
- Le **timeline est spécifique aux congés** ([shared/timeline-validation-conge](src/app/adminPage/ressources-humaines/temps-et-presences/calendrier-conges/shared/timeline-validation-conge.component.ts))
  et **ne réutilise pas** `timeline-workflow` du stock : celui-ci n'affiche qu'un journal
  d'actions passées, alors qu'on rend ici les 3 étapes en permanence — y compris celles à venir
  et l'étape *sautée*. Le généraliser aurait imposé de toucher 3 écrans stock livrés.
- Les actions réservées par rôle sont **masquées** (pas grisées) dans la file de validation —
  sans quoi la restriction serait contournable en un clic, comme pour le Kanban stock.
- **RBAC** : 2 sous-flags ajoutés sous `rh` — `congesValidation` (file de validation) et
  `congesMesDemandes`. Tous deux agrégés dans `sidebar.accessTempsPresences()`, sans quoi un
  profil n'ayant que ce droit perdrait tout le sous-menu (même piège que `rh.contrats`).

**Backend : ✅ implémenté** dans [Pointage-Cleanic-Backend](../Pointage-Cleanic-Backend), branche
`feature/conges-validation-3-niveaux` (partant de `main`). Classes clés : `CongeIdentiteService`
(résolution e-mail JWT → dossier employé), `CongeWorkflowService` (transitions + habilitations),
`CongeNotificationService` (STOMP), `CongeMailNotificationService`, `CongeCalendrier` (jours ouvrés),
`CongeStatutMigrationRunner`. Le **périmètre de visibilité** (voir ci-dessus) est livré par-dessus,
sur `feature/conges-perimetre-visibilite` — branchée sur `feature/conges-validation-3-niveaux`,
pas sur `main` (qui n'a pas encore le module congés). ⚠ La branche redéclare `app.frontend.base-url` et le correctif
d'expéditeur d'`EmailService`, déjà présents sur `feature/notification-mail-bons` — **conflit trivial
attendu au merge des deux branches**.

**Périmètre de dépôt — le champ « Employé » du formulaire de demande.** Distinct du périmètre
de *visibilité* ci-dessus, et **volontairement plus étroit**. Le champ est désormais **toujours
rendu** (il ne l'était que pour `RH`/`SUPERADMIN`), et son contenu vient d'un endpoint dédié :

| Profil | Liste reçue |
|---|---|
| `RH`, `SUPERADMIN` | tous les employés non sortis (inchangé) |
| `EXPLOITATION` | lui-même **et ses subordonnés directs** |
| tout autre profil | lui-même seul |
| compte non rattaché à un `DossierEmploye` | **vide**, jamais totale |

- ⚠ **Encadrer ne suffit pas : seul le rôle ouvre le droit.** Un manager `BACKOFFICE` *voit* les
  congés de son équipe (`perimetreLecture`) mais ne peut **pas** en *déposer* pour elle. D'où un
  **`CongeIdentiteService.perimetreDepot()` séparé**, et non une réutilisation de
  `perimetreLecture()` — les confondre ouvrirait le dépôt pour autrui à tout encadrant. Il porte
  aussi une surcharge `perimetreDepot(DossierEmploye)` pour les appelants qui tiennent déjà le
  dossier (économie d'une lecture Mongo, cf. la règle « un périmètre par méthode publique »).
- ⚠ **`POST /demandes` a été assoupli en conséquence** : la garde de `resoudreDemandeur` passe de
  `peutCreerPourAutrui()` (RH/SUPERADMIN) à `perimetreDepot(moi).voitEmploye(cible)`. Sans quoi le
  champ serait un piège — il proposerait des subordonnés que la création refuserait en 403. La
  garde reste posée **avant** le `findById`, un 404 distinct du 403 divulguant l'existence du
  dossier. `ROLE_EXPLOITATION` **existait déjà** (assignable dans `gestion-privilege`), rien à
  créer côté rôles ; il gagne juste sa constante dans [roles.constants.ts](src/app/constants/roles.constants.ts).
- ⚠ **Route sous `/conges/`, pas sous `/gestion-personnel/`** : un compte `EXPLOITATION` n'a pas le
  droit de lecture du référentiel employés — un filtre `superieurHierarchiqueId` ajouté à
  `GET /gestion-personnel/employes` lui aurait valu un 403. Elle remplace le `getEmployes(0, 500)`
  **sans filtre** que faisait le formulaire, qui était de toute façon faux au-delà de 500 employés.
- Côté front, `peutCreerPourAutrui()` s'élargit à `EXPLOITATION` mais devient **purement
  cosmétique** (un libellé) : le formulaire décide de rendre un `<select>` ou un champ figé sur la
  **longueur de la liste reçue**, jamais sur le rôle. `voitTousLesConges()` /
  `voitPlusieursEmployes()` sont **inchangés** — ils gouvernent la *lecture*, pas le dépôt.
- ⚠ **Aucune présélection quand la liste dépasse un employé** : déposer au nom d'un tiers est un
  acte délibéré, un demandeur pré-rempli s'enverrait par mégarde. À un seul choix, le champ est
  `disable()` — donc **lu par `form.getRawValue()`**, un contrôle désactivé sortant de `form.value`.
- Backend : branche `feature/conges-employes-selectionnables`, partant de **`main`** (le module
  congés y est déjà, contrairement à ce que laissait entendre la section précédente).

**Endpoints backend** (base `${environment.apiUrl}/temps-presences/conges`) :

| Méthode | URL | Corps / params | Réponse |
|---|---|---|---|
| GET | `/moi` | — | `MonProfilConge` (employeId, supérieur, `niveauxValidables[]`, `nbDemandesAValider`) |
| GET | `/employes-selectionnables` | — | `EmployeSelectionnable[]` — non paginé, borné serveur (voir « Périmètre de dépôt ») |
| GET | `/demandes` | `page,size,employeId,departement,statut(*n),niveau,type,dateDebut,dateFin,q` | `Page<DemandeConge>` |
| GET | `/demandes/mes-demandes` | `page,size,…` | demandes de l'appelant (résolu par le JWT) |
| GET | `/demandes/a-valider` | `page,size,niveau?` | **uniquement** ce que l'appelant peut trancher maintenant, `peutValiderParMoi=true` sur chaque ligne |
| GET | `/demandes/a-valider/compteurs` | — | `{ total, parNiveau: { SUPERIEUR, RH, DIRECTION_GENERALE } }` |
| GET | `/demandes/{id}` | — | `DemandeConge` **avec `historique[]`** et `peutValiderParMoi` |
| POST | `/demandes` | `{ type, dateDebut, dateFin, motif?, employeId? }` | `DemandeConge` (201) |
| PUT / DELETE | `/demandes/{id}` | — | modification / passage en `ANNULE` |
| POST | `/demandes/{id}/valider` | `{ commentaire? }` | statut avancé d'un cran |
| POST | `/demandes/{id}/refuser` | `{ motif }` (≥ 10 car.) | `REFUSE` |
| POST | `/demandes/{id}/approuver` | *alias `@deprecated` de `/valider`, à conserver une release* | |

**Règles serveur** (le front n'est qu'une commodité UX) :

- **Le niveau n'est jamais fourni par le client** : `/valider` le déduit du statut courant et
  vérifie que l'appelant est habilité à ce niveau.
- **403** — `/valider` ou `/refuser` si l'appelant n'est ni le `superieurHierarchiqueId` de la
  demande (N1), ni de rôle `RH` (N2), ni `SUPERADMIN` (N3) ; `POST /demandes` avec un `employeId`
  hors du **périmètre de dépôt** de l'appelant (cf. section dédiée) ; `DELETE` sur la demande
  d'autrui hors `RH`/`SUPERADMIN`.
- **409** — transition sur un statut terminal ou dont le niveau courant n'est pas celui de
  l'appelant (course entre deux RH). Message exploitable : `{ "message": "Demande déjà traitée au niveau RH." }`.
- **422** — motif absent/trop court ; solde insuffisant (type `ANNUEL`) ; `dateFin < dateDebut` ;
  chevauchement avec une demande approuvée ; compte non rattaché à un `DossierEmploye`.
- **Sans supérieur hiérarchique** : statut initial `EN_ATTENTE_RH`, `niveauSuperieurIgnore = true`,
  entrée d'historique « Niveau ignoré — aucun supérieur hiérarchique renseigné ».
  **Ne jamais bloquer la demande.**
- `superieurHierarchiqueId/Nom` sont **figés à la création** — un changement d'organigramme ne doit
  pas rerouter une demande en vol. `decision*` et `historique[].auteur*` sont renseignés serveur
  depuis le JWT, jamais acceptés du client.
- **Migration** (`CongeStatutMigrationRunner`, idempotent) : les demandes existantes en `EN_ATTENTE`
  passent en `EN_ATTENTE_SUPERIEUR` (ou `EN_ATTENTE_RH` sans supérieur) ;
  `decideur*`/`dateDecision`/`commentaireDecision` sont convertis en une entrée d'historique. La
  valeur `EN_ATTENTE` reste tolérée en lecture par le front
  (`NIVEAU_PAR_STATUT['EN_ATTENTE'] = 'SUPERIEUR'`).
- **Solde et décompte** — `enCours` compte les **4** statuts d'attente, et `computeNombreJours`
  exclut samedi et dimanche : le décompte était en jours *calendaires* alors que le solde est en
  jours *ouvrés*, si bien que le solde se vidait trop vite. ⚠ Les **jours fériés restent
  décomptés** — l'ancien référentiel des fériés a été supprimé et une liste en dur serait pire
  qu'une limite documentée.
- **Acquis dynamique — 2 jours ouvrables par mois de service effectif** (droit sénégalais, 24 j
  pour une année pleine), via `app.conges.jours-acquis-par-mois`. Remplace le forfait annuel
  (`jours-acquis-par-an`, 22), qui accordait autant de jours à un employé embauché le 15 novembre
  qu'à un employé présent toute l'année. Le calcul est porté par
  **`services/rh/CongeAcquisCalculator`** — composant **pur** (aucun accès base, « aujourd'hui »
  passé en paramètre), pinné sur dates figées par `CongeAcquisCalculatorTest`.
  - ⚠ **Mois révolus, de quantième à quantième** : entré le 15/03, au 02/09 → 5 mois (15/03→15/08),
    pas 6. La borne d'un exercice est le **1er janvier suivant, exclu** — avec le 31 décembre,
    `MONTHS.between` rend 11 et ampute d'un mois toute année pleine.
  - ⚠ **`dateEntree` nulle** (dossiers antérieurs, le champ n'a jamais été `@NotNull`) : l'employé
    est réputé présent depuis le 1er janvier, et son **report est nul** — sans date d'entrée il
    n'existe aucune base pour reconstituer un historique, et en inventer un créditerait des jours
    à tort (même arbitrage prudent que le `type` nul de `decompteLeSolde`).
  - Côté front, `PARAMETRES_CONGES.joursAcquisParMois` est un **miroir d'affichage** au même titre
    que `TYPES_DECOMPTES_DU_SOLDE` : il ne sert qu'à composer un libellé, le serveur renvoyant
    déjà `acquis` **et `moisAcquis`**. Le front ne recalcule jamais de droits.
- **Solde antérieur — le reliquat N-1 est désormais calculé, plus perdu.** `SoldeCongeDto` expose
  **`soldeAnterieur`** : `Σ [ acquis(a) − prisApprouvés(a) ]` de l'année d'entrée à N-1,
  **ajouté au disponible** — `solde = max(0, soldeAnterieur + acquis − pris − enCours)`.
  - ⚠ **Le plancher à 0 porte sur le TOTAL du report**, pas année par année : un dépassement en
    2024 doit s'imputer sur le reliquat 2025, sinon le report serait systématiquement surévalué.
  - ⚠ **Seul `APPROUVE` ampute un exercice clos** : une demande restée en attente depuis 2024 ne
    sera jamais tranchée, la geler amputerait un reliquat pour rien.
  - ⚠ **`soldeAnterieur` est INCLUS dans `solde`** — l'additionner compterait les jours deux fois.
    C'est ce que disent l'infobulle et la note de pied sur les 5 écrans qui l'affichent.
  - `buildSolde` fait désormais **une seule** lecture (`findByEmployeId`) et groupe par année ;
    `findByEmployeIdAndDateDebutBetween` est **supprimé du repository**, plus aucun appelant.
- ⚠ Au déploiement, **les soldes affichés changent pour tout le monde, et dans les deux sens** :
  l'acquis chute en début d'exercice (2 j en février au lieu de 22) mais le reliquat antérieur
  apparaît pour les anciens. À annoncer aux utilisateurs, comme les bascules précédentes.
- **Types de congé et décompte du solde** — 7 valeurs :
  `ANNUEL`, `MATERNITE`, `PATERNITE`, `REPOS_MEDICAL`, `SANS_SOLDE`, `EXCEPTIONNEL`,
  `ABSENCE_NON_JUSTIFIEE`. **Seul `ANNUEL` ampute les jours acquis.** La règle est portée par
  l'**enum serveur lui-même** (`TypeConge(libelle, decompteSoldeAnnuel)`) et non par un `if` dans
  le service, pour qu'ajouter un type oblige à trancher la question ; `DemandeCongeService.buildSolde`
  filtre `pris` **et** `enCours` sur `decompteSoldeAnnuel()`. ⚠ Un `type` **nul** (données
  antérieures, `DemandeCongeDto.type` n'a pas de `@NotNull`) est **compté** : sous-estimer un solde
  est moins grave que d'en créditer à tort. ⚠ Cela corrige au passage une anomalie préexistante —
  maternité, paternité, sans solde et exceptionnel s'imputaient sur les congés payés : **au
  déploiement les soldes affichés remontent** pour les employés concernés, à annoncer. Côté front,
  `TYPES_DECOMPTES_DU_SOLDE` + `decompteLeSolde()` ([conges.constants.ts](src/app/constants/conges.constants.ts))
  sont un **miroir d'affichage** (mention « Ce type de congé n'est pas décompté du solde annuel »
  sous le select du formulaire, note en pied des deux blocs de solde) — le serveur reste l'autorité,
  toute évolution de la règle doit être répercutée des deux côtés. L'enum porte aussi un `libelle`
  accentué, utilisé par `CongeMailNotificationService` et `PointageCentraliseService` là où le
  `name()` brut sortait auparavant (« Repos medical » sans accent, « ABSENCE_NON_JUSTIFIEE »).
  ⚠ Le pointage centralisé range **toute** demande sous le statut `CONGE`, y compris désormais une
  absence non justifiée — sémantiquement discutable, non traité.
- ⚠ **Le solde affiché reste celui de l'exercice courant.** `buildSolde` est câblé sur
  `LocalDate.now().getYear()` : il n'existe **aucun paramètre d'année** sur `/soldes`,
  `/soldes/{id}` ni `/soldes/moi`, et **aucune historisation des soldes** en base. Les exercices
  antérieurs ne remontent que **cumulés** dans `soldeAnterieur`, jamais consultables un par un —
  c'est la raison pour laquelle l'onglet Congés de la fiche employé n'ouvre **pas** de sélecteur
  d'année. Le rétroactif est néanmoins fidèle : 2 j × mois de service est déterministe année par
  année, là où l'ancien forfait annuel configurable aurait recalculé 2024 avec les paramètres
  d'aujourd'hui.
- ⚠ **Écart connu : le 422 « solde insuffisant » n'est pas implémenté.** `CongeWorkflowService` ne
  lit jamais le solde et le formulaire ne pose aucun validateur — le solde est **indicatif**, et
  rendre le report consommable ne change donc rien au comportement de dépôt. À trancher dans un
  lot dédié (la table des règles serveur plus bas l'annonce à tort).
- ⚠ **Bug latent, non traité : l'onglet « Déclarations » est désynchronisé du serveur.**
  [absence.model.ts](src/app/models/absence.model.ts) propose `ANNUEL` et `SANS_SOLDE`, qui
  **n'existent pas** dans l'enum serveur `TypeAbsence` (`CONGE_PAYE, MALADIE, PERMISSION,
  INJUSTIFIEE, AUTRE`), et masque `MALADIE`, `PERMISSION` et `INJUSTIFIEE`. Déclarer un congé
  « Annuel » échoue donc à la désérialisation. À traiter dans un lot dédié, en décidant du sort des
  déclarations déjà enregistrées avec les anciennes valeurs.
- **Claims JWT** : ajouter `modules.rh.congesValidation` et `modules.rh.congesMesDemandes`.
  `congesValidation` doit être **vrai automatiquement** pour tout compte dont le `DossierEmploye`
  a au moins un subordonné, ainsi que pour les rôles `RH` et `SUPERADMIN` — le calcul se fait à
  l'émission du JWT, la sidebar ne fait aucun calcul. Le claim legacy `rh: true` reste traité comme
  « accès RH complet ». **Aucun nouveau rôle à émettre.**

**Matrice e-mails** (HTML, tolérante aux pannes SMTP — un échec n'annule jamais la transition ;
adresse = adresse de connexion du compte) :

| Transition | Destinataire (action attendue) | En copie |
|---|---|---|
| Création (→ `EN_ATTENTE_SUPERIEUR`) | supérieur hiérarchique | demandeur (accusé) |
| Création sans supérieur (→ `EN_ATTENTE_RH`) | tous les comptes `RH` | demandeur |
| Validation N1 (→ `EN_ATTENTE_RH`) | tous les comptes `RH` | demandeur, supérieur |
| Validation N2 (→ `EN_ATTENTE_DG`) | tous les comptes `SUPERADMIN` | demandeur, supérieur, RH décideur |
| Validation N3 (→ `APPROUVE`) | demandeur | supérieur, RH, DG |
| Refus (tout niveau, → `REFUSE`) | demandeur (**motif dans le corps**) | supérieur + RH + validateurs déjà passés |
| Annulation par le demandeur | validateur du niveau courant | RH |

Contenu commun : nom/matricule du demandeur, type, période `dd/MM/yyyy`, nombre de jours, solde
restant, motif de la demande, décisions déjà rendues, bouton « Ouvrir la demande ». Le lien est
construit serveur depuis `app.frontend.base-url` + **`/admin/rh/temps-et-presences/conges/demandes/{id}`**
— ⚠ comme pour les mails de bons, **si cette route front change, les liens des mails cassent**
(un commentaire le rappelle dans [app.routes.ts](src/app/app.routes.ts)).

**WebSocket** : publier `NotificationValidationConge` sur `/topic/conges-validations` (broadcast à
chaque transition) et `/user/queue/notifications-conges` (ciblé vers les validateurs du niveau
désormais attendu, puis vers le demandeur à l'issue). Consommé par `validation-conges` (toast +
rechargement de la file), `detail-demande-conge` et `calendrier-conges`/`mes-demandes`.

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

> **Navigation (sidebar) :** depuis la réorganisation du menu, les deux sous-modules
> n'apparaissent plus sous un même parent « Exploitation ». Désormais :
> - **5.1 Production Chimie** est présenté sous un menu de premier niveau **Industrie**
>   (icône `Factory`, gate `accessIndustrie()` → délègue à `accessProductionChimie()`,
>   dropdown `openDropdownIndustrie`).
> - **5.2 Terrain** reste sous le menu **Exploitation** (icône `MapPinned`, gate
>   `accessTerrain()`, sous-menu « Opérations »).
>
> Ce regroupement est **purement visuel** : les routes restent `/admin/exploitation-v2/production-chimie/*`
> et `/admin/exploitation-v2/terrain/*`, et la RBAC (`ModulesAutorises.productionChimie` /
> `.terrain`) est inchangée. Voir [sidebar.component.html](src/app/adminPage/sidebar/sidebar.component.html)
> et [sidebar.component.ts](src/app/adminPage/sidebar/sidebar.component.ts).

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

**Corrections ultérieures (Formulation — automatisations MA / eau qsp / contrôle du total) :**
Trois calculs automatiques ajoutés au formulaire de formulation, **dérivés des ingrédients saisis, jamais persistés** (recalculés à la lecture côté serveur et à la volée côté client via [production-formulation-calcul.ts](src/app/services/production-formulation-calcul.ts), miroir du `FormulationCalculService` backend en `BigDecimal`).
- **Matière première** — 2 champs ajoutés à [MatierePremiere](src/app/models/production-matiere-premiere.model.ts) : `matiereActivePct?` (concentration en actif, nombre 0–100) et `compterDansMa?` (booléen : c'est la case qui décide, pas la valeur de MA — eau/sel/parfum exclus même à MA=100). Édités dans [formulaire-matiere](src/app/adminPage/exploitation-v2/production-chimie/matieres-premieres/formulaire-matiere/), colonne « Mat. active » dans la liste.
- **Ligne d'ingrédient** — 2 booléens ajoutés à `IngredientFormulation` : `ingredientComplement?` (ligne « qsp », ex. eau : quantité **calculée**, dosage en lecture seule, **≤ 1 par formule** sinon 422) et `qs?` (« quantité suffisante », ex. soude : ignorée par tous les calculs). `dosage` devient **optionnel**. Bandeau de synthèse (MA kg + %, eau qsp, total saisi vs lot avec code couleur **vert/rouge**, avertissements) recalculé sur `valueChanges`.
- **A. Matière active** : `MA(kg) = Σ(dosage × matiereActivePct/100)` des lignes comptées ; `%MA = MA/quantiteRef × 100` (base = **taille du lot**). MP cochée sans MA → comptée 0 + avertissement (non bloquant).
- **B. Eau qsp** : `eau = quantiteRef − Σ(autres lignes non-qs)` ; eau négative → non affichée + avertissement. La quantité d'une ligne complément n'est **jamais stockée** (le backend la remet à `null` avant save).
- **C. Contrôle du total** : **informatif** (jamais bloquant sauf ≥ 2 lignes qsp). Tolérance (défaut ± 0,1 %) via le **paramétrage global** singleton serveur `GET/PUT /production-chimie/parametres` ([ProductionParametresService](src/app/services/production-parametres.service.ts)), repli `TOLERANCE_TOTAL_DEFAUT_PCT` dans [production-chimie.constants.ts](src/app/constants/production-chimie.constants.ts).
- ⚠️ **Le jeu de référence Détergent V5 du cahier des charges annonce eau = 813 kg par erreur** : la somme des 8 ingrédients non-eau vaut 181 kg → eau exacte = **819 kg** (1000 − 181). L'implémentation et les tests retiennent 819. Le reste du CDC est correct (MA = 111,16 kg → 111,2 ; %MA = 11,12 %).
- Formats `fr-FR` : kg à 1 décimale, % à 2 décimales. Backend séparé ([Pointage-Cleanic-Backend](../Pointage-Cleanic-Backend), branche `feature/formulation-automatisations`).

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
| `planning/` | calendrier-planning, liste-affectations, formulaire-affectation, fiche-affectation, detection-conflits + `dialogs/annuler-affectation-dialog` | FullCalendar drag&drop CDK + détection conflits temps réel + suivi des affectations par statut et annulation motivée (voir ci-dessous) |
| `pointage/` | suivi-pointages, historique-pointages, fiche-pointage | Le pointage réel est saisi par l'agent depuis la page d'accueil (boutons Arrivée/Départ → code-PIN, modèle `Pointage` via `PointageService`) — pas de création depuis le terrain. `suivi-pointages` affiche les pointages du jour (table de l'ancien module, recherche + pagination, rafraîchissement auto 30 s). `historique-pointages`/`fiche-pointage` restent sur l'ancien modèle GPS `PointageTerrain` (en sursis) |
| `alertes/` | tableau-alertes, recapitulatif-quotidien, parametres-escalade | Alertes WebSocket (topics `/topic/alertes-terrain`, `/user/queue/notifications-terrain`) + workflow escalade superviseur → responsable → DG |
| `fiches-intervention/` | liste, formulaire, detail | Rapport de passage avec checklist, produits, photos `moment` AVANT/APRES/AUTRE, signature client `signature_pad`, géoloc, export PDF jsPDF |
| `controle-qualite/` | grilles-evaluation, liste, formulaire, fiche, historique-site | Grilles paramétrables par site (générique ou spécifique), notation slider 1-5 pondérée, line chart ng2-charts d'évolution |
| `materiel/` | liste, formulaire, suivi-maintenance, historique-materiel + 3 dialogs (Affecter, Programmer, Déclarer) | Inventaire avec alertes maintenance préventive 3 niveaux (CRITIQUE/ATTENTION/INFO), FullCalendar maintenances, timeline événements |
| `phytosanitaire/` | calendrier-phyto, produits, formulaire-application, registre, alertes-delais | Référentiel produits homologués (n° AMM), calendrier coloré par catégorie, registre exportable PDF/Excel pour audits, alertes délais réentrée et nouvelle application |
| `tableau-bord/` | tableau-bord-terrain | KPIs (couverture, satisfaction, incidents) + 4 charts ng2-charts (bar, line × 2, doughnut) + comparaison N vs N-1 + exports Excel/PDF |

**Corrections ultérieures (Planning) :**
- **Suivi des affectations par statut** — la page `liste-affectations` (route
  `planning/affectations`, désormais exposée dans la sidebar sous « Affectations »,
  même garde RBAC `terrain.planning` que « Planning ») remplace le `<select>` statut
  par des **onglets à compteurs** (Toutes / Planifiées / En cours / Effectuées /
  Annulées / Remplacées). Les compteurs proviennent d'un `forkJoin` de 6 appels
  `listerAffectations(0, 1, …)` dont seul `totalElements` est lu ; ils ne sont
  rechargés que lorsque les **dates** changent (le changement d'onglet ne recharge
  que la liste). Optimisation possible côté serveur : un
  `GET /terrain/planning/affectations/stats?dateDebut&dateFin` renvoyant
  `Record<StatutAffectation, number>` en un seul appel.
- **Annulation motivée** — nouvelle action « Annuler » (icône `CircleX`) sur la liste
  et la fiche, visible uniquement pour les statuts `PLANIFIEE` / `EN_COURS`
  (constante `STATUTS_AFFECTATION_ANNULABLES`). Elle ouvre le dialog
  `planning/dialogs/annuler-affectation-dialog` qui impose un motif d'au moins
  5 caractères, puis appelle `TerrainPlanningService.annulerAffectation(id, motif)`.
  L'affectation est **conservée** (statut `ANNULEE`), contrairement à la suppression
  qui reste disponible séparément. La fiche affiche un panneau « Annulation »
  (motif, date, auteur) calqué sur le panneau « Remplacement ».
  ✅ **Endpoint backend livré** (sur `main`) : `POST /api/terrain/planning/affectations/{id}/annuler`
  body `{ motif: string }` → passe `statut` à `ANNULEE`, persiste `motifAnnulation`,
  `dateAnnulation` et `annuleParNom` (déduit du JWT), renvoie l'affectation mise à jour,
  et refuse en **409/422** si le statut courant n'est ni `PLANIFIEE` ni `EN_COURS`.
  Champs correspondants ajoutés à `AffectationAgent` + payload `AnnulationAffectationPayload`.
- L'ordre des statuts est centralisé dans `ORDRE_STATUTS_AFFECTATION`
  ([terrain.constants.ts](src/app/constants/terrain.constants.ts)) — les tableaux
  `STATUTS` qui étaient dupliqués dans liste / calendrier / formulaire ont été supprimés.

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

**Statut : ✅ Terminé (frontend)** — 5 fonctionnalités. Bilan : **11 composants** + **2 partagés**, **10 services**, **9 modèles**, 1 fichier de constantes. Reste à faire côté serveur (endpoints listés plus bas).

| Sous-module | Composants | Rôle |
|---|---|---|
| `catalogue-produits/` | liste-produits, formulaire-produit, fiche-produit, arborescence-categories, import-produits-modal | Référentiel produits (5 types), catégories arborescentes (lazy expand), upload photo + fiche technique PDF, import/export Excel, **édition inline du seuil d'alerte** (colonne *Seuil*, à droite de *Stock*) |
| `inventaires/` | liste-inventaires, planification-inventaire, saisie-inventaire | Workflow BROUILLON→COMPTAGE→VALIDATION→CLOTURE, écart auto, justification au-delà du seuil, PV PDF |
| `synthese-mensuelle/` | synthese-mensuelle | Stock initial/entrées/sorties/final par produit, **comparaison de plusieurs mois** + filtre de flux, chart ng2-charts, exports PDF/Excel |
| `approvisionnement-auto/` | approvisionnement-auto | Suggestions (seuil + conso moyenne sur N mois), quantités éditables, bon de commande prévisionnel PDF |
| `tableau-bord-stocks/` | tableau-bord-stocks | KPIs (valeur FCFA, ruptures, alertes, rotation, dormants) + 4 charts (donut, line, bar, table dormants), exports PDF/Excel |

**Composants partagés** (`stocks-approvisionnement/shared/`) : `selecteur-produit`, `selecteur-site` (ControlValueAccessor, autocompletes).

**Services** (préfixe `stock-v2-`, dans [src/app/services/](src/app/services/)) :
`stock-v2-produit`, `stock-v2-categorie`, `stock-v2-etat-stock` (réduit à la seule méthode
`majSeuil()`), `stock-v2-inventaire`, `stock-v2-synthese`, `stock-v2-approvisionnement`,
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

**RBAC** : flag `stock?` optionnel dans [ModulesAutorises](src/app/models/admin.model.ts) avec 5 sous-flags
(catalogue, inventaires, synthese, approvisionnement, tableauBord). Backend doit
ajouter `modules.stock` au claim JWT pour activer le menu en production.

**Endpoints backend à prévoir** (⚠️ base réelle = `${environment.apiUrl}/stock/…`, soit `/api/stock/…` — **PAS** `/stock-v2/`. Les 7 services HTTP appellent ces routes ; les 3 services Excel/PDF — `stock-v2-import-excel`, `stock-v2-export`, `stock-v2-pdf` — sont **100 % client, aucun endpoint**) :

| Domaine (service) | Endpoints attendus |
|---|---|
| **Produits** (`stock-v2-produit`) | `GET /stock/produits` (filtres q, typeProduit, categorieId, fournisseur, sousSeuil, actif — paginé) · `GET /stock/produits/actifs` (liste légère) · `GET /stock/produits/{id}` · `POST /stock/produits` (multipart : blob JSON `produit` + `photo` + `ficheTechnique`) · `PUT /stock/produits/{id}` (multipart) · `DELETE /stock/produits/{id}` · `GET /stock/produits/{id}/fiche-technique` (blob) · `GET /stock/produits/{id}/photo` (blob) · `POST /stock/produits/bulk` (import **transactionnel all-or-nothing**) |
| **Catégories** (`stock-v2-categorie`) | `GET /stock/categories/racines` · `GET /stock/categories/enfants?parentId=` (lazy) · `GET /stock/categories` (liste plate) · `GET /stock/categories/{id}` · `POST` · `PUT /{id}` · `DELETE /{id}` |
| **État de stock** (`stock-v2-etat-stock`) | `PUT /stock/etat-stock/seuils` (seuil global produit si `siteId` omis, sinon raffiné par site) · `GET /stock/etat-stock/produit/{produitId}?siteId=` → un `EtatStock` (lecture ciblée, consommée par la colonne « Reste » du bon de sortie — voir 7.4) |
| **Inventaires** (`stock-v2-inventaire`) | `GET /stock/inventaires` (paginé) · `GET /{id}` · `POST` · `PUT /{id}` · `DELETE /{id}` · **transitions** : `POST /{id}/comptage` (fige les qtés théoriques), `PUT /{id}/comptage` (enregistre les comptages), `POST /{id}/validation`, `POST /{id}/cloture` (applique les écarts au stock) |
| **Synthèse** (`stock-v2-synthese`) | `GET /stock/synthese-mensuelle?mois=YYYY-MM&siteId=&categorieId=` |
| **Approvisionnement** (`stock-v2-approvisionnement`) | `GET /stock/approvisionnement/suggestions?nMois=&siteId=&categorieId=&fournisseur=` |
| **Tableau de bord** (`stock-v2-tableau-bord`) | `GET /stock/tableau-bord?dateDebut=&dateFin=&siteId=&produitId=&moisDormance=` (⚠ `produitId`, **pas** `categorieId` — voir corrections ci-dessous) |

**Décisions de modélisation à respecter côté backend** (contrat figé par le frontend ; valeurs littérales exactes des enums dans [stock.constants.ts](src/app/constants/stock.constants.ts) et les modèles `stock-v2-*`) :

- **Produit = référentiel global, sans site.** Le produit ne porte aucun `siteId`. Le stock est tenu **par couple (produitId, siteId)** dans l'état de stock ; un `siteId` absent ⇒ ligne consolidée tous sites. `EtatStock` est recalculé à chaque mouvement.
- **Code produit : saisi manuellement, unique** (champ `code`, contrôle d'unicité serveur). Aucune génération auto imposée par le front.
- **Types de produit (5)** : `PRODUIT_FINI | MATIERE_PREMIERE | CONSOMMABLE | EPI | MATERIEL`.
- **Unités de mesure (10)** : `KG | G | L | ML | PIECE | M2 | M3 | METRE | CARTON | LOT`.
- **Mouvements** (⚠️ plus aucun écran 7.3 ne les crée ni ne les liste — ils sont **générés serveur à la validation des bons de 7.4** et consultés dans 7.6 `valorisation-financiere/cout-mouvements` ; le modèle et les règles ci-dessous restent le contrat) : types `ENTREE | SORTIE | TRANSFERT` ; motifs `ACHAT | PRODUCTION | CONSOMMATION | VENTE | TRANSFERT | AJUSTEMENT | RETOUR | PERTE`. Multi-site via `siteSourceId` (requis SORTIE/TRANSFERT) + `siteDestinationId` (requis ENTREE/TRANSFERT).
  - ⚠ **L'écriture directe n'existe plus côté serveur** : `POST /stock/mouvements` a été **retiré**
    (il appliquait les deltas de stock sans bon, sans validation ni historique de workflow — un
    contournement du circuit entier, ouvert à tout compte authentifié). `MouvementStockService` ne
    dépend plus de `StockBalanceService` : la garantie est **structurelle**, pas seulement une route
    absente, et un test de contrôleur affirme le **405** pour empêcher son rétablissement. Seuls les
    `GET /stock/mouvements` (liste, détail) subsistent, en lecture seule.
  - Un mouvement ne naît donc plus que de **trois chemins tracés** : la validation d'un bon
    (`MouvementBonGenerator`), la clôture d'un inventaire (écarts), et le stock initial à l'import de
    produits. Une **correction** de stock passe par un inventaire (écart justifié puis clôture) ou par
    la **suppression définitive** du document erroné, qui contre-passe son effet.
  - Les **combinaisons type/motif** (ENTREE : ACHAT/PRODUCTION/RETOUR/AJUSTEMENT ; SORTIE :
    CONSOMMATION/VENTE/PERTE/AJUSTEMENT) ne sont plus validées : elles ne contrôlaient qu'une saisie
    utilisateur qui n'existe plus, le code générateur choisissant lui-même des couples valides.
- **Catégories : arborescence par `parentId`** (`null` = racine) + `niveau` (0,1,2…). Pas de chemin matérialisé, lazy-load des enfants. Dénormalisés `nbEnfants` / `nbProduits` attendus pour l'affichage de l'arbre.
- **Statut de stock (calculé serveur)** : `RUPTURE` (qté ≤ 0), `CRITIQUE` (0 < qté ≤ `seuilAlerte`), `OK` (qté > seuil).
- **Inventaire** : workflow strict `BROUILLON → COMPTAGE → VALIDATION → CLOTURE` ; périmètre `TOUS | CATEGORIE | SELECTION` ; écart = `qtePhysique − qteTheorique` (calculé) ; `justification` requise si `|écart| > seuilEcartJustification` (**défaut 5**). La clôture applique les écarts au stock réel.
- **Valorisation** : prix unitaire **fixe** porté par le produit (`prixUnitaire`, FCFA, sans décimales) ; valeur = qté × prixUnitaire. **CMUP/FIFO non implémenté ici**, renvoyé au sous-module 7.6.
- **Import Excel** : `POST /stock/produits/bulk` **transactionnel all-or-nothing** ; validation fail-soft ligne-par-ligne **côté client** avant envoi ; le backend résout `categorieLibelle → id` (création si absente) et crée un mouvement `ENTREE` si `stockInitial` est fourni. Le champ photo n'est pas importable via Excel. 12 colonnes (cf. `COLONNES_TEMPLATE_PRODUIT`).
- **Paramètres par défaut** (`PARAMETRES_STOCK`) : pagination 20 ; photo ≤ 5 Mo (jpeg/png/webp) ; fiche ≤ 10 Mo (pdf) ; horizon appro `nMois = 3` ; dormance tableau de bord `6` mois ; top consommations `10`.
- **Sites en lecture seule** via `TerrainSiteClientService.listerActifs()` (shared `selecteur-site`) — aucune écriture, aucun référentiel agences propre au stock.

**Corrections ultérieures :**
- **Suppression des écrans « Mouvements » et « État du stock »** — les deux sous-modules
  `mouvements-stock/` et `etat-stock/` ont été supprimés (composants, routes, entrées de sidebar,
  flags RBAC `stock.mouvements` / `stock.etatStock`, service `stock-v2-mouvement`). La saisie
  directe d'un mouvement faisait doublon avec les **bons de 7.4**, seul chemin légitime — aucun
  mouvement ne doit affecter le stock sans passer par le workflow de validation ; leur consultation
  reste offerte par 7.6 (`valorisation-financiere/cout-mouvements`). Les quantités par produit sont
  déjà dans le catalogue (`quantiteTotale`) et les alertes RUPTURE/CRITIQUE dans le tableau de bord.
  ⚠ Les **modèles** `stock-v2-mouvement.model.ts` et `stock-v2-etat-stock.model.ts` sont
  **conservés** (`TypeMouvement`, `MotifMouvement`, `MouvementStock`, `StatutStock`, `EtatStock`,
  `SeuilPayload` restent consommés par [stock.constants.ts](src/app/constants/stock.constants.ts),
  `stock-v2-valorisation.model.ts`, `stock-v2-export.service.ts` et `cout-mouvements`), de même que
  `exporterMouvements()` / `exporterEtatStock()` dans `stock-v2-export.service.ts`, aujourd'hui sans
  appelant.
- **Seuil d'alerte éditable depuis le catalogue** — l'édition inline des seuils, seule fonction
  propre à l'ancien écran *État du stock*, a été reprise dans la table de
  [liste-produits](src/app/adminPage/stock-v2/stocks-approvisionnement/catalogue-produits/liste-produits/)
  sous forme d'une colonne **Seuil** placée juste après **Stock** (crayon → input, `Check` /
  `X`). ⚠ Elle continue d'appeler **`PUT /stock/etat-stock/seuils`** — aucun changement de contrat
  backend ; `StockV2EtatStockService` est conservé, **réduit à `majSeuil()`**, et `siteId` est
  **volontairement omis** (seuil **global** du produit, qui est exactement le `Produit.seuilAlerte`
  affiché ici — les seuils par site n'ont plus d'écran). La clé d'édition est `p.id` et non plus le
  couple produit/site. ⚠ `ListeProduitsComponent` est en `OnPush` : `cdr.markForCheck()` après chaque
  mutation, sinon ni la valeur ni le rouge « sous seuil » de la colonne *Stock* ne se rafraîchissent.
- **Suppression définitive d'un inventaire (SUPERADMIN)** — un inventaire n'était supprimable qu'en
  `BROUILLON` (`InventaireService.delete` → 409 sinon) : une clôture erronée était donc définitivement
  figée. Nouvelle action **« Supprimer définitivement »**, dans la liste (colonne Actions, branche
  `@else if (estSuperAdmin)` du bloc `BROUILLON`) et dans la barre d'actions de la fiche
  `saisie-inventaire`, consommant **`POST /stock/inventaires/{id}/suppression-definitive`**
  (`{ motif }` → 204). ⚠ Le bouton est **masqué**, pas grisé, pour les autres profils — c'est la
  demande, et c'est déjà la règle du module pour les actions gouvernées par le rôle. ⚠ Les deux
  composants n'ont **pas de service de permissions** : ils comparent `LoginService.getUserRole()` à
  `ROLE_SUPERADMIN` ([roles.constants.ts](src/app/constants/roles.constants.ts)) et **mémorisent** le
  booléen dans un champ `readonly estSuperAdmin` — un getter appelé depuis le template relirait le JWT
  à chaque cycle (`OnPush`). Voir la section 7.4 pour le comportement serveur commun (contre-passement,
  journal, limites).
- **Synthèse mensuelle — comparaison multi-mois + filtre de flux** — l'écran ne se limite plus à un
  mois : un champ mois + bouton « Ajouter » empile des **puces** de mois (retirables, triées
  chronologiquement, **12 maximum**, au moins une), et le tableau rend un **groupe de colonnes par
  mois** (en-tête à deux niveaux, colonnes Code/Produit collantes) suivi d'un groupe *Total* et d'un
  `tfoot`. Le graphique devient un bar **groupé** : labels = top 10 produits, **un dataset par
  mois**. ⚠ **Le contrat serveur reste mono-mois** — il n'existe pas de paramètre `mois` répétable :
  `StockV2SyntheseService.getSyntheseMulti()` lance un **`forkJoin` d'un appel `GET
  /stock/synthese-mensuelle` par mois** et fusionne les réponses via la fonction pure exportée
  `fusionnerSyntheses()` (produit absent d'un mois ⇒ cellule à zéro, pour que toutes les lignes
  aient le même nombre de colonnes). D'où le plafond de 12 mois, et l'échec en bloc si un mois
  échoue. ⚠ **Les stocks ne sont jamais sommés** : `LigneSyntheseMulti.stockFinal` / `valeurFinale`
  et `SyntheseMultiMois.valeurStockFinal` sont ceux du **dernier mois sélectionné** — les en-têtes
  et tuiles le disent explicitement (« au 2026-07 »). Seuls entrées et sorties se cumulent.
  ⚠ Le filtre **Flux (Tout / Entrée / Sortie)** est **purement d'affichage** : il masque colonnes,
  tuiles et séries du flux opposé et réoriente le tri des lignes, **sans nouvel appel HTTP** — le
  stock final n'est jamais recalculé en fonction du flux (il n'y a pas de paramètre `sens` côté
  serveur). `Stock initial` n'est rendu qu'en mode *Tout*. Constantes `LIBELLES_FLUX_SYNTHESE` /
  `ORDRE_FLUX_SYNTHESE` dans [stock.constants.ts](src/app/constants/stock.constants.ts) ; types
  client `FluxSynthese`, `CelluleSyntheseMois`, `LigneSyntheseMulti`, `SyntheseMultiMois` ajoutés à
  [stock-v2-synthese.model.ts](src/app/models/stock-v2-synthese.model.ts) (les types du contrat
  serveur `LigneSynthese` / `SyntheseMensuelle` / `FiltreSynthese` sont **inchangés**).
  `exporterSynthese()` et `genererSynthese()` prennent désormais `(SyntheseMultiMois, FluxSynthese)`
  — colonnes dynamiques par mois, en-tête PDF à deux niveaux. Le composant est en `OnPush` :
  `cdr.markForCheck()` après chaque mutation des puces ou du flux, et le tri est **matérialisé** dans
  `lignesAffichees` (pas un getter appelé depuis le template, qui retrierait à chaque cycle).
  Les mois sont affichés **en clair** (« Févr. 2026 ») via `formaterMois` / `formaterMoisCourt`
  ([stock.constants.ts](src/app/constants/stock.constants.ts)) — en-têtes de colonnes, puces,
  tuiles, légende du graphique et en-têtes d'export. ⚠ Les **noms de fichiers** exportés gardent
  `yyyy-MM` (un nom accentué et espacé se trie mal et casse sur certains partages). Le module RH
  duplique un tableau `['Janvier', …]` dans 6 fichiers : ne pas reproduire ce pattern, réutiliser
  ces helpers.
- **Tableau de bord des stocks — filtre par plage de mois** — les deux `<input type="date">`
  « Du / Au » sont remplacés par des `<input type="month">` « Du mois / Au mois »
  ([tableau-bord-stocks/](src/app/adminPage/stock-v2/stocks-approvisionnement/tableau-bord-stocks/)),
  défaut inchangé en substance (janvier de l'année courante → mois courant). ⚠ **Le contrat
  `GET /stock/tableau-bord` ne change pas** : il reçoit toujours `dateDebut` / `dateFin` en
  `yyyy-MM-dd`, la conversion se fait **côté client** via `premierJourDuMois()` /
  `dernierJourDuMois()` ([stock.constants.ts](src/app/constants/stock.constants.ts)) — ces helpers
  construisent la date en **local** (`new Date(annee, numero, 0)`) et n'en lisent que le numéro de
  jour, car `toISOString()` décalerait d'un jour selon le fuseau. Le mapping du filtre est
  centralisé dans `construireFiltre()`, partagé par `charger()` et `exporterPdf()` (qui le
  dupliquait), et un garde-fou `moisFin < moisDebut` — absent sur les anciennes dates — évite un
  tableau de bord vide sans explication. Le PDF continue d'imprimer la **période en dates**
  (c'est bien l'intervalle interrogé). Les tableaux de bord **financier (7.6) et terrain** gardent
  le couple de dates : hors périmètre de ce lot, les helpers sont là s'il faut les basculer.
- **Tableau de bord des stocks — la catégorie cède la place au produit** — le filtre *Catégorie*
  (`<select>` alimenté par `StockV2CategorieService.listerToutes()`) est remplacé par un filtre
  *Produit* s'appuyant sur le shared [selecteur-produit](src/app/adminPage/stock-v2/stocks-approvisionnement/shared/selecteur-produit/)
  (déjà utilisé comme filtre par 5 écrans), et **le donut suit** : « Valeur du stock par catégorie »
  devient « Valeur du stock par produit ». Plus aucune notion de catégorie sur cet écran —
  `categories`, `CategorieStock` et `StockV2CategorieService` ont disparu du composant, `ngOnInit`
  se réduit à `charger()`. ⚠ **Contrat backend à répercuter des deux côtés** :
  `GET /stock/tableau-bord` reçoit **`produitId`** et non plus `categorieId` (et doit filtrer
  **tous** les blocs — KPIs, évolution, top consommations, dormants), et renvoie
  **`valeurParProduit: PointValeurProduit[]`** (`produitId` / `produitCode` / `produitLibelle` /
  `valeur`) au lieu de `valeurParCategorie`. ⚠ Cette liste doit être **bornée serveur (top 10,
  comme `topConsommations`)** : les catégories étaient naturellement peu nombreuses, pas les
  produits — sans borne le donut devient illisible sur un catalogue de plusieurs centaines de
  références. Côté front, `r.valeurParProduit ?? []` : tant que le serveur renvoie l'ancien bloc,
  le donut est **vide** (attendu, pas une régression). L'export Excel produit désormais une feuille
  « Valeur par produit » (Code / Produit / Valeur) ; le PDF n'imprimait pas ce bloc, il est
  inchangé.

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

**Rubrique « Bons » (sidebar)** — les entrées « Bons d'entrée » et « Bons de sortie » sont condensées en une **rubrique unique « Bons »** (icône neutre `FileText`), la bascule se faisant par une **barre d'onglets** dupliquée dans `liste-bons-entree` et `liste-bons-sortie`. **Vert = entrée, rouge = sortie** : la couleur est portée par l'onglet (le bouton d'accès) et par la pastille d'en-tête, **jamais par le contenu** — les badges de statut (`COULEURS_STATUT_BON`) et de type restent inchangés, sinon un bon de sortie « Effectif » afficherait un badge vert sur une page rouge et le workflow deviendrait illisible. ⚠ **Aucune route n'est modifiée, ni imbriquée sous un parent commun** : les CTA « Nouveau bon » utilisent un `routerLink="nouveau"` **relatif**, et les liens des e-mails de création pointent sur `/admin/stock-v2/controle-mouvements/bons-{entree|sortie}/{id}` (construits serveur — ils casseraient si ces chemins bougeaient). ⚠ Contrairement aux rubriques Pointage et Congés, **aucun onglet n'a besoin de `[routerLinkActiveOptions]="{ exact: true }"`** : les deux routes sont sœurs, chacune avec son propre préfixe et rien d'autre dessous, donc le `routerLinkActive` par préfixe garde l'onglet allumé sur `/nouveau`, `/:id` et `/:id/modifier`. Le surlignage de l'entrée de sidebar passe en revanche par `estRubriqueBons()` + `[ngClass]` (un `routerLinkActive` ne connaîtrait que la destination du lien et ne s'allumerait pas sur l'autre préfixe), et la destination par `lienRubriqueBons()` (retombe sur les sorties si le droit `stock.bonsEntree` manque). Les **deux sous-flags RBAC sont conservés** et agrégés en `*ngIf` sur l'entrée — un profil n'ayant que l'un des deux verra l'onglet de l'autre (comportement identique à la rubrique Congés, il n'y a pas de guard de route sur ces écrans).

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

**Détail par produit dans « Historique par destinataire »** — l'écran ne donnait que des
totaux par destinataire (quantité, montant, nb de sorties) : filtrer sur un site disait
*combien* il avait consommé, pas **quels produits ni pour quel montant chacun**. Une carte
**« Détail par produit »** est ajoutée sous le graphique d'évolution, dans la colonne de
droite — elle suit la **même sélection de ligne** que le graphique (pattern `selection` /
`estSelection` déjà en place, pas de ligne dépliable), avec tri par **montant décroissant**,
libellé d'unité (`LIBELLES_UNITE`) et pied de totaux.
- ⚠ **Aucun endpoint ni appel HTTP ajouté** : `ConsommationDestinataire.lignes?:
  LigneConsommationDestinataire[]` (`produitId`, `produitCode?`, `produitLibelle?`, `unite?`,
  `quantite`, `montant`) **existait déjà** dans
  [stock-v2-consommation.model.ts](src/app/models/stock-v2-consommation.model.ts) sans être
  référencé **nulle part** dans l'application. **Attente serveur** : `GET
  /stock/consommation/par-destinataire` doit désormais **remplir `lignes[]`** (agrégation des
  lignes de bons de sortie EFFECTIFS du destinataire sur la période, une entrée par produit).
  Tant qu'il ne le fait pas, la carte affiche un **état vide explicite** — comportement
  attendu, pas une régression.
- ⚠ Le repli sur `GET /stock/consommation/rapport?type=PAR_PRODUIT` a été **écarté** : deux
  sources de vérité pour la même donnée, et il ne vaudrait que pour les destinataires de type
  `SITE`.
- ⚠ Les totaux du pied sont ceux des **lignes affichées**, jamais `selection.montantTotal` :
  sur un détail partiel, l'écart avec le total du destinataire doit se voir plutôt qu'être
  masqué. ⚠ Composant en `OnPush` : `lignesSelection` / totaux sont **matérialisés** par
  `construireDetail()` (appelée aux deux endroits que `construireChart()`), pas calculés dans
  un getter appelé depuis le template — même piège que `lignesAffichees` de la synthèse
  mensuelle.
- **Exports** : `exporterHistoriqueDestinataire` passe du helper mono-feuille `ecrire()` au
  classeur **à deux feuilles** (« Par destinataire » inchangée + « Détail produits », une ligne
  par couple destinataire × produit) et `genererHistoriqueDestinataire` ajoute un titre
  « DÉTAIL PAR PRODUIT » puis **un `autoTable` par destinataire** (`foot` de totaux). ⚠ Dans
  les deux cas, **rien n'est produit si aucun destinataire ne porte de `lignes`** — un onglet
  ou une section vide laisserait croire à un bug. Noms de fichiers inchangés.

**Habilitations des bons de sortie (par rôle + propriété)** — au-delà des sous-flags
`modules.stock`, les actions des bons de **sortie** sont restreintes par le **rôle** du JWT et
par l'**auteur** du bon :

| Action | Autorisation |
|---|---|
| Créer un bon (brouillon) | tout profil ayant accès au module |
| Consulter / Modifier / Supprimer un bon | son **créateur** uniquement (+ `SUPERADMIN` et `CONTROLEUR_STOCK` sur tous les bons) |
| Soumettre un bon | son **créateur**, `SUPERADMIN` et `CONTROLEUR_STOCK` (⚠ élargi au créateur — voir « Reprise après refus » ci-dessous) |
| Reprendre un bon refusé | mêmes ayants droit que Consulter / Modifier |
| Valider / Refuser | `SUPERADMIN` uniquement |

- Point unique de vérité côté front : [stock-v2-bon-permissions.service.ts](src/app/services/stock-v2-bon-permissions.service.ts)
  (+ spec), consommé par `liste-bons-sortie`, `fiche-bon-sortie`, `formulaire-bon-sortie` et
  `tableau-workflow`. Rôles centralisés dans [roles.constants.ts](src/app/constants/roles.constants.ts) —
  ⚠ le super-admin est la chaîne **`SUPERADMIN`, sans underscore**.
- Ergonomie : dans la **liste**, les actions sur les bons d'autrui restent visibles mais
  **désactivées** (icône grisée + tooltip « Réservé au créateur du bon ») ; les actions
  réservées par **rôle** (Soumettre / Valider / Refuser), elles, sont **masquées** — y compris
  dans le Kanban `workflow-validation`, sans quoi la restriction de la fiche serait
  contournable en un clic.
- ⚠ **Champs backend à ajouter** : `BonSortie` et `BonWorkflow` exposent **`creeParId`**,
  **`creeParEmail`** et **`creeParNom`**, renseignés **serveur** depuis le JWT à la création
  et **jamais acceptés du client** (absents de `BonSortiePayload`). Ils sont distincts du
  `demandeurId`, qui reste choisi manuellement dans le formulaire. Le front compare
  `creeParEmail` à `LoginService.getUserEmail()` (le JWT ne porte ni `id` ni `username`).
  Tant que `creeParEmail` est absent de la réponse, le front est **permissif** sur la
  propriété (repli transitoire commenté `TODO` dans le service) — seules les restrictions par
  rôle s'appliquent.
- ✅ **Contrôles serveur** (le front n'est qu'une commodité UX) — **livrés** sur la branche
  `feature/stock-bons-autorisation` : `PUT`/`DELETE /stock/bons-sortie/{id}` et
  `POST /{id}/soumettre` → **403** si l'appelant n'est ni le créateur, ni `SUPERADMIN`, ni
  `CONTROLEUR_STOCK` (soumettre est ouvert au créateur, sinon un bon repris après refus ne
  pourrait jamais être renvoyé) ; `POST /{id}/valider` et `POST /{id}/refuser` → **403** hors
  `SUPERADMIN`. Le front traite le 403 par un toast « Action non autorisée pour votre profil. ».
  ⚠ Jusqu'à ce lot, **aucune de ces règles n'était appliquée** : `SecurityConfig` se limite à
  `.authenticated()` et le backend n'a aucun `@PreAuthorize`, si bien que tout compte connecté
  pouvait valider ou supprimer le bon d'autrui en appelant l'API directement. Au déploiement, un
  compte qui validait sans être `SUPERADMIN` recevra désormais un 403 — vérifier les rôles réels.
  ⚠ La **lecture n'est pas restreinte** (`GET /{id}` ni la liste) : la restriction serait
  cosmétique tant que la liste renvoie tous les bons.
- Les **bons d'entrée** ne sont pas concernés (pas de `creeParEmail`, donc pas de notion de
  créateur côté serveur) : leurs `valider` / `refuser` restent ouverts à tout compte authentifié.

**Reprise après refus (bons de sortie)** — `REFUSE` n'est plus un cul-de-sac : un bon refusé
**revient chez son créateur**, qui le corrige et le renvoie dans le circuit, **l'historique du cycle
refusé étant conservé**. Boucle : `REFUSE → (reprise) → BROUILLON → SOUMIS → …`

- Action explicite **« Reprendre »** (`POST /stock/bons-sortie/{id}/reprendre`, ✅ **livré côté
  serveur** sur la branche `feature/stock-reprise-et-etat-produit` : **409** hors statut `REFUSE`,
  **403** hors créateur / `CONTROLEUR_STOCK` / `SUPERADMIN`) plutôt qu'un bon refusé rendu modifiable en place — sinon la colonne *Refusé* du
  Kanban et les compteurs mélangeraient refus définitifs et corrections en cours.
- ⚠ **Le serveur AJOUTE l'entrée `{ action: 'REPRISE' }` à `historique[]`, il ne le réinitialise
  jamais** : c'est toute la demande. `'REPRISE'` est une nouvelle valeur d'`ActionWorkflow`, avec son
  libellé (« Reprise après refus ») et sa couleur dans [stock.constants.ts](src/app/constants/stock.constants.ts) ;
  le composant `timeline-workflow` n'a pas eu à changer, il lit ces maps par action.
- ⚠ **`motifRefus` est CONSERVÉ à la reprise** (écrasé seulement au refus suivant) : c'est au moment
  de corriger que le créateur en a le plus besoin. Le bandeau, autrefois conditionné à
  `statut === 'REFUSE'`, l'est désormais à la **présence du motif** — rouge « Bon refusé » en
  `REFUSE`, **orange** « Corrigez-le puis renvoyez-le » une fois repassé en `BROUILLON` — et il est
  répété en tête du **formulaire d'édition**.
- ⚠ **`peutSoumettreBon()` n'exige plus `peutSoumettre()`** : le créateur soumet ses propres bons,
  sinon il corrigerait sans pouvoir renvoyer. Cela vaut aussi pour la **première** soumission d'un
  brouillon, et le **403 de `POST /{id}/soumettre` doit être assoupli côté serveur**. ⚠ Le repli
  permissif existant (`creeParEmail` absent ⇒ propriétaire) s'étend mécaniquement à la soumission et
  à la reprise : tant que le backend ne renvoie pas ce champ, **tout profil ayant accès au module
  peut soumettre** — contrepartie assumée, à retirer avec le repli.
- La garde du formulaire (`statut !== 'BROUILLON'` ⇒ redirection) est **inchangée** : on édite après
  reprise, jamais un bon encore refusé.
- Le Kanban affiche enfin `BonWorkflow.motifRefus` (le champ existait, n'était **jamais** rendu) et
  porte l'action Reprendre, bornée à `sens === 'SORTIE'`. Il appelle `StockV2BonSortieService`
  **directement** : `stock-v2-workflow.service` dispatche par sens, ce qui n'aurait pas de sens pour
  une action qui n'existe que d'un côté.
- **Périmètre : bons de sortie uniquement.** Un bon d'entrée refusé reste terminal — `BonEntree` ne
  porte pas `creeParId/Email/Nom`, la notion d'« expéditeur » n'y existe pas. Aucun fichier du
  dossier `bons-entree/` n'est modifié.

**Colonne de stock des bons (entrée et sortie)** — les deux formulaires affichent, à droite de la
colonne *Unité*, un champ **en lecture seule** :

| Écran | Mode | Valeur | Site détenteur du stock |
|---|---|---|---|
| Bon de **sortie** | `RESTE` | `stock − quantité saisie`, recalculé à la frappe, **rouge si négatif** | `siteSourceId` |
| Bon d'**entrée** | `ACTUEL` | le **stock en l'état**, avant réception — insensible à la quantité saisie, **jamais coloré** | `siteDestinationId` |

L'opérateur ne découvre plus le stock insuffisant à la validation du bon, et le magasinier voit ce
qu'il possède déjà avant de réceptionner. ⚠ Un stock actuel à 0 sur une entrée est **normal**
(première réception) : d'où l'absence de coloration en mode `ACTUEL`.

- ⚠ **La base de calcul est le stock du site du bon**, pas `Produit.quantiteTotale` — piège :
  le `Produit` émis par le `selecteur-produit` porte bien une quantité, mais c'est un **cumul tous
  sites** ; l'afficher laisserait croire qu'une sortie passera avant un refus serveur. ⚠ Pour une
  entrée, le site détenteur est bien la **destination** (c'est là qu'arrive la marchandise), à ne
  pas confondre avec le `destSiteId` du bon de sortie, qui est le destinataire et ne détient rien.
- **`StockV2EtatStockService` retrouve une méthode de lecture**, `getEtatProduit(produitId, siteId?)`
  → `GET /stock/etat-stock/produit/{id}?siteId=` (✅ **livré côté serveur** sur la branche
  `feature/stock-reprise-et-etat-produit` ; le seuil du site prime sur celui du produit, et un
  produit jamais mouvementé renvoie 0 plutôt qu'une erreur), commune aux
  deux écrans. Les erreurs sont **absorbées en `null`** (`catchError`) : un produit jamais
  mouvementé sur ce site n'est pas une anomalie, l'éditeur affiche alors « — » — jamais `0`, qui se
  lirait comme une rupture.
- L'éditeur partagé [editeur-lignes-bon](src/app/adminPage/stock-v2/controle-mouvements/shared/editeur-lignes-bon/)
  reçoit deux `@Input` : **`modeStock`** (`'AUCUN' | 'RESTE' | 'ACTUEL'`) et `siteId`. ⚠ Un **mode
  unique plutôt que deux booléens** — un `afficherStock` + un `sens` autoriseraient l'état
  impossible « colonne masquée mais mode de calcul renseigné ». Le cache des stocks est indexé par
  **`produitId` et non par index de ligne**, qui se décale à la suppression. ⚠ Le rechargement passe
  par **`ngOnChanges` sur `siteId`** et pas seulement par `onProduit()`, sans quoi deux cas seraient
  muets : l'ouverture d'un **brouillon existant** (lignes créées par `creerLigneBon(data)`, hors
  sélecteur) et le **changement de site** après saisie des lignes. Un changement de site **vide le
  cache**.
- ⚠ Le `colspan` du pied de tableau (« Total estimé ») est **calculé** (getter `colspanTotal` =
  3 colonnes fixes + les **deux** colonnes optionnelles) : en dur, la ligne de total se décalerait
  dès que l'une d'elles est masquée.

**Colonnes de sorties mensuelles (bon de sortie)** — à droite de la colonne de stock, **une colonne
par mois** (3 par défaut, ex. *Mai 2026 · Juin 2026 · Juil. 2026*) donnant la quantité du produit
**sortie de ce site** ce mois-là. ⚠ **Un cumul avait d'abord été livré puis remplacé** : il masquait
la tendance (85 = 80+3+2 ne se lit pas comme 85 = 28+29+28) — ne pas y revenir.

- ⚠ **Le mois en cours est exclu** : en août 2026, la période va du **01/05 au 31/07**. Un mois
  partiel fausserait la comparaison. Profondeur dans `PARAMETRES_CONTROLE_MOUVEMENTS.moisHistoriqueSorties` ;
  le getter **`moisSorties`** produit les `yyyy-MM` et alimente **à la fois** les en-têtes et les
  cellules — c'est ce qui garantit leur alignement. Dates construites en **local**, bornes via
  `premierJourDuMois` / `dernierJourDuMois` ([stock.constants.ts](src/app/constants/stock.constants.ts)).
- **Aucun endpoint à créer** : `StockV2ConsommationService.rapport({ type: 'PAR_PERIODE', … })`,
  **un seul appel par produit** (et non un par mois), dont on indexe `lignes` par `cle`.
  ⚠ **Contrat serveur** : avec `type=PAR_PERIODE`, la granularité est le **mois** et `cle` vaut
  **`yyyy-MM`**.
- ⚠ **`siteId` est obligatoire dans l'appel** — les chiffres ne valent que pour le site source,
  jamais en cumul tous sites. Tant qu'aucun site n'est choisi, les colonnes restent à « — » et
  **aucun appel n'est émis** (à la différence du stock, où un `siteId` absent est toléré).
- ⚠ **« — » et « 0 » ne disent pas la même chose** : « — » = valeur inconnue (produit ou site non
  choisi, appel échoué) ; « 0 » = mois réellement sans sortie. D'où le cache
  `Map<produitId, Map<yyyy-MM, number> | null>` — `null` pour l'inconnu, `Map` vide pour l'absence
  de mouvement, et un mois absent de `lignes` interprété comme **0**.
- Activées par un `@Input() afficherSorties3Mois` **distinct de `modeStock`** : elles sont
  orthogonales au mode de calcul du stock, pas une variante de son affichage. Même invalidation au
  changement de site. ⚠ **Deux appels HTTP par produit** (stock + sorties) — à savoir avant d'en
  ajouter un troisième.
- Les valeurs **ne bougent pas** quand on saisit une quantité : c'est un historique, contrairement à
  « Reste ». Pas de coloration : une quantité sortie n'est ni bonne ni mauvaise.
- ⚠ Le tableau atteint **9 colonnes** sur le bon de sortie (conteneur déjà en `overflow-x-auto`,
  colonnes de mois en `w-24`), et `colspanTotal` dépend désormais de `moisSorties.length`.
- **Affichage informatif, non bloquant** : un reste négatif s'affiche en rouge mais n'empêche pas
  d'enregistrer un brouillon — légitime avant réapprovisionnement. La règle de refus pour stock
  insuffisant reste **serveur**, appliquée à la **validation** du bon (422). Aucun contrôle n'est
  ajouté au `FormGroup` de ligne : la valeur est dérivée, le payload `{ produitId, quantite }` est
  intact par construction.

**Suppression définitive d'un bon déjà engagé (SUPERADMIN)** — `REFUSE`, `VALIDE` et surtout
`EFFECTIF` étaient des culs-de-sac : `exigerBrouillon` refusait toute suppression en 409, et un bon
effectif erroné restait en base avec ses mouvements. Le **super-administrateur** peut désormais
supprimer un bon **quel que soit son statut**, l'effet stock étant **contre-passé** et l'opération
**journalisée**. Périmètre : **bons de sortie ET bons d'entrée** (symétrie du module).

| Écran | Emplacement de l'action |
|---|---|
| `liste-bons-sortie` / `liste-bons-entree` | icône `Trash2` dans la colonne Actions (`@else if` du bloc `BROUILLON`) |
| `fiche-bon-sortie` / `fiche-bon-entree` | bouton « Supprimer définitivement » du bandeau d'actions, puis retour à la liste |

- **Endpoints** : `POST /stock/bons-{sortie|entree}/{id}/suppression-definitive`, corps `{ motif }`
  (**≥ 10 caractères**, même règle que le refus de congé), réponse **204**. ⚠ **POST et non DELETE** :
  la requête porte un corps ; le `DELETE /{id}` existant, borné au brouillon, est **inchangé**.
  Codes : **403** hors SUPERADMIN (`StockAccesRefuseException`), **400** motif absent/trop court,
  **422** contre-passement impossible, **404** document inconnu.
- **Habilitation front** : `CongePermissionsService`-like — `StockV2BonPermissionsService.peutSupprimerDefinitivement(bon)`
  = `statut !== 'BROUILLON' && estSuperAdmin()`. ⚠ **Disjoint par construction** de `peutSupprimer()`
  (brouillon + créateur, **inchangé**) : les deux ne peuvent jamais être vrais ensemble, donc aucun
  écran ne rend deux boutons de suppression. ⚠ **Aucun repli permissif** ici, contrairement au reste
  du service : le rôle est porté par le JWT, il est toujours connu — le repli `creeParEmail` absent
  n'ouvre donc pas cette action. C'est la **seule règle du service qui vaut aussi pour les bons
  d'entrée** (ils n'ont pas de `creeParEmail`), d'où son injection dans les écrans `bons-entree/`.
- **Dialog partagé** [stock-v2/shared/dialogs/suppression-definitive-dialog](src/app/adminPage/stock-v2/shared/dialogs/suppression-definitive-dialog.component.ts)
  (motif ≥ 10 car., `data: { titre, reference, effetStock, avertissementCump }`), utilisé aussi par les
  **inventaires** (7.3). Le `ConfirmDialogComponent` ne convenait pas : il ne collecte pas de saisie.
  Le dialog **énonce l'effet stock** — il n'est pas devinable depuis l'écran.
- **Backend** — branche `feature/stock-suppression-definitive` (partant de **`main`**) :
  `services/stockv2/SuppressionDefinitiveService` (point unique : rôle, motif, contre-passement,
  journal), entité **`SuppressionStockLog`** (collection `stockv2_suppressions`, **écriture seule,
  aucun endpoint de lecture** — type de document, référence, statut avant, motif, auteur, date, et le
  **détail des lignes contre-passées**, sans quoi l'impact stock serait irrécupérable), DTO
  `MotifPayload`, `MouvementStockRepository.findByBonId/findByInventaireId/findByCommentaire`.
  ⚠ La branche **redéclare `CurrentUserProvider.currentRole()`** à l'identique de
  `feature/conges-validation-3-niveaux` (il n'est pas sur `main`) — **conflit trivial attendu au merge**.
- ⚠ **Les mouvements d'ajustement d'inventaire n'étaient rattachés à rien** : `MouvementStock` gagne
  **`inventaireId`** / **`inventaireReference`** (+ `origine = "INVENTAIRE"`), renseignés par
  `InventaireService.cloturer`. Pour les inventaires **déjà clôturés en base**, le service retombe sur
  le seul lien qui existait, `commentaire = "Ajustement inventaire {reference}"` + `motif = AJUSTEMENT`.
- **Contre-passement, par document** : sortie ⇒ recrédit du `siteSourceId` de chaque mouvement ;
  entrée ⇒ retrait du `siteDestinationId` + suppression des points de coût
  (`HistoriquePointCoutRepository.findByReferenceMouvementIn`) ; inventaire clôturé ⇒ `-ecart` par
  ligne sur le site de l'inventaire (l'inverse exact de `cloturer`), la **source de vérité étant le
  document**, pas les mouvements. Puis suppression des mouvements. Sur un document qui n'a rien
  mouvementé, c'est un **no-op** — pas de 409, l'appelant est déjà super-admin.
- ⚠ **Le contre-passement des bons vise l'entrepôt unique** (`StockBalanceService.ENTREPOT`, c.-à-d.
  `siteId = null`), **pas le site du mouvement** : une entrée y crédite tout et une sortie y puise
  (`debiterAvecRepli`), les soldes par site n'étant plus alimentés depuis la bascule « entrepôt
  unique ». ⚠ La première version visait le site du mouvement — écrite avant cette bascule et mergée
  juste avant elle sans rejouer la suite de tests, elle créait **du stock fantôme sur un site en
  laissant l'entrepôt faux**. Corrigé par `fix(stock): le contre-passement vise l'entrepôt unique`
  (branche `feature/stock-contre-passement-entrepot`) ; `verifierRetraitPossible` cumule désormais
  **par produit** et non par couple (produit, site). ⚠ **L'inventaire n'est pas concerné** :
  `InventaireService.cloturer` applique toujours ses écarts sur `inv.getSiteId()` — seuls les bons
  sont passés à l'entrepôt — et le contre-passement lit le même champ, donc la symétrie tient.
- ⚠ **Deux limites assumées, documentées dans le code** : (1) le **CUMP n'est pas restauré** sur suppression d'un bon d'entrée
  (`ValorisationSupport.compenserEntree` exige le `RecalcResult` d'origine) — le dialog l'annonce via
  `avertissementCump` ; (2) supprimer une entrée **déjà consommée** rendrait le solde de l'entrepôt
  négatif : c'est refusé en **422** avec le disponible et la quantité à retirer, au super-admin
  d'ajuster le stock d'abord — un stock négatif contaminerait les statuts de rupture et la valorisation.
- **Hors périmètre, volontairement** : le Kanban `workflow-validation/tableau-workflow` — c'est une file
  de validation, pas un écran de gestion documentaire.
- Tests : `SuppressionDefinitiveServiceIT` (8 IT — contre-passement des 3 documents, repli par
  commentaire, 422 marchandise consommée, no-op brouillon, 403, motif trop court) et 2 cas ajoutés à
  `stock-v2-bon-permissions.service.spec.ts`. ⚠ `BonEntreeControllerTest` a dû recevoir le `@MockBean`
  du nouveau service (le contrôleur ne se construisait plus).

**Notification e-mail à la création d'un bon** (backend, aucun impact front) — `POST /stock/bons-entree`
et `POST /stock/bons-sortie` envoient un e-mail HTML récapitulatif (référence, type, date, site,
destinataire/fournisseur, nb de lignes, montant, auteur) au **SUPERADMIN** et aux
**CONTROLEUR_STOCK**, sur leur adresse de connexion. Le mail contient un lien vers
`/admin/stock-v2/controle-mouvements/bons-{entree|sortie}/{id}` construit côté serveur à partir de
`app.frontend.base-url` (URL publique de l'app : `https://pointic-cleanic.com` en prod) —
**si cette route front change, le lien des mails casse**. L'envoi est
tolérant aux pannes (un échec SMTP n'empêche pas la création du bon). Implémentation :
`BonMailNotificationService` dans [Pointage-Cleanic-Backend](../Pointage-Cleanic-Backend),
branche `feature/notification-mail-bons`.

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
| **Chantiers** (`stock-v2-analyse-chantier`) | `GET /stock/chantiers` (paginé : q, statut, siteId, dates) · `GET /stock/chantiers/actifs` (sélecteur) · `GET /stock/chantiers/prochaine-reference` (aperçu `{ reference }` — indicatif) · `GET /{id}` (→ `DetailChantier` agrégé) · `POST` (**référence `CH-AAAA-NNN` générée serveur, atomique, séquence par année** — toute `reference` client ignorée ; `siteId` optionnel) · `PUT /{id}` · `POST /{id}/cloture` |
| **Dons** (`stock-v2-analyse-don`) | `GET /stock/analyse/dons?dateDebut=&dateFin=&natureDon=&beneficiaire=&siteId=` |
| **Comparatif** (`stock-v2-analyse-comparatif`) | `GET /stock/analyse/comparatif?axe=SITE\|PRODUIT&dateDebut=YYYY-MM&dateFin=YYYY-MM&siteId=&categorieId=&typeSortie=&seuilPct=` |
| **Filtres croisés** (`stock-v2-analyse-croisee`) | `GET /stock/analyse/croise?axeLignes=&axeColonnes=&mesure=MONTANT\|QUANTITE&dateDebut=&dateFin=&siteId=&produitId=&categorieId=&typeSortie=` (axes : PRODUIT/CATEGORIE/SITE/TYPE_SORTIE/NATURE_DON/MOIS) |

> Les services PDF/Excel restent **100 % client**. Le backend doit ajouter les 5 sous-flags `modules.stock.{analyseMensuelle,chantiers,dons,comparatif,filtresCroises}` au claim JWT, et faire porter au mouvement SORTIE la `natureDon` (bons DON) et le `chantierId` (bons DISTRIBUTION_CHANTIER) à la validation.

### 7.6 Valorisation financière (`stock-v2/valorisation-financiere/`)

- Valorisation du stock (FCFA), méthode de calcul du coût unitaire (CUMP / dernier prix), coût des mouvements, valeur de stock temps réel, coûts par site/chantier, marges, pilotage financier.

**Statut : ✅ Terminé (frontend)** — 7 fonctionnalités. Bilan : **8 composants**, **6 services** (dont 2 purs testables `cump`/`marge`), **5 modèles DTO financiers**, 1 fichier de constantes, 2 modèles 7.3 enrichis. Module **FINANCIER** : calcule/valorise mais reste lecture seule sur les entités métier (sauf paramétrage financier produit via endpoints dédiés). Build OK, **26 tests unitaires verts**. Reste à faire côté serveur (endpoints listés plus bas).

| Sous-module | Composants | Rôle |
|---|---|---|
| `cout-unitaire-produit/` | cout-unitaire-produit | Paramétrage global (méthode défaut) + override par produit, coût courant, alertes, line chart historique des coûts |
| `cout-mouvements/` | cout-mouvements | Liste filtrable des mouvements valorisés (coût snapshot + valeur + badge `estEstime`), export Excel |
| `valeur-stock/` | valeur-stock | KPIs + donut catégories + table ; **polling auto-refresh** (30 s) + comparaison instant T précédent |
| `cout-consommation-site/` | cout-consommation-site | Comparatif inter-sites (table + bar ranking), détection surconsommation, exports PDF/Excel |
| `cout-revient-chantier/` | liste-cout-chantiers, fiche-cout-chantier | Chantiers valorisés au coût de revient, détail + coût/jour + comparaison + rapport PDF |
| `marge-produits/` | marge-produits | Marge (prix vente − coût), taux, marge globale, non-rentables ; édition inline `prixVente` (PATCH) ; exports |
| `tableau-bord-financier/` | tableau-bord-financier | KPIs (valeur, conso, marge, dérives) + line/bar/donut + panneau dérives budgétaires ; exports PDF/Excel |

**Services** (préfixe `stock-v2-`) : `stock-v2-cump` (PUR testable : CUMP/dernier prix/écart), `stock-v2-marge` (calc pur + HTTP synthèse), `stock-v2-valorisation` (paramétrage, coûts produits, historique, valeur stock, mouvements valorisés, PATCH méthode/prix-vente), `stock-v2-cout-site`, `stock-v2-cout-chantier`, `stock-v2-tableau-bord-financier`. Specs : `stock-v2-cump.service.spec`, `stock-v2-marge.service.spec` (26 tests). `stock-v2-export` (XLSX) et `stock-v2-pdf` (jsPDF) **enrichis**.

**Modèles** : `stock-v2-valorisation` (`MethodeValorisation`, `ParametrageValorisation`, `CoutProduit`, `HistoriqueCoutProduit`, `LigneCoutMouvement`, `ValeurStock`), `stock-v2-cout-site`, `stock-v2-cout-chantier`, `stock-v2-marge`, `stock-v2-tableau-bord-financier`.

**Constantes :** [src/app/constants/stock-v2-valorisation.constants.ts](src/app/constants/stock-v2-valorisation.constants.ts) — libellés/couleurs des méthodes, couleurs de marge, `PARAMETRES_VALORISATION` (`seuilDeriveBudgetPct: 20`, `seuilMargeMinPct: 15`, `intervalRefreshMs: 30000`, `nbMoisEvolution: 12`, `ecartCoutAnormalPct: 50`).

**Décisions de modélisation (validées, impactent 7.3 et le backend)** :
- **Méthode hybride** : `ParametrageValorisation.methodeDefaut` global + `Produit.methodeValorisation?` (override ; `null` ⇒ hérite du global). Valeurs `CUMP | DERNIER_PRIX | FIXE`. `Produit.prixUnitaire` devient le **coût courant** (statique si FIXE, calculé serveur sinon). `Produit.prixVente?` ajouté (marges). **Édition via endpoints PATCH dédiés** (`/valorisation`, `/prix-vente`) — le formulaire produit 7.3 n'est PAS modifié.
- **Snapshot mouvement** : `MouvementStock.coutUnitaireSnapshot?` + `valeurMouvement?` (coût gelé à l'instant du mouvement, serveur). Mouvements antérieurs sans snapshot ⇒ **fallback** coût courant avec drapeau `estEstime` (badge orange).
- **Rétrocompatibilité** : `methodeValorisation` absente ⇒ FIXE (comportement actuel inchangé). **7.5 et EtatStock non modifiés** — la valeur stock temps réel passe par un DTO financier dédié.
- **Temps réel = polling** (rafraîchissement auto + bouton), pas de WebSocket.

**RBAC** : 7 sous-flags ajoutés dans `stock?` de [ModulesAutorises](src/app/models/admin.model.ts) : `coutUnitaire`, `coutMouvements`, `valeurStock`, `coutSite`, `coutChantier`, `marges`, `tableauBordFinancier`. Sidebar : section « Valorisation financière » gated par `accessValorisationFinanciere()` / `hasAccess('stock.xxx')`.

**Dépendances en lecture seule** : catalogue/mouvements 7.3, chantiers 7.5 (`/stock/valorisation/chantiers`), sites via `TerrainSiteClientService`. Aucun appel à l'ancien `stock.service.ts`.

**Endpoints backend à prévoir** (base `${environment.apiUrl}/stock/…`, calculs serveur) :

| Domaine (service) | Endpoints attendus |
|---|---|
| **Paramétrage** (`stock-v2-valorisation`) | `GET/PUT /stock/valorisation/parametrage` (`{ methodeDefaut }`) |
| **Coût produit** (`stock-v2-valorisation`) | `GET /stock/valorisation/couts-produits` (paginé, filtres) · `GET /{id}/historique` · `PATCH /stock/produits/{id}/valorisation` (`{ methodeValorisation }`) · `PATCH /stock/produits/{id}/prix-vente` (`{ prixVente }`) |
| **Mouvements valorisés** (`stock-v2-valorisation`) | `GET /stock/valorisation/mouvements` (filtres q/produit/type/site/dates ; renvoie `coutUnitaireSnapshot`, `valeurMouvement`, `estEstime`) |
| **Valeur stock** (`stock-v2-valorisation`) | `GET /stock/valorisation/valeur-stock?siteId=&categorieId=&comparer=JOUR\|SEMAINE\|MOIS` |
| **Coût/site** (`stock-v2-cout-site`) | `GET /stock/valorisation/cout-site?dateDebut=&dateFin=&categorieId=` |
| **Coût de revient chantier** (`stock-v2-cout-chantier`) | `GET /stock/valorisation/chantiers` (paginé) · `GET /stock/valorisation/chantiers/{id}` |
| **Marges** (`stock-v2-marge`) | `GET /stock/valorisation/marges?dateDebut=&dateFin=&categorieId=` |
| **Tableau de bord** (`stock-v2-tableau-bord-financier`) | `GET /stock/valorisation/tableau-bord?dateDebut=&dateFin=&siteId=&categorieId=` |

> Règles serveur : recalcul CUMP à chaque ENTREE (`nouveauCout = (stock×ancienCout + qté×prixAchat)/(stock+qté)`), mise à jour dernier prix si `DERNIER_PRIX`, `methodeValorisation=null ⇒ FIXE` ; stocker `coutUnitaireSnapshot` sur chaque mouvement ; quantité vendue = sorties EFFECTIVES `type=VENTE_PRODUIT` ; PDF/Excel 100 % client ; ajouter les 7 sous-flags `modules.stock.{...}` au claim JWT.

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
