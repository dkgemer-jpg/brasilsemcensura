// functions/fetch-news.js — Cloudflare Pages Function

export async function onRequest(context) {
  const corsHeaders = {
    'Access-Control-Allow-Origin': '*',
    'Content-Type': 'application/json',
  };

  if (context.request.method === 'OPTIONS') {
    return new Response(null, { status: 204, headers: { 'Access-Control-Allow-Origin': '*', 'Access-Control-Allow-Methods': 'GET, POST, OPTIONS', 'Access-Control-Allow-Headers': 'Content-Type' } });
  }

  const API_KEY = context.env.NEWSDATA_API_KEY;
  let results = [];

  if (API_KEY && API_KEY !== 'your_newsdata_api_key_here') {
    try {
      const query = 'Brasil OR BRICS OR geopolitica OR China OR Russia OR censura OR tecnologia';
      const url = `https://newsdata.io/api/1/news?apikey=${API_KEY}&language=pt,en&q=${encodeURIComponent(query)}&size=10`;
      const res = await fetch(url, { signal: AbortSignal.timeout(8000) });
      const data = await res.json();
      if (data.status === 'success' && data.results) {
        results = data.results.map(item => ({
          title: item.title || '',
          desc: (item.description || item.content || '').slice(0, 600),
          link: item.link || '#',
          source: item.source_id || 'Global',
          image: item.image_url || null
        }));
      }
    } catch(e) { console.error('NewsData erro:', e.message); }
  }

  if (results.length < 15) {
    const rssFeeds = [
      { url: 'https://www.aljazeera.com/xml/rss/all.xml', source: 'Al Jazeera' },
      { url: 'https://theintercept.com/feed/?rss', source: 'The Intercept' },
      { url: 'https://brasil.elpais.com/rss/brasil/portada.xml', source: 'El País BR' },
      { url: 'https://www.rt.com/rss/news/', source: 'RT News' },
    ];

    const rssResults = await Promise.allSettled(
      rssFeeds.map(async (feed) => {
        const res = await fetch(feed.url, {
          headers: { 'User-Agent': 'Mozilla/5.0' },
          signal: AbortSignal.timeout(5000)
        });
        const xml = await res.text();
        const items = xml.match(/<item>([\s\S]*?)<\/item>/g) || [];
        const parsed = [];
        for (const item of items.slice(0, 4)) {
          const title = (item.match(/<title><!\[CDATA\[(.*?)\]\]><\/title>/) || item.match(/<title>(.*?)<\/title>/) || [])[1] || '';
          const desc  = (item.match(/<description><!\[CDATA\[(.*?)\]\]><\/description>/) || item.match(/<description>(.*?)<\/description>/) || [])[1] || '';
          const link  = (item.match(/<link>(.*?)<\/link>/) || [])[1] || '#';
          if (title) parsed.push({ title: title.trim(), desc: desc.replace(/<[^>]+>/g, '').trim().slice(0, 600), link: link.trim(), source: feed.source, image: null });
        }
        return parsed;
      })
    );

    for (const r of rssResults) {
      if (r.status === 'fulfilled') results.push(...r.value);
      if (results.length >= 20) break;
    }
  }

  if (results.length === 0) {
    results = [{ title: 'Configure NEWSDATA_API_KEY', desc: 'Configure as chaves de API no Cloudflare Pages para ver notícias reais.', link: '#', source: 'Sistema', image: null }];
  }

  return new Response(JSON.stringify(results.slice(0, 20)), { status: 200, headers: corsHeaders });
}
