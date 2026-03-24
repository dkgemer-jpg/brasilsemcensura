// popup-boas-vindas.js v1 — Brasil Sem Censura
// Popup 3 dias Premium com contador regressivo e blur no conteudo

(function() {
  'use strict';

  const STORAGE_KEY = 'bsc_popup_fechado';
  const PREMIUM_KEY = 'bsc_premium_expira';
  const LEITURAS_KEY = 'bsc_leituras_hoje';
  const DATA_KEY = 'bsc_data_hoje';

  // Verifica se ja fechou o popup hoje
  function jaFechouHoje() {
    const fechado = localStorage.getItem(STORAGE_KEY);
    if (!fechado) return false;
    const hoje = new Date().toDateString();
    return fechado === hoje;
  }

  // Verifica se e dono (sem paywall)
  function eDono() {
    return new URLSearchParams(window.location.search).get('dono') === 'DKGEMERBR';
  }

  // Verifica se tem premium ativo
  function temPremium() {
    const expira = localStorage.getItem(PREMIUM_KEY);
    if (!expira) return false;
    return new Date() < new Date(expira);
  }

  // Conta leituras do dia
  function getLeiturasHoje() {
    const hoje = new Date().toDateString();
    if (localStorage.getItem(DATA_KEY) !== hoje) {
      localStorage.setItem(DATA_KEY, hoje);
      localStorage.setItem(LEITURAS_KEY, '0');
    }
    return parseInt(localStorage.getItem(LEITURAS_KEY) || '0');
  }

  // Ativa blur no conteudo apos 3 noticias
  function aplicarBlur() {
    if (eDono() || temPremium()) return;
    const leituras = getLeiturasHoje();
    if (leituras < 3) return;

    // Blur nos artigos apos o 3o
    const artigos = document.querySelectorAll('.noticia, .article-card, article');
    artigos.forEach((el, i) => {
      if (i >= 3) {
        el.style.filter = 'blur(6px)';
        el.style.userSelect = 'none';
        el.style.pointerEvents = 'none';
      }
    });

    // Mostra banner de upgrade
    mostrarBannerUpgrade();
  }

  function mostrarBannerUpgrade() {
    if (document.getElementById('bsc-banner-upgrade')) return;
    const banner = document.createElement('div');
    banner.id = 'bsc-banner-upgrade';
    banner.innerHTML = `
      <div style="position:fixed;bottom:0;left:0;right:0;background:linear-gradient(135deg,#1a1a2e,#16213e);
        color:#fff;padding:20px;text-align:center;z-index:9999;box-shadow:0 -4px 20px rgba(0,0,0,0.5);">
        <p style="margin:0 0 10px;font-size:16px;font-weight:bold;">
          🔒 Voce leu suas 3 noticias gratis hoje
        </p>
        <p style="margin:0 0 15px;font-size:13px;color:#aaa;">
          Acesso ilimitado por apenas R$10/mes via Pix
        </p>
        <button onclick="window.location.href='/pagar'" 
          style="background:#00b894;color:#fff;border:none;padding:12px 30px;border-radius:25px;
          font-size:15px;font-weight:bold;cursor:pointer;margin-right:10px;">
          Assinar Agora — R$10/mes
        </button>
        <button onclick="document.getElementById('bsc-banner-upgrade').style.display='none'"
          style="background:transparent;color:#aaa;border:1px solid #aaa;padding:12px 20px;
          border-radius:25px;font-size:13px;cursor:pointer;">
          Agora nao
        </button>
      </div>`;
    document.body.appendChild(banner);
  }

  // Popup principal de boas-vindas (3 dias gratis)
  function mostrarPopup() {
    if (jaFechouHoje() || eDono() || temPremium()) return;

    // Conta visitas
    const visitas = parseInt(localStorage.getItem('bsc_visitas') || '0') + 1;
    localStorage.setItem('bsc_visitas', visitas);

    // So mostra popup na 1a visita
    if (visitas > 1) return;

    const overlay = document.createElement('div');
    overlay.id = 'bsc-popup-overlay';
    overlay.style.cssText = `
      position:fixed;top:0;left:0;right:0;bottom:0;
      background:rgba(0,0,0,0.85);z-index:99999;
      display:flex;align-items:center;justify-content:center;
      font-family:Arial,sans-serif;
    `;

    // Contador regressivo 10 minutos
    let segundos = 600;

    overlay.innerHTML = `
      <div style="background:linear-gradient(135deg,#1a1a2e,#16213e);color:#fff;
        padding:40px;border-radius:20px;max-width:480px;width:90%;text-align:center;
        border:1px solid rgba(255,255,255,0.1);box-shadow:0 20px 60px rgba(0,0,0,0.8);">
        <div style="font-size:48px;margin-bottom:10px;">🇧🇷</div>
        <h2 style="margin:0 0 8px;font-size:24px;color:#00b894;">
          Bem-vindo ao Brasil Sem Censura
        </h2>
        <p style="color:#aaa;font-size:14px;margin:0 0 20px;">
          Informacao soberana, sem filtros, sem censura
        </p>
        
        <div style="background:rgba(0,184,148,0.15);border:1px solid #00b894;
          border-radius:12px;padding:20px;margin-bottom:20px;">
          <p style="margin:0 0 8px;font-size:16px;font-weight:bold;color:#00b894;">
            🎁 OFERTA EXCLUSIVA — SO AGORA
          </p>
          <p style="margin:0 0 12px;font-size:22px;font-weight:bold;">
            3 DIAS PREMIUM GRATIS
          </p>
          <p style="margin:0;font-size:13px;color:#aaa;">
            Ative agora e leia noticias ilimitadas por 3 dias
          </p>
        </div>

        <div style="background:rgba(255,0,0,0.1);border:1px solid rgba(255,0,0,0.3);
          border-radius:8px;padding:12px;margin-bottom:20px;">
          <p style="margin:0 0 4px;font-size:12px;color:#ff6b6b;">
            ⏰ Esta oferta expira em:
          </p>
          <p id="bsc-contador" style="margin:0;font-size:28px;font-weight:bold;color:#ff6b6b;
            font-family:monospace;">10:00</p>
        </div>

        <button id="bsc-btn-premium" 
          style="background:linear-gradient(135deg,#00b894,#00cec9);color:#fff;
          border:none;padding:15px 40px;border-radius:30px;font-size:17px;
          font-weight:bold;cursor:pointer;width:100%;margin-bottom:12px;
          box-shadow:0 4px 20px rgba(0,184,148,0.4);">
          ✅ QUERO MEUS 3 DIAS GRATIS
        </button>
        
        <button id="bsc-btn-fechar"
          style="background:transparent;color:#666;border:none;
          font-size:13px;cursor:pointer;text-decoration:underline;">
          Nao, prefiro apenas 3 noticias por dia
        </button>
      </div>`;

    document.body.appendChild(overlay);

    // Inicia contador
    const intervalo = setInterval(() => {
      segundos--;
      const m = Math.floor(segundos / 60).toString().padStart(2, '0');
      const s = (segundos % 60).toString().padStart(2, '0');
      const el = document.getElementById('bsc-contador');
      if (el) el.textContent = `${m}:${s}`;
      if (segundos <= 0) {
        clearInterval(intervalo);
        fecharPopup();
      }
    }, 1000);

    // Botao ativar premium gratis
    document.getElementById('bsc-btn-premium').addEventListener('click', () => {
      clearInterval(intervalo);
      const expira = new Date();
      expira.setDate(expira.getDate() + 3);
      localStorage.setItem(PREMIUM_KEY, expira.toISOString());
      fecharPopup();
      mostrarConfirmacao();
    });

    // Botao fechar
    document.getElementById('bsc-btn-fechar').addEventListener('click', () => {
      clearInterval(intervalo);
      fecharPopup();
    });
  }

  function fecharPopup() {
    const popup = document.getElementById('bsc-popup-overlay');
    if (popup) popup.remove();
    localStorage.setItem(STORAGE_KEY, new Date().toDateString());
  }

  function mostrarConfirmacao() {
    const conf = document.createElement('div');
    conf.style.cssText = `
      position:fixed;top:20px;right:20px;
      background:linear-gradient(135deg,#00b894,#00cec9);
      color:#fff;padding:16px 24px;border-radius:12px;
      font-family:Arial,sans-serif;font-size:14px;font-weight:bold;
      z-index:99999;box-shadow:0 4px 20px rgba(0,184,148,0.5);
      animation:fadeIn 0.3s ease;
    `;
    conf.innerHTML = '✅ 3 dias Premium ativados! Bom proveito!';
    document.body.appendChild(conf);
    setTimeout(() => conf.remove(), 5000);
  }

  // Inicializa quando o DOM estiver pronto
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => {
      mostrarPopup();
      aplicarBlur();
    });
  } else {
    mostrarPopup();
    aplicarBlur();
  }

  // Exporta funcoes para uso externo
  window.BSC = {
    contarLeitura: function() {
      const leituras = getLeiturasHoje() + 1;
      localStorage.setItem(LEITURAS_KEY, leituras.toString());
      if (leituras >= 3 && !eDono() && !temPremium()) {
        aplicarBlur();
      }
    },
    eDono,
    temPremium
  };

})();
