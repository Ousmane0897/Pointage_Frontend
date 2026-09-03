// Configuration de production : l'API est servie depuis une origine DISTINCTE du
// frontend (`api.pointic-cleanic.com`), d'où des URLs absolues. Le CORS est donc
// géré côté backend — c'est lui qui doit autoriser l'origine du front.
//
// ⚠ Ne pas confondre avec le stack Docker mono-hôte (docker-compose + nginx.conf),
// où le front proxifie `/api/` et `/ws` vers `springboot:8080` : là, et là
// seulement, des chemins relatifs (`/api`, `/ws`) fonctionnent. Ce fichier décrit
// la production réelle, pas ce montage local.
export const environment = {
  production: true,
  apiUrl: 'https://api.pointic-cleanic.com/api',
  wsUrl: 'https://api.pointic-cleanic.com/ws',
  googleMapsApiKey: ''
};
