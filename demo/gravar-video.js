// Grava o vídeo demonstrativo da versão atual (docs/video/demo-ebenezer-conecta.mp4).
// Uso: npm run video   (precisa do ffmpeg instalado para converter para MP4)
// Também grava docs/video/segmentos.json com o início de cada trecho, usado para sincronizar a locução.
const { chromium } = require('playwright');
const http = require('http');
const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

const ROOT = path.join(__dirname, '..');
const OUT = path.join(ROOT, 'docs', 'video');
const pausa = ms => new Promise(r => setTimeout(r, ms));
const SEG = []; let T0 = 0;

async function legenda(page, texto, ms = 2600) {
  if (texto) SEG.push({ t: (Date.now() - T0) / 1000, texto });
  await page.evaluate(t => {
    let el = document.getElementById('demo-cap');
    if (!el) {
      el = document.createElement('div'); el.id = 'demo-cap';
      el.style.cssText = 'position:fixed;left:10px;right:10px;top:10px;z-index:999;background:rgba(14,36,22,.93);color:#fff;font:700 15px/1.35 Nunito,system-ui,sans-serif;padding:12px 14px;border-radius:12px;box-shadow:0 10px 30px rgba(0,0,0,.35);transition:opacity .25s';
      document.body.appendChild(el);
    }
    el.textContent = t; el.style.opacity = t ? '1' : '0';
  }, texto);
  await pausa(ms);
}
const rolar = async (page, px, ms = 1300) => { await page.mouse.wheel(0, px); await pausa(ms); };
const entrarCodigo = async (page, role, code) => {
  await page.click(`[data-act=open-code][data-role=${role}]`);
  await page.locator('#codeInput').pressSequentially(code, { delay: 110 });
  await page.click('[data-act=confirm-code]'); await pausa(900);
};

