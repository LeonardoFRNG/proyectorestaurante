-- ============================================================
-- EL RINCÓN DE PRADOMAR — Esquema completo para Supabase
-- Pegar TODO este archivo en: Supabase → SQL Editor → Run
-- ============================================================

-- ---------- 1. PERÍODOS (fines de semana) ----------
create table if not exists periods (
  id                          bigserial primary key,
  numero                      int not null unique,
  fecha_inicio                timestamptz not null default now(),
  fecha_cierre                timestamptz,
  estado                      text not null default 'activo' check (estado in ('activo','cerrado')),
  resumen_ventas              int,
  resumen_facturacion         numeric(12,2),
  resumen_gastos              numeric(12,2),
  resumen_efectivo            numeric(12,2),
  resumen_nequi               numeric(12,2),
  resumen_credito             numeric(12,2),
  resumen_creditos_pendientes int,
  resumen_producto_top        text,
  created_at                  timestamptz not null default now()
);
-- Solo puede existir UN período activo a la vez:
create unique index if not exists periods_un_solo_activo
  on periods (estado) where estado = 'activo';

-- ---------- 2. PRODUCTOS (carta) ----------
create table if not exists products (
  id          bigserial primary key,
  nombre      text not null unique check (length(trim(nombre)) > 0),
  descripcion text,
  precio      numeric(12,2) not null check (precio > 0),
  activo      boolean not null default true,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);

-- ---------- 3. CLIENTES (solo para crédito) ----------
create table if not exists customers (
  id         bigserial primary key,
  nombre     text not null unique check (length(trim(nombre)) > 0),
  telefono   text,
  created_at timestamptz not null default now()
);

-- ---------- 4. VENTAS ----------
create table if not exists sales (
  id             bigserial primary key,
  period_id      bigint not null references periods(id),
  consecutivo    int not null,
  total          numeric(12,2) not null default 0 check (total >= 0),
  metodo_pago    text not null check (metodo_pago in ('efectivo','nequi','credito')),
  customer_id    bigint references customers(id),
  estado_credito text check (estado_credito in ('pendiente','pagado')),
  fecha_pago     timestamptz,
  created_at     timestamptz not null default now(),
  unique (period_id, consecutivo),
  -- La BD impide una venta a crédito sin cliente, y un cliente en una venta que no es crédito:
  constraint sales_credito_coherente check (
    (metodo_pago =  'credito' and customer_id is not null and estado_credito is not null) or
    (metodo_pago <> 'credito' and customer_id is null     and estado_credito is null)
  )
);
create index if not exists sales_period_idx  on sales (period_id);
create index if not exists sales_fecha_idx   on sales (created_at desc);
create index if not exists sales_credito_idx on sales (estado_credito) where estado_credito = 'pendiente';

-- ---------- 5. LÍNEAS DE VENTA ----------
-- nombre_producto y precio_unitario se COPIAN aquí: las ventas viejas
-- conservan el precio que tenían aunque el producto cambie después.
create table if not exists sale_items (
  id              bigserial primary key,
  sale_id         bigint not null references sales(id) on delete cascade,
  product_id      bigint not null references products(id) on delete restrict,
  nombre_producto text not null,
  precio_unitario numeric(12,2) not null check (precio_unitario > 0),
  cantidad        int not null check (cantidad > 0),
  subtotal        numeric(12,2) generated always as (precio_unitario * cantidad) stored
);
create index if not exists sale_items_sale_idx on sale_items (sale_id);

-- ---------- 6. MATERIA PRIMA (gastos) ----------
create table if not exists expenses (
  id          bigserial primary key,
  period_id   bigint not null references periods(id),
  nombre      text not null check (length(trim(nombre)) > 0),
  descripcion text,
  precio      numeric(12,2) not null check (precio > 0),
  fecha       date not null default (now() at time zone 'America/Bogota'),
  created_at  timestamptz not null default now()
);
create index if not exists expenses_period_idx on expenses (period_id);

-- ---------- 7. PERÍODO INICIAL ----------
insert into periods (numero, estado)
select 1, 'activo'
where not exists (select 1 from periods);

-- ============================================================
-- FUNCIONES
-- ============================================================

-- Resumen de un período (o del activo si no se pasa id)
create or replace function resumen_periodo(p_period_id bigint default null)
returns jsonb language plpgsql security invoker set search_path = public as $$
declare pid bigint; res jsonb;
begin
  pid := coalesce(p_period_id, (select id from periods where estado = 'activo'));
  if pid is null then return null; end if;

  select jsonb_build_object(
    'period_id', p.id,
    'numero', p.numero,
    'estado', p.estado,
    'fecha_inicio', p.fecha_inicio,
    'fecha_cierre', p.fecha_cierre,
    'ventas',             (select count(*) from sales s where s.period_id = pid),
    'facturacion',        (select coalesce(sum(s.total),0) from sales s where s.period_id = pid),
    'productos_vendidos', (select coalesce(sum(i.cantidad),0) from sale_items i
                             join sales s on s.id = i.sale_id where s.period_id = pid),
    'gastos',             (select coalesce(sum(e.precio),0) from expenses e where e.period_id = pid),
    'efectivo',           (select coalesce(sum(s.total),0) from sales s where s.period_id = pid and s.metodo_pago = 'efectivo'),
    'nequi',              (select coalesce(sum(s.total),0) from sales s where s.period_id = pid and s.metodo_pago = 'nequi'),
    'credito',            (select coalesce(sum(s.total),0) from sales s where s.period_id = pid and s.metodo_pago = 'credito'),
    'creditos_pendientes',(select count(*) from sales s where s.period_id = pid and s.estado_credito = 'pendiente'),
    'pendiente_cobrar',   (select coalesce(sum(s.total),0) from sales s where s.period_id = pid and s.estado_credito = 'pendiente'),
    'producto_top',       (select jsonb_build_object('nombre', i.nombre_producto, 'cantidad', sum(i.cantidad))
                             from sale_items i join sales s on s.id = i.sale_id
                            where s.period_id = pid
                            group by i.nombre_producto order by sum(i.cantidad) desc limit 1)
  ) into res
  from periods p where p.id = pid;

  return res;
