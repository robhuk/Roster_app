# Roster Manager PWA

XC-inspired roster planner. Designed for GitHub Pages.

## Deploy
1. Extract this ZIP.
2. Upload the contents (index.html, app.js, styles.css, manifest.webmanifest, service-worker.js, icons/) to the root of a GitHub Pages repository.
3. Enable GitHub Pages in repository Settings → Pages.
4. Open the published URL in Safari and use Share → Add to Home Screen.

## Roster format
In Settings, enter one week line per row, with seven daily entries separated by commas in Sunday-to-Saturday order. Example:
RD, A/R, 0700, 0730, RD, AL, RD
The starting week line is the line active for the week containing the roster start date. The app rotates week lines weekly.

## Notes
- Roster data is saved locally in this browser using localStorage.
- PDF extraction is best-effort and requires internet access for PDF.js. Verify and format the extracted text.
- The calendar export produces an .ics file with all populated entries over the next 52 weeks.
- Expected shifts must be checked against engineering work and other short-term alterations.

## PWA policy checks
- Unique app ID, localStorage namespace, update-check key, and service-worker cache namespace are specific to Roster Manager.
- All asset, manifest, and service-worker paths are scope-relative for GitHub Pages subpaths.
- The app checks for updates on launch at most once every 12 hours and does not clear roster data during updates.
- The service worker caches the app shell for offline launch after the first successful load.
- Browser storage may be removed by the operating system/browser during uninstall or storage cleanup. Export important roster information before removing the app or clearing browser data.
