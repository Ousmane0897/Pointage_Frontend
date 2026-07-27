/**
 * Utilitaires de normalisation de texte pour les recherches/filtres côté client.
 *
 * `normaliserTexte` produit une forme comparable insensible à la casse ET aux
 * accents (« Créme » → « creme »), ce qui est attendu en contexte français.
 * À utiliser DES DEUX CÔTÉS d'une comparaison (terme saisi et champ comparé).
 *
 * Pattern repris des services d'import (import-employe-excel, stock-v2-import-excel).
 */

/** Normalise un texte pour comparaison de recherche : minuscule, sans accents, trim. */
export function normaliserTexte(valeur: string | null | undefined): string {
  return String(valeur ?? '')
    .trim()
    .toLowerCase()
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '');
}

/**
 * Vrai si `terme` est contenu dans `champ`, sans tenir compte de la casse ni
 * des accents. Les deux opérandes sont normalisés avant comparaison.
 */
export function contientTexte(champ: string | null | undefined, terme: string): boolean {
  return normaliserTexte(champ).includes(normaliserTexte(terme));
}
