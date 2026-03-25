// functions/fetch-news.js
export async function onRequest(context) {
    const { env } = context;
    const NEWS_API_KEY = env.NEWSDATA_API_KEY;
    const GROQ_API_KEY = env.GROQ_API_KEY;

    try {
        // Busca notícias da NewsData.io
        const url = `https://newsdata.io/api/1/news?apikey=${NEWS_API_KEY}&language=pt&category=politics&country=br&size=25`;
        const response = await fetch(url);
        const data = await response.json();
        let articles = data.results || [];

        if (articles.length && GROQ_API_KEY) {
            // Filtro geopolítico usando Groq
            const titles = articles.map(a => a.title).join('\n');
            const groqRes = await fetch('https://api.groq.com/openai/v1/chat/completions', {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${GROQ_API_KEY}`,
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    model: 'llama3-70b-8192',
                    messages: [{
                        role: 'user',
                        content: `Traduza para português do Brasil e filtre apenas notícias geopolíticas (Ucrânia, Rússia, EUA, China, Brasil, Oriente Médio, BRICS, defesa, tecnologia). Retorne APENAS os títulos relevantes, um por linha, sem texto adicional.\n\n${titles}`
                    }],
                    temperature: 0.3
                })
            });
            const groqData = await groqRes.json();
            const filteredTitles = groqData.choices[0].message.content.split('\n').filter(t => t.trim());
            articles = articles.filter(a => filteredTitles.includes(a.title));
        }

        // Remove duplicatas por título
        const seen = new Set();
        articles = articles.filter(a => {
            if (seen.has(a.title)) return false;
            seen.add(a.title);
            return true;
        });

        // Adiciona classificação: premium vs generic
        // Palavras-chave que indicam notícias "boas" (premium)
        const premiumKeywords = [
            'brics', 'geopolítica', 'defesa', 'soberania', 'pré-sal', 'multipolar',
            'rússia', 'china', 'eua', 'tecnologia', 'semicondutores', 'militares',
            'otan', 'opep', 'energia', 'acordo', 'tratado'
        ];

        articles = articles.map(article => {
            const text = (article.title + ' ' + (article.description || '')).toLowerCase();
            let isPremium = false;
            for (const kw of premiumKeywords) {
                if (text.includes(kw)) {
                    isPremium = true;
                    break;
                }
            }
            // Se for do Brasil e não tiver palavras-chave premium, mantém como generic
            if (!isPremium && article.country === 'br') isPremium = false; // ajuste conforme necessário

            // Gera preview (primeiros 150 caracteres da descrição)
            const preview = article.description ? article.description.substring(0, 150) + '...' : '';

            return {
                title: article.title,
                description: article.description || '',
                source_id: article.source_id || 'Desconhecida',
                pubDate: article.pubDate,
                type: isPremium ? 'premium' : 'generic',
                preview: preview
            };
        });

        // Ordena: premium primeiro, depois genéricas
        articles.sort((a, b) => {
            if (a.type === 'premium' && b.type !== 'premium') return -1;
            if (a.type !== 'premium' && b.type === 'premium') return 1;
            return 0;
        });

        return new Response(JSON.stringify({ articles }), {
            headers: { 'Content-Type': 'application/json' }
        });
    } catch (err) {
        return new Response(JSON.stringify({ error: 'Erro ao buscar notícias', details: err.message }), {
            status: 500,
            headers: { 'Content-Type': 'application/json' }
        });
    }
}
