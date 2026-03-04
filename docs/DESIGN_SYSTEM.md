# Design System

Reference for all visual patterns, component conventions, and styling approaches used across the app.

---

## Stack

| Layer | Technology |
|-------|-----------|
| Framework | Next.js App Router |
| Styling | Tailwind CSS v4 (CSS-first config via `@theme inline` in `globals.css`) |
| Fonts | Geist Sans + Geist Mono via `next/font/google` |
| Icons | `@mui/icons-material` |
| UI primitives | Custom components in `components/ui/` |
| Theme | Light mode only (`color-scheme: light`) |
| Auth | Clerk (Spanish locale, `lang="es"`) |

---

## Fonts

Loaded in `app/layout.tsx` and exposed as CSS variables:

```tsx
const geistSans = Geist({ variable: "--font-geist-sans", subsets: ["latin"] })
const geistMono = Geist_Mono({ variable: "--font-geist-mono", subsets: ["latin"] })
```

Registered in Tailwind via `@theme inline`:

```css
@theme inline {
  --font-sans: var(--font-geist-sans);
  --font-mono: var(--font-geist-mono);
}
```

**Usage:**
- Body/UI text: Geist Sans (default)
- Tabular numbers, scores, code: `font-mono` (Geist Mono) + `tabular-nums`

---

## Color System

### CSS Custom Properties

```css
:root {
  --background: #ffffff;
  --foreground: #171717;
  color-scheme: light;
}
```

### Primary Palette

| Role | Token | Usage |
|------|-------|-------|
| Primary | `blue-500` / `blue-600` | Buttons, links, active states |
| Danger | `red-500` / `red-600` | Destructive actions, errors |
| Success | `green-600` / `emerald-600` | Won, booked, completed |
| Warning | `yellow-50` / `amber-600` | Pending, attention needed |
| Neutral | `gray-50` → `gray-900` | Backgrounds, text, borders |

### Semantic Color Convention

Consistent across all entities:

| Meaning | Background | Text | Border |
|---------|-----------|------|--------|
| Draft / Unknown | `gray-50` / `gray-100` | `gray-600` / `gray-800` | `gray-200` |
| Pending / Waiting | `yellow-50` / `yellow-100` | `yellow-700` / `yellow-800` | `yellow-200` |
| In progress / Approved | `blue-50` / `blue-100` | `blue-700` / `blue-800` | `blue-200` |
| Won / Booked / Success | `emerald-50` / `green-100` | `emerald-700` / `green-800` | `emerald-200` |
| Lost / Rejected / Error | `red-50` / `red-100` | `red-600` / `red-800` | `red-200` |
| Cancelled / Warning | `orange-50` / `orange-100` | `orange-700` | `orange-200` |
| Special / Advanced | `purple-50` / `indigo-100` | `purple-700` / `indigo-800` | `purple-200` |

### Entity-Specific Color Maps

**Opportunity stages** (`components/crm/opportunity/constants.ts`):
- `iniciacion` → gray
- `reunion` → blue
- `propuesta_enviada` → amber
- `propuesta_aprobada` → indigo
- `won` → emerald
- `lost` → red

**Booking request statuses** (`lib/constants/booking-request-statuses.ts`):
- `draft` → gray
- `pending` → yellow
- `approved` → blue
- `booked` → emerald
- `rejected` → red
- `cancelled` → orange

**Business tiers** (inline):
- Tier 1 → `bg-emerald-100 text-emerald-700`
- Tier 2 → `bg-blue-100 text-blue-700`
- Tier 3+ → `bg-gray-100 text-gray-600`

**Business lifecycle** (`components/shared/BusinessLifecycleBadge.tsx`):
- NEW → `bg-emerald-100 text-emerald-700`
- RECURRENT → `bg-blue-100 text-blue-700`
- Unknown → `bg-gray-100 text-gray-500`

**User roles** (`components/shared/AccessManagementTab.tsx`):
- admin → purple
- editor → blue
- editor_senior → indigo
- ere → cyan
- sales → gray

---

## Component API Conventions

### Class merging

Each component defines a local `cn()` helper:

```ts
function cn(...classes: Array<string | false | null | undefined>) {
  return classes.filter(Boolean).join(' ')
}
```

### Standard props pattern

```tsx
interface Props {
  variant?: 'primary' | 'secondary' | 'ghost'
  size?: 'sm' | 'md' | 'lg'
  className?: string
  children: React.ReactNode
}
```

