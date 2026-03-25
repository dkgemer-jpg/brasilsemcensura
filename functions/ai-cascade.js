export async function onRequest(context) {
    // Redireciona para o groq-proxy como fallback principal
    return await fetch(new URL('/functions/groq-proxy', context.request.url), context.request);
}
