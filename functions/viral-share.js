export async function onRequest(context) {
  const { request } = context;
  const url = new URL(request.url);
  const ref = url.searchParams.get('ref') || '';

  const shareUrl = `https://brasilsemcensura.pages.dev${ref ? `?ref=${ref}` : ''}`;

  return new Response(JSON.stringify({
    shareUrl,
    message: 'Compartilhe este link e ganhe dias extras de acesso premium!',
    bonus: '2 dias por indicação'
  }), {
    headers: { 'Content-Type': 'application/json' }
  });
}
