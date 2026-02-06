# Aesthetics Reference

Detailed guide to each aesthetic direction with visual characteristics, implementation techniques, and palette suggestions.

## Brutally Minimal

**Visual signature**: Extreme reduction. Vast whitespace. One or two elements per viewport. Typography does all the heavy lifting.

**Implementation**:
- Single-column layout, centered or left-aligned
- Monochrome or two-color palette maximum
- Large type sizes (4rem+ headings), dramatic size contrast
- No borders, no shadows, no gradients — pure form
- Micro-interactions only: subtle hover states, cursor changes
- Background: solid off-white or deep black

**Palette example**: `#0a0a0a` (text) + `#f5f0eb` (background) + single accent `#c8102e`

---

## Maximalist Chaos

**Visual signature**: Layered, dense, energetic. Multiple visual systems competing for attention. Feels alive and overwhelming in the best way.

**Implementation**:
- Overlapping elements with `z-index` layering
- Mixed typography: multiple font families, sizes, weights on one screen
- Saturated, clashing colors that somehow work through repetition
- Animated backgrounds, floating elements, parallax layers
- Rotated text, diagonal dividers, broken grid
- Decorative elements: stickers, stamps, doodles, emojis as texture

**Palette example**: `#ff006e` + `#8338ec` + `#ffbe0b` + `#06d6a0` + `#118ab2` on `#1a1a2e`

---

## Retro-Futuristic

**Visual signature**: 1970s-80s vision of the future. CRT glow, scan lines, chrome gradients, neon on dark.

**Implementation**:
- Dark backgrounds with CRT-green or neon accent colors
- Scan-line overlay via repeating-linear-gradient (1px transparent, 1px rgba)
- Text glow: `text-shadow` with neon color at multiple blur distances
- Monospace or geometric sans fonts
- Grid lines in background (faint, perspective-warped if possible)
- Chrome/metallic gradients on buttons or headings
- Flicker animations with subtle opacity keyframes

**Palette example**: `#0d0221` (bg) + `#0abdc6` (primary) + `#ea00d9` (accent) + `#711c91`

---

## Organic / Natural

**Visual signature**: Fluid shapes, earthy tones, hand-drawn quality. Feels grown, not manufactured.

**Implementation**:
- Blob shapes via `border-radius` with 8 values or SVG paths
- Earth-tone palette: greens, terracotta, sand, moss
- Subtle noise/grain texture overlay on backgrounds
- Rounded corners (large radii), soft shadows
- Serif or humanist sans typography
- Animations: gentle sway, breathing scale, flowing gradients
- Organic dividers: wave SVGs, torn-paper edges

**Palette example**: `#2d5016` + `#8fbc5a` + `#f4e9cd` + `#c67b4e` + `#3c2415`

---

## Luxury / Refined

**Visual signature**: Restrained opulence. Every pixel intentional. Breathes confidence through negative space and quality details.

**Implementation**:
- High-contrast serif typography, generous letter-spacing on caps
- Muted palette with metallic accent (gold, rose gold, silver)
- Subtle animations: slow fades, gentle parallax
- Fine hairline borders, thin dividers
- Photography-forward: large hero images with overlay text
- Background: deep navy, charcoal, or warm cream
- Hover states: understated but precise (underline slides, opacity shifts)

**Palette example**: `#1a1a2e` (bg) + `#c9a96e` (gold) + `#f8f4ef` (cream) + `#4a4a4a` (text)

---

## Playful / Toy-like

**Visual signature**: Rounded, bouncy, colorful. Feels like a well-designed children's product — but sophisticated enough for adults.

**Implementation**:
- Large border-radius on everything (16px-32px+)
- Saturated primary colors, large solid color blocks
- Bouncy easing: `cubic-bezier(0.34, 1.56, 0.64, 1)` for spring effect
- Floating/bobbing animations, playful hover states (wiggle, grow)
- Rounded fonts, chunky weights
- Emoji or icon accents as decorative elements
- Soft, colorful shadows (`box-shadow` with tinted colors, not gray)

**Palette example**: `#ff6b6b` + `#4ecdc4` + `#ffe66d` + `#a8e6cf` + `#2c2c54` (text)

---

## Editorial / Magazine

**Visual signature**: Confident typography-first design. Feels like a premium publication layout.

**Implementation**:
- Dramatic type scale: massive headlines (6rem+), refined body text
- Multi-column layouts with pull quotes breaking the grid
- Serif headings, clean sans body (or reverse)
- Rule lines (thin horizontal dividers) between sections
- Drop caps on first paragraph
- High-contrast: very dark text on very light background or reverse
- Minimal color — let typography hierarchy carry the page
- CSS columns for text-heavy sections

**Palette example**: `#1a1a1a` + `#ffffff` + single accent `#d64045`

---

## Brutalist / Raw

**Visual signature**: Confrontational. Exposed structure. Deliberate ugliness that becomes beautiful through commitment.

**Implementation**:
- System fonts, monospace, or heavy sans-serif at extreme sizes
- Harsh borders: thick (3-5px), solid black
- No border-radius — sharp 0px corners
- Raw background colors: primary yellow, red, blue
- Visible grid structure, exposed layout mechanics
- Cursor: `crosshair` or `pointer`
- Minimal animation — when used, harsh and instant (no easing)
- ASCII art, code-like elements, raw HTML aesthetic

**Palette example**: `#ffffff` + `#000000` + `#ff0000` + `#0000ff` + `#ffff00`

---

## Art Deco / Geometric

