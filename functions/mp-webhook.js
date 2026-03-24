// functions/mp-webhook.js — Cloudflare Pages Function

export async function onRequestPost(context) {
  const corsHeaders = {
    'Access-Control-Allow-Origin': '*',
    'Content-Type': 'application/json',
  };

  const MP_TOKEN = context.env.MP_ACCESS_TOKEN;
  const SECRET   = context.env.TOKEN_SECRET || 'bsc-brasil-sem-censura-2026';

  let body;
  try {
    body = await context.request.json();
  } catch {
    return new Response(JSON.stringify({ ok: true }), { status: 200, headers: corsHeaders });
  }

  const paymentId = body.data?.id || body.id;

  if (paymentId && MP_TOKEN) {
    try {
      const response = await fetch(`https://api.mercadopago.com/v1/payments/${paymentId}`, {
        headers: { 'Authorization': `Bearer ${MP_TOKEN}` }
      });
      const payment = await response.json();

      if (payment.status === 'approved') {
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
        return new Response(JSON.stringify({ success: true, token, expires }), { status: 200, headers: corsHeaders });
      }
    } catch (err) {
      console.error('Erro webhook:', err.message);
    }
  }

  return new Response(JSON.stringify({ ok: true }), { status: 200, headers: corsHeaders });
}

export async function onRequestOptions() {
  return new Response(null, { status: 204, headers: { 'Access-Control-Allow-Origin': '*', 'Access-Control-Allow-Methods': 'POST, OPTIONS', 'Access-Control-Allow-Headers': 'Content-Type' } });
                  }
