// ============================================================
// APP — navegación + render de cada sección
// ============================================================

const vista = document.getElementById('vista');
const titulo = document.getElementById('titulo');
let periodoActivo = null;          // resumen del período activo
let carrito = [];                  // líneas de la venta en curso

const SECCIONES = {
  dashboard: { titulo: 'Dashboard',              render: verDashboard },
  ventas:    { titulo: 'Registrar venta',        render: verVentas },
  carta:     { titulo: 'Carta',                  render: verCarta },
  materia:   { titulo: 'Materia prima',          render: verMateria },
  creditos:  { titulo: 'Créditos',               render: verCreditos },
  historial: { titulo: 'Historial',              render: verHistorial },
  cierre:    { titulo: 'Cierre de fin de semana',render: verCierre }
};

// ---------- arranque ----------
(async function iniciar() {
  const { data } = await sb.auth.getSession();
  if (!data.session) { location.href = 'index.html'; return; }

  document.getElementById('btnSalir').onclick = async () => {
    if (await confirmar('¿Cerrar la sesión?', 'Cerrar sesión')) {
      await sb.auth.signOut();
      location.href = 'index.html';
    }
  };
  document.getElementById('btnMenu').onclick = () => alternarMenu(true);
  document.getElementById('capaFondo').onclick = () => alternarMenu(false);
  document.querySelectorAll('.nav-item').forEach(b =>
    b.onclick = () => { ir(b.dataset.sec); alternarMenu(false); });

  await refrescarPeriodo();
  ir(location.hash.replace('#', '') || 'dashboard');
})();

function alternarMenu(abrir) {
  document.getElementById('sidebar').classList.toggle('-translate-x-full', !abrir);
  document.getElementById('capaFondo').classList.toggle('hidden', !abrir);
}

async function refrescarPeriodo() {
  try {
    periodoActivo = await db.resumenPeriodo();
    document.getElementById('etiquetaPeriodo').textContent =
      periodoActivo ? `Fin de semana #${periodoActivo.numero} · activo` : 'Sin período activo';
  } catch (e) { toast(e.message, 'error'); }
}

async function ir(sec) {
  const s = SECCIONES[sec] || SECCIONES.dashboard;
  location.hash = sec;
  titulo.textContent = s.titulo;
  document.querySelectorAll('.nav-item').forEach(b => b.classList.toggle('activo', b.dataset.sec === sec));
  vista.innerHTML = cargando();
  try { await s.render(); }
  catch (e) { vista.innerHTML = `<div class="bg-red-50 border border-red-200 text-red-800 rounded-xl p-4">${esc(e.message)}</div>`; }
}

// ---------- componentes ----------
function card(etiqueta, valor, extra = '') {
  return `<div class="bg-white rounded-xl border border-slate-200 p-4">
    <p class="text-xs text-slate-500">${esc(etiqueta)}</p>
    <p class="text-2xl font-semibold text-slate-800 mt-1 tabular-nums">${valor}</p>
    ${extra ? `<p class="text-xs text-slate-400 mt-1">${extra}</p>` : ''}
  </div>`;
}
function badge(texto, color) {
  const c = { verde: 'bg-emerald-100 text-emerald-800', ambar: 'bg-amber-100 text-amber-800',
              gris: 'bg-slate-100 text-slate-600', rojo: 'bg-red-100 text-red-800' }[color];
  return `<span class="text-xs px-2 py-0.5 rounded-full ${c}">${esc(texto)}</span>`;
}
const btnPrim = 'px-4 py-2.5 rounded-lg text-white text-sm" style="background:#123F35';
const inputCls = 'w-full border border-slate-300 rounded-lg px-3 py-2.5 focus:outline-none focus:ring-2 focus:ring-emerald-800';

