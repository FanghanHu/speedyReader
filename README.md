# SpeedyReader

Simple in-browser speed-reading web app.

- Drop TXT or PDF files into the page to add them to a local library (stored in localStorage).
- Load a file to display its text and play a row-by-row speed reading player.
- Configurable font, colors, line height, highlight words, and words-per-minute.

Usage:
- Open index.html in a static file server or the browser.
- Add files, load them, and use Settings to configure playback.

Notes:
- PDFs are parsed using pdf.js in the browser.
- No build step required. Uses Vue 3 via CDN.
