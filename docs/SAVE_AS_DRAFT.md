# Save as Draft — Booking Request Form

How drafts are saved, loaded, and which fields are persisted at each step.

## Overview

The booking request form (`EnhancedBookingForm.tsx`) has **9 steps**. Drafts are saved to the `BookingRequest` table with `status: 'draft'`.

There are **two ways** a draft gets saved:

| Trigger | Function | When |
|---------|----------|------|
| **Save as Draft button** | `handleSaveDraft` → `saveDraftAction` | User clicks "Guardar Borrador" at any step |
| **Next step auto-save** | `handleNext` → `saveBookingRequestDraft` | User clicks "Siguiente" and validation passes |

Both paths call `buildFormDataForSubmit(formData)` to serialize the **entire** form state (all steps, not just the current one) into a `FormData` object, then send it to the `saveBookingRequestDraft` server action.

## Data Flow

```
User fills fields
       ↓
formData state (React useState)
       ↓
buildFormDataForSubmit(formData)          ← components/RequestForm/request_form_utils.ts
       ↓
FormData (browser API)
       ↓
saveBookingRequestDraft(formData, id?)    ← app/actions/booking-requests.ts
       ↓
extractBookingRequestFromFormData(fd)     ← lib/utils/form-data.ts
       ↓
Prisma create/update → BookingRequest table
```

### Loading a draft for editing

When a user returns to edit a draft (via `?editId=<id>` URL param):

```
getBookingRequest(editId)                 ← app/actions/booking.ts
       ↓
BookingRequest record from DB
       ↓
loadExistingRequest effect                ← EnhancedBookingForm.tsx (useEffect)
       ↓
Maps DB fields → formData state
```

## Fields by Step

### Step 1: Configuración (`configuracion`)
| Field | FormData key | DB column |
|-------|-------------|-----------|
| Nombre del Negocio | `name`, `merchant` | `name`, `merchant` |
| Correo del Aliado | `businessEmail` | `businessEmail` |
| Emails Adicionales | `additionalEmails` (JSON) | `additionalEmails` (Json) |
| Categoría (full path) | `category` | `category` |
| Categoría Principal | `parentCategory` | `parentCategory` |
| Subcategorías 1-3 | `subCategory1`..`3` | `subCategory1`..`3` |
| Fecha Inicio | `startDate` | `startDate` (DateTime) |
| Fecha Final | `endDate` | `endDate` (DateTime) |
| Duración de Campaña | `campaignDuration` | `campaignDuration` |
| Unidad Duración | `campaignDurationUnit` | `campaignDurationUnit` |
| Días del Evento | `eventDays` (JSON) | `eventDays` (Json) |
| Oportunidad CRM | `opportunityId` | `opportunityId` |

### Step 2: Operatividad (`operatividad`)
| Field | FormData key | DB column |
|-------|-------------|-----------|
| Modo de Canje | `redemptionMode` | `redemptionMode` |
| Es Recurrente | `isRecurring` | `isRecurring` |
| Link Oferta Recurrente | `recurringOfferLink` | `recurringOfferLink` |
| Tipo de Pago | `paymentType` | `paymentType` |
| Instrucciones de Pago | `paymentInstructions` | `paymentInstructions` |

### Step 3: Directorio (`directorio`)
| Field | FormData key | DB column |
|-------|-------------|-----------|
| Nombre Contacto Canje | `redemptionContactName` | `redemptionContactName` |
| Email Contacto Canje | `redemptionContactEmail` | `redemptionContactEmail` |
| Teléfono Contacto Canje | `redemptionContactPhone` | `redemptionContactPhone` |
| Contactos Adicionales | `additionalRedemptionContacts` (JSON) | `additionalRedemptionContacts` (Json) |

### Step 4: Fiscales (`fiscales`)
| Field | FormData key | DB column |
|-------|-------------|-----------|
| Razón Social | `legalName` | `legalName` |
| RUC/DV | `rucDv` | `rucDv` |
| Nombre en Cuenta | `bankAccountName` | `bankAccountName` |
| Banco | `bank` | `bank` |
| Número de Cuenta | `accountNumber` | `accountNumber` |
| Tipo de Cuenta | `accountType` | `accountType` |
| Cuentas Adicionales | `additionalBankAccounts` (JSON) | `additionalBankAccounts` (Json) |
| Dirección y Horarios | `addressAndHours` | `addressAndHours` |
| Provincia/Distrito | `provinceDistrictCorregimiento` | `provinceDistrictCorregimiento` |

