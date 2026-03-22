// functions/mp-create.js — Cloudflare Pages Function

export async function onRequestPost(context) {
  const MP_TOKEN = context.env.MP_ACCESS_TOKEN;

  const corsHeaders = {
    'Access-Control-Allow-Origin': '*',
    'Content-Type': 'application/json',
  };

  if (!MP_TOKEN) {
    return new Response(JSON.stringify({ error: 'MP_ACCESS_TOKEN não configurada.' }), { status: 500, headers: corsHeaders });
  }

  try {
    const response = await fetch('https://api.mercadopago.com/v1/payments', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${MP_TOKEN}`,
        'Content-Type': 'application/json',
        'X-Idempotency-Key': `bsc-${Date.now()}-${Math.random().toString(36).slice(2)}`
      },
      body: JSON.stringify({
        transaction_amount: 10.00,
        description: 'Acesso 30 dias - Brasil Sem Censura',
        payment_method_id: 'pix',
        payer: {
          email: 'pagamento@brasilsemcensura.com',
          first_name: 'Leitor',
          last_name: 'BSC'
        }
      })
    });

    const data = await response.json();

    if (!response.ok) {
      return new Response(JSON.stringify({ error: data.message || 'Erro Mercado Pago' }), { status: 500, headers: corsHeaders });
    }

    const pix = data.point_of_interaction?.transaction_data;
    if (!pix) {
      return new Response(JSON.stringify({ error: 'Resposta inesperada do Mercado Pago.' }), { status: 500, headers: corsHeaders });
    }

    return new Response(JSON.stringify({
      success: true,
      qrCodeBase64: pix.qr_code_base64,
      copyPaste: pix.qr_code,
      id: data.id
    }), { status: 200, headers: corsHeaders });

  } catch (err) {
    return new Response(JSON.stringify({ error: 'Erro de conexão: ' + err.message }), { status: 500, headers: corsHeaders });
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
