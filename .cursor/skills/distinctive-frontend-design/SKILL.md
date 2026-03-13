---
name: distinctive-frontend-design
description: Creates distinctive, production-grade frontend interfaces that avoid generic AI aesthetics. Guides bold aesthetic direction, typography, color, motion, and spatial composition for memorable UI. Use when building frontend components, pages, applications, or interfaces, or when the user asks for UI/UX design, styling, or visually striking interfaces.
---

# Distinctive Frontend Design

Build frontend interfaces with genuine design intent. Every interface should feel like it was crafted by a human designer with a strong point of view — never like default AI output.

> **Canonical reference**: `docs/DESIGN_SYSTEM.md` contains the full, detailed design system. Read it before building any new UI. This skill summarizes the most critical patterns and adds creative direction guidance.

## Consistency vs Creativity

Before building anything, determine which mode applies:

### App Pages (consistency-first)
Building inside `app/(app)/` — CRM pages, modals, forms, tables, settings, anything behind auth:
- **Follow existing conventions exactly.** Match typography, spacing, colors, component APIs.
- Use `AppLayout`, `PageHeader`, `ModalShell`, `EntityTable`, existing UI primitives.
- Do NOT introduce new fonts, exotic layouts, or unconventional patterns.
- The "Design Thinking" and "Core Aesthetic Principles" sections below do NOT apply here.

### Public / Standalone Pages (creativity-first)
Landing pages, public forms, marketing, error pages, standalone experiences:
- **Go bold.** Use the "Design Thinking" and "Core Aesthetic Principles" sections.
- Still respect the technical stack (Tailwind v4, `next/font/google`, `cn()`, etc.).
- Can introduce distinctive fonts, custom palettes, unconventional layouts.

### New Features Within the App
New sections, dashboards, or features that don't have a precedent:
- **Start from existing conventions**, then layer in thoughtful design touches.
- Use existing components and patterns as the foundation.
- Add personality through motion, micro-interactions, or spatial composition — not by breaking established patterns.

---

## Project Context

This is a **Next.js App Router** project with the following stack:

- **Styling**: Tailwind CSS v4 (CSS-first config via `@theme inline` in `globals.css`)
- **Fonts**: Geist Sans & Geist Mono via `next/font/google` (defined in `app/layout.tsx`)
- **UI Components**: Custom components in `components/ui/` — uses `cn()` utility for class merging
- **Icons**: `@mui/icons-material` (Material UI icons package)
- **Animations**: CSS `@keyframes` in `globals.css` + transitions. No framer-motion installed.
- **Theme**: Light mode only (`color-scheme: light`), CSS variables at `:root`
- **Auth**: Clerk with Spanish localization (`lang="es"`)
- **Language**: All user-facing text in **Spanish** (button labels, placeholders, aria-labels, headings)
- **Layout**: `AppLayout` > `PageHeader` + `PageContent`, white cards on `bg-gray-50/30`

### Working Within This Stack

- **Fonts**: Add new display fonts via `next/font/google`. Set as CSS variable, reference via `font-[var(--font-name)]` or extend `@theme`.
- **Tailwind v4**: Extend colors/tokens in `globals.css` using `@theme inline { }` — no JS config file.
- **Components**: Follow existing patterns — `cn()` for class merging, variant/size props. Import from `@/components/ui/`.
- **CSS custom properties**: Define at `:root` in `globals.css` or scoped to component.
- **Animations**: Use existing `@keyframes` from `globals.css`. For new simple animations, add `@keyframes` there. For complex orchestration, suggest installing `motion` (framer-motion).

---

## Existing Design Conventions

These are the actual patterns used across the app. Follow them exactly for app pages.

### Typography Scale

| Usage | Classes |
|-------|---------|
| Page title | `text-lg font-semibold tracking-tight text-gray-900` |
| Section label | `text-[11px] font-semibold uppercase tracking-wider text-gray-400` |
| Body text | `text-sm` or `text-[13px]` |
| Small meta / timestamps | `text-[10px]` or `text-xs` |
| Modal title | `text-sm font-bold text-gray-900` |
| Modal subtitle | `text-[10px] text-gray-400 font-semibold uppercase tracking-wider` |
| Form labels | `text-sm font-medium text-slate-600` |
| Tabular data / numbers | `font-mono tabular-nums` |
| Filter tab | `text-[11px] font-medium` |
| Sidebar icon label | `text-[9px] font-medium` |
| Mobile nav label | `text-[10px]` |
| Table header cells | `text-xs font-bold uppercase tracking-wider text-slate-700` |
| Table body cells | `text-[13px]` |
| Drawer header | `text-[13px] font-bold uppercase tracking-wider` |

