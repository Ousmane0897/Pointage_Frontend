# Audit — Validation des congés et périmètre de l'organigramme

> **Règle métier vérifiée.** Seuls les employés ayant des subordonnés rattachés à eux dans
> l'organigramme accèdent à l'écran « Validation congés », et ils ne voient que les demandes des
> personnes dont ils sont responsables. La RH et le super-admin (Direction générale) conservent
> la vue complète — sans quoi les niveaux 2 et 3 du circuit seraient inatteignables.
>
> **Verdict : conforme.** Le mécanisme est implémenté et mergé sur `main` côté backend
> (commits `2eef61b` *circuit de validation à 3 niveaux* et `1733610` *périmètre de visibilité*).
> Aucune modification frontend n'est requise. **Trois écarts** subsistent, décrits en §4, dont
> une faille d'écriture sur `PUT /demandes/{id}`.
>
> Cette note est un état des lieux daté du 2026-09-02 ; elle ne décrit aucun développement à faire.

---

## 1. Règle appliquée

Le circuit est `EN_ATTENTE_SUPERIEUR → EN_ATTENTE_RH → EN_ATTENTE_DG → APPROUVE`, un refus étant
terminal à n'importe quel niveau.

| Niveau | Qui | Comment il est déterminé |
|---|---|---|
| 1 — Supérieur | l'employé désigné `superieurHierarchiqueId` du demandeur | **organigramme**, pas un rôle ; figé sur la demande à sa création |
| 2 — RH | rôle `RH` | rôle du JWT |
| 3 — Direction générale | rôle `SUPERADMIN` | rôle du JWT ; aucun rôle `DIRECTION_GENERALE` n'existe |

**Profondeur retenue : le subordonné direct.** Un N+2 ne voit pas les demandes de ses N-2 —
`perimetreLecture()` ne fait pas de parcours récursif de l'arbre. C'est un choix, pas un oubli.

Le périmètre de lecture d'un compte est donc : **lui-même + ses subordonnés directs**, plus les
demandes dont il est le validateur figé (voir §3).

---

## 2. Chaîne d'application

Tout est borné **serveur**. Le frontend n'est qu'une commodité d'affichage.

| Point de contrôle | Backend | Consommateur front |
|---|---|---|
| Accès à l'écran | `CongeModuleEnricher.enrichir()` pose `modules.rh.congesValidation` **au login**, dès que `dossierEmployeRepository.existsBySuperieurHierarchiqueId(employeId)` est vrai. Additif uniquement (jamais retiré), non persisté, et un échec n'empêche jamais la connexion. | `sidebar.component.ts` → `accessCongesValidation()` → `LoginService.accesRh('congesValidation')`. Simple relais du claim, plus un court-circuit sur les rôles `RH` / `SUPERADMIN`. |
| Résolution « qui suis-je » | `CongeIdentiteService.employeCourant()` : e-mail du JWT → `findByEmailIgnoreCase` → `DossierEmploye`. Le JWT ne porte **ni `id` ni `employeId`**. | `GET /temps-presences/conges/moi` → `MonProfilConge`, mis en cache par `CongeService`. |
| Périmètre de lecture | `CongeIdentiteService.perimetreLecture()` → record `PerimetreConges(voitTout, moi, employesVisibles)`. RH/SUPERADMIN ⇒ `tout()` ; compte non rattaché à un dossier ⇒ `vide()`, jamais total. | `CongePermissionsService.voitTousLesConges()` / `voitPlusieursEmployes()` — **purement cosmétiques** (masquage de filtres et de colonnes). |
| File de validation | `CongeWorkflowService.demandesAValider()` : au niveau 1 hors super-admin, requête `findBySuperieurHierarchiqueIdAndStatutInOrderByDateDemandeDesc(moi, …)`. Un niveau non validable ⇒ page vide. | `validation-conges.component.ts` appelle `GET /demandes/a-valider` avec `page`, `size`, `niveau` — **aucun paramètre d'employé**, le périmètre n'est pas élargissable depuis le client. |
| Pastille du menu | `CongeWorkflowService.compteurs()` → `countBySuperieurHierarchiqueIdAndStatutIn` au niveau 1, `countByStatutIn` aux niveaux gouvernés par un rôle. | `sidebar.chargerCompteurConges()` → `GET /demandes/a-valider/compteurs`. |
| Boutons Valider / Refuser | `CongeWorkflowService.decorer()` → `peutValider(statut, superieurHierarchiqueId)`, posé sur chaque DTO. La même méthode sert de garde d'écriture (`exigerHabilitation`) : `POST /valider` et `/refuser` renvoient **403** hors habilitation. | `CongePermissionsService.peutValiderNiveau()` lit `DemandeConge.peutValiderParMoi`. Les actions non autorisées sont **masquées**, pas grisées. |
| Fiche d'une demande | `getPourAppelant()` → `PerimetreConges.voitDemande()` → **403** (`CongeAccesRefuseException`) hors périmètre. | `detail-demande-conge` affiche le 403 **dans l'écran** (cas nominal), jamais en toast. |
| Listes, soldes, historique employé | `DemandeCongeService.searchDemandes` / `getSoldes` / `getSolde` / `getByEmployeId` appliquent le périmètre **en tête de chaîne, avant pagination**, pour que `totalElements` reflète le périmètre. | `calendrier-conges`, fiche employé onglet Congés. |
| Onglet voisin « Déclarations » | `RhAbsenceService` est filtré au même titre (`search`, `getAll`, `getByEmployeId`, `requireById`, `create`). | `liste-absences`. Sans cette garde, la restriction posée sur les congés serait contournable en un clic depuis l'onglet voisin de la **même rubrique**. |

---

