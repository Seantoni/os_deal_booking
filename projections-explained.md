# Projections Explained

This document explains how projected revenue is calculated.

## Scope

- Requests included: `draft`, `pending`, `approved`, `booked`
- Role access:
  - `admin`: all requests
  - `sales`: only own requests
  - others: no projection data

## Projection Priority

Projection source is resolved in this order:

1. `actual_deal`
2. `business_history`
3. `category_benchmark`
4. `none`

If a higher source resolves, lower sources are ignored.

## Sources

### 1) `actual_deal` (high confidence)

- Uses `bookingRequest.dealId` to match `dealMetrics.externalDealId`.
- If `netRevenue > 0`, projected revenue = `netRevenue`.

### 2) `business_history` (medium confidence)

- Matches request to business in this order:
  1. `opportunityId -> businessId`
  2. `businessEmail`
  3. `merchant` name
- Uses the business's **last 3 valid deals** (most recent by `endAt`, fallback `runAt`).
- Projected revenue = **median** of those 3 deals.
- If only 1-2 valid deals exist, uses median of available deals (`>=1`).

### 3) `category_benchmark` (low confidence)

- Uses internal category hierarchy:
  - `parentCategory`
  - `subCategory1`
  - `subCategory2`
  - `subCategory3`
  - `subCategory4`
- Benchmark data is built from historical requests with:
  - `status = booked`
  - valid `dealId`
  - deal date within last **360 days** (`endAt`, fallback `runAt`)
  - `dealMetrics.netRevenue > 0`
- Category matching falls back from most specific to least specific:
  - `PARENT:SUB1:SUB2:SUB3:SUB4` -> ... -> `PARENT`
- Revenue estimator is **median** (not average).
- Minimum sample rule:
  - only categories with `n >= 5` are valid
  - if all levels are `< 5`, no category forecast is used

### 4) `none`

- Returned when no valid source resolves revenue.

## Removed Logic

- `pricing_fallback` / `Estructura` is no longer used.

## MoM Chart

- Shows:
  - last month `Real`
  - next 3 months `Forecast`
- Real month:
  - only `booked` rows
  - only `actual_deal` source
- Forecast months:
  - sums projected revenue by request `startDate` month

## No-data Behavior

- If no source qualifies, projected revenue is `null`.
- UI shows `Sin datos` / dash.