### Color System

**Primary palette:**

| Role | Token | Usage |
|------|-------|-------|
| Primary action | `blue-500` / `blue-600` | Buttons, links, active states |
| Danger | `red-500` / `red-600` | Destructive actions, errors |
| Success | `emerald-600` / `green-600` | Won, booked, completed |
| Warning | `yellow-50` / `amber-600` | Pending, attention needed |
| Neutral | `gray-50` → `gray-900` | Backgrounds, text, borders |

**Semantic status colors** (consistent across all entities):

| Meaning | Background | Text | Border |
|---------|-----------|------|--------|
| Draft / Unknown | `gray-50` / `gray-100` | `gray-600` / `gray-800` | `gray-200` |
| Pending / Waiting | `yellow-50` / `yellow-100` | `yellow-700` / `yellow-800` | `yellow-200` |
| In progress / Approved | `blue-50` / `blue-100` | `blue-700` / `blue-800` | `blue-200` |
| Won / Booked / Success | `emerald-50` / `green-100` | `emerald-700` / `green-800` | `emerald-200` |
| Lost / Rejected / Error | `red-50` / `red-100` | `red-600` / `red-800` | `red-200` |
| Cancelled / Warning | `orange-50` / `orange-100` | `orange-700` | `orange-200` |
| Special / Advanced | `purple-50` / `indigo-100` | `purple-700` / `indigo-800` | `purple-200` |

**Category colors** (`lib/categories.ts`): 15 main categories each have `{ bg, text, border, indicator }` — e.g., HOTELES=blue, RESTAURANTES=red, SHOWS=purple, ACTIVIDADES=green, PRODUCTOS=orange, etc. Fallback: `slate-100/slate-900/slate-400/slate-500`.

### Icon Sizes

| Context | Size | Method |
|---------|------|--------|
| Tiny inline | 11–13px | `style={{ fontSize: 11 }}` |
| Table / section | 14px | `style={{ fontSize: 14 }}` |
| Buttons | 16px | `[&>svg]:h-4 [&>svg]:w-4` (via Button component) |
| Modal headers | 18px | `style={{ fontSize: 18 }}` |
| Page-level / close | 20px | `style={{ fontSize: 20 }}` |
| Mobile nav | 22px | `style={{ fontSize: 22 }}` |
| Empty states | 48px | `style={{ fontSize: 48 }}` |

### UI Primitives (`components/ui/`)

| Component | Variants | Sizes | Key Props |
|-----------|----------|-------|-----------|
| **Button** | `primary`, `secondary`, `ghost`, `destructive`, `outline`, `subtle` | `xs`, `sm`, `md`, `lg` | `loading`, `fullWidth`, `leftIcon`, `rightIcon` |
| **Input** | — | `sm`, `md`, `lg` | `label`, `error`, `helperText`, `leftIcon`, `rightIcon`, `fullWidth` |
| **Select** | — | `sm`, `md`, `lg` | `label`, `error`, `helperText`, `options`, `placeholder` |
| **Textarea** | — | `sm`, `md`, `lg` | `label`, `error`, `helperText`, `rows` |
| **Alert** | `error`, `warning`, `info`, `success` | — | `title`, `icon` |
| **Dropdown** | — | — | `trigger`, `items`, `align` |

Import: `import { Button, Input, Select } from '@/components/ui'`

Shared input styling: `border border-gray-200 rounded-lg shadow-sm`, focus: `ring-2 ring-blue-500/20 border-blue-500`, error: `border-red-300 focus:ring-red-500`.

### Layout Architecture