// ============================================================
// DASHBOARD
// ============================================================
async function verDashboard() {
  const [p, h] = await Promise.all([db.resumenPeriodo(), db.resumenHistorico()]);
  periodoActivo = p;
  if (!p) { vista.innerHTML = vacio('No hay un fin de semana activo.'); return; }

  const ganancia = Number(p.facturacion) - Number(p.gastos);
  const recibido = Number(p.efectivo) + Number(p.nequi);

  vista.innerHTML = `
    <p class="text-sm text-slate-500 mb-3">Fin de semana #${p.numero} · desde ${fecha(p.fecha_inicio, false)}</p>
    <div class="grid grid-cols-2 lg:grid-cols-4 gap-3 mb-6">
      ${card('Ventas', p.ventas, `${p.productos_vendidos} productos`)}
      ${card('Facturación', money(p.facturacion))}
      ${card('Materia prima', money(p.gastos))}
      ${card('Ganancia estimada', money(ganancia), 'facturación − materia prima')}
    </div>

    <div class="grid md:grid-cols-2 gap-4 mb-6">
      <div class="bg-white rounded-xl border border-slate-200 p-5">
        <h2 class="font-medium mb-4">Métodos de pago</h2>
        ${[['Efectivo', p.efectivo], ['Nequi', p.nequi], ['Crédito', p.credito]].map(([k, v]) => `
          <div class="flex justify-between py-2 border-b border-slate-100 text-sm">
            <span class="text-slate-600">${k}</span><span class="tabular-nums font-medium">${money(v)}</span>
          </div>`).join('')}
        <div class="flex justify-between pt-3 text-sm font-semibold">
          <span>Total facturado</span><span class="tabular-nums">${money(p.facturacion)}</span>
        </div>
      </div>

      <div class="bg-white rounded-xl border border-slate-200 p-5">
        <h2 class="font-medium mb-4">Resumen de caja</h2>
        <div class="flex justify-between py-2 border-b border-slate-100 text-sm">
          <span class="text-slate-600">Dinero recibido</span><span class="tabular-nums font-medium">${money(recibido)}</span></div>
        <div class="flex justify-between py-2 border-b border-slate-100 text-sm">
          <span class="text-slate-600">Pendiente por cobrar</span><span class="tabular-nums font-medium text-amber-700">${money(p.pendiente_cobrar)}</span></div>
        <div class="flex justify-between py-2 text-sm">
          <span class="text-slate-600">Créditos pendientes</span><span class="tabular-nums font-medium">${p.creditos_pendientes}</span></div>
        <p class="text-xs text-slate-400 mt-3">El crédito cuenta como facturación aunque todavía no se haya cobrado.</p>
      </div>
    </div>

    <div class="grid md:grid-cols-2 gap-4">
      <div class="bg-white rounded-xl border border-slate-200 p-5">
        <h2 class="font-medium mb-2">Producto más vendido</h2>
        ${p.producto_top
          ? `<p class="text-lg">${esc(p.producto_top.nombre)}</p>
             <p class="text-sm text-slate-500">${p.producto_top.cantidad} unidades este fin de semana</p>`
          : `<p class="text-sm text-slate-500">Todavía no hay ventas.</p>`}
      </div>
      <div class="rounded-xl p-5 text-white" style="background:#123F35">
        <h2 class="font-medium mb-3">Histórico acumulado</h2>
        <div class="flex justify-between py-1.5 text-sm"><span class="text-white/70">Ventas</span><span class="tabular-nums">${h.ventas}</span></div>
        <div class="flex justify-between py-1.5 text-sm"><span class="text-white/70">Facturación</span><span class="tabular-nums">${money(h.facturacion)}</span></div>
        <div class="flex justify-between py-1.5 text-sm"><span class="text-white/70">Gastos</span><span class="tabular-nums">${money(h.gastos)}</span></div>
        <div class="flex justify-between py-1.5 text-sm"><span class="text-white/70">Fines de semana cerrados</span><span class="tabular-nums">${h.periodos}</span></div>
      </div>
    </div>`;
}

// ============================================================
// CARTA
// ============================================================
async function verCarta() {
  const productos = await db.productos();
  vista.innerHTML = `
    <div class="flex justify-between items-center mb-4">
      <p class="text-sm text-slate-500">${productos.length} productos en la carta</p>
      <button id="nuevo" class="${btnPrim}">Nuevo producto</button>
    </div>
    ${productos.length === 0 ? vacio('Todavía no has agregado productos a la carta.') : `
    <div class="bg-white rounded-xl border border-slate-200 overflow-hidden">
      <div class="overflow-x-auto"><table class="w-full text-sm">
        <thead class="bg-slate-50 text-slate-500 text-left">
          <tr><th class="px-4 py-3">Producto</th><th class="px-4 py-3">Precio</th>
              <th class="px-4 py-3">Estado</th><th class="px-4 py-3 text-right">Acciones</th></tr>
        </thead>
        <tbody>${productos.map(p => `
          <tr class="border-t border-slate-100">
            <td class="px-4 py-3">
              <p class="font-medium">${esc(p.nombre)}</p>
              ${p.descripcion ? `<p class="text-xs text-slate-500 max-w-md">${esc(p.descripcion)}</p>` : ''}
            </td>
            <td class="px-4 py-3 tabular-nums">${money(p.precio)}</td>
            <td class="px-4 py-3">${p.activo ? badge('Activo', 'verde') : badge('Inactivo', 'gris')}</td>
            <td class="px-4 py-3 text-right whitespace-nowrap">
              <button data-editar="${p.id}" class="text-emerald-800 hover:underline">Editar</button>
              <button data-estado="${p.id}" data-activo="${p.activo}" class="ml-3 text-slate-500 hover:underline">${p.activo ? 'Desactivar' : 'Activar'}</button>
              <button data-borrar="${p.id}" class="ml-3 text-red-700 hover:underline">Eliminar</button>
            </td>
          </tr>`).join('')}</tbody>
      </table></div>
    </div>`}`;

  document.getElementById('nuevo').onclick = () => formProducto();
  vista.querySelectorAll('[data-editar]').forEach(b =>
    b.onclick = () => formProducto(productos.find(p => p.id == b.dataset.editar)));
  vista.querySelectorAll('[data-estado]').forEach(b => b.onclick = async () => {
    await db.cambiarEstadoProducto(b.dataset.estado, b.dataset.activo !== 'true');
    toast('Producto actualizado'); verCarta();
  });
  vista.querySelectorAll('[data-borrar]').forEach(b => b.onclick = async () => {
    if (!await confirmar('¿Estás seguro de eliminar este producto?', 'Eliminar')) return;
    try {
      const r = await db.eliminarProducto(b.dataset.borrar);
      toast(r === 'eliminado'
        ? 'Producto eliminado correctamente.'
        : 'El producto tiene ventas registradas, así que se desactivó en lugar de borrarse.');
      verCarta();
    } catch (e) { toast(e.message, 'error'); }
  });
}

