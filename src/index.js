// GeoAxis — Worker principal (Cloudflare).
// /api/news y /api/market -> funciones de datos.
// /api/img        -> proxy de imágenes (trae la foto del medio sin el bloqueo
//                    de "hotlinking", para que se vea la imagen real).
// Todo lo demás   -> archivo estático desde public/ (binding ASSETS).

import { handleNews } from './news.js';
import { handleMarket } from './market.js';

const IMG_UA =
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0 Safari/537.36';

async function handleImage(request) {
  const u = new URL(request.url).searchParams.get('u');
  if (!u || !/^https?:\/\//i.test(u)) return new Response('bad request', { status: 400 });
  try {
    const r = await fetch(u, { redirect: 'follow', headers: { 'user-agent': IMG_UA, accept: 'image/*' } });
    const ct = r.headers.get('content-type') || '';
    if (!r.ok || !/^image\//i.test(ct)) return new Response('not an image', { status: 404 });
    return new Response(r.body, {
      status: 200,
      headers: { 'content-type': ct, 'cache-control': 'public, max-age=86400' },
    });
  } catch (e) {
    return new Response('error', { status: 502 });
  }
}

export default {
  async fetch(request, env) {
    const url = new URL(request.url);
    if (url.pathname === '/api/news') return handleNews();
    if (url.pathname === '/api/market') return handleMarket();
    if (url.pathname === '/api/img') return handleImage(request);
    return env.ASSETS.fetch(request);
  },
};
