// groq-proxy.js v2 — Brasil Sem Censura
// POST /groq-proxy body: { titulo, descricao, url, fonte }
export async function onRequest(context){
  const {request,env}=context;
  if(request.method==="OPTIONS") return new Response(null,{headers:{
    "Access-Control-Allow-Origin":"*","Access-Control-Allow-Methods":"POST,OPTIONS",
    "Access-Control-Allow-Headers":"Content-Type"}});
  const headers={"Content-Type":"application/json","Access-Control-Allow-Origin":"*"};
  try{
    const {titulo,descricao,url,fonte}=await request.json();
    if(!titulo) return new Response(JSON.stringify({error:"titulo obrigatorio"}),{status:400,headers});
    const prompt=`Voce e analista geopolitico senior do Brasil Sem Censura.
Expanda esta noticia em artigo completo em PORTUGUES BRASILEIRO:
Titulo: ${titulo}
Resumo: ${descricao||"(sem resumo)"}
Fonte: ${fonte||"internacional"}

ESTRUTURA OBRIGATORIA (6 paragrafos):
1. O QUE ACONTECEU — descreva o evento principal (2-3 frases)
2. CONTEXTO HISTORICO — o que levou a este evento (3-4 frases)
3. ANALISE GEOPOLITICA — interesses e motivacoes reais (3-4 frases)
4. IMPACTO REGIONAL E GLOBAL — como afeta o mundo (3-4 frases)
5. PERSPECTIVAS DIFERENTES — todos os lados sem tomar partido (3-4 frases)
6. O QUE OBSERVAR — proximos desenvolvimentos esperados (2-3 frases)

Regras: portugues correto, objetivo, sem inventar fatos, tom profissional.`;
    const r=await expandir(prompt,env);
    return new Response(JSON.stringify({
      titulo,conteudo_expandido:r.texto,ia_usada:r.ia,
      url:url||"",fonte:fonte||"",
      selo:"Verificado por Brasil Sem Censura",
      timestamp:new Date().toISOString()}),{headers});
  }catch(err){
    return new Response(JSON.stringify({error:err.message}),{status:500,headers});
  }
}

async function expandir(prompt,env){
  if(env.GROQ_API_KEY){try{
    const r=await fetch("https://api.groq.com/openai/v1/chat/completions",{
      method:"POST",headers:{"Content-Type":"application/json","Authorization":`Bearer ${env.GROQ_API_KEY}`},
      body:JSON.stringify({model:"llama3-70b-8192",messages:[{role:"user",content:prompt}],max_tokens:1500,temperature:0.5}),
      signal:AbortSignal.timeout(15000)});
    const d=await r.json();
    const t=d.choices?.[0]?.message?.content;
    if(t?.length>200) return {texto:t.trim(),ia:"Groq 70B"};
  }catch(_){}}

  if(env.CEREBRAS_API_KEY){try{
    const r=await fetch("https://api.cerebras.ai/v1/chat/completions",{
      method:"POST",headers:{"Content-Type":"application/json","Authorization":`Bearer ${env.CEREBRAS_API_KEY}`},
      body:JSON.stringify({model:"llama3.3-70b",messages:[{role:"user",content:prompt}],max_tokens:1500,temperature:0.5}),
      signal:AbortSignal.timeout(15000)});
    const d=await r.json();
    const t=d.choices?.[0]?.message?.content;
    if(t?.length>200) return {texto:t.trim(),ia:"Cerebras"};
  }catch(_){}}

  if(env.GEMINI_API_KEY){try{
    const r=await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${env.GEMINI_API_KEY}`,
      {method:"POST",headers:{"Content-Type":"application/json"},
      body:JSON.stringify({contents:[{parts:[{text:prompt}]}]}),
      signal:AbortSignal.timeout(15000)});
    const d=await r.json();
    const t=d.candidates?.[0]?.content?.parts?.[0]?.text;
    if(t?.length>200) return {texto:t.trim(),ia:"Gemini 1.5 Flash"};
  }catch(_){}}

  if(env.MISTRAL_API_KEY){try{
    const r=await fetch("https://api.mistral.ai/v1/chat/completions",{
      method:"POST",headers:{"Content-Type":"application/json","Authorization":`Bearer ${env.MISTRAL_API_KEY}`},
      body:JSON.stringify({model:"mistral-small-latest",messages:[{role:"user",content:prompt}],max_tokens:1500}),
      signal:AbortSignal.timeout(15000)});
    const d=await r.json();
    const t=d.choices?.[0]?.message?.content;
    if(t?.length>200) return {texto:t.trim(),ia:"Mistral AI"};
  }catch(_){}}

  if(env.SAMBANOVA_API_KEY){try{
    const r=await fetch("https://api.sambanova.ai/v1/chat/completions",{
      method:"POST",headers:{"Content-Type":"application/json","Authorization":`Bearer ${env.SAMBANOVA_API_KEY}`},
      body:JSON.stringify({model:"Meta-Llama-3.1-8B-Instruct",messages:[{role:"user",content:prompt}],max_tokens:1200,temperature:0.5}),
      signal:AbortSignal.timeout(15000)});
    const d=await r.json();
    const t=d.choices?.[0]?.message?.content;
    if(t?.length>200) return {texto:t.trim(),ia:"SambaNova"};
  }catch(_){}}

  return {texto:"Conteudo expandido temporariamente indisponivel. Acesse a fonte original.",ia:"fallback"};
}
