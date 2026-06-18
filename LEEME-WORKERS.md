# GeoAxis — versión para Cloudflare Workers

Cloudflare ya no ofrece "Pages" fácil a las cuentas nuevas: te lleva a
"Workers". Esta versión está adaptada para ese flujo (el de la pantalla con
"Build command" y "Deploy command").

## Qué cambió respecto a la versión anterior
- Los archivos del sitio (todas las páginas y `assets/`) ahora van dentro de
  la carpeta **`public/`**.
- El código de servidor está en **`src/`** (un Worker que responde
  `/api/news` y `/api/market`).
- Hay un archivo de configuración **`wrangler.jsonc`** que une las dos cosas.

## Pasos para subirlo

1. En GitHub, lo más simple es **crear un repositorio nuevo** (por ejemplo
   `geoaxis-cf`) y subir TODO el contenido de esta carpeta:
   `public/`, `src/`, `wrangler.jsonc`, `netlify/` y el `package.json` si
   aparece. (Igual que antes: sube el *contenido*, no la carpeta de afuera.)

2. En Cloudflare: **Workers & Pages → Create → Import a repository** (o
   "Continue with GitHub") y elige ese repositorio.

3. IMPORTANTE: el nombre del Worker en Cloudflare debe coincidir con el del
   archivo `wrangler.jsonc`. Ahí dice `"name": "geoaxis"`. Cuando Cloudflare
   te pida el nombre, usa **geoaxis** (o, si usas otro, edita esa línea del
   `wrangler.jsonc` para que coincida).

4. En la configuración de compilación:
   - **Build command:** déjalo vacío (o `exit 0`)
   - **Deploy command:** `npx wrangler deploy`  (suele venir puesto)

5. Presiona **Deploy** y espera.

6. Tu sitio quedará en una dirección tipo `https://geoaxis.TU-CUENTA.workers.dev`
   (o el dominio que te muestre).

## Comprobar que las noticias funcionan
Abre, con tu dirección:  `.../api/news`
- Si ves texto JSON con noticias e `imageUrl` → ¡listo!
