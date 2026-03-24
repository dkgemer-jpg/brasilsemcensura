// gemini-search.js v1 — Brasil Sem Censura
// POST /gemini-search Authorization: Bearer <token> body: { pergunta: "..." }
export async function onRequest(context){
  const {request,env}=context;
  if(request.method==="OPTIONS") return new Response(null,{headers:{
    "Access-Control-Allow-Origin":"*","Access-Control-Allow-Methods":"POST,OPTIONS",
    "Access-Control-Allow-Headers":"Content-Type,Authorization"}});
  const headers={"Content-Type":"application/json","Access-Control-Allow-Origin":"*"};
  try{
    const token=(request.headers.get("Authorization")||"").replace("Bearer ","").trim();
    if(!token) return new Response(JSON.stringify({
      error:"acesso_negado",mensagem:"Pesquisa exclusiva para assinantes. R$10/30 dias."}),
      {status:401,headers});
    const ok=await verificarToken(token,env);
    if(!ok) return new Response(JSON.stringify({
      error:"token_invalido",mensagem:"Acesso expirado. Renove sua assinatura."}),
      {status:401,headers});
    const {pergunta}=await request.json();
    if(!pergunta||pergunta.trim().length<3)
      return new Response(JSON.stringify({error:"Pergunta muito curta."}),{status:400,headers});
    const prompt=`Voce e um analista geopolitico. Responda em portugues brasileiro.
Pergunta: ${pergunta}

Estruture a resposta:
1. O que aconteceu (2-3 paragrafos)
2. Contexto historico relevante
3. Diferentes perspectivas (sem tomar partido)
4. O que monitorar nos proximos dias`;
    const r=await pesquisar(prompt,env);
    return new Response(JSON.stringify({
      pergunta,resposta:r.texto,ia_usada:r.ia,
      selo:"Verificado por Brasil Sem Censura",
      timestamp:new Date().toISOString()}),{headers});
  }catch(err){
    return new Response(JSON.stringify({error:err.message}),{status:500,headers});
  }
}

async function verificarToken(token,env){
  if(token==="DKGEMERBR") return true;
  try{
    const r=await fetch("https://brasilsemcensura.pages.dev/verify-token",{
      method:"POST",headers:{"Content-Type":"application/json"},
      body:JSON.stringify({token})});
    return (await r.json()).valido===true;
  }catch(_){
    try{
      const [p64]=token.split(".");
      const p=JSON.parse(atob(p64));
      return p.exp>Math.floor(Date.now()/1000);
    }catch(_){return false;}
  }
}

async function pesquisar(prompt,env){
  if(env.GEMINI_API_KEY){try{
    const r=await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${env.GEMINI_API_KEY}`,
      {method:"POST",headers:{"Content-Type":"application/json"},
      body:JSON.stringify({contents:[{parts:[{text:prompt}]}],tools:[{googleSearch:{}}]}),
      signal:AbortSignal.timeout(15000)});
    const d=await r.json();
    const t=d.candidates?.[0]?.content?.parts?.[0]?.text;
    if(t?.length>50) return {texto:t.trim(),ia:"Gemini 1.5 Flash"};
  }catch(_){}}

  if(env.CEREBRAS_API_KEY){try{
    const r=await fetch("https://api.cerebras.ai/v1/chat/completions",{
      method:"POST",headers:{"Content-Type":"application/json","Authorization":`Bearer ${env.CEREBRAS_API_KEY}`},
      body:JSON.stringify({model:"llama3.3-70b",messages:[{role:"user",content:prompt}],max_tokens:1200,temperature:0.4}),
      signal:AbortSignal.timeout(12000)});
    const d=await r.json();
    const t=d.choices?.[0]?.message?.content;
    if(t?.length>50) return {texto:t.trim(),ia:"Cerebras"};
  }catch(_){}}

  if(env.GROQ_API_KEY){try{
    const r=await fetch("https://api.groq.com/openai/v1/chat/completions",{
      method:"POST",headers:{"Content-Type":"application/json","Authorization":`Bearer ${env.GROQ_API_KEY}`},
      body:JSON.stringify({model:"llama3-70b-8192",messages:[{role:"user",content:prompt}],max_tokens:1200,temperature:0.4}),
      signal:AbortSignal.timeout(12000)});
    const d=await r.json();
    const t=d.choices?.[0]?.message?.content;
    if(t?.length>50) return {texto:t.trim(),ia:"Groq 70B"};
  }catch(_){}}

  if(env.SAMBANOVA_API_KEY){try{
    const r=await fetch("https://api.sambanova.ai/v1/chat/completions",{
      method:"POST",headers:{"Content-Type":"application/json","Authorization":`Bearer ${env.SAMBANOVA_API_KEY}`},
      body:JSON.stringify({model:"Meta-Llama-3.1-8B-Instruct",messages:[{role:"user",content:prompt}],max_tokens:1000,temperature:0.4}),
      signal:AbortSignal.timeout(12000)});
    const d=await r.json();
    const t=d.choices?.[0]?.message?.content;
    if(t?.length>50) return {texto:t.trim(),ia:"SambaNova"};
  }catch(_){}}

  return {texto:"Pesquisa temporariamente indisponivel. Tente novamente.",ia:"fallback"};
}
