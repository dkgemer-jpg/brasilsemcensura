export async function onRequest(context) {
  const { request, env } = context;
  const url = new URL(request.url);
  const token = url.searchParams.get('token') || '';

  const OWNER_TOKEN = 'DKGEMERBR';
  const isOwner = token === OWNER_TOKEN;

  return new Response(JSON.stringify({ valid: isOwner, premium: isOwner }), {
    headers: { 'Content-Type': 'application/json' }
  });
}
