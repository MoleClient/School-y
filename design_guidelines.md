# School-y Design Guidelines

## Design Approach
**Selected Approach:** Opera GX Gaming Aesthetic with DuckDuckGo-inspired Search
**Justification:** A gaming browser for students requires bold, eye-catching visuals that feel modern and powerful while maintaining usability. The dark theme with neon accents creates a distinctive identity.

**Key Design Principles:**
- Dark-first design with neon accent colors
- Gaming-inspired bold typography and effects
- Glassmorphism for depth and modern feel
- Clean, centered search interface inspired by DuckDuckGo
- Minimal chrome, maximum viewport space

---

## Color Palette

### Primary Accent
- **Neon Red/Pink**: `hsl(345, 95%, 55%)` / `#FA1E4E`
- Used for interactive elements, links, highlights, and glow effects

### Background Colors
- **Deep Charcoal**: `hsl(270, 20%, 6%)` / `#121019` - Main background
- **Card Background**: `hsl(270, 18%, 9%)` - Elevated surfaces
- **Sidebar**: `hsl(270, 20%, 8%)` - Navigation areas

### Text Colors
- **Foreground**: `hsl(0, 0%, 95%)` - Primary text
- **Muted Foreground**: `hsl(270, 10%, 55%)` - Secondary text
- **Primary Text**: Neon red for emphasis

### Border Colors
- **Default Border**: `hsl(270, 15%, 15%)`
- **Primary Border**: Primary color at 20-30% opacity

---

## Typography

**Font Family:** Inter-inspired system fonts
- Primary: Inter, -apple-system, BlinkMacSystemFont, 'Segoe UI', system-ui
- Monospace (URL bar): SF Mono, Monaco, 'Courier New'

**Hierarchy:**
- Hero Title: 6-7rem, font-black (900), gradient with neon glow
- Section Headers: 0.875rem, bold (700), uppercase, tracking-widest, primary color
- URL/Search Input: 1.125rem (lg), medium weight
- Body Text: 0.875rem-1rem, regular weight
- Labels: 0.75rem, semibold

---

## Layout System

**Spacing Primitives:** Tailwind units of 2, 3, 4, 6, 8, 10, 12
- Search bar: h-14 (56px)
- Browser chrome: py-2 px-3
- Card padding: p-4
- Section gaps: gap-3 to gap-4
- Content max-width: max-w-4xl to max-w-5xl

**Container Structure:**
- Full viewport height (h-screen)
- Gradient background with subtle ambient orbs
- Centered content layout for homepage
- Browser chrome fixed at top

---

## Visual Effects

### Glassmorphism
```css
.glass {
  background: hsl(270 18% 8% / 0.8);
  backdrop-filter: blur(12px);
  border: 1px solid hsl(345 95% 55% / 0.15);
}
```

### Neon Glow
```css
.neon-glow {
  box-shadow: 0 0 20px hsl(345 95% 55% / 0.4), 0 0 40px hsl(345 95% 55% / 0.2);
}
.neon-text {
  text-shadow: 0 0 10px hsl(345 95% 55% / 0.6), 0 0 20px hsl(345 95% 55% / 0.4);
}
```

### Gradient Backgrounds
```css
.gradient-gaming {
  background: linear-gradient(135deg, hsl(270 20% 6%) 0%, hsl(270 25% 10%) 50%, hsl(270 20% 6%) 100%);
}
.gradient-accent {
  background: linear-gradient(135deg, hsl(345 95% 55%) 0%, hsl(320 90% 50%) 100%);
}
```

---

## Component Library

### Browser Chrome
**Top Bar:**
- Traffic light buttons (close, minimize, maximize) - left aligned, gap-1.5
- Navigation controls (back, forward, reload) - ghost variant, h-8 w-8
- Address/Search bar - centered, glass effect, rounded-xl, focus glow
- Brand name "SCHOOL-Y" - right aligned, primary color, tracking-widest

### Search Results Panel
**Layout:** Two-column on desktop (lg:grid-cols-2), single column on mobile
- Result cards: glass effect, p-4, rounded-xl, primary border on hover
- Favicon area: rounded-lg, bg-primary/10
- Title: font-bold, hover:text-primary
- URL: text-xs, text-primary/70, font-mono
- Description: text-sm, text-muted-foreground

### Homepage
**Structure:**
- Centered layout with max-w-4xl
- Ambient gradient orbs in background (pointer-events-none)
- Hero: Large title with gradient text and neon glow
- Search: Glass container with gradient border glow on focus
- Feature badges: Shield, Zap, Globe icons with descriptions
- Quick links: 8-column grid, gradient icon backgrounds
- Game shortcuts: 4-column grid, larger cards

### Quick Link Cards
- Glass container with hover elevation
- Gradient icon backgrounds (site-specific colors)
- Scale transform on hover (1.1x)
- Small text labels below icons

---

## Interaction Patterns

**Elevation System:**
- hover-elevate: Subtle brightness increase using pseudo-elements
- active-elevate-2: More pronounced brightness for press states
- Both use CSS custom properties for theme-aware colors

**Focus States:**
- Gradient glow around focused inputs
- Ring with primary color at 50% opacity
- Border color shifts to primary/40

**Hover Effects:**
- Scale transforms: 1.05x-1.1x
- Border opacity increases
- Icon color transitions to primary
- Smooth transitions (150-300ms, ease-out)

---

## Responsive Behavior

**Desktop (lg and above):**
- Full browser chrome with branding
- Two-column search results
- 8-column quick links grid

**Tablet (md):**
- Simplified chrome
- Single column search results
- 4-column quick links grid

**Mobile (base):**
- Minimal chrome
- Full-width address bar
- 4-column quick links grid
- Stack all results vertically

---

## Shadows & Depth

Shadow scale uses primary color tinting:
- shadow-sm: `0px 2px 8px 0px hsl(345 95% 55% / 0.10)`
- shadow: `0px 4px 12px 0px hsl(345 95% 55% / 0.12)`
- shadow-md: `0px 6px 16px 0px hsl(345 95% 55% / 0.15)`
- shadow-lg: `0px 8px 24px 0px hsl(345 95% 55% / 0.18)`

---

## Accessibility

- All interactive elements: min-height/width of 44px
- Address bar: proper ARIA labels, role="searchbox"
- Navigation buttons: aria-label descriptive text
- Keyboard navigation: Tab through all controls
- Focus indicators: 2px ring with offset
- data-testid on all interactive elements
- High contrast text (foreground on dark backgrounds)

---

## Dark Mode
This is a dark-first design. The application uses the Opera GX inspired dark theme by default. All colors are optimized for dark backgrounds with high contrast foreground text.
