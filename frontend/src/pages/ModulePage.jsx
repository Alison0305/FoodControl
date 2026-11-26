import { Construction } from 'lucide-react'

import { EmptyState, PageHeader, StatusBadge } from '../components/ui.jsx'

function ModulePage({ title, description, icon: Icon = Construction }) {
  return (
    <div className="space-y-8">
      <PageHeader title={title} description={description}>
        <StatusBadge />
      </PageHeader>
      <EmptyState icon={Icon} title={`${title} estará disponible pronto`} description="Este módulo todavía no tiene operaciones disponibles. Se habilitará en una próxima etapa del sistema." />
    </div>
  )
}

export default ModulePage
