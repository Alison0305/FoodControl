export function availableOrderActions(estado) {
  if (estado === 'en_espera') return ['consultar', 'editar', 'preparar', 'cancelar']
  if (estado === 'en_preparacion') return ['consultar', 'editar', 'entregar', 'cancelar']
  return ['consultar']
}
