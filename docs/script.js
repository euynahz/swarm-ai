// Hex canvas background
const canvas = document.getElementById('hexCanvas');
if (canvas) {
  const ctx = canvas.getContext('2d');
  let w, h, hexes = [];
  const resize = () => { w = canvas.width = canvas.offsetWidth; h = canvas.height = canvas.offsetHeight; init(); };
  
  function init() {
    hexes = [];
    const size = 60, gap = size * 1.8;
    for (let x = -size; x < w + size; x += gap * 0.866) {
      for (let y = -size; y < h + size; y += gap * 0.75) {
        const offset = (Math.floor(y / (gap * 0.75)) % 2) * gap * 0.433;
        hexes.push({ x: x + offset, y, size: size * (0.6 + Math.random() * 0.4), phase: Math.random() * Math.PI * 2, speed: 0.003 + Math.random() * 0.005 });
      }
    }
  }

  function drawHex(cx, cy, r) {
    ctx.beginPath();
    for (let i = 0; i < 6; i++) {
      const a = Math.PI / 3 * i - Math.PI / 6;
      ctx[i ? 'lineTo' : 'moveTo'](cx + r * Math.cos(a), cy + r * Math.sin(a));
    }
    ctx.closePath();
  }

  let t = 0;
  function draw() {
    ctx.clearRect(0, 0, w, h);
    t++;
    for (const hex of hexes) {
      const alpha = 0.06 + 0.06 * Math.sin(t * hex.speed + hex.phase);
      ctx.strokeStyle = `rgba(240,168,48,${alpha})`;
      ctx.lineWidth = 0.8;
      drawHex(hex.x, hex.y, hex.size);
      ctx.stroke();
    }
    // Connection lines between nearby hexes
    for (let i = 0; i < hexes.length; i++) {
      for (let j = i + 1; j < hexes.length; j++) {
        const dx = hexes[i].x - hexes[j].x, dy = hexes[i].y - hexes[j].y;
        const dist = Math.sqrt(dx * dx + dy * dy);
        if (dist < 120) {
          const alpha = 0.03 * (1 - dist / 120) * (0.5 + 0.5 * Math.sin(t * 0.004 + i));
          ctx.strokeStyle = `rgba(240,168,48,${alpha})`;
          ctx.lineWidth = 0.5;
          ctx.beginPath();
          ctx.moveTo(hexes[i].x, hexes[i].y);
          ctx.lineTo(hexes[j].x, hexes[j].y);
          ctx.stroke();
        }
      }
    }
    requestAnimationFrame(draw);
  }

  resize();
  window.addEventListener('resize', resize);
  draw();
}

// Scroll reveal
const observer = new IntersectionObserver((entries) => {
  entries.forEach(e => { if (e.isIntersecting) e.target.classList.add('visible'); });
}, { threshold: 0.1 });
document.querySelectorAll('.section').forEach(s => observer.observe(s));
