# Realtime Presence

Purpose: describe online-user presence behavior used by header badges and active-route hints.

## Source of Truth

- Hook: `hooks/useLivePresence.ts`
- Endpoint: `app/api/presence/route.ts`
- Constants: `lib/constants/presence.ts`
- UI consumer: `components/common/LiveUsersBadges.tsx`

## Timing Constants

- `PRESENCE_HEARTBEAT_MS = 30000`
- `PRESENCE_POLL_MS = 15000`
- `PRESENCE_ONLINE_WINDOW_MS = 90000`
- `PRESENCE_MAX_BADGES = 5`

## Client Behavior

`useLivePresence()`:
- Sends immediate heartbeat on mount and when route changes.
- Polls online users every `PRESENCE_POLL_MS`.
- Sends a fresh heartbeat + reload when tab visibility returns.
- Treats network failures as non-blocking.

## API Behavior

`POST /api/presence`:
- Requires authenticated Clerk user.
- Accepts optional `path` and normalizes it (`/` prefix required, max length 160).
- Ensures profile initialization via `getUserProfile()`.
- Updates `userProfile.lastSeenAt` and `activePath`.

`GET /api/presence`:
- Requires authenticated Clerk user.
- Returns active users with `lastSeenAt >= now - PRESENCE_ONLINE_WINDOW_MS`.
- Filters `userProfile.isActive = true`, ordered by most recent, max 30 users.
- Returns no-store headers to avoid stale presence caching.

## Data Contract

Response user shape:
- `clerkId`
- `displayName`
- `activePath`
- `lastSeenAt`
- `isCurrentUser`

## Operational Notes

- Presence is soft-realtime (polling + heartbeat), not websocket-based.
- Absence of heartbeat for >90s marks user offline.
- Path updates are opportunistic and can be null.

## Update Trigger

Update this file when any of these change:
- `hooks/useLivePresence.ts`
- `app/api/presence/route.ts`
- `lib/constants/presence.ts`
- Presence badge rendering logic

## Related Docs

- [API Endpoints](./API_ENDPOINTS.md)
- [Prisma Changelog](./PRISMA_CHANGELOG.md)
