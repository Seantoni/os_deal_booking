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
export { renderDealAssignmentReadyEmail } from './templates/deal-assignment-ready'
export { renderDailyCommentsEmail } from './templates/daily-comments'
export { renderSalesMeetingReminderEmail } from './templates/sales-meeting-reminder'
export { 
  renderMentionNotificationEmail,
  renderMarketingMentionNotificationEmail,
  renderOpportunityMentionNotificationEmail,
  type MentionEntityType,
} from './templates/mention-notification'

// Re-export email services
export { sendBookingConfirmationEmail } from './services/booking-confirmation'
export { sendRejectionEmail } from './services/rejection'
export { sendAllTaskReminders } from './services/task-reminder'
export { sendDailyCommentsSummary } from './services/daily-comments'
export { sendSalesMeetingReminders } from './services/sales-meeting-reminder'
export { sendMentionNotificationEmail } from './services/mention-notification'
export { sendOpportunityMentionNotificationEmail } from './services/opportunity-mention-notification'
export { sendCronFailureEmail } from './services/cron-failure'
export { sendApiFailureEmail } from './services/api-failure'
export { sendDealAssignmentReadyEmail } from './services/deal-assignment-ready'
