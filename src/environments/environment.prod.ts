// Configuration de production : le frontend et l'API sont servis depuis des
// origines distinctes (CORS géré côté backend).
export const environment = {
  production: true,
  apiUrl: 'https://api.pointic-cleanic.com/api',
  wsUrl: 'https://api.pointic-cleanic.com/ws',
  googleMapsApiKey: ''
};