Maps for variant/size → class strings:

```tsx
const variantClasses: Record<Variant, string> = { ... }
const sizeClasses: Record<Size, string> = { ... }
```

Merged via `cn(base, variantClasses[variant], sizeClasses[size], className)`.

### UI Primitives (`components/ui/`)

| Component | Variants | Sizes | Notable Props |
|-----------|----------|-------|---------------|
| Button | primary, secondary, ghost, destructive, outline, subtle | xs, sm, md, lg | `loading`, `fullWidth`, `leftIcon`, `rightIcon` |
| Input | — | sm, md, lg | `label`, `error`, `helperText`, `leftIcon`, `rightIcon` |
| Select | — | sm, md, lg | `label`, `error`, `helperText`, `options`, `placeholder` |
| Textarea | — | sm, md, lg | `label`, `error`, `helperText`, `rows` |
| Alert | error, warning, info, success | — | `title`, `icon` |
| Dropdown | — | — | `trigger`, `items`, `align` |

### Import pattern

```tsx
import { Button, Input, Select } from '@/components/ui'
// or individually:
import { Button } from '@/components/ui/Button'
```

---

## Layout Patterns

### App shell (`app/(app)/layout.tsx`)

```
┌─────────────────────────────────────┐
│ GlobalHeader                        │
├────────┬────────────────────────────┤
│Sidebar │ PageContent                │
│ 70px   │  ┌──────────────────────┐  │
│        │  │ PageHeader (desktop) │  │
│        │  ├──────────────────────┤  │
│        │  │ Content              │  │
│        │  └──────────────────────┘  │
├────────┴────────────────────────────┤
│ MobileBottomNav (mobile only)       │
└─────────────────────────────────────┘
```

### AppLayout wrapper (`components/common/AppLayout.tsx`)

Used by most pages for consistent chrome:

```tsx
<AppLayout header={<PageHeader title="..." />}>
  {children}
</AppLayout>
```

Produces:
- Container: `p-0 md:p-3 h-full`
- Card: `bg-white md:rounded-2xl md:border md:border-slate-200/80 md:shadow-sm`
- Header: `hidden md:block` (desktop only)
- Content: `flex-1 overflow-auto pb-20 md:pb-0 bg-gray-50/30`

### Entity page pattern

Most CRM pages (businesses, opportunities, deals, tasks, etc.) use:

```tsx
<EntityPageHeader ... />
<div className="flex-1 overflow-auto p-0 md:p-4">
  {isLoading ? <TableSkeleton /> : <EntityTable ... />}
</div>
```

### Sidebar

- Desktop: drawer at `ml-[70px]` (or `ml-[86px]` in loading files)
- Mobile: hamburger overlay menu
- Bottom nav: fixed, 4 primary items + "More" sheet

---

## Typography Scale

| Usage | Class | Example |
|-------|-------|---------|
| Page title | `text-lg font-semibold tracking-tight` | Section headings |
| Section label | `text-[11px] font-semibold uppercase tracking-wider text-gray-400` | Table section headers |
| Body | `text-sm` or `text-[13px]` | Table cells, descriptions |
| Small meta | `text-[10px]` or `text-xs` | Sublabels, timestamps |
| Tabular data | `font-mono tabular-nums` | Scores, money, rankings |

---

## Icons

**Library:** `@mui/icons-material`

```tsx
import TrendingUpIcon from '@mui/icons-material/TrendingUp'

// Sizing:
<TrendingUpIcon style={{ fontSize: 18 }} />   // inline size
<TrendingUpIcon fontSize="small" />            // MUI preset
<TrendingUpIcon className="w-4 h-4" />         // Tailwind sizing
```

Common sizes:
- Section headers: 14px
- Modal headers: 18px
- Page icons: 20px
- Empty states: 48px

---

## Animations & Transitions

### Keyframes (`globals.css`)

| Name | Effect | Usage |
|------|--------|-------|
| `fadeIn` | Opacity 0 → 1 | Content entrance |
| `slideUp` | translateY(100%) → 0 | Bottom sheets, mobile panels |
| `slideUpSmall` | Opacity + translateY(10px) → 0 | Subtle entrance |
| `shimmer` | background-position sweep -200% → 200% | Skeleton loading |
| `slideInRight` | translateX(100%) → 0 | Sidebar, drawer entrance |
| `soundWave` | Height 8px ↔ 32px | Audio/voice visualizer |

