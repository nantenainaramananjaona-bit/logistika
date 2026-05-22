<script>
const PALETTE=['#4f8ef7','#38d9a9','#f5a623','#9b72f5','#e05c5c','#06b6d4','#ec4899','#f6e05e'];
const COLOR_BG_DARK=['rgba(79,142,247,0.13)','rgba(56,217,169,0.13)','rgba(245,166,35,0.13)','rgba(155,114,245,0.13)','rgba(224,92,92,0.13)','rgba(6,182,212,0.13)','rgba(236,72,153,0.13)','rgba(246,224,94,0.13)'];
const COLOR_BG_LIGHT=['rgba(79,142,247,0.10)','rgba(56,217,169,0.10)','rgba(245,166,35,0.10)','rgba(155,114,245,0.10)','rgba(224,92,92,0.10)','rgba(6,182,212,0.10)','rgba(236,72,153,0.10)','rgba(246,224,94,0.10)'];
const CUSTOMERS=["6TH SENS","AGOA CTN","ANTHROPOLOGIE","ARMANI","AUSTIN REED","AWAY","BARBOUR","BONOBO","BRENTWOOD GENTS","BREUNINGER","BROOKS","CAPE UNION","CHARLES TYRWITT","CONBIPEL","COUNTRY ROAD&TRENERY GENTS","DANIEL HECHTER","DILLARDS","DOUBLE TWO","EDGARS","EL CORTE GENTS","EWM","EXACT","FABIANI","Faherty Brand Ladies","FASHION PROJECT","FCN LADIES","FREE PEOPLE LADIES","GENTLEMAN FARMER","GIESSWEIN","GIOVANNI","HACKETT","Harmont&Blaine Gents","HARRIS WILLSON","HOUSE OF BRUAR","HUG","HUGO BOSS","INSPECTION LYON&DEC","IZAC","JACQUES VERT","JHONNIE O","JOHN CRAIG","JOHN LEWIS","JOS A BANK","JOSEPH ABBOUD","JULES","KWAY GENTS","LACOSTE","LEFT OVER 2019","LION OF PORCHES & DECENIO","M&S","MAKRO","MARKETING TRIPS LADIES","MARKHAM -FABIANI-UNION DENIM","MASK","MASSIMO","MONOPRIX","MOORES","MOSS BROS","MR BLUE","NEXT","ORVIS","PETER MILLAR","PICK n PAY","POLO JEANS","PRINGLE","QUEENSPARK","REDBAT","RELAY GENTS","RIVERWALK","RODD&GUNN","ROOTS","RUSSEL","SACOOR","SANDRO","SAS DEVRED","SCALPERS","SCOTCH & SODA","SKIPERBAR","SPITZ","STOCK ORDER","STOKOMANI","SUIT SUPPLY","SUPERBALIST","THOMAS DEAN","TOMMY","UNIQ mens","UZZI","VERWEIJ","WOOLOVERS","WOOLWORTHS","ZADIG&VOLTAIRE","ZLABELS"];

let couleurs=[], activeCIdx=0, _allResults=[], _maxSizes=3, _forceSingleCtn=false, _boxModalCtx=null, _lastMeta={};
// Models DB (loaded from models_db.json)
let _db={ dim_models:[], weight_piece_models:[], weight_carton_models:[] };
// MAJ BSD state
let _majType='dim', _majSelectedIdx=-1, _majIsNew=false, _majDirty=false;

// ============ JSON DB LOADING ============
async function loadModelsDB(){
  try{
    const r=await fetch('models_db.json?_='+Date.now());
    if(r.ok){ _db=await r.json(); }
  }catch(e){
    console.warn('models_db.json not found, using defaults.');
    _db={
      dim_models:[{name:"WOOLWORTHS",L:60,l:40,h:30},{name:"HUGO BOSS",L:65,l:45,h:35},{name:"STANDARD",L:61,l:41,h:30}],
      weight_piece_models:[{name:"POLO SHIRT",wPiece:0.250},{name:"T-SHIRT",wPiece:0.180},{name:"JACKET",wPiece:0.650}],
      weight_carton_models:[{name:"SMALL BOX",wCarton:0.60},{name:"MEDIUM BOX",wCarton:0.80},{name:"LARGE BOX",wCarton:1.20}]
    };
  }
  renderAllModels();
}

function renderAllModels(){
  renderModelsList('dim-models-list',_db.dim_models,'dim');
  renderModelsList('wp-models-list',_db.weight_piece_models,'wp');
  renderModelsList('wc-models-list',_db.weight_carton_models,'wc');
  refreshAllPanelSelects();
}

function renderModelsList(containerId, list, type){
  const c=document.getElementById(containerId); if(!c)return;
  c.innerHTML = list.map((m,i)=>{
    let vals='';
    if(type==='dim') vals=`<span class="model-badge mb-dim">L ${m.L}cm</span><span class="model-badge mb-dim">l ${m.l}cm</span><span class="model-badge mb-dim">h ${m.h}cm</span>`;
    else if(type==='wp') vals=`<span class="model-badge mb-wp">Pièce: ${m.wPiece} kg</span>`;
    else vals=`<span class="model-badge mb-wc">Carton: ${m.wCarton} kg</span>`;
    return `<div class="model-card"><div class="model-card-name" style="color:${type==='dim'?'var(--purple)':type==='wp'?'var(--warn)':'var(--accent2)'}">${m.name}</div><div class="model-card-vals">${vals}</div></div>`;
  }).join('') || '<span style="font-size:11px;color:var(--text3);font-family:var(--mono);">Aucun modèle. Utilisez MAJ BSD pour en ajouter.</span>';
}

// ============ MAJ BSD ============
function openMajModal(){
  _majType='dim'; _majSelectedIdx=-1; _majIsNew=false; _majDirty=false;
  document.querySelectorAll('.maj-type-btn').forEach((b,i)=>b.classList.toggle('active',i===0));
  renderMajItems();
  document.getElementById('maj-form').style.display='none';
  document.getElementById('maj-status').textContent='';
  document.getElementById('btn-maj-dl').style.display='none';
  document.getElementById('btn-maj-del').style.display='none';
  document.getElementById('maj-modal-overlay').classList.add('open');
}
function closeMajModal(){ document.getElementById('maj-modal-overlay').classList.remove('open'); }

function majSetType(t){
  _majType=t; _majSelectedIdx=-1; _majIsNew=false;
  document.querySelectorAll('.maj-type-btn').forEach(b=>b.classList.remove('active'));
  const idx=t==='dim'?0:t==='wpiece'?1:2;
  document.querySelectorAll('.maj-type-btn')[idx].classList.add('active');
  renderMajItems();
  document.getElementById('maj-form').style.display='none';
  document.getElementById('btn-maj-del').style.display='none';
  document.getElementById('maj-status').textContent='';
}

function majGetList(){
  return _majType==='dim'?_db.dim_models : _majType==='wpiece'?_db.weight_piece_models : _db.weight_carton_models;
}

function renderMajItems(){
  const list=majGetList();
  const grid=document.getElementById('maj-items-grid');
  let html=list.map((m,i)=>{
    let vals='';
    if(_majType==='dim') vals=`L:${m.L} l:${m.l} h:${m.h} cm`;
    else if(_majType==='wpiece') vals=`${m.wPiece} kg / pièce`;
    else vals=`${m.wCarton} kg / carton vide`;
    return `<div class="maj-item-card${_majSelectedIdx===i?' selected':''}" onclick="majSelectItem(${i})">
      <div class="maj-item-name">${m.name}</div>
      <div class="maj-item-vals">${vals}</div>
    </div>`;
  }).join('');
  html+=`<div class="maj-item-card new-entry" onclick="majNewItem()">＋ Nouveau modèle</div>`;
  grid.innerHTML=html;
}

function majSelectItem(i){
  _majSelectedIdx=i; _majIsNew=false;
  renderMajItems();
  const m=majGetList()[i];
  showMajForm(m);
  document.getElementById('btn-maj-del').style.display='';
  document.getElementById('btn-maj-dl').style.display='none';
  document.getElementById('maj-status').textContent='';
}

function majNewItem(){
  _majSelectedIdx=-1; _majIsNew=true;
  renderMajItems();
  showMajForm(null);
  document.getElementById('btn-maj-del').style.display='none';
  document.getElementById('btn-maj-dl').style.display='none';
  document.getElementById('maj-status').textContent='';
}

