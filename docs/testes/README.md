# Evidências de testes

**Resultado da última execução: 21 de 21 testes aprovados (0 falhas, 0 instáveis), em cerca de 72 s.**

- Relatório interativo: [`relatorio-html/index.html`](relatorio-html/index.html). Abra no navegador ou rode `npm run test:report`.
- Resultado em formato de máquina: [`resultado-testes.json`](resultado-testes.json).
- Capturas de tela de cada etapa: [`../evidencias/`](../evidencias/).
- Código dos testes: [`../../tests/fluxo-principal.spec.js`](../../tests/fluxo-principal.spec.js).

## Como foi testado

- **Ferramenta:** Playwright 1.56 + Chromium, com tela de celular (390×844), idioma pt-BR e fuso America/Sao_Paulo.
- **Isolamento:** cada teste começa com o navegador limpo, carregando os dados de demonstração.
- **Critério extra de estabilidade:** qualquer erro de JavaScript durante um teste reprova esse teste.
- **Servidor:** estático (`python3 -m http.server`), igual à hospedagem do GitHub Pages.

## Casos de teste

| ID | Grupo | O que valida | Resultado |
|---|---|---|---|
| T01 | Acesso | Tela inicial com 3 perfis; Equipe entra sem senha | ✅ |
| T02 | Acesso | Código errado é recusado; código correto libera a Coordenação | ✅ |
| T03 | Acesso | Segregação: encaminhamentos, caso clínico e contato do responsável aparecem só para a psicóloga | ✅ |
| T04 | Fluxo principal | Presença em lote, exceções, fechamento; só a coordenação reabre | ✅ |
| T05 | Fluxo principal | Avaliação bloqueada sem consentimento e liberada após o registro, com auditoria | ✅ |
| T06 | Fluxo principal | Avaliação inicial (5 frases) gera encaminhamento; a seguinte vira check-in (16 frases) | ✅ |
| T07 | Fluxo principal | Observação alerta nome de outra criança; o 1º clique envia; o registro fica "aguardando" | ✅ |
| T08 | Fluxo principal | Coordenação valida e devolve; a equipe corrige e o registro volta à fila; tudo na auditoria | ✅ |
| T09 | Fluxo principal | Intervenção: proposta → acompanhamento → validação do resultado | ✅ |
| T10 | Fluxo principal | Psicóloga revisa encaminhamento, abre caso e registra atividade | ✅ |
| T11 | Fluxo principal | Trajetória consolida avaliações, registros e leitura "não → sim" | ✅ |
| T12 | Fluxo principal | Relatório com ficha técnica e exclusão de quem não tem consentimento | ✅ |
| T13 | Dados | Integridade: códigos únicos, 5 programas povoados, chaves estrangeiras válidas, 16/5 frases, respostas válidas | ✅ |
| T14 | Regras | Frequência considerada, recorrência de falta justificada, contadores do painel | ✅ |
| T15 | Estabilidade | Dados persistem após recarregar; "Restaurar dados" volta à carga inicial | ✅ |
| T16 | Estabilidade | Todas as telas dos 3 perfis (inclusive as 18 trajetórias) sem erro e sem rolagem lateral em 375 px e 1280 px | ✅ |
| T17 | Estabilidade | Toda aba fora do painel tem "Voltar", que leva ao painel do perfil (Equipe, Coordenação e Psicóloga) | ✅ |
| T18 | Registro do grupo | Psicóloga registra o encontro coletivo de Começos que Protegem (tema, participação, movimentos, observação); aviso de nome de criança; a Equipe vê só que foi registrado | ✅ |
| T21 | Relatório completo | Botão no painel e na aba Relatório; um card por programa, fluxo do dado, evolução com base mínima, próximos passos; nenhum nome de criança; conteúdo da psicóloga protegido; sem rolagem lateral | ✅ |
| T20 | Relatório básico | Participação, o que foi trabalhado e evolução agregada com base mínima de 5 crianças; programa com base menor suprime a evolução; grupo da psicóloga não mostra conteúdo; texto para apoiadores sem nomes | ✅ |
| T19 | Registro do grupo | Equipe registra atividade, participação e observação geral; o texto sobrevive ao re-render e é gravado ao fechar a presença | ✅ |

## Defeitos encontrados e corrigidos

Os 10 defeitos (B1 a B10) achados nesta fase e as respectivas correções estão em [`../decisoes-tecnicas.md`](../decisoes-tecnicas.md#correções-feitas-durante-a-fase-de-testes). Os testes T02, T03, T07, T08, T13, T15, T16 e T17 funcionam como testes de regressão para eles.

## Como repetir os testes

```bash
npm install
npm test
```
