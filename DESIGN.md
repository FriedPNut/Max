# Max Design System (Instagram-based)

## 1. Principles
Max should feel like a native iPhone social app in the spirit of Instagram: edge-to-edge content, quiet chrome, clear hierarchy, quick springy motion. Structure, iconography, and motion follow Instagram. Light mode is a softened version of Instagram's palette (easier on the eyes than pure white); dark mode is true black. Never use Instagram's logo, name, or script wordmark. This supersedes any earlier rule that conflicts (including bans on gradients, blur, and shadows).

## 2. Color tokens
All colors are CSS variables on :root, overridden under html[data-theme="dark"], mapped into the Tailwind theme. Never hard-code colors.
Light: background #F4F4F4, surface #FBFBFB, surface-2 #EFEFEF, text #262626, muted #737373, line #DBDBDB, border #C7C7C7, primary #0095F6, primary-pressed #1877F2, link #00376B, danger #FF3040, today #C8434F.
Dark: background #000000, surface #121212, surface-2 #262626, text #F5F5F5, muted #A8A8A8, line #262626, border #363636, primary #0095F6, primary-pressed #1877F2, link #E0F1FF, danger #FF3040, today #E5676F.
Gradient: --story-gradient: linear-gradient(45deg, #FEDA75 0%, #FA7E1E 25%, #D62976 50%, #962FBF 75%, #4F5BD5 100%). Use it ONLY for unseen story rings and the login wordmark.
Glass: light rgba(251,251,251,0.72), dark rgba(24,24,24,0.68), with backdrop-filter blur(24px) saturate(180%) (include the -webkit- prefix).
Usage: primary blue for main buttons, links, toggles, and selected RSVP. Today’s date uses the today color. Danger red for likes, unread dots, and badges. Active navigation and selected tabs use the text color, not blue. No other accent colors.

## 3. Typography
System font stack only: -apple-system, BlinkMacSystemFont, "SF Pro Text", "Segoe UI", Roboto, Helvetica, Arial, sans-serif. No web fonts.
Sizes: page title 22px/700, section heading 16px/600, body 15px/400 (line-height 1.4), secondary 13px/400 muted, meta 12px/400 muted, button 15px/600. Inputs are at least 16px. Names and usernames are 600 weight. Sentence case. No uppercase labels, no letter-spacing except the Max wordmark (-0.03em).

## 4. Shape
Radius: buttons 10px, inputs 10px, cards and widgets 14px, sheets 20px (top corners), chips and the island bar fully rounded (pill), avatars and story circles fully round, photos 0px when edge-to-edge or 10px inside a card. Hairlines are 1px.

## 5. Components
- Primary button: primary fill, white text, 44px tall, 10px radius, pressed uses primary-pressed. Secondary button: surface-2 fill, text color, no border. Destructive: danger-colored text on a secondary button. Text button: link color, no fill. Disabled: 40% opacity.
- Input: surface-2 fill, 1px border, 10px radius, 12px/14px padding, label above in 13px muted, focus ring 2px primary.
- Switch: 51x31 track and 27px knob like iOS, off = line color track, on = primary track, white knob, spring slide.
- Segmented control: surface-2 track, a surface-colored sliding pill under the selected item, text 13px/600.
- Chips: pill, surface-2 fill, selected = text-color fill with background-color text.
- Cards and widgets: surface fill, 14px radius, 1px line border, no shadow. Rows sitting directly on the page use full-width layout, 16px padding, 1px line dividers.
- Avatars: circles with an initial on surface-2 as fallback; sizes 24, 32, 40, 56, 88. Square avatars are no longer used.
- Badges and unread dots: danger red, white text, minimum 8px dot.
- Bottom sheets: surface fill, 20px top radius, a 36x4 grabber, backdrop dim, drag down to dismiss.
- Toasts: dark pill (inverted colors), floating above the island bar, 2.5s.
- Skeletons: surface-2 blocks with a shimmer sweep.

## 6. Navigation
- Top bar: sticky, glass background, 48px plus safe area, "Max" wordmark left (system font, 800 weight, 24px, -0.03em), page actions right as 24px icons with 44px tap areas. A hairline appears only after scrolling.
- Island bar: a floating pill at the bottom, 16px from each side (max width 420px, centered), 12px above the bottom safe area, 60px tall, glass background with a 1px hairline border and a very soft shadow (light: 0 8px 32px rgba(0,0,0,0.12); dark: 0 8px 32px rgba(0,0,0,0.5)). Four icon-only tabs: Events, Chat, Post, Profile (the avatar). Inactive icons are outline, the active one is filled and in the text color, with a soft pill highlight that slides under the active tab. A red badge slot sits on each icon. It hides when scrolling down and returns when scrolling up, and is hidden on full-screen screens (open conversations, story viewer, composers, login).
- Content gets bottom padding so nothing is hidden behind the island bar.

## 7. Motion
Easing: --ease-out cubic-bezier(0.22, 1, 0.36, 1), --ease-spring cubic-bezier(0.32, 0.72, 0, 1). Durations: 100ms press, 200ms standard, 320ms sheets and page pushes, 500ms hearts.
Press: scale 0.97 with slight opacity drop. Tab switch: slide or crossfade matching direction. Push navigation slides in from the right, back reverses. Sheets glide up with the spring curve. Likes: the heart pops (scale 1 to 1.3 to 1) and turns red; double-tapping a photo shows a large heart overlay that scales in and fades out. Skeletons shimmer. Pull-to-refresh shows a spinner. Animate only transform and opacity. Honor prefers-reduced-motion by removing movement and keeping only fast fades.

## 8. Imagery and icons
Photos are edge-to-edge in feeds with a 4:5 crop. Profile grid is 3 columns with 1px gaps, 4:5 tiles. Icons are 24px with outline for inactive and filled for active, in one consistent custom SVG set, stroke about 1.75. No emoji as icons, except the chat reaction set.

## 9. Chat
Own messages: purple-to-blue gradient bubble (linear-gradient(135deg, #7A3FF2, #3797F0)) with white text. Others: surface-2 bubble. Bubble radius 22px, tight spacing inside a run of messages from one person, timestamps centered in 12px muted. Input is a pill with a surface-2 fill, a photo icon on the left, and a blue "Send" text button that appears once there's text.

## 10. Voice
Short, friendly, plain. Sentence case. Tagline: "Maximum potential. Maximum fun. Maximum productivity." Errors are plain and human.

## 11. Agent guide
Read this whole file before writing UI code. Use tokens and shared components only. If something looks like a generic template, simplify it toward Instagram's patterns. Keep everything fast: animate only transform and opacity, and avoid heavy animation libraries unless required.