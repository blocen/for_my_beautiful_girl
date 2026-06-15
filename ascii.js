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
    for (let y = 0; y < H; y++) {
      let runColor = -1, runText = "";
      for (let x = 0; x < W; x++) {
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

  // The rose is centered in a wide canvas with empty side padding; find the
  // content bounding box once so we can scale/center to it rather than to W.
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
  const contentW = maxX - minX + 1;
  const contentH = maxY - minY + 1;
  const centerX = (minX + maxX) / 2;
  const centerY = (minY + maxY) / 2;

  // Pre-render all frames once, then swap innerHTML on a timer.
  const rendered = D.FRAMES.map(render);
  let i = 0;
  const interval = 1000 / D.FPS;
  let last = 0;

  function loop(t) {
    if (t - last >= interval) {
      screen.innerHTML = rendered[i];
      i = (i + 1) % rendered.length;
      last = t;
    }
    requestAnimationFrame(loop);
  }
  requestAnimationFrame(loop);

  // Measure the actual monospace metrics (char advance width and line height,
  // as ratios of font-size) so fitting is exact rather than a guess.
  function measureMetrics() {
    const probe = document.createElement("pre");
    probe.style.cssText = "position:absolute;visibility:hidden;margin:0;white-space:pre;";
    probe.style.fontFamily = getComputedStyle(screen).fontFamily;
    probe.style.lineHeight = getComputedStyle(screen).lineHeight;
    probe.style.fontSize = "100px";
    probe.textContent = "M".repeat(100);
    document.body.appendChild(probe);
    const r = probe.getBoundingClientRect();
    document.body.removeChild(probe);
    return { cw: r.width / 100 / 100, ch: r.height / 100 };
  }
  const { cw: CW, ch: CH } = measureMetrics();

  // Scale the rose content to fit the viewport and center it. The full canvas
  // overflows on the (empty) sides and is clipped by body's overflow:hidden.
  function fit() {
    const titleH = document.querySelector("h1").offsetHeight || 0;
    const pad = 16;
    // Leave headroom for the glow (text-shadow) so it isn't clipped either.
    const availW = (window.innerWidth - pad * 2) * 0.96;
    const availH = window.innerHeight - titleH - pad * 4;
    const fs = Math.min(availW / (contentW * CW), availH / (contentH * CH));
    screen.style.fontSize = fs + "px";
    // Shift the content's center to the block's center (and thus the viewport).
    const dx = (W / 2 - centerX) * CW * fs;
    const dy = (H / 2 - centerY) * CH * fs;
    screen.style.transform = "translate(" + dx + "px," + dy + "px)";
    screen.style.textShadow = "0 0 " + Math.max(1, fs * 0.3) + "px currentColor";
  }
  window.addEventListener("resize", fit);
  fit();
})();
