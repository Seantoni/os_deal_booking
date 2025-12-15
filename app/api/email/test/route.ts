/**
 * Test Email API Route
 * 
 * Allows admins to send test emails for preview purposes
 */

import { NextResponse } from 'next/server'
import { auth, currentUser } from '@clerk/nextjs/server'
import { isAdmin } from '@/lib/auth/roles'
import { resend, EMAIL_CONFIG } from '@/lib/email'
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
    const { template, to } = body

    if (!template || !to) {
      return NextResponse.json(
        { success: false, error: 'Missing required fields: template and to' },
        { status: 400 }
      )
    }

    const appBaseUrl = getAppBaseUrl()

    // Generate email HTML based on template
    let html = ''
    let subject = ''

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
        subject = '[TEST] Confirmación de Reserva - OfertaSimple'
        break

      case 'booking-request':
        html = renderBookingRequestEmail({
          requestName: 'Ejemplo de Solicitud de Booking',
          businessEmail: to,
          merchant: 'Restaurante Ejemplo',
          category: 'Restaurantes',
          startDate: '1 de enero de 2025',
          endDate: '31 de enero de 2025',
          approveUrl: `${appBaseUrl}/api/booking-requests/approve?token=test-token`,
          rejectUrl: `${appBaseUrl}/api/booking-requests/reject?token=test-token`,
          description: 'Esta es una descripción de ejemplo para la solicitud.',
        })
        subject = '[TEST] Solicitud de Booking - OfertaSimple'
        break

      case 'rejection':
        html = renderRejectionEmail({
          requestName: 'Ejemplo de Solicitud de Booking',
          merchant: 'Restaurante Ejemplo',
          rejectionReason: 'Esta es una razón de rechazo de ejemplo. El negocio no cumple con los requisitos necesarios en este momento.',
        })
        subject = '[TEST] Solicitud de Booking Rechazada - OfertaSimple'
        break

      case 'task-reminder':
        html = renderTaskReminderEmail({
          userName: 'Usuario de Prueba',
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
        subject = '[TEST] Recordatorio de Tareas - OfertaSimple'
        break

      default:
        return NextResponse.json(
          { success: false, error: `Invalid template: ${template}` },
          { status: 400 }
        )
    }

    // Send email
    const result = await resend.emails.send({
      from: EMAIL_CONFIG.from,
      to,
      replyTo: EMAIL_CONFIG.replyTo,
      subject,
      html,
    })

    if (result.error) {
      logger.error(`Failed to send test email to ${to}:`, result.error)
      return NextResponse.json(
        { success: false, error: result.error.message },
        { status: 500 }
      )
    }

    logger.info(`Test email sent to ${to} (template: ${template})`)
    return NextResponse.json({
      success: true,
      message: `Test email sent to ${to}`,
    })
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error'
    logger.error('Error sending test email:', error)
    return NextResponse.json(
      { success: false, error: errorMessage },
      { status: 500 }
    )
  }
}

