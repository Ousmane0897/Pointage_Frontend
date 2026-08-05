/**
 * Rôles applicatifs — valeurs exactes du claim `role` du JWT.
 *
 * ⚠ Le super-administrateur est `SUPERADMIN`, **sans underscore** : c'est la chaîne
 * réellement émise par le backend et comparée dans la sidebar. `SUPER_ADMIN` n'existe
 * nulle part dans l'application.
 *
 * La liste des rôles assignables depuis l'écran de gestion des privilèges se trouve dans
 * `gestion-privilege.component.ts` (le super-admin ne s'y crée pas — uniquement côté serveur).
 */
export const ROLE_SUPERADMIN = 'SUPERADMIN';
export const ROLE_CONTROLEUR_STOCK = 'CONTROLEUR_STOCK';

/**
 * Rôle RH — niveau 2 du circuit de validation des congés.
 * ⚠ `sidebar.accessRh()` traite déjà ce rôle comme un accès RH complet.
 */
export const ROLE_RH = 'RH';

/**
 * Niveau 3 du circuit de validation des congés : la **Direction générale est
 * le super-admin**. Aucun rôle `DIRECTION_GENERALE` n'existe ni ne doit être
 * créé — l'alias ci-dessous n'est là que pour rendre les appels lisibles.
 */
export const ROLE_DIRECTION_GENERALE = ROLE_SUPERADMIN;
