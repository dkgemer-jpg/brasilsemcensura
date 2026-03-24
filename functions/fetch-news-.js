// fetch-news.js v7 — Brasil Sem Censura — 24/03/2026
// Corrigido: erro de sintaxe (Unterminated string literal) na linha 124 da v6

export async function onRequest(context) {
  const { request, env } = context;

  // CORS
  const corsHeaders = {
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Methods": "GET, OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type",
    "Content-Type": "application/json"
  };

  if (request.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const url = new URL(request.url);
    const page = parseInt(url.searchParams.get("page") || "1");
    const categoria = url.searchParams.get("categoria") || "geopolitica";
    const limite = 20;

    // Palavras-chave geopoliticas (40+)
    const palavrasChave = [
      "guerra", "conflito", "nato", "otan", "russia", "ucrania", "china",
      "eua", "estados unidos", "israel", "palestina", "iran", "coreia",
      "nuclear", "missil", "exercito", "militar", "tropas", "sancao",
      "diplomacia", "acordo", "tratado", "embargo", "espionagem",
      "inteligencia", "cia", "fsb", "mossad", "geopolitica", "territorio",
      "soberania", "invasao", "ocupacao", "refugiados", "crise humanitaria",
      "onu", "conselho seguranca", "veto", "eleicao", "golpe", "protesto",
      "revolucao", "ditadura", "democracia", "censura", "propaganda",
      "desinformacao", "fake news", "ciberataque", "hackers"
    ];

    // Query para NewsData.io
    const query = palavrasChave.slice(0, 5).join(" OR ");
    const apiKey = env.NEWSDATA_API_KEY;

    if (!apiKey) {
      throw new Error("NEWSDATA_API_KEY nao configurada");
    }

    const newsdataUrl = new URL("https://newsdata.io/api/1/news");
    newsdataUrl.searchParams.set("apikey", apiKey);
    newsdataUrl.searchParams.set("q", query);
    newsdataUrl.searchParams.set("language", "en,pt");
    newsdataUrl.searchParams.set("size", String(limite));
    if (page > 1) {
      newsdataUrl.searchParams.set("page", String(page));
    }

    const newsResponse = await fetch(newsdataUrl.toString(), {
      headers: { "User-Agent": "BrasilSemCensura/1.0" }
    });

    if (!newsResponse.ok) {
      throw new Error("NewsData API retornou " + newsResponse.status);
    }

    const newsData = await newsResponse.json();

    if (!newsData.results || newsData.results.length === 0) {
      return new Response(JSON.stringify({ noticias: [], total: 0 }), {
        headers: corsHeaders
      });
    }

    // Filtrar e processar noticias
    const noticias = await processarNoticias(newsData.results, env, palavrasChave);

    return new Response(JSON.stringify({
      noticias,
      total: noticias.length,
      pagina: page
    }), { headers: corsHeaders });

  } catch (err) {
    console.error("fetch-news erro:", err.message);
    return new Response(JSON.stringify({
      erro: err.message,
      noticias: [],
      total: 0
    }), {
      status: 500,
      headers: corsHeaders
    });
  }
}

// ----------------------------------------------------------------
// Processar, filtrar duplicatas e traduzir noticias
// ----------------------------------------------------------------
async function processarNoticias(artigos, env, palavrasChave) {
  // Filtrar por relevancia geopolitica
  const filtrados = artigos.filter(a => {
    const texto = ((a.title || "") + " " + (a.description || "")).toLowerCase();
    return palavrasChave.some(p => texto.includes(p));
  });

  // Remover duplicatas por similaridade ~60%
  const unicos = removerDuplicatas(filtrados);

  // Traduzir e enriquecer cada noticia
  const processados = await Promise.all(
    unicos.slice(0, 20).map(async (artigo, idx) => {
      const traduzido = await traduzirArtigo(artigo, env);
      return {
        id: idx + 1,
        titulo: traduzido.titulo,
        resumo: traduzido.resumo,
        fonte: artigo.source_id || "Internacional",
        url: artigo.link || "#",
        imagem: artigo.image_url || null,
        data: artigo.pubDate || new Date().toISOString(),
        categoria: detectarCategoria(artigo.title || "", palavrasChave),
        verificado: true
      };
    })
  );

  return processados;
}

// ----------------------------------------------------------------
// Remover duplicatas por similaridade de titulo
// ----------------------------------------------------------------
function removerDuplicatas(artigos) {
  const unicos = [];
  for (const artigo of artigos) {
    const titulo = (artigo.title || "").toLowerCase();
    const isDup = unicos.some(u => {
      const tU = (u.title || "").toLowerCase();
      return similaridade(titulo, tU) > 0.6;
    });
    if (!isDup) unicos.push(artigo);
  }
  return unicos;
}

