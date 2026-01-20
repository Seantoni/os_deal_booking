# Database Schema Documentation

This document describes the PostgreSQL database structure for the OS Deals Booking system. The schema is managed via [Prisma ORM](https://www.prisma.io/).

---

## Table of Contents

1. [Overview](#overview)
2. [Entity Relationship Diagram](#entity-relationship-diagram)
3. [Core CRM Models](#core-crm-models)
4. [Booking & Deals Models](#booking--deals-models)
5. [Marketing Models](#marketing-models)
6. [User & Access Models](#user--access-models)
7. [Configuration Models](#configuration-models)
8. [Logging & Tracking Models](#logging--tracking-models)
9. [Market Intelligence Models](#market-intelligence-models)

---

## Overview

| Category | Models |
|----------|--------|
| **CRM** | `Business`, `Lead`, `Opportunity`, `Category` |
| **Booking** | `BookingRequest`, `Event`, `Deal`, `PublicRequestLink` |
| **Marketing** | `MarketingCampaign`, `MarketingOption`, `MarketingOptionComment` |
| **Users** | `UserProfile`, `AllowedEmail`, `BusinessSalesRep` |
| **Config** | `Setting`, `FormSection`, `FormFieldConfig`, `CustomField`, `CustomFieldValue`, `SavedFilter` |
| **Logging** | `ActivityLog`, `AccessAuditLog`, `ExternalApiRequest` |
| **Intelligence** | `CompetitorDeal`, `CompetitorDealSnapshot` |
| **Comments** | `OpportunityComment`, `MarketingOptionComment` |
| **Tasks** | `Task` |

---

## Entity Relationship Diagram

```
┌─────────────┐     ┌─────────────┐     ┌─────────────────┐
│    Lead     │────▶│  Business   │◀────│ BusinessSalesRep│
└─────────────┘     └─────────────┘     └─────────────────┘
                           │                     │
                           │                     ▼
                           ▼              ┌─────────────┐
                    ┌─────────────┐       │ UserProfile │
                    │ Opportunity │       └─────────────┘
                    └─────────────┘
                           │
              ┌────────────┼────────────┐
              ▼            ▼            ▼
       ┌──────────┐  ┌──────────┐  ┌──────────────────┐
       │   Task   │  │   Deal   │  │OpportunityComment│
       └──────────┘  └──────────┘  └──────────────────┘
                           │
                           ▼
                   ┌───────────────┐     ┌─────────────────┐
                   │BookingRequest │────▶│MarketingCampaign│
                   └───────────────┘     └─────────────────┘
                           │                     │
                           ▼                     ▼
                      ┌─────────┐         ┌─────────────────┐
                      │  Event  │         │ MarketingOption │
                      └─────────┘         └─────────────────┘
                                                 │
                                                 ▼
                                    ┌────────────────────────┐
                                    │MarketingOptionComment  │
                                    └────────────────────────┘
```

---

## Core CRM Models

### Business
**Table:** `businesses`

The central entity representing a merchant/vendor in the CRM.

| Field | Type | Description |
|-------|------|-------------|
| `id` | String (cuid) | Primary key |
| `name` | String | Business name |
| `contactName` | String | Primary contact name |
| `contactPhone` | String | Primary contact phone |
| `contactEmail` | String | Primary contact email |
| `ownerId` | String? | Clerk ID of the owner (sales rep) |
| `categoryId` | String? | FK to Category |
| `tier` | Int? | Business tier (1-5) |
| `salesTeam` | String? | Sales team assignment |
| `sourceType` | String | How business was created: `manual`, `lead`, `csv` |
| **Location** | | |
| `address` | String? | Street address |
| `province` | String? | Province |
| `district` | String? | District |
| `corregimiento` | String? | Corregimiento |
| `neighborhood` | String? | Neighborhood |
| **Financial** | | |
| `ruc` | String? | Tax ID (RUC) |
| `razonSocial` | String? | Legal business name |
| `bank` | String? | Bank name |
| `accountNumber` | String? | Bank account number |
| `accountType` | String? | Account type (Corriente/Ahorros) |
| `beneficiaryName` | String? | Account beneficiary name |
| `paymentPlan` | String? | Payment plan (QR Daily/Weekly, etc.) |
| **External Integration** | | |
| `osAdminVendorId` | String? | External vendor ID in OfertaSimple system |
| **Reassignment** | | |
| `reassignmentStatus` | String? | `null`, `pending_reassign`, `pending_removal` |
| `reassignmentType` | String? | `reasignar` or `sacar` |
| `reassignmentRequestedBy` | String? | Clerk ID of requester |
| `reassignmentRequestedAt` | DateTime? | When reassignment was requested |
| `reassignmentReason` | String? | Notes explaining the request |
| `reassignmentPreviousOwner` | String? | Previous owner ID (for rollback) |
| **Focus Period** | | |
| `focusPeriod` | String? | `month`, `quarter`, `year` |
| `focusSetAt` | DateTime? | When focus was set |

**Relations:**
- `category` → Category (optional)
- `lead` → Lead (1:1, if converted from lead)
- `opportunities` → Opportunity[] (1:many)
- `salesReps` → BusinessSalesRep[] (many:many with UserProfile)

---

### Lead
**Table:** `leads`

Pre-qualified prospects that can be converted to Businesses.

| Field | Type | Description |
|-------|------|-------------|
| `id` | String (cuid) | Primary key |
| `name` | String | Lead/Company name |
| `contactName` | String | Contact person name |
| `contactPhone` | String | Contact phone |
| `contactEmail` | String | Contact email |
| `categoryId` | String? | FK to Category |
| `responsibleId` | String? | Assigned sales rep (Clerk ID) |
| `stage` | String | Lead stage: `por_asignar`, `contactado`, `calificado`, `descartado`, `convertido` |
| `source` | String? | Lead source |
| `notes` | String? | Notes |
| `businessId` | String? | FK to Business (after conversion) |
| `convertedAt` | DateTime? | When converted to Business |

**Relations:**
- `category` → Category (optional)
- `business` → Business (1:1, after conversion)

---

### Opportunity
**Table:** `opportunities`

Sales opportunities linked to a Business.

| Field | Type | Description |
|-------|------|-------------|
| `id` | String (cuid) | Primary key |
| `businessId` | String | FK to Business |
| `name` | String? | Opportunity name |
| `stage` | String | Pipeline stage: `iniciacion`, `negociacion`, `solicitud`, `ganada`, `perdida` |
| `startDate` | DateTime | Opportunity start date |
| `closeDate` | DateTime? | Expected/actual close date |
| `userId` | String | Creator's Clerk ID |
| `responsibleId` | String? | Assigned responsible (Clerk ID) |
| `hasRequest` | Boolean | Whether has associated booking request |
| `bookingRequestId` | String? | Associated booking request ID |
| `dealId` | String? | FK to Deal (1:1) |
| `lostReason` | String? | Why opportunity was lost |
| `lastActivityDate` | DateTime? | Last activity timestamp |
| `nextActivityDate` | DateTime? | Scheduled next activity |

**Relations:**
- `business` → Business (many:1)
- `deal` → Deal (1:1, optional)
- `comments` → OpportunityComment[] (1:many)
- `tasks` → Task[] (1:many)

---

### Category
**Table:** `categories`

Hierarchical category structure (up to 5 levels).

| Field | Type | Description |
|-------|------|-------------|
| `id` | String (cuid) | Primary key |
| `categoryKey` | String | Unique key (e.g., `restaurantes>italiano>pizza`) |
| `parentCategory` | String | Level 1 category |
| `subCategory1` | String? | Level 2 |
| `subCategory2` | String? | Level 3 |
| `subCategory3` | String? | Level 4 |
| `subCategory4` | String? | Level 5 |
| `maxDuration` | Int | Max campaign duration in weeks |
| `isActive` | Boolean | Whether category is active |
| `displayOrder` | Int | Sort order |

**Relations:**
- `businesses` → Business[] (1:many)
- `leads` → Lead[] (1:many)

---

## Booking & Deals Models

### BookingRequest
**Table:** `booking_requests` (default)

The main form data for a deal/campaign request.

| Field | Type | Description |
|-------|------|-------------|
| `id` | String (cuid) | Primary key |
| `name` | String | Deal/Campaign name |
| `businessEmail` | String | Merchant email |
| `startDate` | DateTime | Campaign start date |
| `endDate` | DateTime | Campaign end date |
| `status` | String | Status: `draft`, `pending`, `approved`, `rejected`, `cancelled` |
| `userId` | String | Creator's Clerk ID |
| `sourceType` | String | `internal`, `public_link` |
| **Category** | | |
| `category` | String? | Category name (denormalized) |
| `parentCategory` | String? | Level 1 |
| `subCategory1-4` | String? | Levels 2-5 |
| **Deal Content** | | |
| `shortTitle` | String? | Short promotional title |
| `aboutCompany` | String? | Company description |
| `aboutOffer` | String? | Offer description |
| `whatWeLike` | String? | Highlights |
| `goodToKnow` | String? | Important notes |
| `pricingOptions` | Json? | Array of price options |
| `dealImages` | Json? | Array of image URLs |
| **Business Info** | | |
| `legalName` | String? | Legal business name |
| `rucDv` | String? | RUC + DV |
| `addressAndHours` | String? | Address and hours text |
| `socialMedia` | String? | Social media links |
| **Redemption** | | |
| `redemptionMode` | String? | How vouchers are redeemed |
| `redemptionMethods` | Json? | Methods available |
| `redemptionContactName` | String? | Contact for redemption |
| `redemptionContactEmail` | String? | Contact email |
| `redemptionContactPhone` | String? | Contact phone |
| **Financial** | | |
| `commission` | String? | Commission percentage |
| `offerMargin` | String? | Margin percentage |
| `bank` | String? | Bank name |
| `accountNumber` | String? | Bank account |
| `accountType` | String? | Account type |
| `bankAccountName` | String? | Beneficiary name |
| **Links** | | |
| `eventId` | String? | Calendar event ID |
| `opportunityId` | String? | Source opportunity ID |
| `dealId` | String? | FK to Deal (1:1) |
| `publicLinkToken` | String? | FK to PublicRequestLink |
| **Collaboration** | | |
| `fieldComments` | Json? | Per-field comments |
| `additionalEmails` | Json? | CC emails for notifications |
| `additionalInfo` | Json? | Extra custom fields |

**Relations:**
- `deal` → Deal (1:1)
- `publicRequestLink` → PublicRequestLink (optional)
- `externalApiRequests` → ExternalApiRequest[] (1:many)
- `marketingCampaign` → MarketingCampaign (1:1)

---

### Deal
**Table:** `deals`

Post-approval deal management record.

| Field | Type | Description |
|-------|------|-------------|
| `id` | String (cuid) | Primary key |
| `bookingRequestId` | String | FK to BookingRequest (1:1) |
| `opportunityId` | String? | FK to Opportunity (1:1) |
| `status` | String | Deal status: `pendiente_por_asignar`, `en_proceso`, `enviado`, `publicado`, `finalizado` |
| `responsibleId` | String? | Assigned responsible (Clerk ID) |
| `ereResponsibleId` | String? | ERE responsible (Clerk ID) |

**Relations:**
- `bookingRequest` → BookingRequest (1:1)
- `opportunity` → Opportunity (1:1, optional)

---

### Event
**Table:** (default)

Calendar events for scheduled campaigns.

| Field | Type | Description |
|-------|------|-------------|
| `id` | String (cuid) | Primary key |
| `name` | String | Event name |
| `description` | String? | Description |
| `startDate` | DateTime | Start date |
| `endDate` | DateTime | End date |
| `userId` | String | Creator's Clerk ID |
| `status` | String | `approved`, `pending`, `cancelled` |
| `merchant` | String? | Merchant name |
| `category` | String? | Category name |
| `bookingRequestId` | String? | Associated booking request |

---

### PublicRequestLink
**Table:** `public_request_links`

Secure tokens for external booking form access.

| Field | Type | Description |
|-------|------|-------------|
| `id` | String (cuid) | Primary key |
| `token` | String | Unique secure token |
| `createdBy` | String | Creator's Clerk ID |
| `recipientEmail` | String | Intended recipient |
| `isUsed` | Boolean | Whether link was used |
| `usedAt` | DateTime? | When link was used |

**Relations:**
- `bookingRequest` → BookingRequest (1:1, optional)

---

## Marketing Models

### MarketingCampaign
**Table:** `marketing_campaigns`

Marketing campaign associated with a booking request.

| Field | Type | Description |
|-------|------|-------------|
| `id` | String (cuid) | Primary key |
| `bookingRequestId` | String | FK to BookingRequest (1:1) |
| `doMarketing` | Boolean | Whether to do marketing |
| `skipReason` | String? | Why marketing was skipped |
| `createdBy` | String? | Creator's Clerk ID |
| `generatedCopy` | String? | AI-generated marketing copy |
| `videoScript` | String? | AI-generated video script |

**Relations:**
- `bookingRequest` → BookingRequest (1:1)
- `options` → MarketingOption[] (1:many)

---

### MarketingOption
**Table:** `marketing_options`

Individual marketing deliverables (Instagram post, story, etc.).

| Field | Type | Description |
|-------|------|-------------|
| `id` | String (cuid) | Primary key |
| `campaignId` | String | FK to MarketingCampaign |
| `platform` | String | Platform: `instagram`, `facebook`, `tiktok`, `email`, `web` |
| `optionType` | String | Type: `post`, `story`, `reel`, `newsletter`, `banner` |
| `isPlanned` | Boolean | Whether planned |
| `isCompleted` | Boolean | Whether completed |
| `dueDate` | DateTime? | Due date |
| `completedAt` | DateTime? | Completion timestamp |
| `completedBy` | String? | Who completed it |
| `responsibleId` | String? | Assigned responsible |
| `notes` | String? | Notes/instructions |
| `mediaUrls` | Json? | Array of media URLs |

**Unique Constraint:** `[campaignId, platform, optionType]`

**Relations:**
- `campaign` → MarketingCampaign (many:1)
- `comments` → MarketingOptionComment[] (1:many)

---

### MarketingOptionComment
**Table:** `marketing_option_comments`

Comments/chat thread on marketing options.

| Field | Type | Description |
|-------|------|-------------|
| `id` | String (cuid) | Primary key |
| `optionId` | String | FK to MarketingOption |
| `userId` | String | Commenter's Clerk ID |
| `content` | String | Comment text |
| `mentions` | Json? | Array of mentioned user IDs |
| `reactions` | Json? | Emoji reactions `{ emoji: userId[] }` |
| `attachments` | Json? | Attached files |
| `isEdited` | Boolean | Whether edited |
| `isDeleted` | Boolean | Soft delete flag |
| `readBy` | Json? | Array of user IDs who read |
| `dismissedBy` | Json? | Array of user IDs who dismissed |

**Relations:**
- `option` → MarketingOption (many:1)

---

## User & Access Models

### UserProfile
**Table:** (default)

Internal user profiles linked to Clerk authentication.

| Field | Type | Description |
|-------|------|-------------|
| `id` | String (cuid) | Primary key |
| `clerkId` | String | Clerk user ID (unique) |
| `email` | String? | User email |
| `name` | String? | Display name |
| `role` | String | Role: `admin`, `sales`, `marketing`, `editor` |
| `isActive` | Boolean | Whether user is active |

**Relations:**
- `businessReps` → BusinessSalesRep[] (1:many)

---

### AllowedEmail
**Table:** `allowed_emails`

Email allowlist for access control.

| Field | Type | Description |
|-------|------|-------------|
| `id` | String (cuid) | Primary key |
| `email` | String | Email address (unique) |
| `isActive` | Boolean | Whether access is active |
| `notes` | String? | Admin notes |
| `createdBy` | String | Who added this email |
| `invitationStatus` | String? | `pending`, `accepted` |
| `invitedRole` | String? | Role assigned on invite |
| `invitedAt` | DateTime? | When invitation was sent |
| `invitedBy` | String? | Who sent invitation |
| `clerkInvitationId` | String? | Clerk invitation ID |
| `firstName` | String? | First name |
| `lastName` | String? | Last name |

**Relations:**
- `auditLogs` → AccessAuditLog[] (1:many)

---

### BusinessSalesRep
**Table:** `business_sales_reps`

Many-to-many join table: Business ↔ UserProfile (sales reps).

| Field | Type | Description |
|-------|------|-------------|
| `id` | String (cuid) | Primary key |
| `businessId` | String | FK to Business |
| `salesRepId` | String | FK to UserProfile.clerkId |

**Unique Constraint:** `[businessId, salesRepId]`

**Relations:**
- `business` → Business (many:1)
- `userProfile` → UserProfile (many:1)

---

## Configuration Models

### Setting
**Table:** `settings`

Global application settings (singleton record with id="default").

| Field | Type | Description |
|-------|------|-------------|
| `id` | String | Always "default" |
| `minDailyLaunches` | Int | Min deals per day (default: 5) |
| `maxDailyLaunches` | Int | Max deals per day (default: 13) |
| `merchantRepeatDays` | Int | Days before same merchant can launch again |
| `categoryDurations` | Json | Category → max duration mapping |
| `businessExceptions` | Json | Business-specific exceptions |
| `customCategories` | Json | Custom category definitions |
| `hiddenCategoryPaths` | Json? | Hidden categories in UI |
| `additionalInfoMappings` | Json? | Custom field mappings |
| `requestFormFields` | Json? | Form field configuration |
| `externalApiSectionMappings` | Json? | API section mappings |

---

### FormSection
**Table:** `form_sections`

Dynamic form section definitions.

| Field | Type | Description |
|-------|------|-------------|
| `id` | String (cuid) | Primary key |
| `entityType` | String | Entity type: `booking_request`, `business`, `opportunity` |
| `name` | String | Section display name |
| `displayOrder` | Int | Sort order |
| `isCollapsed` | Boolean | Default collapsed state |
| `isActive` | Boolean | Whether section is active |

**Relations:**
- `fields` → FormFieldConfig[] (1:many)

---

### FormFieldConfig
**Table:** `form_field_configs`

Dynamic form field configuration.

| Field | Type | Description |
|-------|------|-------------|
| `id` | String (cuid) | Primary key |
| `entityType` | String | Entity type |
| `sectionId` | String | FK to FormSection |
| `fieldKey` | String | Field identifier |
| `fieldSource` | String | `builtin` or `custom` |
| `displayOrder` | Int | Sort order within section |
| `isVisible` | Boolean | Whether field is visible |
| `isRequired` | Boolean | Whether field is required |
| `isReadonly` | Boolean | Whether field is read-only |
| `width` | String | Field width: `full`, `half`, `third` |
| `canEditAfterCreation` | Boolean | Whether editable after initial save |

**Unique Constraint:** `[entityType, fieldKey]`

**Relations:**
- `section` → FormSection (many:1)

---

### CustomField
**Table:** `custom_fields`

User-defined custom fields.

| Field | Type | Description |
|-------|------|-------------|
| `id` | String (cuid) | Primary key |
| `fieldKey` | String | Unique field identifier |
| `label` | String | Display label |
| `fieldType` | String | `text`, `number`, `date`, `select`, `multiselect`, `textarea` |
| `entityType` | String | Which entity this field belongs to |
| `isRequired` | Boolean | Whether required |
| `placeholder` | String? | Placeholder text |
| `defaultValue` | String? | Default value |
| `helpText` | String? | Help text |
| `options` | Json? | Options for select fields |
| `displayOrder` | Int | Sort order |
| `showInTable` | Boolean | Whether to show in table view |
| `isActive` | Boolean | Whether field is active |
| `createdBy` | String | Creator's Clerk ID |

**Relations:**
- `values` → CustomFieldValue[] (1:many)

---

### CustomFieldValue
**Table:** `custom_field_values`

Values for custom fields.

| Field | Type | Description |
|-------|------|-------------|
| `id` | String (cuid) | Primary key |
| `customFieldId` | String | FK to CustomField |
| `entityId` | String | ID of the entity (Business, Opportunity, etc.) |
| `entityType` | String | Entity type |
| `value` | String? | The stored value |

**Unique Constraint:** `[customFieldId, entityId]`

**Relations:**
- `customField` → CustomField (many:1)

---

### SavedFilter
**Table:** `saved_filters`

User-saved filter configurations.

| Field | Type | Description |
|-------|------|-------------|
| `id` | String (cuid) | Primary key |
| `name` | String | Filter name |
| `entityType` | String | `businesses`, `opportunities`, `deals` |
| `filters` | Json | Filter rules |
| `createdBy` | String | Creator's Clerk ID |

---

## Logging & Tracking Models

### ActivityLog
**Table:** `activity_logs`

User activity audit trail.

| Field | Type | Description |
|-------|------|-------------|
| `id` | String (cuid) | Primary key |
| `userId` | String | Actor's Clerk ID |
| `userName` | String? | Actor's name |
| `userEmail` | String? | Actor's email |
| `action` | String | Action: `CREATE`, `UPDATE`, `DELETE`, `LOGIN`, etc. |
| `entityType` | String | Entity type affected |
| `entityId` | String? | Entity ID |
| `entityName` | String? | Entity name (denormalized) |
| `details` | Json? | Additional details |
| `ipAddress` | String? | Client IP |
| `userAgent` | String? | Client user agent |
| `createdAt` | DateTime | Timestamp |

---

### AccessAuditLog
**Table:** `access_audit_logs`

Access control audit trail.

| Field | Type | Description |
|-------|------|-------------|
| `id` | String (cuid) | Primary key |
| `email` | String | Email affected |
| `action` | String | `added`, `revoked`, `invited`, `invitation_accepted` |
| `performedBy` | String | Who performed the action |
| `performedAt` | DateTime | When |
| `notes` | String? | Notes |
| `allowedEmailId` | String? | FK to AllowedEmail |

**Relations:**
- `allowedEmail` → AllowedEmail (many:1)

---

### ExternalApiRequest
**Table:** `external_api_requests`

External API call logs.

| Field | Type | Description |
|-------|------|-------------|
| `id` | String (cuid) | Primary key |
| `endpoint` | String | API endpoint URL |
| `method` | String | HTTP method |
| `requestBody` | Json? | Request payload |
| `headers` | Json? | Request headers (sanitized) |
| `statusCode` | Int? | HTTP response code |
| `responseBody` | Json? | Response payload |
| `responseRaw` | String? | Raw response text |
| `success` | Boolean | Whether request succeeded |
| `errorMessage` | String? | Error message if failed |
| `externalId` | Int? | External ID returned by API |
| `bookingRequestId` | String? | FK to BookingRequest |
| `userId` | String? | Who triggered |
| `triggeredBy` | String? | `manual`, `cron`, `webhook`, `system` |
| `durationMs` | Int? | Request duration |

**Relations:**
- `bookingRequest` → BookingRequest (many:1, optional)

---

## Market Intelligence Models

### CompetitorDeal
**Table:** `competitor_deals`

Tracked competitor deals.

| Field | Type | Description |
|-------|------|-------------|
| `id` | String (cuid) | Primary key |
| `sourceUrl` | String | Deal URL (unique) |
| `sourceSite` | String | Source site name |
| `merchantName` | String | Merchant name |
| `dealTitle` | String | Deal title |
| `originalPrice` | Decimal | Original price |
| `offerPrice` | Decimal | Offer price |
| `discountPercent` | Int | Discount percentage |
| `totalSold` | Int | Total vouchers sold |
| `imageUrl` | String? | Deal image |
| `status` | String | `active`, `expired`, `ended` |
| `isTracking` | Boolean | Whether still tracking |
| `tag` | String? | Custom tag |
| `firstSeenAt` | DateTime | When first discovered |
| `lastScannedAt` | DateTime | Last scan timestamp |
| `expiresAt` | DateTime? | Deal expiration |

**Relations:**
- `snapshots` → CompetitorDealSnapshot[] (1:many)

---

### CompetitorDealSnapshot
**Table:** `competitor_deal_snapshots`

Historical snapshots of competitor deals.

| Field | Type | Description |
|-------|------|-------------|
| `id` | String (cuid) | Primary key |
| `dealId` | String | FK to CompetitorDeal |
| `totalSold` | Int | Total sold at snapshot time |
| `offerPrice` | Decimal | Price at snapshot time |
| `originalPrice` | Decimal | Original price at snapshot |
| `scannedAt` | DateTime | Snapshot timestamp |

**Relations:**
- `deal` → CompetitorDeal (many:1)

---

## Comments & Tasks

### OpportunityComment
**Table:** `opportunity_comments`

Comments/chat on opportunities.

| Field | Type | Description |
|-------|------|-------------|
| `id` | String (cuid) | Primary key |
| `opportunityId` | String | FK to Opportunity |
| `userId` | String | Commenter's Clerk ID |
| `content` | String | Comment text |
| `mentions` | Json? | Mentioned user IDs |
| `reactions` | Json? | Emoji reactions |
| `isEdited` | Boolean | Whether edited |
| `isDeleted` | Boolean | Soft delete flag |
| `readBy` | Json? | Who has read |
| `dismissedBy` | Json? | Who has dismissed |

**Relations:**
- `opportunity` → Opportunity (many:1)

---

### Task
**Table:** `tasks`

Tasks linked to opportunities.

| Field | Type | Description |
|-------|------|-------------|
| `id` | String (cuid) | Primary key |
| `opportunityId` | String | FK to Opportunity |
| `category` | String | Task category: `llamada`, `reunion`, `email`, `seguimiento`, `otro` |
| `title` | String | Task title |
| `date` | DateTime | Due date |
| `completed` | Boolean | Whether completed |
| `notes` | String? | Notes |

**Relations:**
- `opportunity` → Opportunity (many:1)

---

## Indexes

Most tables have indexes on:
- Primary keys (automatic)
- Foreign keys
- Frequently queried fields (`status`, `stage`, `createdAt`)
- User IDs (`userId`, `ownerId`, `responsibleId`)

---

## Notes for Developers

1. **IDs**: All primary keys use `cuid()` for globally unique, URL-safe identifiers.

2. **Timestamps**: Most tables have `createdAt` and `updatedAt` fields. `updatedAt` uses `@updatedAt` for automatic updates.

3. **Soft Deletes**: Comments use `isDeleted` flag rather than hard deletes.

4. **JSON Fields**: Used for flexible data (arrays, nested objects): `pricingOptions`, `reactions`, `mentions`, `mediaUrls`.

5. **Clerk Integration**: User IDs throughout are Clerk user IDs (`clerkId`), not internal IDs.

6. **Cascading Deletes**: Most child records cascade delete with parent (`onDelete: Cascade`).

7. **Category Denormalization**: Categories are stored both as FK (`categoryId`) and denormalized strings (`parentCategory`, `subCategory1`, etc.) in BookingRequest and Event for historical consistency.
