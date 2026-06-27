# SpeedyReader

Simple in-browser speed-reading web app.

- Drop TXT or PDF files into the page to add them to a local library (stored in localStorage).
- Load a file to display its text and play a row-by-row speed reading player.
- Configurable font, colors, line height, highlight words, and words-per-minute.

Usage:
- Run `npm install`.
- Use `npm run dev` to start the local Vite development server.
- Open the app at the URL shown by Vite.
- Add files, load them, and use Settings to configure playback.

Notes:
- PDFs are parsed using pdf.js in the browser.
- Uses Vue 3 single-file component architecture with Vite.