```
┌─────────────────────────────────────┐
│ GlobalHeader (h-14, sticky, z-50)   │
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

- **Container**: `p-0 md:p-3 h-full`
- **Card wrapper**: `bg-white md:rounded-2xl md:border md:border-slate-200/80 md:shadow-sm`
- **Content area**: `flex-1 overflow-auto pb-20 md:pb-0 bg-gray-50/30`
- **Sidebar margin**: `md:ml-[70px]`, transition `duration-300`
- **Mobile clearance**: `pb-20` for bottom nav

### ModalShell (`components/shared/ModalShell.tsx`)

```tsx
<ModalShell
  isOpen={isOpen}
  onClose={onClose}
  maxWidth="4xl"        // sm | md | lg | xl | 2xl | 4xl | 5xl
  title="Título"
  subtitle="SECCIÓN"
  icon={<SomeIcon style={{ fontSize: 18 }} />}
  iconColor="blue"      // blue | orange | green | purple | red | gray
  autoHeight={false}     // true = content height; false = fixed 85vh
  footer={<ModalShell.Footer ... />}
>
  {children}
</ModalShell>
```

- Mobile: full screen, no rounded corners
- Desktop: centered, `md:rounded-xl`, max `85vh` (or auto-height)
- Z-index: backdrop `z-[60]`, panel `z-[70]`
- Header: `px-4 py-2.5 border-b border-gray-200`
- Footer: `px-4 py-2.5 bg-gray-50 border-t border-gray-200`
- Icon container: `p-1.5 rounded-lg border border-{color}-200 bg-{color}-50 text-{color}-600`

**ModalShell.Footer:**

```tsx
<ModalShell.Footer
  onCancel={onClose}
  submitLabel="Guardar"
  submitLoading={saving}
  submitVariant="primary"  // primary | success | danger
  formId="my-form"
