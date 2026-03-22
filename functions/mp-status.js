// functions/mp-status.js — Cloudflare Pages Function

export async function onRequestPost(context) {
  const corsHeaders = {
    'Access-Control-Allow-Origin': '*',
    'Content-Type': 'application/json',
  };

  const MP_TOKEN = context.env.MP_ACCESS_TOKEN;
  const SECRET   = context.env.TOKEN_SECRET || 'bsc-brasil-sem-censura-2026';

  let paymentId;
  try {
    const body = await context.request.json();
    paymentId = body.paymentId;
  } catch {
    return new Response(JSON.stringify({ error: 'Body inválido.' }), { status: 400, headers: corsHeaders });
  }

  if (!paymentId) {
    return new Response(JSON.stringify({ error: 'paymentId ausente.' }), { status: 400, headers: corsHeaders });
  }

  try {
    const response = await fetch(`https://api.mercadopago.com/v1/payments/${paymentId}`, {
      headers: { 'Authorization': `Bearer ${MP_TOKEN}` }
    });

    const data = await response.json();

    if (data.status === 'approved') {
      const expires = Date.now() + 30 * 24 * 60 * 60 * 1000;
      const encoder = new TextEncoder();
      const key = await crypto.subtle.importKey(
        'raw', encoder.encode(SECRET),
        { name: 'HMAC', hash: 'SHA-256' },
        false, ['sign']
      );
      const signature = await crypto.subtle.sign('HMAC', key, encoder.encode(String(expires)));
      const sig = Array.from(new Uint8Array(signature)).map(b => b.toString(16).padStart(2,'0')).join('');
      const token = btoa(`${expires}|${sig}`);
      return new Response(JSON.stringify({ status: 'approved', token, expires }), { status: 200, headers: corsHeaders });
    }

    return new Response(JSON.stringify({ status: data.status }), { status: 200, headers: corsHeaders });

  } catch (err) {
    return new Response(JSON.stringify({ error: err.message }), { status: 500, headers: corsHeaders });
  }
}

export async function onRequestOptions() {
  return new Response(null, {
    status: 204,
    headers: {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'POST, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type',
    }
  });
                        }
