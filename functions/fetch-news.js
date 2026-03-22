// functions/fetch-news.js — Cloudflare Pages Function (v6 traducao total)

async function traduzirComGroq(itens, groqKey) {
  if (!groqKey || itens.length === 0) return null;

  const textos = itens.map((item, i) =>
    `[${i}] TITULO: ${item.title}\nRESUMO: ${item.desc}`
  ).join('\n\n');

  const prompt = `Traduza TODOS os textos abaixo para portugues brasileiro fluente. Mantenha exatamente o formato [numero] TITULO: e RESUMO:. Nao adicione explicacoes.\n\n${textos}`;

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
        max_tokens: 2500,
        temperature: 0.2
      }),
      signal: AbortSignal.timeout(20000)
    });

    if (!res.ok) return null;
    const data = await res.json();
    const texto = data.choices?.[0]?.message?.content || '';

    const resultado = itens.map(i => ({ ...i }));
    const partes = texto.split(/\[(\d+)\]/);
    for (let i = 1; i < partes.length; i += 2) {
      const idx = parseInt(partes[i]);
      const conteudo = partes[i + 1] || '';
      const tituloMatch = conteudo.match(/TITULO:\s*(.+?)(?:\nRESUMO:|$)/s);
      const resumoMatch = conteudo.match(/RESUMO:\s*([\s\S]+?)(?=\n\[|\s*$)/);
      if (tituloMatch && idx < resultado.length && tituloMatch[1].trim()) {
        resultado[idx].title = tituloMatch[1].trim();
      }
      if (resumoMatch && idx < resultado.length && resumoMatch[1].trim()) {
        resultado[idx].desc = resumoMatch[1].trim().slice(0, 600);
      }
    }
    return resultado;
  } catch(e) {
    console.error('Groq erro:', e.message);
    return null;
  }
}

async function traduzirComMyMemory(texto) {
  try {
    const url = `https://api.mymemory.translated.net/get?q=${encodeURIComponent(texto.slice(0, 500))}&langpair=en|pt-BR`;
    const res = await fetch(url, { signal: AbortSignal.timeout(5000) });
    const data = await res.json();
    return data.responseData?.translatedText || texto;
  } catch(e) {
    return texto;
  }
}

function jaPtBr(texto) {
  const palavrasPt = ['de', 'da', 'do', 'que', 'em', 'para', 'com', 'uma', 'um', 'os', 'as', 'por', 'como', 'mas', 'seu', 'sua', 'isso', 'este', 'esta', 'nos', 'ao', 'pelo', 'pela'];
  const palavras = texto.toLowerCase().split(/\s+/);
  const ptCount = palavras.filter(p => palavrasPt.includes(p)).length;
  return ptCount >= 2;
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

  // 1. NewsData.io
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

  // 2. RSS em paralelo
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

  // 3. Traducao: separar os que nao estao em PT
  const precisamTraducao = finais
    .map((item, i) => ({ item, i }))
    .filter(({ item }) => !jaPtBr(item.title));

  if (precisamTraducao.length > 0) {
    let groqFuncionou = false;

    // Tentar Groq em lotes de 5
    if (GROQ_KEY) {
      for (let i = 0; i < precisamTraducao.length; i += 5) {
        const lote = precisamTraducao.slice(i, i + 5);
        const itensTraduzir = lote.map(({ item }) => ({ ...item }));
        const traduzidos = await traduzirComGroq(itensTraduzir, GROQ_KEY);
        if (traduzidos) {
          groqFuncionou = true;
          lote.forEach(({ i: idx }, j) => {
            finais[idx] = traduzidos[j];
          });
        }
      }
    }

    // Fallback: MyMemory gratuito se Groq falhar
    if (!groqFuncionou) {
      await Promise.allSettled(
        precisamTraducao.slice(0, 10).map(async ({ item, i: idx }) => {
          const tituloTrad = await traduzirComMyMemory(item.title);
          const descTrad = item.desc ? await traduzirComMyMemory(item.desc.slice(0, 300)) : '';
          finais[idx] = { ...item, title: tituloTrad, desc: descTrad };
        })
      );
    }
  }

  return new Response(JSON.stringify(finais), { status: 200, headers: corsHeaders });
}