function showMajForm(m){
  const form=document.getElementById('maj-form');
  const title=document.getElementById('maj-form-title');
  const grid=document.getElementById('maj-form-grid');
  form.style.display='';
  title.textContent=_majIsNew?'Nouveau modèle':'Modifier: '+(m?m.name:'');
  let fields='';
  if(_majType==='dim'){
    grid.className='maj-form-grid cols3';
    fields=`<div class="maj-field"><label class="maj-lbl">Nom / Client</label><input class="maj-inp" id="mf-name" value="${m?m.name:''}" placeholder="ex: WOOLWORTHS"></div>
    <div class="maj-field"><label class="maj-lbl">Longueur (cm)</label><input class="maj-inp" id="mf-L" type="number" step="0.1" value="${m?m.L:''}" placeholder="60"></div>
    <div class="maj-field"><label class="maj-lbl">Largeur (cm)</label><input class="maj-inp" id="mf-l" type="number" step="0.1" value="${m?m.l:''}" placeholder="40"></div>
    <div class="maj-field"><label class="maj-lbl">Hauteur (cm)</label><input class="maj-inp" id="mf-h" type="number" step="0.1" value="${m?m.h:''}" placeholder="30"></div>`;
  } else if(_majType==='wpiece'){
    grid.className='maj-form-grid cols2';
    fields=`<div class="maj-field"><label class="maj-lbl">Nom / Article</label><input class="maj-inp" id="mf-name" value="${m?m.name:''}" placeholder="ex: POLO SHIRT"></div>
    <div class="maj-field"><label class="maj-lbl">Poids Pièce (KG)</label><input class="maj-inp" id="mf-wpiece" type="number" step="0.001" value="${m?m.wPiece:''}" placeholder="0.250"></div>`;
  } else {
    grid.className='maj-form-grid cols2';
    fields=`<div class="maj-field"><label class="maj-lbl">Nom / Boîte</label><input class="maj-inp" id="mf-name" value="${m?m.name:''}" placeholder="ex: MEDIUM BOX"></div>
    <div class="maj-field"><label class="maj-lbl">Poids Carton Vide (KG)</label><input class="maj-inp" id="mf-wcarton" type="number" step="0.01" value="${m?m.wCarton:''}" placeholder="0.80"></div>`;
  }
  grid.innerHTML=fields;
}

function majValidate(){
  const nameEl=document.getElementById('mf-name');
  if(!nameEl){document.getElementById('maj-status').className='maj-status err';document.getElementById('maj-status').textContent='❌ Sélectionnez ou créez un modèle d\'abord.';return;}
  const name=nameEl.value.trim().toUpperCase();
  if(!name){document.getElementById('maj-status').className='maj-status err';document.getElementById('maj-status').textContent='❌ Le nom est requis.';return;}
  let newObj={name};
  if(_majType==='dim'){
    const L=parseFloat(document.getElementById('mf-L').value)||0;
    const l=parseFloat(document.getElementById('mf-l').value)||0;
    const h=parseFloat(document.getElementById('mf-h').value)||0;
    if(!L||!l||!h){document.getElementById('maj-status').className='maj-status err';document.getElementById('maj-status').textContent='❌ Remplissez L, l, h.';return;}
    newObj={name,L,l,h};
    if(_majIsNew) _db.dim_models.push(newObj);
    else _db.dim_models[_majSelectedIdx]=newObj;
  } else if(_majType==='wpiece'){
    const wPiece=parseFloat(document.getElementById('mf-wpiece').value)||0;
    if(!wPiece){document.getElementById('maj-status').className='maj-status err';document.getElementById('maj-status').textContent='❌ Poids pièce requis.';return;}
    newObj={name,wPiece};
    if(_majIsNew) _db.weight_piece_models.push(newObj);
    else _db.weight_piece_models[_majSelectedIdx]=newObj;
  } else {
    const wCarton=parseFloat(document.getElementById('mf-wcarton').value)||0;
    if(!wCarton){document.getElementById('maj-status').className='maj-status err';document.getElementById('maj-status').textContent='❌ Poids carton requis.';return;}
    newObj={name,wCarton};
    if(_majIsNew) _db.weight_carton_models.push(newObj);
    else _db.weight_carton_models[_majSelectedIdx]=newObj;
  }
  _majDirty=true; _majIsNew=false;
  if(_majType==='dim') _majSelectedIdx=_db.dim_models.findIndex(m=>m.name===name);
  else if(_majType==='wpiece') _majSelectedIdx=_db.weight_piece_models.findIndex(m=>m.name===name);
  else _majSelectedIdx=_db.weight_carton_models.findIndex(m=>m.name===name);
  renderMajItems(); renderAllModels();
  document.getElementById('maj-status').className='maj-status ok';
  document.getElementById('maj-status').textContent='✅ Modèle validé. Cliquez "Télécharger" pour sauvegarder le fichier JSON.';
  document.getElementById('btn-maj-dl').style.display='';
  document.getElementById('btn-maj-del').style.display='';
}

function majDelete(){
  if(_majSelectedIdx<0)return;
  const list=majGetList(); const name=list[_majSelectedIdx].name;
  if(!confirm('Supprimer "'+name+'" ?'))return;
  if(_majType==='dim') _db.dim_models.splice(_majSelectedIdx,1);
  else if(_majType==='wpiece') _db.weight_piece_models.splice(_majSelectedIdx,1);
  else _db.weight_carton_models.splice(_majSelectedIdx,1);
  _majSelectedIdx=-1; _majDirty=true;
  renderMajItems(); renderAllModels();
  document.getElementById('maj-form').style.display='none';
  document.getElementById('btn-maj-del').style.display='none';
  document.getElementById('maj-status').className='maj-status ok';
  document.getElementById('maj-status').textContent='✅ Supprimé. Cliquez "Télécharger" pour sauvegarder.';
  document.getElementById('btn-maj-dl').style.display='';
}

function majDownload(){
  _db.last_updated=new Date().toISOString();
  const json=JSON.stringify(_db,null,2);
  const blob=new Blob([json],{type:'application/json'});
  const url=URL.createObjectURL(blob);
  const a=document.createElement('a'); a.href=url; a.download='models_db.json'; a.click(); URL.revokeObjectURL(url);
  document.getElementById('maj-status').className='maj-status ok';
  document.getElementById('maj-status').textContent='⬇️ models_db.json téléchargé — Remplacez votre ancien fichier.';
}

// ============ PDF SELECTOR ============
function openPdfSel(){ document.getElementById('pdf-sel-overlay').classList.add('open'); }
function closePdfSel(){ document.getElementById('pdf-sel-overlay').classList.remove('open'); }
function pdfToggle(el){
  el.classList.toggle('checked');
  el.querySelector('.pdf-chk-box').textContent=el.classList.contains('checked')?'✓':'';
}
function executePrint(){
  const body=document.body;
  // Remove all pdf-hide classes
  body.className=body.className.replace(/pdf-hide-\w+/g,'').trim();
  // Apply hide classes for unchecked items
  document.querySelectorAll('.pdf-chk-item:not(.checked)').forEach(el=>{
    body.classList.add('pdf-hide-'+el.getAttribute('data-key'));
  });
  closePdfSel();
  setTimeout(()=>{
    window.print();
    setTimeout(()=>{ body.className=body.className.replace(/pdf-hide-\w+/g,'').trim(); },1000);
  },100);
}

// ============ WELCOME ============
function checkWelcome(){
  const v=document.getElementById('welcome-input').value;
  const err=document.getElementById('welcome-error');
  if(v==='Naty'){ document.getElementById('welcome-overlay').style.display='none'; }
  else{
    err.textContent='❌ Identification incorrecte. Accès refusé.';
    const inp=document.getElementById('welcome-input');
    inp.classList.add('error'); inp.value='';
    setTimeout(()=>inp.classList.remove('error'),400);
  }
}
function toggleTheme(){
  const h=document.documentElement; const dark=h.getAttribute('data-theme')==='dark';
  h.setAttribute('data-theme',dark?'light':'dark');
  document.getElementById('theme-label').textContent=dark?'☀️ Light':'🌙 Dark';
}

