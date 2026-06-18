// GeoAxis — Worker principal (Cloudflare).
// Responde las rutas /api/* con las funciones; todo lo demás lo sirve como
// archivo estático desde la carpeta public/ (binding ASSETS).

import { handleNews } from './news.js';
import { handleMarket } from './market.js';

export default {
  async fetch(request, env) {
    const url = new URL(request.url);
    if (url.pathname === '/api/news') return handleNews();
    if (url.pathname === '/api/market') return handleMarket();
    return env.ASSETS.fetch(request);
  },
};