function formProducto(p = null) {
  abrirModal(p ? 'Editar producto' : 'Nuevo producto', `
    <label class="block text-sm text-slate-600 mb-1">Nombre</label>
    <input id="f_nombre" class="${inputCls} mb-4" value="${esc(p?.nombre || '')}">
    <label class="block text-sm text-slate-600 mb-1">Descripción</label>
    <textarea id="f_desc" rows="2" class="${inputCls} mb-4">${esc(p?.descripcion || '')}</textarea>
    <label class="block text-sm text-slate-600 mb-1">Precio (COP)</label>
    <input id="f_precio" type="number" min="1" step="1" class="${inputCls} mb-5" value="${p?.precio ? Number(p.precio) : ''}">
    <div class="flex justify-end gap-3">
      <button data-cancelar class="px-4 py-2.5 rounded-lg border border-slate-300 text-sm">Cancelar</button>
      <button id="f_guardar" class="${btnPrim}">Guardar</button>
    </div>`);

  document.querySelector('[data-cancelar]').onclick = cerrarModal;
  document.getElementById('f_guardar').onclick = async () => {
    const nombre = document.getElementById('f_nombre').value.trim();
    const precio = Number(document.getElementById('f_precio').value);
    if (!nombre) return toast('Escribe el nombre del producto.', 'error');
    if (!precio || precio <= 0) return toast('El precio debe ser mayor que cero.', 'error');
    const datos = { nombre, descripcion: document.getElementById('f_desc').value.trim() || null, precio };
    try {
      if (p) await db.editarProducto(p.id, datos); else await db.crearProducto(datos);
      cerrarModal(); toast(p ? 'Producto actualizado correctamente.' : 'Producto creado correctamente.');
      verCarta();
    } catch (e) { toast(e.message, 'error'); }
  };
}

