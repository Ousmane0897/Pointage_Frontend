// Configuration de production : frontend et API sont servis depuis la MÊME origine.
// Le conteneur nginx du front (voir nginx.conf) proxifie `/api/` et `/ws` vers
// `springboot:8080` sur le réseau Docker interne — d'où des chemins relatifs, et
// non une URL absolue.
//
// ⚠ Ne pas remettre d'URL absolue (ex. https://api.pointic-cleanic.com/api) sans
// exposer publiquement le backend ET rouvrir le CORS côté serveur : en l'état, la
// requête partirait vers une origine tierce et serait bloquée par le navigateur.
export const environment = {
  production: true,
  apiUrl: '/api',
  wsUrl: '/ws',
  googleMapsApiKey: ''
};