## 3. Deux subtilités à ne pas défaire

- **Le validateur figé fait partie du périmètre.** `voitDemande(employeId, superieurHierarchiqueId)`
  ajoute une clause sur le supérieur désigné *à la création de la demande*. Après une réorganisation,
  celui qui a reçu le lien par e-mail doit pouvoir ouvrir la demande, alors qu'il n'est plus le
  manager courant du demandeur. Retirer cette clause casserait les liens des notifications.
- **Coût de lecture.** `CurrentUserProvider.currentRole()` déclenche 1 à 2 lectures Mongo : il ne
  doit y avoir **qu'un seul `perimetreLecture()` par méthode publique**, le résultat circulant en
  variable locale. Ne jamais appeler `estRh()` / `estSuperAdmin()` à l'intérieur d'un stream de
  filtrage.

Et ce que le front ne fait **jamais** : calculer une habilitation. Pas de `getEmployes(0, 500)`
pour deviner ses subordonnés (ce serait faux au-delà de 500 employés) ; l'identité et les niveaux
validables viennent de `GET /moi` et de `GET /demandes/a-valider`.

---

## 4. Écarts constatés — non traités dans ce lot

### 4.1 `PUT /api/temps-presences/conges/demandes/{id}` n'a aucune garde ⚠️

`DemandeCongeService.update()` enchaîne un `findById` et un `save` : ni périmètre, ni habilitation,
ni contrôle de statut.

```java
public DemandeCongeDto update(String id, DemandeCongeDto dto) {
    DemandeConge existing = demandeCongeRepository.findById(id)
            .orElseThrow(() -> new ResourceNotFoundException("Demande de congé introuvable : " + id));
    existing.setType(dto.getType());
    existing.setDateDebut(dto.getDateDebut());
    // … save
}
```

**Tout compte authentifié peut modifier le type, les dates et le motif de la demande de n'importe
qui, y compris une demande déjà approuvée.** C'est le seul écart qui contredit franchement la règle
métier auditée. Correctif suggéré : `exigerVisibilite(existing.getEmployeId())`, restriction au
demandeur (ou RH / super-admin), et refus **409** sur un statut terminal — en s'alignant sur
`CongeWorkflowService.annuler`, qui vérifie déjà l'appelant.

À surveiller au passage : `DemandeCongeService.getById` et `getAll` n'appliquent aucun périmètre.
Ils ne sont pas exposés aujourd'hui (`GET /demandes/{id}` passe par `getPourAppelant`), mais ce sont
des pièges pour un futur endpoint.

### 4.2 Pagination faussée de la file « Tous niveaux »

Toujours dans `demandesAValider()`, la branche « niveaux 2 et 3 » re-filtre `resultat.getContent()`
**après** pagination tout en conservant `resultat.getTotalElements()` : pages partiellement vides et
compteur surévalué.

N'affecte pas un manager pur, qui passe par la branche repository correcte — seulement un compte
cumulant `SUPERIEUR` et `RH`, pour qui le filtre est de surcroît **trop restrictif** (la RH a le
droit de voir toutes les demandes de niveau 1). À l'inverse, `searchDemandes` filtre bien en tête
de chaîne et le commente explicitement : c'est le modèle à suivre.

Note de perf connexe : `searchDemandes` charge la collection entière (`findAll()`) à chaque appel.

### 4.3 Le droit est figé au login

Le claim étant calculé à l'émission du JWT, un employé nommé manager **après** sa connexion ne voit
pas l'entrée « Validation congés » tant qu'il ne se reconnecte pas. Comportement acceptable, mais à
énoncer aux utilisateurs. Une alternative serait d'alimenter l'entrée de sidebar depuis
`MonProfilConge.niveauxValidables` (`GET /moi`, déjà appelé) plutôt que depuis le seul claim.

### Deux points mineurs, qui ne sont pas des défauts

- **Pas de guard de route** sur `/admin/rh/temps-et-presences/conges/validation` : l'écran s'ouvre
  par URL directe pour tout compte connecté, mais la file revient **vide** (`niveauxCibles` vide ⇒
  `PageImpl` vide) et les actions sont masquées. La protection est serveur, comme partout dans le
  module — un guard ne serait que cosmétique.
- **Repli permissif** de `CongePermissionsService.peutValiderNiveau()` (TODO commenté) : inerte tant
  que le backend renvoie `peutValiderParMoi`, ce qu'il fait sur `main`. À retirer le jour où l'on
  voudra une garantie front stricte.

---

## 5. Comment vérifier

Backend sur `main`, front lancé par `npm start`.

1. **Manager** — compte dont au moins un `DossierEmploye` porte son id en `superieurHierarchiqueId`,
   sans rôle RH ni SUPERADMIN : l'entrée « Validation congés » apparaît ; la file ne contient que
   ses subordonnés directs ; la pastille égale le nombre de lignes.
2. **Non-manager** : l'entrée est absente ; l'URL directe ouvre une file **vide** ;
   `GET /temps-presences/conges/demandes/{id}` sur la demande d'un tiers renvoie **403**, affiché
   dans l'écran et non en toast.
3. **RH / SUPERADMIN** : vue complète, les trois onglets de niveau sont proposés.
4. **Manager, demande d'un non-subordonné** : `POST …/valider` renvoie **403**
   (`CongeAccesRefuseException`).
5. Tests backend : `./gradlew test --tests '*Conge*'` — `CongeIdentiteServicePerimetreTest`,
   `CongeWorkflowServiceTest`, `DemandeCongeServiceScopeTest`, `TempsPresencesCongeControllerTest`,
   `JwtRhClaimTest`.
6. Tests front : `npm test`, dont `conge-permissions.service.spec.ts` (21 tests).
