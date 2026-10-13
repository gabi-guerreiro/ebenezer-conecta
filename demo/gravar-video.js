// Grava o vídeo demonstrativo da versão atual (docs/video/demo-ebenezer-conecta.mp4).
// Uso: npm run video            -> grava no ritmo do roteiro (docs/video/locucao-blocos.json)
//      node demo/gravar-video.js --medir  -> só mede quanto tempo cada passo leva
// O vídeo segue os 10 blocos do roteiro de locução. Cada bloco dura o tempo da fala do bloco,
// e a folga é distribuída entre os passos da tela (não acumulada no fim), para a imagem
// acompanhar a voz sem trechos acelerados nem telas paradas.
const { chromium } = require('playwright');
const http = require('http');
const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

const ROOT = path.join(__dirname, '..');
const OUT = path.join(ROOT, 'docs', 'video');
const MEDIR = process.argv.includes('--medir');
const ARQ_MEDIDAS = path.join(OUT, 'passos-medidos.json');
const LOC = JSON.parse(fs.readFileSync(path.join(OUT, 'locucao-blocos.json'), 'utf8')); // {duracoes:[s,...], folga:s}
const MEDIDAS = !MEDIR && fs.existsSync(ARQ_MEDIDAS) ? JSON.parse(fs.readFileSync(ARQ_MEDIDAS, 'utf8')) : {};
const pausa = ms => new Promise(r => setTimeout(r, ms));
const BLOCOS = []; const NOVAS = {}; let T0 = 0;

async function legenda(page, texto) {
  await page.evaluate(t => {
    let el = document.getElementById('demo-cap');
    if (!el) {
      el = document.createElement('div'); el.id = 'demo-cap';
      el.style.cssText = 'position:fixed;left:10px;right:10px;top:10px;z-index:999;background:rgba(14,36,22,.93);color:#fff;font:700 15px/1.35 Nunito,system-ui,sans-serif;padding:12px 14px;border-radius:12px;box-shadow:0 10px 30px rgba(0,0,0,.35);transition:opacity .25s';
      document.body.appendChild(el);
    }
    el.textContent = t; el.style.opacity = t ? '1' : '0';
  }, texto);
}

// Executa os passos do bloco espalhando a folga entre eles.
async function bloco(page, n, titulo, passos) {
  const alvo = (LOC.duracoes[n - 1] + LOC.folga) * 1000;
  const med = MEDIDAS[n] || passos.map(() => 0);
  const ini = Date.now();
  const t = { n, titulo, t: (ini - T0) / 1000 };
  if (titulo) await legenda(page, titulo);
  const tempos = [];
  for (let i = 0; i < passos.length; i++) {
    const p0 = Date.now();
    await passos[i]();
    tempos.push(Date.now() - p0);
    if (!MEDIR) {
      const decorrido = Date.now() - ini;
      const restanteEstimado = med.slice(i + 1).reduce((a, b) => a + b, 0);
      const faltam = passos.length - i;                     // pausas restantes (inclui a final)
      const folga = (alvo - decorrido - restanteEstimado) / faltam;
      if (folga > 0) await pausa(folga);
    }
  }
  NOVAS[n] = tempos;
  t.fim = (Date.now() - T0) / 1000; BLOCOS.push(t);
}
const ver = async (page, sel) => { await page.locator(sel).first().scrollIntoViewIfNeeded(); };
const digitar = (page, sel, txt) => page.locator(sel).pressSequentially(txt, { delay: 30 });
const entrarCodigo = async (page, role, code) => {
  await page.click(`[data-act=open-code][data-role=${role}]`);
  await page.locator('#codeInput').pressSequentially(code, { delay: 110 });
  await page.click('[data-act=confirm-code]');
};

