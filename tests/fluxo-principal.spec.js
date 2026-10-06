// Testes ponta a ponta (E2E) do Ebenézer Conecta.
// Cada teste abre o app "zerado" (dados de demonstração) num navegador novo,
// executa o fluxo como um usuário real faria (cliques e digitação) e confere o resultado.
// As capturas de tela de cada etapa são salvas em docs/evidencias/ como evidência.
const { test, expect } = require('@playwright/test');
const path = require('path');

const EVID = path.join(__dirname, '..', 'docs', 'evidencias');
const CODES = { coordenacao: '1234', psicologa: '5678' };

async function shot(page, nome) {
  await page.screenshot({ path: path.join(EVID, `${nome}.png`), fullPage: false, animations: 'disabled' });
}
async function abrir(page) {
  // A fonte do Google é opcional (há fallback de sistema); bloqueamos para o teste não depender de rede.
  await page.route(/fonts\.(googleapis|gstatic)\.com/, r => r.abort());
  await page.goto('/index.html');
  await page.evaluate(() => localStorage.clear());
  await page.reload();
}
async function entrar(page, perfil) {
  if (perfil === 'educadora') {
    await page.click('[data-act=pick-role][data-role=educadora]');
  } else {
    await page.click(`[data-act=open-code][data-role=${perfil}]`);
    await page.fill('#codeInput', CODES[perfil]);
    await page.click('[data-act=confirm-code]');
  }
  await expect(page.locator('.userbar')).toBeVisible();
}
async function sair(page) { await page.click('[data-act=logout]'); }
// Abas principais ficam na barra inferior; as demais, no menu "Mais".
async function aba(page, tab) {
  const btn = page.locator(`.bottomnav [data-tab=${tab}]`);
  if (await btn.count()) return btn.click();
  await page.click('.bottomnav [data-act=open-sheet]');
  await page.click(`.sheet [data-tab=${tab}]`);
}
const db = page => page.evaluate(() => DB);

// Coleta erros de JavaScript em todos os testes: qualquer erro reprova o teste.
test.beforeEach(async ({ page }, info) => {
  info.jsErrors = [];
  page.on('pageerror', e => info.jsErrors.push(e.message));
});
test.afterEach(async ({}, info) => {
  expect(info.jsErrors, 'sem erros de JavaScript durante o teste').toEqual([]);
});

test.describe('1. Acesso e perfis', () => {
  test('T01 · Tela inicial mostra os três perfis e a Equipe entra sem senha', async ({ page }) => {
    await abrir(page);
    await expect(page.getByText('Ebenézer Conecta').first()).toBeVisible();
    await expect(page.locator('[data-role=educadora]')).toBeVisible();
    await expect(page.locator('[data-act=open-code][data-role=coordenacao]')).toBeVisible();
    await expect(page.locator('[data-act=open-code][data-role=psicologa]')).toBeVisible();
    await shot(page, '01-tela-inicial');
    await entrar(page, 'educadora');
    await expect(page.locator('.tb-title')).toHaveText('Painel do educador');
    await shot(page, '02-painel-equipe');
  });

  test('T02 · Código errado é recusado; código certo libera a Coordenação', async ({ page }) => {
    await abrir(page);
    await page.click('[data-act=open-code][data-role=coordenacao]');
    await page.fill('#codeInput', '0000');
    let alerta = '';
    page.once('dialog', d => { alerta = d.message(); d.accept(); });
    await page.click('[data-act=confirm-code]');
    expect(alerta).toContain('Código incorreto');
    expect(await page.evaluate(() => S.role)).toBeNull();
    await page.fill('#codeInput', '1234');
    await shot(page, '03-codigo-acesso');
    await page.click('[data-act=confirm-code]');
    await expect(page.locator('.tb-title')).toHaveText('Visão da coordenação');
  });

  test('T03 · Segregação: só a psicóloga vê encaminhamentos, caso clínico e contato do responsável', async ({ page }) => {
    await abrir(page);
    await entrar(page, 'educadora');
    expect(await page.evaluate(() => allTabsFor('educadora').map(t => t[0]))).not.toContain('encaminhamentos');
    await page.click('[data-act=open-code][data-role=coordenacao]');
    await page.fill('#codeInput', '1234'); await page.click('[data-act=confirm-code]');
    await aba(page, 'educandos');
    await page.click('[data-act=goto-child][data-child=EDU-0007]');
    await expect(page.locator('.content')).not.toContainText('Caso clínico');
    await expect(page.locator('.content')).not.toContainText('95012-6634');
    await sair(page);
    await entrar(page, 'psicologa');
    await expect(page.locator('.bottomnav [data-tab=encaminhamentos]')).toHaveCount(1);
    await aba(page, 'educandos');
    await page.click('[data-act=goto-child][data-child=EDU-0007]');
    await expect(page.locator('.content')).toContainText('Caso clínico');
    await expect(page.locator('.content')).toContainText('95012-6634');
    // Regressão B8: a trajetória abre no topo, não na rolagem da tela anterior.
    expect(await page.evaluate(() => window.scrollY)).toBe(0);
    await page.locator('.k', { hasText: 'Caso clínico' }).scrollIntoViewIfNeeded();
    await shot(page, '04-psicologa-caso-clinico');
  });
});

