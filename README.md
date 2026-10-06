# Ebenézer Conecta — MVP

Plataforma de evidência socioemocional do **Instituto Social Ebenézer** (Jardim Ângela, São Paulo). Com ela, a equipe registra presença, avaliações e observações das crianças; a coordenação revisa e transforma isso em evidência de impacto; e a psicóloga recebe os sinalizadores e mantém o caso clínico, com acesso separado.

> **Protótipo com dados 100% fictícios.** Nenhum nome, data ou telefone corresponde a pessoas reais.

**Acesse:** https://gabi-guerreiro.github.io/ebenezer-conecta/

| Documento de handover | Onde está |
|---|---|
| Vídeo demonstrativo narrado (2 min 37 s) | [`docs/video/demo-ebenezer-conecta.mp4`](docs/video/demo-ebenezer-conecta.mp4) |
| Registro do modelo de dados | [`docs/modelo-de-dados.md`](docs/modelo-de-dados.md) |
| Instruções de instalação e acesso | nesta página, abaixo |
| Evidências dos testes | [`docs/testes/README.md`](docs/testes/README.md) · [página de evidências](https://gabi-guerreiro.github.io/ebenezer-conecta/evidencias.html) |
| Principais decisões técnicas | [`docs/decisoes-tecnicas.md`](docs/decisoes-tecnicas.md) |

---

## 1. Acesso (sem instalar nada)

Abra o link acima no celular ou no computador e escolha um perfil:

| Perfil | Como entrar | O que faz |
|---|---|---|
| **Equipe** | sem senha | Lança presença, faz avaliações, registra observações e acompanha intervenções |
| **Coordenação Pedagógica** | código **1234** (ou "biometria simulada") | Revisa registros, gerencia consentimento, propõe e valida intervenções, vê relatório e governança |
| **Psicóloga** | código **5678** | Recebe encaminhamentos, mantém o caso clínico, edita as frases de observação |

Os códigos são de demonstração e aparecem na própria tela. Sair: botão **Sair** no topo (Coordenação e Psicóloga).

**Dica para apresentações:** na tela inicial (ou em Governança), o botão **Restaurar dados de demonstração** apaga os lançamentos daquele navegador e volta à carga inicial.

## 2. Fluxo principal

1. **Presença:** a Equipe marca todos presentes, ajusta faltas e justificadas e fecha o lançamento.
2. **Avaliação (DBR):** para cada educando **com consentimento**, modo rápido (5 frases) ou completo (16), com resposta sim, não ou não observei. A 1ª avaliação é a inicial; as seguintes são check-ins. Marcar "atenção da psicóloga" gera um encaminhamento.
3. **Observação:** a Equipe descreve o que a criança fez. O registro vai para a fila da coordenação.
4. **Revisão humana:** a Coordenação **valida** ou **devolve** com motivo. A Equipe corrige e reenvia.
5. **Intervenção:** proposta → acompanhamento → validação do resultado.
6. **Registro do grupo:** na tela de Presença, a Equipe registra o encontro como um todo: atividade realizada, participação do grupo e uma observação geral opcional. Na aba **Grupos**, a Psicóloga registra os encontros coletivos que conduz (Vivência Terapêutica e Começos que Protegem): tema trabalhado, participação, movimentos do grupo e observação. Sem nomes de crianças; os outros perfis veem só que o encontro foi registrado.
7. **Trajetória:** tudo o que foi registrado sobre a criança, em linha do tempo, com leitura por dimensão.
8. **Psicóloga:** revisa encaminhamentos e registra atividades do caso clínico (confidencial).
9. **Relatório básico:** por programa, agregado e sem nomes: crianças atendidas, frequência, encontros com registro do grupo, o que foi trabalhado e os primeiros sinais de evolução (avanços e recuos por dimensão entre a avaliação inicial e a mais recente). A evolução só aparece com pelo menos 5 crianças com duas avaliações. Gera um texto pronto para apoiadores.
10. **Relatório completo (Coordenação):** o botão "Gerar relatório completo", no painel e na aba Relatório, consolida todos os programas num painel: números do ciclo, como o dado vira evidência (presença → avaliação → observação e grupo → revisão → evidência), um card por programa, a evolução onde já há base, o trabalho da equipe com conquistas e o que falta para o próximo relatório, texto para apoiadores e ficha técnica. Agregado e sem nomes; pode ser impresso ou salvo em PDF.
11. **Governança:** ficha técnica de cobertura, consentimento e trilha de auditoria.

## 3. Instalação (para rodar ou alterar)

**Requisitos:** um navegador moderno. Para rodar os testes: Node.js 18+ e Python 3.

```bash
git clone https://github.com/gabi-guerreiro/ebenezer-conecta.git
cd ebenezer-conecta
npm start            # abre em http://localhost:4173
```

O app é um único arquivo (`index.html`). Também dá para simplesmente dar dois cliques no arquivo e abrir no navegador.

**Testes automatizados:**

```bash
npm install
npx playwright install chromium   # só na primeira vez
npm test                          # roda os 21 testes (~1 min)
npm run test:report               # abre o relatório HTML
npm run video                     # regrava as imagens do vídeo, sem narração (precisa de ffmpeg)
```

**Publicar uma nova versão no GitHub Pages:** faça o commit das alterações na branch `main`. O Pages atualiza sozinho em 1 ou 2 minutos (Settings → Pages → Branch `main`, pasta `/ (root)`).

## 4. Como operar e manter

| Tarefa | Onde mexer |
|---|---|
| Trocar as frases da avaliação | Perfil Psicóloga → Mais → Frases de observação |
| Mudar turmas, educandos ou dados de demonstração | `index.html`, constantes `TURMAS`, `CHILDREN_SEED` e função `seedDB()`. Depois de mudar a estrutura, aumente a versão em `LS_KEY`. |
| Ajustar limiares (75% de frequência etc.) | Funções `freqQual`, `faltaRecorrente`, `painelSemaforo` e `dimStatus` |
| Mudar os códigos de acesso | Constante `USERS` |

**Limites conhecidos do MVP (leia antes de usar com dados reais):**

- Os dados ficam **só no navegador** de cada aparelho. Não há sincronização entre pessoas.
- Os códigos de acesso **não são segurança real**.
- A exportação de arquivo e o ditado por voz são simulados.

**Próximo passo recomendado para produção:** trocar o `localStorage` por um backend com autenticação individual e regras de acesso por perfil (por exemplo, Supabase ou Firebase), mantendo o mesmo modelo de dados; e formalizar o termo de consentimento LGPD com os responsáveis.

## 5. Estrutura do repositório

```
index.html                    aplicação completa (HTML + CSS + JS)
evidencias.html               página de evidências da entrega
docs/
  modelo-de-dados.md          ERD + dicionário + regras + massa sintética
  decisoes-tecnicas.md        decisões técnicas e defeitos corrigidos
  testes/README.md            plano, casos e resultado dos testes
  testes/relatorio-html/      relatório do Playwright
  testes/resultado-testes.json
  evidencias/*.png            capturas de tela de cada etapa testada
  video/demo-ebenezer-conecta.mp4
tests/fluxo-principal.spec.js testes E2E
demo/gravar-video.js          script que grava o vídeo
playwright.config.js · package.json
```

## Histórico de versões

| Versão | O que mudou |
|---|---|
| 1.2.0 | Relatório completo da coordenação (todos os programas num painel, com fluxo do dado, evolução, conquistas da equipe e próximos passos; imprimir ou salvar PDF), teste T21. Relatório básico de programa (participação, o que foi trabalhado, evolução agregada com base mínima de 5 crianças e texto para apoiadores), teste T20. Correção B10: data de registro feita depois das 21h aparecia como "registrado dias depois". |
| 1.1.0 | Registro do grupo (esfera coletiva): aba **Grupos** da psicóloga para Vivência Terapêutica e o novo programa Começos que Protegem; na Presença, a Equipe registra atividade, participação e observação geral do encontro. Testes T18 e T19. |
| 1.0.1 | Botão "Voltar" em todas as abas fora do painel (T17). |
| 1.0.0 | MVP com os três perfis e 17 testes E2E. |

## Créditos

MBA Inteli, Grupo 5. Projeto desenvolvido com o Instituto Social Ebenézer.
