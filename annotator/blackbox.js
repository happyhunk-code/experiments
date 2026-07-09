(function(){
if(window.__blackBoxOverlay)return;
var state={active:false,drawing:false,startX:0,startY:0,rects:[]};
var ghost=document.createElement('div');
Object.assign(ghost.style,{position:'fixed',background:'rgba(0,0,0,0.4)',border:'2px dashed #f00',zIndex:'2147483646',pointerEvents:'none',display:'none',boxSizing:'border-box'});
document.body.appendChild(ghost);
function createBox(x,y,w,h){
 var box=document.createElement('div');
 Object.assign(box.style,{position:'fixed',left:x+'px',top:y+'px',width:w+'px',height:h+'px',background:'#000',border:'1px solid rgba(255,255,255,0.2)',zIndex:'2147483645',boxSizing:'border-box',cursor:'move'});
 box.addEventListener('contextmenu',function(e){e.preventDefault();var i=state.rects.indexOf(box);if(i>-1)state.rects.splice(i,1);box.remove();});
 var drag=null;
 box.addEventListener('mousedown',function(e){
  e.stopPropagation();
  drag={ox:e.clientX-parseInt(box.style.left),oy:e.clientY-parseInt(box.style.top)};
  var mv=function(ev){box.style.left=(ev.clientX-drag.ox)+'px';box.style.top=(ev.clientY-drag.oy)+'px';};
  var up=function(){drag=null;document.removeEventListener('mousemove',mv);document.removeEventListener('mouseup',up);};
  document.addEventListener('mousemove',mv);document.addEventListener('mouseup',up);
 });
 box._isBlackBox=true;
 document.body.appendChild(box);state.rects.push(box);
}
// Only handle mousedown when the black box script explicitly activates drawing
function activate(){
 state.active=true;
 document.body.style.cursor='crosshair';
}
function deactivate(){
 state.active=false;state.drawing=false;
 document.body.style.cursor='';
 ghost.style.display='none';
}
document.addEventListener('mousedown',function(e){
 if(!state.active)return;
 if(e.target._isBlackBox||e.target.closest('#ta-sidebar')||e.target.closest('#ta-bottom')||e.target===ghost||e.target.closest('.tabtn'))return;
 state.drawing=true;state.startX=e.clientX;state.startY=e.clientY;
 Object.assign(ghost.style,{left:e.clientX+'px',top:e.clientY+'px',width:'0px',height:'0px',display:'block'});
 e.preventDefault();
},true);
document.addEventListener('mousemove',function(e){if(!state.drawing)return;var x=Math.min(e.clientX,state.startX),y=Math.min(e.clientY,state.startY),w=Math.abs(e.clientX-state.startX),h=Math.abs(e.clientY-state.startY);Object.assign(ghost.style,{left:x+'px',top:y+'px',width:w+'px',height:h+'px'});},true);
document.addEventListener('mouseup',function(e){if(!state.drawing)return;state.drawing=false;ghost.style.display='none';if(!state.active)return;var x=Math.min(e.clientX,state.startX),y=Math.min(e.clientY,state.startY),w=Math.abs(e.clientX-state.startX),h=Math.abs(e.clientY-state.startY);if(w>5&&h>5)createBox(x,y,w,h);},true);
document.addEventListener('keydown',function(e){if(e.key==='Escape'){state.rects.forEach(function(r){r.remove();});state.rects.length=0;ghost.remove();delete window.__blackBoxOverlay;}});
window.__blackBoxOverlay={activate:activate,deactivate:deactivate,removeLast:function(){var l=state.rects.pop();if(l)l.remove()},cleanup:function(){state.rects.forEach(function(r){r.remove();});state.rects.length=0;ghost.remove();delete window.__blackBoxOverlay;}};
})();