### Shimmer Skeleton System

Two CSS utility classes for all loading skeletons:

```css
/* Light shimmer — body cells, secondary blocks */
.skel {
  background: linear-gradient(90deg, #f3f4f6, #f9fafb, #f3f4f6);
  background-size: 200% 100%;
  animation: shimmer 1.6s ease-in-out infinite;
}

/* Strong shimmer — headers, first column, emphasis */
.skel-strong {
  background: linear-gradient(90deg, #e5e7eb, #f3f4f6, #e5e7eb);
  background-size: 200% 100%;
  animation: shimmer 1.6s ease-in-out infinite;
}
```

**Usage in loading files and skeletons:**

```tsx
{/* Header block */}
<div className="h-3 rounded w-24 skel" style={{ animationDelay: '50ms' }} />

{/* Emphasized block (first column, title) */}
<div className="h-4 rounded w-48 skel-strong" style={{ animationDelay: '0ms' }} />
```

**Stagger pattern:** Each row/cell gets an incremental `animationDelay` so the shimmer cascades through the skeleton:

```tsx
style={{ animationDelay: `${row * 50 + col * 30}ms` }}
```

**Width jitter:** Rows use slight width variation to avoid a rigid grid look:

```tsx
const jitter = ((row * 7 + col * 13) % 5) * 3
style={{ width: `${Math.max(6, baseWidth - jitter)}%` }}
```

### Shared skeleton component

`components/shared/TableSkeleton.tsx` — reusable for any table page:

```tsx
<TableSkeleton
  rows={8}                              // desktop row count
  columns={[16, 12, 10, 10, 12, 10, 8]} // column width percentages
  mobileCards={5}                        // mobile card count
/>
```

Renders a table skeleton on desktop (`hidden md:block`) and a card list on mobile (`md:hidden`).

### Route loading files (`app/(app)/*/loading.tsx`)

Every route has a `loading.tsx` that uses `.skel` / `.skel-strong` to match the page's actual layout. The skeleton mirrors:
- Header with search/filter tab placeholders
- Table or content area matching the real layout structure

This ensures seamless visual continuity: route skeleton → component skeleton → real content, all using the same shimmer animation.

### Transition conventions

| Element | Transition |
|---------|-----------|
| Buttons | `transition-all duration-150 ease-out`, `active:scale-[0.98]` |
| Modal entrance | `transition-all duration-300`, `opacity-0 scale-95` → `opacity-100 scale-100` |
| Sidebar margin | `transition-all duration-300` |
| Hover states | `transition-colors` (default 150ms) |
| Content fade-in | `animate-[fadeIn_0.3s_ease-out]` |

---

## Modal Patterns

### ModalShell (`components/shared/ModalShell.tsx`)

```tsx
<ModalShell
  isOpen={isOpen}
  onClose={onClose}
  maxWidth="4xl"        // sm | md | lg | xl | 2xl | 4xl | 5xl
  title="Modal Title"
  subtitle="Section"
  icon={<SomeIcon style={{ fontSize: 18 }} />}
  iconColor="blue"      // blue | orange | green | purple | red | gray
  autoHeight={false}     // true = content height; false = fixed 85vh
  footer={<ModalFooter ... />}
>
  {children}
</ModalShell>
```

**Behavior:**
- Mobile: full screen, no rounded corners
- Desktop: centered with `md:p-3`, `md:rounded-xl`, max 85vh (or auto-height)
- Escape key closes (via `useModalEscape`)
- Click backdrop closes
- Z-index: backdrop `z-[60]`, panel `z-[70]`

**ModalFooter:**

```tsx
<ModalShell.Footer
  onCancel={onClose}
  submitLabel="Save"
  submitLoading={saving}
  submitVariant="primary"  // primary | success | danger
  formId="my-form"
/>
```

---

## Table Patterns

### EntityTable (`components/shared/table/EntityTable.tsx`)

```tsx
<EntityTable
  columns={columnConfig}
  data={items}
  sortField={sortField}
  sortDirection={sortDirection}
  onSort={handleSort}
/>
```

**Column config:**

```tsx
const columns: ColumnConfig[] = [
  { key: 'name', label: 'Nombre', sortable: true, width: 'w-[200px]' },
  { key: 'status', label: 'Estado', sortable: true, align: 'center' },
  { key: 'actions', label: '', width: 'w-[80px]' },
]
```