// ============================================================
// VENTAS
// ============================================================
async function verVentas() {
  const productos = await db.productos(true);
  if (!productos.length) { vista.innerHTML = vacio('Agrega productos a la carta antes de registrar ventas.'); return; }

  vista.innerHTML = `
    <div class="grid lg:grid-cols-5 gap-4">
      <div class="lg:col-span-3 bg-white rounded-xl border border-slate-200 p-5">
        <h2 class="font-medium mb-4">Agregar productos</h2>
        <label class="block text-sm text-slate-600 mb-1">Producto</label>
        <select id="v_producto" class="${inputCls} mb-3">
          ${productos.map(p => `<option value="${p.id}" data-precio="${p.precio}" data-nombre="${esc(p.nombre)}">${esc(p.nombre)} — ${money(p.precio)}</option>`).join('')}
        </select>
        <div class="flex gap-3 items-end">
          <div class="w-28">
            <label class="block text-sm text-slate-600 mb-1">Cantidad</label>
            <input id="v_cantidad" type="number" min="1" value="1" class="${inputCls}">
          </div>
          <div class="flex-1">
            <p class="text-sm text-slate-600 mb-1">Subtotal</p>
            <p id="v_subtotal" class="text-lg font-semibold tabular-nums py-1.5">—</p>
          </div>
          <button id="v_agregar" class="${btnPrim}">Agregar</button>
        </div>
      </div>

      <div class="lg:col-span-2 bg-white rounded-xl border border-slate-200 p-5">
        <h2 class="font-medium mb-3">Venta en curso</h2>
        <div id="v_lista" class="mb-4"></div>
        <div class="flex justify-between font-semibold text-lg border-t border-slate-200 pt-3 mb-4">
          <span>Total</span><span id="v_total" class="tabular-nums">$0</span>
        </div>
        <label class="block text-sm text-slate-600 mb-1">Método de pago</label>
        <select id="v_metodo" class="${inputCls} mb-3">
          <option value="efectivo">Efectivo</option>
          <option value="nequi">Nequi</option>
          <option value="credito">Crédito</option>
        </select>
        <div id="v_cajaCliente" class="hidden mb-3">
          <label class="block text-sm text-slate-600 mb-1">Nombre del cliente</label>
          <input id="v_cliente" class="${inputCls}" placeholder="Ej: Carlos Pérez">
        </div>
        <button id="v_guardar" class="w-full ${btnPrim}">Registrar venta</button>
      </div>
    </div>`;

  const sel = document.getElementById('v_producto');
  const cant = document.getElementById('v_cantidad');
  const calc = () => {
    const precio = Number(sel.selectedOptions[0].dataset.precio);
    const c = Number(cant.value) || 0;
    document.getElementById('v_subtotal').textContent = c > 0 ? money(precio * c) : '—';
  };
  sel.onchange = calc; cant.oninput = calc; calc();

  document.getElementById('v_metodo').onchange = e =>
    document.getElementById('v_cajaCliente').classList.toggle('hidden', e.target.value !== 'credito');

  document.getElementById('v_agregar').onclick = () => {
    const c = Number(cant.value);
    if (!c || c < 1) return toast('La cantidad debe ser al menos 1.', 'error');
    const id = Number(sel.value);
    const existente = carrito.find(l => l.product_id === id);
    if (existente) existente.cantidad += c;
    else carrito.push({ product_id: id, nombre: sel.selectedOptions[0].dataset.nombre,
                        precio: Number(sel.selectedOptions[0].dataset.precio), cantidad: c });
    cant.value = 1; calc(); pintarCarrito();
  };

  document.getElementById('v_guardar').onclick = guardarVenta;
  pintarCarrito();
}

function pintarCarrito() {
  const lista = document.getElementById('v_lista');
  if (!lista) return;
  if (!carrito.length) {
    lista.innerHTML = `<p class="text-sm text-slate-400 py-4">Agrega productos a la venta.</p>`;
  } else {
    lista.innerHTML = carrito.map((l, i) => `
      <div class="flex justify-between items-center py-2 border-b border-slate-100 text-sm">
        <div><p class="font-medium">${esc(l.nombre)}</p>
             <p class="text-xs text-slate-500">${l.cantidad} × ${money(l.precio)}</p></div>
        <div class="flex items-center gap-3">
          <span class="tabular-nums">${money(l.precio * l.cantidad)}</span>
          <button data-quitar="${i}" class="text-red-600 text-lg leading-none">&times;</button>
        </div>
      </div>`).join('');
    lista.querySelectorAll('[data-quitar]').forEach(b =>
      b.onclick = () => { carrito.splice(Number(b.dataset.quitar), 1); pintarCarrito(); });
  }
  document.getElementById('v_total').textContent =
    money(carrito.reduce((t, l) => t + l.precio * l.cantidad, 0));
}

async function guardarVenta() {
  if (!carrito.length) return toast('La venta no tiene productos.', 'error');
  const metodo = document.getElementById('v_metodo').value;
  const cliente = document.getElementById('v_cliente')?.value.trim();
  if (metodo === 'credito' && !cliente) return toast('Escribe el nombre del cliente.', 'error');

  const btn = document.getElementById('v_guardar');
  btn.disabled = true; btn.textContent = 'Guardando...';
  try {
    await db.registrarVenta(
      carrito.map(l => ({ product_id: l.product_id, cantidad: l.cantidad })), metodo, cliente);
    carrito = [];
    toast('Venta registrada correctamente.');
    await refrescarPeriodo();
    verVentas();
  } catch (e) {
    toast(e.message, 'error');
    btn.disabled = false; btn.textContent = 'Registrar venta';
  }
}

