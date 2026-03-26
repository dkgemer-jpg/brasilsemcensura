export async function onRequest(context) {
  const { request, env } = context;
  if (request.method !== 'POST') return new Response('Method not allowed', { status: 405 });

  try {
    const { city } = await request.json();
    if (!city) return new Response(JSON.stringify({ error: 'Cidade não informada' }), { status: 400 });

    const GEMINI_API_KEY = env.GEMINI_API_KEY;
    if (!GEMINI_API_KEY) return new Response(JSON.stringify({ error: 'Chave Gemini não configurada' }), { status: 500 });

    const prompt = `Pesquise na web e liste até 5 notícias recentes sobre a cidade de ${city} (Brasil) e região. Retorne apenas um JSON no formato: [{"title": "...", "description": "..."}] . Não inclua textos adicionais.`;

    const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${GEMINI_API_KEY}`;
    const response = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ contents: [{ parts: [{ text: prompt }] }] })
    });

    const data = await response.json();
    let articles = [];
    try {
      const text = data.candidates[0].content.parts[0].text;
      const match = text.match(/\[[\s\S]*\]/);
      if (match) articles = JSON.parse(match[0]);
    } catch (e) { articles = []; }

    return new Response(JSON.stringify({ articles }), {
      headers: { 'Content-Type': 'application/json' }
    });

  } catch (err) {
    return new Response(JSON.stringify({ error: err.message }), { status: 500 });
  }
}
