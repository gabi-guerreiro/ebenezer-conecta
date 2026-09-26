// Configuração dos testes ponta a ponta (E2E) do Ebenézer Conecta.
// Sobe um servidor estático local (o mesmo tipo de hospedagem do GitHub Pages)
// e roda os testes num Chromium com viewport de celular.
const { defineConfig } = require('@playwright/test');

module.exports = defineConfig({
  testDir: './tests',
  timeout: 30_000,
  fullyParallel: false,
  workers: 1,
  retries: 0,
  reporter: [
    ['list'],
    ['json', { outputFile: 'docs/testes/resultado-testes.json' }],
    ['html', { outputFolder: 'docs/testes/relatorio-html', open: 'never' }],
  ],
  use: {
    baseURL: 'http://127.0.0.1:4173',
    viewport: { width: 390, height: 844 },
    locale: 'pt-BR',
    timezoneId: 'America/Sao_Paulo',
    screenshot: 'only-on-failure',
    trace: 'retain-on-failure',
  },
  webServer: {
    command: 'python3 -m http.server 4173 --bind 127.0.0.1',
    url: 'http://127.0.0.1:4173/index.html',
    reuseExistingServer: true,
    stdout: 'ignore',
    stderr: 'ignore',
  },
});
