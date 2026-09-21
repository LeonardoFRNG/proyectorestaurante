// ============================================================
// DATOS — único lugar donde se habla con Supabase.
// Cada función lanza un Error con mensaje entendible si algo falla.
// ============================================================

function fallar(error, mensajeAmable) {
  console.error(error);
  throw new Error(mensajeAmable);
}

const db = {

  // ---------- PRODUCTOS ----------
  async productos(soloActivos = false) {
    let q = sb.from('products').select('*').order('nombre');
    if (soloActivos) q = q.eq('activo', true);
    const { data, error } = await q;
    if (error) fallar(error, 'No se pudieron cargar los productos.');
    return data;
  },
  async crearProducto(p) {
    const { error } = await sb.from('products').insert(p);
    if (error) fallar(error, error.code === '23505'
      ? 'Ya existe un producto con ese nombre.'
      : 'No se pudo crear el producto.');
  },
  async editarProducto(id, p) {
    const { error } = await sb.from('products')
      .update({ ...p, updated_at: new Date().toISOString() }).eq('id', id);
    if (error) fallar(error, 'No se pudo guardar el producto.');
  },
  async cambiarEstadoProducto(id, activo) {
    const { error } = await sb.from('products').update({ activo }).eq('id', id);
    if (error) fallar(error, 'No se pudo cambiar el estado del producto.');
  },
  async eliminarProducto(id) {
    const { error } = await sb.from('products').delete().eq('id', id);
    // 23503 = el producto está usado en ventas: no se borra, se desactiva.
    if (error && error.code === '23503') {
      await db.cambiarEstadoProducto(id, false);
      return 'desactivado';
    }
    if (error) fallar(error, 'No se pudo eliminar el producto.');
    return 'eliminado';
  },

  // ---------- VENTAS ----------
  async registrarVenta(items, metodoPago, cliente) {
    const { data, error } = await sb.rpc('registrar_venta', {
      p_items: items, p_metodo_pago: metodoPago, p_cliente: cliente || null
    });
    if (error) fallar(error, error.message?.includes('período activo')
      ? 'No hay un fin de semana activo. Ábrelo en Cierre de fin de semana.'
      : 'No se pudo guardar la venta. Revisa tu conexión e inténtalo otra vez.');
    return data;
  },
  async ventas(filtros = {}) {
    let q = sb.from('sales')
      .select('*, customers(nombre), periods(numero)')
      .order('created_at', { ascending: false });
    if (filtros.periodId) q = q.eq('period_id', filtros.periodId);
    if (filtros.metodo) q = q.eq('metodo_pago', filtros.metodo);
    if (filtros.estadoCredito) q = q.eq('estado_credito', filtros.estadoCredito);
    if (filtros.desde) q = q.gte('created_at', filtros.desde + 'T00:00:00-05:00');
    if (filtros.hasta) q = q.lte('created_at', filtros.hasta + 'T23:59:59-05:00');
    if (filtros.limite) q = q.limit(filtros.limite);
    const { data, error } = await q;
    if (error) fallar(error, 'No se pudo cargar el historial de ventas.');
    return data;
  },
  async detalleVenta(saleId) {
    const { data, error } = await sb.from('sale_items').select('*').eq('sale_id', saleId).order('id');
    if (error) fallar(error, 'No se pudo cargar el detalle de la venta.');
    return data;
  },

  // ---------- CRÉDITOS ----------
  async creditos(estado) {
    let q = sb.from('sales').select('*, customers(nombre)')
      .eq('metodo_pago', 'credito').order('created_at', { ascending: false });
    if (estado) q = q.eq('estado_credito', estado);
    const { data, error } = await q;
    if (error) fallar(error, 'No se pudieron cargar los créditos.');
    return data;
  },
  async pagarCredito(saleId) {
    const { error } = await sb.rpc('pagar_credito', { p_sale_id: saleId });
    if (error) fallar(error, 'No se pudo marcar el crédito como pagado.');
  },

  // ---------- MATERIA PRIMA ----------
  async gastos(periodId) {
    let q = sb.from('expenses').select('*').order('fecha', { ascending: false }).order('id', { ascending: false });
    if (periodId) q = q.eq('period_id', periodId);
    const { data, error } = await q;
    if (error) fallar(error, 'No se pudieron cargar los gastos.');
    return data;
  },
  async crearGasto(g) {
    const { error } = await sb.from('expenses').insert(g);
    if (error) fallar(error, 'No se pudo guardar el gasto.');
  },
  async editarGasto(id, g) {
    const { error } = await sb.from('expenses').update(g).eq('id', id);
    if (error) fallar(error, 'No se pudo guardar el gasto.');
  },
  async eliminarGasto(id) {
    const { error } = await sb.from('expenses').delete().eq('id', id);
    if (error) fallar(error, 'No se pudo eliminar el gasto.');
  },

  // ---------- PERÍODOS Y RESÚMENES ----------
  async resumenPeriodo(periodId = null) {
    const { data, error } = await sb.rpc('resumen_periodo', { p_period_id: periodId });
    if (error) fallar(error, 'No se pudo cargar el resumen del período.');
    return data;
  },
  async resumenHistorico() {
    const { data, error } = await sb.rpc('resumen_historico');
    if (error) fallar(error, 'No se pudo cargar el histórico.');
    return data;
  },
  async periodos() {
    const { data, error } = await sb.from('periods').select('*').order('numero', { ascending: false });
    if (error) fallar(error, 'No se pudieron cargar los períodos.');
    return data;
  },
  async cerrarPeriodo() {
    const { data, error } = await sb.rpc('cerrar_periodo');
    if (error) fallar(error, 'No se pudo cerrar el período.');
    return data;
  }
};
