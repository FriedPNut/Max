\# Max Design System



\## 1. Principles

Max is a minimal, calm app for a small group of friends. Easy to read at a glance, easy to use with one thumb. Plain over clever. Every element must earn its place. If something is decorative, remove it. When unsure, choose less: fewer colors, fewer sizes, fewer borders, more whitespace.



\## 2. Colors (CSS variables, mapped into the Tailwind theme)

\- background: #EFEEE9

\- surface:    #FBFBF8

\- text:       #1E1E1C

\- muted:      #5E5E58  (secondary text, times, counts)

\- line:       #DAD8D0  (subtle dividers only: list hairlines, tab bar top line, section separators, skeleton blocks)

\- border:     #BFBCB1  (outlines of anything with a shape: cards, sheets, dialogs, inputs, segmented controls, chips, secondary buttons, photo tiles, avatar rings)

\- accent:     #E8481F  (used VERY sparingly: active tab, selected RSVP, small status marks)

\- on-accent:  #FFFFFF

Rules: no gradients, no shadows, no glass or blur, no dark backgrounds, no extra colors. Text must always have strong contrast. Use `line` only for dividers and `border` for outlines, always 1px. Cards and widgets are islands: `surface` fill plus a 1px `border`, existing radius; a card inside a card uses `background` as its fill.



\## 3. Typography

One font family only: Instrument Sans (already loaded). Remove any other fonts.

\- Page title: 28px / 600

\- Section heading: 18px / 600

\- Body: 16px / 400, line-height 1.5

\- Secondary text: 14px / 400, muted color

Sentence case everywhere. No uppercase labels, no monospace, no giant display text, no letter-spacing tricks. Keep line lengths short.



\## 4. Components

\- Buttons: 44px tall, 8px radius. Primary = text-color fill with background-color text. Secondary = 1px border outline, transparent fill. Labels are plain verbs ("Post", "Send", "Save"). No hover animations beyond a slight color change.

\- Inputs: surface fill, 1px border outline, 8px radius, 12px padding. Label above in 14px muted. Focus = 2px text-color outline.

\- Lists: simple rows separated by 1px hairlines. Prefer rows over cards. When a card is needed, use surface fill, 1px border outline, 8px radius, no shadow.

\- Tab bar (mobile): fixed bottom, surface fill, 1px line along the top. Each tab is an icon with a small label. Active tab = text color; inactive = muted. A small accent dot or 2px accent line marks active.

\- Avatars: small circles with the first initial, border outline.

\- Chat: own messages = text-color bubble with background-color text; others = surface bubble with border outline. Name in muted 13px above a run of messages.

\- Photos: full width, rounded 8px, caption below in body text.

\- Empty states: one short sentence in muted text.



\## 5. Layout

Mobile-first. Content max-width 560px, centered. 16px side padding. 8px spacing grid. Generous vertical spacing between sections (24px+). Left-aligned. One column. Nothing crowded.



\## 6. Icons

lucide-react, 20px, 1.5px stroke, only where they help navigation (tab bar, back, add). Never use emoji as icons.



\## 7. Motion

Almost none. 150ms color and opacity transitions only. No bouncing, parallax, or scroll animations.



\## 8. Do's and Don'ts

DO: plain language, clear hierarchy, lots of whitespace, consistent spacing, large tap targets.

DON'T: gradients, shadows, blur, multiple fonts, uppercase labels, decorative shapes, colored card borders, rounded-2xl or larger, emoji icons, "Welcome back!" or marketing copy.



\## 9. Voice

Short, friendly, plain. Like a clear text from a friend.

\- Tagline: "Maximum potential. Maximum fun. Maximum productivity."

\- Empty events: "Nothing planned yet."

\- Errors: plain and human ("That password doesn't match.")



\## 10. Agent Guide

Read this entire file before writing any UI code. Use the color and font tokens defined once in globals.css and the Tailwind theme. Every screen must follow the same patterns. When in doubt, simplify.





\## 11. Dark Mode

Same design, inverted tokens. Define every color as a CSS variable on `:root` (light) and override them for dark. Components must only use the tokens, never hard-coded colors (no `bg-white`, `text-black`, `#fff`, `#000`).

Dark tokens:

\- background: #0F0F0E

\- surface:    #1A1A18

\- text:       #F2F2EE

\- muted:      #9A9A94

\- line:       #2A2A27

\- border:     #2A2A27  (same value as line, so dark mode looks unchanged)

\- accent:     #FF5A2E  (slightly brighter for contrast)

\- on-accent:  #FFFFFF

Rules: still no gradients, shadows, or blur. Primary buttons use the text color as fill with the background color as text (light button on dark). Own chat bubbles are light with dark text; others use surface with a border outline. Photos stay unchanged. Set `color-scheme: dark` so scrollbars and form controls match. Text contrast must stay readable everywhere. The story viewer is already dark and stays that way.

