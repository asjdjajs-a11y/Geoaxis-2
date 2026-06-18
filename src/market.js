// GeoAxis — Precios de metales (módulo del Worker). Cobre, oro y plata desde Yahoo Finance.
export async function handleMarket() {
  const symbols = ['HG=F', 'GC=F', 'SI=F'];
  const url =
    'https://query1.finance.yahoo.com/v7/finance/quote?symbols=' + encodeURIComponent(symbols.join(','));
  try {
    const response = await fetch(url, {
      headers: { 'user-agent': 'Mozilla/5.0 GeoAxis/1.0', accept: 'application/json' },
    });
    if (!response.ok) throw new Error('Yahoo Finance error');
    const data = await response.json();
    return new Response(JSON.stringify(data), {
      status: 200,
      headers: { 'content-type': 'application/json; charset=utf-8', 'cache-control': 'public, max-age=120' },
    });
  } catch (error) {
    return new Response(JSON.stringify({ error: 'No se pudieron cargar precios externos' }), {
      status: 502,
      headers: { 'content-type': 'application/json; charset=utf-8' },
    });
  }
}
