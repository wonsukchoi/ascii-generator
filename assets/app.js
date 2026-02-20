    // Fonts pre-loaded offline — no CDN needed

    let currentArt = '';
    let letterSpacing = 0;
    let wrapWidth = 0;
    let fillChar = '';

    function applyFill(art) {
      if (!fillChar) return art;
      // Replace space chars only (preserve newlines)
      return art.split('\n').map(line => line.replace(/ /g, fillChar)).join('\n');
    }

    function updateFillChar(val) {
      fillChar = val.slice(-1); // only the last typed char
      if (val.length > 1) document.getElementById('fill-char-input').value = fillChar;
      generate();
      savePrefs();
    }

    function transformCase(mode) {
      const input = document.getElementById('text-input');
      const t = input.value;
      switch (mode) {
        case 'upper':  input.value = t.toUpperCase(); break;
        case 'lower':  input.value = t.toLowerCase(); break;
        case 'title':  input.value = t.replace(/\b\w/g, c => c.toUpperCase()); break;
        case 'toggle': input.value = t.split('').map(c => c === c.toUpperCase() ? c.toLowerCase() : c.toUpperCase()).join(''); break;
      }
      generate();
    }

    function wordWrap(text, maxWidth) {
      if (!maxWidth || !text.trim()) return [text];
      const words = text.split(' ');
      const lines = [];
      let cur = '';
      for (const w of words) {
        if (cur && (cur + ' ' + w).length > maxWidth) { lines.push(cur); cur = w; }
        else cur = cur ? cur + ' ' + w : w;
      }
      if (cur) lines.push(cur);
      return lines.length ? lines : [text];
    }

    function setLetterSpacing(n) {
      letterSpacing = n;
      document.querySelectorAll('#lspc-btns .scale-btn').forEach(btn =>
        btn.classList.toggle('active', +btn.dataset.lspc === n)
      );
      generate();
      savePrefs();
    }

    function updateWrapWidth(val) {
      wrapWidth = parseInt(val, 10);
      document.getElementById('wrap-width-display').textContent = wrapWidth > 0 ? wrapWidth + ' ch' : 'OFF';
      generate();
      savePrefs();
    }

    function figletAsync(text, font, layout) {
      return new Promise((resolve, reject) => {
        figlet.text(text, { font, horizontalLayout: layout }, (err, result) => {
          if (err) reject(err);
          else resolve(result);
        });
      });
    }

    async function generate() {
      if (animTimer) stopAnimation();
      const raw  = document.getElementById('text-input').value || 'HELLO';
      const font = document.getElementById('font-select').value;
      const output = document.getElementById('ascii-output');
      const status = document.getElementById('status');

      output.textContent = '...';
      status.textContent = `Loading font: ${font}`;

      let inputLines = raw.split('\n');
      if (wrapWidth > 0) inputLines = inputLines.flatMap(line => wordWrap(line, wrapWidth));
      if (letterSpacing > 0) inputLines = inputLines.map(line => line.split('').join(' '.repeat(letterSpacing)));

      try {
        const rendered = await Promise.all(
          inputLines.map(line => line.trim() ? figletAsync(line, font, currentLayout) : Promise.resolve(''))
        );
        currentArt = applyEcho(applyFill(applyFlip(applyBorder(alignArt(rendered.join('\n'.repeat(blockGap + 1)), currentAlign), borderStyle))));
        refreshDisplay();
        const artLines = currentArt.split('\n');
        const lineCount = artLines.length;
        const maxChars  = Math.max(...artLines.map(l => l.length));
        const fs  = parseInt(document.getElementById('font-size-slider').value, 10);
        const lh  = Math.ceil(fs * lineHeightMult);
        const pad = parseInt(document.getElementById('png-padding-slider').value, 10);
        const estW = Math.round(maxChars * fs * 0.603 + pad * 2);
        const estH = Math.round(lineCount * lh + pad * 2);
        status.textContent = `Font: ${font} · ${lineCount} lines · ${maxChars} chars · ~${estW}×${estH}px`;
        const params = new URLSearchParams({ text: raw, font });
        history.replaceState(null, '', '#' + params.toString());
        document.title = (raw.trim().slice(0, 24) || 'ASCII') + ' — ASCII Generator';
        if (!restoringHistory) pushHistory({ text: raw, font, layout: currentLayout, align: currentAlign, art: currentArt });
      } catch (err) {
        output.textContent = `Error: ${err.message}`;
        status.textContent = '';
      }
    }

    // ── Typewriter animation ─────────────────────────────────────────────
    let animTimer = null;

    function typewriterPlay() {
      if (!currentArt) return;
      stopAnimation();
      const output = document.getElementById('ascii-output');
      const btn    = document.getElementById('anim-btn');
      const art    = currentArt;
      let i = 0;
      btn.textContent = '■ STOP';
      animTimer = setInterval(() => {
        const speed = parseInt(document.getElementById('anim-speed').value, 10);
        const loop  = document.getElementById('anim-loop').checked;
        i = Math.min(i + speed, art.length);
        output.textContent = art.slice(0, i);
        if (i >= art.length) {
          if (loop) { setTimeout(() => { i = 0; }, 600); }
          else { stopAnimation(); btn.textContent = '▶ PLAY'; }
        }
      }, 16);
    }

    function stopAnimation() {
      if (animTimer) { clearInterval(animTimer); animTimer = null; }
      const btn = document.getElementById('anim-btn');
      if (btn) btn.textContent = '▶ PLAY';
      if (currentArt) refreshDisplay();
    }

    function toggleAnimation() {
      if (animTimer) stopAnimation();
      else typewriterPlay();
    }

    // ── Random text ──────────────────────────────────────────────────────
    const RANDOM_PHRASES = [
      'HELLO', 'WORLD', 'ASCII', 'RETRO', 'HACK', 'CYBER', 'NEON', 'GHOST',
      'MATRIX', 'PIXEL', 'CODE', 'SUDO', 'ROOT', 'SHELL', 'BYTE', 'GLITCH',
      'NOVA', 'ORBIT', 'PULSAR', 'VORTEX', 'SIGNAL', 'ECHO', 'VOID', 'APEX',
      'TURBO', 'ULTRA', 'MEGA', 'HYPER', 'ZETA', 'FLUX', 'ROGUE', 'ZERO',
    ];

    function randomText() {
      const pick = () => RANDOM_PHRASES[Math.floor(Math.random() * RANDOM_PHRASES.length)];
      const count = Math.random() < 0.4 ? 2 : 1;
      const lines = Array.from({ length: count }, pick);
      document.getElementById('text-input').value = lines.join('\n');
      generate();
    }

    // ── Social share ─────────────────────────────────────────────────────
    function shareTwitter() {
      const url = encodeURIComponent(window.location.href);
      const text = encodeURIComponent('Check out my ASCII art! 🖥️');
      window.open(`https://twitter.com/intent/tweet?text=${text}&url=${url}`, '_blank');
    }

    function flash(msg) {
      const wrapper = document.getElementById('output-wrapper');
      wrapper.dataset.flashMsg = msg;
      wrapper.classList.remove('flashed');
      void wrapper.offsetWidth;
      wrapper.classList.add('flashed');
      setTimeout(() => wrapper.classList.remove('flashed'), 1600);
    }

    function copyLink() {
      closeExportMenu();
      navigator.clipboard.writeText(window.location.href).then(() => flash('COPIED LINK!'));
    }

    function copyArt() {
      closeExportMenu();
      if (!currentArt) return;
      navigator.clipboard.writeText(currentArt).then(() => flash('COPIED TEXT!'));
    }

    function copyMarkdown() {
      closeExportMenu();
      if (!currentArt) return;
      navigator.clipboard.writeText('```\n' + currentArt + '\n```').then(() => flash('COPIED MD!'));
    }

    function toggleTransparent(checked) {
      document.getElementById('png-bg').classList.toggle('disabled', checked);
    }

    function swapColors() {
      const prevBg  = document.getElementById('preview-bg');
      const prevTxt = document.getElementById('preview-text');
      const pngBg   = document.getElementById('png-bg');
      const pngTxt  = document.getElementById('png-text');
      // Swap preview pair
      const tmp1 = prevBg.value; prevBg.value = prevTxt.value; prevTxt.value = tmp1;
      document.getElementById('output-wrapper').style.background = prevBg.value;
      document.getElementById('ascii-output').style.color = prevTxt.value;
      // Swap PNG pair
      const tmp2 = pngBg.value; pngBg.value = pngTxt.value; pngTxt.value = tmp2;
      flash('SWAPPED!');
    }

    function syncToPng() {
      const prevBg  = document.getElementById('preview-bg').value;
      const prevTxt = document.getElementById('preview-text').value;
      document.getElementById('png-bg').value  = prevBg;
      document.getElementById('png-text').value = prevTxt;
      flash('SYNCED!');
    }

    let gradDir = 'v';
    let lineHeightMult = 1.15;

    function updateLineHeight(val) {
      lineHeightMult = parseFloat(val);
      document.getElementById('line-height-display').textContent = parseFloat(val).toFixed(2);
      document.getElementById('ascii-output').style.lineHeight = val;
      savePrefs();
    }

    function updatePreviewGradient() {
      const enabled = document.getElementById('png-gradient').checked;
      const output  = document.getElementById('ascii-output');
      if (enabled) {
        const from = document.getElementById('grad-from').value;
        const to   = document.getElementById('grad-to').value;
        const dir  = gradDir === 'h' ? 'to right' : 'to bottom';
        output.style.backgroundImage = `linear-gradient(${dir}, ${from}, ${to})`;
        output.style.backgroundClip = 'text';
        output.style.webkitBackgroundClip = 'text';
        output.style.color = 'transparent';
      } else {
        output.style.backgroundImage = '';
        output.style.backgroundClip = '';
        output.style.webkitBackgroundClip = '';
        output.style.color = document.getElementById('preview-text').value;
      }
    }

    function toggleGradient(checked) {
      document.getElementById('gradient-row').style.display = checked ? 'flex' : 'none';
      updatePreviewGradient();
    }

    function updatePreviewShadow() {
      const enabled = document.getElementById('png-shadow').checked;
      const output  = document.getElementById('ascii-output');
      if (enabled) {
        const color  = document.getElementById('shadow-color').value;
        const blur   = document.getElementById('shadow-blur').value;
        const offset = document.getElementById('shadow-offset').value;
        output.style.textShadow = `${offset}px ${offset}px ${blur}px ${color}, 0 0 ${+blur * 2}px ${color}`;
      } else {
        output.style.textShadow = '';
      }
    }

    function toggleShadow(checked) {
      document.getElementById('shadow-row').style.display = checked ? 'flex' : 'none';
      updatePreviewShadow();
    }

    function toggleOutline(checked) {
      document.getElementById('outline-row').style.display = checked ? 'flex' : 'none';
    }

    function toggleScanlines(checked) {
      document.getElementById('scanline-row').style.display = checked ? 'flex' : 'none';
    }

    function toggleVignette(checked) {
      document.getElementById('vignette-row').style.display = checked ? 'flex' : 'none';
    }

    function toggleBgGradient(checked) {
      document.getElementById('bg-gradient-row').style.display = checked ? 'flex' : 'none';
    }

    function setGradDir(dir) {
      gradDir = dir;
      document.querySelectorAll('#grad-h-btn, #grad-v-btn').forEach(btn =>
        btn.classList.toggle('active', btn.dataset.graddir === dir)
      );
      updatePreviewGradient();
      savePrefs();
    }

    function printArt() {
      closeExportMenu();
      if (!currentArt) return;
      const bg  = document.getElementById('preview-bg').value;
      const fg  = document.getElementById('preview-text').value;
      const fs  = parseInt(document.getElementById('font-size-slider').value, 10);
      const win = window.open('', '_blank');
      win.document.write(`<!DOCTYPE html><html><head><meta charset="UTF-8">
<style>
  @media print { body { margin: 0; } }
  body { margin: 0; background: ${bg}; display: flex; justify-content: center; align-items: center; min-height: 100vh; }
  pre { font-family: 'Courier New', Courier, monospace; font-size: ${fs}px; line-height: ${lineHeightMult}; color: ${fg}; white-space: pre; padding: 40px; }
</style></head><body><pre>${currentArt.replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;')}</pre>
<script>window.onload=function(){window.print();window.close();}<\/script></body></html>`);
      win.document.close();
    }

    const FONT_LIST = [
      'Banner3-D','Banner3','Block','ANSI Shadow','Big','Doom','Epic',
      'Larry 3D','Rectangles','Slant','Standard','3D-ASCII','Bloody',
      'Calvin S','Chunky','Colossal','Cyberlarge','Gothic','Graffiti',
      'Isometric1','Ogre','Puffy','Roman','Shadow','Speed','Star Wars','Varsity',
      'Alligator','Big Money-ne','Bulbhead','Impossible','Lean','Mini','Nancyj','Soft',
      'Crawford','Crazy','Doh','Electronic','Fender','Henry 3D','Morse','Swamp Land'
    ];

    // Populate hidden select and build custom dropdown items
    (function buildDropdown() {
      const hiddenSelect = document.getElementById('font-select');
      const list = document.getElementById('dropdown-list');

      FONT_LIST.forEach((font, i) => {
        // hidden option
        const opt = document.createElement('option');
        opt.value = font;
        opt.textContent = font;
        if (i === 0) opt.selected = true;
        hiddenSelect.appendChild(opt);

        // visible item
        const item = document.createElement('div');
        item.className = 'dropdown-item' + (i === 0 ? ' selected' : '');
        item.dataset.font = font;
        item.textContent = font;
        item.addEventListener('mouseenter', () => showFontPreview(font));
        item.addEventListener('mouseleave', hideFontPreview);
        item.addEventListener('click', () => selectFont(font));
        list.appendChild(item);
      });
    })();

    // ── Recent fonts ─────────────────────────────────────────────────────
    let recentFonts = [];

    function loadRecentFonts() {
      try {
        const stored = localStorage.getItem('ascii-recent-fonts');
        if (stored) recentFonts = JSON.parse(stored);
      } catch(e) {}
      renderRecentSection();
    }

    function pushRecentFont(font) {
      recentFonts = [font, ...recentFonts.filter(f => f !== font)].slice(0, 5);
      localStorage.setItem('ascii-recent-fonts', JSON.stringify(recentFonts));
      renderRecentSection();
    }

    function renderRecentSection() {
      const section  = document.getElementById('recent-section');
      const container = document.getElementById('recent-items');
      if (!recentFonts.length) { section.style.display = 'none'; return; }
      section.style.display = 'block';
      container.innerHTML = '';
      recentFonts.forEach(font => {
        const item = document.createElement('div');
        item.className = 'dropdown-item recent-item';
        item.dataset.font = font;
        item.textContent = font;
        item.addEventListener('mouseenter', () => showFontPreview(font));
        item.addEventListener('mouseleave', hideFontPreview);
        item.addEventListener('click', () => selectFont(font));
        container.appendChild(item);
      });
    }

    const previewCache = {};

    async function showFontPreview(font) {
      const panel = document.getElementById('font-preview-panel');
      const art   = document.getElementById('font-preview-art');
      panel.classList.add('visible');
      if (previewCache[font]) { art.textContent = previewCache[font]; return; }
      art.textContent = '...';
      try {
        const result = await figletAsync('Hi', font);
        previewCache[font] = result;
        art.textContent = result;
      } catch(e) { art.textContent = 'n/a'; }
    }

    function hideFontPreview() {
      document.getElementById('font-preview-panel').classList.remove('visible');
    }

    function selectFont(font) {
      const hiddenSelect = document.getElementById('font-select');
      hiddenSelect.value = font;
      hiddenSelect.dispatchEvent(new Event('change'));
      document.getElementById('select-btn').textContent = font;
      document.querySelectorAll('.dropdown-item').forEach(el =>
        el.classList.toggle('selected', el.dataset.font === font)
      );
      pushRecentFont(font);
      closeDropdown();
      // Close all-fonts overlay if open
      const overlay = document.getElementById('all-fonts-overlay');
      if (overlay && overlay.classList.contains('open')) closeAllFonts();
    }

    function filterFonts(query) {
      const q = query.toLowerCase();
      let anyVisible = false;
      // Filter recent items
      let anyRecentVisible = false;
      document.querySelectorAll('.recent-item').forEach(el => {
        const match = !q || el.dataset.font.toLowerCase().includes(q);
        el.classList.toggle('hidden', !match);
        if (match) anyRecentVisible = true;
      });
      document.getElementById('recent-section').style.display =
        recentFonts.length && anyRecentVisible ? 'block' : 'none';
      // Filter main items
      document.querySelectorAll('.dropdown-item:not(.recent-item)').forEach(el => {
        const match = el.dataset.font.toLowerCase().includes(q);
        el.classList.toggle('hidden', !match);
        if (match) anyVisible = true;
      });
      let noResults = document.getElementById('no-font-results');
      if (!anyVisible) {
        if (!noResults) {
          noResults = document.createElement('div');
          noResults.id = 'no-font-results';
          noResults.className = 'no-font-results';
          noResults.textContent = 'no matches';
          document.getElementById('dropdown-list').appendChild(noResults);
        }
        noResults.style.display = 'block';
      } else if (noResults) {
        noResults.style.display = 'none';
      }
    }

    function toggleDropdown() {
      const list = document.getElementById('dropdown-list');
      list.classList.toggle('open');
      if (list.classList.contains('open')) {
        setTimeout(() => document.getElementById('font-search').focus(), 50);
      }
    }

    function closeDropdown() {
      document.getElementById('dropdown-list').classList.remove('open');
      const search = document.getElementById('font-search');
      search.value = '';
      filterFonts('');
      hideFontPreview();
    }

    function toggleExportMenu() {
      document.getElementById('export-menu').classList.toggle('open');
    }

    function closeExportMenu() {
      document.getElementById('export-menu').classList.remove('open');
    }

    function toggleToolsMenu() {
      document.getElementById('tools-menu').classList.toggle('open');
    }

    function closeToolsMenu() {
      document.getElementById('tools-menu').classList.remove('open');
    }

    // Close menus on outside click
    document.addEventListener('click', e => {
      if (!document.getElementById('custom-select').contains(e.target)) closeDropdown();
      if (!document.getElementById('export-dropdown').contains(e.target)) closeExportMenu();
      if (!document.getElementById('bm-dropdown').contains(e.target)) closeBmMenu();
      if (!document.getElementById('tools-dropdown').contains(e.target)) closeToolsMenu();
    });

    const COLOR_PRESETS = [
      { name: 'Gold',  bg: '#111111', text: '#c9a96e' },
      { name: 'Matrix',bg: '#0d1117', text: '#00ff41' },
      { name: 'Cyber', bg: '#0d0d0d', text: '#ff2d78' },
      { name: 'Neon',  bg: '#050510', text: '#00d4ff' },
      { name: 'Retro', bg: '#1a1400', text: '#ffb000' },
      { name: 'Blood', bg: '#0a0000', text: '#cc0000' },
      { name: 'Paper', bg: '#f5f0e8', text: '#1a1a1a' },
      { name: 'Ghost', bg: '#e8e8e8', text: '#888888' },
      { name: 'Synth', bg: '#0d0221', text: '#ff71ce' },
      { name: 'Ocean', bg: '#0a1628', text: '#00ccff' },
      { name: 'Forest',bg: '#0d1a0f', text: '#39d353' },
      { name: 'Void',  bg: '#000000', text: '#555555' },
    ];

    let activePreset = 'Gold';
    let customPresets = [];

    function loadCustomPresets() {
      try { customPresets = JSON.parse(localStorage.getItem('ascii-custom-presets') || '[]'); } catch(e) { customPresets = []; }
    }

    function saveCustomPresets() {
      localStorage.setItem('ascii-custom-presets', JSON.stringify(customPresets));
    }

    function addCustomPreset() {
      if (customPresets.length >= 4) { flash('MAX 4 CUSTOM'); return; }
      const bg   = document.getElementById('preview-bg').value;
      const text = document.getElementById('preview-text').value;
      const name = 'My' + (customPresets.length + 1);
      customPresets.push({ name, bg, text });
      saveCustomPresets();
      buildPresetSwatches();
      flash('PRESET SAVED!');
    }

    function deleteCustomPreset(name) {
      customPresets = customPresets.filter(p => p.name !== name);
      saveCustomPresets();
      buildPresetSwatches();
    }

    function randomFont() {
      const current = document.getElementById('font-select').value;
      const others = FONT_LIST.filter(f => f !== current);
      selectFont(others[Math.floor(Math.random() * others.length)]);
    }

    function buildPresetSwatches() {
      const container = document.getElementById('preset-swatches');
      container.innerHTML = '';

      const makeSwatch = (p, deletable) => {
        const wrap = document.createElement('span');
        wrap.style.cssText = 'position:relative;display:inline-flex;';
        const btn = document.createElement('button');
        btn.className = 'preset-swatch' + (p.name === activePreset ? ' active' : '');
        btn.title = p.name;
        btn.dataset.preset = p.name;
        btn.style.background = p.bg;
        btn.style.color = p.text;
        btn.style.borderColor = p.text + '66';
        btn.textContent = 'A';
        btn.addEventListener('click', () => applyPreset(p));
        wrap.appendChild(btn);
        if (deletable) {
          const del = document.createElement('button');
          del.textContent = '×';
          del.title = 'Delete custom preset';
          del.style.cssText = 'position:absolute;top:-5px;right:-5px;background:#c9a96e;border:none;border-radius:50%;width:13px;height:13px;font-size:9px;cursor:pointer;display:none;align-items:center;justify-content:center;line-height:1;color:#111;font-weight:bold;';
          del.addEventListener('click', e => { e.stopPropagation(); deleteCustomPreset(p.name); });
          wrap.addEventListener('mouseenter', () => del.style.display = 'flex');
          wrap.addEventListener('mouseleave', () => del.style.display = 'none');
          wrap.appendChild(del);
        }
        return wrap;
      };

      COLOR_PRESETS.forEach(p => container.appendChild(makeSwatch(p, false)));
      customPresets.forEach(p => container.appendChild(makeSwatch(p, true)));

      // "+" button to save current colors
      if (customPresets.length < 4) {
        const addBtn = document.createElement('button');
        addBtn.className = 'preset-swatch';
        addBtn.title = 'Save current preview colors as custom preset (up to 4)';
        addBtn.textContent = '+';
        addBtn.style.cssText = 'border-style:dashed;opacity:0.45;font-size:18px;line-height:1;';
        addBtn.addEventListener('click', addCustomPreset);
        addBtn.addEventListener('mouseenter', () => addBtn.style.opacity = '1');
        addBtn.addEventListener('mouseleave', () => addBtn.style.opacity = '0.45');
        container.appendChild(addBtn);
      }
    }

    function applyPreset(p) {
      activePreset = p.name;
      const setColor = (id, val) => {
        const el = document.getElementById(id);
        el.value = val;
        el.dispatchEvent(new Event('input'));
      };
      setColor('preview-bg',   p.bg);
      setColor('preview-text', p.text);
      setColor('png-bg',       p.bg);
      setColor('png-text',     p.text);
      document.querySelectorAll('.preset-swatch').forEach(s =>
        s.classList.toggle('active', s.dataset.preset === p.name)
      );
      savePrefs();
    }

    loadCustomPresets();
    buildPresetSwatches();

    function toggleTheme() {
      const light = document.body.classList.toggle('light');
      document.getElementById('theme-toggle').textContent = light ? 'DARK' : 'LIGHT';
      savePrefs();
    }

    function toggleFocus() {
      const on = document.body.classList.toggle('focus-mode');
      document.getElementById('focus-btn').textContent = on ? 'EXIT' : 'FOCUS';
    }

    function exitFocus() {
      if (document.body.classList.contains('focus-mode')) {
        document.body.classList.remove('focus-mode');
        document.getElementById('focus-btn').textContent = 'FOCUS';
      }
    }

    let currentLayout = 'default';

    function setLayout(layout) {
      currentLayout = layout;
      document.querySelectorAll('#width-btns .scale-btn').forEach(btn =>
        btn.classList.toggle('active', btn.dataset.layout === layout)
      );
      savePrefs();
      generate();
    }

    // Generation history
    const artHistory = [];
    let historyIdx = -1;
    let restoringHistory = false;

    function pushHistory(entry) {
      // Trim forward history if we're not at the end
      if (historyIdx < artHistory.length - 1) artHistory.splice(historyIdx + 1);
      // Deduplicate: skip if identical to last entry
      const last = artHistory[artHistory.length - 1];
      if (last && last.text === entry.text && last.font === entry.font &&
          last.layout === entry.layout && last.align === entry.align) return;
      artHistory.push(entry);
      if (artHistory.length > 10) artHistory.shift();
      historyIdx = artHistory.length - 1;
      updateHistoryNav();
    }

    function navigateHistory(dir) {
      const next = historyIdx + dir;
      if (next < 0 || next >= artHistory.length) return;
      historyIdx = next;
      const entry = artHistory[historyIdx];

      restoringHistory = true;
      document.getElementById('text-input').value = entry.text;
      selectFont(entry.font);
      setLayout(entry.layout);
      setAlign(entry.align);
      currentArt = entry.art;
      document.getElementById('ascii-output').textContent = entry.art;
      restoringHistory = false;

      const artLines = entry.art.split('\n');
      document.getElementById('status').textContent =
        `Font: ${entry.font} · ${artLines.length} lines · ${Math.max(...artLines.map(l => l.length))} chars wide`;
      updateHistoryNav();
    }

    function updateHistoryNav() {
      const nav = document.getElementById('history-nav');
      nav.style.display = artHistory.length > 1 ? 'flex' : 'none';
      document.getElementById('history-pos').textContent = `${historyIdx + 1} / ${artHistory.length}`;
      document.querySelector('.hist-btn:first-child').disabled = historyIdx === 0;
      document.querySelector('.hist-btn:last-child').disabled  = historyIdx === artHistory.length - 1;
    }

    let currentAlign = 'left';

    function alignArt(art, align) {
      if (align === 'left') return art;
      const lines = art.split('\n');
      const max = Math.max(...lines.map(l => l.length));
      return lines.map(l => {
        const pad = max - l.length;
        if (align === 'center') return ' '.repeat(Math.floor(pad / 2)) + l;
        if (align === 'right')  return ' '.repeat(pad) + l;
        return l;
      }).join('\n');
    }

    function setAlign(align) {
      currentAlign = align;
      document.querySelectorAll('#align-btns .scale-btn').forEach(btn =>
        btn.classList.toggle('active', btn.dataset.align === align)
      );
      generate();
      savePrefs();
    }

    let pngScale = 1;

    function setScale(s) {
      pngScale = s;
      document.querySelectorAll('.scale-btn').forEach(btn => {
        btn.classList.toggle('active', parseInt(btn.dataset.scale) === s);
      });
      savePrefs();
    }

    function buildCanvas() {
      if (!currentArt) return null;
      const scale      = pngScale;
      const fontSize   = parseInt(document.getElementById('font-size-slider').value, 10) * scale;
      const lineHeight = Math.ceil(fontSize * lineHeightMult);
      const pad        = parseInt(document.getElementById('png-padding-slider').value, 10) * scale;
      const lines      = currentArt.split('\n');

      // Measure max line width using an offscreen canvas
      const measure = document.createElement('canvas').getContext('2d');
      measure.font = `${fontSize}px "Courier New", Courier, monospace`;
      const maxWidth = lines.reduce((m, l) => Math.max(m, measure.measureText(l).width), 0);

      const canvas = document.createElement('canvas');
      canvas.width  = Math.ceil(maxWidth) + pad * 2;
      canvas.height = lines.length * lineHeight + pad * 2;

      const transparent   = document.getElementById('png-transparent').checked;
      const bgColor       = document.getElementById('png-bg').value;
      const textColor     = document.getElementById('png-text').value;
      const useGradient   = document.getElementById('png-gradient').checked;
      const gradFrom      = document.getElementById('grad-from').value;
      const gradTo        = document.getElementById('grad-to').value;

      const ctx = canvas.getContext('2d');
      if (!transparent) {
        const useBgGrad = document.getElementById('png-bg-gradient').checked;
        if (useBgGrad) {
          const bgGradTo = document.getElementById('bg-grad-to').value;
          const bgG = gradDir === 'h'
            ? ctx.createLinearGradient(0, 0, canvas.width, 0)
            : ctx.createLinearGradient(0, 0, 0, canvas.height);
          bgG.addColorStop(0, bgColor);
          bgG.addColorStop(1, bgGradTo);
          ctx.fillStyle = bgG;
        } else {
          ctx.fillStyle = bgColor;
        }
        ctx.fillRect(0, 0, canvas.width, canvas.height);
      }

      if (useGradient) {
        const grad = gradDir === 'h'
          ? ctx.createLinearGradient(pad, 0, canvas.width - pad, 0)
          : ctx.createLinearGradient(0, pad, 0, canvas.height - pad);
        grad.addColorStop(0, gradFrom);
        grad.addColorStop(1, gradTo);
        ctx.fillStyle = grad;
      } else {
        ctx.fillStyle = textColor;
      }
      if (document.getElementById('png-shadow').checked) {
        ctx.shadowColor   = document.getElementById('shadow-color').value;
        ctx.shadowBlur    = parseInt(document.getElementById('shadow-blur').value, 10) * scale;
        const off = parseInt(document.getElementById('shadow-offset').value, 10) * scale;
        ctx.shadowOffsetX = off;
        ctx.shadowOffsetY = off;
      }

      ctx.font = `${fontSize}px "Courier New", Courier, monospace`;
      ctx.textBaseline = 'top';

      // Stroke/outline pass first (appears behind fill)
      if (document.getElementById('png-outline').checked) {
        const sw = parseInt(document.getElementById('outline-width').value, 10) * scale;
        ctx.strokeStyle = document.getElementById('outline-color').value;
        ctx.lineWidth = sw;
        ctx.lineJoin = 'round';
        lines.forEach((line, i) => ctx.strokeText(line, pad, pad + i * lineHeight));
      }

      lines.forEach((line, i) => {
        ctx.fillText(line, pad, pad + i * lineHeight);
      });

      // Reset shadow for clean canvas
      ctx.shadowColor = 'transparent';
      ctx.shadowBlur = 0;
      ctx.shadowOffsetX = ctx.shadowOffsetY = 0;

      // Vignette overlay
      if (document.getElementById('png-vignette').checked) {
        const strength = parseFloat(document.getElementById('vignette-strength').value);
        const vGrad = ctx.createRadialGradient(
          canvas.width / 2, canvas.height / 2, 0,
          canvas.width / 2, canvas.height / 2, Math.max(canvas.width, canvas.height) * 0.65
        );
        vGrad.addColorStop(0, 'rgba(0,0,0,0)');
        vGrad.addColorStop(1, `rgba(0,0,0,${strength})`);
        ctx.fillStyle = vGrad;
        ctx.fillRect(0, 0, canvas.width, canvas.height);
      }

      // CRT scanlines overlay
      if (document.getElementById('png-scanlines').checked) {
        const spacing = Math.max(2, Math.round(3 * scale));
        const alpha   = parseFloat(document.getElementById('scanline-opacity').value);
        ctx.fillStyle = `rgba(0,0,0,${alpha})`;
        for (let y = 0; y < canvas.height; y += spacing) {
          ctx.fillRect(0, y, canvas.width, 1 * scale);
        }
      }

      return canvas;
    }

    function copyPng() {
      closeExportMenu();
      const canvas = buildCanvas();
      if (!canvas) return;
      canvas.toBlob(blob => {
        navigator.clipboard.write([new ClipboardItem({ 'image/png': blob })])
          .then(() => flash('COPIED PNG!'))
          .catch(() => {
            document.getElementById('status').textContent = 'Clipboard PNG not supported in this browser — use Save PNG instead.';
          });
      });
    }

    function saveTxt() {
      closeExportMenu();
      if (!currentArt) return;
      const name = document.getElementById('text-input').value.trim() || 'ascii';
      const blob = new Blob([currentArt], { type: 'text/plain' });
      const link = document.createElement('a');
      link.download = `${name.toLowerCase().replace(/\s+/g, '-')}-ascii.txt`;
      link.href = URL.createObjectURL(blob);
      link.click();
      URL.revokeObjectURL(link.href);
      flash('SAVED TXT!');
    }

    function buildSvg() {
      if (!currentArt) return null;
      const fontSize   = parseInt(document.getElementById('font-size-slider').value, 10);
      const lineHeight = Math.ceil(fontSize * lineHeightMult);
      const pad        = parseInt(document.getElementById('png-padding-slider').value, 10);
      const transparent = document.getElementById('png-transparent').checked;
      const bgColor    = document.getElementById('png-bg').value;
      const textColor  = document.getElementById('png-text').value;
      const lines      = currentArt.split('\n');

      // Measure width via canvas
      const measure = document.createElement('canvas').getContext('2d');
      measure.font = `${fontSize}px "Courier New", Courier, monospace`;
      const maxWidth = lines.reduce((m, l) => Math.max(m, measure.measureText(l).width), 0);

      const w = Math.ceil(maxWidth) + pad * 2;
      const h = lines.length * lineHeight + pad * 2;

      const escapeXml = s => s.replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;');

      const bgRect = transparent ? '' :
        `<rect width="${w}" height="${h}" fill="${bgColor}"/>`;

      const useGradient = document.getElementById('png-gradient').checked;
      const gradFrom    = document.getElementById('grad-from').value;
      const gradTo      = document.getElementById('grad-to').value;

      let defsInner = '';
      let fillAttr  = `fill="${textColor}"`;
      let filterAttr = '';

      if (useGradient) {
        const x2 = gradDir === 'h' ? '100%' : '0%';
        const y2 = gradDir === 'h' ? '0%'   : '100%';
        defsInner += `<linearGradient id="tg" x1="0%" y1="0%" x2="${x2}" y2="${y2}"><stop offset="0%" stop-color="${gradFrom}"/><stop offset="100%" stop-color="${gradTo}"/></linearGradient>`;
        fillAttr  = 'fill="url(#tg)"';
      }

      if (document.getElementById('png-shadow').checked) {
        const shadowColor  = document.getElementById('shadow-color').value;
        const shadowBlur   = parseInt(document.getElementById('shadow-blur').value, 10);
        const shadowOffset = parseInt(document.getElementById('shadow-offset').value, 10);
        defsInner += `<filter id="shd" x="-20%" y="-20%" width="140%" height="140%"><feDropShadow dx="${shadowOffset}" dy="${shadowOffset}" stdDeviation="${shadowBlur / 2}" flood-color="${shadowColor}"/></filter>`;
        filterAttr = 'filter="url(#shd)"';
      }

      const defsBlock = defsInner ? `<defs>${defsInner}</defs>` : '';

      const textLines = lines.map((line, i) =>
        `<text x="${pad}" y="${pad + i * lineHeight + fontSize}">${escapeXml(line)}</text>`
      ).join('\n  ');

      return `<svg xmlns="http://www.w3.org/2000/svg" width="${w}" height="${h}" viewBox="0 0 ${w} ${h}">
  ${defsBlock}
  ${bgRect}
  <g font-family="'Courier New', Courier, monospace" font-size="${fontSize}" ${fillAttr} ${filterAttr} xml:space="preserve">
  ${textLines}
  </g>
</svg>`;
    }

    function copySvg() {
      closeExportMenu();
      const svg = buildSvg();
      if (!svg) return;
      navigator.clipboard.writeText(svg).then(() => flash('COPIED SVG!'));
    }

    function saveSvg() {
      closeExportMenu();
      const svg = buildSvg();
      if (!svg) return;
      const name = document.getElementById('text-input').value.trim() || 'ascii';
      const blob = new Blob([svg], { type: 'image/svg+xml' });
      const link = document.createElement('a');
      link.download = `${name.toLowerCase().replace(/\s+/g, '-')}-ascii.svg`;
      link.href = URL.createObjectURL(blob);
      link.click();
      URL.revokeObjectURL(link.href);
      flash('SAVED SVG!');
    }

    function hexToRgb(hex) {
      return [parseInt(hex.slice(1,3),16), parseInt(hex.slice(3,5),16), parseInt(hex.slice(5,7),16)];
    }

    function buildAnsi() {
      if (!currentArt) return null;
      const fg  = document.getElementById('png-text').value;
      const bg  = document.getElementById('png-bg').value;
      const trn = document.getElementById('png-transparent').checked;
      const [fr,fg2,fb] = hexToRgb(fg);
      const fgCode = `\x1b[38;2;${fr};${fg2};${fb}m`;
      let bgCode = '';
      if (!trn) { const [br,bg2,bb] = hexToRgb(bg); bgCode = `\x1b[48;2;${br};${bg2};${bb}m`; }
      return bgCode + fgCode + currentArt + '\x1b[0m';
    }

    function copyAnsi() {
      closeExportMenu();
      const ansi = buildAnsi();
      if (!ansi) return;
      navigator.clipboard.writeText(ansi).then(() => flash('COPIED ANSI!'));
    }

    async function exportAllFonts() {
      closeExportMenu();
      if (!currentArt) return;
      const raw = document.getElementById('text-input').value || 'HELLO';
      flash('RENDERING ALL...');
      let result = '';
      for (const f of FONT_LIST) {
        try {
          const art = await figletAsync(raw, f, currentLayout);
          const rule = '─'.repeat(52);
          result += `${rule}\n  ${f}\n${rule}\n${art}\n\n`;
        } catch(e) {}
      }
      const name = (document.getElementById('text-input').value.trim() || 'ascii').toLowerCase().replace(/\s+/g,'-');
      const blob = new Blob([result], { type: 'text/plain' });
      const link = document.createElement('a');
      link.download = `${name}-all-fonts.txt`;
      link.href = URL.createObjectURL(blob);
      link.click();
      URL.revokeObjectURL(link.href);
      flash('SAVED ALL FONTS!');
    }

    function saveAnsi() {
      closeExportMenu();
      const ansi = buildAnsi();
      if (!ansi) return;
      const name = document.getElementById('text-input').value.trim() || 'ascii';
      const blob = new Blob([ansi], { type: 'text/plain' });
      const link = document.createElement('a');
      link.download = `${name.toLowerCase().replace(/\s+/g,'-')}-ascii.ans`;
      link.href = URL.createObjectURL(blob);
      link.click();
      URL.revokeObjectURL(link.href);
      flash('SAVED ANSI!');
    }

    function savePng() {
      closeExportMenu();
      const canvas = buildCanvas();
      if (!canvas) return;
      const text = document.getElementById('text-input').value.trim() || 'ascii';
      const link = document.createElement('a');
      link.download = `${text.toLowerCase().replace(/\s+/g, '-')}-ascii.png`;
      link.href = canvas.toDataURL('image/png');
      link.click();
      flash('SAVED PNG!');
    }

    function applyPreviewSize() {
      const base = parseInt(document.getElementById('font-size-slider').value, 10);
      const zoom = parseFloat(document.getElementById('zoom-slider').value);
      document.getElementById('ascii-output').style.fontSize = (base * zoom) + 'px';
    }

    function updateFontSize(val) {
      document.getElementById('font-size-display').textContent = val + 'px';
      applyPreviewSize();
    }

    function updateZoom(val) {
      const z = parseFloat(val);
      document.getElementById('zoom-display').textContent = z + '×';
      applyPreviewSize();
    }

    // Ctrl/Cmd + scroll to zoom
    document.getElementById('output-wrapper').addEventListener('wheel', e => {
      if (!e.ctrlKey && !e.metaKey) return;
      e.preventDefault();
      const slider = document.getElementById('zoom-slider');
      const newVal = Math.max(0.5, Math.min(4, parseFloat(slider.value) + (e.deltaY < 0 ? 0.5 : -0.5)));
      slider.value = newVal;
      updateZoom(newVal);
    }, { passive: false });

    let showLineNumbers = false;

    function refreshDisplay() {
      const output = document.getElementById('ascii-output');
      if (!currentArt) return;
      if (showLineNumbers) {
        const lines = currentArt.split('\n');
        const padLen = String(lines.length).length;
        const numbered = lines.map((l, i) => String(i + 1).padStart(padLen, '0') + ' │ ' + l).join('\n');
        output.textContent = numbered;
      } else {
        output.textContent = currentArt;
      }
    }

    function toggleLineNumbers() {
      showLineNumbers = !showLineNumbers;
      document.getElementById('ln-btn').classList.toggle('active', showLineNumbers);
      refreshDisplay();
    }

    function autoFitZoom() {
      if (!currentArt) return;
      const artLines = currentArt.split('\n');
      const maxLen = Math.max(...artLines.map(l => l.length));
      if (!maxLen) return;
      const containerW = document.getElementById('output-wrapper').clientWidth - 64;
      const fontSize   = parseInt(document.getElementById('font-size-slider').value, 10);
      const artWidth   = maxLen * fontSize * 0.603;
      const rawZoom    = containerW / artWidth;
      // Snap to nearest 0.5 step within [0.5, 4]
      const snapped = Math.max(0.5, Math.min(4, Math.round(rawZoom * 2) / 2));
      document.getElementById('zoom-slider').value = snapped;
      updateZoom(snapped);
      flash('ZOOMED TO FIT!');
    }

    let borderStyle = 'none';

    function applyBorder(art, style) {
      if (style === 'none') return art;
      const lines  = art.split('\n');
      const maxLen = Math.max(...lines.map(l => l.length));
      const padded = lines.map(l => l + ' '.repeat(maxLen - l.length));
      if (style === 'simple') {
        const top = '┌' + '─'.repeat(maxLen + 2) + '┐';
        const bot = '└' + '─'.repeat(maxLen + 2) + '┘';
        return [top, ...padded.map(l => '│ ' + l + ' │'), bot].join('\n');
      }
      if (style === 'double') {
        const top = '╔' + '═'.repeat(maxLen + 2) + '╗';
        const bot = '╚' + '═'.repeat(maxLen + 2) + '╝';
        return [top, ...padded.map(l => '║ ' + l + ' ║'), bot].join('\n');
      }
      if (style === 'hash') {
        const hr = '#'.repeat(maxLen + 4);
        return [hr, ...padded.map(l => '# ' + l + ' #'), hr].join('\n');
      }
      return art;
    }

    function setBorder(style) {
      borderStyle = style;
      document.querySelectorAll('#border-btns .scale-btn').forEach(btn =>
        btn.classList.toggle('active', btn.dataset.border === style)
      );
      generate();
      savePrefs();
    }

    let echoMode = 'none'; // 'none', 'h', 'v', 'hv'

    function applyEcho(art) {
      if (echoMode === 'none') return art;
      let lines = art.split('\n');
      if (echoMode === 'h' || echoMode === 'hv') {
        lines = lines.map(l => l + l.split('').reverse().join(''));
      }
      if (echoMode === 'v' || echoMode === 'hv') {
        lines = [...lines, ...[...lines].reverse()];
      }
      return lines.join('\n');
    }

    function setEchoMode(mode) {
      echoMode = mode;
      document.querySelectorAll('#echo-btns .scale-btn').forEach(btn =>
        btn.classList.toggle('active', btn.dataset.echo === mode)
      );
      generate();
      savePrefs();
    }

    let flipMode = ''; // '', 'h', 'v', 'hv'

    function applyFlip(art) {
      if (!flipMode) return art;
      let lines = art.split('\n');
      if (flipMode.includes('v')) lines = lines.reverse();
      if (flipMode.includes('h')) lines = lines.map(l => l.split('').reverse().join(''));
      return lines.join('\n');
    }

    function setFlipMode(mode) {
      flipMode = mode;
      document.querySelectorAll('#flip-btns .scale-btn').forEach(btn =>
        btn.classList.toggle('active', btn.dataset.flip === mode)
      );
      generate();
      savePrefs();
    }

    let blockGap = 0;

    function updateBlockGap(val) {
      blockGap = parseInt(val, 10);
      document.getElementById('block-gap-display').textContent = val;
      generate();
    }

    function buildHtml() {
      if (!currentArt) return null;
      const fontSize  = parseInt(document.getElementById('font-size-slider').value, 10);
      const previewBg = document.getElementById('preview-bg').value;
      const previewFg = document.getElementById('preview-text').value;
      const escaped   = currentArt
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;');
      return `<pre style="font-family:'Courier New',Courier,monospace;font-size:${fontSize}px;line-height:${lineHeightMult};background:${previewBg};color:${previewFg};padding:32px;display:inline-block;white-space:pre;">${escaped}</pre>`;
    }

    function copyHtml() {
      closeExportMenu();
      const html = buildHtml();
      if (!html) return;
      navigator.clipboard.writeText(html).then(() => flash('COPIED HTML!'));
    }

    function saveHtml() {
      closeExportMenu();
      const html = buildHtml();
      if (!html) return;
      const name = document.getElementById('text-input').value.trim() || 'ascii';
      const full = `<!DOCTYPE html><html><head><meta charset="UTF-8"></head><body style="margin:0;background:#1c1c1c;">${html}</body></html>`;
      const blob = new Blob([full], { type: 'text/html' });
      const link = document.createElement('a');
      link.download = `${name.toLowerCase().replace(/\s+/g, '-')}-ascii.html`;
      link.href = URL.createObjectURL(blob);
      link.click();
      URL.revokeObjectURL(link.href);
      flash('SAVED HTML!');
    }

    // Live-as-you-type (debounced 300ms)
    let debounceTimer;
    function debouncedGenerate() {
      clearTimeout(debounceTimer);
      debounceTimer = setTimeout(generate, 300);
    }

    // Textarea auto-resize + debounced generate + input stats
    const _ta = document.getElementById('text-input');
    function updateInputStats() {
      const v = _ta.value;
      const chars = v.length;
      const words = v.trim() ? v.trim().split(/\s+/).length : 0;
      const lines = v.split('\n').length;
      document.getElementById('input-stats').textContent =
        `${lines} line${lines !== 1 ? 's' : ''} · ${words} word${words !== 1 ? 's' : ''} · ${chars} char${chars !== 1 ? 's' : ''}`;
    }
    _ta.addEventListener('input', () => {
      _ta.style.height = 'auto';
      _ta.style.height = Math.min(_ta.scrollHeight, 300) + 'px';
      updateInputStats();
      if (!restoringHistory) debouncedGenerate();
    });

    // Drag-and-drop text file onto textarea
    _ta.addEventListener('dragover', e => { e.preventDefault(); _ta.style.borderColor = '#c9a96e'; });
    _ta.addEventListener('dragleave', () => { _ta.style.borderColor = ''; });
    _ta.addEventListener('drop', e => {
      e.preventDefault();
      _ta.style.borderColor = '';
      const file = e.dataTransfer.files[0];
      if (!file) return;
      if (!/text/.test(file.type) && !file.name.match(/\.(txt|md|csv)$/i)) {
        flash('DROP TEXT FILES'); return;
      }
      const reader = new FileReader();
      reader.onload = ev => {
        _ta.value = ev.target.result.slice(0, 2000).trim();
        _ta.style.height = 'auto';
        _ta.style.height = Math.min(_ta.scrollHeight, 300) + 'px';
        generate();
        flash('FILE LOADED!');
      };
      reader.readAsText(file);
    });

    // Tab key inserts 2 spaces instead of focusing next element
    document.getElementById('text-input').addEventListener('keydown', e => {
      if (e.key === 'Tab') {
        e.preventDefault();
        const ta = e.target, s = ta.selectionStart, end = ta.selectionEnd;
        ta.value = ta.value.slice(0, s) + '  ' + ta.value.slice(end);
        ta.setSelectionRange(s + 2, s + 2);
      }
    });

    // Live preview shadow when shadow inputs change
    ['shadow-color','shadow-blur','shadow-offset'].forEach(id =>
      document.getElementById(id).addEventListener('input', updatePreviewShadow)
    );

    // Live preview gradient when gradient inputs change
    ['grad-from','grad-to'].forEach(id =>
      document.getElementById(id).addEventListener('input', updatePreviewGradient)
    );

    // Keyboard shortcuts
    document.addEventListener('keydown', e => {
      const mod = e.metaKey || e.ctrlKey;
      if (mod && e.key === 'Enter')                          { e.preventDefault(); generate(); }
      if (mod && e.shiftKey && e.key.toLowerCase() === 'c') { e.preventDefault(); copyPng(); }
      if (mod && e.shiftKey && e.key.toLowerCase() === 's') { e.preventDefault(); savePng(); }
      if (mod && e.shiftKey && e.key.toLowerCase() === 'l') { e.preventDefault(); copyLink(); }
      const notTyping = document.activeElement.tagName !== 'INPUT' && document.activeElement.tagName !== 'TEXTAREA';
      if (!mod && !e.shiftKey && e.key.toLowerCase() === 'r' && notTyping) { randomFont(); }
      if (!mod && !e.shiftKey && e.key.toLowerCase() === 'f' && notTyping) { toggleFocus(); }
      if (!mod && !e.shiftKey && e.key.toLowerCase() === 'p' && notTyping) { toggleAnimation(); }
      if (!mod && !e.shiftKey && e.key.toLowerCase() === 'h' && notTyping) { openHelp(); }
      if (!mod && !e.shiftKey && e.key.toLowerCase() === 'a' && notTyping) { openAllFonts(); }
      if (!mod && !e.shiftKey && e.key.toLowerCase() === 'b' && notTyping) { toggleBmMenu(); }
      if (mod && e.key === 'ArrowLeft')                      { e.preventDefault(); navigateHistory(-1); }
      if (mod && e.key === 'ArrowRight')                     { e.preventDefault(); navigateHistory(1); }
      if (e.key === 'Escape')                                { closeDropdown(); closeExportMenu(); closeBmMenu(); closeToolsMenu(); closeAllFonts(); closeHelp(); exitFocus(); }
    });

    document.getElementById('font-select').addEventListener('change', () => { if (!restoringHistory) generate(); });

    document.getElementById('output-wrapper').addEventListener('dblclick', () => {
      if (currentArt) navigator.clipboard.writeText(currentArt).then(() => flash('COPIED TEXT!'));
    });

    // ── All Fonts ─────────────────────────────────────────────────────────
    async function openAllFonts() {
      const overlay = document.getElementById('all-fonts-overlay');
      const grid    = document.getElementById('all-fonts-grid');
      const currentFont = document.getElementById('font-select').value;
      const raw = (document.getElementById('text-input').value.split('\n')[0] || 'Hello').slice(0, 12).trim() || 'Hello';

      overlay.classList.add('open');
      document.body.style.overflow = 'hidden';
      grid.innerHTML = FONT_LIST.map(f => `
        <div class="af-card${f === currentFont ? ' af-current' : ''}" id="af-${CSS.escape(f)}" onclick="selectFont('${f.replace(/'/g,'\\\'')}')" title="Select ${f}">
          <div class="af-card-label">${f}</div>
          <pre class="af-card-art"><span class="af-loading">rendering...</span></pre>
        </div>
      `).join('');

      // Render fonts lazily via IntersectionObserver
      const obs = new IntersectionObserver(async (entries) => {
        for (const entry of entries) {
          if (!entry.isIntersecting) continue;
          obs.unobserve(entry.target);
          const fontName = entry.target.querySelector('.af-card-label').textContent;
          const pre = entry.target.querySelector('.af-card-art');
          try {
            const art = await figletAsync(raw, fontName, 'default');
            pre.textContent = art;
          } catch(e) {
            pre.textContent = '(error)';
          }
        }
      }, { rootMargin: '200px' });

      grid.querySelectorAll('.af-card').forEach(card => obs.observe(card));
    }

    function closeAllFonts() {
      document.getElementById('all-fonts-overlay').classList.remove('open');
      document.body.style.overflow = '';
    }

    function openHelp() {
      document.getElementById('help-overlay').style.display = 'block';
      document.body.style.overflow = 'hidden';
    }

    function closeHelp() {
      document.getElementById('help-overlay').style.display = 'none';
      document.body.style.overflow = '';
    }

    // ── Bookmarks ────────────────────────────────────────────────────────
    let bookmarks = [];

    function loadBookmarks() {
      try {
        const stored = localStorage.getItem('ascii-bookmarks');
        if (stored) bookmarks = JSON.parse(stored);
      } catch(e) {}
      renderBookmarkList();
    }

    function persistBookmarks() {
      localStorage.setItem('ascii-bookmarks', JSON.stringify(bookmarks));
    }

    function saveBookmark() {
      const input = document.getElementById('bm-name-input');
      const name = input.value.trim() || ('Bookmark ' + (bookmarks.length + 1));
      const bm = {
        id: Date.now(),
        name,
        text: document.getElementById('text-input').value,
        font: document.getElementById('font-select').value,
        layout: currentLayout,
        align: currentAlign,
        fontSize: parseInt(document.getElementById('font-size-slider').value, 10),
        previewBg: document.getElementById('preview-bg').value,
        previewText: document.getElementById('preview-text').value,
        pngBg: document.getElementById('png-bg').value,
        pngText: document.getElementById('png-text').value,
        transparent: document.getElementById('png-transparent').checked,
        blockGap,
        borderStyle,
      };
      bookmarks.unshift(bm);
      if (bookmarks.length > 20) bookmarks.pop();
      persistBookmarks();
      input.value = '';
      renderBookmarkList();
      flash('SAVED!');
    }

    function deleteBookmark(id) {
      bookmarks = bookmarks.filter(b => b.id !== id);
      persistBookmarks();
      renderBookmarkList();
    }

    function restoreBookmark(id) {
      const bm = bookmarks.find(b => b.id === id);
      if (!bm) return;
      closeBmMenu();
      restoringHistory = true;
      document.getElementById('text-input').value = bm.text;
      selectFont(bm.font);
      setLayout(bm.layout);
      setAlign(bm.align);
      const fsSlider = document.getElementById('font-size-slider');
      fsSlider.value = bm.fontSize;
      updateFontSize(bm.fontSize);
      document.getElementById('preview-bg').value = bm.previewBg;
      document.getElementById('output-wrapper').style.background = bm.previewBg;
      document.getElementById('preview-text').value = bm.previewText;
      document.getElementById('ascii-output').style.color = bm.previewText;
      document.getElementById('png-bg').value = bm.pngBg;
      document.getElementById('png-text').value = bm.pngText;
      if (bm.transparent !== undefined) {
        document.getElementById('png-transparent').checked = bm.transparent;
        toggleTransparent(bm.transparent);
      }
      if (bm.blockGap !== undefined) {
        blockGap = bm.blockGap;
        const bgSlider = document.getElementById('block-gap-slider');
        bgSlider.value = bm.blockGap;
        document.getElementById('block-gap-display').textContent = bm.blockGap;
      }
      if (bm.borderStyle !== undefined) setBorder(bm.borderStyle);
      restoringHistory = false;
      generate();
    }

    function renderBookmarkList() {
      const list = document.getElementById('bm-list');
      if (bookmarks.length === 0) {
        list.innerHTML = '<div class="bm-empty">no bookmarks yet</div>';
        return;
      }
      list.innerHTML = bookmarks.map(bm => `
        <div class="bm-item">
          <button class="bm-item-name" onclick="restoreBookmark(${bm.id})" title="${bm.name.replace(/"/g,'&quot;')}">${bm.name}</button>
          <button class="bm-del-btn" onclick="deleteBookmark(${bm.id})" title="Delete">✕</button>
        </div>
      `).join('');
    }

    function toggleBmMenu() {
      const menu = document.getElementById('bm-menu');
      menu.classList.toggle('open');
      if (menu.classList.contains('open')) {
        setTimeout(() => document.getElementById('bm-name-input').focus(), 30);
      }
    }

    function closeBmMenu() {
      document.getElementById('bm-menu').classList.remove('open');
    }

    function exportBookmarks() {
      if (!bookmarks.length) { flash('NO BOOKMARKS'); return; }
      const blob = new Blob([JSON.stringify(bookmarks, null, 2)], { type: 'application/json' });
      const link = document.createElement('a');
      link.download = 'ascii-bookmarks.json';
      link.href = URL.createObjectURL(blob);
      link.click();
      URL.revokeObjectURL(link.href);
      flash('EXPORTED!');
    }

    function importBookmarks(input) {
      const file = input.files[0];
      if (!file) return;
      const reader = new FileReader();
      reader.onload = e => {
        try {
          const imported = JSON.parse(e.target.result);
          if (!Array.isArray(imported)) throw new Error();
          const existingIds = new Set(bookmarks.map(b => b.id));
          const newOnes = imported.filter(b => b.id && b.name && !existingIds.has(b.id));
          bookmarks = [...newOnes, ...bookmarks].slice(0, 20);
          persistBookmarks();
          renderBookmarkList();
          flash(`IMPORTED ${newOnes.length}!`);
        } catch(err) {
          flash('IMPORT FAILED');
        }
        input.value = '';
      };
      reader.readAsText(file);
    }

    // Read URL hash on load and pre-populate inputs
    // ── Preferences persistence ───────────────────────────────────────────
    function savePrefs() {
      const prefs = {
        fontSize:   document.getElementById('font-size-slider').value,
        zoom:       document.getElementById('zoom-slider').value,
        blockGap:   document.getElementById('block-gap-slider').value,
        pngPad:     document.getElementById('png-padding-slider').value,
        pngScale:   pngScale,
        align:      currentAlign,
        layout:     currentLayout,
        border:     borderStyle,
        gradDir,
        previewBg:  document.getElementById('preview-bg').value,
        previewText:document.getElementById('preview-text').value,
        pngBg:      document.getElementById('png-bg').value,
        pngText:    document.getElementById('png-text').value,
        transparent:document.getElementById('png-transparent').checked,
        gradient:   document.getElementById('png-gradient').checked,
        gradFrom:   document.getElementById('grad-from').value,
        gradTo:     document.getElementById('grad-to').value,
        shadow:     document.getElementById('png-shadow').checked,
        shadowColor:document.getElementById('shadow-color').value,
        shadowBlur: document.getElementById('shadow-blur').value,
        shadowOffset:document.getElementById('shadow-offset').value,
        light:      document.body.classList.contains('light'),
        font:       document.getElementById('font-select').value,
        flip:       flipMode,
        echo:       echoMode,
        lineHeight: document.getElementById('line-height-slider').value,
        letterSpacing,
        wrapWidth,
        fillChar,
      };
      localStorage.setItem('ascii-prefs', JSON.stringify(prefs));
    }

    function loadPrefs() {
      try {
        const stored = localStorage.getItem('ascii-prefs');
        if (!stored) return;
        const p = JSON.parse(stored);

        if (p.fontSize)    { document.getElementById('font-size-slider').value = p.fontSize; updateFontSize(p.fontSize); }
        if (p.zoom)        { document.getElementById('zoom-slider').value = p.zoom; updateZoom(p.zoom); }
        if (p.blockGap != null) { blockGap = +p.blockGap; document.getElementById('block-gap-slider').value = p.blockGap; document.getElementById('block-gap-display').textContent = p.blockGap; }
        if (p.pngPad)      { document.getElementById('png-padding-slider').value = p.pngPad; document.getElementById('png-padding-display').textContent = p.pngPad + 'px'; }
        if (p.pngScale)    setScale(+p.pngScale);
        if (p.align)       setAlign(p.align);
        if (p.layout)      setLayout(p.layout);
        if (p.border)      setBorder(p.border);
        if (p.gradDir)     { gradDir = p.gradDir; setGradDir(p.gradDir); }
        if (p.previewBg)   { document.getElementById('preview-bg').value = p.previewBg; document.getElementById('output-wrapper').style.background = p.previewBg; }
        if (p.previewText) { document.getElementById('preview-text').value = p.previewText; document.getElementById('ascii-output').style.color = p.previewText; }
        if (p.pngBg)       document.getElementById('png-bg').value = p.pngBg;
        if (p.pngText)     document.getElementById('png-text').value = p.pngText;
        if (p.transparent) { document.getElementById('png-transparent').checked = p.transparent; toggleTransparent(p.transparent); }
        if (p.gradient)    { document.getElementById('png-gradient').checked = p.gradient; toggleGradient(p.gradient); }
        if (p.gradFrom)    document.getElementById('grad-from').value = p.gradFrom;
        if (p.gradTo)      document.getElementById('grad-to').value = p.gradTo;
        if (p.shadow)      { document.getElementById('png-shadow').checked = p.shadow; toggleShadow(p.shadow); }
        if (p.shadowColor) document.getElementById('shadow-color').value = p.shadowColor;
        if (p.shadowBlur)  { document.getElementById('shadow-blur').value = p.shadowBlur; document.getElementById('shadow-blur-display').textContent = p.shadowBlur + 'px'; }
        if (p.shadowOffset){ document.getElementById('shadow-offset').value = p.shadowOffset; document.getElementById('shadow-offset-display').textContent = p.shadowOffset + 'px'; }
        if (p.light != null){ if (p.light) { document.body.classList.add('light'); document.getElementById('theme-toggle').textContent = 'DARK'; } }
        if (p.font && FONT_LIST.includes(p.font)) { document.getElementById('font-select').value = p.font; document.getElementById('select-btn').textContent = p.font; document.querySelectorAll('.dropdown-item').forEach(el => el.classList.toggle('selected', el.dataset.font === p.font)); }
        if (p.flip != null) setFlipMode(p.flip);
        if (p.echo != null) setEchoMode(p.echo);
        if (p.lineHeight) { document.getElementById('line-height-slider').value = p.lineHeight; updateLineHeight(p.lineHeight); }
        if (p.letterSpacing != null) { setLetterSpacing(p.letterSpacing); }
        if (p.wrapWidth != null) { document.getElementById('wrap-width-slider').value = p.wrapWidth; updateWrapWidth(p.wrapWidth); }
        if (p.fillChar != null) { fillChar = p.fillChar; document.getElementById('fill-char-input').value = p.fillChar; }
      } catch(e) {}
    }

    function resetPrefs() {
      if (!confirm('Reset all visual settings to defaults?\n(Bookmarks and recent fonts are kept.)')) return;
      localStorage.removeItem('ascii-prefs');
      location.reload();
    }

    // Auto-save prefs on relevant changes
    ['font-size-slider','zoom-slider','block-gap-slider','png-padding-slider','line-height-slider',
     'preview-bg','preview-text','png-bg','png-text','png-transparent',
     'png-gradient','grad-from','grad-to','png-shadow','shadow-color',
     'shadow-blur','shadow-offset'].forEach(id => {
      const el = document.getElementById(id);
      if (el) el.addEventListener('change', savePrefs);
    });
    document.getElementById('font-select').addEventListener('change', savePrefs);

    window.addEventListener('load', () => {
      loadBookmarks();
      loadRecentFonts();
      loadPrefs();
      // URL hash overrides font/text from prefs
      if (window.location.hash) {
        try {
          const params = new URLSearchParams(window.location.hash.slice(1));
          if (params.get('text')) document.getElementById('text-input').value = params.get('text');
          if (params.get('font')) {
            const f = params.get('font');
            if (FONT_LIST.includes(f)) { document.getElementById('font-select').value = f; document.getElementById('select-btn').textContent = f; }
          }
        } catch (e) {}
      }
      // System color scheme (only if no prefs saved)
      if (!localStorage.getItem('ascii-prefs')) {
        if (window.matchMedia && window.matchMedia('(prefers-color-scheme: light)').matches) {
          document.body.classList.add('light');
          document.getElementById('theme-toggle').textContent = 'DARK';
        }
      }
      updateInputStats();
      generate();
    });