/>
```

### Table Patterns

- Wrapper: `bg-white border border-slate-200 rounded-lg shadow-sm`
- Header: `bg-slate-100 border-b border-slate-200`
- Header cells: `text-xs font-bold uppercase tracking-wider text-slate-700`
- Body: `text-[13px]`, rows `divide-y divide-slate-100`
- Row hover: `hover:bg-blue-50/50`
- Horizontal scroll: `.table-scroll-x` class (styled scrollbar in `globals.css`)

### Card Patterns

- Standard: `bg-white border border-gray-200 rounded-lg shadow-sm`
- App layout card: `bg-white md:rounded-2xl md:border md:border-slate-200/80 md:shadow-sm`
- Hover: `hover:shadow-md transition-all duration-300`

### Badge & Filter Patterns

**Badges:**
- Shape: `inline-flex items-center text-xs font-medium rounded-full px-2 py-0.5`
- Color: `bg-{color}-100 text-{color}-700` (follows semantic status colors)
- Small variant: `text-[10px]` or `text-[11px]`

**FilterTabs:**
- Active: `bg-gray-900 text-white`
- Inactive: `bg-gray-100 text-gray-600 hover:bg-gray-200`
- Shape: `rounded-full px-2.5 py-1 text-[11px] font-medium`
- Count badge: `text-[9px]`, active `bg-gray-700`, inactive `bg-white text-gray-600`

### Form Patterns

- Grid layout: `grid grid-cols-1 md:grid-cols-2 gap-4`
- Full-width field: `md:col-span-2`
- Label + field spacing: `flex flex-col gap-0.5`
- Required indicator: red `*`
- Modal forms use `formId` pattern: `<form id="deal-form">` + `<ModalShell.Footer formId="deal-form" />`

### Responsive Strategy

Primary breakpoint: **`md` (768px)**. Mobile-first approach.

| Pattern | Mobile | Desktop |
|---------|--------|---------|
| Visibility | `md:hidden` | `hidden md:block` |
| Layout | `flex-col` | `md:flex-row` |
| Padding | `p-0` | `md:p-3`, `md:p-4` |
| Sidebar | Hidden (hamburger) | `md:ml-[70px]` |
| Navigation | Bottom nav + hamburger | Sidebar drawer |
| Modals | Full screen | Centered, rounded, 85vh |
| Tables | Card list (stacked) | Horizontal scroll table |
| Bottom clearance | `pb-20` (nav height) | `md:pb-0` |

Safe area: `.safe-area-bottom`, `.safe-area-top`, `.pb-safe` for notched devices.
Touch targets: `.touch-target` (44px min).

### Z-Index Hierarchy

| Layer | Z-Index | Element |
|-------|---------|---------|
| Header | `z-50` | `GlobalHeader` (sticky) |
| Modal backdrop | `z-[60]` | `ModalShell` backdrop |
| Modal panel | `z-[70]` | `ModalShell` content |
| Dropdowns | `z-[9999]` | `Dropdown` panel |
| Select dropdown | `z-[99999]` | `Select` dropdown |

### Existing Animations (`globals.css`)

| Name | Effect | Usage |
|------|--------|-------|
| `fadeIn` | Opacity 0 → 1 | Content entrance, backdrops |
| `slideUp` | translateY(100%) → 0 | Bottom sheets, mobile panels |
| `slideUpSmall` | Opacity + translateY(10px) → 0 | Subtle entrance |
| `slideInRight` | translateX(100%) → 0 | Drawer, sidebar |
| `shimmer` | Background sweep | Skeleton loading |
| `soundWave` | Height oscillation | Audio visualizer |

**Skeleton system**: `.skel` (light shimmer) and `.skel-strong` (dark shimmer), 1.6s ease-in-out. Stagger pattern: `animationDelay: ${row * 50 + col * 30}ms`. Width jitter for organic feel.

**Transition conventions:**

| Element | Transition |
|---------|-----------|
| Buttons | `duration-150 ease-out`, `active:scale-[0.98]` |
| Modal entrance | `duration-300`, scale 95% → 100% |
| Sidebar margin | `duration-300` |
| Hover states | `transition-colors` (150ms) |
| Drawer | `animate-[slideInRight_200ms_ease-out]` |

### Custom Utility Classes

| Class | Purpose |
|-------|---------|
| `.skel` | Light skeleton shimmer |
| `.skel-strong` | Strong skeleton shimmer |
| `.scrollbar-hide` | Hide scrollbar (all browsers) |
| `.table-scroll-x` | Horizontal table scroll with styled scrollbar |
| `.safe-area-bottom` / `.safe-area-top` | Device notch padding |
| `.pb-safe` | Bottom safe area padding |
| `.touch-target` | 44px min touch target |

---

## Design Thinking (Creative Pages Only)

> **Skip this section for app pages.** Only apply when building public/standalone/marketing pages.

Before writing any code, spend time on these four questions:

1. **Purpose**: What problem does this solve? Who is the audience?
2. **Tone**: Commit to a BOLD aesthetic direction. Pick one and go deep:
   - Brutally minimal | Maximalist chaos | Retro-futuristic | Organic/natural
   - Luxury/refined | Playful/toy-like | Editorial/magazine | Brutalist/raw
   - Art deco/geometric | Soft/pastel | Industrial/utilitarian | Neo-grotesque
   - Typographic-forward | Glassmorphic depth | Monochrome drama | Warm analog
3. **Constraints**: Performance targets, accessibility, brand coherence.
4. **Differentiator**: What single element makes this UNFORGETTABLE?

Output a brief design brief (2-4 sentences) before implementation. Example:
> "Dashboard for creative professionals. Art deco geometric aesthetic: sharp angles, gold accent on deep navy, Playfair Display headings with DM Sans body. Differentiator: animated geometric border patterns that respond to data state."

## Core Aesthetic Principles (Creative Pages Only)

> **Skip this section for app pages.** Only apply when building public/standalone/marketing pages.

### Typography

Choose fonts that have genuine character. Pair a distinctive display font with a refined body font.

- For curated pairings organized by aesthetic, see [font-pairings.md](font-pairings.md)
- Load via `next/font/google` — set as CSS variable, use in Tailwind classes
- Set a clear typographic scale (e.g., 1.25 or 1.333 ratio)
- Use `letter-spacing`, `line-height`, and `text-transform` intentionally

**NEVER use**: Inter, Roboto, Arial, Open Sans, Lato, Geist, system-ui as display/heading fonts. These are generic defaults. Geist is fine for body/UI text since it's the project default, but headings and hero text deserve character.

### Color & Theme

Commit fully. Dominant colors with sharp accents beat timid, evenly-distributed palettes.

- Define palette as CSS custom properties at `:root` or scoped via `@theme inline`
- Use a clear hierarchy: 1 dominant, 1-2 accents, neutrals
- Light-mode only — avoid pure `#fff`; use warm or cool off-whites
- New pages can have their own palette while staying coherent with the brand

### Motion & Interaction

Prioritize high-impact orchestrated moments over scattered micro-interactions.

