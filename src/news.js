// GeoAxis — Noticias mineras en tiempo real (módulo del Worker).
// Lee el RSS de Google News, decodifica el enlace hasta el medio real
// y extrae la imagen (og:image) de cada noticia.

const ENRICH_LIMIT = 8;
const BATCH = 8;
const STEP_TIMEOUT = 3000;
const BROWSER_UA =
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0 Safari/537.36';

function withTimeout(ms) {
  const c = new AbortController();
  const t = setTimeout(() => c.abort(), ms);
  return { signal: c.signal, done: () => clearTimeout(t) };
}

function cleanImageUrl(u) {
  u = String(u || '').trim();
  if (!/^https?:\/\//i.test(u)) return '';
  if (/[\s"'<>\\]/.test(u)) return '';
  return u;
}

function ogImageFromHtml(html) {
  const text = String(html || '').slice(0, 200000);
  const patterns = [
    /<meta[^>]+property=["']og:image(?::secure_url)?["'][^>]+content=["']([^"']+)["']/i,
    /<meta[^>]+content=["']([^"']+)["'][^>]+property=["']og:image["']/i,
    /<meta[^>]+name=["']twitter:image["'][^>]+content=["']([^"']+)["']/i,
  ];
  for (const re of patterns) {
    const m = text.match(re);
    if (m && m[1]) {
      let url = m[1].replace(/&amp;/g, '&').trim();
      if (url.startsWith('//')) url = 'https:' + url;
      if (/^https?:\/\//i.test(url)) return cleanImageUrl(url);
    }
  }
  return '';
}

async function resolveRealUrl(id, sg, ts) {
  if (!sg || !ts) return '';
  try {
    const reqArr = [
      [
        'Fbv4je',
        '["garturlreq",[["X","X",["X","X"],null,null,1,1,"US:en",null,1,null,null,null,null,null,0,1],' +
          '"X","X",1,[1,1,1],1,1,null,0,0,null,0],"' + id + '",' + ts + ',"' + sg + '"]',
      ],
    ];
    const payload = 'f.req=' + encodeURIComponent(JSON.stringify([reqArr]));
    const b = withTimeout(STEP_TIMEOUT);
    const res = await fetch('https://news.google.com/_/DotsSplashUi/data/batchexecute', {
      method: 'POST',
      signal: b.signal,
      headers: { 'content-type': 'application/x-www-form-urlencoded;charset=UTF-8', 'user-agent': BROWSER_UA },
      body: payload,
    }).finally(b.done);
    if (!res.ok) return '';
    const text = await res.text();
    const m = text.match(/garturlres\\",\\"(https?:\/\/[^\\"]+)/);
    return m ? m[1].replace(/\\u003d/g, '=').replace(/\\u0026/g, '&') : '';
  } catch (e) {
    return '';
  }
}

async function fetchArticleImage(realUrl) {
  if (!realUrl || /news\.google\.com/i.test(realUrl)) return '';
  const t = withTimeout(STEP_TIMEOUT);
  try {
    const res = await fetch(realUrl, {
      signal: t.signal,
      redirect: 'follow',
      headers: { 'user-agent': BROWSER_UA, accept: 'text/html' },
    });
    if (!res.ok) return '';
    return ogImageFromHtml(await res.text());
  } catch (e) {
    return '';
  } finally {
    t.done();
  }
}

async function enrich(item) {
  if (!/news\.google\.com/i.test(item.url)) {
    if (!item.imageUrl) item.imageUrl = await fetchArticleImage(item.url);
    return item;
  }
  const idMatch = item.url.match(/\/(?:rss\/)?articles\/([^?\/]+)/);
  if (!idMatch) return item;
  const id = idMatch[1];

  let gThumb = '';
  let sg = '';
  let ts = '';
  try {
    const a = withTimeout(STEP_TIMEOUT);
    const pageRes = await fetch('https://news.google.com/articles/' + id, {
      signal: a.signal,
      headers: { 'user-agent': BROWSER_UA },
    }).finally(a.done);
    if (pageRes.ok) {
      const html = (await pageRes.text()).slice(0, 200000);
      gThumb = ogImageFromHtml(html);
      sg = (html.match(/data-n-a-sg="([^"]+)"/) || [])[1] || '';
      ts = (html.match(/data-n-a-ts="([^"]+)"/) || [])[1] || '';
    }
  } catch (e) {}

  const realUrl = await resolveRealUrl(id, sg, ts);
  if (realUrl) item.url = realUrl;

  const realImg = realUrl ? await fetchArticleImage(realUrl) : '';
  item.imageUrl = cleanImageUrl(item.imageUrl || realImg || gThumb || '');
  return item;
}

export async function handleNews() {
  const feed =
    'https://news.google.com/rss/search?q=' +
    encodeURIComponent('minería Chile cobre litio Codelco mercado minero when:14d') +
    '&hl=es-419&gl=CL&ceid=CL:es-419';

  function cleanText(value) {
    return String(value || '')
      .replace(/<[^>]*>/g, '')
      .replace(/&nbsp;/g, ' ')
      .replace(/&amp;/g, '&')
      .replace(/&#39;/g, "'")
      .replace(/&quot;/g, '"')
      .replace(/&lt;/g, '<')
      .replace(/&gt;/g, '>')
      .trim();
  }
  function tag(text, name) {
    const match = text.match(new RegExp('<' + name + '[^>]*>([\\s\\S]*?)<\\/' + name + '>', 'i'));
    return match ? match[1] : '';
  }

  try {
    const response = await fetch(feed, { headers: { 'user-agent': 'GeoAxis/1.0' } });
    if (!response.ok) throw new Error('Google News RSS error');
    const xml = await response.text();
    const blocks = xml.match(/<item>[\s\S]*?<\/item>/gi) || [];

    let items = blocks
      .slice(0, 18)
      .map(function (block) {
        const title = cleanText(tag(block, 'title'));
        const source = cleanText(tag(block, 'source')) || 'Google News';
        const date = cleanText(tag(block, 'pubDate'));
        const url = cleanText(tag(block, 'link'));
        const summary = cleanText(tag(block, 'description') || title);
        return { title, source, date, url, summary: summary.slice(0, 220), imageUrl: '' };
      })
      .filter(function (item) {
        return item.title && item.url;
      });

    const toEnrich = items.slice(0, ENRICH_LIMIT);
    for (let i = 0; i < toEnrich.length; i += BATCH) {
      await Promise.all(toEnrich.slice(i, i + BATCH).map(enrich));
    }

    return new Response(JSON.stringify({ items }), {
      status: 200,
      headers: { 'content-type': 'application/json; charset=utf-8', 'cache-control': 'public, max-age=900' },
    });
  } catch (error) {
    return new Response(JSON.stringify({ error: 'No se pudieron cargar noticias reales' }), {
      status: 502,
      headers: { 'content-type': 'application/json; charset=utf-8' },
    });
  }
}