// ============================================================
// MATERIA PRIMA
// ============================================================
async function verMateria() {
  const gastos = await db.gastos(periodoActivo?.period_id);
  const total = gastos.reduce((t, g) => t + Number(g.precio), 0);
  vista.innerHTML = `
    <div class="flex justify-between items-center mb-4 gap-3 flex-wrap">
      <p class="text-sm text-slate-500">Gastos del fin de semana #${periodoActivo?.numero ?? '—'} · total ${money(total)}</p>
      <div class="flex gap-2">
        <button id="csv" class="px-4 py-2.5 rounded-lg border border-slate-300 text-sm">Exportar CSV</button>
        <button id="nuevo" class="${btnPrim}">Nuevo gasto</button>
      </div>
    </div>
    ${gastos.length === 0 ? vacio('No hay gastos registrados en este período.') : `
    <div class="bg-white rounded-xl border border-slate-200 overflow-x-auto">
      <table class="w-full text-sm">
        <thead class="bg-slate-50 text-slate-500 text-left">
          <tr><th class="px-4 py-3">Gasto</th><th class="px-4 py-3">Fecha</th>
              <th class="px-4 py-3">Valor</th><th class="px-4 py-3 text-right">Acciones</th></tr></thead>
        <tbody>${gastos.map(g => `
          <tr class="border-t border-slate-100">
            <td class="px-4 py-3"><p class="font-medium">${esc(g.nombre)}</p>
              ${g.descripcion ? `<p class="text-xs text-slate-500">${esc(g.descripcion)}</p>` : ''}</td>
            <td class="px-4 py-3">${fecha(g.fecha + 'T12:00:00', false)}</td>
            <td class="px-4 py-3 tabular-nums">${money(g.precio)}</td>
            <td class="px-4 py-3 text-right whitespace-nowrap">
              <button data-editar="${g.id}" class="text-emerald-800 hover:underline">Editar</button>
              <button data-borrar="${g.id}" class="ml-3 text-red-700 hover:underline">Eliminar</button>
            </td></tr>`).join('')}</tbody>
      </table>
    </div>`}`;

  document.getElementById('nuevo').onclick = () => formGasto();
  document.getElementById('csv').onclick = () => exportarCSV('materia-prima.csv',
    gastos.map(g => ({ fecha: g.fecha, nombre: g.nombre, descripcion: g.descripcion || '', precio: g.precio })));
  vista.querySelectorAll('[data-editar]').forEach(b =>
    b.onclick = () => formGasto(gastos.find(g => g.id == b.dataset.editar)));
  vista.querySelectorAll('[data-borrar]').forEach(b => b.onclick = async () => {
    if (!await confirmar('¿Eliminar este gasto?', 'Eliminar')) return;
    try { await db.eliminarGasto(b.dataset.borrar); toast('Gasto eliminado correctamente.'); verMateria(); }
    catch (e) { toast(e.message, 'error'); }
  });
}

function formGasto(g = null) {
  const hoy = new Date().toLocaleDateString('en-CA', { timeZone: 'America/Bogota' });
  abrirModal(g ? 'Editar gasto' : 'Nuevo gasto', `
    <label class="block text-sm text-slate-600 mb-1">Nombre</label>
    <input id="g_nombre" class="${inputCls} mb-4" value="${esc(g?.nombre || '')}" placeholder="Ej: Carne para hamburguesas">
    <label class="block text-sm text-slate-600 mb-1">Descripción</label>
    <textarea id="g_desc" rows="2" class="${inputCls} mb-4">${esc(g?.descripcion || '')}</textarea>
    <div class="grid grid-cols-2 gap-3 mb-5">
      <div><label class="block text-sm text-slate-600 mb-1">Valor (COP)</label>
        <input id="g_precio" type="number" min="1" class="${inputCls}" value="${g?.precio ? Number(g.precio) : ''}"></div>
      <div><label class="block text-sm text-slate-600 mb-1">Fecha</label>
        <input id="g_fecha" type="date" class="${inputCls}" value="${g?.fecha || hoy}"></div>
    </div>
    <div class="flex justify-end gap-3">
      <button data-cancelar class="px-4 py-2.5 rounded-lg border border-slate-300 text-sm">Cancelar</button>
      <button id="g_guardar" class="${btnPrim}">Guardar</button>
    </div>`);

  document.querySelector('[data-cancelar]').onclick = cerrarModal;
  document.getElementById('g_guardar').onclick = async () => {
    const nombre = document.getElementById('g_nombre').value.trim();
    const precio = Number(document.getElementById('g_precio').value);
    if (!nombre) return toast('Escribe el nombre del gasto.', 'error');
    if (!precio || precio <= 0) return toast('El valor debe ser mayor que cero.', 'error');
    const datos = { nombre, descripcion: document.getElementById('g_desc').value.trim() || null,
                    precio, fecha: document.getElementById('g_fecha').value };
    try {
      if (g) await db.editarGasto(g.id, datos);
      else await db.crearGasto({ ...datos, period_id: periodoActivo.period_id });
      cerrarModal(); toast('Gasto guardado correctamente.'); verMateria();
    } catch (e) { toast(e.message, 'error'); }
  };
}

