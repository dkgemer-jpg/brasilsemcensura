export async function onRequest(context) {
  const { request, env } = context;

  if (request.method === "POST") {
    try {
      const formData = await request.formData();
      const newsLink = formData.get("newsLink");
      const userToken = request.headers.get("Authorization"); // Assumindo que o token do usuário será enviado no header

      if (!newsLink) {
        return new Response(JSON.stringify({ success: false, message: "Link da notícia é obrigatório." }), {
          status: 400,
          headers: { "Content-Type": "application/json", "Access-Control-Allow-Origin": "*" }
        });
      }

      // Aqui você integraria com a lógica de IA para verificar o link
      // Por exemplo, chamar outra função Cloudflare ou uma API externa
      // const aiVerificationResult = await fetch('https://sua-api-de-ia.com/verify', { method: 'POST', body: JSON.stringify({ link: newsLink, token: userToken }) });
      // const aiData = await aiVerificationResult.json();

      // Por enquanto, apenas um placeholder de sucesso
      return new Response(JSON.stringify({ success: true, message: "Link recebido para análise! Obrigado pela sua contribuição." }), {
        status: 200,
        headers: { "Content-Type": "application/json", "Access-Control-Allow-Origin": "*" }
      });

    } catch (error) {
      return new Response(JSON.stringify({ success: false, message: `Erro ao processar a submissão: ${error.message}` }), {
        status: 500,
        headers: { "Content-Type": "application/json", "Access-Control-Allow-Origin": "*" }
      });
    }
  }

  return new Response(JSON.stringify({ success: false, message: "Método não permitido." }), {
    status: 405,
    headers: { "Content-Type": "application/json", "Access-Control-Allow-Origin": "*" }
  });
}
