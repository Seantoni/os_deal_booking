# Complete A-Z Testing Plan: End-to-End Business Flow

## Pre-requisites
- Deploy to production/staging environment
- Have at least 2 user accounts (one admin, one sales user)
- Have access to email for approval/rejection links
- Clear browser cache or use incognito mode

---

## Complete A-Z Flow Test

### **STEP 1: Create Business**
**Goal:** Create a new business entity

#### Steps:
1. Navigate to **Businesses** page (`/businesses`)
2. Click the **"Nueva Empresa"** button (top right or in header)
3. Fill in required fields:
   - **Business name:** `Restaurante Test Alpha`
   - **Contact name:** `Juan Pérez`
   - **Contact phone:** `+507 1234-5678`
   - **Contact email:** `juan@restaurantetest.com`
   - **Category:** Select a category (e.g., "Restaurantes")
4. Fill in additional fields if available:
   - RUC, address, bank info, etc.
5. Click **"Guardar"** / "Save"

#### Expected Result:
- ✅ Business is created successfully
- ✅ Success toast message appears
- ✅ Business appears in businesses list
- ✅ Can view business details page

---

### **STEP 2: Create Opportunity**
**Goal:** Create opportunity linked to business, verify responsible defaults to creator

#### Steps:
1. Navigate to **Businesses** page (`/businesses`)
2. Find the business created in Step 1 (`Restaurante Test Alpha`)
3. Click the **handshake icon** (🤝) button in the actions column to create opportunity for this business
   - OR open the business detail modal and use the opportunities section
4. In the opportunity modal that opens:
   - **Select Business:** Choose `Restaurante Test Alpha` (created in Step 1)
   - **Verify:** "Responsable *" field is **pre-filled with your user name** (creator)
   - **Verify:** Asterisk (*) indicates required field
   - **Stage:** `Iniciación` (default)
   - **Start date:** Today's date
   - **Notes:** `Initial contact made, interested in partnership`
4. **Validation Test:** Try to clear/reset the "Responsable" field
   - **Expected:** Save button becomes **disabled** (grayed out)
   - **Expected:** If you somehow submit, error: "Debe seleccionar un responsable para la oportunidad"
5. Ensure responsible is selected (should be pre-filled)
6. Click **"Guardar"** / "Save"

#### Expected Result:
- ✅ Opportunity is created successfully
- ✅ Responsible user is set to creator (you)
- ✅ Opportunity appears in opportunities list with stage "Iniciación"
- ✅ Opportunity is linked to the business
- ✅ Cannot save without responsible user

---

### **STEP 3: Add Tasks to Opportunity**
**Goal:** Create tasks and verify responsible/business info in task modal

#### Steps:
1. Open the opportunity created in Step 2
2. Go to **"Actividad"** / "Activity" tab
3. Click **"Nueva Tarea"** / "New Task"
4. In task modal, **verify at the top:**
   - **Left side:** Person icon + responsible user name (your name)
   - **Right side:** Business name (`Restaurante Test Alpha`) + open icon (↗) - **clickable**
   - Design should be minimalistic (small text, subtle colors)
5. Create a **Todo task:**
   - Category: `Tarea`
   - Title: `Follow up call`
   - Date: Tomorrow's date
   - Notes: `Call to discuss partnership details`
6. Click **"Crear"** / "Create"
7. Create a **Meeting task:**
   - Click **"Nueva Tarea"** again
   - Category: `Reunión`
   - **Verify:** Responsible and business info still visible at top
   - Reunión con: `María González`
   - Posición: `Gerente General`
   - ¿Es decisor?: `Sí`
   - Detalle: `Discuss partnership terms and pricing`
   - Date: Next week
8. Click **"Crear"** / "Create"

#### Expected Result:
- ✅ Both tasks are created
- ✅ Tasks appear in activity list
- ✅ Responsible and business info visible in task modal
- ✅ Business name link is clickable (opens opportunity)

---

### **STEP 4: Progress Opportunity Through Stages**
**Goal:** Move opportunity through pipeline stages

#### Steps:
1. Open the opportunity from Step 2
2. In the opportunity modal, use the **pipeline/stage selector** at the top
3. Change stage from `Iniciación` → `Reunión`
   - **Verify:** Stage updates successfully
   - **Verify:** Activity log shows stage change
