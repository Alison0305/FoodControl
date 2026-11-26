import { StatusBadge } from './ui.jsx'

function JornadaStatusBadge({ estado }) {
  return <StatusBadge tone={estado === 'abierta' ? 'delivered' : 'neutral'}>{estado === 'abierta' ? 'Abierta' : 'Cerrada'}</StatusBadge>
}

export default JornadaStatusBadge
