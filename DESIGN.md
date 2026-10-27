> Speed rules: act first, load after. Optimistic updates, cached-first data, instant shells, lazy-loaded heavy code, thumbnails in lists.
> Time rule: Cache Components is off. Display-only time logic still goes in client components with useToday and RelativeTime to avoid hydration mismatches.

# Max Design System (Instagram-based)

## 1. Principles
Max should feel like a native iPhone social app in the spirit of Instagram: edge-to-edge content, quiet chrome, clear hierarchy, quick springy motion. Structure, iconography, and motion follow Instagram. Light mode is a softened version of Instagram's palette (easier on the eyes than pure white); dark mode is true black. Never use Instagram's logo, name, or script wordmark. This supersedes any earlier rule that conflicts (including bans on gradients, blur, and shadows).

## 2. Color tokens
All colors are CSS variables on :root, overridden under html[data-theme="dark"], mapped into the Tailwind theme. Never hard-code colors.
Light: background #F4F4F4, surface #FBFBFB, surface-2 #EFEFEF, text #262626, muted #737373, line #DBDBDB, border #C7C7C7, primary #0095F6, primary-pressed #1877F2, link #00376B, danger #FF3040, today #C8434F.
Dark: background #000000, surface #121212, surface-2 #262626, text #F5F5F5, muted #A8A8A8, line #262626, border #363636, primary #0095F6, primary-pressed #1877F2, link #E0F1FF, danger #FF3040, today #E5676F.
Gradient: --brand-gradient: linear-gradient(45deg, #FEDA75 0%, #FA7E1E 25%, #D62976 50%, #962FBF 75%, #4F5BD5 100%). Use it ONLY for the login and welcome wordmark.
Glass: light rgba(251,251,251,0.72), dark rgba(24,24,24,0.68), with backdrop-filter blur(24px) saturate(180%) (include the -webkit- prefix).
Usage: primary blue for main buttons, links, toggles, and selected RSVP. Today’s date uses the today color. Danger red for likes, unread dots, and badges. Active navigation and selected tabs use the text color, not blue. No other accent colors.

## 3. Typography
System font stack only: -apple-system, BlinkMacSystemFont, "SF Pro Text", "Segoe UI", Roboto, Helvetica, Arial, sans-serif. No web fonts.
Sizes: page title 20px/700, section heading 16px/600, body 15px/400 (line-height 1.4), secondary 13px/400 muted, meta 12px/400 muted, button 15px/600. Inputs are at least 16px. Names and usernames are 600 weight. Sentence case. No uppercase labels, no letter-spacing except the Max wordmark (-0.03em).

## 4. Shape
Radius: buttons 10px, inputs 10px, cards and widgets 14px, sheets 20px (top corners), chips and the island bar fully rounded (pill), avatars fully round, photos 0px when edge-to-edge or 10px inside a card. Hairlines are 1px.

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
- Calendar: Month view: selected day is a rounded box (radius 10, surface-2). Week view: no selection box. Today is the today-colored number in both.

## 6. Navigation
- There is exactly one tab bar. It is mounted once in the root shell and never inside a page, a loading screen or a skeleton, so it stays on screen while a page loads.
- Both shapes are one component with one markup. CSS picks the shape from html[data-platform]; no JavaScript state chooses the variant, so the first paint is already right.
  - iOS: a floating glass island, 16px from each side (max width 420px, centered), 12px above the bottom safe area, 60px tall, hairline border, soft shadow (light: 0 8px 32px rgba(0,0,0,0.12); dark: 0 8px 32px rgba(0,0,0,0.5)). It hides while scrolling down and comes back at the top or when scrolling up.
  - Android and other: a docked full-width bar, 56px tall plus the safe area, page-background color, 1px top line. It stays put except on full-screen screens.
- Four icon-only tabs: Events, Chat, Post, Profile (the avatar). Inactive icons are outline and muted; the active one is filled and in the text color. One soft pill (64x36, radius 18, surface-2) slides under the active tab with a CSS transform on the active or pending index. A red badge slot sits on each icon.
- The bar steps aside only on full-screen screens: auth, composers, open conversations and their info screens.
- The active tab is a pure function of the pathname. Nothing is remembered and stale state cannot disagree with the URL.
  - Events: /events*, /lists*, /trips*, /hang, /free, /birthdays, /best-of*, and /
  - Chat: /chat*, /people*
  - Post: /feed*
  - Profile: /me*, /settings*, /recap, /wrapped*
  - Shared pages (/u/*, /notifications) belong to no tab and highlight nothing.
- One tap always works. Press (pointerdown) moves the highlight and the pill at once through a local pending tab, cleared when the pathname changes or after 1.5s. The tap handler reads the live pathname: already on that tab's root scrolls to the top, anywhere else follows a plain Link to the tab root (/events, /chat, /feed, /me). A tap is never ignored because a tab looks active, no gesture handler sits above the bar, and a tab switch is never wrapped in a transition that can be interrupted.
- Top bar: on the four tab roots only, 56px plus safe area, glass background, "Max" wordmark left (system font, 800 weight, 20px, -0.03em), then the notification heart and the page's action icons on the right. A hairline appears only after scrolling.
- Every other screen uses a compact SubHeader: a back arrow on the left, a left-aligned title (20px/700), and optional right-side actions. No wordmark and no heart. An open conversation keeps only its own chat header (back, avatar, name, info icon) and has no SubHeader.
- Page content pays --bar-h of bottom padding (set per platform), so nothing hides behind the bar and skeleton content lines up with the real chrome.

## 7. Motion
Easing: --ease-out cubic-bezier(0.22, 1, 0.36, 1), --ease-spring cubic-bezier(0.32, 0.72, 0, 1). Durations: 100ms press, 200ms standard, 320ms sheets and page pushes, 500ms hearts.
Press: scale 0.97 with slight opacity drop. Tab switch: slide or crossfade matching direction. Push navigation slides in from the right, back reverses. Sheets glide up with the spring curve. Likes: the heart pops (scale 1 to 1.3 to 1) and turns red; double-tapping a photo shows a large heart overlay that scales in and fades out. Skeletons shimmer. Pull-to-refresh shows a spinner. Animate only transform and opacity. Honor prefers-reduced-motion by removing movement and keeping only fast fades.

## 8. Imagery and icons
Photos are edge-to-edge in feeds with a 4:5 crop. Profile grid is 3 columns with 1px gaps, 4:5 tiles. Icons are 24px with outline for inactive and filled for active, in one consistent custom SVG set, stroke about 1.75. No emoji as icons, except the chat reaction set.

## 9. Chat
Own messages: one solid bubble in the color from profiles.bubble_color (default #8B3BEB, never a gradient), with white or black text picked by contrast. Others: surface-2 bubble. Photos have no bubble at all: the image alone, 18px radius, natural aspect ratio, with a caption bubble underneath. Bubble radius 22px, 78% max width, 12px side padding, 2px inside a run of messages from one person and 12px between runs, timestamps centered in 12px muted. The composer is pinned to the bottom in its own fixed frame, never positioned by the message count. Pressing and holding a message opens one menu: reactions, Copy, Pin, Edit, and the destructive action last. Input is a pill with a surface-2 fill, a photo icon on the left, and a blue "Send" text button that appears once there's text.

## 10. Voice
Short, friendly, plain. Sentence case. Tagline: "Maximum potential. Maximum fun. Maximum productivity." Errors are plain and human.

## 11. Agent guide
Read this whole file before writing UI code. Use tokens and shared components only. If something looks like a generic template, simplify it toward Instagram's patterns. Keep everything fast: animate only transform and opacity, and avoid heavy animation libraries unless required.


## 12. Screenshot reference (OVERRIDES any conflicting earlier section)
Source: four Instagram Android dark-mode screenshots (home feed, messages inbox, profile, chat thread). Match them as closely as possible in layout, proportions, spacing, and feel. Never use Instagram's logo, name, or custom font. Sizes are dp on a 360dp-wide screen.

### Colors (match by eye)
Dark: background #0C1014 (feed, inbox, profile), thread #000000 (open chat only), surface #12171C, surface-2 #262B32 (search pill, secondary buttons, nav pill, note bubbles), received bubble #262626, text #F5F5F5, muted #A8ADB3, line #1E242B, primary #4A5DFF (Create buttons, Send, unread dots, camera button), link #7C8CFF (Requests, Older posts, links in bios), danger #FF3040 (badges, red dots, likes).
Light mode keeps the existing soft light tokens, with primary and link #3F51F5 and surface-2 #EAECEF.
Sent chat bubbles: one solid color from profiles.bubble_color (default #8B3BEB) with contrast-picked text; no gradient. Received bubbles #262626.

### Navigation
- Android and other: a docked full-width bottom bar, 56 tall plus the safe area, page-background color, 1px top line. Four icon-only tabs. The active tab has a filled icon and a rounded pill behind it (64x36, radius 18, surface-2) that slides between tabs. Inactive icons are outline. Red badges on icons, and the Profile tab shows my avatar. Always visible except in open chats and composers.
- iOS: keep the floating glass island bar with hide-on-scroll.
- Top bar (the four tab roots only): 56 tall, 24px icons with 44px tap areas. The "Max" wordmark sits on the left for all four roots (system font, 800, 20px, -0.03em); no title is ever centered and no @username is shown there. Notifications use an outline heart icon with a red count badge. "More" menus use the two-line icon (a long line over a shorter one).
- Every other screen uses a compact SubHeader: back arrow left, left-aligned 20px/700 title, optional actions right, no wordmark and no heart.

### Layout rules
Feed: posts edge-to-edge. Inbox: search pill, a notes/friends row, "Messages" heading, rows without dividers. Profile: avatar left, name and stats right, bio, two secondary buttons, tab strip, content. Thread: pure black, bubbles with a 22 radius, input pill pinned to the bottom.