4. Complete the meeting task:
   - Go to "Actividad" tab
   - Click on the meeting task created in Step 3
   - Mark "¿Ya se tuvo la reunión?" as `Sí`
   - Fill in outcome fields:
     - ¿Se llegó a un acuerdo?: `Sí`
     - Siguientes pasos: `Send proposal next week`
   - Click **"Actualizar"**
   - **Verify:** Dialog asks if you want to mark opportunity as "Won"
   - Click **"No, mantener estado actual"** (for now)
5. Change stage to `Propuesta Enviada`
6. Change stage to `Propuesta Aprobada`
7. Finally, change stage to **`Won`** (Ganada)

#### Expected Result:
- ✅ Opportunity progresses through all stages
- ✅ Stage changes are saved
- ✅ Activity log records all changes
- ✅ Meeting completion triggers "Won" prompt
- ✅ Opportunity can be marked as Won

---

### **STEP 5: Create Booking Request from Won Opportunity**
**Goal:** Create booking request when opportunity is Won

#### Steps:
1. With the opportunity in **`Won`** stage (from Step 4)
2. In the opportunity modal, look for **"Crear Solicitud"** / "Create Request" button
   - OR navigate to opportunity details and find request creation option
3. Click to create booking request
   - **Verify:** Request form is pre-filled with business data
   - Business name, contact info, category should be auto-filled
4. Fill in booking request details:
   - **Deal name:** `Oferta Restaurante Test Alpha`
   - **Start date:** Next month
   - **End date:** 3 months from start
   - **Category details:** Should match business category
   - **Pricing options:** Add at least one pricing tier
   - **Description fields:** Fill in offer details
5. Click **"Enviar"** / "Send" (NOT "Guardar borrador")

#### Expected Result:
- ✅ Booking request is created
- ✅ Request status is `pending`
- ✅ Request is linked to the opportunity (`hasRequest: true`)
- ✅ A **pending event** is created in calendar
- ✅ Email is sent to business with approval/rejection links

---

### **STEP 6: Send Booking Request (Verify Email)**
**Goal:** Verify request is sent and email notifications work

#### Steps:
1. Check the email inbox for the business contact (`juan@restaurantetest.com`)
2. **Verify email contains:**
   - Request details
   - **Approve link** (with token)
   - **Reject link** (with token)
   - Business name and deal information
3. In the app, navigate to **Booking Requests** page (`/booking-requests`)
4. **Verify request appears:**
   - Status: `pending`
   - Business name: `Restaurante Test Alpha`
   - Created date: Today
   - Can view request details

#### Expected Result:
- ✅ Email is sent successfully
- ✅ Approval/rejection links are included
- ✅ Request appears in booking requests list
- ✅ Status is `pending`

---

### **STEP 7: Approve Booking Request (Via Email Link)**
**Goal:** Business approves request via email link

#### Steps:
1. Open the **approval email** sent in Step 6
2. Click the **"Approve"** / "Aprobar" link
3. **Verify:** Browser opens approval confirmation page
   - Shows request details
   - Confirms approval
   - May show success message
4. Return to the app, navigate to **Booking Requests** page
5. **Verify request status changed:**
   - Status: `approved` (green badge)
   - Processed date: Today
   - Processed by: Business email
6. Navigate to **Events** / **Calendar** page
7. **Verify event status:**
   - Event exists in calendar
   - Status: `approved` (changed from `pending`)

#### Expected Result:
- ✅ Approval link works correctly
- ✅ Request status changes to `approved`
- ✅ Event status updates to `approved`
- ✅ Confirmation page displays correctly

---

### **STEP 8: Create Event from Approved Request**
**Goal:** Verify event can be created/confirmed from approved request

#### Steps:
1. Navigate to **Events** / **Calendar** page (`/events`)
2. Find the event created from the approved request
3. **Verify event details:**
   - Name matches booking request
   - Dates match request dates
   - Status: `approved`
   - Linked to booking request
4. Click on the event to open event modal
5. **Verify event information:**
   - All request data is visible
   - Can see business details
   - Can see deal information

#### Expected Result:
- ✅ Event exists in calendar
- ✅ Event has correct status (`approved`)
- ✅ Event is linked to booking request
- ✅ All data is correctly displayed

---

### **STEP 9: Book Event (Final Confirmation)**
**Goal:** Book the approved event, creating deal and marketing campaign

