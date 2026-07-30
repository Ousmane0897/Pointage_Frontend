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
