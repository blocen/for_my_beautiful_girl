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

  // Scale the monospace block to fit the viewport.
  function fit() {
    const pad = 32;
    const availW = window.innerWidth - pad;
    const availH = window.innerHeight - 120;
    // base font metrics measured from a probe
    const base = 10; // px font-size baseline
    const cw = base * 0.6;   // monospace char width approx
    const ch = base * 1.0;   // line height approx
    const scaleW = availW / (W * cw);
    const scaleH = availH / (H * ch);
    const fs = base * Math.min(scaleW, scaleH);
    screen.style.fontSize = fs + "px";
  }
  window.addEventListener("resize", fit);
  fit();
})();