### Step 5: Negocio (`negocio`)
| Field | FormData key | DB column |
|-------|-------------|-----------|
| Incluye Impuestos | `includesTaxes` | `includesTaxes` |
| Válido en Feriados | `validOnHolidays` | `validOnHolidays` |
| Tiene Exclusividad | `hasExclusivity` | `hasExclusivity` |
| Fechas Bloqueadas | `blackoutDates` | `blackoutDates` |
| Condición Exclusividad | `exclusivityCondition` | `exclusivityCondition` |
| Tiene Otras Sucursales | `hasOtherBranches` | `hasOtherBranches` |

### Step 6: Estructura (`estructura`)
| Field | FormData key | DB column |
|-------|-------------|-----------|
| Comisión OfertaSimple | `offerMargin` | `offerMargin` |
| Opciones de Precio | `pricingOptions` (JSON) | `pricingOptions` (Json) |
| Imágenes del Deal | `dealImages` (JSON) | `dealImages` (Json) |
| Adjuntos | via `additionalInfo.bookingAttachments` | `additionalInfo` (Json) |

### Step 7: Información Adicional (`informacion-adicional`)
| Field | FormData key | DB column |
|-------|-------------|-----------|
| Campos de Template | `additionalInfo` (JSON with `templateName`, `fields`) | `additionalInfo` (Json) |

Template-specific fields (e.g. `restaurantValidDineIn`, `hotelCheckIn`) are packed into `additionalInfo.fields` as a key-value map. On load, they're unpacked back into `formData` dynamically.

### Step 8: Contenido (`contenido`)
| Field | FormData key | DB column |
|-------|-------------|-----------|
| Título de la Oferta | `nameEs` | `nameEs` |
| Título Corto | `shortTitle` | `shortTitle` |
| Título del Email | `emailTitle` | `emailTitle` |
| Lo que nos gusta | `whatWeLike` | `whatWeLike` |
| La Empresa | `aboutCompany` | `aboutCompany` |
| Acerca de esta Oferta | `aboutOffer` | `aboutOffer` |
| Lo que conviene saber | `goodToKnow` | `goodToKnow` |
| Cómo Usar | `howToUseEs` | `howToUseEs` |

### Step 9: Validación (`validacion`)
| Field | FormData key | DB column |
|-------|-------------|-----------|
| Política de Cancelación | `cancellationPolicy` | `cancellationPolicy` |
| Validación de Mercado | `marketValidation` | `marketValidation` |
| Comentarios Adicionales | `additionalComments` | `additionalComments` |

## Key Files

| File | Purpose |
|------|---------|
| `components/RequestForm/EnhancedBookingForm.tsx` | Main form component, orchestrates steps, save/load logic |
| `components/RequestForm/request_form_utils.ts` | `buildFormDataForSubmit()` — serializes formData → FormData |
| `components/RequestForm/types.ts` | `BookingFormData` type definition |
| `components/RequestForm/constants.ts` | Step definitions, `INITIAL_FORM_DATA` |
| `lib/utils/form-data.ts` | `extractBookingRequestFromFormData()` — parses FormData on server |
| `app/actions/booking-requests.ts` | `saveBookingRequestDraft()` — Prisma create/update |
| `app/actions/booking.ts` | `getBookingRequest()` — loads draft for editing |
| `prisma/schema.prisma` | `BookingRequest` model (all DB columns) |

## Adding a New Field (Checklist)

When adding a new field to the booking form:

1. **Type**: Add to `BookingFormData` in `types.ts`
2. **Initial value**: Add to `INITIAL_FORM_DATA` in `constants.ts`
3. **Step UI**: Add the input in the relevant step component (e.g. `EstructuraStep.tsx`)
4. **Serialize**: Add `fd.append(...)` in `buildFormDataForSubmit()` in `request_form_utils.ts`
5. **Extract**: Add to `extractBookingRequestFromFormData()` in `lib/utils/form-data.ts`
6. **Save**: Add to the `data` object in `saveBookingRequestDraft()` in `booking-requests.ts`
7. **DB**: Add column to `BookingRequest` model in `prisma/schema.prisma` + migrate
8. **Load**: Add mapping in `loadExistingRequest` effect in `EnhancedBookingForm.tsx`
9. **Replicate** (if applicable): Add to the legacy replicate `searchParams` handling in `EnhancedBookingForm.tsx`

> Missing any of steps 4-8 will cause the field to silently not persist or not reload.

## Bug Fix Log

### 2025-03-10: Missing fields on draft reload

**Problem**: 4 fields were saved to the database but not mapped back when loading a draft for editing. Users who saved a draft and returned later would see these fields blank.

**Fields affected**: `offerMargin` (Comisión), `nameEs` (Título de la Oferta), `emailTitle` (Título del Email), `howToUseEs` (Cómo Usar).

**Root cause**: The `loadExistingRequest` effect in `EnhancedBookingForm.tsx` did not include these fields in the DB-to-formData mapping.

**Fix**: Added the 4 missing fields to the mapping object in the `loadExistingRequest` effect.
