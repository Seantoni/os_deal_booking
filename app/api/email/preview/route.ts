/**
 * Email Preview API Route
 * 
 * Generates email preview HTML on the server side to avoid
 * importing server-only code in client components
 */

import { NextResponse } from 'next/server'
import { auth } from '@clerk/nextjs/server'
import { isAdmin } from '@/lib/auth/roles'
import { renderBookingConfirmationEmail } from '@/lib/email/templates/booking-confirmation'
import { renderBookingRequestEmail } from '@/lib/email/templates/booking-request'
import { renderRejectionEmail } from '@/lib/email/templates/rejection'
import { renderTaskReminderEmail } from '@/lib/email/templates/task-reminder'
import { getAppBaseUrl } from '@/lib/config/env'
import { logger } from '@/lib/logger'

type EmailTemplateType = 'booking-confirmation' | 'booking-request' | 'rejection' | 'task-reminder'

export async function POST(req: Request) {
  try {
    // Check authentication
    const { userId } = await auth()
    if (!userId) {
      return NextResponse.json(
        { success: false, error: 'Unauthorized' },
        { status: 401 }
      )
    }

    // Check admin role
    const userIsAdmin = await isAdmin()
    if (!userIsAdmin) {
      return NextResponse.json(
        { success: false, error: 'Forbidden: Admin access required' },
        { status: 403 }
      )
    }

    const body = await req.json()
    const { template } = body

    if (!template) {
      return NextResponse.json(
        { success: false, error: 'Missing required field: template' },
        { status: 400 }
      )
    }

    const appBaseUrl = getAppBaseUrl()

    // Generate email HTML based on template
    let html = ''

    switch (template as EmailTemplateType) {
      case 'booking-confirmation':
        html = renderBookingConfirmationEmail({
          eventName: 'Ejemplo de Evento de Prueba',
          merchant: 'Restaurante Ejemplo',
          category: 'Restaurantes',
          startDate: '1 de enero de 2025',
          endDate: '31 de enero de 2025',
          description: 'Esta es una descripción de ejemplo para el evento.',
        })
        break

      case 'booking-request':
        html = renderBookingRequestEmail({
          requestName: 'Ejemplo de Solicitud de Booking',
          businessEmail: 'negocio@ejemplo.com',
          merchant: 'Restaurante Ejemplo',
          category: 'Restaurantes',
          startDate: '1 de enero de 2025',
          endDate: '31 de enero de 2025',
          approveUrl: `${appBaseUrl}/api/booking-requests/approve?token=test-token`,
          rejectUrl: `${appBaseUrl}/api/booking-requests/reject?token=test-token`,
          description: 'Esta es una descripción de ejemplo para la solicitud.',
        })
        break

      case 'rejection':
        html = renderRejectionEmail({
          requestName: 'Ejemplo de Solicitud de Booking',
          merchant: 'Restaurante Ejemplo',
          rejectionReason: 'Esta es una razón de rechazo de ejemplo. El negocio no cumple con los requisitos necesarios en este momento.',
        })
        break

      case 'task-reminder':
        html = renderTaskReminderEmail({
          userName: 'Juan Pérez',
          dueTodayTasks: [
            {
              id: '1',
              title: 'Reunión con cliente importante',
              date: new Date(),
              category: 'meeting',
              notes: 'Preparar propuesta comercial',
              opportunity: {
                id: 'opp1',
                stage: 'propuesta_enviada',
                business: {
                  id: 'b1',
                  name: 'Restaurante Ejemplo',
                },
              },
            },
            {
              id: '2',
              title: 'Completar documentación',
              date: new Date(),
              category: 'todo',
              notes: null,
              opportunity: {
                id: 'opp2',
                stage: 'reunion',
                business: {
                  id: 'b2',
                  name: 'Café Central',
                },
              },
            },
          ],
          overdueTasks: [
            {
              id: '3',
              title: 'Tarea vencida de ejemplo',
              date: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000), // 2 days ago
              category: 'todo',
              notes: 'Esta tarea está vencida',
              opportunity: {
                id: 'opp3',
                stage: 'iniciacion',
                business: {
                  id: 'b3',
                  name: 'Hotel Ejemplo',
                },
              },
            },
          ],
          appBaseUrl,
        })
        break

      default:
        return NextResponse.json(
          { success: false, error: `Invalid template: ${template}` },
          { status: 400 }
        )
    }

    return NextResponse.json({
      success: true,
      html,
    })
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error'
    logger.error('Error generating email preview:', error)
    return NextResponse.json(
      { success: false, error: errorMessage },
      { status: 500 }
    )
  }
}

