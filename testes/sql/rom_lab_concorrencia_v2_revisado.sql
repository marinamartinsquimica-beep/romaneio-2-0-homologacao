-- VERSÃO REVISADA v2: trava operação e palete; checa perfil diretamente.
-- Romaneio 2.0 | Laboratório transacional isolado | v1
-- Não altera rom_destinos, rom_paletes, rom_entradas, rom_usuarios ou estoque oficial.
-- Execute somente no projeto de testes Romaneio 2.0, após revisão.
begin;
create table if not exists public.rom_lab_saldos (
  palete_chave text primary key,
  caixas_disponiveis integer not null check (caixas_disponiveis >= 0),
  versao bigint not null default 1 check (versao > 0),
  atualizado_em timestamptz not null default now()
);
create table if not exists public.rom_lab_movimentos (
  operacao_id uuid primary key,
  palete_chave text not null references public.rom_lab_saldos(palete_chave),
  operador_id uuid not null references auth.users(id),
  caixas integer not null check (caixas > 0),
  versao_anterior bigint not null,
  versao_posterior bigint not null,
  criado_em timestamptz not null default now()
);
alter table public.rom_lab_saldos enable row level security;
alter table public.rom_lab_movimentos enable row level security;
revoke all on public.rom_lab_saldos from public, anon, authenticated;
revoke all on public.rom_lab_movimentos from public, anon, authenticated;

-- Somente usuário autenticado, ativo e cadastrado pode solicitar movimentação.
-- SECURITY DEFINER restringe gravação às verificações dentro da função.
create or replace function public.rom_lab_movimentar(
  p_operacao_id uuid,
  p_palete_chave text,
  p_caixas integer,
  p_versao_esperada bigint
)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_usuario uuid;
  v_atual public.rom_lab_saldos%rowtype;
  v_anterior public.rom_lab_movimentos%rowtype;
begin
  v_usuario := (select auth.uid());
  if v_usuario is null or not exists (
    select 1 from public.rom_usuarios
    where usuario_id = v_usuario and ativo is true
      and perfil in ('administrador','operador')
  ) then
    raise exception 'Usuário não autorizado' using errcode = '42501';
  end if;
  if p_operacao_id is null or p_palete_chave is null or btrim(p_palete_chave) = ''
     or p_caixas is null or p_caixas <= 0
     or p_versao_esperada is null or p_versao_esperada <= 0 then
    raise exception 'Parâmetros inválidos' using errcode = '22023';
  end if;

  -- Bloqueia primeiro a operação para serializar reenvios simultâneos
  -- mesmo quando enviados com paletes diferentes.
  perform pg_catalog.pg_advisory_xact_lock(
    pg_catalog.hashtextextended(p_operacao_id::text, 913)
  );

  -- Bloqueio por palete serializa chamadas concorrentes para a mesma chave.
  -- Advisory lock é transacional e liberado no commit/rollback.
  perform pg_catalog.pg_advisory_xact_lock(
    pg_catalog.hashtextextended(p_palete_chave, 0)
  );

  select * into v_anterior
    from public.rom_lab_movimentos where operacao_id = p_operacao_id;
  if found then
    if v_anterior.operador_id = v_usuario
       and v_anterior.palete_chave = p_palete_chave
       and v_anterior.caixas = p_caixas
       and v_anterior.versao_anterior = p_versao_esperada then
      return jsonb_build_object('status','repetida',
        'operacao_id',p_operacao_id,'versao',v_anterior.versao_posterior);
    end if;
    return jsonb_build_object('status','conflito','motivo','id_ja_utilizado');
  end if;

  select * into v_atual from public.rom_lab_saldos
    where palete_chave = p_palete_chave for update;
  if not found then
    return jsonb_build_object('status','conflito','motivo','palete_inexistente');
  end if;
  if v_atual.versao <> p_versao_esperada then
    return jsonb_build_object('status','conflito','motivo','versao_alterada',
      'versao_atual',v_atual.versao);
  end if;
  if v_atual.caixas_disponiveis < p_caixas then
    return jsonb_build_object('status','conflito','motivo','saldo_insuficiente',
      'saldo_atual',v_atual.caixas_disponiveis);
  end if;

  update public.rom_lab_saldos
    set caixas_disponiveis = caixas_disponiveis - p_caixas,
        versao = versao + 1, atualizado_em = now()
    where palete_chave = p_palete_chave;

  insert into public.rom_lab_movimentos
    (operacao_id,palete_chave,operador_id,caixas,versao_anterior,versao_posterior)
    values (p_operacao_id,p_palete_chave,v_usuario,p_caixas,
            v_atual.versao,v_atual.versao+1);

  return jsonb_build_object('status','confirmada',
    'operacao_id',p_operacao_id,'saldo_atual',v_atual.caixas_disponiveis-p_caixas,
    'versao',v_atual.versao+1);
end;
$$;

revoke all on function public.rom_lab_movimentar(uuid,text,integer,bigint)
  from public, anon;
grant execute on function public.rom_lab_movimentar(uuid,text,integer,bigint)
  to authenticated;

-- Leitura restrita a usuários ativos (sem escrita direta).
grant select on public.rom_lab_saldos, public.rom_lab_movimentos to authenticated;
create policy "rom_lab_saldos_ler" on public.rom_lab_saldos
  for select to authenticated using ((select public.rom_usuario_ativo()));
create policy "rom_lab_movimentos_ler" on public.rom_lab_movimentos
  for select to authenticated using ((select public.rom_usuario_ativo()));
commit;

-- Seed de laboratório: execute separadamente e somente se desejar testar.
-- insert into public.rom_lab_saldos (palete_chave, caixas_disponiveis, versao)
-- values ('DESTINO TESTE / 3', 10, 1)
-- on conflict (palete_chave) do nothing;

-- Reversão (APAGA apenas os dados deste laboratório):
-- begin;
-- drop function if exists public.rom_lab_movimentar(uuid,text,integer,bigint);
-- drop table if exists public.rom_lab_movimentos;
-- drop table if exists public.rom_lab_saldos;
-- commit;
