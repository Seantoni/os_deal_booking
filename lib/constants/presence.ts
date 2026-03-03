/**
 * Presence/online tracking constants
 */

/**
 * Client heartbeat interval to mark current user as online.
 */
export const PRESENCE_HEARTBEAT_MS = 30_000

/**
 * Poll interval for loading online users list.
 */
export const PRESENCE_POLL_MS = 15_000

/**
 * A user is considered online when seen within this window.
 */
export const PRESENCE_ONLINE_WINDOW_MS = 90_000

/**
 * Max number of user avatars shown in header.
 */
export const PRESENCE_MAX_BADGES = 5