// ============================================================
// CRÉDITOS
// ============================================================
let filtroCredito = 'pendiente';

async function verCreditos() {
  const creditos = await db.creditos(filtroCredito || null);
  const pendiente = creditos.filter(c => c.estado_credito === 'pendiente')
                            .reduce((t, c) => t + Number(c.total), 0);
  vista.innerHTML = `
    <div class="flex justify-between items-center mb-4 gap-3 flex-wrap">
      <select id="filtro" class="border border-slate-300 rounded-lg px-3 py-2 text-sm">
        <option value="pendiente" ${filtroCredito === 'pendiente' ? 'selected' : ''}>Pendientes</option>
        <option value="pagado" ${filtroCredito === 'pagado' ? 'selected' : ''}>Pagados</option>
        <option value="" ${filtroCredito === '' ? 'selected' : ''}>Todos</option>
      </select>
      ${filtroCredito === 'pendiente' ? `<p class="text-sm text-slate-600">Por cobrar: <span class="font-semibold">${money(pendiente)}</span></p>` : ''}
    </div>
    ${creditos.length === 0 ? vacio('No existen créditos en esta vista.') : `
    <div class="bg-white rounded-xl border border-slate-200 overflow-x-auto">
      <table class="w-full text-sm">
        <thead class="bg-slate-50 text-slate-500 text-left">
          <tr><th class="px-4 py-3">Cliente</th><th class="px-4 py-3">Venta</th><th class="px-4 py-3">Fecha</th>
              <th class="px-4 py-3">Total</th><th class="px-4 py-3">Estado</th>
              <th class="px-4 py-3">Pagado el</th><th class="px-4 py-3 text-right">Acciones</th></tr></thead>
        <tbody>${creditos.map(c => `
          <tr class="border-t border-slate-100">
            <td class="px-4 py-3 font-medium">${esc(c.customers?.nombre || '—')}</td>
            <td class="px-4 py-3 text-slate-500">#${c.consecutivo}</td>
            <td class="px-4 py-3">${fecha(c.created_at)}</td>
            <td class="px-4 py-3 tabular-nums">${money(c.total)}</td>
            <td class="px-4 py-3">${c.estado_credito === 'pendiente' ? badge('Pendiente', 'ambar') : badge('Pagado', 'verde')}</td>
            <td class="px-4 py-3 text-slate-500">${c.fecha_pago ? fecha(c.fecha_pago, false) : '—'}</td>
            <td class="px-4 py-3 text-right whitespace-nowrap">
              <button data-ver="${c.id}" class="text-slate-500 hover:underline">Detalle</button>
              ${c.estado_credito === 'pendiente'
                ? `<button data-pagar="${c.id}" class="ml-3 text-emerald-800 hover:underline">Marcar como pagado</button>` : ''}
            </td></tr>`).join('')}</tbody>
      </table>
    </div>`}`;

  document.getElementById('filtro').onchange = e => { filtroCredito = e.target.value; verCreditos(); };
  vista.querySelectorAll('[data-pagar]').forEach(b => b.onclick = async () => {
    if (!await confirmar('¿Marcar esta deuda como pagada?', 'Marcar como pagado')) return;
    try { await db.pagarCredito(b.dataset.pagar); toast('Deuda saldada correctamente.'); await refrescarPeriodo(); verCreditos(); }
    catch (e) { toast(e.message, 'error'); }
  });
  vista.querySelectorAll('[data-ver]').forEach(b =>
    b.onclick = () => verDetalleVenta(creditos.find(c => c.id == b.dataset.ver)));
}

// ============================================================
// HISTORIAL
// ============================================================
let filtrosHist = { desde: '', hasta: '', metodo: '', estadoCredito: '' };

