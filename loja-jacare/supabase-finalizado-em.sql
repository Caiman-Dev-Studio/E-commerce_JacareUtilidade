alter table public.pedidos
add column if not exists finalizado_em timestamptz;

create index if not exists idx_pedidos_status_finalizado_em
on public.pedidos (status, finalizado_em);
