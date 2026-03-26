export async function onRequest(context) {
  const { request, env } = context;
  if (request.method !== 'POST') return new Response('Method not allowed', { status: 405 });

  try {
    const body = await request.json();

    if (body.type === 'payment') {
      const paymentId = body.data?.id;
      if (paymentId) {
        const res = await fetch(`https://api.mercadopago.com/v1/payments/${paymentId}`, {
          headers: { 'Authorization': `Bearer ${env.MP_ACCESS_TOKEN}` }
        });
        const payment = await res.json();
        if (payment.status === 'approved') {
          // Pagamento aprovado — ativação via localStorage no front-end
          console.log(`Pagamento ${paymentId} aprovado.`);
        }
      }
    }

    return new Response(JSON.stringify({ ok: true }), {
      headers: { 'Content-Type': 'application/json' }
    });

  } catch (err) {
    return new Response(JSON.stringify({ error: err.message }), { status: 500 });
  }
}
