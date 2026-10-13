// Grava o vídeo demonstrativo da versão atual (docs/video/demo-ebenezer-conecta.mp4).
// Uso: npm run video   (precisa do ffmpeg instalado para converter para MP4)
// O vídeo é dividido em blocos que seguem o roteiro de locução (docs/video/roteiro-locucao.txt).
// Cada bloco dura pelo menos o tempo de leitura do seu texto; o início de cada bloco vai para
// docs/video/segmentos.json, usado para encaixar a locução.
const { chromium } = require('playwright');
const http = require('http');
const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

const ROOT = path.join(__dirname, '..');
const OUT = path.join(ROOT, 'docs', 'video');
const pausa = ms => new Promise(r => setTimeout(r, ms));
const BLOCOS = []; let T0 = 0; let atual = null;

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
// Abre um bloco: legenda + cronômetro. O bloco só termina depois de "segundos".
async function bloco(page, n, titulo, segundos, acoes) {
  atual = { n, titulo, t: (Date.now() - T0) / 1000 };
  await legenda(page, titulo);
  const ini = Date.now();
  await acoes();
  const falta = segundos * 1000 - (Date.now() - ini);
  if (falta > 0) await pausa(falta);
  atual.fim = (Date.now() - T0) / 1000; BLOCOS.push(atual);
}
const rolar = async (page, px, ms = 1200) => { await page.mouse.wheel(0, px); await pausa(ms); };
const ver = async (page, sel, ms = 900) => { await page.locator(sel).first().scrollIntoViewIfNeeded(); await pausa(ms); };
const entrarCodigo = async (page, role, code) => {
  await page.click(`[data-act=open-code][data-role=${role}]`);
  await page.locator('#codeInput').pressSequentially(code, { delay: 110 });
  await page.click('[data-act=confirm-code]'); await pausa(700);
};

