# School-y Design Guidelines

## Design Approach
**Selected Approach:** Design System (Apple Human Interface Guidelines)
**Justification:** Safari-styled browser requires precise adherence to Apple's design language for authenticity. This is a utility-focused productivity tool where familiar patterns enhance usability.

**Key Design Principles:**
- Clean, distraction-free interface prioritizing content
- Subtle depth through shadows and translucency
- Minimal chrome, maximum viewport space
- Familiar Safari interaction patterns

---

## Typography

**Font Family:** San Francisco-inspired system fonts
- Primary: -apple-system, BlinkMacSystemFont, 'Segoe UI', system-ui
- Monospace (URL bar): SF Mono, Monaco, 'Courier New'

**Hierarchy:**
- URL/Search Input: 14px, medium weight
- Tab Titles: 13px, regular weight
- Search Results Titles: 16px, semibold
- Search Results URLs: 13px, regular weight
- Search Results Descriptions: 14px, regular weight
- Navigation Icons: 20px

---

## Layout System

**Spacing Primitives:** Tailwind units of 1, 2, 3, 4, 6, 8
- Button padding: px-3 py-1.5
- Section gaps: gap-2 to gap-4
- Browser chrome: p-2 to p-3
- Content margins: mx-4 my-3

**Container Structure:**
- Full viewport height (h-screen)
- Browser window: Inset shadow, rounded-xl corners (rounded-xl)
- Address bar area: Fixed height (h-14)
- Content area: Flex-1 to fill remaining space
- Tab bar: h-10

---

## Component Library

### Browser Chrome
**Top Bar (Safari Toolbar):**
- Traffic light buttons (close, minimize, maximize) - left aligned with gap-2
- Navigation controls (back, forward, reload) - icon buttons with w-8 h-8
- Address/Search bar - centered, rounded-lg, px-4, flex-1
- Additional controls (bookmark, share) - right aligned

**Tab Bar:**
- Individual tabs: rounded-t-lg, px-4, h-10, max-width to prevent overflow
- Active tab: slightly elevated appearance
- New tab button (+) - w-8 h-8, right-aligned
- Tab close buttons (×) - appear on hover, w-4 h-4

### Search Results Panel
**Layout:** Two-column on desktop (lg:grid-cols-2), single column on mobile
- Result cards: p-4, rounded-lg, gap-2
- Clickable area: entire card
- Title: truncate after 2 lines
- URL: text-sm, truncate
- Description: text-sm, line-clamp-3

**Search Input Integration:**
- Dropdown appears below address bar
- Results container: max-h-96, overflow-y-auto
- Each result: py-3, px-4, hover state
- "Search with [Query]" option at top

### Embedded Webpage Viewer
**Container:**
- Full width/height of content area
- Loading state: centered spinner with gap-3 text
- Error state: centered message with retry button
- Iframe wrapper: w-full, h-full, rounded-b-xl (if browser window has rounded corners)

### Navigation Controls
**Button Styling:**
- Circular or slightly rounded (rounded-md)
- Icon-only (no text labels)
- Size: w-8 h-8 or w-9 h-9
- Spacing between buttons: gap-1 or gap-2
- Disabled state: reduced opacity

---

## Page Structure

**Main Layout (Single Page Application):**
1. Browser Window Container (inset from viewport edges by 8-12px on desktop, 0 on mobile)
2. Top Chrome Section (traffic lights + toolbar)
3. Tab Bar (if implementing tabs)
4. Address Bar Row (navigation + URL input + controls)
5. Content Area (search results OR embedded webpage)

**State Management:**
- Default state: Shows search suggestions or blank page
- Search results state: Grid of clickable results
- Webpage viewing state: Full embedded iframe
- Loading state: Progress indicator in address bar + content area spinner

---

## Interaction Patterns

**Address Bar Behavior:**
- Focus: expands slightly, shows search suggestions
- Typing: live search suggestions appear
- Enter key: triggers search or direct URL navigation
- Icon changes: lock (HTTPS), search icon, or website favicon

**Result Click Flow:**
1. User clicks search result
2. Address bar updates with URL
3. Content area transitions to embedded view
4. Back button returns to search results

**Navigation Controls:**
- Back/Forward: maintains history stack
- Reload: refreshes embedded content
- All buttons show tooltip on hover (after 500ms)

---

## Responsive Behavior

**Desktop (lg and above):**
- Full browser chrome with all controls visible
- Two-column search results
- Larger address bar (h-12 to h-14)

**Tablet (md):**
- Simplified chrome, some buttons collapse to menu
- Single column search results
- Standard address bar (h-11)

**Mobile (base):**
- Minimal chrome, essential controls only
- Full-width address bar
- Stack all results vertically
- Bottom navigation bar for primary actions

---

## Shadows & Depth

- Browser window: Large soft shadow (shadow-2xl)
- Address bar: Subtle inset appearance (subtle inner shadow via border)
- Tab bar: Subtle bottom border for separation
- Search result cards: Hover elevation (shadow-md on hover)
- Dropdown menus: Medium shadow (shadow-lg)

---

## Accessibility

- All interactive elements: min-height/width of 44px (h-11 w-11 for touch targets)
- Address bar: proper ARIA labels, role="searchbox"
- Navigation buttons: aria-label descriptive text
- Keyboard navigation: Tab through all controls, Enter to activate
- Focus indicators: 2px outline with offset
- Screen reader announcements for loading/error states