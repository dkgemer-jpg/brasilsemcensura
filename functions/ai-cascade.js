// ai-cascade.js v1 — Brasil Sem Censura
// POST /ai-cascade body: { prompt: "...", tipo: "geral" }
export async function onRequest(context){
  const {request,env}=context;
  if(request.method==="OPTIONS") return new Response(null,{headers:{
    "Access-Control-Allow-Origin":"*","Access-Control-Allow-Methods":"POST,OPTIONS",
    "Access-Control-Allow-Headers":"Content-Type"}});
  const headers={"Content-Type":"application/json","Access-Control-Allow-Origin":"*"};
  try{
    const {prompt,tipo}=await request.json();
    if(!prompt) return new Response(JSON.stringify({error:"prompt obrigatorio"}),{status:400,headers});
    const r=await cascata(prompt,tipo||"geral",env);
    return new Response(JSON.stringify({resultado:r.texto,ia_usada:r.ia}),{headers});
  }catch(err){
    return new Response(JSON.stringify({error:err.message}),{status:500,headers});
  }
}

async function cascata(prompt,tipo,env){
  const fns=[
    ()=>groq(prompt,env), ()=>gemini(prompt,env),
    ()=>cerebras(prompt,env),()=>mistral(prompt,env),
    ()=>cohere(prompt,env), ()=>together(prompt,env),
    ()=>sambanova(prompt,env),()=>huggingface(prompt,env),
    ()=>mymemory(prompt),
  ];
  for(const fn of fns){
    try{const r=await fn(); if(r?.texto?.length>5) return r;}
    catch(_){continue;}
  }
  return {texto:prompt,ia:"original"};
}

async function groq(p,env){
  if(!env.GROQ_API_KEY) throw new Error("sem chave");
  const r=await fetch("https://api.groq.com/openai/v1/chat/completions",{
    method:"POST",headers:{"Content-Type":"application/json","Authorization":`Bearer ${env.GROQ_API_KEY}`},
    body:JSON.stringify({model:"llama3-8b-8192",messages:[{role:"user",content:p}],max_tokens:1000,temperature:0.4}),
    signal:AbortSignal.timeout(12000)});
  const d=await r.json();
  if(!d.choices?.[0]?.message?.content) throw new Error("sem resposta");
  return {texto:d.choices[0].message.content.trim(),ia:"Groq (Llama 3)"};
}

async function gemini(p,env){
  if(!env.GEMINI_API_KEY) throw new Error("sem chave");
  const r=await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${env.GEMINI_API_KEY}`,
    {method:"POST",headers:{"Content-Type":"application/json"},
    body:JSON.stringify({contents:[{parts:[{text:p}]}]}),signal:AbortSignal.timeout(12000)});
  const d=await r.json();
  const t=d.candidates?.[0]?.content?.parts?.[0]?.text;
  if(!t) throw new Error("sem resposta");
  return {texto:t.trim(),ia:"Gemini 1.5 Flash"};
}

async function cerebras(p,env){
  if(!env.CEREBRAS_API_KEY) throw new Error("sem chave");
  const r=await fetch("https://api.cerebras.ai/v1/chat/completions",{
    method:"POST",headers:{"Content-Type":"application/json","Authorization":`Bearer ${env.CEREBRAS_API_KEY}`},
    body:JSON.stringify({model:"llama3.3-70b",messages:[{role:"user",content:p}],max_tokens:1000,temperature:0.4}),
    signal:AbortSignal.timeout(12000)});
  const d=await r.json();
  if(!d.choices?.[0]?.message?.content) throw new Error("sem resposta");
  return {texto:d.choices[0].message.content.trim(),ia:"Cerebras"};
}

async function mistral(p,env){
  if(!env.MISTRAL_API_KEY) throw new Error("sem chave");
  const r=await fetch("https://api.mistral.ai/v1/chat/completions",{
    method:"POST",headers:{"Content-Type":"application/json","Authorization":`Bearer ${env.MISTRAL_API_KEY}`},
    body:JSON.stringify({model:"mistral-small-latest",messages:[{role:"user",content:p}],max_tokens:1000}),
    signal:AbortSignal.timeout(12000)});
  const d=await r.json();
  if(!d.choices?.[0]?.message?.content) throw new Error("sem resposta");
  return {texto:d.choices[0].message.content.trim(),ia:"Mistral AI"};
}

async function cohere(p,env){
  if(!env.COHERE_API_KEY) throw new Error("sem chave");
  const r=await fetch("https://api.cohere.ai/v1/generate",{
    method:"POST",headers:{"Content-Type":"application/json","Authorization":`Bearer ${env.COHERE_API_KEY}`},
    body:JSON.stringify({model:"command-light",prompt:p,max_tokens:800,temperature:0.4}),
    signal:AbortSignal.timeout(12000)});
  const d=await r.json();
  if(!d.generations?.[0]?.text) throw new Error("sem resposta");
  return {texto:d.generations[0].text.trim(),ia:"Cohere"};
}

async function together(p,env){
  if(!env.TOGETHER_API_KEY) throw new Error("sem chave");
  const r=await fetch("https://api.together.xyz/v1/chat/completions",{
    method:"POST",headers:{"Content-Type":"application/json","Authorization":`Bearer ${env.TOGETHER_API_KEY}`},
    body:JSON.stringify({model:"meta-llama/Meta-Llama-3.1-8B-Instruct-Turbo",
      messages:[{role:"user",content:p}],max_tokens:800}),
    signal:AbortSignal.timeout(12000)});
  const d=await r.json();
  if(!d.choices?.[0]?.message?.content) throw new Error("sem resposta");
  return {texto:d.choices[0].message.content.trim(),ia:"Together AI"};
}

async function sambanova(p,env){
  if(!env.SAMBANOVA_API_KEY) throw new Error("sem chave");
  const r=await fetch("https://api.sambanova.ai/v1/chat/completions",{
    method:"POST",headers:{"Content-Type":"application/json","Authorization":`Bearer ${env.SAMBANOVA_API_KEY}`},
    body:JSON.stringify({model:"Meta-Llama-3.1-8B-Instruct",
      messages:[{role:"user",content:p}],max_tokens:800,temperature:0.4}),
    signal:AbortSignal.timeout(12000)});
  const d=await r.json();
  if(!d.choices?.[0]?.message?.content) throw new Error("sem resposta");
  return {texto:d.choices[0].message.content.trim(),ia:"SambaNova"};
}

async function huggingface(p,env){
  if(!env.HUGGINGFACE_TOKEN) throw new Error("sem chave");
  const r=await fetch("https://api-inference.huggingface.co/models/facebook/bart-large-cnn",{
    method:"POST",headers:{"Content-Type":"application/json","Authorization":`Bearer ${env.HUGGINGFACE_TOKEN}`},
    body:JSON.stringify({inputs:p}),signal:AbortSignal.timeout(15000)});
  const d=await r.json();
  const t=Array.isArray(d)?d[0]?.summary_text||d[0]?.generated_text:null;
  if(!t) throw new Error("sem resposta");
  return {texto:t.trim(),ia:"Hugging Face"};
}

async function mymemory(p){
  const r=await fetch(`https://api.mymemory.translated.net/get?q=${encodeURIComponent(p.slice(0,500))}&langpair=en|pt-BR`);
  const d=await r.json();
  if(!d.responseData?.translatedText) throw new Error("sem resposta");
  return {texto:d.responseData.translatedText,ia:"MyMemory"};
}
