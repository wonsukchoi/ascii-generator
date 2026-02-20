# ASCII Art Generator — CLAUDE.md

## Project Overview
Single-file offline ASCII art generator. Everything (figlet.js + 11 fonts) is embedded inline in `index.html`. No server, no dependencies, no internet required.

## File Structure
```
ascii-generator/
└── index.html   ← the entire app (HTML + CSS + JS + fonts, ~232 KB)
└── CLAUDE.md    ← this file
```

## Tech Stack
- Vanilla HTML/CSS/JS — no frameworks
- figlet.js (inlined) for ASCII art rendering
- HTML Canvas API for PNG export
- Clipboard API for copy-to-clipboard

## Current Features
- [x] Text input → ASCII art via figlet.js
- [x] 11 fonts embedded offline (Banner3-D, Banner3, Block, ANSI Shadow, Big, Doom, Epic, Larry 3D, Rectangles, Slant, Standard)
- [x] Font size slider (6–20px)
- [x] Live preview with color pickers (bg + text)
- [x] PNG export with independent color pickers (bg + text)
- [x] Transparent PNG background option
- [x] Copy as text / Copy as PNG / Save as PNG
- [x] Custom SVG dropdown arrow (no native browser arrow)
- [x] Flash notifications on copy/save

## Roadmap (prioritized)

### High Impact
- [ ] **Live-as-you-type** — auto-generate on input change (debounced ~300ms) so user doesn't need to press Enter/Generate
- [ ] **Multiline support** — switch input to `<textarea>`, handle `\n` as line breaks in figlet output stacking
- [ ] **More fonts** — add 10–15 popular figlet fonts (Graffiti, 3D-ASCII, Isometric1, Roman, Bubble, Star Wars, Chunky, etc.) inline
- [ ] **PNG padding control** — slider to adjust whitespace around the art in exported PNG
- [ ] **PNG scale/resolution** — 1x / 2x / 3x multiplier so exported PNGs are high-res

### Medium Impact
- [ ] **Save as .txt** — download the raw ASCII art as a plain text file
- [ ] **Copy as SVG** — vector export, scales infinitely, useful for designers
- [ ] **Font preview on hover** — show a tiny sample of each font in the dropdown before selecting
- [ ] **Character width selector** — figlet supports `full`, `fitted`, `controlled smushing` — expose this option

### Lower Impact
- [ ] **Keyboard shortcut hints** — show `⌘+Enter` or similar hints in the UI
- [ ] **Line/char count** — show dimensions of the output (e.g. "24 lines × 136 chars")
- [ ] **Dark/light UI toggle** — current UI is dark-only

## Rules for Self-Improvement
- Keep everything in a single `index.html` file — do not split into multiple files
- When adding new fonts, download the .flf file and inline it via `figlet.parseFont()` — never load from CDN at runtime
- Do not add external dependencies or CDN links
- Keep the UI minimal and terminal-aesthetic — avoid flashy animations or heavy UI frameworks
- Always commit and push after each feature with a clear commit message
- Run a quick sanity check (open in browser) after each change before pushing
