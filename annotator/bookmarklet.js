(function(){
if(window.__teachingAnnotatorLoaded)return;
window.__teachingAnnotatorLoaded=true;
const $=document.createElement.bind(document),q=(s,p=document)=>p.querySelector(s),qa=(s,p=document)=>p.querySelectorAll(s);
const STYLES=`
#ta-canvas{position:fixed;top:0;left:0;width:100vw;height:100vh;z-index:2147483646;pointer-events:none;touch-action:none}
#ta-canvas.active{pointer-events:auto}
#ta-sidebar{position:fixed;left:8px;top:50%;transform:translateY(-50%);z-index:2147483648;display:flex;flex-direction:column;align-items:center;gap:3px;padding:8px 5px;background:rgba(15,15,19,0.88);border:1px solid #2a2a38;border-radius:10px;backdrop-filter:blur(8px);pointer-events:auto}
#ta-sidebar .tabtn{width:32px;height:32px;border:none;border-radius:6px;background:transparent;color:#888;cursor:pointer;font-size:16px;display:flex;align-items:center;justify-content:center;transition:background .1s,color .1s;padding:0}
#ta-sidebar .tabtn:hover{background:#22223a;color:#ccc}
#ta-sidebar .tabtn.active{background:#2a3a5a;color:#6cdb9e}
#ta-sidebar .tabtn.active[data-t=select]{background:#2a2a3a;color:#aaaadd}
#ta-sidebar .tabtn.active[data-t=pan]{background:#2a2a3a;color:#aaaadd}
#ta-sidebar .tabtn.active[data-t=highlighter]{background:#2a2a1a;color:#ffd93d}
#ta-sidebar .tabtn.active[data-t=eraser]{background:#1a1a2a;color:#888}
#ta-sidebar .tabtn.active[data-t=pen]{background:#2a1a2a;color:#ff6b6b}
#ta-sidebar .tabtn.active[data-t=box]{background:#1a2a2a;color:#4ea8de}
#ta-sidebar .tabtn.active[data-t=text]{background:#2a1a1a;color:#ff9f43}
#ta-sidebar .tabtn.active[data-t=blackbox]{background:#111;color:#fff}
#ta-sidebar .tasep{width:26px;height:1px;background:#2a2a38;margin:3px 0}
#ta-sidebar .tacolor{width:16px;height:16px;border-radius:50%;border:2px solid transparent;cursor:pointer;margin:1px 0;transition:border-color .1s,transform .1s;padding:0}
#ta-sidebar .tacolor:hover{transform:scale(1.15)}
#ta-sidebar .tacolor.active{border-color:#6cdb9e}
#ta-bottom{position:fixed;bottom:10px;left:50%;transform:translateX(-50%);z-index:2147483648;display:flex;align-items:center;gap:8px;background:rgba(15,15,19,0.88);border:1px solid #2a2a38;border-radius:10px;padding:6px 14px;backdrop-filter:blur(8px);font-size:12px;color:#aaa;pointer-events:auto}
#ta-bottom label{font-size:11px;color:#888;white-space:nowrap}
#ta-bottom input[type=range]{width:60px;accent-color:#6cdb9e;cursor:grab;height:4px;margin:0}
#ta-bottom .taval{min-width:22px;text-align:center;color:#fff;font-weight:600;font-size:11px}
#ta-bottom .tabtn2{background:none;border:1px solid #2a2a38;border-radius:5px;color:#aaa;cursor:pointer;padding:2px 6px;font-size:12px;transition:background .1s;line-height:1;font-family:system-ui}
#ta-bottom .tabtn2:hover{background:#22223a;color:#fff}
#ta-text-input{position:fixed;z-index:2147483649;pointer-events:auto;background:transparent;border:2px dashed rgba(255,255,255,0.4);color:#fff;font-family:system-ui,sans-serif;outline:none;resize:none;overflow:hidden;padding:4px 6px;min-width:30px;min-height:24px;line-height:1.2}
#ta-cursor{position:fixed;pointer-events:none;z-index:2147483649;border-radius:50%;border:2px solid rgba(255,255,255,0.7);background:rgba(255,255,255,0.15);transform:translate(-50%,-50%);display:none}
`;
function inject(){
var style=$('style');style.textContent=STYLES;document.head.appendChild(style);
var cursorDot=$('div');cursorDot.id='ta-cursor';document.body.appendChild(cursorDot);
var S={tool:'pen',color:'#ff6b6b',thickness:3,zoom:1,panX:0,panY:0,ox:0,oy:0,drawing:false,visible:true,dragIdx:-1,dragOffX:0,dragOffY:0,selected:[]};
var strokes=[],cur=null,penPt=null,colors=['#ff6b6b','#ffd93d','#6cdb9e','#4ea8de','#ffffff','#ff9f43'];
var cv=$('canvas');cv.id='ta-canvas';
var sidebar=$('div');sidebar.id='ta-sidebar';
var tools=[['pen','✏️','Pen (P)'],['select','✋','Select (S)'],['text','Aa','Text (T)'],['blackbox','⬛','Blackout (K)'],['highlighter','🖍️','Highlighter (H)'],['eraser','🧹','Eraser (E)'],['box','⬜','Box (B)']];
var toolKeys={p:'pen',s:'select',g:'pan',t:'text',k:'blackbox',h:'highlighter',e:'eraser',b:'box'};
tools.forEach(function(t){var b=$('button');b.className='tabtn';b.dataset.t=t[0];b.title=t[2];b.textContent=t[1];b.onclick=function(){setTool(t[0])};sidebar.appendChild(b)});
sidebar.appendChild(function(){var d=$('div');d.className='tasep';return d}());
colors.forEach(function(c,i){var sw=$('div');sw.className='tacolor';sw.style.background=c;sw.onclick=function(){qa('.tacolor',sidebar).forEach(function(s){s.classList.remove('active')});sw.classList.add('active');S.color=c};sidebar.appendChild(sw)});
qa('.tacolor',sidebar)[0].classList.add('active');
var bottom=$('div');bottom.id='ta-bottom';
var sl=$('input');sl.type='range';sl.id='tathick';sl.min=1;sl.max=20;sl.value=3;sl.step=0.5;
sl.oninput=function(){S.thickness=parseFloat(sl.value);q('#tathickv').textContent=S.thickness};
bottom.append($('label','Size'),sl,(function(){var s=$('span');s.className='taval';s.id='tathickv';s.textContent='3';return s}()));
function mkbtn(id,txt){var b=$('button');b.className='tabtn2';b.id=id;b.textContent=txt;return b}
function sp(){var s=$('span');s.style.color='#333';s.textContent='|';return s}
bottom.append(sp(),mkbtn('tahide','👁️'),mkbtn('taundo','↩️'),mkbtn('taclear','🗑️'),mkbtn('tacapture','📷'));
document.body.append(sidebar,bottom,cv);
var ctx=cv.getContext('2d');
function resize(){cv.width=window.innerWidth;cv.height=window.innerHeight;cv.style.width=window.innerWidth+'px';cv.style.height=window.innerHeight+'px';render()}
function c2c(cx,cy){var sx=window.scrollX||pageXOffset,sy=window.scrollY||pageYOffset;return{x:(cx+sx)/S.zoom-S.panX,y:(cy+sy)/S.zoom-S.panY}}
function updateCursor(clientX,clientY){
 var dot=cursorDot;var size=Math.max(S.thickness*3,8);
 dot.style.width=size+'px';dot.style.height=size+'px';
 dot.style.left=clientX+'px';dot.style.top=clientY+'px';
 dot.style.display=(S.tool==='pen'||S.tool==='eraser'||S.tool==='highlighter')?'block':'none';
 dot.style.borderColor=S.tool==='eraser'?'rgba(255,100,100,0.7)':'rgba(255,255,255,0.7)';
 dot.style.background=S.tool==='eraser'?'rgba(255,50,50,0.2)':'rgba(255,255,255,0.12)'
}
function render(){
 ctx.clearRect(0,0,cv.width,cv.height);if(!S.visible)return;ctx.save();
 ctx.translate(-(window.scrollX||pageXOffset),-(window.scrollY||pageYOffset));
 ctx.scale(S.zoom,S.zoom);ctx.translate(S.panX,S.panY);
 // Draw selection highlights
 S.selected.forEach(function(idx){
  var s=strokes[idx];if(!s)return;
  if(s.b){ctx.save();ctx.strokeStyle='#6cdb9e';ctx.lineWidth=2;ctx.setLineDash([3,3]);ctx.strokeRect(s.b.x-3,s.b.y-3,s.b.w+6,s.b.h+6);ctx.restore()}
  else if(s.textData){var td=s.textData;ctx.save();ctx.strokeStyle='#6cdb9e';ctx.lineWidth=1;ctx.setLineDash([3,3]);ctx.strokeRect(td.x-5,td.y-td.size,td.text.length*td.size*0.6+10,td.size*1.5);ctx.restore()}
  else if(s.p){ctx.save();ctx.strokeStyle='#6cdb9e';ctx.lineWidth=2;ctx.setLineDash([3,3]);var xs=s.p.map(function(p){return p.x}),ys=s.p.map(function(p){return p.y});ctx.strokeRect(Math.min.apply(null,xs)-5,Math.min.apply(null,ys)-5,Math.max.apply(null,xs)-Math.min.apply(null,xs)+10,Math.max.apply(null,ys)-Math.min.apply(null,ys)+10);ctx.restore()}
 });
 // Draw selection rectangle
 if(selBox){ctx.save();ctx.strokeStyle='#6cdb9e';ctx.lineWidth=1.5;ctx.setLineDash([6,4]);ctx.fillStyle='rgba(108,219,158,0.08)';ctx.fillRect(selBox.x,selBox.y,selBox.w,selBox.h);ctx.strokeRect(selBox.x,selBox.y,selBox.w,selBox.h);ctx.restore()}
 strokes.forEach(function(s){drawS(s)});if(cur)drawS(cur);
 if(S.tool==='pen'&&penPt&&!S.drawing){var p=penPt,g=ctx.createRadialGradient(p.x,p.y,0,p.x,p.y,12);g.addColorStop(0,'rgba(255,50,50,0.85)');g.addColorStop(0.3,'rgba(255,50,50,0.35)');g.addColorStop(1,'rgba(255,50,50,0)');ctx.fillStyle=g;ctx.beginPath();ctx.arc(p.x,p.y,12,0,Math.PI*2);ctx.fill()}
 ctx.restore()
}
function drawS(s){
 if(s.tool==='box'&&s.b){ctx.save();ctx.strokeStyle=s.color;ctx.lineWidth=s.thickness;ctx.setLineDash([5,4]);ctx.strokeRect(s.b.x,s.b.y,s.b.w,s.b.h);ctx.restore();return}
 if(s.tool==='text'&&s.textData){var td=s.textData;ctx.save();ctx.font=td.size+'px system-ui,sans-serif';ctx.fillStyle=td.color;ctx.globalAlpha=0.9;var lines=td.text.split('\n');for(var i=0;i<lines.length;i++)ctx.fillText(lines[i],td.x,td.y+i*td.size*1.3);ctx.restore();return}
 if(!s.p||s.p.length<2)return;ctx.save();ctx.lineCap='round';ctx.lineJoin='round';
 if(s.tool==='highlighter'){ctx.globalAlpha=0.35;ctx.strokeStyle=s.color;ctx.lineWidth=s.thickness*3.5}
 else if(s.tool==='eraser'){ctx.globalCompositeOperation='destination-out';ctx.strokeStyle='rgba(0,0,0,1)';ctx.lineWidth=s.thickness*2.5}
 else{ctx.strokeStyle=s.color;ctx.lineWidth=s.thickness}
 ctx.beginPath();ctx.moveTo(s.p[0].x,s.p[0].y);for(var i=1;i<s.p.length;i++)ctx.lineTo(s.p[i].x,s.p[i].y);ctx.stroke();ctx.restore()
}
function setTool(t){
 qa('.tabtn').forEach(function(b){b.classList.toggle('active',b.dataset.t==t)});S.tool=t;
 if(t!=='select')S._lastDrawingTool=t;
 var needsCanvas=['pen','highlighter','eraser','box','text','select'].includes(t);
 cv.classList.toggle('active',needsCanvas||t==='pan');
 var cursors={pen:'none',select:'crosshair',eraser:'none',highlighter:'none',text:'text',box:'crosshair',mouse:'default'};
 cv.style.cursor=cursors[t]||'default';if(t==='select'){S.selected=[];render()}
 document.body.style.cursor=(t==='select'||t==='pan')?'auto':'auto';
 q('#ta-text-input')&&q('#ta-text-input').remove();
 if(t==='blackbox'&&window.__blackBoxOverlay&&window.__blackBoxOverlay.activate)window.__blackBoxOverlay.activate();
 else if(window.__blackBoxOverlay&&window.__blackBoxOverlay.deactivate)window.__blackBoxOverlay.deactivate()
}
function distToSeg(px,py,x1,y1,x2,y2){var dx=x2-x1,dy=y2-y1,len2=dx*dx+dy*dy;if(len2===0)return Math.hypot(px-x1,py-y1);var t=Math.max(0,Math.min(1,((px-x1)*dx+(py-y1)*dy)/len2));return Math.hypot(px-(x1+t*dx),py-(y1+t*dy))}
function hitTest(cx,cy){
 for(var i=strokes.length-1;i>=0;i--){
  var s=strokes[i];
  if(s.tool==='box'&&s.b&&cx>=s.b.x&&cx<=s.b.x+s.b.w&&cy>=s.b.y&&cy<=s.b.y+s.b.h)return i;
  if(s.tool==='text'&&s.textData){var td=s.textData;if(cx>=td.x-5&&cx<=td.x+td.text.length*td.size*0.6&&cy>=td.y-td.size&&cy<=td.y+td.size*0.3)return i}
  if(s.p&&s.p.length>=2){for(var j=1;j<s.p.length;j++){var a=s.p[j-1],b=s.p[j];if(distToSeg(cx,cy,a.x,a.y,b.x,b.y)<Math.max(s.thickness*2,12))return i}}
 }return -1
}
// Selection state
var selBox=null; // {x,y,w,h} for rectangle select

cv.addEventListener('mousedown',function(e){
 var p=c2c(e.clientX,e.clientY);
 if(S.tool==='select'){
  var hit=hitTest(p.x,p.y);
  if(hit>=0){
   var idx=S.selected.indexOf(hit);
   if(e.shiftKey){if(idx<0)S.selected.push(hit);else S.selected.splice(idx,1)}
   else if(S.selected.includes(hit)&&S.selected.length>1){}
   else{S.selected=[hit]}
   S.dragIdx=hit;S.dragOffX=p.x;S.dragOffY=p.y;S.drawing=true;e.preventDefault();render();return
  }
  // No hit — start selection rectangle
  if(!e.shiftKey)S.selected=[];
  selBox={x:p.x,y:p.y,w:0,h:0};S.drawing=true;e.preventDefault();render();return
 }
 if(S.tool==='pan'){S.drawing=true;S.ox=e.clientX;S.oy=e.clientY;cv.style.cursor='grabbing';return}
 if(S.tool==='text'){placeText(p.x,p.y);return}
 if(e.button!==0)return;e.preventDefault();
 if(!['eraser'].includes(S.tool)){var hit=hitTest(p.x,p.y);if(hit>=0){S.dragIdx=hit;S.dragOffX=p.x;S.dragOffY=p.y;S.drawing=true;return}}
 if(S.tool==='box')cur={tool:'box',color:S.color,thickness:S.thickness,b:{x:p.x,y:p.y,w:0,h:0}};else cur={tool:S.tool,color:S.color,thickness:S.thickness,p:[p]};
 S.drawing=true
});
cv.addEventListener('mousemove',function(e){
 updateCursor(e.clientX,e.clientY);
 var p=c2c(e.clientX,e.clientY);
 if(S.tool==='select'&&S.drawing&&S.dragIdx>=0){
  var dx=p.x-S.dragOffX,dy=p.y-S.dragOffY;
  S.selected.forEach(function(idx){
   var s=strokes[idx];if(!s)return;
   if(s.b){s.b.x+=dx;s.b.y+=dy}else if(s.textData){s.textData.x+=dx;s.textData.y+=dy}else if(s.p){s.p.forEach(function(pt){pt.x+=dx;pt.y+=dy})}
  });
  S.dragOffX=p.x;S.dragOffY=p.y;render();return
 }
 if(S.tool==='select'&&S.drawing&&selBox){
  selBox.w=p.x-selBox.x;selBox.h=p.y-selBox.y;render();return
 }
 if(S.tool==='pan'){if(!S.drawing)return;S.panX+=(e.clientX-S.ox)/S.zoom;S.panY+=(e.clientY-S.oy)/S.zoom;S.ox=e.clientX;S.oy=e.clientY;render();return}
 if(S.tool==='pen'&&!S.drawing){penPt=p;render();return}
 if(!S.drawing)return;
 if(S.dragIdx>=0&&S.selected.includes(S.dragIdx)){return}
 if(!cur)return;
 if(cur.tool==='box'&&cur.b){cur.b.w=p.x-cur.b.x;cur.b.h=p.y-cur.b.y}else cur.p.push(p);render()
});
cv.addEventListener('mouseup',function(e){
 if(S.tool==='select'&&S.drawing){
  S.drawing=false;S.dragIdx=-1;
  if(selBox){
   var sb=selBox;selBox=null;
   var x1=Math.min(sb.x,sb.x+sb.w),x2=Math.max(sb.x,sb.x+sb.w),y1=Math.min(sb.y,sb.y+sb.h),y2=Math.max(sb.y,sb.y+sb.h);
   if(x2-x1>5&&y2-y1>5){
    for(var i=0;i<strokes.length;i++){
     var s=strokes[i];
     if(s.b&&s.b.x>=x1&&s.b.y>=y1&&s.b.x+s.b.w<=x2&&s.b.y+s.b.h<=y2){S.selected.push(i);continue}
     if(s.textData&&s.textData.x>=x1&&s.textData.y>=y1&&s.textData.x<=x2&&s.textData.y<=y2){S.selected.push(i);continue}
     if(s.p){var pts=s.p,allIn=pts.every(function(pt){return pt.x>=x1&&pt.x<=x2&&pt.y>=y1&&pt.y<=y2});if(allIn)S.selected.push(i)}
    }
   }
   render();return
  }
  save();render();return
 }
 if(S.tool==='pan'){S.drawing=false;cv.style.cursor='grab';return}
 if(S.dragIdx>=0){S.dragIdx=-1;S.drawing=false;save();render();return}
 if(!S.drawing||!cur)return;S.drawing=false;
 if(cur.tool==='box'&&cur.b&&Math.abs(cur.b.w)<4&&Math.abs(cur.b.h)<4){cur=null;render();return}
 if(cur.p&&cur.p.length<3&&cur.tool!=='box'){cur=null;render();return}
 strokes.push(cur);cur=null;save();render()
});
cv.addEventListener('mouseleave',function(){penPt=null;cursorDot.style.display='none';if(S.drawing){S.drawing=false;cur=null;S.dragIdx=-1;render()}});
function placeText(x,y){
 q('#ta-text-input')&&q('#ta-text-input').remove();
 var ti=$('div');ti.id='ta-text-input';ti.contentEditable='true';
 var sx=(x+S.panX)*S.zoom-(scrollX||0),sy=(y+S.panY)*S.zoom-(scrollY||0);
 ti.style.left=Math.max(10,sx)+'px';ti.style.top=Math.max(10,sy)+'px';
 ti.style.fontSize=(S.thickness*3+8)+'px';ti.style.color=S.color;
 document.body.appendChild(ti);setTimeout(function(){ti.focus()},10);
 ti.addEventListener('blur',function(){var t=this.textContent.trim();if(t){strokes.push({tool:'text',color:S.color,thickness:S.thickness,textData:{x:x,y:y,text:t,size:S.thickness*3+8,color:S.color}});save();render()}this.remove()});
 ti.addEventListener('keydown',function(e){if(e.key==='Enter'&&!e.shiftKey){e.preventDefault();this.blur()}if(e.key==='Escape'){this.remove();render()}})
}
document.addEventListener('wheel',function(e){if(!e.ctrlKey&&!e.metaKey)return;e.preventDefault();var d=e.deltaY>0?-1:1;S.thickness=Math.max(1,Math.min(20,S.thickness+d*0.5));q('#tathick').value=S.thickness;q('#tathickv').textContent=S.thickness},{passive:false});
var lastPinch=0;
document.addEventListener('touchstart',function(e){if(e.touches.length===2)lastPinch=Math.hypot(e.touches[0].clientX-e.touches[1].clientX,e.touches[0].clientY-e.touches[1].clientY)},{passive:true});
document.addEventListener('touchmove',function(e){if(e.touches.length!==2)return;e.preventDefault();var d=Math.hypot(e.touches[0].clientX-e.touches[1].clientX,e.touches[0].clientY-e.touches[1].clientY);var oldZ=S.zoom;S.zoom=Math.max(0.25,Math.min(5,S.zoom+(d-lastPinch)*0.006));lastPinch=d;render()},{passive:false});
document.addEventListener('keydown',function(e){
 if(e.target.tagName==='INPUT'||e.target.tagName==='TEXTAREA'||e.target.isContentEditable)return;
 var k=e.key.toLowerCase();
 if(toolKeys[k]&&S.tool!==toolKeys[k]){e.preventDefault();setTool(toolKeys[k])}
 var n=parseInt(e.key);if(n>=1&&n<=6){e.preventDefault();var sws=qa('.tacolor');sws.forEach(function(s){s.classList.remove('active')});sws[n-1].classList.add('active');S.color=colors[n-1]}
 if(e.key===' '){e.preventDefault();
  if(S.visible){S.visible=false;setTool('select');S.selected=[];render();document.getElementById('tahide').style.color='#6cdb9e'}
  else{S.visible=true;setTool(S._lastDrawingTool||'pen');render();document.getElementById('tahide').style.color='#aaa'}
 }
 if((e.ctrlKey||e.metaKey)&&k==='z'){e.preventDefault();undo()}
 if((e.key==='Delete'||e.key==='Backspace')&&S.selected.length){e.preventDefault();for(var i=S.selected.length-1;i>=0;i--)strokes.splice(S.selected[i],1);S.selected=[];save();render()}
 // Forward Delete to black box system
 if((e.key==='Delete'||e.key==='Backspace')&&S.tool==='blackbox'&&window.__blackBoxOverlay&&window.__blackBoxOverlay.removeLast){e.preventDefault();window.__blackBoxOverlay.removeLast()}
 if(e.key==='Escape'&&S.tool==='blackbox'&&window.__blackBoxOverlay&&window.__blackBoxOverlay.cleanup){window.__blackBoxOverlay.cleanup();setTool('select')}
});
function toggleVis(){
 if(S.visible){S.visible=false;setTool('select');q('#tahide').style.color='#6cdb9e'}
 else{S.visible=true;setTool(S._lastDrawingTool||'pen');q('#tahide').style.color='#aaa'}render()
}
q('#tahide').onclick=toggleVis;
q('#taundo').onclick=function undo(){if(strokes.length)strokes.pop();S.selected=[];save();render()};
q('#taclear').onclick=function(){strokes=[];cur=null;S.selected=[];save();render()};
q('#tacapture').onclick=async function(){
 q('#ta-sidebar').style.display='none';bottom.style.display='none';cursorDot.style.display='none';var wv=S.visible;S.visible=true;render();
 try{var stream=await navigator.mediaDevices.getDisplayMedia({preferCurrentTab:true}),track=stream.getVideoTracks()[0],ic=new ImageCapture(track),bm=await ic.grabFrame();track.stop();var tc=document.createElement('canvas');tc.width=bm.width;tc.height=bm.height;var tctx=tc.getContext('2d');tctx.drawImage(bm,0,0,tc.width,tc.height);tctx.save();tctx.scale(bm.width/innerWidth,bm.height/innerHeight);tctx.drawImage(cv,0,0);tctx.restore();var a=$('a');a.download='annotator-'+Date.now()+'.png';a.href=tc.toDataURL('image/png');a.click()}
 catch(e){var tc2=document.createElement('canvas');tc2.width=innerWidth;tc2.height=innerHeight;var tctx2=tc2.getContext('2d');tctx2.fillStyle='#0f0f13';tctx2.fillRect(0,0,tc2.width,tc2.height);tctx2.drawImage(cv,0,0);var a2=$('a');a2.download='annotator-'+Date.now()+'.png';a2.href=tc2.toDataURL('image/png');a2.click()}
 S.visible=wv;render();q('#ta-sidebar').style.display='';bottom.style.display='';cursorDot.style.display=''
};
function key(){return'at:'+location.href}
function save(){try{localStorage.setItem(key(),JSON.stringify(strokes))}catch(e){}}
function load(){try{var r=localStorage.getItem(key());strokes=r?JSON.parse(r):[]}catch(e){strokes=[]}render()}
// Black box loader
(function(){var s=$('script');s.src='/experiments/annotator/blackbox.js?'+Date.now();document.body.appendChild(s)})();
setTool('pen');resize();load();addEventListener('resize',resize)
}
if(document.readyState==='loading')addEventListener('DOMContentLoaded',inject);else inject()
})();
