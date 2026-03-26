export async function onRequest(context) {
    const { request, env } = context;
    const { token } = await request.json();
    if (token === env.TOKEN_SECRET) {
        return new Response(JSON.stringify({ valid: true }), { headers: { 'Content-Type': 'application/json' } });
    }
    return new Response(JSON.stringify({ valid: false }), { headers: { 'Content-Type': 'application/json' } });
}
