# Upload Notes

## Quick install package

Upload these files to GitHub exactly as supplied.

The app is static and does not need npm, Firebase, a backend, or a build step.

## First things to change

Inside the app:

1. Open **Parent**.
2. Enter PIN: `2468`.
3. Change the teen display name.
4. Change the parent PIN.
5. Adjust goals/rewards.

## What not to delete

Do not delete:

- `manifest.json`
- `sw.js`
- the `assets` folder
- `.nojekyll`

These make the PWA/GitHub Pages setup behave properly.

## Local-only behaviour

This version saves to the browser on the device.

If you clear browser data, change browser, or use another phone, the app data will not follow unless you export/import a backup.
