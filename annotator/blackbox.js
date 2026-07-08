(function(){if(window.__blackBoxOverlay){window.__blackBoxOverlay.toggle();return;}
const state={active:false,drawing:false,startX:0,startY:0,rects:[]};
const toolbar=document.createElement('div');toolbar.id='__bbo-toolbar';
toolbar.innerHTML='<span style="font-size:12px;font-weight:600;letter-spacing:.05em;color:#ccc;user-select:none">■ BLACK BOX</span><button id="__bbo-draw" style="background:#222;color:#fff;border:1px solid #555;border-radius:4px;padding:3px 10px;cursor:pointer;font-size:12px">Draw</button><button id="__bbo-undo" style="background:#222;color:#fff;border:1px solid #555;border-radius:4px;padding:3px 10px;cursor:pointer;font-size:12px">Undo</button><button id="__bbo-clear" style="background:#222;color:#8aa;border:1px solid #555;border-radius:4px;padding:3px 10px;cursor:pointer;font-size:12px">Clear</button><button id="__bbo-close" style="background:#222;color:#f88;border:1px solid #555;border-radius:4px;padding:3px 10px;cursor:pointer;font-size:12px">✕</button>';
Object.assign(toolbar.style,{position:'fixed',bottom:'16px',right:'16px',zIndex:'2147483647',display:'flex',alignItems:'center',gap:'6px',background:'#111',border:'1px solid #444',borderRadius:'8px',padding:'6px 10px',boxShadow:'0 4px 20px rgba(0,0,0,0.6)',fontFamily:'system-ui,sans-serif'});
document.body.appendChild(toolbar);
const ghost=document.createElement('div');
Object.assign(ghost.style,{position:'fixed',background:'rgba(0,0,0,0.4)',border:'2px dashed #f00',zIndex:'2147483646',pointerEvents:'none',display:'none',boxSizing:'border-box'});
document.body.appendChild(ghost);
function createBox(x,y,w,h){
 const box=document.createElement('div');
 Object.assign(box.style,{position:'fixed',left:x+'px',top:y+'px',width:w+'px',height:h+'px',background:'#000',zIndex:'2147483645',boxSizing:'border-box',cursor:'move'});
 box.addEventListener('contextmenu',e=>{e.preventDefault();const i=state.rects.indexOf(box);if(i>-1)state.rects.splice(i,1);box.remove();});
 let drag=null;
 box.addEventListener('mousedown',e=>{if(state.active)return;e.stopPropagation();drag={ox:e.clientX-parseInt(box.style.left),oy:e.clientY-parseInt(box.style.top)};
  const mv=ev=>{box.style.left=(ev.clientX-drag.ox)+'px';box.style.top=(ev.clientY-drag.oy)+'px';};
  const up=()=>{drag=null;document.removeEventListener('mousemove',mv);document.removeEventListener('mouseup',up);};
  document.addEventListener('mousemove',mv);document.addEventListener('mouseup',up);
 });
 document.body.appendChild(box);state.rects.push(box);
}
function setDraw(on){
 state.active=on;document.body.style.cursor=on?'crosshair':'';
 const btn=document.getElementById('__bbo-draw');
 btn.textContent=on?'Cancel':'Draw';btn.style.color=on?'#f88':'#fff';
}
document.getElementById('__bbo-draw').addEventListener('click',()=>setDraw(!state.active));
document.getElementById('__bbo-undo').addEventListener('click',()=>{const l=state.rects.pop();if(l)l.remove();});
document.getElementById('__bbo-clear').addEventListener('click',()=>{state.rects.forEach(r=>r.remove());state.rects.length=0;});
document.getElementById('__bbo-close').addEventListener('click',()=>{setDraw(false);state.rects.forEach(r=>r.remove());state.rects.length=0;ghost.remove();toolbar.remove();document.body.style.cursor='';delete window.__blackBoxOverlay;});
document.addEventListener('mousedown',e=>{if(!state.active||e.target.closest('#__bbo-toolbar'))return;state.drawing=true;state.startX=e.clientX;state.startY=e.clientY;Object.assign(ghost.style,{left:e.clientX+'px',top:e.clientY+'px',width:'0px',height:'0px',display:'block'});e.preventDefault();},true);
document.addEventListener('mousemove',e=>{if(!state.drawing)return;const x=Math.min(e.clientX,state.startX),y=Math.min(e.clientY,state.startY),w=Math.abs(e.clientX-state.startX),h=Math.abs(e.clientY-state.startY);Object.assign(ghost.style,{left:x+'px',top:y+'px',width:w+'px',height:h+'px'});},true);
document.addEventListener('mouseup',e=>{if(!state.drawing)return;state.drawing=false;ghost.style.display='none';const x=Math.min(e.clientX,state.startX),y=Math.min(e.clientY,state.startY),w=Math.abs(e.clientX-state.startX),h=Math.abs(e.clientY-state.startY);if(w>5&&h>5)createBox(x,y,w,h);setDraw(false);},true);
document.addEventListener('keydown',e=>{if(e.key==='d'&&!e.ctrlKey&&!e.metaKey)setDraw(!state.active);if(e.key==='z'&&!e.ctrlKey){const l=state.rects.pop();if(l)l.remove();}if(e.key==='Escape')setDraw(false);});
window.__blackBoxOverlay={toggle:()=>setDraw(!state.active)};
})();