#### Steps:
1. In the **Events** page, find the approved event
2. Click on the event to open event modal
3. Look for **"Reservar"** / "Book" button (should be available for `approved` events)
4. Click **"Reservar"** / "Book"
5. **Verify confirmation:**
   - Event status changes to `booked`
   - Booking request status changes to `booked`
6. **Verify automatic creation:**
   - Navigate to **Deals** page (`/deals`)
   - **Verify:** A new deal was automatically created
   - Deal is linked to the booking request
7. Navigate to **Marketing** page (if exists)
   - **Verify:** Marketing campaign was automatically created
8. **Verify external API:**
   - Check logs/notifications for external OfertaSimple API call
   - Deal should be sent to external system

#### Expected Result:
- ✅ Event status: `booked`
- ✅ Booking request status: `booked`
- ✅ Deal is automatically created
- ✅ Marketing campaign is automatically created
- ✅ Deal is sent to external API
- ✅ Confirmation emails are sent

---

### **STEP 10: Reject Booking Request (Alternative Flow)**
**Goal:** Test rejection flow for a different request

#### Steps:
1. Create a **second opportunity** (repeat Steps 1-2 with different business)
2. Mark it as **Won**
3. Create a **second booking request** (repeat Step 5)
4. Send the request (repeat Step 6)
5. Open the **rejection email** (instead of approval)
6. Click the **"Reject"** / "Rechazar" link
7. **Verify:** Browser opens rejection form page
8. Fill in rejection reason:
   - Reason: `Pricing not suitable for our business model`
9. Submit rejection form
10. **Verify in app:**
    - Navigate to Booking Requests page
    - Request status: `rejected` (red badge)
    - Rejection reason is visible
    - Event status: `rejected` (if exists)

#### Expected Result:
- ✅ Rejection link works correctly
- ✅ Rejection form accepts reason
- ✅ Request status: `rejected`
- ✅ Event status: `rejected`
- ✅ Rejection reason is stored and displayed

---

### **STEP 11: Admin Direct Approval**
**Goal:** Test admin can approve requests directly in app

#### Steps:
1. As **admin user**, navigate to **Booking Requests** page
2. Find a request with status `pending`
3. Click **"Ver"** / "View" button to open request details
4. **Verify:** "Aprobar" / "Approve" button is visible (admin only)
5. Click **"Aprobar"** / "Approve"
6. **Verify confirmation dialog** (if any)
7. Confirm approval
8. **Verify:**
   - Request status changes to `approved`
   - Event status changes to `approved`
   - Success toast message appears
   - Email notifications sent

#### Expected Result:
- ✅ Admin can approve directly
- ✅ Status updates correctly
- ✅ Notifications are sent
- ✅ Non-admin users cannot see approve button

---

### **STEP 12: View Reservations**
**Goal:** Verify booked events appear in reservations

#### Steps:
1. Navigate to **Reservations** page (`/reservations`) - if exists
   - OR check **Events** page filtered by `booked` status
2. **Verify booked event appears:**
   - Event from Step 9 should be listed
   - Status: `booked`
   - Business name visible
   - Dates visible
3. Click on reservation to view details
4. **Verify all information:**
   - Business details
   - Deal information
   - Event dates
   - Linked booking request

#### Expected Result:
- ✅ Booked events appear in reservations
- ✅ All details are correct
- ✅ Can view full reservation information

---

## Feature-Specific Tests

### **Test A: Responsible User Requirement**
**Goal:** Verify responsible user is required and defaults correctly

#### Steps:
1. Create new opportunity
2. **Verify:** Responsible field is pre-filled with your user
3. Try to clear/reset responsible field
4. **Verify:** Save button is disabled
5. Try to submit form
6. **Verify:** Error message appears: "Debe seleccionar un responsable para la oportunidad"
7. Select responsible user
8. **Verify:** Save button becomes enabled
9. Save opportunity
10. **Verify:** Responsible is saved correctly

#### Expected Result:
- ✅ Responsible defaults to creator
- ✅ Cannot save without responsible
- ✅ Clear validation messages
- ✅ Save button state reflects validation

---

### **Test B: Task Modal Context Info**
**Goal:** Verify responsible and business link in task modal

