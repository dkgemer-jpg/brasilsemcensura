// functions/groq-proxy.js — Cloudflare Pages Function

export async function onRequestPost(context) {
  const corsHeaders = {
    'Access-Control-Allow-Origin': '*',
    'Content-Type': 'application/json',
  };

  const KEY = context.env.GROQ_API_KEY;

  if (!KEY || KEY === 'your_groq_api_key_here') {
    return new Response(JSON.stringify({
      choices: [{ message: { content: 'Configure a GROQ_API_KEY no Cloudflare Pages para ativar a IA.' } }]
    }), { status: 200, headers: corsHeaders });
  }

  try {
    const body = await context.request.json();
    const res = await fetch('https://api.groq.com/openai/v1/chat/completions', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${KEY}` },
      body: JSON.stringify({
        model: 'llama-3.1-8b-instant',
        messages: body.messages,
        temperature: 0.5,
        max_tokens: 1500
      })
    });
    const data = await res.json();
    return new Response(JSON.stringify(data), { status: 200, headers: corsHeaders });
  } catch (e) {
    return new Response(JSON.stringify({ error: e.message }), { status: 500, headers: corsHeaders });
  }
}

export async function onRequestOptions() {
  return new Response(null, { status: 204, headers: { 'Access-Control-Allow-Origin': '*', 'Access-Control-Allow-Methods': 'POST, OPTIONS', 'Access-Control-Allow-Headers': 'Content-Type' } });
      }