end $$;

-- Acumulado histórico (todos los períodos)
create or replace function resumen_historico()
returns jsonb language sql security invoker set search_path = public as $$
  select jsonb_build_object(
    'ventas',       (select count(*) from sales),
    'facturacion',  (select coalesce(sum(total),0) from sales),
    'gastos',       (select coalesce(sum(precio),0) from expenses),
    'periodos',     (select count(*) from periods where estado = 'cerrado'),
    'pendiente_cobrar', (select coalesce(sum(total),0) from sales where estado_credito = 'pendiente')
  );
$$;

-- Registrar una venta completa en UNA sola transacción.
-- p_items: [{"product_id":1,"cantidad":2}, ...]
create or replace function registrar_venta(
  p_items       jsonb,
  p_metodo_pago text,
  p_cliente     text default null
) returns bigint language plpgsql security invoker set search_path = public as $$
declare
  v_period    bigint;
  v_consec    int;
  v_sale      bigint;
  v_customer  bigint := null;
  it          jsonb;
  v_precio    numeric(12,2);
  v_nombre    text;
begin
  if p_items is null or jsonb_array_length(p_items) = 0 then
    raise exception 'La venta no tiene productos';
  end if;

  select id into v_period from periods where estado = 'activo' for update;
  if v_period is null then
    raise exception 'No hay un período activo. Cierra o crea un fin de semana.';
  end if;

  if p_metodo_pago = 'credito' then
    if p_cliente is null or length(trim(p_cliente)) = 0 then
      raise exception 'Una venta a crédito necesita el nombre del cliente';
    end if;
    insert into customers (nombre) values (trim(p_cliente))
      on conflict (nombre) do update set nombre = excluded.nombre
      returning id into v_customer;
  end if;

  select coalesce(max(consecutivo), 0) + 1 into v_consec from sales where period_id = v_period;

  insert into sales (period_id, consecutivo, total, metodo_pago, customer_id, estado_credito)
  values (v_period, v_consec, 0, p_metodo_pago, v_customer,
          case when p_metodo_pago = 'credito' then 'pendiente' end)
  returning id into v_sale;

  for it in select * from jsonb_array_elements(p_items) loop
    select precio, nombre into v_precio, v_nombre
      from products where id = (it->>'product_id')::bigint and activo = true;
    if v_precio is null then
      raise exception 'Producto no disponible en la carta';
    end if;
    insert into sale_items (sale_id, product_id, nombre_producto, precio_unitario, cantidad)
    values (v_sale, (it->>'product_id')::bigint, v_nombre, v_precio, (it->>'cantidad')::int);
  end loop;

  -- El total lo calcula el servidor, no el navegador:
  update sales set total = (select sum(subtotal) from sale_items where sale_id = v_sale)
   where id = v_sale;

  return v_sale;
end $$;

-- Cerrar el fin de semana: congela el resumen y abre el período siguiente.
create or replace function cerrar_periodo()
returns int language plpgsql security invoker set search_path = public as $$
declare p record; r jsonb; nuevo int;
begin
  select * into p from periods where estado = 'activo' for update;
  if not found then raise exception 'No hay un período activo'; end if;

  r := resumen_periodo(p.id);

  update periods set
    estado = 'cerrado',
    fecha_cierre = now(),
    resumen_ventas              = (r->>'ventas')::int,
    resumen_facturacion         = (r->>'facturacion')::numeric,
    resumen_gastos              = (r->>'gastos')::numeric,
    resumen_efectivo            = (r->>'efectivo')::numeric,
    resumen_nequi               = (r->>'nequi')::numeric,
    resumen_credito             = (r->>'credito')::numeric,
    resumen_creditos_pendientes = (r->>'creditos_pendientes')::int,
    resumen_producto_top        = coalesce(r->'producto_top'->>'nombre', '—')
  where id = p.id;

  nuevo := p.numero + 1;
  insert into periods (numero, estado) values (nuevo, 'activo');
  return nuevo;
end $$;

-- Marcar un crédito como pagado
create or replace function pagar_credito(p_sale_id bigint)
returns void language plpgsql security invoker set search_path = public as $$
begin
  update sales set estado_credito = 'pagado', fecha_pago = now()
   where id = p_sale_id and estado_credito = 'pendiente';
  if not found then raise exception 'Ese crédito no existe o ya fue pagado'; end if;
end $$;

-- ============================================================
-- SEGURIDAD: RLS. Sin sesión iniciada, nadie ve ni escribe nada.
-- ============================================================
alter table periods     enable row level security;
alter table products    enable row level security;
alter table customers   enable row level security;
alter table sales       enable row level security;
alter table sale_items  enable row level security;
alter table expenses    enable row level security;

do $$
declare t text;
begin
  foreach t in array array['periods','products','customers','sales','sale_items','expenses'] loop
    execute format('drop policy if exists acceso_autenticado on %I', t);
    execute format(
      'create policy acceso_autenticado on %I for all to authenticated using (true) with check (true)', t);
  end loop;
end $$;