#### Steps:
1. Open any opportunity
2. Create or edit a task
3. **Verify task modal shows:**
   - Top left: Person icon + responsible user name
   - Top right: Business name + open icon (↗)
   - Design is minimalistic (small text, subtle)
4. Click business name link
5. **Verify:** Task modal closes, opportunity modal stays open
6. Test from **Tasks page** (`/tasks`):
   - Open any task
   - **Verify:** Same context info appears
   - Click business link
   - **Verify:** Opportunity modal opens

#### Expected Result:
- ✅ Context info displays correctly
- ✅ Business link is clickable
- ✅ Navigation works correctly
- ✅ Works from multiple pages

---

### **Test C: Meeting Task Completion Flow**
**Goal:** Verify meeting completion triggers Won prompt

#### Steps:
1. Create opportunity in `Reunión` stage
2. Create a meeting task for today
3. Complete the meeting:
   - Mark "¿Ya se tuvo la reunión?" as `Sí`
   - Fill in: "¿Se llegó a un acuerdo?" = `Sí`
   - Fill in: "Siguientes pasos" = `Send proposal`
4. Save task
5. **Verify:** Dialog appears: "¿Desea marcar esta oportunidad como Ganada (Won)?"
6. Click "Sí, marcar como Ganada"
7. **Verify:** Opportunity stage changes to `Won`

#### Expected Result:
- ✅ Meeting completion triggers Won prompt
- ✅ Can mark opportunity as Won from dialog
- ✅ Stage updates correctly

---

## Edge Cases & Error Scenarios

### **Edge Case 1: Opportunity Without Business**
- Try creating opportunity without selecting business
- **Verify:** Form validation prevents this
- **Verify:** Responsible still defaults correctly when business is selected

### **Edge Case 2: Multiple Users**
- User A creates opportunity (responsible: User A)
- User A changes responsible to User B
- User B opens opportunity
- **Verify:** User B sees they are responsible
- User B creates task
- **Verify:** Task modal shows User B as responsible

### **Edge Case 3: Deleted/Inactive User**
- If responsible user is deleted/inactive:
  - **Verify:** System handles gracefully
  - **Verify:** Shows email or "Unknown" instead of crashing
  - **Verify:** Can reassign responsible

### **Edge Case 4: Already Processed Request**
- Try to approve an already-approved request
- **Verify:** System shows "already processed" message
- **Verify:** No duplicate processing occurs

### **Edge Case 5: Cancelled Request**
- Cancel a pending request
- Try to approve cancelled request
- **Verify:** System prevents approval of cancelled requests

---

## Regression Tests

### **R1: Existing Data**
- Open opportunities created before this update
- **Verify:** They still work correctly
- **Verify:** Responsible field shows existing value
- **Verify:** Can edit and save without issues

### **R2: Existing Tasks**
- Open existing tasks
- **Verify:** Task modal still works
- **Verify:** If opportunity has responsible, it displays correctly
- **Verify:** Business link works

### **R3: Pipeline View**
- Navigate to Pipeline page
- **Verify:** Opportunities display correctly
- **Verify:** Responsible filtering works (if applicable)
- **Verify:** Stage changes work

---

## Success Criteria Summary

### ✅ **Complete A-Z Flow:**
- Business → Opportunity → Tasks → Stages → Won → Request → Send → Approve → Event → Book → Deal → Marketing

### ✅ **Required Responsible:**
- Cannot save opportunity without responsible user
- Save button disabled when no responsible selected
- Clear error message on validation failure
- Defaults to creator automatically

### ✅ **Task Modal Context:**
- Shows responsible user name with icon
- Shows business name with link icon
- Business link navigates to opportunity
- Design is minimalistic and clean
- Works from opportunities page, tasks page, and activity tab

### ✅ **Booking Request Flow:**
- Can create from Won opportunity
- Email notifications sent correctly
- Approval/rejection links work
- Status updates correctly
- Events created and updated correctly

### ✅ **Event & Deal Flow:**
- Events created from requests
- Booking events creates deals automatically
- Marketing campaigns created automatically
- External API integration works
- Reservations display correctly

---

## Notes
- Test with different user roles (admin, sales, etc.)
- Test on different browsers if possible
- Check mobile responsiveness if applicable
- Verify Spanish translations are correct
- Monitor email delivery
- Check external API logs
- Verify all status transitions work correctly
