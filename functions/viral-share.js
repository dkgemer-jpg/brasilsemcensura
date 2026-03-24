export async function onRequest(context) {
  const { request, env } = context;

  if (request.method === "POST") {
    try {
      const formData = await request.formData();
      const articleUrl = formData.get("articleUrl");

      if (!articleUrl) {
        return new Response(JSON.stringify({ success: false, message: "URL do artigo é obrigatória." }), {
          status: 400,
          headers: { "Content-Type": "application/json", "Access-Control-Allow-Origin": "*" }
        });
      }

      // Simulação de um encurtador de URL e gerador de link rastreável
      // Em um ambiente real, você integraria com um serviço como Bitly, TinyURL ou um serviço próprio
      const shortUrl = `https://bs.censura.link/${btoa(articleUrl).substring(0, 8)}`; // Exemplo simples
      const shareText = `Leia esta notícia sem censura no Brasil Sem Censura: ${articleUrl} (via ${shortUrl})`; // Usando o original para o texto, e o curto para o rastreamento

      return new Response(JSON.stringify({
        success: true,
        shortUrl: shortUrl,
        shareText: shareText,
        message: "Link viral gerado com sucesso!"
      }), {
        status: 200,
        headers: { "Content-Type": "application/json", "Access-Control-Allow-Origin": "*" }
      });

    } catch (error) {
      return new Response(JSON.stringify({ success: false, message: `Erro ao gerar link viral: ${error.message}` }), {
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