async function verHistorial() {
  const ventas = await db.ventas({ ...filtrosHist, limite: 300 });
  const total = ventas.reduce((t, v) => t + Number(v.total), 0);
  vista.innerHTML = `
    <div class="bg-white rounded-xl border border-slate-200 p-4 mb-4 no-print">
      <div class="grid sm:grid-cols-4 gap-3">
        <div><label class="block text-xs text-slate-500 mb-1">Desde</label>
          <input id="h_desde" type="date" value="${filtrosHist.desde}" class="${inputCls}"></div>
        <div><label class="block text-xs text-slate-500 mb-1">Hasta</label>
          <input id="h_hasta" type="date" value="${filtrosHist.hasta}" class="${inputCls}"></div>
        <div><label class="block text-xs text-slate-500 mb-1">Método de pago</label>
          <select id="h_metodo" class="${inputCls}">
            <option value="">Todos</option>
            ${['efectivo', 'nequi', 'credito'].map(m => `<option value="${m}" ${filtrosHist.metodo === m ? 'selected' : ''}>${m[0].toUpperCase() + m.slice(1)}</option>`).join('')}
          </select></div>
        <div><label class="block text-xs text-slate-500 mb-1">Estado del crédito</label>
          <select id="h_estado" class="${inputCls}">
            <option value="">Todos</option>
            <option value="pendiente" ${filtrosHist.estadoCredito === 'pendiente' ? 'selected' : ''}>Pendiente</option>
            <option value="pagado" ${filtrosHist.estadoCredito === 'pagado' ? 'selected' : ''}>Pagado</option>
          </select></div>
      </div>
      <div class="flex gap-2 mt-3">
        <button id="h_aplicar" class="${btnPrim}">Aplicar filtros</button>
        <button id="h_limpiar" class="px-4 py-2.5 rounded-lg border border-slate-300 text-sm">Limpiar</button>
        <button id="h_csv" class="px-4 py-2.5 rounded-lg border border-slate-300 text-sm">Exportar CSV</button>
      </div>
    </div>
    <p class="text-sm text-slate-500 mb-3">${ventas.length} ventas · ${money(total)}</p>
    ${ventas.length === 0 ? vacio('No hay ventas registradas todavía.') : `
    <div class="bg-white rounded-xl border border-slate-200 overflow-x-auto">
      <table class="w-full text-sm">
        <thead class="bg-slate-50 text-slate-500 text-left">
          <tr><th class="px-4 py-3">Venta</th><th class="px-4 py-3">Fecha</th><th class="px-4 py-3">Total</th>
              <th class="px-4 py-3">Método</th><th class="px-4 py-3">Cliente</th><th class="px-4 py-3"></th></tr></thead>
        <tbody>${ventas.map(v => `
          <tr class="border-t border-slate-100 cursor-pointer hover:bg-slate-50" data-ver="${v.id}">
            <td class="px-4 py-3 font-medium">#${v.consecutivo} <span class="text-xs text-slate-400">FS${v.periods?.numero ?? ''}</span></td>
            <td class="px-4 py-3">${fecha(v.created_at)}</td>
            <td class="px-4 py-3 tabular-nums">${money(v.total)}</td>
            <td class="px-4 py-3 capitalize">${esc(v.metodo_pago)}
              ${v.estado_credito === 'pendiente' ? badge('Pendiente', 'ambar') : ''}
              ${v.estado_credito === 'pagado' ? badge('Pagado', 'verde') : ''}</td>
            <td class="px-4 py-3">${esc(v.customers?.nombre || '—')}</td>
            <td class="px-4 py-3 text-right text-slate-400">ver</td>
          </tr>`).join('')}</tbody>
      </table>
    </div>`}`;

  document.getElementById('h_aplicar').onclick = () => {
    filtrosHist = {
      desde: document.getElementById('h_desde').value,
      hasta: document.getElementById('h_hasta').value,
      metodo: document.getElementById('h_metodo').value,
      estadoCredito: document.getElementById('h_estado').value
    };
    verHistorial();
  };
  document.getElementById('h_limpiar').onclick = () => {
    filtrosHist = { desde: '', hasta: '', metodo: '', estadoCredito: '' }; verHistorial();
  };
  document.getElementById('h_csv').onclick = () => exportarCSV('ventas.csv', ventas.map(v => ({
    venta: v.consecutivo, fin_de_semana: v.periods?.numero ?? '', fecha: fecha(v.created_at),
    total: v.total, metodo: v.metodo_pago, cliente: v.customers?.nombre || '',
    estado_credito: v.estado_credito || ''
  })));
  vista.querySelectorAll('[data-ver]').forEach(tr =>
    tr.onclick = () => verDetalleVenta(ventas.find(v => v.id == tr.dataset.ver)));
}

async function verDetalleVenta(venta) {
  abrirModal(`Venta #${venta.consecutivo}`, cargando());
  const items = await db.detalleVenta(venta.id);
  document.querySelector('#modal .p-5').innerHTML = `
    ${items.map(i => `
      <div class="flex justify-between py-2 border-b border-slate-100 text-sm">
        <div><p>${esc(i.nombre_producto)}</p>
             <p class="text-xs text-slate-500">${i.cantidad} × ${money(i.precio_unitario)}</p></div>
        <span class="tabular-nums">${money(i.subtotal)}</span>
      </div>`).join('')}
    <div class="flex justify-between font-semibold py-3 text-lg"><span>Total</span><span class="tabular-nums">${money(venta.total)}</span></div>
    <div class="text-sm text-slate-600 space-y-1">
      <p>Método de pago: <span class="capitalize">${esc(venta.metodo_pago)}</span></p>
      ${venta.customers ? `<p>Cliente: ${esc(venta.customers.nombre)}</p>` : ''}
      ${venta.estado_credito ? `<p>Estado: ${venta.estado_credito === 'pendiente' ? 'Pendiente' : 'Pagado'}</p>` : ''}
      ${venta.fecha_pago ? `<p>Pagado el: ${fecha(venta.fecha_pago)}</p>` : ''}
      <p>Fecha: ${fecha(venta.created_at)}</p>
    </div>`;
}

