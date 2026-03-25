export async function onRequest(context) {
    const { request, env } = context;
    const { text } = await request.json();
    const groqRes = await fetch('https://api.groq.com/openai/v1/chat/completions', {
        method: 'POST',
        headers: {
            'Authorization': `Bearer ${env.GROQ_API_KEY}`,
            'Content-Type': 'application/json'
        },
        body: JSON.stringify({
            model: 'llama3-70b-8192',
            messages: [{
                role: 'user',
                content: `Classifique o viés do texto abaixo como "Neutro", "Pró-Rússia" ou "Pró-Ocidente". Responda apenas uma palavra.\n\n${text}`
            }],
            temperature: 0.1
        })
    });
    const data = await groqRes.json();
    const bias = data.choices[0].message.content;
    return new Response(JSON.stringify({ bias }), { headers: { 'Content-Type': 'application/json' } });
}