// ============ AUTOCOMPLETE ============
function onCustomerInput(){
  updateFilename(); updateColorDisplay();
  const val=document.getElementById('info-customer').value.trim().toUpperCase();
  const list=document.getElementById('customer-autocomplete');
  if(!val){list.classList.remove('open');list.innerHTML='';return;}
  const matches=CUSTOMERS.filter(c=>c.toUpperCase().includes(val)).slice(0,8);
  if(!matches.length){list.classList.remove('open');list.innerHTML='';return;}
  list.innerHTML=matches.map(m=>'<div class="autocomplete-item" onclick="selectCustomer(\''+m.replace(/'/g,"\\'")+'\')">'+m+'</div>').join('');
  list.classList.add('open');
}
function selectCustomer(name){
  document.getElementById('info-customer').value=name;
  document.getElementById('customer-autocomplete').classList.remove('open');
  updateFilename(); applyDimModelByCustomer(name);
}
document.addEventListener('click',e=>{if(!e.target.closest('#customer-field-group'))document.getElementById('customer-autocomplete').classList.remove('open');});

// ============ APPLY MODELS ============
function applyDimModelByCustomer(name){
  const m=_db.dim_models.find(d=>d.name.toUpperCase()===name.toUpperCase()); if(!m)return;
  couleurs.forEach((_,ci)=>{ const p=document.getElementById('panel-'+ci); if(!p)return; p.querySelectorAll('.dim-L').forEach(e=>e.value=m.L); p.querySelectorAll('.dim-l').forEach(e=>e.value=m.l); p.querySelectorAll('.dim-h').forEach(e=>e.value=m.h); });
}
function applyDimModelToPanel(idx,modelName){ const m=_db.dim_models.find(d=>d.name===modelName); if(!m)return; const p=document.getElementById('panel-'+idx); if(!p)return; p.querySelectorAll('.dim-L').forEach(e=>e.value=m.L); p.querySelectorAll('.dim-l').forEach(e=>e.value=m.l); p.querySelectorAll('.dim-h').forEach(e=>e.value=m.h); }
function applyWPModelToPanel(idx,modelName){ const m=_db.weight_piece_models.find(d=>d.name===modelName); if(!m)return; const p=document.getElementById('panel-'+idx); if(!p)return; p.querySelectorAll('.size-w-piece').forEach(e=>e.value=m.wPiece); }
function applyWCModelToPanel(idx,modelName){ const m=_db.weight_carton_models.find(d=>d.name===modelName); if(!m)return; const p=document.getElementById('panel-'+idx); if(!p)return; p.querySelectorAll('.size-w-carton').forEach(e=>e.value=m.wCarton); }

function refreshAllPanelSelects(){
  couleurs.forEach((_,ci)=>{
    const dimSel=document.getElementById('dim-sel-'+ci);
    const wpSel=document.getElementById('wp-sel-'+ci);
    const wcSel=document.getElementById('wc-sel-'+ci);
    if(dimSel){ const v=dimSel.value; dimSel.innerHTML='<option value="">-- Manuel --</option>'+_db.dim_models.map(m=>'<option value="'+m.name+'">'+m.name+' ('+m.L+'×'+m.l+'×'+m.h+')</option>').join(''); if(v)dimSel.value=v; }
    if(wpSel){ const v=wpSel.value; wpSel.innerHTML='<option value="">-- Manuel --</option>'+_db.weight_piece_models.map(m=>'<option value="'+m.name+'">'+m.name+' ('+m.wPiece+'kg)</option>').join(''); if(v)wpSel.value=v; }
    if(wcSel){ const v=wcSel.value; wcSel.innerHTML='<option value="">-- Manuel --</option>'+_db.weight_carton_models.map(m=>'<option value="'+m.name+'">'+m.name+' ('+m.wCarton+'kg)</option>').join(''); if(v)wcSel.value=v; }
  });
}

// ============ MODE ============
function setMaxSizes(v,btn){ _maxSizes=v; document.querySelectorAll('.max-size-btn').forEach(b=>b.classList.remove('active')); btn.classList.add('active'); }
function toggleForceSingleCtn(){ _forceSingleCtn=!_forceSingleCtn; document.getElementById('toggle-force-ctn').classList.toggle('on',_forceSingleCtn); document.getElementById('tfc-badge').textContent=_forceSingleCtn?'ACTIVÉ':'DÉSACTIVÉ'; }
function selectMode(v){ document.querySelector('input[name="modeEmballage"][value="'+v+'"]').checked=true; document.getElementById('card-solid').classList.toggle('active',v==='strict_solide'); document.getElementById('card-mixed').classList.toggle('active',v==='mixte_autorise'); document.getElementById('max-sizes-row').classList.toggle('visible',v==='mixte_autorise'); }

// ============ REINIT ============
function reinitialiser(){
  if(!confirm('Réinitialiser tous les champs ?'))return;
  ['info-order','info-customer','info-po','info-ref-client','info-invoice','info-style','info-style-number','info-sku','info-yarn','info-composition','info-destination','info-address','info-pays','info-port-depart','info-port-arrivee','info-total-qty','info-filename','info-color-display'].forEach(id=>{ const el=document.getElementById(id); if(el)el.value=''; });
  selectMode('strict_solide'); _forceSingleCtn=false;
  document.getElementById('toggle-force-ctn').classList.remove('on'); document.getElementById('tfc-badge').textContent='DÉSACTIVÉ';
  document.getElementById('color-panels').innerHTML=''; couleurs=[]; activeCIdx=0; _allResults=[];
  initCouleurs();
  const rs=document.getElementById('result-section'); rs.innerHTML=''; rs.style.display='none';
  document.getElementById('btnExcel').style.display='none'; document.getElementById('btnPDF').style.display='none';
  calculerQty();
}

function updateFilename(){ const o=document.getElementById('info-order').value.trim(); const c=document.getElementById('info-customer').value.trim(); const p=document.getElementById('info-po').value.trim(); const s=document.getElementById('info-style').value.trim(); const q=document.getElementById('info-total-qty').value.replace(/[^0-9]/g,''); const parts=[o,c,p,s,q?q+'PCS':''].filter(Boolean); document.getElementById('info-filename').value=parts.length?'PACKING LIST '+parts.join(' '):''; }
function updateColorDisplay(){ document.getElementById('info-color-display').value=couleurs.map(c=>c.nom).filter(Boolean).join(', ')||''; }

// ============ COLORS ============
function initCouleurs(){ couleurs=[]; ajouterCouleur(); }
function ajouterCouleur(nom){ const i=couleurs.length; const src=i>0?getSrcData(0):null; couleurs.push({nom:nom||('COULEUR '+(i+1)),mode:'inherit'}); renderTabs(); appendPanel(i,src); setActive(i); updateColorDisplay(); }
function getSrcData(ci){ const p=document.getElementById('panel-'+ci); if(!p)return null; return{ names:Array.from(p.querySelectorAll('.size-name')).map(e=>e.value), caps:Array.from(p.querySelectorAll('.size-cap')).map(e=>e.value), wps:Array.from(p.querySelectorAll('.size-w-piece')).map(e=>e.value), wcs:Array.from(p.querySelectorAll('.size-w-carton')).map(e=>e.value), Ls:Array.from(p.querySelectorAll('.dim-L')).map(e=>e.value), ls:Array.from(p.querySelectorAll('.dim-l')).map(e=>e.value), hs:Array.from(p.querySelectorAll('.dim-h')).map(e=>e.value) }; }
function supprimerCouleur(){ if(couleurs.length<=1){alert("Minimum 1 couleur.");return;} couleurs.splice(activeCIdx,1); document.getElementById('color-panels').innerHTML=''; couleurs.forEach((_,i)=>appendPanel(i,null)); renderTabs(); setActive(Math.min(activeCIdx,couleurs.length-1)); updateColorDisplay(); }
function renderTabs(){ const el=document.getElementById('color-tabs'); el.innerHTML=''; couleurs.forEach((c,i)=>{ const t=document.createElement('div'); t.className='color-tab'+(i===activeCIdx?' active':''); t.innerHTML='<span class="tab-dot" style="background:'+PALETTE[i%PALETTE.length]+'"></span>'+c.nom; t.onclick=()=>setActive(i); el.appendChild(t); }); }
function setActive(i){ activeCIdx=i; document.querySelectorAll('.color-panel').forEach((p,j)=>p.classList.toggle('active',j===i)); renderTabs(); }

function appendPanel(idx,srcData){
  const color=PALETTE[idx%PALETTE.length]; const nom=couleurs[idx].nom;
  const d=document.createElement('div'); d.className='color-panel'+(idx===activeCIdx?' active':''); d.id='panel-'+idx;
  d.innerHTML=buildPanel(idx,color,nom,srcData);
  document.getElementById('color-panels').appendChild(d);
  d.querySelector('.cnm').addEventListener('input',function(){ couleurs[idx].nom=this.value.trim().toUpperCase()||('COULEUR '+(idx+1)); renderTabs(); calculerQty(); updateFilename(); updateColorDisplay(); });
  d.querySelectorAll('.size-qty,.size-cap').forEach(e=>e.addEventListener('input',calculerQty));
}

function buildPanel(idx,color,nom,srcData){
  const sizes=srcData?srcData.names:['XS','S','M','L','XL']; const n=sizes.length;
  const cvals=srcData?srcData.caps:Array(n).fill(25);
  const wpvals=srcData?srcData.wps:[0.250,0.270,0.300,0.320,0.350].slice(0,n);
  const wcvals=srcData?srcData.wcs:Array(n).fill(0.80);
  const Lvals=srcData?srcData.Ls:Array(n).fill(61);
  const lvals=srcData?srcData.ls:Array(n).fill(41);
  const hvals=srcData?srcData.hs:Array(n).fill(30);
  const qvals=Array(n).fill(0);
  const sizeHeaders=sizes.map(s=>'<th>'+s+'</th>').join('');
  function td_name(v){return '<td><input type="text" class="inp inp-name size-name" value="'+v+'"></td>';}
  function td_qty(v,cls){return '<td><input type="number" class="inp inp-qty '+cls+'" value="'+v+'" oninput="calculerQty()" placeholder="0"></td>';}
  function td_num(v,cls,step){return '<td><input type="number" step="'+step+'" class="inp inp-qty '+cls+'" value="'+v+'"></td>';}
  let r='<div class="color-name-row">'
    +'<div class="color-swatch" style="background:'+color+'"></div>'
    +'<input type="text" class="color-name-input cnm" value="'+nom+'" placeholder="NOM COULEUR">'
    +'<span style="font-size:11px;color:var(--text3);font-family:var(--mono);margin-left:8px;">→ onglet Excel</span>'
    +'</div>'
    +'<div class="per-color-mode-row"><span class="per-color-mode-label">Mode :</span>'
    +'<button class="per-color-mode-btn active-solid" id="pcm-solid-'+idx+'" onclick="setColorMode('+idx+',\'strict_solide\')">📦 SOLID</button>'
    +'<button class="per-color-mode-btn" id="pcm-mixed-'+idx+'" onclick="setColorMode('+idx+',\'mixte_autorise\')">🔀 MIXED</button>'
    +'<button class="per-color-mode-btn" id="pcm-inherit-'+idx+'" onclick="setColorMode('+idx+',\'inherit\')" style="border-color:var(--warn);color:var(--warn);">⚙️ Global</button>'
    +'</div>'
    +'<div class="models-apply-row">'
    +'<div class="models-apply-item"><span class="models-apply-label">📐 Dim:</span>'
    +'<select class="dim-model-select" id="dim-sel-'+idx+'" onchange="applyDimModelToPanel('+idx+',this.value)">'
    +'<option value="">-- Manuel --</option>'+_db.dim_models.map(m=>'<option value="'+m.name+'">'+m.name+'</option>').join('')+'</select></div>'
    +'<div class="models-apply-item"><span class="models-apply-label">⚖️ Poids Pce:</span>'
    +'<select class="dim-model-select" id="wp-sel-'+idx+'" onchange="applyWPModelToPanel('+idx+',this.value)" style="border-color:color-mix(in srgb,var(--warn) 50%,transparent);">'
    +'<option value="">-- Manuel --</option>'+_db.weight_piece_models.map(m=>'<option value="'+m.name+'">'+m.name+'</option>').join('')+'</select></div>'
    +'<div class="models-apply-item"><span class="models-apply-label">📦 Poids Ctn:</span>'
    +'<select class="dim-model-select" id="wc-sel-'+idx+'" onchange="applyWCModelToPanel('+idx+',this.value)" style="border-color:color-mix(in srgb,var(--accent2) 50%,transparent);">'
    +'<option value="">-- Manuel --</option>'+_db.weight_carton_models.map(m=>'<option value="'+m.name+'">'+m.name+'</option>').join('')+'</select></div>'
    +'</div>'
    +'<div class="table-wrap"><table class="input-table"><thead><tr><th style="text-align:left;padding-left:12px;">LIGNE</th>'+sizeHeaders+'</tr></thead><tbody>';
  r+='<tr id="rh-'+idx+'"><td class="row-label">Taille</td>'+sizes.map(s=>td_name(s)).join('')+'</tr>';
  r+='<tr id="rq-'+idx+'"><td class="row-label">QTY Totale</td>'+qvals.map(v=>td_qty(v,'size-qty')).join('')+'</tr>';
  r+='<tr id="rc-'+idx+'"><td class="row-label">Pièces / Carton</td>'+cvals.map(v=>td_num(v,'size-cap','1')).join('')+'</tr>';
  r+='<tr id="rbd-'+idx+'"><td class="row-label">Box Détail (✏️)</td>';
  sizes.forEach((_,si)=>{r+='<td><button class="btn-box-detail" onclick="openBoxModal('+idx+','+si+')" title="✏️">✏️</button></td>';});
  r+='</tr>';
  r+='<tr id="rwp-'+idx+'" style="display:none;"><td class="row-label">Poids Pièce (KG)</td>'+wpvals.map(v=>td_num(v,'size-w-piece','0.001')).join('')+'</tr>';
  r+='<tr id="rwc-'+idx+'" style="display:none;"><td class="row-label">Poids Carton Vide (KG)</td>'+wcvals.map(v=>td_num(v,'size-w-carton','0.01')).join('')+'</tr>';
  r+='<tr id="rd-'+idx+'" style="display:none;"><td class="row-label">Dimensions (cm)</td>';
  sizes.forEach((_,i)=>{r+='<td><input type="number" class="inp inp-cbm dim-L" value="'+Lvals[i]+'"><input type="number" class="inp inp-cbm dim-l" value="'+lvals[i]+'"><input type="number" class="inp inp-cbm dim-h" value="'+hvals[i]+'"></td>';});
  r+='</tr></tbody></table></div>';
  r+='<div class="actions-row" style="margin-top:12px;"><button class="btn btn-add" onclick="addTaille('+idx+')">＋ Taille</button><button class="btn btn-remove" onclick="delTaille('+idx+')">－ Taille</button></div>';
  return r;
}

function setColorMode(idx,mode){ couleurs[idx].mode=mode; ['solid','mixed','inherit'].forEach(m=>{const b=document.getElementById('pcm-'+m+'-'+idx);if(b)b.classList.remove('active-solid','active-mixed');}); const sb=document.getElementById('pcm-solid-'+idx),mb=document.getElementById('pcm-mixed-'+idx); if(mode==='strict_solide'&&sb)sb.classList.add('active-solid'); else if(mode==='mixte_autorise'&&mb)mb.classList.add('active-mixed'); }

function calculerQty(){ let t=0; document.querySelectorAll('.size-qty').forEach(i=>t+=parseInt(i.value)||0); document.getElementById('info-total-qty').value=t>0?t.toLocaleString('fr-FR')+' PCS':''; updateFilename(); }

function addTaille(ci){
  const rbd=document.getElementById('rbd-'+ci); if(rbd){const si=rbd.cells.length-1;rbd.insertAdjacentHTML('beforeend','<td><button class="btn-box-detail" onclick="openBoxModal('+ci+','+si+')">✏️</button></td>');}
  [['rh-'+ci,'<td><input type="text" class="inp inp-name size-name" value="TAILLE"></td>'],['rq-'+ci,'<td><input type="number" class="inp inp-qty size-qty" value="0" oninput="calculerQty()" placeholder="0"></td>'],['rc-'+ci,'<td><input type="number" class="inp inp-qty size-cap" value="25"></td>'],['rwp-'+ci,'<td><input type="number" step="0.001" class="inp inp-qty size-w-piece" value="0.250"></td>'],['rwc-'+ci,'<td><input type="number" step="0.01" class="inp inp-qty size-w-carton" value="0.80"></td>'],['rd-'+ci,'<td><input type="number" class="inp inp-cbm dim-L" value="61"><input type="number" class="inp inp-cbm dim-l" value="41"><input type="number" class="inp inp-cbm dim-h" value="30"></td>']].forEach(([id,html])=>{const el=document.getElementById(id);if(el)el.insertAdjacentHTML('beforeend',html);});
  calculerQty();
}
function delTaille(ci){ const r=document.getElementById('rh-'+ci); if(r.cells.length<=2){alert("Minimum 1 taille.");return;} ['rh-','rq-','rc-','rwp-','rwc-','rd-'].forEach(p=>{const el=document.getElementById(p+ci);if(el&&el.cells.length>2)el.removeChild(el.lastChild);}); const rbd=document.getElementById('rbd-'+ci); if(rbd&&rbd.cells.length>2)rbd.removeChild(rbd.lastChild); calculerQty(); }

// ============ BOX MODAL ============
function openBoxModal(ci,si){ _boxModalCtx={ci,si}; const p=document.getElementById('panel-'+ci); const names=p.querySelectorAll('.size-name'); document.getElementById('bm-size-label').textContent=names[si]?names[si].value:'?'; const wps=p.querySelectorAll('.size-w-piece'),wcs=p.querySelectorAll('.size-w-carton'),Ls=p.querySelectorAll('.dim-L'),ls=p.querySelectorAll('.dim-l'),hs=p.querySelectorAll('.dim-h'); document.getElementById('bm-wpiece').value=wps[si]?wps[si].value:''; document.getElementById('bm-wcarton').value=wcs[si]?wcs[si].value:''; document.getElementById('bm-dimL').value=Ls[si]?Ls[si].value:''; document.getElementById('bm-diml').value=ls[si]?ls[si].value:''; document.getElementById('bm-dimh').value=hs[si]?hs[si].value:''; document.getElementById('box-modal-overlay').classList.add('open'); }
function closeBoxModal(){ document.getElementById('box-modal-overlay').classList.remove('open'); _boxModalCtx=null; }
function saveBoxModal(){ if(!_boxModalCtx)return; const{ci,si}=_boxModalCtx; const p=document.getElementById('panel-'+ci); const wps=p.querySelectorAll('.size-w-piece'),wcs=p.querySelectorAll('.size-w-carton'),Ls=p.querySelectorAll('.dim-L'),ls=p.querySelectorAll('.dim-l'),hs=p.querySelectorAll('.dim-h'); if(wps[si])wps[si].value=document.getElementById('bm-wpiece').value; if(wcs[si])wcs[si].value=document.getElementById('bm-wcarton').value; if(Ls[si])Ls[si].value=document.getElementById('bm-dimL').value; if(ls[si])ls[si].value=document.getElementById('bm-diml').value; if(hs[si])hs[si].value=document.getElementById('bm-dimh').value; closeBoxModal(); }

// ============ READ PANEL ============
function lirePanel(ci){ const p=document.getElementById('panel-'+ci); const names=p.querySelectorAll('.size-name'),qtys=p.querySelectorAll('.size-qty'),caps=p.querySelectorAll('.size-cap'),wps=p.querySelectorAll('.size-w-piece'),wcs=p.querySelectorAll('.size-w-carton'),Ls=p.querySelectorAll('.dim-L'),ls=p.querySelectorAll('.dim-l'),hs=p.querySelectorAll('.dim-h'); let tailles=[],donnees={}; for(let i=0;i<names.length;i++){ let n=(names[i].value.trim().toUpperCase())||'?'; let L=parseFloat(Ls[i]?Ls[i].value:0)||0,l2=parseFloat(ls[i]?ls[i].value:0)||0,h=parseFloat(hs[i]?hs[i].value:0)||0; tailles.push(n); donnees[n]={qtyTot:parseInt(qtys[i].value)||0,cap:parseInt(caps[i].value)||1,wPiece:parseFloat(wps[i]?wps[i].value:0)||0,wCarton:parseFloat(wcs[i]?wcs[i].value:0)||0,cbmUnit:(L*l2*h)/1000000,restes:0,dimL:L,diml:l2,dimH:h}; } return{tailles,donnees}; }

// ============ GENERATE ============
function generer(){
  const globalMode=document.querySelector('input[name="modeEmballage"]:checked').value;
  const rs=document.getElementById('result-section'); rs.innerHTML=''; _allResults=[];
  const G=id=>document.getElementById(id).value.trim();
  const meta={order:G('info-order'),customer:G('info-customer'),po:G('info-po'),refClient:G('info-ref-client'),invoice:G('info-invoice'),style:G('info-style'),styleNumber:G('info-style-number'),sku:G('info-sku'),yarn:G('info-yarn'),composition:G('info-composition'),destination:G('info-destination'),address:G('info-address'),pays:G('info-pays'),portDepart:G('info-port-depart'),portArrivee:G('info-port-arrivee'),qty:document.getElementById('info-total-qty').value};
  _lastMeta=meta;
  couleurs.forEach((coul,ci)=>{ const{tailles,donnees}=lirePanel(ci); const color=PALETTE[ci%PALETTE.length]; let mode=coul.mode==='inherit'?globalMode:coul.mode; rs.insertAdjacentHTML('beforeend',buildResultSection(coul.nom,ci,tailles,donnees,mode,color,meta)); _allResults.push({nom:coul.nom,color,tailles,donnees,statsData:null,mode}); setTimeout(()=>{ document.querySelectorAll('#rb-'+ci+' .editable-cell').forEach(e=>e.addEventListener('input',()=>recalc(ci,tailles,donnees))); recalc(ci,tailles,donnees); },0); });
  if(couleurs.length>1) setTimeout(()=>buildCombinedPL(globalMode,meta),80);
  else setTimeout(()=>buildBreakdownForSingle(0,meta),150);
  rs.style.display='block'; document.getElementById('btnExcel').style.display='flex'; document.getElementById('btnPDF').style.display='flex';
  rs.scrollIntoView({behavior:'smooth',block:'start'});
}

// ============ BUILD BODY ============
function buildBodyWithColor(nom,ci,tailles,donnees,mode,color){
  let body='',num=1,restes=[];
  const colorCell='<td class="color-stripe-cell" style="color:'+color+';background:color-mix(in srgb,'+color+' 12%,transparent);">'+nom+'</td>';
  const skuVal=document.getElementById('info-sku').value.trim();
  const skuCell='<td class="td-sku">'+skuVal+'</td>';

  if(_forceSingleCtn){
    body+='<tr class="row-data solid-row" data-type="solid" data-nbr="1"><td><b>1-1</b></td>'+colorCell+skuCell;
    tailles.forEach(t=>{const q=donnees[t].qtyTot;body+='<td>'+(q>0?'<b>'+q+'</b>':'')+'</td>';});
    body+='<td class="ctc"></td><td><b>1</b></td><td class="ctp"></td><td class="cnw"></td><td class="cgw"></td><td class="ccb"></td></tr>';
    body+='<tr class="total-row"><td>TOTALE</td><td>'+nom+'</td><td>—</td>';
    tailles.forEach(t=>{body+='<td id="tt-'+ci+'-'+t+'">0</td>';});
    body+='<td>—</td><td id="tt-'+ci+'-c">0</td><td id="tt-'+ci+'-p">0</td><td id="tt-'+ci+'-n">0.00</td><td id="tt-'+ci+'-g">0.00</td><td id="tt-'+ci+'-v">0.0000</td></tr>';
    return body;
  }

  tailles.forEach(t=>{
    const qtyTot=donnees[t].qtyTot,cap=donnees[t].cap;
    if(qtyTot<=0){donnees[t].restes=0;return;}
    if(mode==='mixte_autorise'){
      const n=Math.floor(qtyTot/cap),reste=qtyTot%cap; donnees[t].restes=reste;
      if(n>0){ body+='<tr class="row-data solid-row" data-type="solid" data-nbr="'+n+'"><td><b>'+num+'-'+(num+n-1)+'</b></td>'+colorCell+skuCell; tailles.forEach(tc=>{body+='<td>'+(tc===t?'<b>'+cap+'</b>':'')+'</td>';}); body+='<td class="ctc"></td><td><b>'+n+'</b></td><td class="ctp"></td><td class="cnw"></td><td class="cgw"></td><td class="ccb"></td></tr>'; num+=n; }
      if((n===0?qtyTot:reste)>0) restes.push({taille:t,qte:n===0?qtyTot:reste,cap});
    } else {
      if(qtyTot<cap){ donnees[t].restes=0; body+='<tr class="row-data solid-row" data-type="solid" data-nbr="1"><td><b>'+num+'-'+num+'</b></td>'+colorCell+skuCell; tailles.forEach(tc=>{body+='<td>'+(tc===t?'<b>'+qtyTot+'</b>':'')+'</td>';}); body+='<td class="ctc"></td><td><b>1</b></td><td class="ctp"></td><td class="cnw"></td><td class="cgw"></td><td class="ccb"></td></tr>'; num++;return; }
      const n=Math.floor(qtyTot/cap); donnees[t].restes=qtyTot%cap;
      if(n>0){ body+='<tr class="row-data solid-row" data-type="solid" data-nbr="'+n+'"><td><b>'+num+'-'+(num+n-1)+'</b></td>'+colorCell+skuCell; tailles.forEach(tc=>{body+='<td>'+(tc===t?'<b>'+cap+'</b>':'')+'</td>';}); body+='<td class="ctc"></td><td><b>'+n+'</b></td><td class="ctp"></td><td class="cnw"></td><td class="cgw"></td><td class="ccb"></td></tr>'; num+=n; }
      if(donnees[t].restes>0){ body+='<tr class="row-data solid-row" data-type="solid_reste" data-nbr="1"><td><b>'+num+'-'+num+'</b></td>'+colorCell+skuCell; tailles.forEach(tc=>{body+='<td>'+(tc===t?'<b>'+donnees[t].restes+'</b>':'')+'</td>';}); body+='<td class="ctc"></td><td><b>1</b></td><td class="ctp"></td><td class="cnw"></td><td class="cgw"></td><td class="ccb"></td></tr>'; num++; }
    }
  });

  if(mode==='mixte_autorise'&&restes.length>0){
    while(restes.length>0){
      restes.sort((a,b)=>b.qte-a.qte); const fixedCap=Math.max(...restes.slice(0,_maxSizes).map(r=>r.cap)); let selected=[],pcsInCtn=0;
      for(let i=0;i<restes.length&&selected.length<_maxSizes;i++){const item=restes[i];if(pcsInCtn+item.qte<=fixedCap){selected.push({...item});pcsInCtn+=item.qte;}}
      if(!selected.length)selected.push({...restes[0]});
      selected.forEach(sel=>{const idx=restes.findIndex(r=>r.taille===sel.taille);if(idx>=0)restes.splice(idx,1);});
      let pdc={};tailles.forEach(t=>pdc[t]=0);selected.forEach(s=>pdc[s.taille]=s.qte);
      body+='<tr class="row-data mixed-row" data-type="mixed" data-nbr="1"><td><b>'+num+'-'+num+'</b></td>'+colorCell+skuCell;
      tailles.forEach(t=>{body+='<td><input type="number" class="editable-cell" data-taille="'+t+'" value="'+(pdc[t]||'')+'"></td>';});
      body+='<td class="ctc"></td><td><b>1</b></td><td class="ctp"></td><td class="cnw"></td><td class="cgw"></td><td class="ccb"></td></tr>'; num++;
    }
  }
  body+='<tr class="total-row"><td>TOTALE</td><td style="font-size:10px;font-weight:700;">'+nom+'</td><td>—</td>';
  tailles.forEach(t=>{body+='<td id="tt-'+ci+'-'+t+'">0</td>';});
  body+='<td>—</td><td id="tt-'+ci+'-c">0</td><td id="tt-'+ci+'-p">0</td><td id="tt-'+ci+'-n">0.00</td><td id="tt-'+ci+'-g">0.00</td><td id="tt-'+ci+'-v">0.0000</td></tr>';
  return body;
}

function buildResultSection(nom,ci,tailles,donnees,mode,color,meta){
  const body=buildBodyWithColor(nom,ci,tailles,donnees,mode,color);
  let hdr='<tr><th style="text-align:left;padding-left:14px;border-left:3px solid '+color+';">PACKING N°</th>';
  hdr+='<th style="background:color-mix(in srgb,'+color+' 20%,var(--surface2));color:'+color+';">COLOR</th>';
  hdr+='<th class="th-sku">SKU</th>';
  tailles.forEach(t=>{hdr+='<th>'+t+'</th>';});
  hdr+='<th>PCS/CTN</th><th>NB CTN</th><th>TOTAL QTY</th><th class="th-net">NET WEIGHT</th><th class="th-gross">GROSS WEIGHT</th><th>CBM m³</th></tr>';
  const modeAlert=mode==='strict_solide'?'<div class="info-alert solid">🔒 <b>SOLID PACK STRICT</b></div>':'<div class="info-alert mixed">🔀 <b>MIXED PACK AUTORISÉ (max '+_maxSizes+' tailles)</b></div>';
  const pdfHeader='<div class="pdf-doc-header" style="display:none;"><h1>PL '+meta.customer+' '+meta.order+'</h1><div class="pdf-info-block">'
    +(meta.invoice?'<b>INVOICE N° :</b> '+meta.invoice+'<br>':'')
    +(meta.refClient?'<b>Ref Client :</b> '+meta.refClient+'<br>':'')
    +'<b>Mers :</b><br>'+meta.customer+(meta.address?'<br>'+meta.address:'')+(meta.destination?'<br>'+meta.destination:'')+(meta.pays?'<br>'+meta.pays:'')
    +(meta.portDepart?'<br><b>Port Départ :</b> '+meta.portDepart:'')+(meta.portArrivee?'<br><b>Port Arrivée :</b> '+meta.portArrivee:'')
    +(meta.sku?'<br><b>SKU :</b> '+meta.sku:'')+(meta.yarn?'<br><b>Yarn :</b> '+meta.yarn:'')+(meta.composition?'<br><b>Composition :</b> '+meta.composition:'')
    +'</div></div>';
  return '<div class="card result-card" id="rs-'+ci+'" style="margin-bottom:4px;">'
    +pdfHeader
    +'<div class="result-color-title"><span class="dot-color" style="background:'+color+'"></span>PACKING LIST — '+nom+'</div>'
    +'<div class="order-meta">'
    +'<span>📋 Order: <b>'+meta.order+'</b></span>'
    +(meta.refClient?'<span>🔖 Ref: <b>'+meta.refClient+'</b></span>':'')
    +(meta.style?'<span>🏷️ <b>'+meta.style+'</b></span>':'')
    +(meta.sku?'<span>🔑 SKU: <b>'+meta.sku+'</b></span>':'')
    +'<span>👤 <b>'+meta.customer+'</b></span>'
    +'<span>PO#: <b>'+meta.po+'</b></span>'
    +(meta.invoice?'<span>Invoice: <b>'+meta.invoice+'</b></span>':'')
    +(meta.yarn?'<span>🧶 <b>'+meta.yarn+'</b></span>':'')
    +(meta.composition?'<span>🧪 <b>'+meta.composition+'</b></span>':'')
    +(meta.destination?'<span>✈️ <b>'+meta.destination+'</b></span>':'')
    +(meta.portDepart?'<span>🚢 From: <b>'+meta.portDepart+'</b></span>':'')
    +(meta.portArrivee?'<span>🏁 To: <b>'+meta.portArrivee+'</b></span>':'')
    +'<span>📦 <b>'+meta.qty+'</b></span>'
    +'</div>'
    +modeAlert
    +'<div class="stats-bar" id="sb-'+ci+'"></div>'
    +'<div class="table-wrap"><table class="result-table"><thead>'+hdr+'</thead><tbody id="rb-'+ci+'">'+body+'</tbody></table></div>'
    +'</div>';
}

// ============ RECALC ============
function recalc(ci,tailles,donnees){
  const tbody=document.getElementById('rb-'+ci); if(!tbody)return;
  const rows=tbody.querySelectorAll('.row-data');
  let tot={c:0,p:0,n:0,g:0,v:0}; tailles.forEach(t=>tot[t]=0);
  rows.forEach(row=>{
    let nbr=parseInt(row.getAttribute('data-nbr'))||0; let solid=['solid','solid_reste'].includes(row.getAttribute('data-type')); let pcs=0,net=0,wv=0,cbm=0;
    tailles.forEach((t,i)=>{ let q=0; if(solid)q=parseInt(row.cells[i+3].innerText.trim())||0; else{let inp=row.querySelector('[data-taille="'+t+'"]');q=inp?(parseInt(inp.value)||0):0;} if(q>0){if(donnees[t].wCarton>wv)wv=donnees[t].wCarton;if(donnees[t].cbmUnit>cbm)cbm=donnees[t].cbmUnit;} pcs+=q;net+=q*donnees[t].wPiece;tot[t]+=q*nbr; });
    let tp=pcs*nbr,tn=net*nbr,tg=tn+wv*nbr,tv=cbm*nbr;
    row.querySelector('.ctc').innerHTML='<b>'+(pcs||'')+'</b>'; row.querySelector('.ctp').innerHTML='<b>'+(tp||'')+'</b>'; row.querySelector('.cnw').innerHTML='<b class="td-net">'+tn.toFixed(2)+'</b>'; row.querySelector('.cgw').innerHTML='<b class="td-gross">'+tg.toFixed(2)+'</b>'; row.querySelector('.ccb').innerHTML='<b>'+tv.toFixed(4)+'</b>';
    tot.c+=nbr;tot.p+=tp;tot.n+=tn;tot.g+=tg;tot.v+=tv;
  });
  tailles.forEach(t=>{const e=document.getElementById('tt-'+ci+'-'+t);if(e)e.textContent=tot[t];});
  [['c',tot.c],['p',tot.p],['n',tot.n.toFixed(2)],['g',tot.g.toFixed(2)],['v',tot.v.toFixed(4)]].forEach(([k,v])=>{const e=document.getElementById('tt-'+ci+'-'+k);if(e)e.textContent=v;});
  const sb=document.getElementById('sb-'+ci);
  if(sb)sb.innerHTML='<div class="stat-chip"><span class="stat-label">Cartons</span><span class="stat-value c-accent">'+tot.c+'</span></div><div class="stat-chip"><span class="stat-label">Pièces</span><span class="stat-value c-green">'+tot.p.toLocaleString('fr-FR')+'</span></div><div class="stat-chip"><span class="stat-label">NET KG</span><span class="stat-value c-warn">'+tot.n.toFixed(2)+'</span></div><div class="stat-chip"><span class="stat-label">GROSS KG</span><span class="stat-value c-warn">'+tot.g.toFixed(2)+'</span></div><div class="stat-chip"><span class="stat-label">CBM m³</span><span class="stat-value c-purple">'+tot.v.toFixed(4)+'</span></div>';
  if(_allResults[ci])_allResults[ci].statsData=tot;
  if(_allResults.length>1)setTimeout(()=>rebuildCombinedPL(),20);
  if(_allResults.length===1)setTimeout(()=>buildBreakdownForSingle(0,_lastMeta||{}),30);
}

// ============ BREAKDOWN ============
function buildBreakdownHTML(allTailles,colorData,meta,grandTot){
  const style=meta.style||'',po=meta.po||'',sku=meta.sku||'';
  let tblHdr='<thead><tr><th style="text-align:left;padding-left:10px;">COLOR/SIZE</th>';
  allTailles.forEach(t=>tblHdr+='<th>'+t+'</th>');
  tblHdr+='<th>TTL</th></tr></thead>';
  let tblBody='<tbody>',totBySize={},grandPcs=0;
  allTailles.forEach(t=>totBySize[t]=0);
  colorData.forEach(({nom,color,tailles,donnees,statsData})=>{
    let rowTotal=0,sizeVals={};allTailles.forEach(t=>sizeVals[t]=0);
    if(statsData){tailles.forEach(t=>{sizeVals[t]=statsData[t]||0;totBySize[t]=(totBySize[t]||0)+(statsData[t]||0);rowTotal+=statsData[t]||0;});}
    grandPcs+=rowTotal;
    tblBody+='<tr><td class="bk-color-cell" style="background:color-mix(in srgb,'+color+' 15%,transparent);color:'+color+';font-weight:700;">'+nom+'</td>';
    allTailles.forEach(t=>tblBody+='<td>'+(sizeVals[t]||'')+'</td>');
    tblBody+='<td><b>'+rowTotal+'</b></td></tr>';
  });
  tblBody+='<tr class="bk-ttl-row"><td class="bk-color-cell"><b>TTL</b></td>';
  allTailles.forEach(t=>tblBody+='<td><b>'+(totBySize[t]||0)+'</b></td>');
  tblBody+='<td><b>'+grandPcs+'</b></td></tr></tbody>';
  let cartonSize='',cbmTotal=0;
  if(colorData.length>0){const d=colorData[0].donnees,t0=colorData[0].tailles[0];if(t0&&d[t0]){const L=d[t0].dimL||0,l=d[t0].diml||0,h=d[t0].dimH||0;if(L&&l&&h)cartonSize=L+' X '+l+' X '+h+' CM';}colorData.forEach(r=>{if(r.statsData)cbmTotal+=r.statsData.v||0;});}
  const summary='<div class="breakdown-summary">'
    +'<div class="breakdown-kv"><span class="bk-key">N° OF QTY :</span><span class="bk-val">'+grandPcs+'</span></div>'
    +'<div class="breakdown-kv"><span class="bk-key">N° OF CNTS :</span><span class="bk-val">'+(grandTot.c||0)+'</span></div>'
    +'<div class="breakdown-kv"><span class="bk-key">N.W (kg) :</span><span class="bk-val">'+((grandTot.n||0).toFixed(2))+'</span></div>'
    +'<div class="breakdown-kv"><span class="bk-key">GW (kg) :</span><span class="bk-val">'+((grandTot.g||0).toFixed(2))+'</span></div>'
    +(cartonSize?'<div class="breakdown-kv"><span class="bk-key">Carton Size (CM)</span><span class="bk-val">'+cartonSize+'</span></div>':'')
    +'<div class="breakdown-kv"><span class="bk-key">CBM (m3) :</span><span class="bk-val">'+cbmTotal.toFixed(3)+'</span></div>'
    +(sku?'<div class="breakdown-kv"><span class="bk-key">SKU :</span><span class="bk-val">'+sku+'</span></div>':'')
    +'</div>';
  // Dim table — écran uniquement, masquée en PDF par défaut (pas cochée dans sélecteur)
  let dimHTML='<div class="dim-section" style="margin-top:12px;"><div class="dim-title" style="background:#f6e05e;color:#1a1a1a;font-family:var(--mono);font-size:13px;font-weight:700;padding:10px 16px;border-radius:8px 8px 0 0;letter-spacing:1px;border:2px solid #d4b800;">STYLE/COLOR WEIGHT & DIMENSION</div>'
    +'<table style="width:100%;border-collapse:collapse;font-family:var(--mono);font-size:12px;border:2px solid #d4b800;border-top:none;"><thead><tr>'
    +'<th style="background:#fffde7;color:#7B6000;font-size:10px;text-transform:uppercase;padding:8px 10px;text-align:center;border:1px solid #d4b800;font-weight:700;letter-spacing:1px;">COLOR</th>'
    +'<th style="background:#fffde7;color:#7B6000;font-size:10px;text-transform:uppercase;padding:8px 10px;text-align:center;border:1px solid #d4b800;font-weight:700;letter-spacing:1px;">SIZE</th>'
    +'<th style="background:#fffde7;color:#7B6000;font-size:10px;text-transform:uppercase;padding:8px 10px;text-align:center;border:1px solid #d4b800;font-weight:700;letter-spacing:1px;">LENGTH</th>'
    +'<th style="background:#fffde7;color:#7B6000;font-size:10px;text-transform:uppercase;padding:8px 10px;text-align:center;border:1px solid #d4b800;font-weight:700;letter-spacing:1px;">WIDTH</th>'
    +'<th style="background:#fffde7;color:#7B6000;font-size:10px;text-transform:uppercase;padding:8px 10px;text-align:center;border:1px solid #d4b800;font-weight:700;letter-spacing:1px;">HEIGHT</th>'
    +'<th style="background:#fffde7;color:#7B6000;font-size:10px;text-transform:uppercase;padding:8px 10px;text-align:center;border:1px solid #d4b800;font-weight:700;letter-spacing:1px;">WEIGHT (oz)</th>'
    +'</tr></thead><tbody>';
  colorData.forEach(({nom,tailles,donnees})=>{tailles.forEach(t=>{const d=donnees[t];if(!d)return;const wOz=d.wPiece?(d.wPiece*35.274).toFixed(2):'-';dimHTML+='<tr><td style="padding:7px 10px;text-align:center;border:1px solid #ddd;">'+nom+'</td><td style="padding:7px 10px;text-align:center;border:1px solid #ddd;">'+t+'</td><td style="padding:7px 10px;text-align:center;border:1px solid #ddd;">'+(d.dimL||'-')+' cm</td><td style="padding:7px 10px;text-align:center;border:1px solid #ddd;">'+(d.diml||'-')+' cm</td><td style="padding:7px 10px;text-align:center;border:1px solid #ddd;">'+(d.dimH||'-')+' cm</td><td style="padding:7px 10px;text-align:center;border:1px solid #ddd;">'+wOz+' oz</td></tr>';});});
  dimHTML+='</tbody></table></div>';
  return '<div class="breakdown-section"><div class="breakdown-title">COLOR/SIZE BREAKDOWN'+(style?' &nbsp;—&nbsp; STYLE: '+style+(po?' &nbsp; PO#'+po:''):'')+(sku?' &nbsp; SKU: '+sku:'')+'</div>'
    +'<table class="breakdown-table">'+tblHdr+tblBody+'</table>'+summary+dimHTML+'</div>';
}

function buildBreakdownForSingle(ci,meta){ _lastMeta=meta; const res=_allResults[ci];if(!res)return; const rsCard=document.getElementById('rs-'+ci);if(!rsCard)return; const old=rsCard.querySelector('.breakdown-section');if(old)old.remove(); const gt={n:res.statsData?res.statsData.n:0,g:res.statsData?res.statsData.g:0,c:res.statsData?res.statsData.c:0,v:res.statsData?res.statsData.v:0}; rsCard.insertAdjacentHTML('beforeend',buildBreakdownHTML(res.tailles,[res],meta,gt)); }

// ============ COMBINED PL ============
function buildCombinedPL(mode,meta){
  _lastMeta=meta;
  let allTailles=[];_allResults.forEach(r=>{r.tailles.forEach(t=>{if(!allTailles.includes(t))allTailles.push(t);});});
  let legendHtml='<div class="color-legend"><span style="font-family:var(--mono);font-size:11px;color:var(--text2);margin-right:4px;">LÉGENDE:</span>';
  _allResults.forEach(r=>{legendHtml+='<span class="legend-item"><span class="legend-dot" style="background:'+r.color+'"></span>'+r.nom+'</span>';});
  legendHtml+='</div>';
  let hdr='<tr><th style="text-align:left;padding-left:14px;">PACKING N°</th><th>COLOR</th><th class="th-sku">SKU</th>';
  allTailles.forEach(t=>hdr+='<th>'+t+'</th>');
  hdr+='<th>PCS/CTN</th><th>NB CTN</th><th>TOTAL QTY</th><th class="th-net">NET WEIGHT</th><th class="th-gross">GROSS WEIGHT</th><th>CBM m³</th></tr>';
  let combinedBody='',grandTot={c:0,p:0,n:0,g:0,v:0},globalCartonNum=1;
  allTailles.forEach(t=>grandTot[t]=0);
  const isDark=document.documentElement.getAttribute('data-theme')==='dark';
  const skuVal=document.getElementById('info-sku').value.trim();
  _allResults.forEach((res,ci)=>{
    const{nom,tailles,donnees,color}=res;
    const rowBg=isDark?COLOR_BG_DARK[ci%COLOR_BG_DARK.length]:COLOR_BG_LIGHT[ci%COLOR_BG_LIGHT.length];
    const tbody=document.getElementById('rb-'+ci);if(!tbody)return;
    const rows=tbody.querySelectorAll('.row-data');
    rows.forEach(row=>{
      let nbr=parseInt(row.getAttribute('data-nbr'))||0,solid=['solid','solid_reste'].includes(row.getAttribute('data-type')),isMixed=row.getAttribute('data-type')==='mixed',sizeVals={};
      tailles.forEach((t,i)=>{let q=0;if(solid)q=parseInt(row.cells[i+3].innerText.trim())||0;else{let inp=row.querySelector('[data-taille="'+t+'"]');q=inp?(parseInt(inp.value)||0):0;}sizeVals[t]=q;});
      let pcs=0,net=0,wv=0,cbm=0;tailles.forEach(t=>{let q=sizeVals[t]||0;if(q>0){if(donnees[t].wCarton>wv)wv=donnees[t].wCarton;if(donnees[t].cbmUnit>cbm)cbm=donnees[t].cbmUnit;}pcs+=q;net+=q*donnees[t].wPiece;});
      let tp=pcs*nbr,tn=net*nbr,tg=tn+wv*nbr,tv=cbm*nbr,plage=globalCartonNum+'-'+(globalCartonNum+nbr-1);
      globalCartonNum+=nbr;
      combinedBody+='<tr class="row-data '+(isMixed?'mixed-row':'solid-row')+'" style="background:'+rowBg+';">'
        +'<td style="background:'+rowBg+';"><b>'+plage+'</b></td>'
        +'<td class="color-stripe-cell" style="color:'+color+';background:color-mix(in srgb,'+color+' 18%,transparent);">'+nom+'</td>'
        +'<td class="td-sku">'+skuVal+'</td>';
      allTailles.forEach(t=>{let v=sizeVals[t]||'';combinedBody+='<td style="background:'+rowBg+';">'+(v?'<b>'+v+'</b>':'')+'</td>';});
      combinedBody+='<td style="background:'+rowBg+';"><b>'+(pcs||'')+'</b></td><td style="background:'+rowBg+';"><b>'+nbr+'</b></td><td style="background:'+rowBg+';"><b>'+(tp||'')+'</b></td>'
        +'<td style="background:'+rowBg+';"><b class="td-net">'+tn.toFixed(2)+'</b></td><td style="background:'+rowBg+';"><b class="td-gross">'+tg.toFixed(2)+'</b></td><td style="background:'+rowBg+';">'+tv.toFixed(4)+'</td></tr>';
      grandTot.c+=nbr;grandTot.p+=tp;grandTot.n+=tn;grandTot.g+=tg;grandTot.v+=tv;
      allTailles.forEach(t=>{grandTot[t]+=(sizeVals[t]||0)*nbr;});
    });
  });
  combinedBody+='<tr class="total-row"><td>GRAND TOTAL</td><td>ALL</td><td>—</td>';
  allTailles.forEach(t=>combinedBody+='<td>'+grandTot[t]+'</td>');
  combinedBody+='<td>—</td><td>'+grandTot.c+'</td><td>'+grandTot.p+'</td><td><b class="td-net">'+grandTot.n.toFixed(2)+'</b></td><td><b class="td-gross">'+grandTot.g.toFixed(2)+'</b></td><td>'+grandTot.v.toFixed(4)+'</td></tr>';
  const rs=document.getElementById('result-section'),old=document.getElementById('combined-pl-section');if(old)old.remove();
  const bkHtml=buildBreakdownHTML(allTailles,_allResults,meta,grandTot);
  rs.insertAdjacentHTML('beforeend','<div class="card combined-pl-wrapper" id="combined-pl-section">'
    +'<div class="combined-pl-title">📁 COMBINED PACKING LIST — TOUTES LES COULEURS ('+_allResults.length+')</div>'
    +'<div class="order-meta"><span>📋 <b>'+(meta.order||'—')+'</b></span><span>👤 <b>'+(meta.customer||'—')+'</b></span><span>PO: <b>'+(meta.po||'—')+'</b></span>'+(meta.sku?'<span>SKU: <b>'+meta.sku+'</b></span>':'')+(meta.destination?'<span>✈️ <b>'+meta.destination+'</b></span>':'')+'<span>📦 TOTAL: <b>'+grandTot.p.toLocaleString('fr-FR')+' PCS</b></span><span>Cartons: <b>'+grandTot.c+'</b></span></div>'
    +legendHtml
    +'<div class="table-wrap"><table class="result-table"><thead>'+hdr+'</thead><tbody>'+combinedBody+'</tbody></table></div>'
    +bkHtml+'</div>');
}
function rebuildCombinedPL(){ const old=document.getElementById('combined-pl-section');if(old)old.remove(); if(_allResults.length>1){const mode=document.querySelector('input[name="modeEmballage"]:checked').value;buildCombinedPL(mode,_lastMeta||{});} }

// ============ COLLECT ROWS ============
function collectRows(ci,tailles,donnees){ const rows=document.querySelectorAll('#rb-'+ci+' .row-data'); return Array.from(rows).map(row=>{let nbr=parseInt(row.getAttribute('data-nbr'))||0,solid=['solid','solid_reste'].includes(row.getAttribute('data-type')),sizes={},pcs=0,net=0,wv=0,cbm=0;tailles.forEach((t,i)=>{let q=0;if(solid)q=parseInt(row.cells[i+3].innerText.trim())||0;else{let inp=row.querySelector('[data-taille="'+t+'"]');q=inp?(parseInt(inp.value)||0):0;}sizes[t]=q;pcs+=q;net+=q*donnees[t].wPiece;if(q>0){if(donnees[t].wCarton>wv)wv=donnees[t].wCarton;if(donnees[t].cbmUnit>cbm)cbm=donnees[t].cbmUnit;}});let tp=pcs*nbr,tn=net*nbr,tg=tn+wv*nbr,tv=cbm*nbr;return{carton:row.cells[0].innerText.trim(),nbr,sizes,pcs,tp,net:tn,gross:tg,cbm:tv};}); }