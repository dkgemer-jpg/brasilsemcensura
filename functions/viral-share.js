export async function onRequest() {
    const shareLink = "https://brasilsemcensura.pages.dev/?ref=viral";
    return new Response(JSON.stringify({ shareLink }), { headers: { 'Content-Type': 'application/json' } });
}
