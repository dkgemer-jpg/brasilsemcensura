export function onRequest(context) {
  return new Response(JSON.stringify({
    ok: true,
    message: "Função funcionando!",
    timestamp: new Date().toISOString()
  }), {
    headers: { 'Content-Type': 'application/json' }
  });
}
