-- Ebenézer Conecta · esquema para o nível 2 (PostgreSQL / Supabase, região São Paulo)
-- Versão do desenho: 1.3.0. Documentação completa em docs/banco-de-dados.md.
-- Use só depois de a diretoria aprovar onde o dado fica e o termo de consentimento (LGPD, art. 14).
-- Os nomes de campos seguem o JSON do app em snake_case, para facilitar a migração do backup.

create type perfil       as enum ('equipe','coordenacao','psicologa');
create type marca_pres   as enum ('presente','justificada','falta');
create type resp_dbr     as enum ('sim','nao','nao_observei');
create type status_obs   as enum ('aguardando','validado','devolvido');
create type urg_notif    as enum ('critica','alta','atencao');
create type status_notif as enum ('aberta','em_andamento','encerrada');

-- Usuários: cada pessoa da equipe com login individual (Supabase Auth)
create table usuarios (
  id uuid primary key references auth.users(id) on delete cascade,
  nome text not null,
  perfil perfil not null,
  ativo boolean not null default true
);

create table programas (
  id text primary key,                       -- lab, re, pi, vt, cp
  nome text not null,
  presenca_only boolean not null default false,
  lider perfil                               -- 'psicologa' nos grupos dela
);

create table educandos (
  id text primary key check (id ~ '^EDU-[0-9]{4}$'),
  nome text not null,
  nasc date not null,
  entrada date not null,
  consentimento boolean not null default false,
  consentimento_em date
);

-- Contato do responsável separado: só a psicóloga lê (RLS abaixo)
create table responsaveis (
  child_id text primary key references educandos(id) on delete cascade,
  nome text not null,
  rel text not null,
  contato text
);

create table vinculos (
  child_id text references educandos(id) on delete cascade,
  turma_id text references programas(id),
  primary key (child_id, turma_id)
);

create table encontros (
  id bigserial primary key,
  turma_id text not null references programas(id),
  data date not null,
  clima text check (clima in ('tranquilo','neutro','agitado')),
  fechado boolean not null default false,
  unique (turma_id, data)
);

create table presencas (
  encontro_id bigint references encontros(id) on delete cascade,
  child_id text references educandos(id) on delete cascade,
  marca marca_pres not null,
  primary key (encontro_id, child_id)
);

create table registros_grupo (
  encontro_id bigint primary key references encontros(id) on delete cascade,
  atividades text[] not null default '{}',
  engaj text check (engaj in ('maioria','parte','pouco')),
  movimentos text[] not null default '{}',
  obs text,
  autor uuid references usuarios(id),
  em timestamptz not null default now()
);

create table frases (
  k text primary key,
  t text not null,
  dim text not null,
  quick boolean not null default false,
  versao int not null default 1,
  atualizado_em date not null default current_date
);

create table avaliacoes (
  id text primary key,
  child_id text not null references educandos(id),
  turma_id text not null references programas(id),
  data date not null,
  tipo text not null check (tipo in ('inicial','checkin')),
  modo text not null check (modo in ('rapido','completo')),
  atencao_psicologa boolean not null default false,
  autor uuid references usuarios(id)
);
create index on avaliacoes (child_id, turma_id, data);

create table respostas (
  avaliacao_id text references avaliacoes(id) on delete cascade,
  frase_k text references frases(k),
  valor resp_dbr not null,
  primary key (avaliacao_id, frase_k)
);

create table registros (
  id text primary key,
  child_id text not null references educandos(id),
  turma_id text not null references programas(id),
  data date not null,
  criado_em timestamptz not null default now(),
  autor uuid references usuarios(id),
  metodo text not null check (metodo in ('ditado','escrito')),
  texto text not null,
  status status_obs not null default 'aguardando',
  motivo text,
  check (status <> 'devolvido' or motivo is not null)   -- devolução exige motivo
);
create index on registros (status, data);

