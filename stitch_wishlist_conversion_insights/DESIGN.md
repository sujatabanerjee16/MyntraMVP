---
name: Internal Strategy & Analytics
colors:
  surface: '#f9f9fb'
  surface-dim: '#dadadc'
  surface-bright: '#f9f9fb'
  surface-container-lowest: '#ffffff'
  surface-container-low: '#f3f3f5'
  surface-container: '#eeeef0'
  surface-container-high: '#e8e8ea'
  surface-container-highest: '#e2e2e4'
  on-surface: '#1a1c1d'
  on-surface-variant: '#5b4042'
  inverse-surface: '#2f3132'
  inverse-on-surface: '#f0f0f2'
  outline: '#8f6f72'
  outline-variant: '#e3bdc0'
  surface-tint: '#bd0043'
  primary: '#b90041'
  on-primary: '#ffffff'
  primary-container: '#df2457'
  on-primary-container: '#fffbff'
  inverse-primary: '#ffb2ba'
  secondary: '#5a5d73'
  on-secondary: '#ffffff'
  secondary-container: '#dbdef8'
  on-secondary-container: '#5e6177'
  tertiary: '#595c64'
  on-tertiary: '#ffffff'
  tertiary-container: '#72747d'
  on-tertiary-container: '#fefcff'
  error: '#ba1a1a'
  on-error: '#ffffff'
  error-container: '#ffdad6'
  on-error-container: '#93000a'
  primary-fixed: '#ffd9dc'
  primary-fixed-dim: '#ffb2ba'
  on-primary-fixed: '#400011'
  on-primary-fixed-variant: '#910031'
  secondary-fixed: '#dee1fa'
  secondary-fixed-dim: '#c2c5de'
  on-secondary-fixed: '#161b2d'
  on-secondary-fixed-variant: '#42465a'
  tertiary-fixed: '#e1e2ec'
  tertiary-fixed-dim: '#c4c6cf'
  on-tertiary-fixed: '#191c22'
  on-tertiary-fixed-variant: '#44474e'
  background: '#f9f9fb'
  on-background: '#1a1c1d'
  surface-variant: '#e2e2e4'
typography:
  display-lg:
    fontFamily: Hanken Grotesk
    fontSize: 32px
    fontWeight: '700'
    lineHeight: '1.1'
    letterSpacing: -0.02em
  headline-md:
    fontFamily: Hanken Grotesk
    fontSize: 20px
    fontWeight: '600'
    lineHeight: '1.2'
    letterSpacing: -0.01em
  headline-sm:
    fontFamily: Hanken Grotesk
    fontSize: 16px
    fontWeight: '600'
    lineHeight: '1.2'
  body-md:
    fontFamily: Hanken Grotesk
    fontSize: 14px
    fontWeight: '400'
    lineHeight: '1.4'
  body-sm:
    fontFamily: Hanken Grotesk
    fontSize: 12px
    fontWeight: '400'
    lineHeight: '1.4'
  label-caps:
    fontFamily: Hanken Grotesk
    fontSize: 11px
    fontWeight: '700'
    lineHeight: '1'
    letterSpacing: 0.05em
  data-mono:
    fontFamily: monospace
    fontSize: 13px
    fontWeight: '500'
    lineHeight: '1'
rounded:
  sm: 0.25rem
  DEFAULT: 0.5rem
  md: 0.75rem
  lg: 1rem
  xl: 1.5rem
  full: 9999px
spacing:
  container-max: 1440px
  edge-margin: 32px
  gutter: 16px
  stack-sm: 8px
  stack-md: 16px
  stack-lg: 24px
---

## Brand & Style
The design system is a clinical, high-density framework engineered for internal strategic analysis and directional public evidence gathering. It prioritizes information utility over aesthetic flourish, utilizing a modern minimalist aesthetic with a rigorous, data-first hierarchy.

The brand personality is grounded and research-focused. It leverages the vibrant primary accent of the parent brand but strips away all consumer-facing "shopping" DNA (icons, soft shadows, playful micro-interactions). The UI remains flat, architectural, and precise, designed to facilitate rapid scanning of complex data sets and executive decision-making.