test.describe('2. Fluxo principal da coleta', () => {
  test('T04 · Presença: marcar todos, fechar lançamento; só a coordenação reabre', async ({ page }) => {
    await abrir(page);
    await entrar(page, 'educadora');
    await aba(page, 'presenca');
    await page.click('[data-act=pres-marcar-todos]');
    await page.click('[data-act=pres-mark][data-child=EDU-0001][data-v=justificada]');
    await page.click('[data-act=pres-mark][data-child=EDU-0003][data-v=falta]');
    const rec = (await db(page)).presencas['lab_' + (await page.evaluate(() => HOJE))];
    const kidsLab = (await db(page)).children.filter(c => c.turmas.includes('lab')).length;
    expect(Object.keys(rec.marks)).toHaveLength(kidsLab);
    expect(rec.marks['EDU-0001']).toBe('justificada');
    expect(rec.marks['EDU-0003']).toBe('falta');
    await shot(page, '05-presenca-lancada');
    await page.click('[data-act=pres-fechar]');
    await expect(page.locator('.content')).toContainText('Fechado');
    await expect(page.locator('[data-act=pres-reabrir]')).toHaveCount(0);
    await page.click('[data-act=open-code][data-role=coordenacao]');
    await page.fill('#codeInput', '1234'); await page.click('[data-act=confirm-code]');
    await aba(page, 'presenca');
    await page.click('[data-act=pres-reabrir]');
    expect((await db(page)).presencas['lab_' + (await page.evaluate(() => HOJE))].fechado).toBe(false);
  });

  test('T05 · Avaliação bloqueada sem consentimento; liberada após a coordenação registrar', async ({ page }) => {
    await abrir(page);
    await entrar(page, 'educadora');
    await aba(page, 'avaliacoes');
    await page.click('[data-act=goto-avaliar][data-child=EDU-0001]');
    await expect(page.locator('.content')).toContainText('coleta bloqueada');
    await shot(page, '06-avaliacao-bloqueada');
    await page.click('[data-act=open-code][data-role=coordenacao]');
    await page.fill('#codeInput', '1234'); await page.click('[data-act=confirm-code]');
    await aba(page, 'administracao');
    await page.click('[data-act=registrar-consentimento][data-child=EDU-0001]');
    await aba(page, 'avaliacoes');
    await page.click('[data-act=goto-avaliar][data-child=EDU-0001]');
    await expect(page.locator('.content')).not.toContainText('coleta bloqueada');
    await expect(page.locator('[data-act=aval-modo][data-v=rapido]')).toBeVisible();
    const log = (await db(page)).auditLog.map(l => l.texto).join(' | ');
    expect(log).toContain('registrou consentimento');
  });

  test('T06 · Avaliação inicial (modo rápido) + sinalização para a psicóloga; depois vira check-in', async ({ page }) => {
    await abrir(page);
    await entrar(page, 'educadora');
    await aba(page, 'avaliacoes');
    await page.click('[data-act=goto-avaliar][data-child=EDU-0003]');
    await expect(page.locator('.content')).toContainText('Avaliação inicial');
    await page.click('[data-act=aval-modo][data-v=rapido]');
    await expect(page.locator('[data-act=aval-submit]')).toBeDisabled();
    for (const k of ['ajudou', 'conflito', 'resolveu', 'participou', 'intervencao']) {
      await page.click(`[data-act=aval-resp][data-k=${k}][data-v=${k === 'conflito' ? 'nao' : 'sim'}]`);
    }
    await page.check('[data-act=aval-atencao]');
    await expect(page.locator('[data-act=aval-submit]')).toBeEnabled();
    await shot(page, '07-avaliacao-preenchida');
    const encAntes = (await db(page)).encaminhamentos.length;
    await page.click('[data-act=aval-submit]');
    let d = await db(page);
    const av = d.avaliacoes.filter(a => a.childId === 'EDU-0003');
    expect(av).toHaveLength(1);
    expect(av[0].tipo).toBe('inicial');
    expect(Object.keys(av[0].respostas)).toHaveLength(5);
    expect(d.encaminhamentos.length).toBe(encAntes + 1);
    // Segunda avaliação do mesmo vínculo é registrada como check-in (modo completo, 16 frases).
    await page.click('[data-act=goto-avaliar][data-child=EDU-0003]');
    await expect(page.locator('.content')).toContainText('Check-in');
    await page.click('[data-act=aval-modo][data-v=completo]');
    const itens = await page.locator('.dbritem').count();
    expect(itens).toBe(16);
    for (let i = 0; i < itens; i++) await page.locator('.dbritem').nth(i).locator('button').first().click();
    await page.click('[data-act=aval-submit]');
    d = await db(page);
    expect(d.avaliacoes.filter(a => a.childId === 'EDU-0003').map(a => a.tipo)).toEqual(['inicial', 'checkin']);
  });

  test('T07 · Registro de observação: alerta de outro nome, envio para revisão', async ({ page }) => {
    await abrir(page);
    await entrar(page, 'educadora');
    await page.click('[data-act=goto-novoregistro]');
    await page.click('[data-act=novo-pick-child][data-child=EDU-0003]');
    await page.click('[data-act=novo-metodo][data-v=escrito]');
    const txt = page.locator('textarea[data-act=novo-texto]');
    await txt.pressSequentially('Brincou com o Benício e ');
    await expect(page.locator('#novoWarn')).toContainText('cita outro nome próprio');
    await shot(page, '08-registro-alerta-nome');
    await txt.fill('Montou o quebra-cabeça até o fim e mostrou ao grupo.');
    await expect(page.locator('#novoWarn')).toBeEmpty();
    // Regressão: o botão habilita enquanto digita e o 1º clique já envia (antes o clique era perdido).
    await expect(page.locator('[data-act=novo-submit]')).toBeEnabled();
    await page.click('[data-act=novo-submit]');
    await expect(page.locator('.tb-title')).toHaveText('Registros da equipe');
    const r = (await db(page)).registros.find(x => x.texto.startsWith('Montou o quebra-cabeça'));
    expect(r.status).toBe('aguardando');
    expect(r.childId).toBe('EDU-0003');
    // Regressão: registro feito hoje não pode aparecer como "registrado X dias depois".
    await expect(page.locator('.srow', { hasText: 'Montou o quebra-cabeça' })).not.toContainText('depois');
    await shot(page, '09-registro-enviado');
  });

  test('T08 · Revisão humana: coordenação valida um registro e outro é devolvido e corrigido', async ({ page }) => {
    await abrir(page);
    await entrar(page, 'coordenacao');
    await aba(page, 'registros');
    await page.click('[data-act=reg-filtro][data-f=andamento]');
    await shot(page, '10-fila-revisao');
    const cardAlicia = page.locator('.srow', { hasText: 'Repetiu a montagem' });
    await cardAlicia.locator('[data-act=validar-registro]').click();
    let d = await db(page);
    expect(d.registros.find(r => r.id === 'r1').status).toBe('validado');
    page.once('dialog', dl => dl.accept('Descrever só o comportamento observado.'));
    await page.locator('.srow', { hasText: 'Leu o enunciado' }).locator('[data-act=devolver-registro]').click();
    d = await db(page);
    expect(d.registros.find(r => r.id === 'r9').status).toBe('devolvido');
    await sair(page);
    await entrar(page, 'educadora');
    await aba(page, 'registros');
    await page.click('[data-act=reg-filtro][data-f=devolvidos]');
    await expect(page.locator('.content')).toContainText('Descrever só o comportamento observado.');
    await shot(page, '11-registro-devolvido');
    page.once('dialog', dl => dl.accept('Leu o enunciado sozinha, errou a conta e refez sem pedir ajuda.'));
    await page.locator('.srow', { hasText: 'Leu o enunciado' }).locator('[data-act=edit-registro]').click();
    d = await db(page);
    expect(d.registros.find(r => r.id === 'r9').status).toBe('aguardando');
    const log = d.auditLog.map(l => l.texto).join(' | ');
    expect(log).toContain('validou o registro de Alícia Almeida');
    expect(log).toContain('devolveu o registro de Nina Souza');
    expect(log).toContain('corrigiu e reenviou o registro de Nina Souza');
  });

  test('T09 · Intervenção percorre proposta → acompanhamento → validação', async ({ page }) => {
    await abrir(page);
    await entrar(page, 'coordenacao');
    await aba(page, 'educandos');
    await page.click('[data-act=goto-child][data-child=EDU-0002]');
    await page.click('[data-act=goto-propor][data-child=EDU-0002]');
    await page.click('[data-act=propor-acao][data-v=outra]');
    await expect(page.locator('[data-act=propor-submit]')).toBeDisabled();
    await page.fill('[data-act=propor-acao-livre]', 'Convidar para ajudar a montar a roda.');
    await page.fill('[data-act=propor-objetivo-livre]', 'Dar protagonismo no início do encontro.');
    await expect(page.locator('[data-act=propor-submit]')).toBeEnabled();
    await shot(page, '12-intervencao-proposta');
    await page.click('[data-act=propor-submit]');
    let iv = (await db(page)).intervencoes.find(i => i.childId === 'EDU-0002');
    expect(iv.estagio).toBe(1);
    await aba(page, 'intervencoes');
    const card = page.locator('.card', { hasText: 'Convidar para ajudar a montar a roda.' });
    await card.locator('[data-act=iv-avancar]').click();
    page.once('dialog', dl => dl.accept('Abriu a roda nos dois encontros seguintes.'));
    await page.locator('.card', { hasText: 'Convidar para ajudar a montar a roda.' }).locator('[data-act=iv-registrar]').click();
    iv = (await db(page)).intervencoes.find(i => i.childId === 'EDU-0002');
    expect(iv.estagio).toBe(3);
    expect(iv.resultado).toContain('dois encontros');
    await expect(page.locator('.card', { hasText: 'Convidar para ajudar a montar a roda.' })).toContainText('Concluída');
    await shot(page, '13-intervencao-concluida');
  });

  test('T10 · Psicóloga revisa encaminhamento, abre caso e registra atividade', async ({ page }) => {
    await abrir(page);
    await entrar(page, 'psicologa');
    await aba(page, 'encaminhamentos');
    await shot(page, '14-encaminhamentos');
    await page.locator('.roster', { hasText: 'Cauã Cardoso' }).locator('[data-act=enc-revisar]').click();
    expect((await db(page)).encaminhamentos.find(e => e.id === 'en2').status).toBe('revisado');
    await aba(page, 'educandos');
    await page.click('[data-act=goto-child][data-child=EDU-0003]');
    await page.click('[data-act=goto-caso-novo]');
    await page.click('[data-act=caso-tipo-toggle][data-t=Emocional]');
    await page.fill('[data-act=caso-objetivo]', 'Apoiar a expressão de emoções no grupo.');
    await page.click('[data-act=caso-abrir-submit]');
    await page.click('[data-act=goto-caso-atividade]');
    await page.selectOption('[data-act=at-tipo]', 'Escuta');
    await page.fill('[data-act=at-evolucao]', 'Falou sobre a rotina da semana com tranquilidade.');
    await page.click('[data-act=caso-atividade-submit]');
    const caso = (await db(page)).casos.find(c => c.childId === 'EDU-0003');
    expect(caso.status).toBe('ativo');
    expect(caso.atividades).toHaveLength(1);
    await expect(page.locator('.content')).toContainText('Falou sobre a rotina');
    await shot(page, '15-caso-atividade');
  });

  test('T11 · Trajetória individual consolida avaliações, registros e intervenções', async ({ page }) => {
    await abrir(page);
    await entrar(page, 'coordenacao');
    await aba(page, 'educandos');
    await page.click('[data-act=goto-child][data-child=EDU-0005]');
    const c = page.locator('.content');
    await expect(c).toContainText('Leitura da trajetória');
    await expect(c).toContainText('frase(s) passaram de "não" para "sim"');
    await expect(c).toContainText('Avaliação inicial');
    await expect(c).toContainText('Check-in');
    await shot(page, '16-trajetoria');
  });

  test('T12 · Relatório de programa mostra ficha técnica e exclusão de quem não tem consentimento', async ({ page }) => {
    await abrir(page);
    await entrar(page, 'coordenacao');
    await aba(page, 'relatorio');
    await expect(page.locator('.content')).toContainText('Ficha técnica');
    await expect(page.locator('.content')).toContainText('sem consentimento ficam de fora');
    await shot(page, '17-relatorio');
  });
});

