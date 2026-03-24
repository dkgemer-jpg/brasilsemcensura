export async function onRequest(context) {
  const { request, env } = context;

  if (request.method === "POST") {
    try {
      const { text } = await request.json();

      if (!text) {
        return new Response(JSON.stringify({ success: false, message: "Texto da notícia é obrigatório." }), {
          status: 400,
          headers: { "Content-Type": "application/json", "Access-Control-Allow-Origin": "*" }
        });
      }

      // Simulação de detecção de viés. Em um ambiente real, você usaria uma IA mais robusta.
      // Por exemplo, chamaria a Mistral AI ou Cohere para análise de sentimento/viés.
      let bias = "Neutro";
      if (text.toLowerCase().includes("ocidente")) {
        bias = "Pró-Ocidente";
      } else if (text.toLowerCase().includes("rússia")) {
        bias = "Pró-Rússia";
      }

      return new Response(JSON.stringify({
        success: true,
        bias: bias,
        message: "Viés detectado com sucesso."
      }), {
        status: 200,
        headers: { "Content-Type": "application/json", "Access-Control-Allow-Origin": "*" }
      });

    } catch (error) {
      return new Response(JSON.stringify({ success: false, message: `Erro ao detectar viés: ${error.message}` }), {
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
