// /functions/debug.js
export default {
  async fetch(request, env) {
    const url = new URL(request.url);
    const dono = url.searchParams.get('dono');

    if (dono !== 'DKGEMERBR') {
      return new Response('🔒 Acesso negado. Use ?dono=DKGEMERBR', { status: 403 });
    }

    const logs = [];
    const start = Date.now();

    const addLog = (msg) => {
      logs.push(`[${new Date().toISOString()}] ${msg}`);
    };

    addLog('🚀 DEBUG INICIADO - BRASIL SEM CENSURA');

    try {
      // 1. Verifica variáveis
      addLog('✅ Verificando variáveis de ambiente...');
      const vars = ['NEWSDATA_API_KEY', 'GROQ_API_KEY', 'GEMINI_API_KEY'];
      vars.forEach(v => {
        if (env[v]) addLog(`   ✓ ${v} OK`);
        else addLog(`   ❌ ${v} FALTANDO!`);
      });

      // 2. Busca raw na NewsData
      addLog('🔍 Buscando notícias na NewsData.io...');
      const apiUrl = `https://newsdata.io/api/1/latest?apikey=${env.NEWSDATA_API_KEY}&language=pt&category=world&country=br&size=10`;
      const res = await fetch(apiUrl, { cache: 'no-store' });

      addLog(`   Status da API: ${res.status} ${res.statusText}`);

      if (!res.ok) throw new Error(`NewsData erro ${res.status}`);

      const rawData = await res.json();
      addLog(`   Artigos recebidos: ${rawData.results ? rawData.results.length : 0}`);
      addLog(`   Raw JSON (primeiros 800 chars):`);
      addLog(JSON.stringify(rawData, null, 2).slice(0, 800));

      // 3. Simula o que o fetch-news faz
      addLog('🧠 Iniciando cascata de IAs (simulado)...');
      if (rawData.results && rawData.results.length > 0) {
        addLog(`   Primeira notícia bruta: "${rawData.results[0].title}"`);
      } else {
        addLog('   ⚠ Nenhuma notícia retornada pela API');
      }

      const duration = Date.now() - start;
      addLog(`✅ DEBUG CONCLUÍDO em ${duration}ms`);

    } catch (err) {
      addLog(`❌ ERRO CRÍTICO: ${err.message}`);
      addLog(err.stack || '');
    }

    // Retorna página bonita com logs
    const html = `
      <!DOCTYPE html>
      <html>
      <head><meta charset="utf-8"><title>DEBUG BRASIL SEM CENSURA</title></head>
      <body style="background:#111;color:#0f0;font-family:monospace;padding:20px;">
        <h1>🔧 DEBUG AO VIVO - Brasil Sem Censura</h1>
        <p><strong>Usuário:</strong> DONO (DKGEMERBR)</p>
        <p><strong>Hora:</strong> ${new Date().toLocaleString('pt-BR')}</p>
        <hr>
        <pre style="background:#000;padding:15px;overflow:auto;max-height:80vh;">${logs.join('\n')}</pre>
        <p><a href="/?dono=DKGEMERBR" style="color:#0ff;">← Voltar ao site</a></p>
      </body>
      </html>`;

    return new Response(html, {
      headers: { 'Content-Type': 'text/html; charset=utf-8' }
    });
  }
};
