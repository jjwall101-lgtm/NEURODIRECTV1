# NeuroDirect Teen App — Premium UI v2

A premium, phone-first teen support web app/PWA aimed at ages **13-17**.

This version updates the original NeuroDirect teen app with the cleaner premium interface direction: controlled navy/teal/gold styling, a refined calm timer screen, a built-in light/dark mode switch, improved spacing, and a more polished bottom navigation.

## Included features

- Teen dashboard
- Daily check-in
- Mood, stress, energy, focus and sleep sliders
- Planner/tasks
- Goals and responsibility points
- Rewards/agreements
- Premium calm timer screen
- Breathing / need-space / stop controls
- Support request cards
- Journal with private/shared visibility
- PIN-protected parent area
- Parent trend overview
- Export/import backup JSON
- Light and dark mode switch
- Installable PWA support
- Local-only saving using browser localStorage

## v2 design upgrades

- New premium UI styling matching the clean dark/light mock-up direction
- Less visual clutter and fewer glow effects
- Better spacing and card hierarchy
- Inline NeuroDirect logo in the app header, so the logo does not show as broken alt text
- Cleaner bottom navigation for mobile
- Premium circular calm timer with progress ring
- Light/dark mode buttons in the top bar
- Updated service worker cache name to force a fresh GitHub Pages update

## Important privacy note

This version is **local-only**. Data stays on the device/browser where the app is used.

The parent PIN is a simple local app gate, not strong security or encryption. It is suitable for a basic family-support prototype, not for storing highly sensitive records.

## Default parent PIN

```text
2468
```

Change it inside:

```text
Parent > Profile and PIN > New parent PIN
```

## File structure

```text
index.html
style.css
script.js
manifest.json
sw.js
assets/
  logo.svg
  icon.svg
  favicon.svg
  icon-192.png
  icon-512.png
  apple-touch-icon.png
README.md
UPLOAD_NOTES.md
.nojekyll
```

## Upload to GitHub from your phone

1. Open the ZIP.
2. Upload everything inside the folder, not the folder itself.
3. Make sure `index.html` is at the root of the repository.
4. Commit the files.
5. Go to repository **Settings > Pages**.
6. Set source to **Deploy from a branch**.
7. Select the `main` branch and `/root` folder.
8. Save.
9. Wait a few minutes, then open the GitHub Pages link.

## Updating an existing NeuroDirect GitHub repo

Upload these files over the old ones:

```text
index.html
style.css
script.js
manifest.json
sw.js
assets/
README.md
UPLOAD_NOTES.md
.nojekyll
```

The service worker cache has been renamed to:

```js
neurodirect-teen-v2.0.0-premium
```

That helps force phones to pull the new design instead of staying stuck on the older cached version.

## Editing on your phone with Acode

Main files to edit:

```text
index.html  - app shell/header/nav
style.css   - premium visual design/theme
script.js   - app logic/features
manifest.json - PWA name/icon/settings
sw.js       - offline cache version
```

## Firebase

Firebase is not included in this version on purpose. Add it later only when the local version is working and you want:

- parent/teen use on separate phones
- cloud backup
- shared family code
- co-parent access
- real-time sync

## App positioning

Brand: **NeuroDirect**

Target age: **13-17**

Tone: mature, calm, private, supportive, goal-based, not childish.
