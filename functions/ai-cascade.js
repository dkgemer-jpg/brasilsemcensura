export async function onRequest(context) {
  const { request, env } = context;
  if (request.method !== 'POST') return new Response('Method not allowed', { status: 405 });

  try {
    const body = await request.json();

    // Tier 1: Groq
    try {
      const groqRes = await fetch('https://api.groq.com/openai/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${env.GROQ_API_KEY}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ model: 'llama3-70b-8192', messages: body.messages, temperature: 0.3 })
      });
      if (groqRes.ok) {
        const data = await groqRes.json();
        return new Response(JSON.stringify(data), { headers: { 'Content-Type': 'application/json' } });
      }
    } catch (e) { console.log('Groq falhou, tentando Mistral...'); }

    // Tier 2: Mistral
    try {
      const mistralRes = await fetch('https://api.mistral.ai/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${env.MISTRAL_API_KEY}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ model: 'mistral-small-latest', messages: body.messages })
      });
      if (mistralRes.ok) {
        const data = await mistralRes.json();
        return new Response(JSON.stringify(data), { headers: { 'Content-Type': 'application/json' } });
      }
    } catch (e) { console.log('Mistral falhou, tentando SambaNova...'); }

    // Tier 3: SambaNova
    const sambaRes = await fetch('https://api.sambanova.ai/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${env.SAMBANOVA_API_KEY}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ model: 'Meta-Llama-3.1-70B-Instruct', messages: body.messages })
    });
    const sambaData = await sambaRes.json();
    return new Response(JSON.stringify(sambaData), { headers: { 'Content-Type': 'application/json' } });

  } catch (err) {
    return new Response(JSON.stringify({ error: 'Todas as IAs falharam', details: err.message }), { status: 500 });
  }
}
