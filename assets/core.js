/* ==========================================================================
   Multi Poker — núcleo compartilhado
   Config do clube, motor de regras (pontos, premiação, descartes, rebuy/add-on),
   tema, armazenamento por clube e senhas simples de teste.
   Usado por: index.html, ranking.html, rodada.html, admin.html
   ========================================================================== */
(function(global){
'use strict';

const CORE_VERSION = '0.2.0';

/* ---------- Config padrão (qualquer campo ausente no config.json do clube vem daqui) ---------- */
const DEFAULT_CONFIG = {
  schemaVersion: 1,
  clube: {
    nome: 'Clube de Pôker',
    nomeCurto: 'Pôker Clube',
    cidade: '',
    simbolo: '♠',
    slogan: '',
    whatsAdmin: ''   // WhatsApp do admin (DDI+DDD+número, só dígitos): a rodada abre a conversa direto
  },
  tema: { preset: 'feltro', cores: {} },
  pontuacao: {
    porPosicao: [26,19,16,13,11,9,7,5,3,2],  // 1º, 2º, 3º…
    demais: 1,                                // quem fica abaixo da tabela
    presenca: 0,                              // pontos extras só por jogar a rodada
    convidadoPontua: false                    // false: convidado não pontua e os membros abaixo sobem
  },
  premiacao: {
    moeda: 'BRL',
    buyIn: 100,
    taxaPorJogador: 0,       // parte do buy-in que fica no caixa do clube (não vai para o prêmio)
    modo: 'tabela',          // 'tabela' (valores fixos por nº de jogadores) | 'percentual'
    arredondar: 50,          // múltiplo usado ao calcular prêmios; a sobra vai para o 1º
    tabela: {
      '6':[300,200,100,0], '7':[350,200,150,0], '8':[400,250,150,0], '9':[450,250,200,0],
      '10':[500,300,200,0], '11':[550,350,200,0], '12':[600,350,250,0], '13':[650,400,250,0],
      '14':[650,400,250,100], '15':[700,400,300,100], '16':[750,450,300,100], '17':[800,450,350,100],
      '18':[850,500,350,100], '19':[900,500,400,100], '20':[950,550,400,100],
      '21':[1000,550,450,100], '22':[1050,600,450,100], '23':[1100,600,500,100], '24':[1150,650,500,100], '25':[1200,650,550,100]
    },
    faixas: [                // usado no modo 'percentual' e quando o nº de jogadores não está na tabela
      { ate: 5,   pct: [70,30] },
      { ate: 13,  pct: [50,30,20] },
      { ate: 999, pct: [45,27,18,10] }
    ]
  },
  temporada: {
    rodadas: 22,
    classificados: 4,        // destaque "Top N" e cálculo de chance matemática
    descartes: 0,            // piores resultados descartados (faltas contam como 0)
    diaSemana: 4,            // 0=domingo … 6=sábado
    horario: '20:00',
    rodizioOrganizacao: true
  },
  mesa: {
    maxPorMesa: 9,
    fichasIniciais: 10000,
    rebuy: { ativo: false, valor: 100, fichas: 10000, limitePorJogador: 0, ateNivel: 0 },
    addon: { ativo: false, valor: 100, fichas: 10000 },
    blinds: {
      ativo: false,
      niveis: [
        { sb:25,  bb:50,   ante:0,   min:20 },
        { sb:50,  bb:100,  ante:0,   min:20 },
        { sb:75,  bb:150,  ante:0,   min:20 },
        { sb:100, bb:200,  ante:0,   min:20 },
        { pausa:true, min:10 },
        { sb:150, bb:300,  ante:300, min:20 },
        { sb:200, bb:400,  ante:400, min:20 },
        { sb:300, bb:600,  ante:600, min:20 },
        { sb:400, bb:800,  ante:800, min:20 },
        { sb:600, bb:1200, ante:1200, min:20 },
        { sb:800, bb:1600, ante:1600, min:20 },
        { sb:1000, bb:2000, ante:2000, min:20 }
      ]
    }
  },
  estatisticas: {
    minRodadasConsistencia: 30, // recorde de consistência (todas as temporadas)
    minRodadasForma: 30,        // carreira mínima para "forma recente" e quente/frio
    minRodadasConfronto: 10     // fregueses e carrascos
  },
  acesso: {
    // hashes gerados por MP.hash('senha'); vazio = sem senha.
    // ATENÇÃO: proteção apenas para testes — os arquivos ficam públicos no GitHub.
    senhaAdmin: '',
    senhaRodada: '',
    senhaEstatisticas: ''
  }
};

/* ---------- Temas (todos escuros; a cor de destaque é --gold por compatibilidade) ---------- */
const THEMES = {
  feltro:   { nome:'Feltro verde', bg:'#0F2E23', bgDeep:'#0A2018', surface:'#163B2C', surface2:'#1D4837', border:'#2C5744', text:'#F5EFE0', muted:'#9FB8AC', accent:'#D4A62A', accentSoft:'#E8C766' },
  noite:    { nome:'Noite azul',   bg:'#0E1A2B', bgDeep:'#09121F', surface:'#142640', surface2:'#1A3052', border:'#2A4468', text:'#EEF2F8', muted:'#9AABC4', accent:'#4FA8E0', accentSoft:'#93CDF1' },
  vinho:    { nome:'Vinho',        bg:'#2A0F16', bgDeep:'#1E0A10', surface:'#3A1620', surface2:'#47202B', border:'#63303D', text:'#F7ECE8', muted:'#C3A3A8', accent:'#D9A441', accentSoft:'#EBC775' },
  grafite:  { nome:'Grafite',      bg:'#17181B', bgDeep:'#101113', surface:'#212327', surface2:'#2A2D32', border:'#3A3E45', text:'#F1F1EF', muted:'#A3A7AE', accent:'#E8A33D', accentSoft:'#F2C27A' },
  petroleo: { nome:'Petróleo',     bg:'#0B2A2E', bgDeep:'#071E21', surface:'#0F3A3F', surface2:'#14474D', border:'#23616A', text:'#EEF6F5', muted:'#9CC0BE', accent:'#F08A3C', accentSoft:'#F6B07A' }
};
const THEME_KEYS = ['bg','bgDeep','surface','surface2','border','text','muted','accent','accentSoft'];

/* ---------- Utilidades ---------- */
function isObj(v){ return v && typeof v === 'object' && !Array.isArray(v); }
function clone(v){ return JSON.parse(JSON.stringify(v)); }
function deepMerge(base, over){
  const out = clone(base);
  if(!isObj(over)) return out;
  Object.keys(over).forEach(k=>{
    const v = over[k];
    if(isObj(v) && isObj(out[k]) && k !== 'tabela') out[k] = deepMerge(out[k], v);
    else if(v !== undefined) out[k] = clone(v);
  });
  return out;
}
function escapeHtml(str){
  return String(str == null ? '' : str).replace(/[&<>"']/g, m => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[m]));
}
function money(v, currency, decimals){
  return (Number(v)||0).toLocaleString('pt-BR', {style:'currency', currency: currency || 'BRL', maximumFractionDigits: decimals == null ? 0 : decimals, minimumFractionDigits: 0});
}
function dateBR(iso){ const p = String(iso||'').slice(0,10).split('-'); return p.length===3 ? `${p[2]}/${p[1]}/${p[0]}` : ''; }
function hexToRgb(hex){
  const m = String(hex||'').trim().match(/^#?([0-9a-f]{6})$/i);
  if(!m) return '0,0,0';
  const n = parseInt(m[1], 16);
  return `${(n>>16)&255},${(n>>8)&255},${n&255}`;
}
const WEEKDAYS = ['domingo','segunda','terça','quarta','quinta','sexta','sábado'];

/* ---------- Senha simples (FNV-1a 32 bits × 2) — só afasta curiosos ---------- */
function hash(str){
  const run = seed => {
    let h = seed >>> 0;
    const s = 'mp|' + String(str).trim();
    for(let i=0;i<s.length;i++){ h ^= s.charCodeAt(i); h = Math.imul(h, 16777619) >>> 0; }
    return ('0000000' + h.toString(16)).slice(-8);
  };
  return run(0x811c9dc5) + run(0x01000193);
}

/* ---------- Clube atual (?c=slug) e caminhos ---------- */
function slugFromUrl(){
  const v = new URLSearchParams(location.search).get('c');
  return v && /^[a-z0-9][a-z0-9-]{0,40}$/.test(v) ? v : null;
}
function clubBase(slug){ return `clubes/${slug}/`; }
function clubUrl(page, slug, extra){
  const q = new URLSearchParams(Object.assign({c: slug}, extra || {}));
  return `${page}?${q.toString()}`;
}
async function fetchJson(path){
  const res = await fetch(path + (path.includes('?') ? '&' : '?') + 't=' + Date.now(), {cache:'no-store'});
  if(!res.ok) throw new Error('arquivo não encontrado: ' + path);
  return res.json();
}
async function loadRegistry(){
  try{
    const r = await fetchJson('clubes.json');
    return Array.isArray(r.clubes) ? r.clubes.filter(c=>c && c.slug) : [];
  }catch(e){ return []; }
}
async function loadConfig(slug){
  let raw = {};
  try{ raw = await fetchJson(clubBase(slug) + 'config.json'); }
  catch(e){ const err = new Error('Clube não encontrado: ' + slug); err.code = 'NO_CLUB'; throw err; }
  return { raw, config: normalizeConfig(raw) };
}
function normalizeConfig(raw){
  const c = deepMerge(DEFAULT_CONFIG, raw || {});
  const p = c.pontuacao;
  p.porPosicao = (Array.isArray(p.porPosicao) ? p.porPosicao : []).map(n=>Math.max(0, Number(n)||0));
  p.demais = Math.max(0, Number(p.demais)||0);
  p.presenca = Math.max(0, Number(p.presenca)||0);
  const pr = c.premiacao;
  pr.buyIn = Math.max(0, Number(pr.buyIn)||0);
  pr.taxaPorJogador = Math.min(pr.buyIn, Math.max(0, Number(pr.taxaPorJogador)||0));
  pr.arredondar = Math.max(1, Number(pr.arredondar)||1);
  if(!isObj(pr.tabela)) pr.tabela = {};
  if(!Array.isArray(pr.faixas) || !pr.faixas.length) pr.faixas = clone(DEFAULT_CONFIG.premiacao.faixas);
  pr.faixas = pr.faixas.map(f=>({ ate: Number(f.ate)||999, pct: (f.pct||[]).map(Number).filter(x=>x>0) })).sort((a,b)=>a.ate-b.ate);
  c.clube.whatsAdmin = String(c.clube.whatsAdmin||'').replace(/\D/g,'');
  const t = c.temporada;
  t.rodadas = Math.max(1, Math.round(Number(t.rodadas)||22));
  t.classificados = Math.max(1, Math.round(Number(t.classificados)||4));
  t.descartes = Math.max(0, Math.round(Number(t.descartes)||0));
  c.mesa.maxPorMesa = Math.max(2, Math.min(12, Math.round(Number(c.mesa.maxPorMesa)||9)));
  return c;
}

/* ---------- Tema ---------- */
function themeColors(config){
  const preset = THEMES[(config.tema||{}).preset] || THEMES.feltro;
  const over = (config.tema||{}).cores || {};
  const out = {};
  THEME_KEYS.forEach(k=>{ out[k] = /^#[0-9a-f]{6}$/i.test(over[k]||'') ? over[k] : preset[k]; });
  return out;
}
function applyTheme(config, root){
  const t = themeColors(config);
  const s = (root || document.documentElement).style;
  s.setProperty('--bg', t.bg); s.setProperty('--bg-deep', t.bgDeep);
  s.setProperty('--surface', t.surface); s.setProperty('--surface-2', t.surface2);
  s.setProperty('--border', t.border); s.setProperty('--text', t.text); s.setProperty('--text-muted', t.muted);
  s.setProperty('--gold', t.accent); s.setProperty('--gold-soft', t.accentSoft);
  s.setProperty('--gold-rgb', hexToRgb(t.accent)); s.setProperty('--border-rgb', hexToRgb(t.border));
  s.setProperty('--text-rgb', hexToRgb(t.text)); s.setProperty('--muted-rgb', hexToRgb(t.muted));
  const meta = document.querySelector('meta[name="theme-color"]');
  if(meta) meta.setAttribute('content', t.bg);
  return t;
}

/* ---------- Armazenamento local separado por clube ---------- */
function store(slug){
  const pre = `mp:${slug}:`;
  return {
    get(k, fallback){ try{ const v = localStorage.getItem(pre+k); return v === null ? fallback : JSON.parse(v); }catch(e){ return fallback; } },
    set(k, v){ try{ localStorage.setItem(pre+k, JSON.stringify(v)); return true; }catch(e){ return false; } },
    del(k){ try{ localStorage.removeItem(pre+k); }catch(e){} }
  };
}

/* ---------- Motor de regras ---------- */
function stName(e){ return typeof e === 'string' ? e : e.name; }
function stIsGuest(e){ return typeof e === 'string' ? false : !!e.guest; }

function makeRules(config){
  const P = config.pontuacao, PR = config.premiacao, T = config.temporada, M = config.mesa;

  function pointsFor(rank){
    if(!(rank >= 1)) return 0;
    return rank <= P.porPosicao.length ? P.porPosicao[rank-1] : P.demais;
  }
  const maxPerRound = Math.max(P.demais, ...P.porPosicao, 0) + P.presenca;

  /* Para cada entrada da classificação: rank de pontuação (null = não pontua) e pontos */
  function scoreRound(round){
    let rank = 0;
    return round.standings.map((e, idx)=>{
      const guest = stIsGuest(e);
      if(guest && !P.convidadoPontua) return { name: stName(e), guest, rank:null, pts:null, raw: idx+1 };
      rank += 1;
      return { name: stName(e), guest, rank, pts: pointsFor(rank) + P.presenca, raw: idx+1 };
    });
  }

  /* Custo do jogador na rodada (buy-in + rebuys + add-on) e prêmio da posição */
  function entryCost(round, e){
    const buy = Number(round.buyIn)||0;
    const rb = (Number(e && e.rebuys)||0) * (Number(round.rebuyValue)||0);
    const ad = (e && e.addon ? (Number(round.addonValue)||0) : 0);
    return buy + rb + ad;
  }
  function prizeAt(round, idx){ return Number((round.prizes||[])[idx])||0; }
  function paidCount(round){
    const pz = round.prizes || [];
    let n = 0; while(n < pz.length && (Number(pz[n])||0) > 0) n++;
    return n;
  }

  /* Pote da rodada */
  function poolFor(nPlayers, nRebuys, nAddons, buyIn){
    const b = buyIn == null ? PR.buyIn : buyIn;
    const net = Math.max(0, b - PR.taxaPorJogador);
    return nPlayers*net + (nRebuys||0)*(Number(M.rebuy.valor)||0) + (nAddons||0)*(Number(M.addon.valor)||0);
  }
  function roundTo(v, step){ return Math.floor(v/step)*step; }
  function distribute(pool, weights){
    const sumW = weights.reduce((s,w)=>s+w,0) || 1;
    const out = weights.map(w=> roundTo(pool*w/sumW, PR.arredondar));
    const rest = pool - out.reduce((s,v)=>s+v,0);
    if(out.length) out[0] += rest;
    return out;
  }
  /* Prêmios sugeridos para n jogadores; pool só difere do padrão quando há rebuy/add-on */
  function prizesFor(n, pool){
    const basePool = poolFor(n, 0, 0);
    const p = pool == null ? basePool : pool;
    const row = PR.tabela[String(n)];
    if(PR.modo === 'tabela' && Array.isArray(row) && row.some(v=>v>0)){
      const base = row.map(v=>Number(v)||0);
      const sum = base.reduce((s,v)=>s+v,0);
      if(Math.abs(sum - p) < 0.5) return base;
      return distribute(p, base);   // pote maior/menor: mantém as proporções da tabela
    }
    const band = PR.faixas.find(f=> n <= f.ate) || PR.faixas[PR.faixas.length-1];
    if(!band || !band.pct.length || p <= 0) return [0];
    return distribute(p, band.pct);
  }
  function prizeInTable(n){ return PR.modo === 'tabela' && Array.isArray(PR.tabela[String(n)]); }

  /* Classificação da temporada a partir de um conjunto de rodadas (mesma lógica do site original
     + presença, convidado pontuando, rebuy/add-on no custo e descartes) */
  function seasonStats(rounds){
    const R = rounds.length;
    const stats = {};
    const perRound = {}; // name -> [pts por rodada jogada]
    rounds.forEach(round=>{
      const sc = scoreRound(round);
      sc.forEach((s, idx)=>{
        if(s.rank === null) return;
        const e = round.standings[idx];
        if(!stats[s.name]) stats[s.name] = {name:s.name, points:0, gross:0, roundsPlayed:0, buyInTotal:0, prizeTotal:0, firsts:0, seconds:0, thirds:0, discarded:0};
        const st = stats[s.name];
        st.gross += s.pts;
        st.roundsPlayed += 1;
        st.buyInTotal += entryCost(round, e);
        st.prizeTotal += prizeAt(round, idx);
        if(s.rank === 1) st.firsts += 1;
        if(s.rank === 2) st.seconds += 1;
        if(s.rank === 3) st.thirds += 1;
        (perRound[s.name] = perRound[s.name] || []).push(s.pts);
      });
    });
    const D = T.descartes;
    return Object.values(stats).map(s=>{
      let points = s.gross;
      if(D > 0 && R > D){
        // faltas contam como 0; descarta os D menores valores entre as R rodadas
        const all = perRound[s.name].slice();
        while(all.length < R) all.push(0);
        all.sort((a,b)=>a-b);
        const drop = all.slice(0, D).reduce((x,y)=>x+y,0);
        points = s.gross - drop;
        s.discarded = drop;
      }
      const profit = s.buyInTotal > 0 ? ((s.prizeTotal - s.buyInTotal)/s.buyInTotal)*100 : 0;
      return {...s, points, profit};
    });
  }
  function compare(a, b){
    if(b.points !== a.points) return b.points - a.points;
    if(b.firsts !== a.firsts) return b.firsts - a.firsts;
    if(b.seconds !== a.seconds) return b.seconds - a.seconds;
    if(b.thirds !== a.thirds) return b.thirds - a.thirds;
    if(b.roundsPlayed !== a.roundsPlayed) return b.roundsPlayed - a.roundsPlayed;
    return a.name.localeCompare(b.name, 'pt-BR');
  }

  /* Blinds: nível atual a partir do tempo efetivo (ms) */
  function blindAt(ms){
    const lv = (M.blinds && M.blinds.niveis) || [];
    if(!lv.length) return null;
    let acc = 0;
    for(let i=0;i<lv.length;i++){
      const dur = Math.max(1, Number(lv[i].min)||1) * 60000;
      if(ms < acc + dur) return { index:i, level: lv[i], next: lv[i+1] || null, startMs: acc, endMs: acc+dur, leftMs: acc+dur-ms, number: lv.slice(0,i+1).filter(x=>!x.pausa).length };
      acc += dur;
    }
    const last = lv.length-1;
    return { index:last, level: lv[last], next:null, startMs: acc, endMs: Infinity, leftMs: Infinity, number: lv.filter(x=>!x.pausa).length, over:true };
  }
  function levelStartMs(index){
    const lv = (M.blinds && M.blinds.niveis) || [];
    let acc = 0;
    for(let i=0;i<Math.min(index, lv.length);i++) acc += Math.max(1, Number(lv[i].min)||1)*60000;
    return acc;
  }

  return { config, pointsFor, maxPerRound, scoreRound, entryCost, prizeAt, paidCount, poolFor, prizesFor, prizeInTable,
           seasonStats, compare, blindAt, levelStartMs };
}

/* ---------- Calendário ---------- */
function isoDate(d){ const p = n=>String(n).padStart(2,'0'); return `${d.getFullYear()}-${p(d.getMonth()+1)}-${p(d.getDate())}`; }
function generateDates(startIso, weekday, count, skipIsos){
  const skip = new Set(skipIsos || []);
  const [y,m,d] = String(startIso).split('-').map(Number);
  if(!y) return [];
  const dt = new Date(y, m-1, d, 12);
  while(dt.getDay() !== Number(weekday)) dt.setDate(dt.getDate()+1);
  const out = [];
  let guard = 0;
  while(out.length < count && guard++ < 1000){
    const iso = isoDate(dt);
    if(!skip.has(iso)) out.push(iso);
    dt.setDate(dt.getDate()+7);
  }
  return out;
}

/* ---------- Rodada empacotada num link (sem arquivo, sem servidor) ----------
   'z' + base64url(deflate-raw(JSON))  ou  'j' + base64url(JSON) quando o navegador não comprime */
function b64urlFromBytes(u8){ let bin = ''; for(let i=0;i<u8.length;i++) bin += String.fromCharCode(u8[i]); return btoa(bin).replace(/\+/g,'-').replace(/\//g,'_').replace(/=+$/,''); }
function bytesFromB64url(str){ const b = atob(str.replace(/-/g,'+').replace(/_/g,'/') + '==='.slice((str.length + 3) % 4)); const u = new Uint8Array(b.length); for(let i=0;i<b.length;i++) u[i] = b.charCodeAt(i); return u; }
async function streamBytes(u8, Stream, fmt){ return new Uint8Array(await new Response(new Blob([u8]).stream().pipeThrough(new Stream(fmt))).arrayBuffer()); }
async function packRound(obj){
  const raw = new TextEncoder().encode(JSON.stringify(obj));
  if(typeof CompressionStream === 'function'){
    try{ return 'z' + b64urlFromBytes(await streamBytes(raw, CompressionStream, 'deflate-raw')); }catch(e){}
  }
  return 'j' + b64urlFromBytes(raw);
}
async function unpackRound(str){
  str = String(str||'').trim();
  const kind = str[0], body = str.slice(1);
  let u8 = bytesFromB64url(body);
  if(kind === 'z'){
    if(typeof DecompressionStream !== 'function') throw new Error('Este navegador não abre links compactados. Atualize o navegador.');
    u8 = await streamBytes(u8, DecompressionStream, 'deflate-raw');
  } else if(kind !== 'j') throw new Error('Link de rodada inválido.');
  return JSON.parse(new TextDecoder().decode(u8));
}

/* ---------- Página padrão de erro / sem clube ---------- */
function noClubHtml(msg){
  return `<div style="max-width:520px;margin:12vh auto;padding:24px;font-family:Inter,system-ui,sans-serif;color:var(--text,#F5EFE0);text-align:center;">
    <div style="font-size:42px;opacity:.6;">♠ ♥</div>
    <h1 style="font-family:Fraunces,Georgia,serif;font-size:24px;margin:10px 0 6px;">${escapeHtml(msg || 'Clube não encontrado')}</h1>
    <p style="color:var(--text-muted,#9FB8AC);font-size:14px;line-height:1.5;">Escolha o clube no portal para abrir o ranking, a rodada ou o painel.</p>
    <p><a href="index.html" style="color:var(--gold-soft,#E8C766);font-weight:600;">Ir para o portal →</a></p></div>`;
}

global.MP = {
  CORE_VERSION, DEFAULT_CONFIG, THEMES, THEME_KEYS, WEEKDAYS,
  clone, deepMerge, escapeHtml, money, dateBR, hexToRgb, hash, isoDate,
  slugFromUrl, clubBase, clubUrl, fetchJson, loadRegistry, loadConfig, normalizeConfig,
  themeColors, applyTheme, store, stName, stIsGuest, makeRules, generateDates, noClubHtml, packRound, unpackRound
};
})(window);