test.describe('3. Regras de negócio e dados', () => {
  test('T13 · Modelo de dados e massa sintética estão íntegros', async ({ page }) => {
    await abrir(page);
    const d = await db(page);
    const ids = new Set(d.children.map(c => c.id));
    expect(d.children.length).toBeGreaterThanOrEqual(18);
    expect(ids.size).toBe(d.children.length);                       // códigos únicos
    for (const c of d.children) expect(c.id).toMatch(/^EDU-\d{4}$/);
    const turmas = await page.evaluate(() => Object.keys(TURMAS));
    for (const t of turmas) expect(d.children.some(c => c.turmas.includes(t))).toBe(true); // toda turma tem educandos
    for (const col of ['avaliacoes', 'registros', 'intervencoes', 'encaminhamentos', 'casos'])
      for (const x of d[col]) expect(ids.has(x.childId), `${col}.${x.id} aponta para educando existente`).toBe(true);
    const itens = await page.evaluate(() => ALL_ITEMS.length);
    expect(itens).toBe(16);
    expect(await page.evaluate(() => QUICK_ITEMS.length)).toBe(5);
    for (const a of d.avaliacoes) for (const v of Object.values(a.respostas)) expect(['sim', 'nao', 'nao_observei']).toContain(v);
  });

  test('T14 · Frequência considera falta justificada e sinaliza recorrência', async ({ page }) => {
    await abrir(page);
    const r = await page.evaluate(() => {
      const k = { freq: { p: 6, j: 3, t: 12 } };
      return { f: freqConsiderada(k), b: freqBruta(k), q: freqQual(k), rec: faltaRecorrente(k), q2: freqQual({ freq: { p: 9, j: 0, t: 10 } }) };
    });
    expect(r.f).toBeCloseTo(0.75); expect(r.b).toBeCloseTo(0.5);
    expect(r.q).toBe('boa'); expect(r.rec).toBe(true); expect(r.q2).toBe('boa');
    const st = await page.evaluate(() => stats());
    const d = await db(page);
    expect(st.criancasUnicas).toBe(d.children.length);
    expect(st.semConsentimento).toBe(d.children.filter(c => !c.consentimento).length);
    expect(st.aguardando).toBe(d.registros.filter(x => x.status === 'aguardando').length);
  });
});

