export async function onRequest(context) {
    const { request, env } = context;
    const url = new URL(request.url);
    const paymentId = url.searchParams.get('id');
    if (!paymentId) {
        return new Response(JSON.stringify({ error: 'Missing payment id' }), { status: 400 });
    }
    try {
        const response = await fetch(`https://api.mercadopago.com/v1/payments/${paymentId}`, {
            headers: { 'Authorization': `Bearer ${env.MP_ACCESS_TOKEN}` }
        });
        const data = await response.json();
        return new Response(JSON.stringify({ status: data.status }), {
            headers: { 'Content-Type': 'application/json' }
        });
    } catch (err) {
        return new Response(JSON.stringify({ error: err.message }), { status: 500 });
    }
}
