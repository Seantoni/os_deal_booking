# External Oferta API Integration

This module handles all communication with the external OfertaSimple API for deals and vendors.

## 📁 Structure

```
lib/api/external-oferta/
├── index.ts              # Main entry point (re-exports all modules)
├── README.md             # This file
├── shared/               # Shared utilities
│   ├── index.ts          # Re-exports shared modules
│   ├── constants.ts      # API URLs, tokens, section mappings
│   ├── http.ts           # HTTP utilities (error formatting)
│   └── logger.ts         # Database logging for all API calls
├── deal/                 # Deal creation API
│   ├── index.ts          # Re-exports deal modules
│   ├── types.ts          # Deal request/response types
│   ├── mapper.ts         # BookingFormData → Deal API mapping
│   └── client.ts         # Deal API client functions
└── vendor/               # Vendor creation API
    ├── index.ts          # Re-exports vendor modules
    ├── types.ts          # Vendor request/response types
    ├── mapper.ts         # Business → Vendor API mapping
    └── client.ts         # Vendor API client functions
```

## 🔧 Usage

### Importing

```typescript
// Import everything from main module (recommended)
import { 
  sendDealToExternalApi, 
  sendVendorToExternalApi,
  getRecentApiRequests,
  type ExternalOfertaDealRequest,
  type ExternalOfertaVendorRequest
} from '@/lib/api/external-oferta'

// Or import from specific submodules for smaller bundles
import { sendDealToExternalApi } from '@/lib/api/external-oferta/deal'
import { sendVendorToExternalApi } from '@/lib/api/external-oferta/vendor'
import { getRecentApiRequests } from '@/lib/api/external-oferta/shared'
```

### Sending a Deal

```typescript
import { sendDealToExternalApi } from '@/lib/api/external-oferta'

const result = await sendDealToExternalApi(bookingRequest, {
  userId: 'user_123',
  triggeredBy: 'manual',
})

if (result.success) {
  console.log('Deal created with ID:', result.externalId)
} else {
  console.error('Deal creation failed:', result.error)
}
```

### Creating a Vendor

```typescript
import { sendVendorToExternalApi } from '@/lib/api/external-oferta'

const result = await sendVendorToExternalApi(business, {
  userId: 'user_123',
  triggeredBy: 'manual',
})

if (result.success) {
  console.log('Vendor created with ID:', result.externalVendorId)
  // Note: Business.osAdminVendorId is automatically updated on success
} else {
  console.error('Vendor creation failed:', result.error)
}
```

### Querying API Logs

```typescript
import { getRecentApiRequests, getApiRequestStats } from '@/lib/api/external-oferta'

// Get recent requests
const logs = await getRecentApiRequests({ limit: 50, failedOnly: true })

// Get statistics
const stats = await getApiRequestStats(30) // Last 30 days
console.log(`Success rate: ${stats.successRate}`)
```

## 🔑 Environment Variables

```bash
# Required
EXTERNAL_OFERTA_API_TOKEN=your_api_token

# Optional (defaults provided)
EXTERNAL_OFERTA_API_URL=https://ofertasimple.com/external/api/deals
EXTERNAL_OFERTA_VENDOR_API_URL=https://ofertasimple.com/external/api/vendors
```

## 📊 API Logging

All API requests are automatically logged to the `ExternalApiRequest` table:
- Request body (sanitized, no auth tokens)
- Response body and status
- Duration, timestamps
- Success/failure status
- External IDs returned by the API

View logs in **Settings → API Logs** tab.

## 🏷️ Type Reference

### Deal Types
- `ExternalOfertaDealRequest` - Request payload for creating deals
- `ExternalOfertaDealResponse` - Response from deal creation API
- `ExternalOfertaPriceOption` - Price option structure
- `SendDealResult` - Result of deal creation attempt

### Vendor Types
- `ExternalOfertaVendorRequest` - Request payload for creating vendors
- `ExternalOfertaVendorResponse` - Response from vendor creation API
- `SendVendorResult` - Result of vendor creation attempt
- `VENDOR_SALES_TYPE` - Enum for sales type values (Regular, Inside, Recurring, OSP)

## 🚀 API Routes

- `POST /api/external-oferta/resend` - Resend a failed deal request
- `GET /api/external-oferta/logs` - Get API logs (admin only)
