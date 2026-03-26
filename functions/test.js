export function onRequest(context) {
    return new Response(JSON.stringify({ ok: true, message: "Função funcionando!" }), {
        headers: { 'Content-Type': 'application/json' }
    });
}