test.describe('4. Estabilidade', () => {
  test('T17 · Fora do painel, toda aba tem "Voltar" que leva ao painel do perfil', async ({ page }) => {
    await abrir(page);
    for (const perfil of ['educadora', 'coordenacao', 'psicologa']) {
      await entrar(page, perfil);
      const home = await page.locator('.tb-title').textContent();
      await expect(page.locator('[data-act=tab-back]')).toHaveCount(0);
      const tabs = await page.evaluate(p => allTabsFor(p).map(t => t[0]).slice(1), perfil);
      for (const tab of tabs) {
        await page.evaluate(t => { S.tab = t; S.sub = null; S.ctx = {}; render(); }, tab);
        await expect(page.locator('[data-act=tab-back]'), `Voltar em ${perfil}/${tab}`).toHaveCount(1);
        await page.click('[data-act=tab-back]');
        await expect(page.locator('.tb-title')).toHaveText(home);
      }
      // A partir dos botões do painel (o caminho relatado)
      const btn = page.locator('.content [data-act=nav]').first();
      await btn.click();
      if (perfil === 'coordenacao') await shot(page, '18-voltar-ao-painel');
      await page.click('[data-act=tab-back]');
      await expect(page.locator('.tb-title')).toHaveText(home);
      if (perfil === 'educadora') await page.evaluate(() => { S.role = null; render(); });
      else await sair(page);
    }
  });

  test('T15 · Dados persistem após recarregar e podem ser restaurados', async ({ page }) => {
    await abrir(page);
    await entrar(page, 'educadora');
    await page.click('[data-act=goto-novoregistro]');
    await page.click('[data-act=novo-pick-child][data-child=EDU-0004]');
    await page.click('[data-act=novo-metodo][data-v=escrito]');
    await page.fill('[data-act=novo-texto]', 'Registro de teste de persistência no navegador.');
    await page.click('[data-act=novo-submit]');
    const antes = (await db(page)).registros.length;
    await page.reload();
    expect((await db(page)).registros.length).toBe(antes);
    page.once('dialog', dl => dl.accept());
    await page.click('[data-act=reset-demo]');
    const d = await db(page);
    expect(d.registros.some(r => r.texto.includes('persistência'))).toBe(false);
    expect(d.registros).toHaveLength(9);
  });

  test('T16 · Todas as telas de todos os perfis abrem sem erro e sem rolagem lateral', async ({ page }) => {
    await abrir(page);
    for (const [w, h] of [[375, 812], [1280, 800]]) {
      await page.setViewportSize({ width: w, height: h });
      const problemas = await page.evaluate(() => {
        const out = [];
        const over = () => document.documentElement.scrollWidth > window.innerWidth + 1;
        for (const role of Object.keys(NAV)) {
          S.role = role; S.sub = null; S.ctx = {};
          for (const [tab] of allTabsFor(role)) {
            S.tab = tab; S.sub = null; S.ctx = {}; render();
            if (over()) out.push(`${role}/${tab}`);
          }
          for (const c of DB.children) {
            S.sub = 'child'; S.ctx = { childId: c.id }; render(); if (over()) out.push(`${role}/child/${c.id}`);
            S.sub = 'avaliar'; render(); if (over()) out.push(`${role}/avaliar/${c.id}`);
          }
        }
        S.role = null; S.sub = null; S.ctx = {}; render();
        return out;
      });
      expect(problemas, `telas com rolagem lateral em ${w}px`).toEqual([]);
    }
  });
});

