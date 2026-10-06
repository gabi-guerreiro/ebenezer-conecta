# Principais decisões técnicas

Registro no formato "decisão → por quê → consequência", para quem assumir a solução.

## DT-01 · Aplicação de arquivo único (HTML + CSS + JavaScript puro)

- **Decisão:** todo o app está em `index.html`, sem framework, sem etapa de build e sem dependências em tempo de execução.
- **Por quê:** o Instituto não tem equipe de TI. Um arquivo único pode ser hospedado de graça (GitHub Pages), aberto offline e alterado por qualquer pessoa com um editor de texto.
- **Consequência:** o código é organizado em seções comentadas (Dados, Render, Telas, Ações). Se o produto crescer, o caminho natural é migrar para componentes (React/Vue) mantendo o mesmo modelo de dados.

## DT-02 · Persistência no `localStorage` do navegador

- **Decisão:** os dados ficam salvos no próprio navegador de quem usa (chave `ebenezer-conecta-v7`).
- **Por quê:** o MVP valida o fluxo com dados sintéticos, sem o custo e o risco (LGPD) de manter dados reais de crianças num servidor.
- **Consequência:** cada aparelho tem sua própria base, e ninguém vê os lançamentos de outro. Antes de operar com dados reais é **obrigatório** trocar por um backend com autenticação (sugestão: Supabase/Firebase com regras por perfil), conforme o roteiro em `README.md`.

## DT-03 · Perfis com código de demonstração

- **Decisão:** Equipe entra sem senha; Coordenação (1234) e Psicóloga (5678) entram com código exibido na tela.
- **Por quê:** o objetivo é demonstrar a **segregação de acesso** (o que cada perfil vê), não a autenticação.
- **Consequência:** não é segurança real. Os testes T02 e T03 comprovam que a segregação funciona na interface.

## DT-04 · Privacidade por desenho

- **Decisão:** o app não coleta diagnóstico, saúde, situação familiar nem relato de violência nos registros da equipe. O áudio é só um gesto de ditado (nenhum arquivo é guardado). O encaminhamento para a psicóloga não tem motivo escrito, e o contato do responsável e o caso clínico aparecem só para ela.
- **Por quê:** proteção de dados de crianças (ECA/LGPD) e alinhamento às exigências do CRP para prontuário.
- **Consequência:** o campo de observação avisa quando o texto cita outra criança pelo nome.

## DT-05 · Regras calculadas por limiar, sem IA

- **Decisão:** rótulos como "boa frequência", "Avanço" e "sinal de atenção" são regras fixas e explicáveis (ver `modelo-de-dados.md`).
- **Por quê:** a coordenação precisa conseguir explicar qualquer número a financiadores e famílias.
- **Consequência:** os limiares podem ser ajustados nas funções `freqQual`, `dimStatus` e `painelSemaforo`.

## DT-06 · Revisão humana obrigatória

- **Decisão:** todo registro nasce "aguardando" e só vale depois de validado pela coordenação, com trilha de auditoria.
- **Por quê:** garantir a qualidade da evidência (descrever comportamento, não interpretar).
- **Consequência:** a fila de revisão é o principal indicador operacional do painel da coordenação.

## DT-07 · Testes ponta a ponta com Playwright

- **Decisão:** 21 testes automatizados simulam o usuário real (cliques e digitação) num Chromium com tela de celular.
- **Por quê:** o valor do MVP está no fluxo entre perfis, e testes de interface são o que prova isso.
- **Consequência:** `npm test` roda tudo em cerca de 1 minuto e gera um relatório HTML e as capturas de tela usadas como evidência.

## DT-09 · Registro do grupo na esfera coletiva (versão 1.1.0)

- **Decisão:** o encontro ganha um registro coletivo, guardado junto da presença (`presencas[turma_data].grupo`). A Equipe registra atividade realizada, participação e observação geral nos programas pedagógicos. A Psicóloga registra, na aba Grupos, os encontros que conduz (Vivência Terapêutica e Começos que Protegem): tema trabalhado, participação, movimentos do grupo e observação.
- **Por quê:** o clima de três opções não guardava o que aconteceu no encontro, e os grupos da psicóloga, entre eles o Começos que Protegem, não tinham nenhum registro estruturado.
- **Consequência:** o registro é coletivo e o app avisa quando o texto cita uma criança pelo nome. Nos grupos da psicóloga, os outros perfis veem só que o encontro foi registrado, sem o conteúdo. A observação digitada na Presença é gravada também ao fechar o lançamento, para não se perder (T18 e T19).

