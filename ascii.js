(function () {
  const D = window.ASCII_DATA;
  const B64 = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/";
  const idx = {};
  for (let i = 0; i < B64.length; i++) idx[B64[i]] = i;

  const screen = document.getElementById("screen");
  const W = D.W, H = D.H;
  const palette = D.PAL.map((h) => "#" + h);

  // Decode a frame's color string ("p", 2 chars per cell) into an int array.
  function decodeCols(p) {
    const out = new Array(W * H);
    for (let i = 0, j = 0; i < p.length; i += 2, j++) {
      out[j] = idx[p[i]] * 64 + idx[p[i + 1]];
    }
    return out;
  }

  // Render one frame to HTML, run-length grouping consecutive same-color cells.
  function render(frame) {
    const chars = frame.c;
    const cols = decodeCols(frame.p);
    let html = "";
    for (let y = minY; y <= maxY; y++) {
      let runColor = -1, runText = "";
      for (let x = minX; x <= maxX; x++) {
        const k = y * W + x;
        let ch = chars[k];
        const c = cols[k];
        if (ch === " ") ch = " ";
        else if (ch === "<") ch = "&lt;";
        else if (ch === ">") ch = "&gt;";
        else if (ch === "&") ch = "&amp;";
        if (c !== runColor) {
          if (runText) html += span(runColor, runText);
          runColor = c;
          runText = ch;
        } else {
          runText += ch;
        }
      }
      if (runText) html += span(runColor, runText);
      html += "\n";
    }
    return html;
  }

  function span(c, text) {
    if (c === 0) return text; // background: inherit (no color span)
    return '<span style="color:' + palette[c] + '">' + text + "</span>";
  }

  // The rose sits in a wide canvas with empty side padding; find its content
  // bounding box so render() can crop to just the rose (no wasted margins).
  let minX = W, maxX = 0, minY = H, maxY = 0;
  for (const f of D.FRAMES) {
    const c = f.c;
    for (let y = 0; y < H; y++) {
      for (let x = 0; x < W; x++) {
        if (c[y * W + x] !== " ") {
          if (x < minX) minX = x;
          if (x > maxX) maxX = x;
          if (y < minY) minY = y;
          if (y > maxY) maxY = y;
        }
      }
    }
  }
  // Pre-render all frames once, then swap innerHTML on a timer.
  const rendered = D.FRAMES.map(render);
  let i = 0;
  const interval = 1000 / D.FPS;
  let last = 0;

  // Fade the title in as the rose blooms and out before the loop restarts, so
  // it cycles together with the animation instead of fading in just once.
  const title = document.querySelector("h1");
  function titleOpacity(p) {
    if (p < 0.35) return 0;
    if (p < 0.6) return (p - 0.35) / 0.25; // fade in
    if (p < 0.9) return 1;                  // hold
    return 1 - (p - 0.9) / 0.1;             // fade out before restart
  }

  function loop(t) {
    if (t - last >= interval) {
      screen.innerHTML = rendered[i];
      title.style.opacity = titleOpacity(i / (rendered.length - 1));
      i = (i + 1) % rendered.length;
      last = t;
    }
    requestAnimationFrame(loop);
  }
  requestAnimationFrame(loop);

  const REF = 100;

  // The rose was authored for a cell ~0.6 as wide as it is tall (SF Mono).
  // Other platforms fall back to monospace fonts with a different advance
  // width, which distorts the aspect. Measure the device's real char width and
  // correct it with letter-spacing (in em, so it holds at any font size).
  const TARGET_RATIO = 0.6;
  (function normalizeCellAspect() {
    const probe = document.createElement("pre");
    probe.style.cssText = "position:absolute;visibility:hidden;margin:0;white-space:pre;letter-spacing:0;line-height:1;";
    probe.style.fontFamily = getComputedStyle(screen).fontFamily;
    probe.style.fontSize = REF + "px";
    probe.textContent = "M".repeat(200);
    document.body.appendChild(probe);
    const ratio = probe.getBoundingClientRect().width / (200 * REF);
    document.body.removeChild(probe);
    screen.style.letterSpacing = (TARGET_RATIO - ratio) + "em";
  })();

  // The <pre> holds only the cropped rose. Rather than guessing the device's
  // font metrics (which differ across platforms), render at a reference size,
  // measure the real box, then scale the font so the whole rose fits.
  function fit() {
    if (!screen.firstChild) screen.innerHTML = rendered[0];
    const titleH = document.querySelector("h1").offsetHeight || 0;
    const pad = 16;
    const availW = window.innerWidth - pad * 2;
    const availH = window.innerHeight - titleH - pad * 4;
    screen.style.fontSize = REF + "px";
    const box = screen.getBoundingClientRect();
    // 0.98 leaves a little headroom for the glow (text-shadow).
    const fs = REF * Math.min(availW / box.width, availH / box.height) * 0.98;
    screen.style.fontSize = fs + "px";
    screen.style.textShadow = "0 0 " + Math.max(1, fs * 0.3) + "px currentColor";
  }
  window.addEventListener("resize", fit);
  fit();
})();
