# Spec backend — Pointage centralisé (RH · Temps & Présences)

> **Problème résolu par cette spec.** La page `/admin/rh/temps-et-presences/pointage-centralise`
> est vide alors que les agents se pointent bien (la donnée s'affiche dans
> *Exploitation Terrain → Suivi des pointages*).
>
> **Cause.** Les deux pages lisent des endpoints différents :
>
> | Page | Endpoint | État |
> |---|---|---|
> | Suivi terrain (✅ marche) | `GET /pointages/today` | alimenté par `POST /pointages` |
> | Pointage centralisé RH (❌ vide) | `GET /temps-presences/pointages` | **non implémenté / non alimenté** |
>
> Le frontend RH a été construit en supposant une « remontée automatique »
> des pointages terrain vers `temps-presences`. Cette agrégation côté backend
> n'existe pas encore. **Aucune modification frontend n'est requise** : il faut
> implémenter les deux endpoints ci-dessous pour qu'ils projettent le store
> `/pointages` existant (enrichi du référentiel employé) vers le contrat attendu.

---

## 1. Source de données

Les pointages bruts sont déjà créés par `POST /pointages` (page d'accueil →
code-PIN) et stockés dans l'entité **`Pointage`** :

```
Pointage {
  id, codeSecret, prenom, nom,
  date,            // jour du pointage
  heureArrive,     // "HH:mm" ou "HH:mm:ss"
  heureDepart,     // "HH:mm" / vide si encore sur site
  duree,           // texte ("7h30") côté terrain
  status,          // "EN COURS…" / clôturé
  site[],          // liste de sites
  adresse
}
```

Le **lien employé** se fait par `codeSecret` → `DossierEmploye` (code PIN de
l'agent). C'est cette jointure qui apporte `matricule`, `departement`, `poste`
et `employeId` absents du pointage brut.

---

## 2. `GET /temps-presences/pointages`

Liste paginée, **tous départements confondus**, projetée au format
`PointageCentralise`.

### Query params

| Param | Type | Défaut | Rôle |
|---|---|---|---|
| `page` | int | 0 | pagination |
| `size` | int | 20 | pagination |
| `date` | `yyyy-MM-dd` | — | jour unique (mode par défaut du front) |
| `dateDebut` | `yyyy-MM-dd` | — | borne basse (plage) |
| `dateFin` | `yyyy-MM-dd` | — | borne haute (plage) |
| `departement` | string | — | filtre exact (issu de `DossierEmploye`) |
| `site` | string | — | filtre sur le site couvert |
| `statut` | enum | — | `PRESENT` \| `ABSENT` \| `RETARD` \| `CONGE` |
| `q` | string | — | recherche libre : nom, prénom **ou** matricule |

> `date` et (`dateDebut`/`dateFin`) sont mutuellement exclusifs : si `date` est
> fourni, ignorer la plage. Si rien n'est fourni → aujourd'hui.

### Réponse — `PageResponse<PointageCentralise>` (format Spring `Page`)

```jsonc
{
  "content": [
    {
      "id": "string",                 // id pointage ou clé synthétique employeId-date
      "employeId": "string",          // DossierEmploye.id
      "matricule": "string",
      "nom": "string",
      "prenom": "string",
      "departement": "string",
      "site": "string",               // 1er site couvert (le modèle front est mono-site)
      "poste": "string|null",
      "date": "yyyy-MM-dd",
      "heureArrivee": "HH:mm|null",   // ⚠️ orthographe "Arrivee" (≠ Pointage.heureArrive)
      "heureDepart": "HH:mm|null",
      "dureeMinutes": 0,              // durée travaillée en MINUTES (number, pas le texte "7h30")
      "retardMinutes": 0,             // minutes de retard à l'arrivée (0 si à l'heure)
      "statut": "PRESENT",
      "motif": "string|null"          // motif absence / congé si pertinent
    }
  ],
  "totalElements": 0,
  "totalPages": 0,
  "number": 0,
  "size": 20
}
```

Le front ne lit que `content` et `totalElements` ; garder le reste pour
compatibilité `Page`.

### Règles de dérivation du `statut`

Pour un employé **actif** (`DossierEmploye.statut ∈ {ACTIF, EN_PERIODE_ESSAI}`)
et une date donnée :

1. **CONGE** — une absence/congé approuvé couvre la date (cf. module
   *Gestion des absences* / *Calendrier des congés* 6.2). `motif` = type d'absence.
2. **RETARD** — un pointage existe mais `heureArrive` > heure d'embauche prévue
   + tolérance. Renseigner `retardMinutes`.
3. **PRESENT** — un pointage existe et l'agent est à l'heure (`retardMinutes = 0`).
4. **ABSENT** — l'employé était attendu (planifié / actif) ce jour-là mais
   **aucun pointage** et **aucun congé**. `heureArrivee/Depart = null`.

> **Heure d'embauche de référence** pour le retard : à brancher sur le planning
> terrain (`affectation.heureDebut`) si disponible ; sinon une heure de début
> paramétrable (ex. 08:00) + tolérance (ex. 10 min). À confirmer avec le métier.

> **Cas "ABSENT" sans plage** : le front interroge par défaut un jour unique. Pour
> que les absents apparaissent, l'agrégation doit partir de la **liste des employés
> attendus** (LEFT JOIN pointages), pas seulement des pointages existants.

### Transformations notables

- `Pointage.heureArrive` → `heureArrivee` (renommage + tronquer à `HH:mm`).
- `Pointage.duree` (texte) → `dureeMinutes` (entier). Si non calculable côté
  source, recalculer `heureDepart − heureArrivee`.
- `Pointage.site[]` → `site` (string) : prendre le 1er élément ou joindre par `", "`.

---

## 3. `GET /temps-presences/pointages/resume`

Compteurs agrégés d'une journée (cartes du haut de page).

### Query params

| Param | Type | Rôle |
|---|---|---|
| `date` | `yyyy-MM-dd` | jour à résumer (obligatoire) |

### Réponse — `ResumeJournee`

```json
{
  "date": "yyyy-MM-dd",
  "totalEmployes": 0,
  "presents": 0,
  "absents": 0,
  "retards": 0,
  "enConge": 0
}
```

Cohérence attendue : `presents + absents + retards + enConge == totalEmployes`
(les `RETARD` sont comptés à part des `PRESENT`). Mêmes règles de dérivation
qu'au §2.4. Doit respecter le même périmètre que la liste (tous départements).

---

## 4. Checklist d'implémentation

- [ ] Jointure `Pointage.codeSecret → DossierEmploye` (résolution employeId / matricule / département / poste).
- [ ] Base de l'agrégation = employés attendus (pour faire remonter les ABSENT), pas les pointages seuls.
- [ ] Branchement congés/absences (6.2) pour le statut `CONGE`.
- [ ] Heure de référence pour le calcul du retard (planning ou paramètre).
- [ ] Filtres `date` / plage / `departement` / `site` / `statut` / `q`.
- [ ] Pagination `Page` Spring (`content` + `totalElements`).
- [ ] RBAC : protéger derrière le module RH Temps & Présences (claim JWT).
- [ ] Renommage `heureArrive → heureArrivee` et `duree(texte) → dureeMinutes(int)`.

## 5. Contrats frontend de référence (ne pas modifier)

- Service : [pointage-centralise.service.ts](../../src/app/services/pointage-centralise.service.ts)
- Modèles : [pointage-centralise.model.ts](../../src/app/models/pointage-centralise.model.ts)
- Composant : [pointage-centralise.component.ts](../../src/app/adminPage/ressources-humaines/temps-et-presences/pointage-centralise/pointage-centralise.component.ts)
