\# Max Design System



\## 1. Visual Theme

Max is an editorial, tactile, slightly loud app for a close group of friends. Think printed zine or concert poster, not SaaS dashboard. Warm paper background, near-black ink, ONE hot accent color used sparingly. Confident and a little playful, never cute. Big type does most of the design work. If a screen looks like a generic template, it is wrong.



\## 2. Color Palette (define as CSS variables, map in Tailwind theme)

\- paper:    #F3EFE6  (page background)

\- surface:  #FBF9F4  (cards, inputs)

\- ink:      #15130F  (text, borders, primary buttons)

\- muted:    #6E685C  (secondary text, timestamps)

\- line:     #DCD6C8  (hairline dividers)

\- accent:   #FF4A1C  (primary highlight: active tab, RSVP "going", small marks)

\- accent-ink: #FFFFFF (text on accent)

Rules: accent covers under 8% of any screen. No gradients anywhere. No purple, no blue-to-violet, no pure #000 or #FFF backgrounds. Light theme only for v1.



\## 3. Typography (load with next/font/google)

\- Display: "Bricolage Grotesque" (700/800). Headlines, event titles, the Max wordmark. Tight tracking (-0.02em to -0.04em), line-height 0.95-1.05.

\- Body/UI: "Instrument Sans" (400/500/600).

\- Meta: "JetBrains Mono" (400/500), small caps feel, for timestamps, counts, labels like "GOING · 6".

Scale: 12 / 14 / 16 / 20 / 28 / 44 / 72px. Large display sizes are encouraged on titles. Never use Inter, Roboto, or system-default fonts as the main face. No gradient text.



\## 4. Components

\- Buttons: rectangular, radius 4px, 44px min height. Primary = ink fill, paper text, hover swaps to accent. Secondary = 1.5px ink border, transparent. Labels are plain verbs ("Post", "Send", "Join").

\- Inputs: surface background, 1.5px ink border, radius 4px, 14px padding, label ABOVE the field in mono 12px uppercase. Focus = 2px accent outline, no glow.

\- Cards: surface fill, 1px line border, radius 6px, NO drop shadows, NO colored left borders. Separation comes from spacing and hairlines.

\- Tab bar (mobile): fixed bottom, paper background, 1px top line, 4 text+icon tabs, active tab marked with an accent underline bar (not a pill, not a blob).

\- Avatars: square with 4px radius, ink border, initial letter in display font when no photo.

\- Chat: own messages = ink bubble, paper text; others = surface bubble with line border. Sender name in mono above first message of a run.

\- Photo posts: full-bleed images, 4:5 crop, caption below in body font, meta line in mono.



\## 5. Layout

Mobile-first. Content max-width 480px on phones, 720px centered on desktop. 16px side padding. 8px spacing grid. Generous vertical whitespace. Left-aligned text by default; don't center everything. Asymmetry is fine.



\## 6. Depth and Elevation

Flat. Use 1px hairlines and background contrast instead of shadows. Only modals/sheets may use one soft shadow (0 8px 30px rgba(21,19,15,0.12)).



\## 7. Motion

Subtle and quick: 150ms ease-out for hovers and presses, 200ms for sheets. Buttons press down 1px. No bouncing, no parallax, no fade-in-on-scroll on every element.



\## 8. Do's and Don'ts

DO: use real-sounding sample content, strong hierarchy, big confident headings, plenty of whitespace.

DON'T: use emoji as icons, glassmorphism/blur, gradient backgrounds or text, rounded-2xl/3xl everything, centered hero blobs, "Welcome back!" or "Unlock/Elevate/Seamless/Supercharge" copy, lorem ipsum, identical card grids, decorative sparkles. Icons: use lucide-react sparingly, 1.5px stroke, only where the label alone isn't enough.



\## 9. Voice and Copy

Short, direct, warm, a bit dry. Like a text from a friend who is organized.

\- Tagline: "Maximum potential. Maximum fun. Maximum productivity."

\- Sign in / Make an account (not "Get started")

\- Empty states: "Nothing planned yet. Make the first move."

\- Errors: plain and human ("That password doesn't match.")

\- Sentence case everywhere except mono labels (uppercase).



\## 10. Agent Prompt Guide

Read this entire file before writing any UI code. Define colors and fonts as CSS variables and Tailwind theme tokens ONCE, then reuse them. Every screen must feel like the same product. When unsure, choose less decoration, bigger type, and more whitespace.

