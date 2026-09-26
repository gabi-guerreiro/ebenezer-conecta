# Modelo de dados — Ebenézer Conecta v1.0

Todo o estado da aplicação é um único objeto `DB`, serializado em JSON no `localStorage` do navegador (chave `ebenezer-conecta-v7`). Ele é criado pela função `seedDB()` em `index.html` e salvo por `saveDB()` a cada ação.

## Diagrama entidade-relacionamento

```mermaid
erDiagram
    TURMA ||--o{ VINCULO : "tem"
    EDUCANDO ||--o{ VINCULO : "participa de"
    EDUCANDO ||--|| RESPONSAVEL : "tem"
    EDUCANDO ||--o{ AVALIACAO : "recebe"
    EDUCANDO ||--o{ REGISTRO : "é descrito em"
    EDUCANDO ||--o{ INTERVENCAO : "é alvo de"
    EDUCANDO ||--o{ ENCAMINHAMENTO : "é sinalizado em"
    EDUCANDO ||--o| CASO_CLINICO : "pode ter"
    CASO_CLINICO ||--o{ ATIVIDADE_CLINICA : "registra"
    TURMA ||--o{ PRESENCA_ENCONTRO : "tem"
    PRESENCA_ENCONTRO ||--o{ MARCACAO : "contém"
    FRASE ||--o{ AVALIACAO : "é respondida em"
    DIMENSAO ||--o{ FRASE : "agrupa"
    AVALIACAO |o--o| ENCAMINHAMENTO : "gera (se atenção)"

    EDUCANDO {
        string id PK "EDU-0001"
        string nome
        int idade
        date nasc
        string[] turmas FK
        bool consentimento
        date entrada
        obj freq "p, j, t"
    }
    RESPONSAVEL {
        string nome
        string rel "Mãe, Pai, Avó..."
        string contato "visível só à psicóloga"
    }
    TURMA {
        string id PK "lab, re, pi, vt"
        string nome
        bool presencaOnly
    }
    AVALIACAO {
        string id PK
        string childId FK
        string turmaId FK
        date data
        enum tipo "inicial | checkin"
        enum modo "rapido | completo"
        string autor
        map respostas "frase -> sim|nao|nao_observei"
        bool atencaoPsicologa
    }
    REGISTRO {
        string id PK
        string childId FK
        string turmaId FK
        date data
        timestamp criadoEm
        enum metodo "ditado | escrito"
        string texto
        enum status "aguardando | validado | devolvido"
        string motivo
    }
    INTERVENCAO {
        string id PK
        string childId FK
        string acao
        string objetivo
        int estagio "1 proposta, 2 acompanhamento, 3 validada"
        string resultado
    }
    ENCAMINHAMENTO {
        string id PK
        string childId FK
        date data
        enum status "pendente | revisado"
    }
    CASO_CLINICO {
        string id PK
        string childId FK
        string[] tipos
        string objetivo
        enum status "ativo | encerrado"
    }
    PRESENCA_ENCONTRO {
        string chave PK "turmaId_data"
        enum clima "tranquilo | neutro | agitado"
        bool fechado
    }
```

## Dicionário das coleções

