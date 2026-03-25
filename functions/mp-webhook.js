export async function onRequest(context) {
    const { request, env } = context;
    const body = await request.json();
    // Verifica secret (opcional, para segurança)
    if (body.secret && body.secret !== env.MP_WEBHOOK_SECRET) {
        return new Response('Unauthorized', { status: 401 });
    }
    console.log('Webhook recebido:', body);
    // Aqui você pode, por exemplo, atualizar o banco de dados ou enviar email
    return new Response('OK');
}
