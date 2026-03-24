// functions/verify-token.js — Cloudflare Pages Function

export async function onRequestPost(context) {
  const corsHeaders = {
    'Access-Control-Allow-Origin': '*',
    'Content-Type': 'application/json',
  };

  const SECRET = context.env.TOKEN_SECRET || 'bsc-brasil-sem-censura-2026';

  let token;
  try {
    const body = await context.request.json();
    token = body.token;
  } catch {
    return new Response(JSON.stringify({ valid: false }), { status: 200, headers: corsHeaders });
  }

  if (!token || token.length < 32) {
    return new Response(JSON.stringify({ valid: false }), { status: 200, headers: corsHeaders });
  }

  try {
    const decoded  = atob(token);
    const [expires, sig] = decoded.split('|');
    const encoder = new TextEncoder();
    const key = await crypto.subtle.importKey(
      'raw', encoder.encode(SECRET),
      { name: 'HMAC', hash: 'SHA-256' },
      false, ['sign']
    );
    const signature = await crypto.subtle.sign('HMAC', key, encoder.encode(expires));
    const expected  = Array.from(new Uint8Array(signature)).map(b => b.toString(16).padStart(2,'0')).join('');

    if (sig !== expected) {
      return new Response(JSON.stringify({ valid: false, reason: 'inválido' }), { status: 200, headers: corsHeaders });
    }
    if (parseInt(expires) < Date.now()) {
      return new Response(JSON.stringify({ valid: false, reason: 'expirado' }), { status: 200, headers: corsHeaders });
    }

    return new Response(JSON.stringify({
      valid: true,
      expires: parseInt(expires),
      daysLeft: Math.ceil((parseInt(expires) - Date.now()) / 86400000),
    }), { status: 200, headers: corsHeaders });

  } catch {
    return new Response(JSON.stringify({ valid: false }), { status: 200, headers: corsHeaders });
  }
}

export async function onRequestOptions() {
  return new Response(null, { status: 204, headers: { 'Access-Control-Allow-Origin': '*', 'Access-Control-Allow-Methods': 'POST, OPTIONS', 'Access-Control-Allow-Headers': 'Content-Type' } });
}
