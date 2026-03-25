export async function onRequest(context) {
    const { env } = context;
    try {
        const response = await fetch('https://api.mercadopago.com/v1/payments', {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${env.MP_ACCESS_TOKEN}`,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                transaction_amount: 10.0,
                description: 'Acesso Premium Brasil Sem Censura - 30 dias',
                payment_method_id: 'pix',
                payer: { email: 'cliente@brasilsemcensura.com' }
            })
        });
        const data = await response.json();
        const qr_code = data.point_of_interaction?.transaction_data?.qr_code_base64 || null;
        return new Response(JSON.stringify({ qr_code }), {
            headers: { 'Content-Type': 'application/json' }
        });
    } catch (err) {
        return new Response(JSON.stringify({ error: err.message }), { status: 500 });
    }
}
