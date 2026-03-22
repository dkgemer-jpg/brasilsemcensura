// functions/fetch-news.js — Cloudflare Pages Function (v5 com traducao)

async function traduzirLote(itens, groqKey) {
  if (!groqKey || itens.length === 0) return itens;

  const textos = itens.map((item, i) =>
    `[${i}] TITULO: ${item.title}\nRESUMO: ${item.desc}`
  ).join('\n\n');

  const prompt = `Traduza os textos abaixo para portugues brasileiro. Mantenha o formato exato com [numero] TITULO: e RESUMO:. Seja direto, sem explicacoes extras.\n\n${textos}`;

  try {
    const res = await fetch('https://api.groq.com/openai/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${groqKey}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        model: 'llama3-8b-8192',
        messages: [{ role: 'user', content: prompt }],
        max_tokens: 2000,
        temperature: 0.3
      }),
      signal: AbortSignal.timeout(15000)
    });

    const data = await res.json();
    const texto = data.choices?.[0]?.message?.content || '';

    // Parsear resposta
    const resultado = [...itens];
    const blocos = texto.split(/\[(\d+)\]/g);
    for (let i = 1; i < blocos.length; i += 2) {
      const idx = parseInt(blocos[i]);
      const conteudo = blocos[i + 1] || '';
      const tituloMatch = conteudo.match(/TITULO:\s*(.+?)(?:\nRESUMO:|$)/s);
      const resumoMatch = conteudo.match(/RESUMO:\s*(.+)/s);
      if (tituloMatch && idx < resultado.length) {
        resultado[idx].title = tituloMatch[1].trim();
      }
      if (resumoMatch && idx < resultado.length) {
        resultado[idx].desc = resumoMatch[1].trim().slice(0, 600);
      }
    }
    return resultado;
  } catch(e) {
    console.error('Erro traducao:', e.message);
    return itens; // retorna original se falhar
  }
}

export async function onRequest(context) {
  const corsHeaders = {
    'Access-Control-Allow-Origin': '*',
    'Content-Type': 'application/json',
  };

  if (context.request.method === 'OPTIONS') {
    return new Response(null, { status: 204, headers: { 'Access-Control-Allow-Origin': '*', 'Access-Control-Allow-Methods': 'GET, POST, OPTIONS', 'Access-Control-Allow-Headers': 'Content-Type' } });
  }

  const API_KEY = context.env.NEWSDATA_API_KEY;
  const GROQ_KEY = context.env.GROQ_API_KEY;
  let results = [];

  // 1. NewsData.io (principal)
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

  // 2. RSS em paralelo (com timeout individual de 5s cada)
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
    results = [{ title: 'Configure NEWSDATA_API_KEY', desc: 'Configure as chaves de API no Cloudflare Pages para ver noticias reais.', link: '#', source: 'Sistema', image: null }];
  }

  const finais = results.slice(0, 20);

  // 3. Traduzir noticias em ingles em lotes de 5
  if (GROQ_KEY) {
    const emIngles = finais
      .map((item, i) => ({ item, i }))
      .filter(({ item }) => !/[áéíóúãõâêîôûàèìòùç]/i.test(item.title) && /[a-zA-Z]/.test(item.title));

    // Lotes de 5 para nao ultrapassar limite
    for (let i = 0; i < emIngles.length; i += 5) {
      const lote = emIngles.slice(i, i + 5);
      const itensTraduzir = lote.map(({ item }) => item);
      const traduzidos = await traduzirLote(itensTraduzir, GROQ_KEY);
      lote.forEach(({ i: idx }, j) => {
        finais[idx] = traduzidos[j];
      });
    }
  }

  return new Response(JSON.stringify(finais), { status: 200, headers: corsHeaders });
}
