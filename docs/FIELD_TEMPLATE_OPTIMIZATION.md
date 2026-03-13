# Field Template Optimization Plan

**File:** `components/RequestForm/config/field-templates.ts`  
**Goal:** Reduce field count by ~35-40% — keep only what CS needs to resolve issues, write accurate deal copy, and prevent customer complaints.

---

## RESTAURANTE (26 fields → 13)

### Critical (keep as required)
- `restaurantValidDineIn` — #1 CS question: "Can I eat there?"
- `restaurantValidTakeout`
- `restaurantValidDelivery`
- `restaurantDeliveryCost` — prevents complaints (conditional on delivery=Yes)
- `restaurantDeliveryAreas` — prevents "you don't deliver to my area" disputes
- `restaurantVouchersPerOrder` — top CS issue: "Can I use 3 vouchers for my table?"
- `restaurantKitchenClosingTime` — prevents "showed up at 9:45 and they said no"
- `restaurantValidFullMenu` — prevents "voucher didn't cover my dish"
- `restaurantExcessPayment` — cash vs card friction at register
- `restaurantRequiresReservation` — walk-in vs reservation, top CS question

### Keep (not required)
- `restaurantApplicableBeverages` — alcohol vs non-alcohol complaint area
- `restaurantLunchHours` — helps CS answer "when can I go"
- `restaurantDinnerHours` — same

### Demote to optional
- `restaurantVoucherPersonRatio` — edge case, most deals don't enforce
- `restaurantOrderTime` — nice-to-have
- `restaurantOfferDishTypes` — overlaps with `validFullMenu`
- `restaurantExecutiveMenuIncluded` — only ~10% of restaurants
- `restaurantChildAgeCount` — rarely enforced or asked
- `restaurantAlcoholSubstitution` — very niche
- `restaurantOrderMethod` — low priority (conditional on delivery=Yes)

### Delete
- `restaurantHasTerrace` — marketing fluff, never a CS issue
- `restaurantChefName` — rarely applies, zero CS value
- `restaurantPrivateEvents` — not deal-relevant, creates false expectations
- `restaurantPrivateEventMinPeople` — conditional child of above
- `restaurantHouseSpecialty` — marketing copy, AI can generate this

---

## HOTEL (28 fields → ~15)

### Critical (keep as required)
- `hotelCheckIn` / `hotelCheckOut`
- `hotelMaxBookingDate` — "I tried to book but they said too late"
- `hotelMealTypes` — "Does it include breakfast?" #1 hotel question
- `hotelIncludesITBMS` — tax surprise = instant complaint
- `hotelIncludesHotelTax` — same
- `hotelChildPolicy` — families are a big segment
- `hotelMaxPeoplePerRoom` — prevents overbooking disputes
- `hotelRoomType` — "I expected a king bed"

### Keep (not required)
- `hotelConsecutiveVouchers` — common question for multi-night stays
- `hotelAdditionalPersonPrice` — prevents surprise charges
- `hotelAdditionalPersonIncludes` — companion to above
- `hotelValidHolidays` — high blackout complaint risk

### Demote to optional
- `hotelLateCheckOut` — nice-to-have
- `hotelLateCheckOutIncludesRoom` — conditional child
- `hotelMealsIncluded` — overlaps with `hotelMealTypes`
- `hotelMenuDescription` — detail for copy, not CS-critical
- `hotelLunchDay` — very specific, rarely asked
- `hotelIncludesParking` — rarely a complaint driver
- `hotelValidSchoolHolidays` — merge with `hotelValidHolidays` into one "Blackout dates" field

### Delete
- `hotelHasWiFi` — every hotel has WiFi
- `hotelValetParking` — too granular

### Collapse to 1 field (textarea "Política de mascotas")
- `hotelAcceptsPets`
- `hotelPetWeightLimit`
- `hotelPetCostPerDay`
- `hotelPetLimit`

### Delete
- `hotelAllowsFoodBeverages` — not deal-relevant

---

## EVENTOS (11 fields → 7)

### Critical
- `eventStartTime` / `eventEndTime`
- `eventDoorsOpenTime`
- `eventMinimumAge`
- `eventTicketPickupLocation`

### Keep
- `eventMainArtistTime`
- `eventOpenBarDetails` — prevents complaints

### Collapse to 1 field
- `eventTicketPickupStartTime` + `eventTicketPickupEndTime` → single "Horario de retiro de boletos"

### Demote
- `eventOpeningArtist` — marketing, not CS
- `eventChildrenPolicy` — only relevant if `minimumAge` allows kids

---

## Cross-Template Fixes

### 1. Shared "Válido en feriados?" field
Appears 15+ times across templates as separate fields. Move to a common section that all templates inherit.

**Affected:** `dentalValidHolidays`, `massageValidHolidays`, `nailsValidHolidays`, `facialValidHolidays`, `depilationValidHolidays`, `reducerValidHolidays`, `skinValidHolidays`, `autoValidHolidays`, `acAutoValidHolidays`, `acHomeValidHolidays`, `trainingValidHolidays`, `labValidHolidays`, `productValidHolidays`, `hotelValidHolidays`

### 2. Collapse pet policy fields everywhere
Hotels, tours, photography all have 3-4 pet fields. Replace with a single textarea "Política de mascotas" in each.

**Affected:**
- Hotel: `hotelAcceptsPets`, `hotelPetWeightLimit`, `hotelPetCostPerDay`, `hotelPetLimit`
- Tours: `tourAcceptsPets`, `tourPetWeightLimit`, `tourPetLimit`
- Photography: `photoPetsAllowed`, `photoPetsCost`

### 3. Shared gender/age sub-template for beauty & wellness
Identical fields appear in: Cejas, Masajes, Cabello, Manicure, Faciales, Depilación, Reductores, Tratamiento Piel. Extract into a shared block.

Fields: `validForGender` + `minAge`

### 4. Merge holiday fields
`hotelValidHolidays` + `hotelValidSchoolHolidays` → single "Fechas no válidas / Blackout dates" textarea.
Same pattern in Tours: `tourValidSchoolHolidays` can merge.

---

## Implementation Priority

1. **RESTAURANTE cleanup** — highest volume category, biggest impact
2. **HOTEL cleanup** — second highest volume
3. **Cross-template shared fields** — reduces maintenance burden
4. **Beauty & wellness shared sub-template** — many templates, same pattern
5. **Minor template cleanups** (Eventos, Tours, etc.)