(async () => {
  fs.mkdirSync(OUT, { recursive: true });
  const server = http.createServer((req, res) => {
    res.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8' }); fs.createReadStream(path.join(ROOT, 'index.html')).pipe(res);
  }).listen(4174);

  const browser = await chromium.launch({ slowMo: 220 });
  const ctx = await browser.newContext({ viewport: { width: 390, height: 844 }, deviceScaleFactor: 2, recordVideo: { dir: OUT, size: { width: 390, height: 844 } }, locale: 'pt-BR', timezoneId: 'America/Sao_Paulo' });
  const page = await ctx.newPage();
  T0 = Date.now();
  page.on('dialog', d => d.accept(d.type() === 'prompt' ? (d.defaultValue() || 'Participou das atividades seguintes.') : undefined));
  await page.route(/fonts\.(googleapis|gstatic)\.com/, r => r.abort());
  await page.goto('http://127.0.0.1:4174/index.html');
  await page.evaluate(() => localStorage.clear()); await page.reload();

  // 1 · Abertura
  await legenda(page, 'Ebenézer Conecta · versão 1.3 · dados 100% fictícios. Três perfis: Equipe, Coordenação e Psicóloga.', 4200);

  // 2 · Equipe
  await legenda(page, '1 · A Equipe entra sem senha, direto no celular.', 1800);
  await page.click('[data-act=pick-role][data-role=educadora]'); await pausa(1800);

  // 3 · Presença e registro do grupo
  await legenda(page, '2 · Presença do encontro: marcar todos e ajustar as exceções.', 1800);
  await page.click('.bottomnav [data-tab=presenca]');
  await page.click('[data-act=pres-marcar-todos]');
  await page.click('[data-act=pres-mark][data-child=EDU-0001][data-v=justificada]'); await pausa(800);
  await page.locator('[data-gblock]').scrollIntoViewIfNeeded(); await pausa(600);
  await legenda(page, 'Registro do grupo: atividade, participação e uma observação geral.', 1200);
  await page.click('[data-act=grp-ativ][data-v="Oficina e arte"]');
  await page.click('[data-act=grp-engaj][data-v=maioria]');
  await page.locator('[data-act=grupo-obs]').pressSequentially('Mandalas para o mural. Turma calma depois da roda.', { delay: 22 });
  await pausa(600);
  await page.click('[data-act=pres-fechar]'); await pausa(1200);

  // 4 · Avaliação
  await legenda(page, '3 · Avaliação: sem consentimento do responsável, a coleta fica bloqueada.', 1500);
  await page.click('.bottomnav [data-tab=avaliacoes]');
  await page.click('[data-act=goto-avaliar][data-child=EDU-0001]'); await pausa(2000);
  await page.click('[data-act=sub-back]');
  await legenda(page, 'Com consentimento: 5 frases, cada uma sim, não ou não observei.', 1200);
  await page.click('[data-act=goto-avaliar][data-child=EDU-0003]');
  await page.click('[data-act=aval-modo][data-v=rapido]');
  for (const k of ['ajudou', 'conflito', 'resolveu', 'participou', 'intervencao'])
    await page.click(`[data-act=aval-resp][data-k=${k}][data-v=${k === 'conflito' ? 'nao' : 'sim'}]`);
  await page.click('[data-act=aval-submit]'); await pausa(1200);

  // 5 · Observação
  await legenda(page, '4 · Observação individual: o app avisa se o texto cita outra criança.', 1200);
  await page.click('.bottomnav [data-tab=registros]');
  await page.click('[data-act=goto-novoregistro]');
  await page.click('[data-act=novo-pick-child][data-child=EDU-0003]');
  await page.click('[data-act=novo-metodo][data-v=escrito]');
  await page.locator('[data-act=novo-texto]').pressSequentially('Brincou com o Benício', { delay: 40 }); await pausa(1600);
  await page.locator('[data-act=novo-texto]').fill('');
  await page.locator('[data-act=novo-texto]').pressSequentially('Montou o quebra-cabeça até o fim e mostrou ao grupo.', { delay: 22 });
  await page.click('[data-act=novo-submit]'); await pausa(1300);

  // 6 · Notificação urgente
  await legenda(page, '5 · Caso urgente ou fora da curva: a Equipe notifica na hora.', 1300);
  await page.click('.bottomnav [data-tab=painel]');
  await page.click('[data-act=goto-notificar]');
  await page.selectOption('[data-act=nt-child]', 'EDU-0010'); await pausa(500);
  await page.click('[data-act=nt-tipo][data-v=violencia]'); await pausa(600);
  await legenda(page, 'Em suspeita de violência, o app mostra o protocolo e sugere urgência crítica.', 1200);
  await page.locator('.callout.bad').first().scrollIntoViewIfNeeded(); await pausa(2200);
  await page.locator('[data-act=nt-texto]').scrollIntoViewIfNeeded();
  await page.locator('[data-act=nt-texto]').pressSequentially('Disse: "não quero voltar para casa hoje". Estava com medo.', { delay: 22 });
  await page.click('[data-act=nt-submit]'); await pausa(2200);

  // 7 · Coordenação trata a urgência
  await legenda(page, '', 0);
  await page.click('[data-act=tab-back]');
  await entrarCodigo(page, 'coordenacao', '1234');
  await legenda(page, '6 · A Coordenação vê o alerta assim que entra.', 2600);
  await page.click('.bottomnav [data-tab=notificacoes]'); await pausa(1200);
  await legenda(page, 'As críticas vêm primeiro. Ela assume, registra a ação e encerra com o desfecho.', 1000);
  await page.locator('.nt-card').first().click(); await pausa(1000);
  await page.click('[data-act=nt-assumir]'); await pausa(600);
  await page.locator('[data-act=nt-acao-tipo]').scrollIntoViewIfNeeded();
  await page.selectOption('[data-act=nt-acao-tipo]', 'Conselho Tutelar comunicado');
  await page.locator('[data-act=nt-acao-texto]').pressSequentially('Ligação ao Conselho Tutelar às 17h.', { delay: 22 });
  await page.click('[data-act=nt-acao-submit]'); await pausa(800);
  await page.locator('[data-act=nt-desfecho]').scrollIntoViewIfNeeded(); await pausa(1200);
  await page.selectOption('[data-act=nt-desfecho]', 'Conselho Tutelar comunicado'); await pausa(600);
  await page.click('[data-act=nt-encerrar]'); await pausa(1500);

  // 8 · Revisão
  await legenda(page, '7 · Revisão: nada entra no relatório sem a Coordenação validar.', 1200);
  await page.click('.bottomnav [data-tab=registros]');
  await page.click('[data-act=reg-filtro][data-f=andamento]'); await pausa(1000);
  await page.locator('.srow', { hasText: 'Montou o quebra-cabeça' }).locator('[data-act=validar-registro]').click(); await pausa(1300);

  // 9 · Relatório completo
  await legenda(page, '8 · Com um botão, a Coordenação gera o relatório completo.', 1200);
  await page.click('.bottomnav [data-tab=painel]');
  await page.click('[data-act=goto-relcompleto]'); await pausa(2000);
  await legenda(page, 'Como o dado vira evidência e um card por programa, sem ranking.', 600);
  await rolar(page, 620, 1800); await rolar(page, 700, 1800);
  await legenda(page, 'Sinais de evolução só com base mínima, e o que falta para o próximo relatório.', 600);
  await page.locator('[data-rc=evolucao]').scrollIntoViewIfNeeded(); await pausa(2200);
  await rolar(page, 900, 2000);
  await legenda(page, 'Texto pronto para apoiadores: agregado, sem nomes de crianças.', 600);
  await page.locator('#repTexto').scrollIntoViewIfNeeded(); await pausa(2600);

  // 10 · Psicóloga
  await legenda(page, '', 0);
  await page.click('[data-act=sub-back]');
  await page.click('[data-act=logout]');
  await entrarCodigo(page, 'psicologa', '5678');
  await legenda(page, '9 · A Psicóloga registra os grupos que conduz, como o Começos que Protegem.', 1600);
  await page.click('.bottomnav [data-tab=grupos]'); await pausa(800);
  await page.selectOption('[data-act=pres-turma]', 'cp'); await pausa(600);
  await page.click('[data-act=grp-ativ][data-v="Nomear emoções"]');
  await page.click('[data-act=grp-engaj][data-v=maioria]');
  await page.click('[data-act=grp-mov][data-v="Escuta entre os participantes"]');
  await page.locator('[data-act=grupo-obs]').scrollIntoViewIfNeeded();
  await page.locator('[data-act=grupo-obs]').pressSequentially('O grupo falou sobre pedir ajuda quando está com raiva.', { delay: 22 });
  await page.click('[data-act=grp-salvar]'); await pausa(1600);

  // 11 · Encerramento
  await legenda(page, 'Fim · app no GitHub Pages, testes automatizados e documentação de handover.', 4200);

  const vid = await page.video().path();
  await ctx.close(); await browser.close(); server.close();
  const mp4 = path.join(OUT, 'demo-ebenezer-conecta.mp4');
  execSync(`ffmpeg -y -loglevel error -i "${vid}" -c:v libx264 -pix_fmt yuv420p -crf 26 -movflags +faststart "${mp4}"`);
  fs.unlinkSync(vid);
  const dur = parseFloat(execSync(`ffprobe -v error -show_entries format=duration -of csv=p=0 "${mp4}"`).toString());
  fs.writeFileSync(path.join(OUT, 'segmentos.json'), JSON.stringify({ duracao: dur, segmentos: SEG }, null, 2));
  console.log('Vídeo salvo em', path.relative(ROOT, mp4), '·', dur.toFixed(1), 's ·', SEG.length, 'legendas');
})();
