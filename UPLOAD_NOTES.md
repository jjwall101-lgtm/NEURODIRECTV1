# NeuroDirect Premium v2 Upload Notes

## What to upload

Upload the contents of this folder to GitHub, not the ZIP file itself.

Your repository root should look like this:

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

## Important

`index.html` must be in the root of the repository.

Do not place everything inside an extra folder like:

```text
NeuroDirect_Teen_App_v2_Premium/index.html
```

GitHub Pages needs it like this:

```text
index.html
```

## Cache refresh

This version changes the service worker cache to:

```text
neurodirect-teen-v2.0.0-premium
```

After uploading, open the app and refresh it. If your phone still shows the old version, close the browser tab, reopen the GitHub Pages link, and refresh once more.