- **Page load**: Staggered reveals using `animation-delay` on sequential elements
- **Scroll**: Intersection Observer for scroll-triggered entrances
- **Hover states**: Surprising, delightful transitions (scale, color shift, shadow lift, underline animations)
- **CSS animations**: Use `@keyframes` in global CSS or component-scoped styles
- **For complex motion**: Consider adding `motion` (framer-motion) — `npm install motion`
- One well-orchestrated sequence > many small animations

### Spatial Composition

Break predictable layouts. Not every design needs to be wild — but every design needs intentional spatial choices.

- Asymmetric grids, overlapping elements, diagonal flow
- Grid-breaking hero elements or pull-quotes
- Generous negative space OR controlled density — both are valid; pick one
- Consider viewport-relative sizing (`dvh`, `vw`, `clamp()`)

### Backgrounds & Visual Depth

Create atmosphere. Solid flat colors are a missed opportunity.

- Gradient meshes, noise/grain textures, geometric patterns
- Layered transparencies and backdrop-filter effects
- Dramatic shadows (layered `box-shadow` stacks, not single default shadows)
- Decorative borders, custom dividers, ornamental elements

## Anti-Patterns (Creative Pages Only)

> **These apply to creative/public pages.** App pages should follow the conventions in "Existing Design Conventions" above.

NEVER produce creative interfaces with these characteristics:

| Element | Generic (Avoid) | Distinctive (Do This) |
|---------|------------------|-----------------------|
| Fonts | Inter, Roboto, Arial, Geist for headings | Distinctive display + refined body pairing |
| Colors | Purple gradient on white, blue-to-purple | Context-specific palette with clear hierarchy |
| Shadows | `shadow-md` / single box-shadow | Layered shadow stacks or dramatic directional |
| Borders | `rounded-lg border border-gray-200` | Contextual: sharp edges, ornamental, or none |
| Layout | Card grid, centered hero, symmetric | Asymmetric, overlapping, grid-breaking |
| Spacing | Uniform padding everywhere | Rhythmic variation, generous whitespace |
| Backgrounds | Solid white/gray | Textured, gradient, patterned, atmospheric |
| Animations | Fade-in-up on everything | Orchestrated sequences with intentional timing |

---

## Implementation Guidelines

### Code Quality

- Production-grade: no placeholder content, no TODO comments, no broken states
- Semantic HTML, accessible by default (`aria-labels`, focus states, contrast ratios)
- CSS custom properties for theming consistency
- Responsive: mobile-first, `md` breakpoint as primary switch
- Follow existing component API conventions (`cn()`, variant props, size props)
- All UI text in **Spanish** (e.g., "Guardar", "Cancelar", "Cerrar", "Buscar", "Sin resultados")

### Tailwind v4

- Extend tokens in `globals.css` via `@theme inline { --color-*: ...; --font-*: ...; }`
- Use arbitrary values `[...]` to break out of default Tailwind system
- Layer custom CSS for effects Tailwind can't express
- For new fonts: define in `next/font/google`, set CSS variable, reference as `font-[var(--font-name)]`

### New Component Pattern

Follow existing conventions when creating new UI components:

```tsx
import { cn } from '@/lib/utils';

interface Props {
  variant?: 'primary' | 'secondary' | 'ghost';
  size?: 'sm' | 'md' | 'lg';
  className?: string;
  children: React.ReactNode;
}

export function MyComponent({ variant = 'primary', size = 'md', className, children }: Props) {
  return (
    <div className={cn(
      'base-classes-here',
      variant === 'primary' && 'primary-classes',
      size === 'md' && 'md-classes',
      className
    )}>
      {children}
    </div>
  );
}
```

## Variety Mandate (Creative Pages Only)

When building creative/public pages, NEVER converge on the same choices across different generations:
- Use different font families each time
- Vary aesthetic directions (don't always pick the same style)
- Different color palettes, layout approaches, animation strategies

Each creative interface should feel like it came from a different designer.

**This does NOT apply to app pages** — those should be consistent with each other.

## Additional Resources

- **Full design system reference**: `docs/DESIGN_SYSTEM.md` — read before building UI
- Curated font pairings by aesthetic: [font-pairings.md](font-pairings.md)
- Detailed aesthetic directions: [aesthetics-reference.md](aesthetics-reference.md)