test.describe('5. Registro do grupo (esfera coletiva) · v1.1.0', () => {
  test('T18 · Psicóloga registra encontro coletivo de Começos que Protegem; outros perfis não veem o conteúdo', async ({ page }) => {
    await abrir(page);
    await entrar(page, 'psicologa');
    await aba(page, 'grupos');
    await expect(page.locator('.tb-title')).toHaveText('Encontros em grupo');
    const opcoes = await page.locator('[data-act=pres-turma] option').allTextContents();
    expect(opcoes).toEqual(['Vivência Terapêutica', 'Começos que Protegem']); // só os grupos que ela conduz
    await page.selectOption('[data-act=pres-turma]', 'cp');
    await page.click('[data-act=grp-ativ][data-v="Masculinidades"]');
    await page.click('[data-act=grp-engaj][data-v=maioria]');
    await page.click('[data-act=grp-mov][data-v="Escuta entre os participantes"]');
    // Nome de criança no texto coletivo gera aviso
    await page.fill('[data-act=grupo-obs]', 'O Elias puxou a conversa.');
    await expect(page.locator('#grupoWarn')).toContainText('cita Elias');
    await page.fill('[data-act=grupo-obs]', 'O grupo falou sobre pedir ajuda quando está com raiva.');
    await expect(page.locator('#grupoWarn')).toHaveText('');
    await page.click('[data-act=grp-salvar]');
    await expect(page.locator('.content')).toContainText('Registro do grupo salvo.');
    const hoje = await page.evaluate(() => HOJE);
    const g = (await db(page)).presencas['cp_' + hoje].grupo;
    expect(g).toMatchObject({ atividades: ['Masculinidades'], engaj: 'maioria', movimentos: ['Escuta entre os participantes'], autor: 'Dra. Helena' });
    expect(g.obs).toContain('pedir ajuda');
    expect((await db(page)).auditLog.some(l => l.texto.includes('Começos que Protegem'))).toBe(true);
    await shot(page, '19-grupo-psicologa');
    // A Equipe vê só que o encontro foi registrado, sem o conteúdo
    await sair(page);
    await entrar(page, 'educadora');
    await aba(page, 'presenca');
    await page.selectOption('[data-act=pres-turma]', 'cp');
    await expect(page.locator('.content')).toContainText('Registrado pela psicóloga');
    await expect(page.locator('.content')).not.toContainText('pedir ajuda');
    await expect(page.locator('[data-act=grupo-obs]')).toHaveCount(0);
  });

  test('T19 · Equipe registra o grupo de outras atividades com observação geral, que sobrevive ao fechamento', async ({ page }) => {
    await abrir(page);
    await entrar(page, 'educadora');
    await aba(page, 'presenca');
    await page.click('[data-act=pres-clima][data-v=tranquilo]');
    await page.click('[data-act=grp-ativ][data-v="Oficina e arte"]');
    await page.click('[data-act=grp-ativ][data-v="Roda de conversa"]');
    await page.click('[data-act=grp-engaj][data-v=parte]');
    await page.fill('[data-act=grupo-obs]', 'Turma animada com a oficina de mandalas.');
    await page.click('[data-act=pres-marcar-todos]'); // re-render não apaga o texto digitado
    await expect(page.locator('[data-act=grupo-obs]')).toHaveValue('Turma animada com a oficina de mandalas.');
    await page.click('[data-act=pres-fechar]');      // fechar a presença grava a observação junto
    const hoje = await page.evaluate(() => HOJE);
    const rec = (await db(page)).presencas['lab_' + hoje];
    expect(rec.fechado).toBe(true);
    expect(rec.clima).toBe('tranquilo');
    expect(rec.grupo).toMatchObject({ atividades: ['Oficina e arte', 'Roda de conversa'], engaj: 'parte', autor: 'Equipe' });
    expect(rec.grupo.obs).toContain('mandalas');
    await page.locator('[data-gblock=lab]').scrollIntoViewIfNeeded();
    await shot(page, '20-grupo-equipe');
  });
});

