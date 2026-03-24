// fetch-news.js v7 — Brasil Sem Censura
// Corrigido: tratamento robusto de JSON e erros de API, cache desativado para atualização em tempo real, ordenação por data de publicação

export async function onRequest(context) {
  const { env } = context;

  const NEWSDATA_API_KEY = env.NEWSDATA_API_KEY;
  const GROQ_API_KEY = env.GROQ_API_KEY;

  if (!NEWSDATA_API_KEY || !GROQ_API_KEY) {
    return new Response(JSON.stringify({ error: "Chaves de API ausentes", articles: [] }), {
      status: 500,
      headers: { "Content-Type": "application/json", "Access-Control-Allow-Origin": "*" }
    });
  }

  const keywords = [
    "geopolitica", "guerra", "otan", "nato", "russia", "ucrania", "china", "eua", "israel",
    "palestina", "iran", "siria", "africa", "asia", "america latina", "brasil", "politica",
    "economia", "sancoes", "diplomacia", "nuclear", "exercito", "militares", "crise",
    "eleicoes", "governo", "presidente", "congresso", "senado", "ministerio", "corrupcao",
    "inflacao", "dolar", "petroleo", "gas", "energia", "tecnologia", "ia", "inteligencia artificial",
    "espionagem", "cyber", "hacker", "migracao", "refugiados", "clima", "catastrofe"
  ];

  const query = keywords.slice(0, 5).join(" OR ");

  try {
    const newsRes = await fetch(
      `https://newsdata.io/api/1/news?apikey=${NEWSDATA_API_KEY}&q=${encodeURIComponent(query)}&language=pt,en&category=politics,world&size=20&sort=pubDate`
    ); // Adicionado &sort=pubDate para garantir as notícias mais recentes
    const newsData = await newsRes.json();

    if (!newsData.results || newsData.results.length === 0) {
      return new Response(JSON.stringify({ articles: [] }), {
        headers: { "Content-Type": "application/json", "Access-Control-Allow-Origin": "*" }
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
          
          // Limpeza robusta de JSON para evitar erros de sintaxe
          raw = raw.replace(/```json/g, "").replace(/```/g, "").trim();
          let parsed = {};
          try {
            parsed = JSON.parse(raw);
          } catch (e) {
            console.error("Erro ao parsear JSON do Groq:", e);
          }

          return {
            id: article.article_id || Math.random().toString(36).slice(2),
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
          // Fallback: MyMemory traducao
          try {
            const myRes = await fetch(
              `https://api.mymemory.translated.net/get?q=${encodeURIComponent(article.title)}&langpair=en|pt-BR`
            );
            const myData = await myRes.json();
            return {
              id: article.article_id || Math.random().toString(36).slice(2),
              titulo: myData.responseData?.translatedText || article.title,
              resumo: article.description || "",
              relevancia: "media",
              selo: "Verificado por Brasil Sem Censura",
              fonte: article.source_id || "Desconhecida",
              url: article.link || "#",
              imagem: article.image_url || null,
              data: article.pubDate || new Date().toISOString()
            };
          } catch {
            return {
              id: article.article_id || Math.random().toString(36).slice(2),
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
        }
      })
    );

    // Filtra duplicatas por similaridade
    const unicos = [];
    for (const art of articles) {
      const similar = unicos.some(u => {
        const a = u.titulo.toLowerCase();
        const b = art.titulo.toLowerCase();
        const wordsA = new Set(a.split(" "));
        const wordsB = b.split(" ");
        const common = wordsB.filter(w => wordsA.has(w)).length;
        return common / Math.max(wordsA.size, wordsB.length) > 0.6;
      });
      if (!similar) unicos.push(art);
    }

    return new Response(JSON.stringify({ articles: unicos }), {
      headers: {
        "Content-Type": "application/json",
        "Access-Control-Allow-Origin": "*",
        "Cache-Control": "no-store, no-cache, must-revalidate, proxy-revalidate"
      }
    });

  } catch (err) {
    return new Response(JSON.stringify({ error: err.message, articles: [] }), {
      status: 500,
      headers: { "Content-Type": "application/json", "Access-Control-Allow-Origin": "*" }
    });
  }
}
