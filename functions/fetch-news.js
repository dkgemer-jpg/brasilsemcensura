// fetch-news.js v8 - CORRIGIDO

export async function onRequest(context) {
  try {
    const apiKey = context.env.NEWSDATA_API_KEY;

    if (!apiKey) {
      return new Response(JSON.stringify({ error: "API key não configurada" }), {
        status: 500,
      });
    }

    const url = `https://newsdata.io/api/1/news?apikey=${apiKey}&language=en&category=world`;

    const response = await fetch(url);
    const data = await response.json();

    if (!data.results) {
      return new Response(JSON.stringify({ error: "Sem resultados" }), {
        status: 200,
      });
    }

    const noticias = data.results.slice(0, 20).map((item) => {
      return {
        titulo: item.title || "Sem título",
        descricao: item.description || "Sem descrição",
        link: item.link || "#",
        fonte: item.source_id || "Desconhecida",
        data: item.pubDate || null,
      };
    });

    return new Response(JSON.stringify(noticias), {
      headers: { "Content-Type": "application/json" },
    });

  } catch (error) {
    return new Response(
      JSON.stringify({
        error: "Erro interno",
        detalhe: error.message,
      }),
      { status: 500 }
    );
  }
}
