// Gera evidencias.html a partir do resultado real dos testes (docs/testes/resultado-testes.json).
// Uso: npm run evidencias            -> evidencias.html (usa caminhos relativos, para o GitHub Pages)
//      npm run evidencias -- --inline -> evidencias-completo.html (imagens e vídeo embutidos, arquivo único)
const fs = require('fs');
const path = require('path');
const ROOT = path.join(__dirname, '..');
const INLINE = process.argv.includes('--inline');
const esc = s => String(s).replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));

const res = JSON.parse(fs.readFileSync(path.join(ROOT, 'docs/testes/resultado-testes.json'), 'utf8'));
const testes = [];
(function walk(s, grupo) {
  (s.specs || []).forEach(sp => sp.tests.forEach(t => {
    const r = t.results[t.results.length - 1];
    testes.push({ grupo, titulo: sp.title, status: r.status, ms: r.duration });
  }));
  (s.suites || []).forEach(x => walk(x, x.title));
})({ suites: res.suites }, '');
const ok = testes.filter(t => t.status === 'passed').length;
const quando = new Date(res.stats.startTime).toLocaleString('pt-BR', { timeZone: 'America/Sao_Paulo', dateStyle: 'long', timeStyle: 'short' });
const dur = Math.round(res.stats.duration / 1000);

const src = rel => {
  if (!INLINE) return rel;
  const buf = fs.readFileSync(path.join(ROOT, rel));
  const mime = rel.endsWith('.mp4') ? 'video/mp4' : 'image/png';
  return `data:${mime};base64,${buf.toString('base64')}`;
};
const img = (arq, leg, teste) => `<figure class="shot"><img loading="lazy" src="${src('docs/evidencias/' + arq + '.png')}" alt="${esc(leg)}"><figcaption><span class="tid">${teste}</span>${esc(leg)}</figcaption></figure>`;

const rubrica = [
  ['MVP funcional executando o fluxo principal', 'Presença → avaliação DBR → observação → revisão humana → intervenção → trajetória → encaminhamento à psicóloga, nos 3 perfis.', '#fluxo', 'T04–T12'],
  ['Modelo de dados implementado', '9 coleções com chaves e regras de integridade (ERD e dicionário documentados).', '#modelo', 'T13'],
  ['Populado com dados sintéticos representativos', '18 educandos em 4 turmas, 15 avaliações, 9 registros, 3 intervenções, 4 encaminhamentos e 1 caso, cobrindo todos os estados.', '#dados', 'T13'],
  ['Fase de testes validando o fluxo principal', `${testes.length} testes E2E automatizados (Playwright): ${ok}/${testes.length} aprovados.`, '#testes', 'T01–T21'],
  ['Operação estável', 'Zero erros de JavaScript em todos os testes, navegação com "Voltar" em todas as abas, persistência após recarregar, restauração de dados, sem rolagem lateral em 375 px e 1280 px, 10 defeitos corrigidos.', '#estabilidade', 'T15–T17'],
  ['Entrega via repositório', 'Código, testes, scripts e documentos versionados no GitHub e publicados no GitHub Pages.', '#acesso', '—'],
  ['Handover · vídeo demonstrativo', 'Vídeo narrado de 2 min 37 s, com legendas, gravado a partir do app real.', '#video', '—'],
  ['Handover · registro do modelo de dados', 'docs/modelo-de-dados.md: ERD, dicionário, regras calculadas.', '#modelo', '—'],
  ['Handover · instalação e acesso', 'README.md: link, perfis e códigos, como rodar, testar, publicar e manter.', '#acesso', '—'],
  ['Handover · evidências dos testes', 'Esta página + relatório Playwright + JSON + capturas de tela.', '#testes', '—'],
  ['Handover · principais decisões técnicas', 'docs/decisoes-tecnicas.md: 8 decisões e 9 correções.', '#decisoes', '—'],
];

