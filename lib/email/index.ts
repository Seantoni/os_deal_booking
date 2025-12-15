/**
 * Email module - Centralized email functionality
 * 
 * @module lib/email
 */

// Re-export configuration
export { resend, EMAIL_CONFIG } from './config'

// Re-export email templates
export { renderBookingRequestEmail } from './templates/booking-request'
export { renderBookingConfirmationEmail } from './templates/booking-confirmation'
export { renderRejectionEmail } from './templates/rejection'
export { renderTaskReminderEmail } from './templates/task-reminder'

// Re-export email services
export { sendBookingConfirmationEmail } from './services/booking-confirmation'
export { sendRejectionEmail } from './services/rejection'
export { sendAllTaskReminders } from './services/task-reminder'

