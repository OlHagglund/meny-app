import './style.css'

/* ===== LocalStorage ===== */
const KEY = 'shopping-list-v1'
function loadList(){ try{ return JSON.parse(localStorage.getItem(KEY)) || [] }catch{ return [] } }
function saveList(list){ localStorage.setItem(KEY, JSON.stringify(list)) }

/* ===== Toast ===== */
function showToast(msg) {
  let toast = document.querySelector('.toast')
  if (!toast) {
    toast = document.createElement('div')
    toast.className = 'toast'
    document.body.appendChild(toast)
  }
  toast.textContent = msg
  toast.classList.remove('show'); void toast.offsetWidth
  toast.classList.add('show')
  setTimeout(() => toast.classList.remove('show'), 2000)
}

/* ===== Kategorisering ===== */
const CATS = [
  { id:'GRO', name:'Grönt' },
  { id:'MEJ', name:'Mejeri' },
  { id:'KOF', name:'Kött & Fisk' },
  { id:'SKA', name:'Skafferi' },
  { id:'BRO', name:'Bröd' },
  { id:'FRY', name:'Fryst' },
  { id:'OVR', name:'Övrigt' },
]
const ORDER = [...CATS.map(c=>c.id)]
const catName = (id)=>(CATS.find(c=>c.id===id)||{name:'Övrigt'}).name

function guessCategory(name){
  const s = name.toLowerCase()
  const has = (arr)=>arr.some(w=>s.includes(w))
  if (has(['tomat','gurka','sallad','paprika','lök','morot','potatis','äpple','citron','avokado','spenat','kål'])) return 'GRO'
  if (has(['mjölk','grädde','yoghurt','kvarg','smör','ost','creme fraiche','parmesan','mozzarella'])) return 'MEJ'
  if (has(['kyckling','färs','nötfärs','kött','fläsk','bacon','lax','torsk','fisk','räkor','korv'])) return 'KOF'
  if (has(['pasta','ris','krossade tomater','tomatpuré','bönor','linser','olja','vinäger','socker','salt','peppar','krydda','buljong','mjöl'])) return 'SKA'
  if (has(['bröd','tortilla','tortillas','pitabröd','hamburgerbröd','korvbröd'])) return 'BRO'
  if (has(['fryst','fryspizza','ärtor (frysta)','broccoli (fryst)'])) return 'FRY'
  return 'OVR'
}

/* ===== UI ===== */
const app = document.querySelector('#app')
app.innerHTML = `
  <header>
    <div class="head">
      <div class="brand">Inköpslista</div>
      <div class="row">
        <a class="btn" href="/index.html">Till menyn</a>
        <button id="clearBtn" class="btn">Töm lista</button>
      </div>
    </div>
  </header>

  <div class="container" style="display:grid; gap:18px;">
    <section class="card">
      <div class="card-body">
        <h1>Att handla</h1>
        <div class="row">
          <input id="newName" class="input" placeholder="Lägg till vara..." />
          <input id="newQty"  class="input" type="number" min="1" value="1" style="width:96px" />
          <button id="addBtn" class="btn primary">Lägg till</button>
        </div>
      </div>
    </section>

    <section id="listSection"></section>
  </div>
`

/* ===== Modal (snygg confirm) ===== */
const modalHost = document.createElement('div')
modalHost.innerHTML = `
  <div class="modal" id="confirmModal" aria-hidden="true" role="dialog" aria-labelledby="confirmTitle" aria-modal="true">
    <div class="modal-backdrop"></div>
    <div class="modal-card" role="document">
      <div class="modal-header" id="confirmTitle">Är du säker?</div>
      <div class="modal-body" id="confirmMessage">Detta går inte att ångra.</div>
      <div class="modal-footer">
        <button class="modal-btn" id="cancelBtn">Avbryt</button>
        <button class="modal-btn danger" id="okBtn">OK</button>
      </div>
    </div>
  </div>
`
document.body.appendChild(modalHost)

