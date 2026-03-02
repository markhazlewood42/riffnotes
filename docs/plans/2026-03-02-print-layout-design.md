# Print Layout Design

**Date:** 2026-03-02
**Status:** Approved

## Problem

GigNotes needs to produce printable band practice notes on US Letter paper (8.5×11"). The editor should feel like a document and print cleanly, preserving the two-column lyrics/annotation layout.

## Decisions

- **Screen layout:** Fluid width (Dropbox Paper style) — no fixed page height, no on-screen page break simulation. The document grows with content.
- **Page width:** `--document-max-width` changes from `950px` to `816px` (8.5" at 96dpi). On-screen width matches printed width exactly, so proportions are WYSIWYG.
- **Annotation column:** Stays at 25% of document width. At 0.75" print margins, that's ~154px — sufficient for chords and short notes.
- **Print trigger:** A Print button in the app header calls `window.print()`. Hidden in `@media print`.
- **Print CSS:** Isolated in a new `src/print.css` file (not mixed into component CSS).

## Print CSS Specification

- `@page { size: letter portrait; margin: 0.75in; }`
- Hide from print: app chrome (`.app-container` background), toolbar, BubbleMenu, print button
- Document container: remove box-shadow, width 100% so browser pagination takes over
- `print-color-adjust: exact` — preserves chord colors, annotation colors, leader dots
- `break-inside: avoid` on song title and section markers
- Annotation flex layout (`annotated-line`) prints as-is; leader dot borders render natively

## Future Library Architecture

Each song gets a `songId` (UUID) in the persisted data shape. No UI yet, but this field enables keying a future multi-document library off stable IDs without a data migration.

## Files to Change

| File | Change |
|---|---|
| `src/styles/variables.css` | `--document-max-width: 816px` |
| `src/index.js` | Import `./print.css` |
| `src/print.css` | New file — all `@media print` rules |
| `src/App.js` | Add Print button to app header |
| `src/App.css` | Style the Print button; hide in print |
| `src/context/LyricSheetContext.js` | Add `songId` UUID to persisted state |
