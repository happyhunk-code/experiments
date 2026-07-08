(function(){
// ── Teaching Annotator Bookmarklet ──────────────────────────
// Inject annotation overlay onto any page.
// Tools: mouse, text, laser, highlighter, eraser, box, pan
// Zoom: Ctrl+Scroll zooms the entire page toward cursor
// Pan: middle-mouse or pan tool drag
// Colors: 1-6 select swatch by position (top=1, bottom=6)
// Capture: Camera button saves viewport as PNG
// Persistence: localStorage keyed by page URL

if (window.__teachingAnnotatorLoaded) return;
window.__teachingAnnotatorLoaded = true;

const STYLES = `
  #ta-overlay {
    all: initial; font-family: system-ui, sans-serif;
    position: fixed; top: 0; left: 0; width: 100vw; height: 100vh;
    z-index: 2147483647; pointer-events: none; overflow: hidden;
  }
  #ta-overlay * { all: unset; display: revert; box-sizing: border-box; }
  #ta-canvas {
    position: fixed; top: 0; left: 0; width: 100vw; height: 100vh;
    z-index: 2147483646; pointer-events: none; touch-action: none;
  }
  #ta-canvas.active { pointer-events: auto; }

  #ta-sidebar {
    position: fixed; left: 8px; top: 50%; transform: translateY(-50%);
    z-index: 2147483648;
    display: flex; flex-direction: column; align-items: center; gap: 3px;
    padding: 8px 5px;
    background: rgba(15,15,19,0.88); border: 1px solid #2a2a38;
    border-radius: 10px; backdrop-filter: blur(8px); pointer-events: auto;
  }
  #ta-sidebar .tabtn {
    width: 32px; height: 32px; border: none; border-radius: 6px;
    background: transparent; color: #888; cursor: pointer;
    font-size: 14px; display: flex; align-items: center; justify-content: center;
    transition: background 0.1s, color 0.1s; padding: 0;
  }
  #ta-sidebar .tabtn:hover { background: #22223a; color: #ccc; }
  #ta-sidebar .tabtn.active { background: #2a3a5a; color: #6cdb9e; }
  #ta-sidebar .tabtn.active[data-t="mouse"] { background: #2a2a3a; color: #aaaadd; }
  #ta-sidebar .tabtn.active[data-t="pan"] { background: #2a2a3a; color: #aaaadd; }
  #ta-sidebar .tabtn.active[data-t="highlighter"] { background: #2a2a1a; color: #ffd93d; }
  #ta-sidebar .tabtn.active[data-t="eraser"] { background: #1a1a2a; color: #888; }
  #ta-sidebar .tabtn.active[data-t="laser"] { background: #2a1a2a; color: #ff6b6b; }
  #ta-sidebar .tabtn.active[data-t="box"] { background: #1a2a2a; color: #4ea8de; }
  #ta-sidebar .tabtn.active[data-t="text"] { background: #2a1a1a; color: #ff9f43; }
  #ta-sidebar .tabtn.active[data-t="blackbox"] { background: #111; color: #fff; }
  #ta-sidebar .tasep { width: 26px; height: 1px; background: #2a2a38; margin: 3px 0; }
  #ta-sidebar .tacolor {
    width: 16px; height: 16px; border-radius: 50%;
    border: 2px solid transparent; cursor: pointer; margin: 1px 0;
    transition: border-color 0.1s, transform 0.1s; padding: 0;
  }
  #ta-sidebar .tacolor:hover { transform: scale(1.15); }
  #ta-sidebar .tacolor.active { border-color: #6cdb9e; }

  #ta-bottom {
    position: fixed; bottom: 10px; left: 50%; transform: translateX(-50%);
    z-index: 2147483648;
    display: flex; align-items: center; gap: 8px;
    background: rgba(15,15,19,0.88); border: 1px solid #2a2a38;
    border-radius: 10px; padding: 6px 14px;
    backdrop-filter: blur(8px); font-size: 12px; color: #aaa; pointer-events: auto;
  }
  #ta-bottom label { font-size: 11px; color: #888; white-space: nowrap; }
  #ta-bottom input[type=range] { width: 60px; accent-color: #6cdb9e; cursor: grab; height: 4px; margin: 0; }
  #ta-bottom .taval { min-width: 22px; text-align: center; color: #fff; font-weight: 600; font-size: 11px; }
  #ta-bottom .tabtn2 {
    background: none; border: 1px solid #2a2a38; border-radius: 5px;
    color: #aaa; cursor: pointer; padding: 2px 6px; font-size: 12px;
    transition: background 0.1s; line-height: 1; font-family: system-ui;
  }
  #ta-bottom .tabtn2:hover { background: #22223a; color: #fff; }
  #ta-zoomd { min-width: 40px; text-align: center; color: #888; font-size: 11px; }

  /* Text input overlay */
  #ta-text-input {
    position: fixed; z-index: 2147483649; pointer-events: auto;
    background: transparent; border: 2px dashed rgba(255,255,255,0.4);
    color: #fff; font-family: system-ui, sans-serif;
    outline: none; resize: none; overflow: hidden;
    padding: 4px 6px; min-width: 30px; min-height: 24px;
    line-height: 1.2;
  }
  #ta-text-input::placeholder { color: rgba(255,255,255,0.3); }
`;

function inject() {
  const style = document.createElement('style');
  style.textContent = STYLES;
  document.head.appendChild(style);

  const S = {
    tool: 'laser', color: '#ff6b6b', thickness: 3,
    zoom: 1, panX: 0, panY: 0, ox: 0, oy: 0,
    drawing: false, visible: true,
  };
  let strokes = [], cur = null, lastClick = 0, laserPt = null;

  function el(tag, attrs, ...kids) {
    const e = document.createElement(tag);
    for (const [k,v] of Object.entries(attrs||{})) e.setAttribute(k,v);
    for (const k of kids) e.appendChild(typeof k === 'string' ? document.createTextNode(k) : k);
    return e;
  }

  const colors = ['#ff6b6b','#ffd93d','#6cdb9e','#4ea8de','#ffffff','#ff9f43'];
  const tools = [
    ['laser','🔴','Laser (L)'],
    ['mouse','🖱️','Mouse (M)'],
    ['pan','✋','Pan (G)'],
    ['text','Aa','Text (T)'],
    ['blackbox','⬛','Blackout (K)'],
    ['highlighter','🖍️','Highlighter (H)'],
    ['eraser','🧹','Eraser (E)'],
    ['box','⬜','Box (B)'],
  ];

  const cv = el('canvas', {id:'ta-canvas'});
  const sidebar = el('div', {id:'ta-sidebar'});

  for (const [id, icon, title] of tools) {
    const b = el('button', {class:'tabtn', 'data-t':id, title}, icon);
    b.addEventListener('click', () => setTool(id));
    sidebar.appendChild(b);
  }
  sidebar.appendChild(el('div', {class:'tasep'}));
  for (let i=0;i<colors.length;i++) {
    const sw = el('div', {class:'tacolor', style:`background:${colors[i]}`, 'data-c':colors[i], 'data-idx':i});
    sw.addEventListener('click', () => {
      sidebar.querySelectorAll('.tacolor').forEach(s=>s.classList.remove('active'));
      sw.classList.add('active'); S.color = colors[i];
    });
    sidebar.appendChild(sw);
  }
  sidebar.querySelector('.tacolor').classList.add('active');

  const bottom = el('div', {id:'ta-bottom'},
    el('label', {}, 'Size'),
    (()=>{
      const sl = document.createElement('input'); sl.type='range'; sl.id='tathick';
      sl.min=1; sl.max=16; sl.value=3; sl.step=0.5;
      sl.addEventListener('input', ()=>{ S.thickness=parseFloat(sl.value); document.getElementById('tathickv').textContent=S.thickness; });
      return sl;
    })(),
    el('span', {class:'taval', id:'tathickv'}, '3'),
    el('span', {style:'color:#333'}, '|'),
    el('button', {class:'tabtn2', id:'tahide'}, '👁️'),
    el('button', {class:'tabtn2', id:'taundo'}, '↩️'),
    el('button', {class:'tabtn2', id:'taclear'}, '🗑️'),
    el('button', {class:'tabtn2', id:'tacapture'}, '📷'),
  );

  document.body.appendChild(sidebar);
  document.body.appendChild(bottom);
  document.body.appendChild(cv);

  const ctx = cv.getContext('2d');

  function resize() {
    cv.width = window.innerWidth; cv.height = window.innerHeight;
    cv.style.width = window.innerWidth+'px'; cv.style.height = window.innerHeight+'px';
    render();
  }

  function c2c(cx, cy) {
    const sx = window.scrollX||window.pageXOffset;
    const sy = window.scrollY||window.pageYOffset;
    return { x: (cx + sx) / S.zoom - S.panX, y: (cy + sy) / S.zoom - S.panY };
  }

  function render() {
    ctx.clearRect(0,0,cv.width,cv.height);
    if (!S.visible) return;
    ctx.save();
    const sx = window.scrollX||window.pageXOffset;
    const sy = window.scrollY||window.pageYOffset;
    ctx.translate(-sx, -sy);
    ctx.scale(S.zoom, S.zoom);
    ctx.translate(S.panX, S.panY);
    for (const s of strokes) drawS(s);
    if (cur) drawS(cur);
    if (S.tool==='laser' && laserPt && !S.drawing) {
      const p=laserPt; const g=ctx.createRadialGradient(p.x,p.y,0,p.x,p.y,14);
      g.addColorStop(0,'rgba(255,50,50,0.85)'); g.addColorStop(0.3,'rgba(255,50,50,0.35)'); g.addColorStop(1,'rgba(255,50,50,0)');
      ctx.fillStyle=g; ctx.beginPath(); ctx.arc(p.x,p.y,14,0,Math.PI*2); ctx.fill();
    }
    ctx.restore();
  }

  function drawS(s) {
    if (s.tool==='box' && s.b) {
      ctx.save(); ctx.strokeStyle=s.color; ctx.lineWidth=s.thickness;
      ctx.setLineDash([5,4]); ctx.strokeRect(s.b.x,s.b.y,s.b.w,s.b.h); ctx.restore(); return;
    }
    if (s.tool==='text' && s.textData) {
      const td = s.textData;
      ctx.save();
      ctx.font = `${td.size}px system-ui, sans-serif`;
      ctx.fillStyle = td.color;
      ctx.globalAlpha = 0.9;
      const lines = td.text.split('\n');
      for (let i=0;i<lines.length;i++) {
        ctx.fillText(lines[i], td.x, td.y + i * td.size * 1.3);
      }
      ctx.restore(); return;
    }
    if (!s.p||s.p.length<2) return;
    ctx.save(); ctx.lineCap='round'; ctx.lineJoin='round';
    if (s.tool==='highlighter'){ctx.globalAlpha=0.35;ctx.strokeStyle=s.color;ctx.lineWidth=s.thickness*3.5;}
    else if(s.tool==='eraser'){ctx.globalCompositeOperation='destination-out';ctx.strokeStyle='rgba(0,0,0,1)';ctx.lineWidth=s.thickness*2.5;}
    else{ctx.strokeStyle=s.color;ctx.lineWidth=s.thickness;}
    ctx.beginPath();ctx.moveTo(s.p[0].x,s.p[0].y);
    for(let i=1;i<s.p.length;i++)ctx.lineTo(s.p[i].x,s.p[i].y);
    ctx.stroke();ctx.restore();
  }

  function setTool(t) {
    sidebar.querySelectorAll('.tabtn').forEach(b=>b.classList.toggle('active',b.dataset.t==t));
    S.tool=t;
    // Track last drawing tool (anything that draws on canvas, not mouse)
    if (t !== 'mouse') S._lastDrawingTool = t;
    const draw = ['laser','highlighter','eraser','box','text'].includes(t);
    cv.classList.toggle('active', draw || t==='pan');
    cv.style.cursor = t==='mouse'?'default':t==='pan'?'grab':t==='eraser'?'cell':t==='laser'?'none':t==='text'?'text':'crosshair';
    if (t==='mouse') document.body.style.cursor = 'auto';
    // Remove any active text input
    const ti = document.getElementById('ta-text-input');
    if (ti) { ti.remove(); }
    // Black box tool: inject the overlay
    if (t === 'blackbox') {
      loadBlackBox();
    } else {
      // Remove black box UI if it exists
      const bbo = window.__blackBoxOverlay;
      if (bbo && bbo._cleanup) bbo._cleanup();
    }
  }

  function gp(e) { const t=e.touches?e.touches[0]:e; return c2c(t.clientX,t.clientY); }

  // ── Text tool: click to place text ──
  let _textClick = null; // stores the last click coords for text placement
  function placeTextInput(x, y) {
    const old = document.getElementById('ta-text-input');
    if (old) { old.remove(); }

    const ti = document.createElement('div');
    ti.id = 'ta-text-input';
    ti.contentEditable = 'true';
    const sx = (x + S.panX) * S.zoom - (window.scrollX||0);
    const sy = (y + S.panY) * S.zoom - (window.scrollY||0);
    ti.style.left = Math.max(10, sx) + 'px';
    ti.style.top = Math.max(10, sy) + 'px';
    ti.style.fontSize = (S.thickness * 3 + 8) + 'px';
    ti.style.color = S.color;
    ti.dataset.textX = x;
    ti.dataset.textY = y;
    ti.placeholder = 'Type here...';
    document.body.appendChild(ti);
    ti.focus();

    const commit = () => {
      const text = ti.textContent.trim();
      if (text) {
        const cx = parseFloat(ti.dataset.textX);
        const cy = parseFloat(ti.dataset.textY);
        strokes.push({tool:'text',color:S.color,thickness:S.thickness,textData:{
          x: cx, y: cy, text: text, size: S.thickness * 3 + 8, color: S.color
        }});
        save(); render();
      }
      ti.remove();
    };
    ti.addEventListener('blur', commit);
    ti.addEventListener('keydown', (e) => {
      if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); commit(); }
      if (e.key === 'Escape') { ti.remove(); render(); }
    });
  }

  // ── Pointer events ──
  cv.addEventListener('mousedown', e => {
    if (S.tool==='mouse') return;
    if (S.tool==='pan') { S.drawing=true; S.ox=e.clientX; S.oy=e.clientY; cv.style.cursor='grabbing'; return; }
    if (S.tool==='text') { const p=gp(e); placeTextInput(p.x, p.y); return; }
    if (e.button!==0) return; e.preventDefault();
    const p=gp(e);
    if (S.tool==='box') cur={tool:'box',color:S.color,thickness:S.thickness,b:{x:p.x,y:p.y,w:0,h:0}};
    else cur={tool:S.tool,color:S.color,thickness:S.thickness,p:[p]};
    S.drawing=true;
  });
  cv.addEventListener('mousemove', e => {
    if (S.tool==='mouse'||S.tool==='text') return;
    const p=gp(e);
    if (S.tool==='pan' && S.drawing) { S.panX+=(e.clientX-S.ox)/S.zoom; S.panY+=(e.clientY-S.oy)/S.zoom; S.ox=e.clientX; S.oy=e.clientY; render(); return; }
    if (S.tool==='laser' && !S.drawing) { laserPt=p; render(); return; }
    if (!S.drawing||!cur) return;
    if (cur.tool==='box'&&cur.b){cur.b.w=p.x-cur.b.x;cur.b.h=p.y-cur.b.y;}
    else cur.p.push(p);
    render();
  });
  cv.addEventListener('mouseup', e => {
    if (S.tool==='pan') { S.drawing=false; cv.style.cursor='grab'; return; }
    if (!S.drawing||!cur) return; S.drawing=false;
    if (cur.tool==='box'&&cur.b&&Math.abs(cur.b.w)<4&&Math.abs(cur.b.h)<4){cur=null;render();return;}
    if (cur.p&&cur.p.length<3&&cur.tool!=='box'){cur=null;render();return;}
    strokes.push(cur); cur=null; save(); render();
  });
  cv.addEventListener('mouseleave', () => { laserPt=null; if (S.drawing) { S.drawing=false; cur=null; render(); } });

  // Touch
  cv.addEventListener('touchstart', e => {
    if (S.tool==='mouse'||S.tool==='text') return; e.preventDefault();
    const t=e.touches[0]; const p=c2c(t.clientX,t.clientY);
    cur={tool:S.tool,color:S.color,thickness:S.thickness,p:[p]}; S.drawing=true;
  }, {passive:false});
  cv.addEventListener('touchmove', e => {
    if (S.tool==='mouse'||S.tool==='text'||!S.drawing||!cur) { e.preventDefault(); return; }
    e.preventDefault(); const t=e.touches[0]; const p=c2c(t.clientX,t.clientY);
    cur.p.push(p); render();
  }, {passive:false});
  cv.addEventListener('touchend', e => {
    if (S.tool==='mouse'||S.tool==='text'||!S.drawing||!cur) return; S.drawing=false;
    if (cur.p&&cur.p.length<3){cur=null;render();return;}
    strokes.push(cur); cur=null; save(); render();
  }, {passive:false});

  // ── Zoom via zoom buttons only, Ctrl+Wheel changes brush size ──
  document.addEventListener('wheel', e => {
    if (!e.ctrlKey && !e.metaKey) return;
    e.preventDefault();
    const d = e.deltaY > 0 ? -1 : 1;
    S.thickness = Math.max(1, Math.min(20, S.thickness + d * 0.5));
    document.getElementById('tathick').value = S.thickness;
    document.getElementById('tathickv').textContent = S.thickness;
  }, {passive:false});

  let lastPinch=0;
  document.addEventListener('touchstart', e => {
    if (e.touches.length===2) lastPinch=Math.hypot(e.touches[0].clientX-e.touches[1].clientX, e.touches[0].clientY-e.touches[1].clientY);
  }, {passive:true});
  document.addEventListener('touchmove', e => {
    if (e.touches.length!==2) return; e.preventDefault();
    const d=Math.hypot(e.touches[0].clientX-e.touches[1].clientX, e.touches[0].clientY-e.touches[1].clientY);
    const oldZ=S.zoom; S.zoom=Math.max(0.25,Math.min(5,S.zoom+(d-lastPinch)*0.006)); lastPinch=d;
    S.panX+=(window.innerWidth/2-(e.touches[0].clientX+e.touches[1].clientX)/2)*(1/S.zoom-1/oldZ);
    S.panY+=(window.innerHeight/2-(e.touches[0].clientY+e.touches[1].clientY)/2)*(1/S.zoom-1/oldZ);
    document.body.style.transform=`scale(${S.zoom})`;
    document.body.style.width=`${100/S.zoom}%`; document.body.style.height=`${100/S.zoom}%`;
    document.getElementById('ta-zoomd').textContent=Math.round(S.zoom*100)+'%';
    render();
  }, {passive:false});

  // ── Keyboard ──
  document.addEventListener('keydown', e => {
    if (e.target.tagName==='INPUT'||e.target.tagName==='TEXTAREA'||e.target.isContentEditable) return;
    const k=e.key.toLowerCase();
    const m={'m':'mouse','g':'pan','t':'text','k':'blackbox','l':'laser','h':'highlighter','e':'eraser','b':'box'};
    if (m[k]) { e.preventDefault(); setTool(m[k]); }
    // 1-6 for colors (top=1 = index 0)
    const n = parseInt(e.key);
    if (n>=1 && n<=6) {
      e.preventDefault();
      const sws = sidebar.querySelectorAll('.tacolor');
      sws.forEach(s=>s.classList.remove('active'));
      sws[n-1].classList.add('active');
      S.color = colors[n-1];
    }
    if (e.key===' ') { e.preventDefault(); toggleVis(); }
    if ((e.ctrlKey||e.metaKey) && k==='z') { e.preventDefault(); undo(); }
    if (e.key==='Escape') { resetZoom(); }
  });

  // ── Buttons ──
  // (zoom reset removed — use Escape key instead)
  
  function toggleVis() {
    if (S.visible) {
      // Hiding: switch to mouse tool so user can interact with page
      S.visible=false;
      setTool('mouse');
      document.getElementById('tahide').style.color='#6cdb9e';
    } else {
      // Showing: restore last non-mouse tool
      S.visible=true;
      setTool(S._lastDrawingTool || 'laser');
      document.getElementById('tahide').style.color='#aaa';
    }
    render();
  }
  document.getElementById('tahide').addEventListener('click', toggleVis);
  document.getElementById('taundo').addEventListener('click', undo);
  document.getElementById('taclear').addEventListener('click', () => { strokes=[]; cur=null; save(); render(); });

  // ── Undo: Ctrl+Z or button ──
  function undo() {
    if (strokes.length === 0) return;
    strokes.pop();
    save(); render();
  }

  // ── Capture: use getDisplayMedia for true viewport screenshot ──
  document.getElementById('tacapture').addEventListener('click', async () => {
    sidebar.style.display='none';
    bottom.style.display='none';
    const wasVisible = S.visible;
    S.visible = true;
    render();

    try {
      // Use the Screen Capture API for a true viewport screenshot
      const stream = await navigator.mediaDevices.getDisplayMedia({ preferCurrentTab: true });
      const track = stream.getVideoTracks()[0];
      const imgCapture = new ImageCapture(track);
      const bitmap = await imgCapture.grabFrame();
      track.stop();

      // Composite annotations over the screenshot
      const tmpCanvas = document.createElement('canvas');
      tmpCanvas.width = bitmap.width;
      tmpCanvas.height = bitmap.height;
      const tCtx = tmpCanvas.getContext('2d');
      tCtx.drawImage(bitmap, 0, 0, tmpCanvas.width, tmpCanvas.height);
      // Scale annotations to match screen DPI
      const scaleX = bitmap.width / window.innerWidth;
      const scaleY = bitmap.height / window.innerHeight;
      tCtx.save();
      tCtx.scale(scaleX, scaleY);
      tCtx.drawImage(cv, 0, 0);
      tCtx.restore();

      const link = document.createElement('a');
      link.download = `annotator-${Date.now()}.png`;
      link.href = tmpCanvas.toDataURL('image/png');
      link.click();
    } catch(e) {
      // Fallback: annotations only on dark bg
      const tmpCanvas = document.createElement('canvas');
      tmpCanvas.width = window.innerWidth;
      tmpCanvas.height = window.innerHeight;
      const tCtx = tmpCanvas.getContext('2d');
      tCtx.fillStyle = '#0f0f13';
      tCtx.fillRect(0, 0, tmpCanvas.width, tmpCanvas.height);
      tCtx.drawImage(cv, 0, 0);
      const link = document.createElement('a');
      link.download = `annotator-${Date.now()}.png`;
      link.href = tmpCanvas.toDataURL('image/png');
      link.click();
    }

    S.visible = wasVisible;
    render();
    sidebar.style.display='';
    bottom.style.display='';
  });

  // ── Persistence ──
  function key() { return `ta:${window.location.href}`; }
  function save() { try { localStorage.setItem(key(), JSON.stringify(strokes.map(s=>({tool:s.tool,color:s.color,thickness:s.thickness,p:s.p,b:s.b,textData:s.textData})))); } catch{} }
  function load() { try{const r=localStorage.getItem(key());strokes=r?JSON.parse(r):[];}catch{strokes=[];}render(); }

  // ── Black box overlay (external script) ──
  function loadBlackBox() {
    // Inject the black box script once
    if (!window.__blackBoxScriptLoaded) {
      window.__blackBoxScriptLoaded = true;
      const s = document.createElement('script');
      s.src = '/experiments/annotator/blackbox.js?' + Date.now();
      s.onload = () => {
        // Add cleanup method
        if (window.__blackBoxOverlay) {
          window.__blackBoxOverlay._cleanup = () => {
            window.__blackBoxOverlay.toggle();
            // Force close if active
          };
        }
      };
      document.body.appendChild(s);
    } else if (window.__blackBoxOverlay) {
      // Toggle it on/off
      window.__blackBoxOverlay.toggle();
    }
  }

  // ── Black box sidebar style ──
  // Already added to tools array

  // ── Init ──
  function resetZoom() {
    S.zoom=1; S.panX=0; S.panY=0;
    document.body.style.transform=''; document.body.style.width=''; document.body.style.height='';
    document.documentElement.style.overflow='';
    render();
  }

  setTool('laser');
  resize();
  load();
  window.addEventListener('resize', resize);
}

if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', inject);
else inject();
})();
