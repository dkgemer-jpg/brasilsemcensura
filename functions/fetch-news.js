// fetch-news.js v9 — Brasil Sem Censura
// SOLUÇÃO DEFINITIVA: Cache Busting + Ordenação por Data + Fallback de Tempo + Atualização Diferenciada (Premium/Grátis)

export async function onRequest(context) {
  const { env, request } = context;

  const NEWSDATA_API_KEY = env.NEWSDATA_API_KEY;
  const GROQ_API_KEY = env.GROQ_API_KEY;

  if (!NEWSDATA_API_KEY || !GROQ_API_KEY) {
    return new Response(JSON.stringify({ error: "Chaves de API ausentes", articles: [] }), {
      status: 500,
      headers: { "Content-Type": "application/json", "Access-Control-Allow-Origin": "*" }
    });
  }

  const url = new URL(request.url);
  const isPremium = url.searchParams.get("premium") === "true"; // Verifica se o usuário é Premium

  // Define o tempo de cache baseado no status Premium
  const cacheDuration = isPremium ? 1800 : 3600; // 30 minutos para Premium, 1 hora para Grátis

  // Cache Busting: Adiciona um número aleatório para forçar a Cloudflare e a API a buscarem dados novos
  const cacheBuster = Math.random().toString(36).substring(7);
  const timestamp = new Date().getTime();

  const keywords = [
    "geopolitica", "guerra", "otan", "nato", "russia", "ucrania", "china", "eua", "israel",
    "palestina", "iran", "siria", "africa", "asia", "america latina", "brasil", "politica",
    "economia", "sancoes", "diplomacia", "nuclear", "exercito", "militares", "crise"
  ];

  // Sorteia 5 palavras-chave diferentes a cada requisição para variar os resultados
  const shuffled = keywords.sort(() => 0.5 - Math.random());
  const query = shuffled.slice(0, 5).join(" OR ");

  try {
    // Chamada da API com parâmetros para forçar atualização:
    // 1. &sort=pubDate (Mais recentes primeiro)
    // 2. &cb=${cacheBuster} (Cache Busting para a API)
    const newsRes = await fetch(
      `https://newsdata.io/api/1/news?apikey=${NEWSDATA_API_KEY}&q=${encodeURIComponent(query)}&language=pt,en&category=politics,world&size=20&sort=pubDate&cb=${cacheBuster}`,
      {
        method: 'GET',
        headers: {
          'Cache-Control': 'no-cache',
          'Pragma': 'no-cache'
        }
      }
    );
    const newsData = await newsRes.json();

    if (!newsData.results || newsData.results.length === 0) {
      return new Response(JSON.stringify({ articles: [], message: "Nenhum resultado novo encontrado." }), {
        headers: { 
          "Content-Type": "application/json", 
          "Access-Control-Allow-Origin": "*",
          "Cache-Control": `public, max-age=${cacheDuration}` // Cache baseado no status Premium
        }
      });
    }

    const articles = await Promise.all(
      newsData.results.slice(0, 20).map(async (article) => {
        try {
          const prompt = `Voce e um jornalista brasileiro especializado em geopolitica.
Traduza para portugues brasileiro e resuma em 3 linhas claras e diretas.
Titulo original: "${article.title}"
Descricao original: "${article.description || ""}"

Responda APENAS com JSON valido no formato:
{"titulo":"titulo em pt-br","resumo":"resumo em 3 linhas","relevancia":"alta|media|baixa","selo":"Verificado por Brasil Sem Censura"}`;

          const groqRes = await fetch("https://api.groq.com/openai/v1/chat/completions", {
            method: "POST",
            headers: {
              "Authorization": `Bearer ${GROQ_API_KEY}`,
              "Content-Type": "application/json"
            },
            body: JSON.stringify({
              model: "llama3-8b-8192",
              messages: [{ role: "user", content: prompt }],
              max_tokens: 300,
              temperature: 0.3
            })
          });

          const groqData = await groqRes.json();
          let raw = groqData.choices?.[0]?.message?.content || "{}";
          raw = raw.replace(/```json/g, "").replace(/```/g, "").trim();
          
          let parsed = {};
          try {
            parsed = JSON.parse(raw);
          } catch (e) {
            parsed = { titulo: article.title, resumo: article.description || "" };
          }

          return {
            id: article.article_id || `art-${timestamp}-${Math.random().toString(36).substring(7)}`,
            titulo: parsed.titulo || article.title,
            resumo: parsed.resumo || article.description || "",
            relevancia: parsed.relevancia || "media",
            selo: "Verificado por Brasil Sem Censura",
            fonte: article.source_id || "Desconhecida",
            url: article.link || "#",
            imagem: article.image_url || null,
            data: article.pubDate || new Date().toISOString()
          };
        } catch (err) {
          return {
            id: article.article_id || `fallback-${timestamp}`,
            titulo: article.title,
            resumo: article.description || "",
            relevancia: "media",
            selo: "Verificado por Brasil Sem Censura",
            fonte: article.source_id || "Desconhecida",
            url: article.link || "#",
            imagem: article.image_url || null,
            data: article.pubDate || new Date().toISOString()
          };
        }
      })
    );

    // Retorna a resposta com cabeçalhos anti-cache agressivos e cache diferenciado
    return new Response(JSON.stringify({ articles: articles, updated_at: timestamp }), {
      headers: {
        "Content-Type": "application/json",
        "Access-Control-Allow-Origin": "*",
        "Cache-Control": `public, max-age=${cacheDuration}, stale-while-revalidate=${cacheDuration * 2}`,
        "Pragma": "no-cache",
        "Expires": "0"
      }
    });

  } catch (err) {
    return new Response(JSON.stringify({ error: err.message, articles: [] }), {
      status: 500,
      headers: { "Content-Type": "application/json", "Access-Control-Allow-Origin": "*" }
    });
  }
}