function confirmDialog({ title='Är du säker?', message='' }={}){
  return new Promise((resolve)=>{
    const modal=document.getElementById('confirmModal')
    const titleEl=document.getElementById('confirmTitle')
    const msgEl=document.getElementById('confirmMessage')
    const okBtn=document.getElementById('okBtn')
    const cancel=document.getElementById('cancelBtn')
    const backdrop=modal.querySelector('.modal-backdrop')
    titleEl.textContent=title; msgEl.textContent=message
    modal.classList.add('open'); modal.setAttribute('aria-hidden','false')
    const cleanup=(r)=>{ modal.classList.remove('open'); modal.setAttribute('aria-hidden','true')
      okBtn.removeEventListener('click',onOk); cancel.removeEventListener('click',onCancel)
      backdrop.removeEventListener('click',onCancel); window.removeEventListener('keydown',onKey); resolve(r) }
    const onOk=()=>cleanup(true); const onCancel=()=>cleanup(false); const onKey=(e)=>{ if(e.key==='Escape') onCancel() }
    okBtn.addEventListener('click',onOk); cancel.addEventListener('click',onCancel)
    backdrop.addEventListener('click',onCancel); window.addEventListener('keydown',onKey)
  })
}

/* ===== Elements ===== */
const listSection = document.querySelector('#listSection')
const clearBtn    = document.querySelector('#clearBtn')
const addBtn      = document.querySelector('#addBtn')
const newName     = document.querySelector('#newName')
const newQty      = document.querySelector('#newQty')

/* ===== Render (grupperat) ===== */
function render(){
  const list = loadList()
  // se till att varje item har category
  for (const it of list){ if (!it.category) it.category = guessCategory(it.name) }
  saveList(list)

  if (!list.length){
    listSection.innerHTML = `<div class="card"><div class="card-body"><div class="ing-list">Listan är tom. Lägg till något ovanför.</div></div></div>`
    return
  }

  // gruppera
  const groups = new Map()
  list.forEach((it, idx)=>{
    const cat = it.category || 'OVR'
    if (!groups.has(cat)) groups.set(cat, [])
    groups.get(cat).push({ ...it, idx })
  })

  const sortedCats = [...groups.keys()].sort((a,b)=>ORDER.indexOf(a)-ORDER.indexOf(b))
  const html = sortedCats.map(cat=>{
    const items = groups.get(cat).sort((a,b)=>a.name.localeCompare(b.name,'sv'))
    const rows = items.map(it=>`
      <div class="item" data-idx="${it.idx}">
        <input type="checkbox" ${it.checked?'checked':''} data-check="${it.idx}">
        <div class="item-name">${it.name}</div>
        <div class="row">
          <span class="item-qty">×${it.qty}</span>
          <button class="btn" data-dec="${it.idx}">−</button>
          <button class="btn" data-inc="${it.idx}">+</button>
          <button class="btn" data-del="${it.idx}">Ta bort</button>
        </div>
      </div>
    `).join('')
    return `<div class="list-group"><div class="list-title">${catName(cat)}</div>${rows}</div>`
  }).join('')

  listSection.innerHTML = html
}
render()

/* ===== Händelser: lista ===== */
listSection.addEventListener('click', async (e) => {
  const list = loadList()
  const iInc = e.target?.dataset?.inc
  const iDec = e.target?.dataset?.dec
  const iDel = e.target?.dataset?.del
  const iChk = e.target?.dataset?.check

  if (iInc != null){
    list[iInc].qty += 1
    saveList(list); render(); showToast(`Ökade ${list[iInc].name}`); return
  }
  if (iDec != null){
    list[iDec].qty = Math.max(1, list[iDec].qty - 1)
    saveList(list); render(); showToast(`Minskade ${list[iDec].name}`); return
  }
  if (iDel != null){
    const name = list[iDel].name
    const yes = await confirmDialog({ title:'Ta bort vara?', message:name })
    if (!yes) return
    list.splice(iDel, 1)
    saveList(list); render(); showToast(`Tog bort ${name}`); return
  }
  if (iChk != null){
    list[iChk].checked = !list[iChk].checked
    saveList(list); render(); showToast(list[iChk].checked ? `Bockade av ${list[iChk].name}` : `Ångrade ${list[iChk].name}`); return
  }
})

/* ===== Lägg till och töm ===== */
addBtn.addEventListener('click', () => {
  const name = newName.value.trim()
  const qty  = Math.max(1, parseInt(newQty.value || '1', 10))
  if (!name) return
  const list = loadList()
  const existing = list.find(x => x.name.toLowerCase() === name.toLowerCase())
  if (existing) existing.qty += qty
  else list.push({ name, qty, checked:false, category: guessCategory(name) })
  saveList(list); newName.value=''; newQty.value=1; render(); showToast('Vara tillagd ✅')
})

clearBtn.addEventListener('click', async () => {
  const yes = await confirmDialog({ title:'Töm listan?', message:'Detta raderar alla varor.' })
  if (!yes) return
  saveList([]); render(); showToast('Listan är tömd')
})