// Similaridade simples por palavras em comum
function similaridade(a, b) {
  const wa = new Set(a.split(/\s+/).filter(w => w.length > 3));
  const wb = new Set(b.split(/\s+/).filter(w => w.length > 3));
  if (wa.size === 0 || wb.size === 0) return 0;
  let comuns = 0;
  for (const w of wa) { if (wb.has(w)) comuns++; }
  return comuns / Math.max(wa.size, wb.size);
}

// ----------------------------------------------------------------
// Traduzir artigo usando cascata de IAs
// ----------------------------------------------------------------
async function traduzirArtigo(artigo, env) {
  const tituloOriginal = artigo.title || "Sem titulo";
  const resumoOriginal = artigo.description || artigo.content || "Sem resumo";

  // Ja esta em portugues?
  if (detectarPortugues(tituloOriginal)) {
    return { titulo: tituloOriginal, resumo: resumoOriginal };
  }

  // Tier 1: Groq
  try {
    const resultado = await traduzirGroq(tituloOriginal, resumoOriginal, env);
    if (resultado) return resultado;
  } catch (e) {
    console.warn("Groq falhou:", e.message);
  }

  // Tier 2: MyMemory (fallback gratuito, sem limite)
  try {
    const titulo = await traduzirMyMemory(tituloOriginal);
    const resumo = await traduzirMyMemory(resumoOriginal.slice(0, 500));
    return { titulo, resumo };
  } catch (e) {
    console.warn("MyMemory falhou:", e.message);
  }

  // Sem traducao disponivel — retorna original
  return { titulo: tituloOriginal, resumo: resumoOriginal };
}

// ----------------------------------------------------------------
// Groq — traducao rapida
// ----------------------------------------------------------------
async function traduzirGroq(titulo, resumo, env) {
  const apiKey = env.GROQ_API_KEY;
  if (!apiKey) return null;

  const prompt = "Traduza para portugues brasileiro de forma natural e jornalistica. " +
    "Responda SOMENTE com JSON no formato: {\"titulo\": \"...\", \"resumo\": \"...\"}. " +
    "Titulo: " + titulo + "\nResumo: " + resumo.slice(0, 400);

  const resp = await fetch("https://api.groq.com/openai/v1/chat/completions", {
    method: "POST",
    headers: {
      "Authorization": "Bearer " + apiKey,
      "Content-Type": "application/json"
    },
    body: JSON.stringify({
      model: "llama3-8b-8192",
      messages: [{ role: "user", content: prompt }],
      temperature: 0.3,
      max_tokens: 300
    })
  });

  if (!resp.ok) return null;
  const data = await resp.json();
  const texto = data?.choices?.[0]?.message?.content || "";

  // Parse JSON da resposta
  const match = texto.match(/\{[\s\S]*\}/);
  if (!match) return null;
  return JSON.parse(match[0]);
}

// ----------------------------------------------------------------
// MyMemory — traducao de emergencia
// ----------------------------------------------------------------
async function traduzirMyMemory(texto) {
  if (!texto || texto.trim().length === 0) return texto;
  const encoded = encodeURIComponent(texto.slice(0, 500));
  const url = "https://api.mymemory.translated.net/get?q=" + encoded + "&langpair=en|pt-BR";
  const resp = await fetch(url);
  if (!resp.ok) return texto;
  const data = await resp.json();
  return data?.responseData?.translatedText || texto;
}

// ----------------------------------------------------------------
// Detectar se texto ja esta em portugues
// ----------------------------------------------------------------
function detectarPortugues(texto) {
  const palavrasPort = ["de", "da", "do", "em", "para", "com", "que", "por", "uma", "como"];
  const palavrasTexto = texto.toLowerCase().split(/\s+/);
  const conta = palavrasPort.filter(p => palavrasTexto.includes(p)).length;
  return conta >= 2;
}

// ----------------------------------------------------------------
// Detectar categoria da noticia
// ----------------------------------------------------------------
function detectarCategoria(titulo, palavrasChave) {
  const t = titulo.toLowerCase();
  if (["guerra", "conflito", "militar", "tropas", "invasao", "missil", "bombardeio"].some(p => t.includes(p))) {
    return "conflito";
  }
  if (["china", "eua", "russia", "nato", "otan", "diplomacia", "acordo", "tratado"].some(p => t.includes(p))) {
    return "geopolitica";
  }
  if (["eleicao", "presidente", "governo", "congresso", "parlamento", "ditadura"].some(p => t.includes(p))) {
    return "politica";
  }
  if (["nuclear", "arma", "bomba", "ogiva"].some(p => t.includes(p))) {
    return "nuclear";
  }
  return "internacional";
}
