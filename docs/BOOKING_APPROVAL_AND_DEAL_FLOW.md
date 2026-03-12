# Booking Approval And Deal Flow

This document describes how booking approval, event booking, and internal deal creation should work after the recent fixes.

## Goal

There should be exactly one safe path that turns a booking request into a booked request with an internal deal:

1. A request is approved.
2. Approval guarantees there is a linked approved event.
3. The UI opens that linked event, even if it is outside the current calendar range.
4. Booking happens only through `bookEvent`.
5. `bookEvent` performs the internal DB transition atomically:
   - `event.status -> booked`
   - `bookingRequest.status -> booked`
   - `deal upsert by bookingRequestId`
6. Non-blocking side effects happen after the DB commit:
   - deal assignment email
   - marketing campaign creation
   - external OfertaSimple sync
   - booking confirmation email
7. If a non-blocking side effect fails, the booking still succeeds and the UI shows success with warnings.

## Expected Behavior

### 1. Approval must guarantee an approved event exists

When a booking request transitions from `pending` to `approved`, the system must ensure there is a linked event in `approved` state.

If the request already has an event:
- update that event to match the request data
- keep it linked to the request

If the request does not have an event:
- create one
- save its ID back to `bookingRequest.eventId`

This prevents approved requests from existing in a half-state where the request is approved but there is no event to book.

### 2. The pending sidebar must resolve the real linked event from the server

The calendar sidebar must not rely on the currently loaded calendar range to decide whether a request has an event.

Correct behavior:
- when a request is clicked from the pending sidebar, resolve the canonical event from the server
- if an event exists, open that event in the modal
- only fall back to create mode when the server confirms there is no linked event
- if the request says it has an `eventId` but the event cannot be resolved, show an error instead of silently creating a new event

This avoids the old bug where an off-screen event made the UI accidentally use the create path.

### 3. `createEvent` must not book linked requests

`createEvent` can still create a linked event, but it must not:
- mark the request as `booked`
- create the internal deal
- send the booking confirmation email
- send the request to the booking-only side effects

If `createEvent` is used with a linked request, it should only create and link the event.

Booking is a separate step handled only by `bookEvent`.

### 4. `bookEvent` is the single booking path

`bookEvent` owns the transition from an approved or pending event to a booked event.

Internal DB work must happen inside one transaction:
- lock in the final booked event status
- mark the linked request as booked
- upsert the internal deal by `bookingRequestId`

This means a request should no longer be able to end up booked without the internal deal existing.

### 5. Email failures must not look like booking failures

Booking confirmation email is a post-booking side effect.

Correct behavior:
- if the email sends successfully, no warning is needed
- if the email fails, booking still succeeds
- the UI should still show the booking success state
- the UI may also show a warning explaining that the confirmation email failed

This avoids the old case where the DB was already updated but the user saw an error because the email service threw late in the flow.

### 6. Deals page should refresh after request mutations

When `BookingRequestViewModal` mutates a request from within the deals page, the deals page should refresh its data after the mutation completes.

This prevents stale UI where:
- the deal already exists in the database
- but the deals table still shows old data until manual refresh

## Files Involved

### Core server flow

- `lib/booking-requests/approval.ts`
  - shared approval transition
  - ensures an approved event exists for approved requests

- `app/actions/events.ts`
  - `createEvent`
  - `bookEvent`
  - `getEventForBookingRequest`
  - calendar refresh and linked event resolution

### Calendar UI

- `components/events/EventsPageClient.tsx`
  - handles pending sidebar click behavior
  - now resolves linked events from the server instead of trusting the visible calendar state

- `components/events/EventModal.tsx`
  - edit/create modal for events
  - calls `bookEvent`
  - displays success plus warnings when post-booking side effects fail

### Booking request modal and deals page refresh

- `components/booking/request-view/BookingRequestViewModal.tsx`
  - emits mutation notifications after approve/cancel/edit flows

- `app/(app)/deals/DealsPageClient.tsx`
  - refreshes deals data after request mutations triggered from the booking request modal

## Invariants To Preserve

These are the rules we should keep true going forward:

- An approved request should always have an approved event.
- Booking should happen only through `bookEvent`.
- A booked request should always have an internal deal.
- Side-effect failures should not roll back or hide a successful booking.
- The UI should never create a second event just because the linked event was not in the current client-side calendar window.

## Legacy Data Note

These fixes prevent new inconsistent state.

They do not automatically clean up old data that may already exist, such as:
- duplicate events linked to the same booking request
- approved requests with missing or stale `eventId`
- booked requests created before the transactional deal upsert existed