## Colors
The palette is functional and high-contrast, designed to differentiate between structural elements and actionable data.

- **Primary Accent (#FF3F6C):** Reserved strictly for active states, primary actions, and critical data points.
- **Primary Ink (#282C3F):** Used for all primary headings and body text to ensure maximum legibility.
- **Muted Text (#94969F):** Applied to secondary metadata, captions, and deactivated states.
- **Structural Lines (#EAEAEC):** Used for hair-line borders and dividers to separate data modules without adding visual weight.
- **Canvas (#F5F5F6):** A cool neutral background that provides a distinct separation for the white data cards.

## Typography
This design system utilizes **Hanken Grotesk** for its contemporary, technical clarity. The type scale is optimized for high-density dashboards where vertical space is at a premium. 

- **Tight Leading:** Line heights are kept aggressive (1.2x to 1.4x) to allow more data rows to be visible on a single screen.
- **Mono Integration:** For tabular data and numerical figures, use system monospaced fonts to ensure vertical alignment of digits.
- **Hierarchy:** Use `label-caps` for table headers and section overviews to create clear visual anchors.

## Layout & Spacing
The layout is **desktop-first**, optimized for a 1440px fixed-width container centered on the viewport. 

- **Grid:** A 12-column grid system with 16px gutters. Elements should align to these columns to maintain a rigid, scientific structure.
- **Density:** Padding within cards and modules should stay within an 8px–16px range. Avoid "airy" layouts; the objective is to provide a "cockpit" view of data.
- **Breakpoints:** 
  - Desktop (1440px+): Fixed 1440px container.
  - Tablet (1024px-1439px): Fluid with 32px margins.
  - Mobile: Content reflows to a single column; hide non-essential charts.

## Elevation & Depth
In alignment with the "clinical" tone, this design system eschews all shadows, blurs, and gradients.

- **Flat Architecture:** Depth is communicated through tonal layering rather than shadows. 
- **Z-Index layers:** 
  - **Level 0:** Page Background (#F5F5F6).
  - **Level 1:** Content Cards (#FFFFFF) with 1px hairline borders (#EAEAEC).
  - **Level 2:** Modals and Popovers (#FFFFFF) with a slightly darker 1px border (#94969F) to indicate focus, still without shadows.
- **Interaction:** State changes (hover/active) should be communicated via color fills or stroke weight increases rather than elevation shifts.

## Shapes
The shape language combines technical precision with accessibility.

- **Cards/Containers:** Use a consistent 12px corner radius. This softens the high-density data without appearing overly consumer-oriented.
- **Input Fields:** 4px radius to maintain a "form-like" and functional feel.
- **Buttons:** Fully pill-shaped (radius: 9999px) to clearly differentiate actionable elements from static data containers.

## Components
Consistent application of these components ensures the clinical "Internal Strategy" look:

- **Buttons:** Pill-shaped. Primary buttons use the #FF3F6C fill with white text. Secondary buttons use #FFFFFF fill with a 1px #EAEAEC border and #282C3F text. Minimalist, no icons unless strictly functional (e.g., "Download").
- **Cards:** White background, 12px radius, 1px #EAEAEC border. Titles are `headline-sm` in #282C3F. Padding is fixed at 20px.
- **Data Tables:** No vertical borders. Use 1px horizontal hairlines (#EAEAEC). Row hover state uses #F5F5F6. Header row uses `label-caps` typography.
- **Charts:** 
  - **Horizontal Bars:** Flat fills using a palette of #282C3F, #FF3F6C, and #94969F. 
  - **Heatmaps:** Single-hue scales (e.g., varying opacities of #FF3F6C) to maintain a restrained aesthetic.
- **Inputs:** 1px border, 4px radius. Active state uses a 1px #FF3F6C border. No glow or outer shadows.
- **Chips/Status:** Small 4px radius chips. Use muted backgrounds (e.g., #EAEAEC) with #282C3F text for most states; use #FF3F6C text only for "Alert" or "Critical" statuses.