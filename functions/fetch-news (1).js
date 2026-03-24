// fetch-news.js v7 — Brasil Sem Censura
const FEEDS_RSS = [
  "https://feeds.bbci.co.uk/news/world/rss.xml",
  "https://rss.reuters.com/reuters/worldNews",
  "https://www.aljazeera.com/xml/rss/all.xml",
  "https://feeds.skynews.com/feeds/rss/world.rss",
  "https://www.rt.com/rss/news/",
  "https://feeds.feedburner.com/ndtvnews-world-news",
  "https://www.dw.com/rss/rss.xml",
  "https://feeds.france24.com/rss/en/news",
];

const PALAVRAS_GEOPOLITICA = [
  "war","guerra","conflict","conflito","military","militar","nato","otan",
  "russia","ukraine","ucrania","china","taiwan","israel","palestine",
  "iran","sanctions","sancoes","nuclear","missile","coup","golpe",
  "election","eleicao","president","presidente","prime minister",
  "diplomacy","treaty","alliance","troops","attack","ataque","bombing",
  "invasion","ceasefire","refugee","humanitarian","genocide","oil",
  "energy","trade","security council","united nations","pentagon","kremlin",
  "protest","revolution","regime","government","governo",
];

const PALAVRAS_EXCLUIR = [
  "sale","discount","buy now","fashion","celebrity","recipe","sports score",
  "nfl","nba","weather forecast","horoscope","lottery","casino","bitcoin",
];

export async function onRequest(context) {
  const { env } = context;
  const headers = { "Content-Type":"application/json","Access-Control-Allow-Origin":"*" };
  try {
    const [rss, newsdata] = await Promise.allSettled([
      buscarTodosRSS(), buscarNewsData(env.NEWSDATA_API_KEY)
    ]);
    let todas = [];
    if (rss.status==="fulfilled") todas = todas.concat(rss.value);
    if (newsdata.status==="fulfilled") todas = todas.concat(newsdata.value);
    const filtradas = todas.filter(n => isGeopolitica(n));
    const semDup = removerDuplicatas(filtradas);
    const top20 = semDup.slice(0,20);
    const traduzidas = await Promise.allSettled(top20.map(n=>traduzirNoticia(n,env)));
    const resultado = traduzidas.filter(r=>r.status==="fulfilled").map(r=>r.value);
    return new Response(JSON.stringify({articles:resultado,total:resultado.length}),{headers});
  } catch(err) {
    return new Response(JSON.stringify({error:err.message,articles:[]}),{status:500,headers});
  }
}

async function buscarTodosRSS() {
  const r = await Promise.allSettled(FEEDS_RSS.map(url=>buscarUmRSS(url)));
  return r.filter(x=>x.status==="fulfilled").flatMap(x=>x.value);
}

async function buscarUmRSS(url) {
  const res = await fetch(url,{
    headers:{"User-Agent":"Mozilla/5.0 (compatible; BrasilSemCensura/1.0)"},
    signal:AbortSignal.timeout(8000)
  });
  return parseRSS(await res.text(), url);
}

function parseRSS(xml, fonte) {
  const noticias=[];
  for(const item of (xml.match(/<item>([\s\S]*?)<\/item>/g)||[]).slice(0,10)){
    const titulo=extrairTag(item,"title"), link=extrairTag(item,"link");
    if(titulo&&link) noticias.push({
      titulo_original:limparHTML(titulo),
      descricao_original:limparHTML(extrairTag(item,"description")||""),
      url:link, fonte:new URL(fonte).hostname.replace(/^(www|feeds)\./,""),
      data:new Date(extrairTag(item,"pubDate")||Date.now()).toISOString(),
      verificado:true
    });
  }
  return noticias;
}

function extrairTag(xml,tag){
  const m=xml.match(new RegExp(`<${tag}[^>]*>(?:<\\!\\[CDATA\\[)?([\\s\\S]*?)(?:\\]\\]>)?<\\/${tag}>`,"i"));
  return m?m[1].trim():"";
}

function limparHTML(s){
  return s.replace(/<[^>]+>/g,"").replace(/&amp;/g,"&").replace(/&lt;/g,"<")
    .replace(/&gt;/g,">").replace(/&quot;/g,'"').replace(/&#39;/g,"'").trim();
}

async function buscarNewsData(key){
  if(!key) return [];
  const res=await fetch(`https://newsdata.io/api/1/news?apikey=${key}&language=en&category=politics,world&size=10`,
    {signal:AbortSignal.timeout(8000)});
  const d=await res.json();
  return (d.results||[]).map(a=>({
    titulo_original:a.title||"", descricao_original:a.description||"",
    url:a.link||"", fonte:a.source_id||"newsdata",
    data:a.pubDate||new Date().toISOString(), verificado:true
  }));
}

function isGeopolitica(n){
  const t=`${n.titulo_original} ${n.descricao_original}`.toLowerCase();
  if(PALAVRAS_EXCLUIR.some(p=>t.includes(p))) return false;
  return PALAVRAS_GEOPOLITICA.some(p=>t.includes(p));
}

function removerDuplicatas(ns){
  const u=[];
  for(const n of ns){
    if(!u.some(x=>similaridade(x.titulo_original,n.titulo_original)>0.6)) u.push(n);
  }
  return u;
}

function similaridade(a,b){
  const wa=new Set(a.toLowerCase().split(/\s+/));
  const wb=new Set(b.toLowerCase().split(/\s+/));
  return [...wa].filter(w=>wb.has(w)).length/Math.max(wa.size,wb.size);
}

async function traduzirNoticia(n,env){
  const [titulo,descricao]=await Promise.all([traduzir(n.titulo_original,env),
    traduzir(n.descricao_original,env)]);
  return {...n, titulo:titulo||n.titulo_original,
    descricao:descricao||n.descricao_original, selo:"Verificado por