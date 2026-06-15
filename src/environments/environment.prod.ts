// ⚠️ TEMPORAIRE — tests locaux via Docker/ngrok : URLs relatives proxifiées par nginx
// (location /api/ et /ws → springboot:8080). À RESTAURER avant déploiement distant :
//   apiUrl: 'https://api.pointic-cleanic.com/api'
//   wsUrl:  'https://api.pointic-cleanic.com/ws'
export const environment = {
  production: true,
  apiUrl: 'https://api.pointic-cleanic.com/api',
  wsUrl: 'https://api.pointic-cleanic.com/ws',
  googleMapsApiKey: ''
};