**Visual style:**
- Wrapper: `bg-white border border-slate-200 rounded-lg shadow-sm`
- Header: `bg-slate-100 border-b border-slate-200`
- Header cells: `text-xs font-bold uppercase tracking-wider text-slate-700`
- Rows: alternating `bg-white` / `bg-slate-100/50`, hover `bg-blue-50/50`
- Horizontal scroll via `.table-scroll-x` (styled scrollbar in `globals.css`)

---

## Form Patterns

### Form controls

All form components share: `label`, `error`, `helperText`, `size`, `fullWidth`.

```tsx
<Input
  label="Nombre"
  error={errors.name}
  helperText="Requerido"
  size="sm"
  fullWidth
/>
```

### Modal forms

Forms inside modals use a `formId` pattern:

```tsx
<form id="deal-form" onSubmit={handleSubmit}>
  {/* fields */}
</form>

<ModalShell.Footer
  formId="deal-form"
  submitLabel="Guardar"
/>
```

The footer's submit button uses `form={formId}` to submit from outside the form element.

### Layout

```tsx
<div className="grid grid-cols-1 md:grid-cols-2 gap-4">
  <Input label="Field 1" />
  <Input label="Field 2" />
  <Textarea label="Full width" className="md:col-span-2" />
</div>
```

---

## Badges & Status Indicators

### Standard badge

```tsx
<span className="inline-flex items-center text-xs font-medium rounded-full px-2 py-0.5 bg-blue-100 text-blue-700">
  Active
</span>
```

### Color-mapped badge

```tsx
const STATUS_COLORS: Record<string, string> = {
  draft: 'bg-gray-100 text-gray-800',
  pending: 'bg-yellow-100 text-yellow-800',
  approved: 'bg-blue-100 text-blue-800',
  booked: 'bg-green-100 text-green-800',
}

<span className={`... ${STATUS_COLORS[status]}`}>
  {STATUS_LABELS[status]}
</span>
```

---

## Mobile Responsiveness

### Breakpoint strategy

Primary breakpoint: `md` (768px). Mobile-first approach.

| Pattern | Mobile | Desktop |
|---------|--------|---------|
| Visibility | `md:hidden` | `hidden md:block` |
| Layout | `flex-col` | `md:flex-row` |
| Padding | `p-0` | `md:p-3`, `md:p-4` |
| Sidebar | Hidden (hamburger) | `md:ml-[70px]` |
| Nav | Bottom nav + hamburger | Sidebar drawer |
| Modal | Full screen | Centered, rounded, 85vh |
| Table | Card list (stacked) | Horizontal scroll table |
| Bottom clearance | `pb-20` (nav height) | `md:pb-0` |

### Safe area support

```css
.safe-area-bottom { padding-bottom: env(safe-area-inset-bottom, 0); }
.safe-area-top { padding-top: env(safe-area-inset-top, 0); }
.pb-safe { padding-bottom: env(safe-area-inset-bottom, 0); }
```

### Touch targets

```css
.touch-target { min-height: 44px; min-width: 44px; }
```

### Viewport config (`app/layout.tsx`)

```tsx
viewportFit: 'cover'   // iOS safe areas
maximumScale: 1         // prevent zoom on input focus
```

---

## File Reference

| Area | Path |
|------|------|
| Global styles | `app/globals.css` |
| Root layout | `app/layout.tsx` |
| App layout | `app/(app)/layout.tsx` |
| UI primitives | `components/ui/` (Button, Input, Select, Dropdown, Textarea, Alert) |
| Layout wrappers | `components/common/AppLayout.tsx`, `PageContent.tsx`, `PageHeader.tsx` |
| Modal shell | `components/shared/ModalShell.tsx` |
| Entity page header | `components/shared/EntityPageHeader.tsx` |
| Table components | `components/shared/table/`, `SortableTableHeader.tsx` |
| Table skeleton | `components/shared/TableSkeleton.tsx` |
| Form modal skeleton | `components/common/FormModalSkeleton.tsx` |
| Sidebar | `components/common/HamburgerMenu.tsx` |
| Mobile nav | `components/common/MobileBottomNav.tsx` |
| Route loading files | `app/(app)/*/loading.tsx` |
| Status constants | `lib/constants/booking-request-statuses.ts`, `lib/constants/lead-stages.ts` |
| Stage colors | `components/crm/opportunity/constants.ts` |