// ============================================================
// CIERRE DE FIN DE SEMANA
// ============================================================
async function verCierre() {
  const [p, periodos] = await Promise.all([db.resumenPeriodo(), db.periodos()]);
  periodoActivo = p;
  const ganancia = p ? Number(p.facturacion) - Number(p.gastos) : 0;

  vista.innerHTML = `
    ${p ? `
    <div class="bg-white rounded-xl border border-slate-200 p-5 mb-6">
      <div class="flex justify-between items-start mb-4 flex-wrap gap-3">
        <div><h2 class="font-medium">Resumen del fin de semana #${p.numero}</h2>
             <p class="text-sm text-slate-500">Abierto desde ${fecha(p.fecha_inicio, false)}</p></div>
        <div class="flex gap-2 no-print">
          <button id="imprimir" class="px-4 py-2.5 rounded-lg border border-slate-300 text-sm">Imprimir reporte</button>
          <button id="cerrar" class="px-4 py-2.5 rounded-lg text-white text-sm" style="background:#B8412F">Cerrar fin de semana</button>
        </div>
      </div>
      <div class="grid grid-cols-2 md:grid-cols-4 gap-3">
        ${card('Ventas', p.ventas)}
        ${card('Facturación', money(p.facturacion))}
        ${card('Materia prima', money(p.gastos))}
        ${card('Ganancia estimada', money(ganancia))}
        ${card('Efectivo', money(p.efectivo))}
        ${card('Nequi', money(p.nequi))}
        ${card('Crédito', money(p.credito))}
        ${card('Créditos pendientes', p.creditos_pendientes, money(p.pendiente_cobrar))}
      </div>
      <p class="text-sm text-slate-500 mt-4">Producto más vendido: ${p.producto_top ? esc(p.producto_top.nombre) + ' (' + p.producto_top.cantidad + ')' : '—'}</p>
    </div>` : vacio('No hay un fin de semana activo.')}

    <h2 class="font-medium mb-3">Fines de semana anteriores</h2>
    ${periodos.filter(x => x.estado === 'cerrado').length === 0
      ? vacio('Todavía no has cerrado ningún fin de semana.')
      : `<div class="bg-white rounded-xl border border-slate-200 overflow-x-auto">
      <table class="w-full text-sm">
        <thead class="bg-slate-50 text-slate-500 text-left">
          <tr><th class="px-4 py-3">Período</th><th class="px-4 py-3">Fechas</th><th class="px-4 py-3">Ventas</th>
              <th class="px-4 py-3">Facturación</th><th class="px-4 py-3">Gastos</th><th class="px-4 py-3">Ganancia</th></tr></thead>
        <tbody>${periodos.filter(x => x.estado === 'cerrado').map(x => `
          <tr class="border-t border-slate-100">
            <td class="px-4 py-3 font-medium">Fin de semana #${x.numero}</td>
            <td class="px-4 py-3 text-slate-500">${fecha(x.fecha_inicio, false)} — ${fecha(x.fecha_cierre, false)}</td>
            <td class="px-4 py-3 tabular-nums">${x.resumen_ventas ?? 0}</td>
            <td class="px-4 py-3 tabular-nums">${money(x.resumen_facturacion)}</td>
            <td class="px-4 py-3 tabular-nums">${money(x.resumen_gastos)}</td>
            <td class="px-4 py-3 tabular-nums font-medium">${money(Number(x.resumen_facturacion) - Number(x.resumen_gastos))}</td>
          </tr>`).join('')}</tbody>
      </table></div>`}`;

  if (!p) return;
  document.getElementById('imprimir').onclick = () => window.print();
  document.getElementById('cerrar').onclick = async () => {
    const ok = await confirmar(
      `Vas a cerrar el fin de semana #${p.numero} con ${p.ventas} ventas y ${money(p.facturacion)} facturados. ` +
      `Nada se borra: se guarda el resumen y se abre el fin de semana #${p.numero + 1}.`, 'Cerrar el período');
    if (!ok) return;
    try {
      const nuevo = await db.cerrarPeriodo();
      toast(`Período cerrado. Ahora estás en el fin de semana #${nuevo}.`);
      await refrescarPeriodo(); verCierre();
    } catch (e) { toast(e.message, 'error'); }
  };
}