(async () => {
  fs.mkdirSync(OUT, { recursive: true });
  const server = http.createServer((req, res) => {
    res.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8' }); fs.createReadStream(path.join(ROOT, 'index.html')).pipe(res);
  }).listen(4174);

  const browser = await chromium.launch({ slowMo: 160 });
  const ctx = await browser.newContext({ viewport: { width: 390, height: 844 }, deviceScaleFactor: 2, recordVideo: { dir: OUT, size: { width: 390, height: 844 } }, locale: 'pt-BR', timezoneId: 'America/Sao_Paulo' });
  const page = await ctx.newPage();
  T0 = Date.now();
  page.on('dialog', d => d.accept(d.type() === 'prompt' ? (d.defaultValue() || 'Participou das atividades seguintes.') : undefined));
  await page.route(/fonts\.(googleapis|gstatic)\.com/, r => r.abort());
  await page.goto('http://127.0.0.1:4174/index.html');
  await page.evaluate(() => localStorage.clear()); await page.reload();
  await page.addStyleTag({ content: '.fadein{animation:none!important}' });

  await bloco(page, 1, 'Ebenézer Conecta · versão 1.3 · dados 100% fictícios. Três perfis: Equipe, Coordenação e Psicóloga.', 10, async () => {
    await pausa(9000);
  });

  await bloco(page, 2, '1 · Equipe: presença do encontro e registro do grupo.', 16, async () => {
    await page.click('[data-act=pick-role][data-role=educadora]'); await pausa(1500);
    await page.click('.bottomnav [data-tab=presenca]'); await pausa(800);
    await page.click('[data-act=pres-marcar-todos]');
    await page.click('[data-act=pres-mark][data-child=EDU-0001][data-v=justificada]'); await pausa(900);
    await ver(page, '[data-gblock]');
    await page.click('[data-act=grp-ativ][data-v="Oficina e arte"]');
    await page.click('[data-act=grp-engaj][data-v=maioria]');
    await page.locator('[data-act=grupo-obs]').pressSequentially('Mandalas para o mural. Turma calma depois da roda.', { delay: 25 });
    await pausa(500); await page.click('[data-act=pres-fechar]');
  });

  await bloco(page, 3, '2 · Avaliação: sem consentimento, a coleta fica bloqueada.', 12, async () => {
    await page.click('.bottomnav [data-tab=avaliacoes]');
    await page.click('[data-act=goto-avaliar][data-child=EDU-0001]'); await pausa(2600);
    await page.click('[data-act=sub-back]');
    await legenda(page, 'Com consentimento: 5 frases, cada uma sim, não ou não observei.');
    await page.click('[data-act=goto-avaliar][data-child=EDU-0003]');
    await page.click('[data-act=aval-modo][data-v=rapido]');
    for (const k of ['ajudou', 'conflito', 'resolveu', 'participou', 'intervencao'])
      await page.click(`[data-act=aval-resp][data-k=${k}][data-v=${k === 'conflito' ? 'nao' : 'sim'}]`);
    await page.click('[data-act=aval-submit]');
  });

  await bloco(page, 4, '3 · Observação: o app avisa se o texto cita outra criança.', 10, async () => {
    await page.click('.bottomnav [data-tab=registros]');
    await page.click('[data-act=goto-novoregistro]');
    await page.click('[data-act=novo-pick-child][data-child=EDU-0003]');
    await page.click('[data-act=novo-metodo][data-v=escrito]');
    await page.locator('[data-act=novo-texto]').pressSequentially('Brincou com o Benício', { delay: 40 }); await pausa(1800);
    await page.locator('[data-act=novo-texto]').fill('');
    await page.locator('[data-act=novo-texto]').pressSequentially('Montou o quebra-cabeça até o fim e mostrou ao grupo.', { delay: 22 });
    await page.click('[data-act=novo-submit]');
  });

  await bloco(page, 5, '4 · Caso urgente: a Equipe notifica na hora, com protocolo de proteção.', 13, async () => {
    await page.click('.bottomnav [data-tab=painel]'); await pausa(600);
    await page.click('[data-act=goto-notificar]');
    await page.selectOption('[data-act=nt-child]', 'EDU-0010'); await pausa(400);
    await page.click('[data-act=nt-tipo][data-v=violencia]'); await pausa(500);
    await ver(page, '.callout.bad', 2600);
    await ver(page, '[data-act=nt-texto]', 300);
    await page.locator('[data-act=nt-texto]').pressSequentially('Disse: "não quero voltar para casa hoje". Estava com medo.', { delay: 22 });
    await page.click('[data-act=nt-submit]'); await pausa(1200);
  });

  await bloco(page, 6, '5 · Coordenação: alerta no painel, assume, registra a ação e encerra.', 17, async () => {
    await page.click('[data-act=tab-back]');
    await entrarCodigo(page, 'coordenacao', '1234'); await pausa(1800);
    await page.click('.bottomnav [data-tab=notificacoes]'); await pausa(1300);
    await page.locator('.nt-card').first().click(); await pausa(900);
    await page.click('[data-act=nt-assumir]'); await pausa(500);
    await ver(page, '[data-act=nt-acao-tipo]', 300);
    await page.selectOption('[data-act=nt-acao-tipo]', 'Conselho Tutelar comunicado');
    await page.locator('[data-act=nt-acao-texto]').pressSequentially('Ligação ao Conselho Tutelar às 17h.', { delay: 22 });
    await page.click('[data-act=nt-acao-submit]'); await pausa(500);
    await ver(page, '[data-act=nt-desfecho]', 1200);
    await page.selectOption('[data-act=nt-desfecho]', 'Conselho Tutelar comunicado'); await pausa(500);
    await page.click('[data-act=nt-encerrar]');
  });

  await bloco(page, 7, '6 · Revisão: nada entra no relatório sem a Coordenação validar.', 7, async () => {
    await page.click('.bottomnav [data-tab=registros]');
    await page.click('[data-act=reg-filtro][data-f=andamento]'); await pausa(1000);
    await page.locator('.srow', { hasText: 'Montou o quebra-cabeça' }).locator('[data-act=validar-registro]').click();
  });

  await bloco(page, 8, '7 · Com um botão, a Coordenação gera o relatório completo.', 17, async () => {
    await page.click('.bottomnav [data-tab=painel]');
    await page.click('[data-act=goto-relcompleto]'); await pausa(2200);
    await rolar(page, 620, 1700); await rolar(page, 700, 1700);
    await ver(page, '[data-rc=evolucao]', 2000);
    await ver(page, '#repTexto', 2400);
  });

  await bloco(page, 9, '8 · Psicóloga: registro dos grupos que conduz, como o Começos que Protegem.', 14, async () => {
    await legenda(page, '');
    await page.click('[data-act=sub-back]');
    await page.click('[data-act=logout]');
    await entrarCodigo(page, 'psicologa', '5678');
    await legenda(page, '8 · Psicóloga: registro dos grupos que conduz, como o Começos que Protegem.');
    await page.click('.bottomnav [data-tab=grupos]'); await pausa(700);
    await page.selectOption('[data-act=pres-turma]', 'cp'); await pausa(500);
    await page.click('[data-act=grp-ativ][data-v="Nomear emoções"]');
    await page.click('[data-act=grp-engaj][data-v=maioria]');
    await page.click('[data-act=grp-mov][data-v="Escuta entre os participantes"]');
    await ver(page, '[data-act=grupo-obs]', 300);
    await page.locator('[data-act=grupo-obs]').pressSequentially('O grupo falou sobre pedir ajuda quando está com raiva.', { delay: 22 });
    await page.click('[data-act=grp-salvar]');
  });

  await bloco(page, 10, 'Publicado no GitHub Pages, com 24 testes automáticos e documentação para o Instituto.', 10, async () => {
    await page.click('[data-act=logout]'); await pausa(500);
  });

  const vid = await page.video().path();
  await ctx.close(); await browser.close(); server.close();
  const mp4 = path.join(OUT, 'demo-ebenezer-conecta.mp4');
  execSync(`ffmpeg -y -loglevel error -i "${vid}" -c:v libx264 -pix_fmt yuv420p -crf 26 -movflags +faststart "${mp4}"`);
  fs.unlinkSync(vid);
  const dur = parseFloat(execSync(`ffprobe -v error -show_entries format=duration -of csv=p=0 "${mp4}"`).toString());
  fs.writeFileSync(path.join(OUT, 'segmentos.json'), JSON.stringify({ duracao: dur, blocos: BLOCOS }, null, 2));
  console.log('Vídeo salvo em', path.relative(ROOT, mp4), '·', dur.toFixed(1), 's');
  BLOCOS.forEach(b => console.log(`bloco ${b.n}: ${b.t.toFixed(1)}–${b.fim.toFixed(1)} s`));
})();
