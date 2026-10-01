"use strict";
(() => {
const $=id=>document.getElementById(id), tbody=$("tbl").querySelector("tbody");
let previousUnit="cm", deferredPrompt=null;

const esc=s=>String(s).replace(/[&<>"']/g,m=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#039;"}[m]));
const fmt=v=>Number.isFinite(v)?(Math.round(v*100)/100).toString():"";
const unitLabel=()=> $("unit").value==="in"?"in":"cm";
const toCm=v=> $("unit").value==="in"?v*2.54:v;
const fromCm=v=> $("unit").value==="in"?v/2.54:v;

function setStatus(msg,ok=true){
  const s=$("status"); s.textContent=msg; s.className="status "+(ok?"ok":"err");
}

// Captura adaptada a computadora y telefono; identificadores V1, V2, ...
const isMobile=()=>window.matchMedia("(max-width: 800px)").matches;
function renumberRows(){
  [...tbody.rows].forEach((r,i)=>{r.querySelector(".rid").value=`V${i+1}`;});
}
function focusWidth(tr){
  const input=tr?.querySelector(".rw");
  if(input) {input.focus({preventScroll:true}); input.scrollIntoView({block:"nearest",behavior:"smooth"});}
}
function rowIsValid(tr){
  return Number(tr.querySelector(".rw").value)>0 &&
         Number(tr.querySelector(".rh").value)>0 &&
         Number.isInteger(Number(tr.querySelector(".rq").value)) &&
         Number(tr.querySelector(".rq").value)>0;
}
function addAndFocus(existingRow){
  if(existingRow && !rowIsValid(existingRow)){
    setStatus("Completa ancho, alto y cantidad antes de agregar otra ventana.",false);
    for(const key of [".rw",".rh",".rq"]){
      const el=existingRow.querySelector(key);
      if(!(Number(el.value)>0)){el.focus();break;}
    }
    return;
  }
  const tr=addRow();focusWidth(tr);
  setStatus(`Lista la ventana V${tbody.rows.length}.`);
}
function addRow(data={}){
  const tr=document.createElement("tr");
  tr.innerHTML=`<td data-label="Ventana"><input class="rid" type="text" readonly aria-label="Identificador automatico"></td>
  <td data-label="Ancho"><input class="rw" type="number" step="any" min="0" inputmode="decimal" enterkeyhint="next" aria-label="Ancho"></td>
  <td data-label="Alto"><input class="rh" type="number" step="any" min="0" inputmode="decimal" enterkeyhint="next" aria-label="Alto"></td>
  <td data-label="Cantidad"><input class="rq" type="number" min="1" step="1" inputmode="numeric" enterkeyhint="done" aria-label="Cantidad" value="2"></td>
  <td class="actions"><button class="danger del" type="button" aria-label="Eliminar ventana">×</button>
  <button type="button" class="secondary next-row">+ Guardar y agregar otra ventana</button></td>`;
  tr.querySelector(".rw").value=data.w??"";
  tr.querySelector(".rh").value=data.h??"";
  tr.querySelector(".rq").value=data.q??2;
  tr.querySelector(".del").addEventListener("click",()=>{
    tr.remove();if(!tbody.rows.length)addRow();renumberRows();
  });
  tr.querySelector(".next-row").addEventListener("click",()=>addAndFocus(tr));
  for(const [from,to] of [[".rw",".rh"],[".rh",".rq"]]){
    tr.querySelector(from).addEventListener("keydown",e=>{
      if(e.key!=="Enter")return;
      e.preventDefault();tr.querySelector(to).focus();
    });
  }
  tr.querySelector(".rq").addEventListener("keydown",e=>{
    if(e.key!=="Enter")return;
    e.preventDefault();
    if(isMobile()){
      tr.querySelector(".rq").blur();
      setStatus("Pulsa «Guardar y agregar otra ventana» para continuar.");
    } else addAndFocus(tr);
  });
  tbody.appendChild(tr);renumberRows();return tr;
}
function resetRows(){
  tbody.innerHTML="";
  addRow();
}

// En dispositivos estrechos se muestra cada ventana como tarjeta vertical.
const mobileCss=document.createElement("style");
mobileCss.textContent=`
.rid{background:#edf3f9!important;color:#15446d;font-weight:800;text-align:center;min-width:55px!important}
.next-row{display:none}
@media(max-width:800px){
 .table-wrap{overflow:visible!important}
 #tbl{min-width:0!important;display:block}
 #tbl thead{display:none}
 #tbl tbody{display:block}
 #tbl tr{display:grid;grid-template-columns:1fr 1fr;gap:11px;padding:13px;margin:10px 0;border:1px solid #d7e1ed;border-radius:13px;background:#f9fbfd}
 #tbl td{display:block;border:0!important;padding:0;min-width:0}
 #tbl td::before{content:attr(data-label);display:block;font-size:12px;color:#475467;font-weight:700;margin-bottom:5px}
 #tbl td:first-child{grid-column:1 / -1;display:flex;align-items:center;gap:10px}
 #tbl td:first-child::before{margin:0}
 #tbl td:first-child .rid{width:85px}
 #tbl td:nth-child(4){grid-column:1 / -1}
 #tbl td.actions{grid-column:1 / -1;display:flex;gap:8px;align-items:center}
 #tbl td.actions .del{min-width:45px}
 #tbl td.actions .next-row{display:block;flex:1;min-height:46px}
 #tbl input{min-width:0!important;width:100%;font-size:17px;min-height:45px}
}
`;
document.head.appendChild(mobileCss);

function convertVisible(oldU,newU){
  if(oldU===newU)return;
  const f=oldU==="cm"&&newU==="in"?1/2.54:2.54;
  ["sheetW","sheetH","gap"].forEach(id=>{
    const n=$(id),v=parseFloat(n.value); if(Number.isFinite(v))n.value=fmt(v*f);
  });
  [...tbody.rows].forEach(r=>{
    [".rw",".rh"].forEach(sel=>{
      const n=r.querySelector(sel),v=parseFloat(n.value); if(Number.isFinite(v))n.value=fmt(v*f);
    });
  });
}

$("unit").addEventListener("change",()=>{
  const next=$("unit").value; convertVisible(previousUnit,next); previousUnit=next;
  setStatus("Unidad cambiada a "+(next==="cm"?"centímetros.":"pulgadas."));
});

function piecesFromTable(){
  const gap=toCm(parseFloat($("gap").value)||0), out=[];
  [...tbody.rows].forEach((r,idx)=>{
    const id=r.querySelector(".rid").value.trim()||`V${idx+1}`;
    const w=parseFloat(r.querySelector(".rw").value), h=parseFloat(r.querySelector(".rh").value);
    const q=parseInt(r.querySelector(".rq").value||"0",10);
    if(w>0&&h>0&&q>0){
      const wc=toCm(w),hc=toCm(h);
      for(let c=1;c<=q;c++) out.push({id,copy:c,w:wc,h:hc,packW:wc+gap,packH:hc+gap,area:wc*hc});
    }
  });
  return out;
}

const lexLess=(a,b)=>{for(let i=0;i<a.length;i++){if(a[i]<b[i]-1e-9)return true;if(a[i]>b[i]+1e-9)return false}return false};
const intersects=(a,b)=>!(b.x>=a.x+a.w||b.x+b.w<=a.x||b.y>=a.y+a.h||b.y+b.h<=a.y);
const contained=(a,b)=>a.x>=b.x-1e-9&&a.y>=b.y-1e-9&&a.x+a.w<=b.x+b.w+1e-9&&a.y+a.h<=b.y+b.h+1e-9;

function splitFree(free,used){
  const old=[...free]; free.length=0;
  old.forEach(fr=>{
    if(!intersects(fr,used)){free.push(fr);return}
    if(used.x>fr.x)free.push({x:fr.x,y:fr.y,w:used.x-fr.x,h:fr.h});
    if(used.x+used.w<fr.x+fr.w)free.push({x:used.x+used.w,y:fr.y,w:fr.x+fr.w-(used.x+used.w),h:fr.h});
    if(used.y>fr.y)free.push({x:fr.x,y:fr.y,w:fr.w,h:used.y-fr.y});
    if(used.y+used.h<fr.y+fr.h)free.push({x:fr.x,y:used.y+used.h,w:fr.w,h:fr.y+fr.h-(used.y+used.h)});
  });
}
function pruneFree(free){
  for(let i=0;i<free.length;i++){
    let removed=false;
    for(let j=i+1;j<free.length;j++){
      if(contained(free[i],free[j])){free.splice(i,1);i--;removed=true;break}
      if(contained(free[j],free[i])){free.splice(j,1);j--}
    }
    if(removed)continue;
  }
}
function placeInBin(pieces,W,H,strategy){
  const free=[{x:0,y:0,w:W,h:H}],placed=[],remaining=[];
  for(const p of pieces){
    let best=null;
    for(const fr of free){
      for(const rot of [false,true]){
        const pw=rot?p.packH:p.packW,ph=rot?p.packW:p.packH;
        if(pw<=fr.w+1e-9&&ph<=fr.h+1e-9){
          const a=Math.abs(fr.w-pw),b=Math.abs(fr.h-ph),short=Math.min(a,b),long=Math.max(a,b);
          const score=strategy==="area"?[fr.w*fr.h-pw*ph,short,long]:
                      strategy==="bottom"?[fr.y+ph,fr.x,short]:
                      [short,long,fr.w*fr.h-pw*ph];
          if(!best||lexLess(score,best.score))best={rot,pw,ph,score,x:fr.x,y:fr.y};
        }
      }
    }
    if(!best){remaining.push(p);continue}
    const node={...p,x:best.x,y:best.y,rot:best.rot,usedW:best.pw,usedH:best.ph};
    placed.push(node); splitFree(free,{x:node.x,y:node.y,w:node.usedW,h:node.usedH}); pruneFree(free);
  }
  return {placed,remaining,free};
}
function packAll(src,W,H,sortMode,strategy){
  let pieces=[...src];
  if(sortMode==="maxside")pieces.sort((a,b)=>Math.max(b.packW,b.packH)-Math.max(a.packW,a.packH)||b.area-a.area);
  else if(sortMode==="height")pieces.sort((a,b)=>Math.max(b.packW,b.packH)-Math.max(a.packW,a.packH));
  else pieces.sort((a,b)=>b.area-a.area);
  const bins=[]; let guard=0;
  while(pieces.length&&guard++<1000){
    const r=placeInBin(pieces,W,H,strategy); if(!r.placed.length)return null;
    bins.push(r); pieces=r.remaining;
  }
  return bins;
}

function calculate(){
  try{
    const W=toCm(parseFloat($("sheetW").value)),H=toCm(parseFloat($("sheetH").value)),pieces=piecesFromTable();
    if(!(W>0&&H>0)){setStatus("Revisa las medidas de la lámina.",false);return}
    if(!pieces.length){setStatus("Ingresa al menos una medida válida.",false);return}
    const tooBig=pieces.filter(p=>!((p.packW<=W&&p.packH<=H)||(p.packH<=W&&p.packW<=H)));
    if(tooBig.length){setStatus("Estas piezas no caben: "+[...new Set(tooBig.map(p=>p.id))].join(", "),false);return}
    let best=null;
    for(const s of ["area","maxside","height"])for(const st of ["short","area","bottom"]){
      const bins=packAll(pieces,W,H,s,st); if(!bins)continue;
      const waste=bins.length*W*H-pieces.reduce((a,p)=>a+p.area,0),score=[bins.length,waste];
      if(!best||lexLess(score,best.score))best={bins,score};
    }
    render(best.bins,W,H,pieces);
    setStatus(`Listo: ${best.bins.length} lámina(s), ${pieces.length} pieza(s).`);
  }catch(e){setStatus("Error: "+e.message,false)}
}

function colorFor(id){let h=0;for(const c of id)h=(h*31+c.charCodeAt(0))%360;return `hsl(${h} 65% 84%)`}
function attrs(n,o){Object.entries(o).forEach(([k,v])=>n.setAttribute(k,v))}

function render(bins,W,H,pieces){
  const total=pieces.reduce((a,p)=>a+p.area,0),util=100*total/(bins.length*W*H),u=unitLabel();
  let waste=bins.length*W*H-total;if($("unit").value==="in")waste/=6.4516;
  $("summary").innerHTML=`<div class="kpi"><span>Láminas</span><b>${bins.length}</b></div>
  <div class="kpi"><span>Piezas</span><b>${pieces.length}</b></div>
  <div class="kpi"><span>Aprovechamiento</span><b>${util.toFixed(1)}%</b></div>
  <div class="kpi"><span>Sobrante total</span><b>${waste.toFixed(2)} ${u}²</b></div>`;
  const host=$("sheets");host.innerHTML="";
  bins.forEach((b,i)=>host.appendChild(drawSheet(b,i+1,W,H)));
}

function drawSheet(bin,n,W,H){
  const box=document.createElement("section");box.className="sheet";
  const u=unitLabel(),used=bin.placed.reduce((a,p)=>a+p.area,0),util=100*used/(W*H);
  box.innerHTML=`<div class="sheet-head"><div><div class="sheet-title">${esc($("job").value||"Corte de vidrio")} · Lámina ${n}</div>
  <div class="note">Lámina ${fmt(fromCm(W))} × ${fmt(fromCm(H))} ${u}</div></div>
  <div class="sheet-meta">Piezas: ${bin.placed.length}<br>Aprovechamiento: ${util.toFixed(1)}%</div></div>`;
  const wrap=document.createElement("div");wrap.className="canvas-wrap";
  const NS="http://www.w3.org/2000/svg",vw=1000,vh=Math.round(vw*H/W),sx=vw/W,sy=vh/H;
  const svg=document.createElementNS(NS,"svg");attrs(svg,{viewBox:`0 0 ${vw} ${vh}`,width:"1000"});
  const bg=document.createElementNS(NS,"rect");attrs(bg,{x:0,y:0,width:vw,height:vh,fill:"#eef1f4",stroke:"#111827","stroke-width":"2"});svg.appendChild(bg);
  for(const p of bin.placed){
    const x=p.x*sx,y=p.y*sy,w=p.usedW*sx,h=p.usedH*sy;
    const r=document.createElementNS(NS,"rect");attrs(r,{x,y,width:w,height:h,fill:colorFor(p.id),class:"cut"});svg.appendChild(r);
    const sw=p.rot?p.h:p.w,sh=p.rot?p.w:p.h,cx=x+w/2,cy=y+h/2;
    const t=document.createElementNS(NS,"text");attrs(t,{x:cx,y:cy-4,"text-anchor":"middle",class:"cutText"});t.textContent=`${p.id}-${p.copy}`;svg.appendChild(t);
    const d=document.createElementNS(NS,"text");attrs(d,{x:cx,y:cy+11,"text-anchor":"middle",class:"dimText"});d.textContent=`${fmt(fromCm(sw))} × ${fmt(fromCm(sh))} ${u}${p.rot?" · girado":""}`;svg.appendChild(d);
  }
  wrap.appendChild(svg);box.appendChild(wrap);
  const note=document.createElement("div");note.className="note";note.textContent=`Área gris = sobrante. Margen entre cortes: ${$("gap").value||0} ${u}.`;box.appendChild(note);
  return box;
}

function saveWork(){
  const data={unit:$("unit").value,sheetW:$("sheetW").value,sheetH:$("sheetH").value,gap:$("gap").value,job:$("job").value,
    rows:[...tbody.rows].map(r=>({id:r.querySelector(".rid").value,w:r.querySelector(".rw").value,h:r.querySelector(".rh").value,q:r.querySelector(".rq").value}))};
  localStorage.setItem("vidrieriaAlexCortePWA",JSON.stringify(data)); setStatus("Trabajo guardado en este dispositivo.");
}
function loadWork(){
  const raw=localStorage.getItem("vidrieriaAlexCortePWA");if(!raw){setStatus("No hay un trabajo guardado.",false);return}
  try{
    const d=JSON.parse(raw);previousUnit=d.unit||"cm";$("unit").value=previousUnit;$("sheetW").value=d.sheetW;$("sheetH").value=d.sheetH;$("gap").value=d.gap;$("job").value=d.job||"Corte de vidrio";
    tbody.innerHTML="";(d.rows||[]).forEach(addRow);if(!tbody.rows.length)resetRows();renumberRows();setStatus("Trabajo cargado.");
  }catch(e){setStatus("No se pudo cargar el trabajo.",false)}
}

$("btnAdd").addEventListener("click",()=>addAndFocus());
$("btnCalc").addEventListener("click",calculate);
$("btnPrint").addEventListener("click",()=>{if(!$("sheets").children.length)calculate();if($("sheets").children.length)window.print()});
$("btnSave").addEventListener("click",saveWork);
$("btnLoad").addEventListener("click",loadWork);
$("btnClear").addEventListener("click",()=>{resetRows();$("summary").innerHTML="";$("sheets").innerHTML="";setStatus("Formulario limpio.")});

window.addEventListener("beforeinstallprompt",e=>{e.preventDefault();deferredPrompt=e;$("btnInstall").style.display="inline-block"});
$("btnInstall").addEventListener("click",async()=>{if(!deferredPrompt)return;deferredPrompt.prompt();await deferredPrompt.userChoice;deferredPrompt=null;$("btnInstall").style.display="none"});

if("serviceWorker" in navigator)window.addEventListener("load",()=>navigator.serviceWorker.register("./sw.js").catch(()=>{}));
resetRows();
})();