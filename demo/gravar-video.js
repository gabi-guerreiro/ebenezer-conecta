// Grava o vídeo demonstrativo do fluxo principal (docs/video/demo-ebenezer-conecta.mp4).
// Uso: npm run video   (precisa do ffmpeg instalado para converter para MP4)
const { chromium } = require('playwright');
const http = require('http');
const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

const ROOT = path.join(__dirname, '..');
const OUT = path.join(ROOT, 'docs', 'video');
const pausa = ms => new Promise(r => setTimeout(r, ms));

async function legenda(page, texto, ms = 2600) {
  await page.evaluate(t => {
    let el = document.getElementById('demo-cap');
    if (!el) {
      el = document.createElement('div'); el.id = 'demo-cap';
      el.style.cssText = 'position:fixed;left:10px;right:10px;top:10px;z-index:999;background:rgba(14,36,22,.92);color:#fff;font:700 15px/1.35 Nunito,system-ui,sans-serif;padding:12px 14px;border-radius:12px;box-shadow:0 10px 30px rgba(0,0,0,.35);transition:opacity .25s';
      document.body.appendChild(el);
    }
    el.textContent = t; el.style.opacity = t ? '1' : '0';
  }, texto);
  await pausa(ms);
}

(async () => {
  fs.mkdirSync(OUT, { recursive: true });
  const server = http.createServer((req, res) => {
    const f = path.join(ROOT, 'index.html');
    res.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8' }); fs.createReadStream(f).pipe(res);
  }).listen(4174);

  const browser = await chromium.launch({ slowMo: 250 });
  const ctx = await browser.newContext({ viewport: { width: 390, height: 844 }, deviceScaleFactor: 2, recordVideo: { dir: OUT, size: { width: 390, height: 844 } }, locale: 'pt-BR' });
  const page = await ctx.newPage();
  page.on('dialog', d => d.accept(d.type() === 'prompt' ? (d.defaultValue() || 'Participou das duas atividades seguintes.') : undefined));
  await page.route(/fonts\.(googleapis|gstatic)\.com/, r => r.abort());
  await page.goto('http://127.0.0.1:4174/index.html');
  await page.evaluate(() => localStorage.clear()); await page.reload();

  await legenda(page, 'Ebenézer Conecta · MVP com dados 100% fictícios. Três perfis: Equipe, Coordenação e Psicóloga.', 3500);
  await legenda(page, '1 · A Equipe entra sem senha e vê o estado da coleta.');
  await page.click('[data-act=pick-role][data-role=educadora]'); await pausa(1500);

  await legenda(page, '2 · Presença do encontro: marcar todos e ajustar exceções.');
  await page.click('.bottomnav [data-tab=presenca]');
  await page.click('[data-act=pres-marcar-todos]');
  await page.click('[data-act=pres-mark][data-child=EDU-0001][data-v=justificada]');
  await page.mouse.wheel(0, 500); await pausa(1200);
  await page.click('[data-act=pres-fechar]'); await pausa(1200);

  await legenda(page, '3 · Avaliação DBR: sem consentimento do responsável, a coleta fica bloqueada.');
  await page.click('.bottomnav [data-tab=avaliacoes]');
  await page.click('[data-act=goto-avaliar][data-child=EDU-0001]'); await pausa(1800);
  await page.click('[data-act=sub-back]');
  await legenda(page, 'Com consentimento: modo rápido, 5 frases — sim / não / não observei.');
  await page.click('[data-act=goto-avaliar][data-child=EDU-0003]');
  await page.click('[data-act=aval-modo][data-v=rapido]');
  for (const k of ['ajudou', 'conflito', 'resolveu', 'participou', 'intervencao'])
    await page.click(`[data-act=aval-resp][data-k=${k}][data-v=${k === 'conflito' ? 'nao' : 'sim'}]`);
  await page.check('[data-act=aval-atencao]');
  await legenda(page, 'Marcar "atenção da psicóloga" gera um encaminhamento sem motivo escrito.', 2200);
  await page.click('[data-act=aval-submit]'); await pausa(1000);

  await legenda(page, '4 · Registro de observação: o app alerta se o texto cita outra criança.');
  await page.click('.bottomnav [data-tab=registros]');
  await page.click('[data-act=goto-novoregistro]');
  await page.click('[data-act=novo-pick-child][data-child=EDU-0003]');
  await page.click('[data-act=novo-metodo][data-v=escrito]');
  await page.locator('[data-act=novo-texto]').pressSequentially('Brincou com o Benício', { delay: 40 });
  await pausa(1500);
  await page.locator('[data-act=novo-texto]').fill('');
  await page.locator('[data-act=novo-texto]').pressSequentially('Montou o quebra-cabeça até o fim e mostrou ao grupo.', { delay: 25 });
  await page.click('[data-act=novo-submit]'); await pausa(1500);

  await legenda(page, '5 · Coordenação entra com código e revisa a fila: validar ou devolver.');
  await page.click('[data-act=open-code][data-role=coordenacao]');
  await page.locator('#codeInput').pressSequentially('1234', { delay: 120 });
  await page.click('[data-act=confirm-code]');
  await page.click('.bottomnav [data-tab=registros]');
  await page.click('[data-act=reg-filtro][data-f=andamento]'); await pausa(1200);
  await page.locator('.srow', { hasText: 'Montou o quebra-cabeça' }).locator('[data-act=validar-registro]').click(); await pausa(1500);

  await legenda(page, '6 · Intervenção: proposta → acompanhamento → validação do resultado.');
  await page.click('.bottomnav [data-tab=intervencoes]');
  await page.click('[data-act=goto-propor-tab]');
  await page.click('[data-act=propor-pick-child][data-child=EDU-0003]');
  await page.click('[data-act=propor-acao][data-v="0"]');
  await page.click('[data-act=propor-submit]'); await pausa(1200);
  await page.click('.bottomnav [data-tab=intervencoes]');
  const card = () => page.locator('.card', { hasText: 'Cauã Cardoso' });
  await card().locator('[data-act=iv-avancar]').click(); await pausa(800);
  await card().locator('[data-act=iv-registrar]').click(); await pausa(1500);

  await legenda(page, '7 · Trajetória individual: tudo o que foi registrado sobre a criança, em ordem.');
  await page.click('.bottomnav [data-tab=educandos]');
  await page.click('[data-act=goto-child][data-child=EDU-0005]'); await pausa(1200);
  await page.mouse.wheel(0, 700); await pausa(1600);
  await page.mouse.wheel(0, 700); await pausa(1600);

  await legenda(page, '8 · Governança: consentimento, o que nunca é coletado e trilha de auditoria.');
  await page.click('.bottomnav [data-act=open-sheet]');
  await page.click('.sheet [data-tab=governanca]'); await pausa(1200);
  await page.mouse.wheel(0, 600); await pausa(1800);

  await legenda(page, '9 · Psicóloga: recebe o encaminhamento e registra o caso clínico (confidencial).');
  await page.click('[data-act=logout]');
  await page.click('[data-act=open-code][data-role=psicologa]');
  await page.locator('#codeInput').pressSequentially('5678', { delay: 120 });
  await page.click('[data-act=confirm-code]');
  await page.click('.bottomnav [data-tab=encaminhamentos]'); await pausa(1500);
  await page.locator('.roster', { hasText: 'Cauã Cardoso' }).first().locator('[data-act=enc-revisar]').click(); await pausa(1200);
  await legenda(page, 'Fim da demonstração · repositório com testes automatizados e documentação de handover.', 3500);

  const vid = await page.video().path();
  await ctx.close(); await browser.close(); server.close();
  const mp4 = path.join(OUT, 'demo-ebenezer-conecta.mp4');
  execSync(`ffmpeg -y -loglevel error -i "${vid}" -c:v libx264 -pix_fmt yuv420p -crf 26 -movflags +faststart "${mp4}"`);
  fs.unlinkSync(vid);
  console.log('Vídeo salvo em', path.relative(ROOT, mp4));
})();