create table intervencoes (
  id text primary key,
  child_id text not null references educandos(id),
  turma_id text references programas(id),
  acao text not null,
  objetivo text not null,
  proposto_por uuid references usuarios(id),
  proposto_em date not null,
  estagio int not null check (estagio between 1 and 3),
  resultado text
);

create table encaminhamentos (
  id text primary key,
  child_id text not null references educandos(id),
  turma_id text references programas(id),
  data date not null,
  status text not null check (status in ('pendente','revisado'))
);

create table casos (
  id text primary key,
  child_id text not null unique references educandos(id),
  tipos text[] not null,
  descricao text,
  objetivo text not null,
  status text not null default 'ativo',
  criado_em date not null default current_date
);

create table atividades_clinicas (
  id text primary key,
  caso_id text not null references casos(id) on delete cascade,
  data date not null,
  profissional uuid references usuarios(id),
  tipo text not null,
  objetivo_atividade text, procedimentos text, evolucao text, demandas text,
  encaminhamento jsonb
);

create table notificacoes (
  id text primary key,
  child_id text not null references educandos(id),
  tipo text not null check (tipo in ('violencia','risco','atipico','ausencia','saude','outro')),
  urgencia urg_notif not null,
  descricao text not null,
  autor uuid references usuarios(id),
  criado_em timestamptz not null default now(),
  status status_notif not null default 'aberta',
  responsavel uuid references usuarios(id),
  desfecho text,
  encerrado_em timestamptz,
  -- ECA, art. 13: suspeita de violência só se encerra com o Conselho Tutelar comunicado
  check (status <> 'encerrada' or tipo <> 'violencia'
         or desfecho in ('Conselho Tutelar comunicado','Conselho Tutelar já acompanhava o caso'))
);
create index on notificacoes (status, urgencia, criado_em);

create table acoes_notificacao (
  id bigserial primary key,
  notificacao_id text not null references notificacoes(id) on delete cascade,
  ts timestamptz not null default now(),
  autor uuid references usuarios(id),
  tipo text not null,
  texto text
);

create table auditoria (
  id bigserial primary key,
  ts timestamptz not null default now(),
  autor uuid references usuarios(id),
  texto text not null            -- nunca copiar o conteúdo de relatos ou observações
);

-- ---------------------------------------------------------------------------
-- Regras de acesso por perfil (Row Level Security) · exemplos principais
-- ---------------------------------------------------------------------------
create or replace function meu_perfil() returns perfil language sql stable as
$$ select perfil from usuarios where id = auth.uid() and ativo $$;

alter table responsaveis      enable row level security;
alter table casos             enable row level security;
alter table atividades_clinicas enable row level security;
alter table encaminhamentos   enable row level security;
alter table notificacoes      enable row level security;
alter table acoes_notificacao enable row level security;
alter table registros_grupo   enable row level security;

-- Contato do responsável, caso clínico e encaminhamentos: só a psicóloga
create policy psi_responsaveis on responsaveis for all using (meu_perfil() = 'psicologa');
create policy psi_casos        on casos        for all using (meu_perfil() = 'psicologa');
create policy psi_atividades   on atividades_clinicas for all using (meu_perfil() = 'psicologa');
create policy psi_enc          on encaminhamentos for all using (meu_perfil() = 'psicologa');

-- Notificações: qualquer perfil cria; só coordenação e psicóloga leem e alteram
create policy notif_cria  on notificacoes for insert with check (meu_perfil() is not null);
create policy notif_le    on notificacoes for select using (meu_perfil() in ('coordenacao','psicologa'));
create policy notif_trata on notificacoes for update using (meu_perfil() in ('coordenacao','psicologa'));
create policy acoes_notif on acoes_notificacao for all using (meu_perfil() in ('coordenacao','psicologa'));

-- Registro do grupo: nos grupos da psicóloga, só ela lê e escreve
create policy grupo_rg on registros_grupo for all using (
  meu_perfil() = 'psicologa'
  or not exists (select 1 from encontros e join programas p on p.id = e.turma_id
                 where e.id = registros_grupo.encontro_id and p.lider = 'psicologa'));