## DT-10 · Relatório básico antecipado, com base mínima (versão 1.2.0)

- **Decisão:** o relatório de programa deixa de ser só uma ficha técnica e passa a mostrar participação, o que foi trabalhado e os primeiros sinais de evolução, agregados, com um texto pronto para apoiadores.
- **Por quê:** feedback da banca: sem mostrar resultado, a solução resolve só parte do problema de prestar contas e captar. Esperar 6 a 12 meses pelo relatório completo deixava o Instituto sem nada para mostrar no piloto.
- **Consequência:** a evolução só aparece com pelo menos 5 crianças com duas avaliações, para não identificar ninguém e não tirar conclusão de base pequena. O texto sempre diz que é leitura preliminar, sem atribuição de causa (T20).
- **Relatório completo:** a coordenação gera, com um botão, um painel de todos os programas que mostra como o dado vira evidência e reconhece o trabalho da equipe (registros por mês, conquistas e próximos passos concretos), para estimular a continuidade dos registros. Os programas aparecem sempre na mesma ordem, sem ranking, e o relatório avisa que os indicadores não avaliam pessoas (T21).

## DT-08 · Mobile-first com navegação inferior

- **Decisão:** layout de até 480 px, barra inferior com até 6 itens e menu "Mais" para o resto.
- **Por quê:** a equipe lança dados no celular, durante ou logo após o encontro.
- **Consequência:** o teste T16 garante que nenhuma tela tem rolagem lateral em 375 px e em 1280 px.

## Correções feitas durante a fase de testes

| # | Problema encontrado | Correção |
|---|---|---|
| B1 | Ao digitar uma observação e tocar em "Enviar", o 1º toque era perdido: o botão só habilitava no blur e a tela era redesenhada. O mesmo ocorria no código de acesso e nos formulários de intervenção e caso. | Campos de texto passaram a atualizar o estado a cada tecla, sem redesenhar a tela (`LIVE`/`refreshGates`). Coberto pelos testes T02, T07, T09 e T10. |
| B2 | Um registro "devolvido" corrigido continuava como devolvido e nunca voltava à fila. Na aba Registros não havia botão para corrigi-lo. | Ao corrigir, o status volta para "aguardando" e a correção entra na auditoria (T08). |
| B3 | A data "de hoje" era fixa (09/09/2026), então registros novos apareciam como "registrado 17 dias depois". | Passou a usar a data do aparelho (`HOJE`) (T07). |
| B4 | A turma Primeira Infância não tinha educandos, o que deixava o semáforo sem dados. | A massa sintética foi ampliada para 18 educandos cobrindo as 4 turmas (T13). |
| B5 | A coordenação tinha 9 abas na barra inferior, com rótulos quebrados no celular. | As abas passaram para 5 + menu "Mais" (T16). |
| B6 | Uma falha do `localStorage` (modo privado) derrubava o app, e não havia como voltar aos dados iniciais. | `try/catch` e validação na leitura, mais o botão "Restaurar dados de demonstração" (T15). |
| B7 | O texto do cabeçalho da trajetória saía sem estilo (fonte grande). | Estilo `.meta` aplicado também aos cartões. |
| B8 | Ao abrir uma tela nova, ela aparecia na rolagem da anterior (por exemplo, a trajetória já rolada até o meio). | A página volta ao topo a cada troca de tela (T03). |
| B10 | Registro feito depois das 21h (horário de Brasília) aparecia como "registrado 0 dias depois", porque a data de criação era lida em UTC. | Data de criação lida no fuso do aparelho; versão 1.2.0 (T07). |
| B9 | Nos perfis Coordenação e Psicóloga, ao abrir uma aba pelos botões do painel, não havia como voltar ao painel. | Toda aba fora do painel mostra "Voltar", que leva ao painel do perfil; versão 1.0.1 (T17). |