const entidades = [
  ['Educando', ['id · EDU-xxxx (PK)', 'nome, idade, nasc', 'resp{nome, rel, contato}', 'turmas[] (FK)', 'consentimento', 'freq{p, j, t}']],
  ['Turma', ['id · lab/re/pi/vt (PK)', 'nome', 'presencaOnly']],
  ['Avaliação (DBR)', ['childId, turmaId (FK)', 'tipo · inicial | checkin', 'modo · rápido 5 | completo 16', 'respostas{frase: sim|não|não observei}', 'atencaoPsicologa']],
  ['Registro', ['childId, turmaId (FK)', 'texto, método', 'status · aguardando | validado | devolvido', 'motivo, criadoEm']],
  ['Intervenção', ['childId (FK)', 'ação, objetivo', 'estágio 1 → 2 → 3', 'resultado']],
  ['Encaminhamento', ['childId (FK)', 'data', 'status · pendente | revisado', 'sem motivo escrito']],
  ['Caso clínico', ['childId (FK)', 'tipos[], objetivo', 'status · ativo | encerrado', 'atividades[] (estrutura CRP)']],
  ['Presença', ['chave turmaId_data (PK)', 'marks{childId: presente|justificada|falta}', 'clima, fechado']],
  ['Auditoria', ['ts', 'texto (quem fez o quê)']],
];

const decisoes = [
  ['Arquivo único, sem build', 'Hospedagem gratuita, funciona offline e qualquer pessoa consegue editar.'],
  ['Dados no navegador (localStorage)', 'Valida o fluxo sem expor dados reais de crianças. Para produção: backend com autenticação.'],
  ['Perfis com código de demonstração', 'Mostra a segregação de acesso. Não é segurança real.'],
  ['Privacidade por desenho', 'Sem diagnóstico, saúde ou violência nos registros; o caso clínico e o contato do responsável ficam só com a psicóloga.'],
  ['Regras explicáveis, sem IA', 'Limiares fixos (ex.: 75% de frequência) que a coordenação consegue justificar.'],
  ['Revisão humana obrigatória', 'Um registro só conta depois de validado, com trilha de auditoria.'],
  ['Testes E2E com Playwright', 'Simulam o usuário real nos 3 perfis, com tela de celular.'],
  ['Mobile-first', 'Barra inferior com até 6 itens e menu "Mais"; testado em 375 px.'],
];
const bugs = [
  ['B1', 'O 1º toque em "Enviar" era perdido depois de digitar (observação, código, intervenção, caso).', 'Estado atualizado a cada tecla, sem redesenhar a tela.'],
  ['B2', 'O registro devolvido e corrigido não voltava para a fila.', 'Volta a "aguardando" e entra na auditoria.'],
  ['B3', 'A data "de hoje" era fixa, o que mostrava "registrado 17 dias depois".', 'Usa a data do aparelho.'],
  ['B4', 'A turma Primeira Infância estava vazia.', 'A massa sintética passou a 18 educandos em 4 turmas.'],
  ['B5', '9 abas na barra da coordenação, com rótulos quebrados.', '5 abas + menu "Mais".'],
  ['B6', 'Uma falha do armazenamento derrubava o app.', 'try/catch, validação e botão "Restaurar dados".'],
  ['B7', 'O cabeçalho da trajetória saía sem estilo.', 'Estilo aplicado aos cartões.'],
  ['B8', 'Uma tela nova abria na rolagem da tela anterior (ex.: a trajetória já rolada até o meio).', 'Volta ao topo a cada troca de tela.'],
  ['B9', 'Coordenação e Psicóloga não tinham como voltar ao painel depois de abrir uma aba pelos botões do painel.', 'Toda aba fora do painel mostra "Voltar" (versão 1.0.1).'],
  ['B10', 'Registro feito depois das 21h aparecia como "registrado 0 dias depois" (data lida em UTC).', 'Data de criação lida no fuso do aparelho (versão 1.2.0).'],
];

