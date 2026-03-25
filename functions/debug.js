export default {
  async fetch(request, env) {
    const url = new URL(request.url);
    const dono = url.searchParams.get('dono');

    if (dono !== 'DKGEMERBR') {
      return new Response('🔒 Acesso negado. Use ?dono=DKGEMERBR', { status: 403 });
    }

    const logs = [];
    const start = Date.now();
    const addLog = (msg) => logs.push(`[${new Date().toISOString()}] ${msg}`);

    addLog('🚀 DEBUG INICIADO - BRASIL SEM CENSURA');

    try {
      addLog('✅ Verificando variáveis...');
      const vars = ['NEWSDATA_API_KEY', 'GROQ_API_KEY', 'GEMINI_API_KEY'];
      vars.forEach(v => addLog(env[v] ? `   ✓ ${v} OK` : `   ❌ ${v} FALTANDO`));

      addLog('🔍 Buscando notícias na NewsData.io...');
      const apiUrl = `https://newsdata.io/api/1/latest?apikey=${env.NEWSDATA_API_KEY}&language=pt&category=world&country=br&size=10`;
      const res = await fetch(apiUrl, { cache: 'no-store' });

      addLog(`   Status: ${res.status}`);
      const rawData = await res.json();
      addLog(`   Artigos recebidos: ${rawData.results?.length || 0}`);

      const duration = Date.now() - start;
      addLog(`✅ DEBUG CONCLUÍDO em ${duration}ms`);

    } catch (err) {
      addLog(`❌ ERRO: ${err.message}`);
    }

    const html = `
      <!DOCTYPE html>
      <html><head><meta charset="utf-8"><title>DEBUG</title></head>
      <body style="background:#111;color:#0f0;font-family:monospace;padding:20px;line-height:1.4;">
        <h1>🔧 DEBUG AO VIVO - Brasil Sem Censura</h1>
        <p><strong>Hora:</strong> ${new Date().toLocaleString('pt-BR')}</p>
        <hr>
        <pre style="background:#000;padding:15px;max-height:80vh;overflow:auto;">${logs.join('\n')}</pre>
        <a href="/?dono=DKGEMERBR" style="color:#0ff;">← Voltar ao site</a>
      </body></html>`;

    return new Response(html, { headers: { 'Content-Type': 'text/html' } });
  }
};