| Coleção (`DB.*`) | O que guarda | Campos principais | Regras |
|---|---|---|---|
| `children` | Cadastro único do educando | `id` (EDU-xxxx), `nome`, `idade`, `nasc`, `resp{nome,rel,contato}`, `turmas[]`, `consentimento`, `entrada`, `freq{p,j,t}` | Uma criança em duas turmas conta **uma vez** (vínculos são o par criança×turma). Sem `consentimento`, avaliação é bloqueada e a criança sai do agregado do relatório. |
| `avaliacoes` | Direct Behavior Rating (DBR) | `childId`, `turmaId`, `data`, `tipo`, `modo`, `respostas{}`, `atencaoPsicologa` | A 1ª avaliação de cada vínculo é `inicial`; as seguintes, `checkin`. Modo rápido = 5 frases; completo = 16. Cada resposta: `sim`, `nao` ou `nao_observei`. |
| `registros` | Observação descritiva da equipe | `texto`, `metodo`, `status`, `motivo`, `criadoEm` | Todo registro nasce `aguardando` e só conta após a coordenação `validar`. Se `devolvido`, a correção volta para `aguardando`. Edição livre por 15 min. |
| `intervencoes` | Ação pedagógica proposta | `acao`, `objetivo`, `estagio`, `resultado` | Estágio 1 → 2 → 3; só a coordenação avança e valida. |
| `encaminhamentos` | Sinalizador para a psicóloga | `childId`, `data`, `status` | Criado automaticamente quando a avaliação marca "atenção da psicóloga". Não guarda motivo escrito. Só a psicóloga vê. |
| `casos` | Prontuário psicológico (estrutura CRP) | `tipos[]`, `descricao`, `objetivo`, `status`, `atividades[]` | Exclusivo da psicóloga. Cada atividade: data, tipo, procedimentos, evolução, demandas e encaminhamento externo opcional. |
| `presencas` | Lançamento por encontro | chave `turmaId_data` → `{clima, fechado, marks{childId: presente\|justificada\|falta}}` | Depois de fechado, só a coordenação reabre. |
| `frases` | As 16 frases-fato das avaliações | `k`, `t`, `dim`, `quick`, `versao`, `atualizadoEm` | Editáveis pela psicóloga; cada edição incrementa a versão. |
| `auditLog` | Trilha de auditoria | `ts`, `texto` | Toda ação sensível gera uma linha (consentimento, validação, devolução, avaliação, intervenção, caso). |

## As 16 frases em 5 dimensões (CASEL + BNCC)

| Dimensão | Frases (★ = também no modo rápido) |
|---|---|
| Eu e minhas emoções | Disse como se sentia · Se acalmou sozinho(a) · Mostrou o próprio trabalho · Falou de si de forma positiva |
| Eu e os outros | ★ Ajudou sem pedirem · Dividiu material · ★ Entrou em conflito · ★ Resolveu conversando |
| Eu e a atividade | ★ Participou do começo ao fim · Tentou de novo após errar · Pediu ajuda · Ficou fora do grupo |
| Eu e o combinado | Cumpriu o combinado · Cuidou do material e do espaço |
| O que a gente fez | ★ Intervenção aplicada · Clima do encontro foi positivo |

## Regras calculadas (sem IA)

- **Frequência considerada** = (presenças + faltas justificadas) ÷ encontros. Boa ≥ 75%, média ≥ 50%, baixa < 50%.
- **Recorrência de falta justificada**: 3 ou mais → alerta de possível vulnerabilidade, acompanhado à parte.
- **Status por dimensão** (Avanço / Estável / Atenção): compara a proporção de "sim" na primeira e na última avaliação.
- **Escala de autonomia**: Acolhimento (< 2 evidências), Desenvolvimento (2–4), Autonomia (≥ 5).
- **Semáforo de turma**: "atenção" se houver educando sem consentimento ou frequência média < 75%; "dados insuficientes" com menos de 3 educandos.

## Massa de dados sintéticos

Todos os nomes, datas e telefones são **fictícios**. A carga inicial cobre as quatro turmas e todos os estados de cada fluxo:

| Entidade | Qtd. | Cobertura |
|---|---|---|
| Educandos | 18 | 4 turmas (Laboratório 11, Reforço 6, Primeira Infância 4, Vivência 3 vínculos); 4 sem consentimento; idades de 4 a 11 anos |
| Avaliações | 15 | iniciais e check-ins, modos rápido e completo, 1 com sinalização |
| Registros | 9 | aguardando, validado e devolvido; ditado e escrito |
| Intervenções | 3 | em acompanhamento e concluída |
| Encaminhamentos | 4 | pendente e revisado |
| Casos clínicos | 1 | ativo, com 2 atividades |