**Visual signature**: 1920s glamour meets mathematical precision. Symmetry, repetition, metallic accents, geometric motifs.

**Implementation**:
- Geometric patterns: chevrons, sunbursts, repeating triangles via CSS
- Gold/brass accent on deep colors (navy, emerald, black)
- Thin geometric fonts, all-caps headings with wide letter-spacing
- Symmetrical layouts, centered compositions
- Decorative borders: double lines, geometric corner ornaments
- Fan/sunburst shapes as backgrounds (conic-gradient)
- Subtle art deco motifs as section dividers

**Palette example**: `#0c1b33` (navy) + `#d4af37` (gold) + `#1a472a` (emerald) + `#f5f0e8` (cream)

---

## Soft / Pastel

**Visual signature**: Gentle, approachable, calming. Muted colors that feel like a soft blanket.

**Implementation**:
- Pastel palette: desaturated pinks, blues, greens, lavenders
- Soft shadows with colored tint (not gray)
- Large border-radius, no sharp edges
- Light, airy typography — medium weights, generous line-height
- Gradient backgrounds: gentle pastel-to-pastel transitions
- Glassmorphism elements: `backdrop-filter: blur()` with translucent backgrounds
- Smooth, slow animations with gentle easing

**Palette example**: `#ffd6e0` + `#c1e1ff` + `#d4edda` + `#e8d5f5` + `#fff3cd`

---

## Industrial / Utilitarian

**Visual signature**: Function-first. Like a factory control panel or military interface. Information density, no decoration.

**Implementation**:
- Monospace typography exclusively, or condensed sans
- Dense layout: small type, tight spacing, data-heavy
- Color-coding for status/state (green=active, amber=warning, red=error)
- Dark backgrounds with high-contrast text
- Thin borders, grid lines separating data
- No border-radius, no shadows, no gradients
- Blinking cursors, status indicators, timestamp displays
- Terminal/console aesthetic

**Palette example**: `#0a0e17` (bg) + `#00ff41` (primary) + `#ff6600` (warning) + `#cccccc` (text)

---

## Glassmorphic Depth

**Visual signature**: Frosted glass layers with depth and translucency. Materials feel tangible.

**Implementation**:
- `backdrop-filter: blur(12-20px)` on card/panel elements
- Semi-transparent backgrounds: `rgba()` with 0.1-0.3 alpha
- Layered depth: multiple glass panels at different z-levels
- Subtle borders: `1px solid rgba(255,255,255,0.2)`
- Vivid gradient backgrounds behind glass layers
- Soft, diffused shadows
- Light refraction effect on edges

**Palette example**: Vibrant gradient bg (`#667eea` to `#764ba2`) + glass layers + white text

---

## Warm Analog

**Visual signature**: Film photography, paper textures, warmth. Feels handcrafted and nostalgic.

**Implementation**:
- Warm color temperature: yellowed whites, warm grays, brown tones
- Paper/canvas texture backgrounds (CSS noise or SVG pattern)
- Slightly rounded serif fonts, handwriting accents
- Sepia-toned imagery, `filter: sepia()` on photos
- Grain overlay: CSS noise gradient or SVG filter
- Soft, warm shadows
- Stamp/postmark decorative elements
- Slightly off-grid placement for organic feel

**Palette example**: `#f5ebe0` (paper) + `#463f3a` (ink) + `#8a817c` (pencil) + `#bcb8b1` (shadow)

---

## CSS Techniques Cheat Sheet

### Noise/Grain Texture
```css
.grain::after {
  content: '';
  position: fixed;
  inset: 0;
  background-image: url("data:image/svg+xml,%3Csvg viewBox='0 0 256 256' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='noise'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23noise)' opacity='0.04'/%3E%3C/svg%3E");
  pointer-events: none;
  z-index: 9999;
}
```

### Layered Shadows
```css
.card {
  box-shadow:
    0 1px 2px rgba(0,0,0,0.07),
    0 4px 8px rgba(0,0,0,0.07),
    0 16px 32px rgba(0,0,0,0.07),
    0 32px 64px rgba(0,0,0,0.07);
}
```

### Staggered Reveal Animation
```css
@keyframes reveal {
  from { opacity: 0; transform: translateY(20px); }
  to { opacity: 1; transform: translateY(0); }
}
.stagger > * {
  animation: reveal 0.6s ease-out both;
}
.stagger > *:nth-child(1) { animation-delay: 0.1s; }
.stagger > *:nth-child(2) { animation-delay: 0.2s; }
.stagger > *:nth-child(3) { animation-delay: 0.3s; }
/* ... continue pattern */
```

### Scan-line Overlay
```css
.scanlines::after {
  content: '';
  position: fixed;
  inset: 0;
  background: repeating-linear-gradient(
    0deg,
    transparent,
    transparent 1px,
    rgba(0, 0, 0, 0.03) 1px,
    rgba(0, 0, 0, 0.03) 2px
  );
  pointer-events: none;
}
```

### Neon Text Glow
```css
.neon {
  color: #0abdc6;
  text-shadow:
    0 0 7px #0abdc6,
    0 0 10px #0abdc6,
    0 0 21px #0abdc6,
    0 0 42px #0ab3c6,
    0 0 82px #0ab3c6;
}
```

### Sunburst Background
```css
.sunburst {
  background: conic-gradient(
    from 0deg,
    #d4af37 0deg 10deg,
    #0c1b33 10deg 20deg,
    #d4af37 20deg 30deg,
    #0c1b33 30deg 40deg
    /* repeat pattern to 360deg */
  );
}
```