test.describe('6. Relatório básico · v1.2.0', () => {
  test('T20 · Relatório básico mostra participação, o que foi trabalhado e evolução agregada só com base mínima', async ({ page }) => {
    await abrir(page);
    await entrar(page, 'coordenacao');
    await aba(page, 'relatorio');
    const c = page.locator('.content');
    await expect(c).toContainText('Relatório básico · ciclo 2026');
    await expect(c).toContainText('Crianças atendidas');
    await expect(c).toContainText('Roda de conversa · 1');               // vem do registro do grupo
    const ev = await page.evaluate(() => evolucaoPrograma('lab'));
    expect(ev.pares).toBeGreaterThanOrEqual(5);
    expect(ev.totalAv).toBeGreaterThan(ev.totalRe);
    await expect(page.locator('[data-rep=evolucao]')).toBeVisible();
    await expect(page.locator('#repTexto')).toContainText(`${ev.totalAv} avanços e ${ev.totalRe} recuos`);
    await expect(page.locator('#repTexto')).not.toContainText('Elias');  // agregado, sem nomes
    await page.locator('[data-rep=evolucao]').scrollIntoViewIfNeeded();
    await shot(page, '21-relatorio-basico');
    // Programa com menos de 5 pares: a evolução é suprimida
    await page.selectOption('[data-act=rep-turma]', 're');
    await expect(c).toContainText('Ainda sem base');
    await expect(page.locator('[data-rep=evolucao]')).toHaveCount(0);
    // Grupo da psicóloga: sem conteúdo dos encontros
    await page.selectOption('[data-act=rep-turma]', 'cp');
    await expect(c).toContainText('Grupo conduzido pela psicóloga');
    await expect(c).not.toContainText('Masculinidades');
  });
});