(async () => {
  fs.mkdirSync(OUT, { recursive: true });
  const server = http.createServer((req, res) => {
    res.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8' }); fs.createReadStream(path.join(ROOT, 'index.html')).pipe(res);
  }).listen(4174);

  const browser = await chromium.launch({ slowMo: 200 });
  const ctx = await browser.newContext({ viewport: { width: 390, height: 844 }, deviceScaleFactor: 2, recordVideo: { dir: OUT, size: { width: 390, height: 844 } }, locale: 'pt-BR', timezoneId: 'America/Sao_Paulo' });
  const page = await ctx.newPage();
  T0 = Date.now();
  page.on('dialog', d => d.accept(d.type() === 'prompt' ? (d.defaultValue() || 'Participou das atividades seguintes.') : undefined));
  await page.route(/fonts\.(googleapis|gstatic)\.com/, r => r.abort());
  await page.goto('http://127.0.0.1:4174/index.html');
  await page.evaluate(() => localStorage.clear()); await page.reload();
  await page.addStyleTag({ content: '.fadein{animation:none!important}' });
  const inicioUtil = (Date.now() - T0) / 1000;   // antes disso o vídeo mostra o carregamento

  await bloco(page, 1, 'Ebenézer Conecta · versão 1.3 · dados 100% fictícios. Três perfis: Equipe, Coordenação e Psicóloga.', [
    async () => {},
  ]);

  await bloco(page, 2, '1 · Equipe: presença do encontro e registro do grupo.', [
    () => page.click('[data-act=pick-role][data-role=educadora]'),
    () => page.click('.bottomnav [data-tab=presenca]'),
    async () => { await page.click('[data-act=pres-marcar-todos]'); await page.click('[data-act=pres-mark][data-child=EDU-0001][data-v=justificada]'); },
    () => ver(page, '[data-gblock]'),
    async () => { await page.click('[data-act=grp-ativ][data-v="Oficina e arte"]'); await page.click('[data-act=grp-engaj][data-v=maioria]'); },
    () => digitar(page, '[data-act=grupo-obs]', 'Mandalas para o mural. Turma calma depois da roda.'),
    () => page.click('[data-act=pres-fechar]'),
  ]);

  await bloco(page, 3, '2 · Avaliação: sem consentimento, a coleta fica bloqueada.', [
    async () => { await page.click('.bottomnav [data-tab=avaliacoes]'); await page.click('[data-act=goto-avaliar][data-child=EDU-0001]'); },
    async () => { await page.click('[data-act=sub-back]'); await legenda(page, 'Com consentimento: 5 frases, cada uma sim, não ou não observei.'); await page.click('[data-act=goto-avaliar][data-child=EDU-0003]'); },
    () => page.click('[data-act=aval-modo][data-v=rapido]'),
    async () => { for (const k of ['ajudou', 'conflito', 'resolveu', 'participou', 'intervencao']) await page.click(`[data-act=aval-resp][data-k=${k}][data-v=${k === 'conflito' ? 'nao' : 'sim'}]`); },
    () => page.click('[data-act=aval-submit]'),
  ]);

  await bloco(page, 4, '3 · Observação: o app avisa se o texto cita outra criança.', [
    async () => { await page.click('.bottomnav [data-tab=registros]'); await page.click('[data-act=goto-novoregistro]'); await page.click('[data-act=novo-pick-child][data-child=EDU-0003]'); await page.click('[data-act=novo-metodo][data-v=escrito]'); },
    () => digitar(page, '[data-act=novo-texto]', 'Brincou com o Benício'),
    async () => { await page.locator('[data-act=novo-texto]').fill(''); await digitar(page, '[data-act=novo-texto]', 'Montou o quebra-cabeça até o fim e mostrou ao grupo.'); },
    () => page.click('[data-act=novo-submit]'),
  ]);

  await bloco(page, 5, '4 · Caso urgente: a Equipe notifica na hora, com protocolo de proteção.', [
    async () => { await page.click('.bottomnav [data-tab=painel]'); await page.click('[data-act=goto-notificar]'); },
    async () => { await page.selectOption('[data-act=nt-child]', 'EDU-0010'); await page.click('[data-act=nt-tipo][data-v=violencia]'); },
    () => ver(page, '.callout.bad'),
    async () => { await ver(page, '[data-act=nt-texto]'); await digitar(page, '[data-act=nt-texto]', 'Disse: "não quero voltar para casa hoje". Estava com medo.'); },
    () => page.click('[data-act=nt-submit]'),
  ]);

  await bloco(page, 6, '5 · Coordenação: alerta no painel, assume, registra a ação e encerra.', [
    async () => { await page.click('[data-act=tab-back]'); await entrarCodigo(page, 'coordenacao', '1234'); },
    () => page.click('.bottomnav [data-tab=notificacoes]'),
    () => page.locator('.nt-card').first().click(),
    () => page.click('[data-act=nt-assumir]'),
    async () => { await ver(page, '[data-act=nt-acao-tipo]'); await page.selectOption('[data-act=nt-acao-tipo]', 'Conselho Tutelar comunicado'); await digitar(page, '[data-act=nt-acao-texto]', 'Ligação ao Conselho Tutelar às 17h.'); await page.click('[data-act=nt-acao-submit]'); },
    async () => { await ver(page, '[data-act=nt-desfecho]'); await page.selectOption('[data-act=nt-desfecho]', 'Conselho Tutelar comunicado'); },
    () => page.click('[data-act=nt-encerrar]'),
  ]);

  await bloco(page, 7, '6 · Revisão: nada entra no relatório sem a Coordenação validar.', [
    async () => { await page.click('.bottomnav [data-tab=registros]'); await page.click('[data-act=reg-filtro][data-f=andamento]'); },
    () => page.locator('.srow', { hasText: 'Montou o quebra-cabeça' }).locator('[data-act=validar-registro]').click(),
  ]);

  await bloco(page, 8, '7 · Com um botão, a Coordenação gera o relatório completo.', [
    async () => { await page.click('.bottomnav [data-tab=painel]'); await page.click('[data-act=goto-relcompleto]'); },
    () => page.mouse.wheel(0, 620),
    () => page.mouse.wheel(0, 700),
    () => ver(page, '[data-rc=evolucao]'),
    () => ver(page, '#repTexto'),
  ]);

  await bloco(page, 9, '8 · Psicóloga: registro dos grupos que conduz, como o Começos que Protegem.', [
    async () => { await page.evaluate(() => { S.role = null; S.tab = null; S.sub = null; S.ctx = {}; render(); window.scrollTo(0, 0); }); await entrarCodigo(page, 'psicologa', '5678'); },
    async () => { await page.click('.bottomnav [data-tab=grupos]'); await page.selectOption('[data-act=pres-turma]', 'cp'); },
    async () => { await page.click('[data-act=grp-ativ][data-v="Nomear emoções"]'); await page.click('[data-act=grp-engaj][data-v=maioria]'); await page.click('[data-act=grp-mov][data-v="Escuta entre os participantes"]'); },
    async () => { await ver(page, '[data-act=grupo-obs]'); await digitar(page, '[data-act=grupo-obs]', 'O grupo falou sobre pedir ajuda quando está com raiva.'); },
    () => page.click('[data-act=grp-salvar]'),
  ]);

  await bloco(page, 10, 'Publicado no GitHub Pages, com 24 testes automáticos e documentação para o Instituto.', [
    () => page.click('[data-act=logout]'),
  ]);

  const vid = await page.video().path();
  await ctx.close(); await browser.close(); server.close();
  if (MEDIR) {
    fs.writeFileSync(ARQ_MEDIDAS, JSON.stringify(NOVAS, null, 2)); fs.unlinkSync(vid);
    console.log('Medidas salvas em', path.relative(ROOT, ARQ_MEDIDAS));
    Object.entries(NOVAS).forEach(([n, ts]) => console.log(`bloco ${n}: ${(ts.reduce((a, b) => a + b, 0) / 1000).toFixed(1)} s de ação · fala ${LOC.duracoes[n - 1]} s`));
    return;
  }
  const mp4 = path.join(OUT, 'demo-ebenezer-conecta-sem-narracao.mp4');
  // corta o carregamento inicial para o vídeo abrir já na tela inicial
  execSync(`ffmpeg -y -loglevel error -ss ${inicioUtil.toFixed(2)} -i "${vid}" -c:v libx264 -pix_fmt yuv420p -crf 24 -movflags +faststart "${mp4}"`);
  fs.unlinkSync(vid);
  const dur = parseFloat(execSync(`ffprobe -v error -show_entries format=duration -of csv=p=0 "${mp4}"`).toString());
  BLOCOS.forEach(b => { b.t -= inicioUtil; b.fim -= inicioUtil; });
  fs.writeFileSync(path.join(OUT, 'segmentos.json'), JSON.stringify({ duracao: dur, blocos: BLOCOS }, null, 2));
  console.log('Vídeo salvo em', path.relative(ROOT, mp4), '·', dur.toFixed(1), 's');
  BLOCOS.forEach(b => console.log(`bloco ${b.n}: ${b.t.toFixed(1)}–${b.fim.toFixed(1)} s (${(b.fim - b.t).toFixed(1)} s · fala ${LOC.duracoes[b.n - 1]} s)`));
})();
