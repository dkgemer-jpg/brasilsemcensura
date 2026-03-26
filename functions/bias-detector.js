export async function onRequest(context) {
  const { request, env } = context;
  if (request.method !== 'POST') return new Response('Method not allowed', { status: 405 });

  try {
    const { text } = await request.json();
    if (!text) return new Response(JSON.stringify({ error: 'Texto não informado' }), { status: 400 });

    const GROQ_API_KEY = env.GROQ_API_KEY;
    const res = await fetch('https://api.groq.com/openai/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${GROQ_API_KEY}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        model: 'llama3-70b-8192',
        messages: [{
          role: 'user',
          content: `Analise o viés geopolítico do seguinte texto e classifique como: "Neutro", "Pro-Russia", "Pro-Ocidente" ou "Pro-China". Responda APENAS com uma das classificações, sem explicação:\n\n${text}`
        }],
        temperature: 0.1
      })
    });

    const data = await res.json();
    const bias = data.choices?.[0]?.message?.content?.trim() || 'Neutro';

    return new Response(JSON.stringify({ bias }), {
      headers: { 'Content-Type': 'application/json' }
    });

  } catch (err) {
    return new Response(JSON.stringify({ bias: 'Neutro', error: err.message }), { status: 200 });
  }
}
