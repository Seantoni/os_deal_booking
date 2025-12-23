# External Oferta API Integration

This module provides mapping between our internal `BookingFormData` structure and the External Oferta API format.

## Architecture

**Why a mapping layer?**
- ✅ Keeps internal data model independent from external API
- ✅ Handles field transformations (string→boolean, combining fields, etc.)
- ✅ Easy to adapt when API changes
- ✅ Preserves internal-only fields
- ✅ Can support multiple APIs in the future

## Structure

```
lib/api/external-oferta/
├── types.ts       # API request/response TypeScript types
├── mapper.ts      # Transformation logic (BookingFormData → API format)
├── index.ts       # Public exports
└── README.md      # This file
```

## Usage

```typescript
import { mapBookingFormToApi, validateApiRequest } from '@/lib/api/external-oferta'
import type { BookingFormData } from '@/components/RequestForm/types'

// Transform internal form data to API format
const apiRequest = mapBookingFormToApi(formData, {
  categoryId: 123,      // TODO: Map from category string
  vendorId: 456,        // TODO: Map from business
  expiresOn: '2025-12-31', // TODO: Map from endDate
  slug: 'offer-slug'    // TODO: Auto-generate from nameEs
})

// Validate before sending
const validation = validateApiRequest(apiRequest)
if (!validation.valid) {
  console.error('Validation errors:', validation.errors)
  return
}

// Send to API
const response = await fetch('/external/api/deals', {
  method: 'POST',
  body: JSON.stringify(apiRequest)
})
```

## Key Mappings

| Internal Field | API Field | Notes |
|---------------|-----------|-------|
| `pricingOptions[0].title` | `nameEs` | Offer name (subtitle on deal page) |
| `businessName` | `vendorName` | Business/merchant name |
| `aboutOffer` | `summaryEs` | Summary description |
| `goodToKnow` | `goodToKnowEs` | Important information |
| `whatWeLike` | `noteworthy` | Highlights |
| `businessReview` | `reviewsEs` | Reviews |
| `paymentInstructions` | `paymentDetails` | Payment terms |
| `addressAndHours` | `vendorAddress` | Business address |
| `dealImages[]` | `images[]` | Carousel images |
| `pricingOptions[]` | `priceOptions[]` | Pricing structure |

## TODO Items

The mapper currently has placeholder values for:

1. **Category mapping** - Need to map `parentCategory`/`subCategory1` → `categoryId`
2. **Vendor mapping** - Need to resolve `businessName` → `vendorId` (or use `vendorName`)
3. **Date mapping** - Need to map `startDate`/`endDate` → `runAt`/`expiresOn`/`endAt`
4. **Slug generation** - Need to auto-generate from `nameEs`
5. **Missing fields** - Need to add form fields for:
   - `emailSubject` (required)
   - `voucherSubject`
   - `shortTitle`
   - `vendorLogo`
   - `commonRedeemCode`
   - `creditCardRestrictions`
   - Per-option fields: `limitByUser`, `endAt`, `expiresIn`

## Next Steps

1. ✅ Create mapping structure
2. ⏳ Add missing required fields to form
3. ⏳ Implement category/vendor/date mappings
4. ⏳ Create API client function
5. ⏳ Add webhook handlers for API responses