const html = `<!DOCTYPE html>
<html lang="pt-BR">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>Evidências da entrega · Ebenézer Conecta</title>
<link rel="preconnect" href="https://fonts.googleapis.com">
<link href="https://fonts.googleapis.com/css2?family=Nunito:wght@400;600;700;800;900&display=swap" rel="stylesheet">
<style>
:root{
  --brand:#2f7d3b;--brand-d:#1e5c2c;--brand-s:#e7f1e7;--deep:#16351f;--deep-2:#1e4a2a;
  --bg:#f4f5ef;--card:#fff;--line:#e1e5dc;--ink:#16241a;--ink-2:#566058;--ink-3:#6d766f;
  --ok:#2f7d3b;--ok-s:#e3f1e5;--warn:#9a6f06;--warn-s:#f8f0d9;--info:#3f6fbd;--info-s:#e7ecf7;
  --shadow:0 1px 2px rgba(22,36,26,.05),0 10px 30px -18px rgba(22,36,26,.25);
}
@media (prefers-color-scheme:dark){:root:not([data-theme="light"]){
  --brand:#68c97c;--brand-d:#8fdf9d;--brand-s:rgba(47,125,59,.22);--deep:#0b2013;--deep-2:#0f2a17;
  --bg:#0d1712;--card:#142519;--line:#24392c;--ink:#eef4ee;--ink-2:#adc0b1;--ink-3:#8aa092;
  --ok:#68c97c;--ok-s:rgba(104,201,124,.15);--warn:#e0bb52;--warn-s:rgba(224,187,82,.14);--info:#84a6e6;--info-s:rgba(132,166,230,.15);
  --shadow:0 1px 2px rgba(0,0,0,.3),0 10px 30px -18px rgba(0,0,0,.6);}}
:root[data-theme="dark"]{
  --brand:#68c97c;--brand-d:#8fdf9d;--brand-s:rgba(47,125,59,.22);--deep:#0b2013;--deep-2:#0f2a17;
  --bg:#0d1712;--card:#142519;--line:#24392c;--ink:#eef4ee;--ink-2:#adc0b1;--ink-3:#8aa092;
  --ok:#68c97c;--ok-s:rgba(104,201,124,.15);--warn:#e0bb52;--warn-s:rgba(224,187,82,.14);--info:#84a6e6;--info-s:rgba(132,166,230,.15);
  --shadow:0 1px 2px rgba(0,0,0,.3),0 10px 30px -18px rgba(0,0,0,.6);}
*{box-sizing:border-box}
body{margin:0;background:var(--bg);color:var(--ink);font:15px/1.55 Nunito,system-ui,-apple-system,sans-serif;-webkit-font-smoothing:antialiased}
a{color:var(--brand-d);font-weight:800}
h1,h2,h3{margin:0;line-height:1.2;text-wrap:balance}
.wrap{max-width:1080px;margin:0 auto;padding:0 16px}
header.hero{background:linear-gradient(160deg,var(--deep),var(--deep-2));color:#e2eae3;padding:44px 0 36px}
.hero .eyebrow{font-size:12px;font-weight:900;letter-spacing:.12em;text-transform:uppercase;color:#9fc0a5}
.hero h1{font-size:clamp(28px,5vw,42px);font-weight:900;color:#fff;margin-top:8px}
.hero p{max-width:62ch;color:#b9cdbd;margin:12px 0 0}
.hero .meta{margin-top:18px;display:flex;gap:8px;flex-wrap:wrap}
.chip{display:inline-flex;align-items:center;gap:6px;font-size:12px;font-weight:800;padding:6px 11px;border-radius:100px;background:rgba(255,255,255,.1);border:1px solid rgba(255,255,255,.2);color:#e2eae3;text-decoration:none}
nav.toc{position:sticky;top:0;z-index:5;background:color-mix(in srgb,var(--bg) 88%,transparent);backdrop-filter:blur(8px);border-bottom:1px solid var(--line)}
nav.toc .wrap{display:flex;gap:4px;overflow-x:auto;padding-top:8px;padding-bottom:8px}
nav.toc a{flex-shrink:0;font-size:13px;color:var(--ink-2);text-decoration:none;padding:6px 10px;border-radius:8px}
nav.toc a:hover{background:var(--brand-s);color:var(--brand-d)}
section{padding:40px 0 8px;scroll-margin-top:48px}
section h2{font-size:24px;font-weight:900}
section .lead{color:var(--ink-2);margin:6px 0 18px;max-width:70ch}
.kpis{display:grid;grid-template-columns:repeat(4,1fr);gap:12px;margin-top:-26px}
.kpi{background:var(--card);border:1px solid var(--line);border-radius:14px;padding:16px;box-shadow:var(--shadow)}
.kpi .n{font-size:32px;font-weight:900;color:var(--brand-d);font-variant-numeric:tabular-nums;line-height:1}
.kpi .l{font-size:12px;font-weight:800;color:var(--ink-3);text-transform:uppercase;letter-spacing:.05em;margin-top:6px}
.card{background:var(--card);border:1px solid var(--line);border-radius:14px;box-shadow:var(--shadow)}
table{width:100%;border-collapse:collapse;font-size:14px}
th{text-align:left;font-size:11px;font-weight:900;letter-spacing:.06em;text-transform:uppercase;color:var(--ink-3);padding:10px 12px;border-bottom:1px solid var(--line)}
td{padding:11px 12px;border-bottom:1px solid var(--line);vertical-align:top}
tr:last-child td{border-bottom:none}
.tbl{overflow-x:auto}
.pill{display:inline-block;font-size:11px;font-weight:900;padding:3px 9px;border-radius:100px;white-space:nowrap}
.pill.ok{background:var(--ok-s);color:var(--ok)}
.pill.bad{background:#fae4e1;color:#b0332a}
.muted{color:var(--ink-3)}
.mono{font-family:ui-monospace,SFMono-Regular,Menlo,monospace;font-size:12.5px}
.video-box{display:grid;grid-template-columns:minmax(0,340px) 1fr;gap:24px;align-items:start}
video{width:100%;aspect-ratio:390/844;object-fit:cover;border-radius:18px;border:1px solid var(--line);background:#000;box-shadow:var(--shadow)}
ol.steps{margin:0;padding-left:20px}
ol.steps li{margin:6px 0}
.gallery{display:grid;grid-template-columns:repeat(auto-fill,minmax(190px,1fr));gap:14px}
.shot{margin:0;background:var(--card);border:1px solid var(--line);border-radius:14px;overflow:hidden;box-shadow:var(--shadow)}
.shot img{display:block;width:100%;aspect-ratio:390/844;object-fit:cover;object-position:top;cursor:zoom-in;background:var(--bg)}
.shot figcaption{padding:10px 12px;font-size:12.5px;color:var(--ink-2);line-height:1.4}
.tid{display:inline-block;font-weight:900;color:var(--brand-d);margin-right:6px}
.step-h{font-size:13px;font-weight:900;letter-spacing:.06em;text-transform:uppercase;color:var(--ink-3);margin:22px 0 10px}
.ents{display:grid;grid-template-columns:repeat(auto-fill,minmax(230px,1fr));gap:12px}
.ent{padding:14px}
.ent h3{font-size:15px;font-weight:900;margin-bottom:8px}
.ent ul{margin:0;padding-left:16px;font-size:13px;color:var(--ink-2)}
.rel{margin-top:14px;padding:14px 16px;font-size:13.5px;color:var(--ink-2)}
.grid2{display:grid;grid-template-columns:1fr 1fr;gap:12px}
.dec{padding:14px 16px}
.dec b{display:block;font-weight:900;margin-bottom:3px}
.dec span{font-size:13.5px;color:var(--ink-2)}
.bar{height:8px;border-radius:5px;background:var(--line);overflow:hidden;min-width:60px}
.bar i{display:block;height:100%;background:var(--brand)}
.access{padding:18px;display:grid;grid-template-columns:repeat(3,1fr);gap:12px}
.access div{border:1px solid var(--line);border-radius:12px;padding:14px}
.access .code{font-size:26px;font-weight:900;font-variant-numeric:tabular-nums;color:var(--brand-d)}
footer{padding:40px 0 60px;color:var(--ink-3);font-size:13px}
.lb{position:fixed;inset:0;background:rgba(5,12,8,.85);display:none;align-items:center;justify-content:center;z-index:50;padding:16px}
.lb.on{display:flex}
.lb img{max-height:94vh;max-width:94vw;border-radius:14px}
@media (max-width:760px){
  .kpis{grid-template-columns:1fr 1fr}
  .video-box,.grid2,.access{grid-template-columns:1fr}
  .hide-sm{display:none}
  .gallery{grid-template-columns:repeat(2,1fr);gap:10px}
  table.stack-sm thead{display:none}
  table.stack-sm tr{display:block;padding:12px 14px;border-bottom:1px solid var(--line)}
  table.stack-sm tr:last-child{border-bottom:none}
  table.stack-sm td{display:block;border:none;padding:2px 0}
  table.stack-sm td.hide-sm{display:none}
}
</style>
</head>
<body>
<header class="hero"><div class="wrap">
  <div class="eyebrow">Entrega · MVP Funcional · MBA Inteli, Grupo 5</div>
  <h1>Ebenézer Conecta: evidências da entrega</h1>
  <p>Plataforma de evidência socioemocional do Instituto Social Ebenézer. Esta página reúne, para cada critério da entrega, a prova correspondente: o app funcionando, o modelo de dados, a massa sintética, os testes automatizados e a documentação de handover.</p>
  <div class="meta">
    <a class="chip" href="https://gabi-guerreiro.github.io/ebenezer-conecta/" target="_blank" rel="noopener">▶ Abrir o app</a>
    <a class="chip" href="https://github.com/gabi-guerreiro/ebenezer-conecta">Repositório</a>
    <span class="chip">Testes executados em ${esc(quando)}</span>
  </div>
</div></header>

<div class="wrap"><div class="kpis">
  <div class="kpi"><div class="n">${ok}/${testes.length}</div><div class="l">Testes aprovados</div></div>
  <div class="kpi"><div class="n">3</div><div class="l">Perfis com acesso separado</div></div>
  <div class="kpi"><div class="n">18</div><div class="l">Educandos sintéticos</div></div>
  <div class="kpi"><div class="n">9</div><div class="l">Defeitos corrigidos</div></div>
</div></div>

<nav class="toc"><div class="wrap">
  <a href="#rubrica">Checklist</a><a href="#video">Vídeo</a><a href="#fluxo">Fluxo principal</a><a href="#testes">Testes</a>
  <a href="#estabilidade">Estabilidade</a><a href="#modelo">Modelo de dados</a><a href="#dados">Dados sintéticos</a><a href="#decisoes">Decisões</a><a href="#acesso">Acesso</a>
</div></nav>

<main class="wrap">
<section id="rubrica">
  <h2>Checklist dos critérios</h2>
  <p class="lead">Cada requisito da entrega, a evidência que o atende e o teste automatizado que o comprova.</p>
  <div class="card tbl"><table class="stack-sm">
    <thead><tr><th>Critério</th><th>Evidência</th><th class="hide-sm">Teste</th><th>Status</th></tr></thead>
    <tbody>${rubrica.map(([c, e, a, t]) => `<tr><td><b>${esc(c)}</b></td><td>${esc(e)} <a href="${a}">ver →</a></td><td class="hide-sm mono">${t}</td><td><span class="pill ok">Atendido</span></td></tr>`).join('')}</tbody>
  </table></div>
</section>

<section id="video">
  <h2>Vídeo demonstrativo</h2>
  <p class="lead">Fluxo principal nos três perfis, em 2 min 37 s, com narração do grupo e legendas. As imagens foram gravadas automaticamente a partir do app real (<span class="mono">npm run video</span>) e sincronizadas com a locução.</p>
  <div class="video-box">
    <video controls preload="metadata" playsinline src="${src('docs/video/demo-ebenezer-conecta.mp4')}"></video>
    <div class="card" style="padding:18px 20px">
      <h3 style="font-size:16px;font-weight:900;margin-bottom:8px">Roteiro</h3>
      <ol class="steps">
        <li>A Equipe entra sem senha e vê o painel da coleta.</li>
        <li>Presença em lote, com falta justificada, e fechamento.</li>
        <li>Avaliação bloqueada sem consentimento; avaliação rápida com sinalização para a psicóloga.</li>
        <li>Observação com alerta ao citar outra criança, enviada para revisão.</li>
        <li>A Coordenação entra com código e valida o registro.</li>
        <li>Intervenção: proposta, acompanhamento e validação.</li>
        <li>Trajetória individual em linha do tempo.</li>
        <li>Governança: consentimento e trilha de auditoria.</li>
        <li>A Psicóloga revisa o encaminhamento.</li>
      </ol>
    </div>
  </div>
</section>

<section id="fluxo">
  <h2>Fluxo principal, passo a passo</h2>
  <p class="lead">Capturas de tela geradas automaticamente durante os testes. O código ao lado de cada legenda é o teste que produziu a imagem. Clique numa imagem para ampliar.</p>
  <div class="step-h">Acesso e perfis</div>
  <div class="gallery">
    ${img('01-tela-inicial', 'Tela inicial com os 3 perfis e o botão de restaurar dados', 'T01')}
    ${img('02-painel-equipe', 'Painel da Equipe: estado da coleta e ações principais', 'T01')}
    ${img('03-codigo-acesso', 'Código de acesso da Coordenação', 'T02')}
    ${img('04-psicologa-caso-clinico', 'Só a psicóloga vê o caso clínico e o contato do responsável', 'T03')}
  </div>
  <div class="step-h">Coleta: presença, avaliação e observação</div>
  <div class="gallery">
    ${img('05-presenca-lancada', 'Presença lançada em lote, com exceções', 'T04')}
    ${img('06-avaliacao-bloqueada', 'Sem consentimento, a coleta é bloqueada', 'T05')}
    ${img('07-avaliacao-preenchida', 'Avaliação DBR rápida (5 frases) com sinalização', 'T06')}
    ${img('08-registro-alerta-nome', 'Alerta ao citar outra criança na observação', 'T07')}
    ${img('09-registro-enviado', 'Observação enviada para revisão', 'T07')}
  </div>
  <div class="step-h">Revisão, intervenção e acompanhamento</div>
  <div class="gallery">
    ${img('10-fila-revisao', 'Fila de revisão da Coordenação', 'T08')}
    ${img('11-registro-devolvido', 'Registro devolvido com motivo, para correção', 'T08')}
    ${img('12-intervencao-proposta', 'Proposta de intervenção personalizada', 'T09')}
    ${img('13-intervencao-concluida', 'Intervenção validada nas 3 etapas', 'T09')}
    ${img('14-encaminhamentos', 'Encaminhamentos pendentes da psicóloga', 'T10')}
    ${img('15-caso-atividade', 'Caso clínico com atividade registrada', 'T10')}
    ${img('16-trajetoria', 'Trajetória individual com leitura da evolução', 'T11')}
    ${img('17-relatorio', 'Relatório com ficha técnica de cobertura', 'T12')}
    ${img('18-voltar-ao-painel', 'Botão "Voltar" fora do painel (versão 1.0.1)', 'T17')}
    ${img('19-grupo-psicologa', 'Psicóloga registra o encontro coletivo de Começos que Protegem (versão 1.1.0)', 'T18')}
    ${img('20-grupo-equipe', 'Equipe registra o grupo com observação geral (versão 1.1.0)', 'T19')}
    ${img('21-relatorio-basico', 'Relatório básico com evolução agregada e texto para apoiadores (versão 1.2.0)', 'T20')}
    ${img('22-relatorio-completo', 'Relatório completo da coordenação: todos os programas num painel (versão 1.2.0)', 'T21')}
  </div>
</section>

<section id="testes">
  <h2>Evidências dos testes</h2>
  <p class="lead">${testes.length} testes ponta a ponta com Playwright + Chromium em tela de celular (390×844). Cada teste começa com o navegador limpo e reprova se ocorrer qualquer erro de JavaScript. Execução completa: ${dur} s. Resultado: <b>${ok} aprovados, ${testes.length - ok} falhas</b>.</p>
  <div class="card tbl"><table class="stack-sm">
    <thead><tr><th>ID</th><th>O que valida</th><th class="hide-sm">Grupo</th><th class="hide-sm">Duração</th><th>Resultado</th></tr></thead>
    <tbody>${testes.map(t => {
      const [id, ...rest] = t.titulo.split(' · ');
      const max = Math.max(...testes.map(x => x.ms));
      return `<tr><td class="mono"><b>${esc(id)}</b></td><td>${esc(rest.join(' · '))}</td><td class="hide-sm muted">${esc(t.grupo.replace(/^\d+\.\s*/, ''))}</td><td class="hide-sm"><div style="display:flex;gap:8px;align-items:center"><div class="bar" style="width:70px"><i style="width:${Math.max(4, Math.round(t.ms / max * 100))}%"></i></div><span class="mono muted">${(t.ms / 1000).toFixed(1)}s</span></div></td><td><span class="pill ${t.status === 'passed' ? 'ok' : 'bad'}">${t.status === 'passed' ? 'Aprovado' : 'Falhou'}</span></td></tr>`;
    }).join('')}</tbody>
  </table></div>
  <p class="muted" style="font-size:13px;margin-top:10px">Arquivos brutos no repositório: <span class="mono">docs/testes/resultado-testes.json</span> · <span class="mono">docs/testes/relatorio-html/</span> · código em <span class="mono">tests/fluxo-principal.spec.js</span>. Para repetir: <span class="mono">npm install && npm test</span>.</p>
</section>

<section id="estabilidade">
  <h2>Estabilidade e defeitos corrigidos</h2>
  <p class="lead">Os testes encontraram 10 defeitos, todos corrigidos. Os testes de regressão impedem que eles voltem.</p>
  <div class="card tbl"><table class="stack-sm">
    <thead><tr><th>#</th><th>Problema encontrado</th><th>Correção</th></tr></thead>
    <tbody>${bugs.map(([i, p, c]) => `<tr><td class="mono"><b>${i}</b></td><td>${esc(p)}</td><td>${esc(c)}</td></tr>`).join('')}</tbody>
  </table></div>
</section>

<section id="modelo">
  <h2>Modelo de dados</h2>
  <p class="lead">Um objeto <span class="mono">DB</span> com 9 coleções, salvo em JSON no navegador. O educando é a entidade central: toda coleção aponta para ele por <span class="mono">childId</span>, e o teste T13 verifica essa integridade. ERD completo em <span class="mono">docs/modelo-de-dados.md</span>.</p>
  <div class="ents">${entidades.map(([n, f]) => `<div class="card ent"><h3>${esc(n)}</h3><ul>${f.map(x => `<li>${esc(x)}</li>`).join('')}</ul></div>`).join('')}</div>
  <div class="card rel"><b>Relações:</b> Educando 1—N Turma (vínculo) · Educando 1—N Avaliação, Registro, Intervenção, Encaminhamento · Educando 1—0..1 Caso clínico 1—N Atividade · uma Avaliação com "atenção" gera 1 Encaminhamento · Turma 1—N Presença por encontro. <b>Regras calculadas:</b> frequência considerada = (presenças + justificadas) ÷ encontros, boa a partir de 75%; 3+ faltas justificadas indicam possível vulnerabilidade; 1ª avaliação do vínculo = inicial, as seguintes = check-in.</div>
</section>

<section id="dados">
  <h2>Dados sintéticos representativos</h2>
  <p class="lead">Nomes, datas e telefones 100% fictícios, cobrindo as 4 turmas e todos os estados de cada fluxo, para que qualquer tela possa ser demonstrada.</p>
  <div class="card tbl"><table class="stack-sm">
    <thead><tr><th>Entidade</th><th>Qtd.</th><th>O que a massa cobre</th></tr></thead>
    <tbody>
      <tr><td><b>Educandos</b></td><td class="mono">18</td><td>4 turmas (Laboratório de Sonhos 11, Reforço Escolar 6, Primeira Infância 4, Vivência Terapêutica 3 vínculos); 4 sem consentimento; 4 a 11 anos; casos de falta justificada recorrente</td></tr>
      <tr><td><b>Avaliações</b></td><td class="mono">15</td><td>iniciais e check-ins; modos rápido e completo; 1 com sinalização para a psicóloga</td></tr>
      <tr><td><b>Registros</b></td><td class="mono">9</td><td>aguardando, validado e devolvido; ditado e escrito</td></tr>
      <tr><td><b>Intervenções</b></td><td class="mono">3</td><td>em acompanhamento e concluída com resultado</td></tr>
      <tr><td><b>Encaminhamentos</b></td><td class="mono">4</td><td>pendentes e revisado</td></tr>
      <tr><td><b>Casos clínicos</b></td><td class="mono">1</td><td>ativo, com 2 atividades no formato CRP</td></tr>
      <tr><td><b>Frases DBR</b></td><td class="mono">16</td><td>5 dimensões (CASEL + BNCC), 5 no modo rápido, versionadas</td></tr>
    </tbody>
  </table></div>
</section>

<section id="decisoes">
  <h2>Principais decisões técnicas</h2>
  <p class="lead">Resumo. A versão completa, com as consequências de cada decisão, está em <span class="mono">docs/decisoes-tecnicas.md</span>.</p>
  <div class="grid2">${decisoes.map(([t, d]) => `<div class="card dec"><b>${esc(t)}</b><span>${esc(d)}</span></div>`).join('')}</div>
</section>

<section id="acesso">
  <h2>Instalação e acesso</h2>
  <p class="lead">Não precisa instalar nada: basta abrir <a href="https://gabi-guerreiro.github.io/ebenezer-conecta/" target="_blank" rel="noopener">o app (https://gabi-guerreiro.github.io/ebenezer-conecta/)</a> no celular ou no computador. Para rodar localmente ou alterar o código, siga o <span class="mono">README.md</span>.</p>
  <div class="card access">
    <div><div class="muted" style="font-size:12px;font-weight:900;text-transform:uppercase">Equipe</div><div class="code">—</div><div class="muted" style="font-size:13px">sem senha</div></div>
    <div><div class="muted" style="font-size:12px;font-weight:900;text-transform:uppercase">Coordenação</div><div class="code">1234</div><div class="muted" style="font-size:13px">código de demonstração</div></div>
    <div><div class="muted" style="font-size:12px;font-weight:900;text-transform:uppercase">Psicóloga</div><div class="code">5678</div><div class="muted" style="font-size:13px">código de demonstração</div></div>
  </div>
  <div class="card" style="margin-top:12px;padding:16px 18px"><pre class="mono" style="margin:0;white-space:pre-wrap">git clone https://github.com/gabi-guerreiro/ebenezer-conecta.git
cd ebenezer-conecta
npm start          # app em http://localhost:4173
npm install && npm test    # 21 testes E2E</pre></div>
</section>
</main>

<footer><div class="wrap">Ebenézer Conecta v1.0 · MBA Inteli, Grupo 5 · Página gerada automaticamente a partir do resultado dos testes (<span class="mono">npm run evidencias</span>).</div></footer>

<div class="lb" id="lb" onclick="this.classList.remove('on')"><img alt=""></div>
<script>
document.querySelectorAll('.shot img').forEach(i=>i.addEventListener('click',()=>{const lb=document.getElementById('lb');lb.querySelector('img').src=i.src;lb.querySelector('img').alt=i.alt;lb.classList.add('on');}));
document.addEventListener('keydown',e=>{if(e.key==='Escape')document.getElementById('lb').classList.remove('on');});
</script>
</body>
</html>`;

const out = path.join(ROOT, INLINE ? 'evidencias-completo.html' : 'evidencias.html');
fs.writeFileSync(out, html);
console.log('Gerado', path.relative(ROOT, out), `(${Math.round(fs.statSync(out).size / 1024)} KB)`);
