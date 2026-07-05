# NeuroDirect Teen App

A premium, phone-first teen support web app/PWA aimed at ages **13-17**.

This is a static GitHub-ready package: upload the files, enable GitHub Pages, and it runs in the browser. It is designed to feel more mature than the Cameron/Clara style app: no childish reward chart styling, no bunnies, no carrots, no Firebase dependency.

## Included features

- Teen dashboard
- Daily check-in
- Mood, stress, energy, focus and sleep sliders
- Planner/tasks
- Goals and responsibility points
- Rewards/agreements
- Calm timer and breathing reset
- Support request cards
- Journal with private/shared visibility
- PIN-protected parent area
- Parent trend overview
- Export/import backup JSON
- Light/dark theme
- Installable PWA support
- Local-only saving using browser localStorage

## Important privacy note

This first version is **local-only**. Data stays on the device/browser where the app is used.

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

1. Create a new GitHub repository.
2. Upload everything inside this folder, not the folder itself.
3. Make sure `index.html` is at the root of the repo.
4. Commit the files.
5. Go to repository **Settings > Pages**.
6. Set source to **Deploy from a branch**.
7. Select the `main` branch and `/root` folder.
8. Save.
9. Open the GitHub Pages link.

## Editing on your phone with Acode

Edit these files mainly:

```text
index.html  - app shell
style.css   - design/theme
script.js   - app logic/features
manifest.json - PWA name/icon/settings
sw.js       - offline cache version
```

After changing files, commit them back to GitHub.

## Cache update note

If you change important files and the live app seems stuck on an old version, update the cache name in `sw.js`:

```js
const CACHE_NAME = 'neurodirect-teen-v1.0.1';
```

Then commit the change and refresh the app.

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
