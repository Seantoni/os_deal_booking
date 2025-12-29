/**
 * Translation utilities for user-facing text
 * Centralized location for all Spanish translations
 */

/**
 * Translate pipeline lifecycle stage labels
 * These represent the different phases in the pipeline workflow
 */
export function translatePipelineStage(stage: 'Opportunity' | 'Request' | 'Deal' | 'Event'): string {
  switch (stage) {
    case 'Opportunity':
      return 'Oportunidad'
    case 'Request':
      return 'Solicitud'
    case 'Deal':
      return 'Oferta'
    case 'Event':
      return 'Evento'
    default:
      return stage
  }
}

/**
 * Translate common status labels
 */
export function translateStatus(status: string): string {
  const statusMap: Record<string, string> = {
    'Approved': 'Aprobado',
    'Booked': 'Reservado',
    'Pre-Booked': 'Pre-Reservado',
    'Unknown': 'Desconocido',
    'Pending': 'Pendiente',
    'Draft': 'Borrador',
    'Rejected': 'Rechazado',
    'Cancelled': 'Cancelado',
    // Capitalized versions
    'approved': 'Aprobado',
    'booked': 'Reservado',
    'pending': 'Pendiente',
    'draft': 'Borrador',
    'rejected': 'Rechazado',
    'cancelled': 'Cancelado',
  }
  
  return statusMap[status] || status
}

/**
 * Translate common table headers and labels
 */
export function translateLabel(label: string): string {
  const labelMap: Record<string, string> = {
    'All': 'Todo',
    'Status': 'Estado',
    'Source': 'Origen',
    'Name': 'Nombre',
    'Email': 'Correo',
    'Dates': 'Fechas',
    'Created': 'Creado',
    'Days': 'Días',
    'Sent': 'Enviado',
    'Processed': 'Procesado',
    'Actions': 'Acciones',
    'Rejection Reason': 'Razón de Rechazo',
    'New Request': 'Nueva Solicitud',
    'Load More': 'Cargar Más',
    'Clear': 'Limpiar',
    'Delete': 'Eliminar',
    'Change Status...': 'Cambiar Estado...',
    'View request': 'Ver solicitud',
    'Edit request': 'Editar solicitud',
    'Resend email': 'Reenviar correo',
    'Delete request': 'Eliminar solicitud',
    'Select all': 'Seleccionar todo',
    'Deselect all': 'Deseleccionar todo',
    'Deselect': 'Deseleccionar',
    'Select': 'Seleccionar',
    'Search requests...': 'Buscar solicitudes...',
    'No requests found': 'No se encontraron solicitudes',
    'Try adjusting your search or filters': 'Intente ajustar su búsqueda o filtros',
    'Get started by creating a new request': 'Comience creando una nueva solicitud',
  }
  
  return labelMap[label] || label
}

