
exports.handler = async function() {
  const symbols = ['HG=F', 'GC=F', 'SI=F'];
  const url = 'https://query1.finance.yahoo.com/v7/finance/quote?symbols=' + encodeURIComponent(symbols.join(','));

  try{
    const response = await fetch(url, {
      headers: {
        'user-agent': 'Mozilla/5.0 GeoAxis/1.0',
        'accept': 'application/json'
      }
    });
    if(!response.ok) throw new Error('Yahoo Finance error');
    const data = await response.json();

    return {
      statusCode: 200,
      headers: {
        'content-type': 'application/json; charset=utf-8',
        'cache-control': 'public, max-age=120'
      },
      body: JSON.stringify(data)
    };
  }catch(error){
    return {
      statusCode: 502,
      headers: { 'content-type': 'application/json; charset=utf-8' },
      body: JSON.stringify({ error: 'No se pudieron cargar precios externos' })
    };
  }
};