test.describe('7. Relatório completo · v1.2.0', () => {
  test('T21 · Coordenação gera o relatório completo: todos os programas, fluxo do dado, evolução e próximos passos, sem nomes', async ({ page }) => {
    await abrir(page);
    await entrar(page, 'coordenacao');
    await page.click('[data-act=goto-relcompleto]');               // botão no painel da coordenação
    await expect(page.locator('.tb-title')).toHaveText('Relatório completo');
    const c = page.locator('.content');
    await expect(c).toContainText('Relatório do ciclo 2026');
    await expect(c).toContainText('Como o dado vira evidência');
    const nProg = await page.evaluate(() => Object.keys(TURMAS).length);
    await expect(page.locator('.rc-pc')).toHaveCount(nProg);       // um card por programa
    await expect(page.locator('[data-rc=evolucao]')).toBeVisible(); // Laboratório tem base mínima
    await expect(c).toContainText('Para o próximo relatório ficar mais completo');
    await expect(c).toContainText('Não é avaliação da equipe');
    const nomes = await page.evaluate(() => DB.children.map(k => k.nome));
    const texto = await c.innerText();
    for (const n of nomes) expect(texto).not.toContain(n);         // nenhuma criança identificada
    await expect(page.locator('[data-prog=cp]')).not.toContainText('Masculinidades'); // conteúdo da psicóloga protegido
    expect(await page.evaluate(() => document.documentElement.scrollWidth > innerWidth + 1)).toBe(false);
    await shot(page, '22-relatorio-completo');
    await page.click('[data-act=rep-copiar]');
    await expect(c).toContainText('Texto copiado.');
    // Também abre pela aba Relatório, e "Voltar" sai do relatório
    await page.click('[data-act=sub-back]');
    await aba(page, 'relatorio');
    await page.click('[data-act=goto-relcompleto]');
    await expect(page.locator('.tb-title')).toHaveText('Relatório completo');
  });
});
