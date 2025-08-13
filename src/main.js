import './style.css'

/* ===== LocalStorage (delad lista) ===== */
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

/* ===== Menydata (1 portion) – lokala bilder + kategori ===== */
const menu = [
  {
    id: 'kottfarslimpa',
    name: 'Köttfärslimpa med gräddsås',
    img: '/images/kottfarslimpa.png',
    category: 'Husman',
    ingredients: [
      '150 g nötfärs','0,5 dl mjölk','1 msk ströbröd','0,25 ägg','0,25 gul lök',
      '2 små potatisar','0,5 dl grädde','0,5 dl köttbuljong','1 msk smör'
    ],
    nutr: { kcal: 650, protein: 35, carbs: 55, fat: 34 }
  },
  {
    id: 'kramig-kycklingpasta',
    name: 'Krämig kycklingpasta',
    img: '/images/kramig-kycklingpasta.png',
    category: 'Pasta',
    ingredients: [
      '80 g pasta','100 g kycklingfilé','0,5 dl grädde','0,25 gul lök',
      '1 liten vitlöksklyfta','1 msk riven parmesan','0,5 msk olivolja'
    ],
    nutr: { kcal: 620, protein: 36, carbs: 62, fat: 24 }
  },
  {
    id: 'lasagne',
    name: 'Lasagne',
    img: '/images/lasagne.png',
    category: 'Pasta',
    ingredients: [
      '60 g lasagneplattor','100 g nötfärs','1 dl krossade tomater','0,25 gul lök',
      '0,5 msk tomatpuré','0,5 dl mjölk','0,5 msk smör','0,5 msk vetemjöl','15 g riven ost'
    ],
    nutr: { kcal: 560, protein: 30, carbs: 55, fat: 22 }
  },
  {
    id: 'pumpasoppa',
    name: 'Rostad butternutpumpasoppa',
    img: '/images/pumpasoppa.png',
    category: 'Soppa',
    ingredients: [
      '200 g butternutpumpa','0,25 gul lök','1 liten vitlöksklyfta',
      '2 dl grönsaksbuljong','0,5 dl grädde','0,5 msk olivolja','1 skiva bröd'
    ],
    nutr: { kcal: 450, protein: 7, carbs: 55, fat: 20 }
  },
  {
    id: 'flaskpannkaka',
    name: 'Fläskpannkaka',
    img: '/images/flaskpannkaka.png',
    category: 'Husman',
    ingredients: [
      '1 ägg','0,75 dl vetemjöl','1,5 dl mjölk','60 g rimmat sidfläsk','0,5 msk smör'
    ],
    nutr: { kcal: 520, protein: 22, carbs: 36, fat: 30 }
  },
  {
    id: 'mild-chili',
    name: 'Mild chiligryta',
    img: '/images/mild-chili.png',
    category: 'Gryta',
    ingredients: [
      '100 g nötfärs','0,25 gul lök','0,5 vitlöksklyfta','1 dl krossade tomater',
      '0,5 dl kokta kidneybönor','0,5 msk tomatpuré','0,5 msk olivolja',
      '0,25 tsk chilipulver','0,25 tsk spiskummin'
    ],
    nutr: { kcal: 480, protein: 30, carbs: 25, fat: 28 }
  },
  {
    id: 'lax-dillpotatis',
    name: 'Stekt lax med dillpotatis',
    img: '/images/lax-dillpotatis.png',
    category: 'Fisk',
    ingredients: [
      '140 g laxfilé','3 små potatisar','0,5 msk smör','1 msk hackad dill','1 citronklyfta'
    ],
    nutr: { kcal: 540, protein: 32, carbs: 35, fat: 28 }
  },
  {
    id: 'varm-smorgas',
    name: 'Varm smörgås ost & skinka',
    img: '/images/varm-smorgas.png',
    category: 'Snabbt',
    ingredients: [
      '2 skivor formfranska','30 g skinka','25 g ost','0,5 msk smör','1 tomatskiva'
    ],
    nutr: { kcal: 380, protein: 16, carbs: 36, fat: 18 }
  },
  {
    id: 'pannkakor',
    name: 'Pannkakor',
    img: '/images/pannkakor.png',
    category: 'Bak',
    ingredients: [
      '1 ägg','1 dl vetemjöl','2 dl mjölk','0,5 msk smör','2 msk sylt'
    ],
    nutr: { kcal: 430, protein: 13, carbs: 55, fat: 16 }
  },
  {
    id: 'torsk-aggsas',
    name: 'Ugnsbakad torsk med äggsås',
    img: '/images/torsk-aggsas.png',
    category: 'Fisk',
    ingredients: [
      '140 g torskfilé','2 potatisar','0,5 ägg (kokt, hackat)',
      '1 dl mjölk','0,5 msk smör','0,5 msk vetemjöl','1 msk hackad persilja'
    ],
    nutr: { kcal: 470, protein: 33, carbs: 45, fat: 15 }
  }
]


/* ===== Portionering & skalning ===== */
const servings = Object.fromEntries(menu.map(m => [m.id, 1]))
const UNIT_SET = new Set(['g','kg','ml','dl','l','msk','tsk','krm','st'])
function parseNumberToken(t){
  t = t.replace(',', '.').trim()
  if (t==='½') return 0.5; if (t==='¼') return 0.25; if (t==='¾') return 0.75
  if (/^\d+\/\d+$/.test(t)){ const [a,b]=t.split('/').map(Number); if (b!==0) return a/b }
  const n = Number(t); return Number.isFinite(n)?n:null
}
function formatNumber(n){
  const r = Math.round(n*10)/10
  return (Math.abs(r-Math.round(r))<1e-9) ? String(Math.round(r)) : String(r).replace('.',',')
}
function scaleIngredient(line, factor){
  if (factor===1) return line
  const m = line.trim().match(/^\s*(\d+\/\d+|[\d.,]+|½|¼|¾)\b\s*(.*)$/)
  if (!m) return `${line} ×${factor}`
  const val = parseNumberToken(m[1]); if (val==null) return `${line} ×${factor}`
  let rest = m[2].trim()
  let unit='', name=rest
  const w = rest.match(/^([^\s]+)\s*(.*)$/)
  if (w){ const first = w[1].toLowerCase(); if (UNIT_SET.has(first)){ unit=w[1]; name=w[2] } }
  const scaled = formatNumber(val*factor)
  return `${scaled}${unit?` ${unit}`:''} ${name}`.trim()
}
const scaleAll = (ings,f)=>ings.map(x=>scaleIngredient(x,f))

/* ===== UI skeleton ===== */
const app = document.querySelector('#app')
app.innerHTML = `
  <header>
    <div class="head">
      <div class="brand">Meny</div>
      <div class="row">
        <a class="btn" href="/list.html">Öppna inköpslista</a>
      </div>
    </div>
  </header>

  <div class="container" style="display:grid; gap:16px;">
    <section class="card">
      <div class="card-body" style="display:grid; gap:10px;">
        <div class="row" style="flex-wrap:wrap;">
          <input id="search" class="input" placeholder="Sök rätt eller ingrediens..." style="min-width:240px;">
          <select id="sort" class="input">
            <option value="name">Sortera: Namn (A–Ö)</option>
            <option value="category">Sortera: Kategori</option>
            <option value="ings">Sortera: Antal ingredienser</option>
          </select>
        </div>
        <div id="filters" class="filters"></div>
      </div>
    </section>

    <section>
      <div id="menuGrid" class="menu-grid"></div>
    </section>
  </div>
`

/* ===== Filter-knappar ===== */
const categories = [...new Set(menu.map(m=>m.category))]
const active = new Set() // tom = alla
const filtersEl = document.querySelector('#filters')
filtersEl.innerHTML = `
  <button class="chip ${active.size===0?'active':''}" data-cat="__ALL__">Alla</button>
  ${categories.map(c=>`<button class="chip" data-cat="${c}">${c}</button>`).join('')}
`
filtersEl.addEventListener('click',(e)=>{
  const cat = e.target?.dataset?.cat; if(!cat) return
  if (cat==='__ALL__'){ active.clear() }
  else { active.has(cat) ? active.delete(cat) : active.add(cat) }
  // uppdatera aktiv-styling
  filtersEl.querySelectorAll('.chip').forEach(b=>{
    const c = b.dataset.cat
    if (c==='__ALL__') b.classList.toggle('active', active.size===0)
    else b.classList.toggle('active', active.has(c))
  })
  renderMenu()
})

/* ===== Sök + sort ===== */
const searchEl = document.querySelector('#search')
const sortEl = document.querySelector('#sort')
searchEl.addEventListener('input', renderMenu)
sortEl.addEventListener('change', renderMenu)

/* ===== Render ===== */
const grid = document.querySelector('#menuGrid')

function applySearchFilterSort(items){
  const q = (searchEl.value||'').toLowerCase()
  let out = items.filter(m=>{
    const inCat = active.size===0 || active.has(m.category)
    if (!inCat) return false
    if (!q) return true
    const hay = (m.name+' '+m.ingredients.join(' ')).toLowerCase()
    return hay.includes(q)
  })
  const key = sortEl.value
  out.sort((a,b)=>{
    if (key==='name') return a.name.localeCompare(b.name,'sv')
    if (key==='category') return a.category.localeCompare(b.category,'sv')
    if (key==='ings') return a.ingredients.length - b.ingredients.length
    return 0
  })
  return out
}

// Gör en label av en makronyckel
function macroLabel(key) {
  const map = { protein: 'Protein', carbs: 'Kolhydrater', fat: 'Fett', fiber: 'Fiber' }
  return map[key] || key
}

// Bygger två rader: 1) kcal, 2) övriga makron
function renderMacroBlocks(nutr) {
  if (!nutr) return ''
  const kcal = typeof nutr.kcal === 'number' ? nutr.kcal : null

  // Samla alla nycklar utom kcal och sortera i bestämd ordning
  const order = ['protein', 'carbs', 'fat', 'fiber']
  const others = Object.entries(nutr)
    .filter(([k]) => k !== 'kcal')
    .sort((a, b) => order.indexOf(a[0]) - order.indexOf(b[0]))

  const kcalRow = kcal !== null
    ? `<div class="macros"><span class="chip kcal" title="Kalorier per portion">🔥 ${kcal} kcal</span></div>`
    : ''

  const otherChips = others.map(([k, v]) => {
    const cls = (k === 'protein' || k === 'carbs' || k === 'fat' || k === 'fiber') ? k : ''
    const unit = (k === 'protein' || k === 'carbs' || k === 'fat' || k === 'fiber') ? ' g' : ''
    return `<span class="chip ${cls}" title="${macroLabel(k)} per portion">${macroLabel(k)}: ${v}${unit}</span>`
  }).join('')

  const otherRow = otherChips
    ? `<div class="macros">${otherChips}</div>`
    : ''

  return kcalRow + otherRow
}


function renderCard(dish){
  const factor = servings[dish.id] || 1
  const scaled = scaleAll(dish.ingredients, factor)

  return `
    <article class="card" data-card="${dish.id}">
      ${dish.img ? `<img class="card-img" src="${dish.img}" alt="${dish.name}">` : ''}
      <div class="card-body">
        <div class="card-title">${dish.name}</div>

        <div class="row">
          <label for="serv-${dish.id}">Portioner:</label>
          <input id="serv-${dish.id}" class="input servings" data-id="${dish.id}" type="number" min="1" step="1" value="${factor}" style="width:90px" />
        </div>

        ${renderMacroBlocks(dish.nutr)}

        <div class="ing-list" data-ings="${dish.id}">
          ${scaled.map(i => `• ${i}`).join('<br>')}
        </div>

        <button class="btn primary add-btn" data-add="${dish.id}">Lägg till</button>
      </div>
    </article>
  `
}


function renderMenu(){
  const items = applySearchFilterSort(menu)
  grid.innerHTML = items.map(renderCard).join('')
}
renderMenu()

/* ===== Interaktioner ===== */
grid.addEventListener('input',(e)=>{
  const id = e.target?.dataset?.id
  if (!id) return
  const v = Math.max(1, parseInt(e.target.value||'1',10))
  servings[id] = v
  // uppdatera ingredienser i detta kort
  const dish = menu.find(m=>m.id===id)
  const host = grid.querySelector(`.ing-list[data-ings="${id}"]`)
  if (dish && host) host.innerHTML = scaleAll(dish.ingredients, v).map(i=>`• ${i}`).join('<br>')
})

grid.addEventListener('click',(e)=>{
  const id = e.target?.dataset?.add
  if (!id) return
  const btn = e.target
  const dish = menu.find(m=>m.id===id)
  const factor = servings[id] || 1
  const scaled = scaleAll(dish.ingredients, factor)

  const list = loadList()
  for (const ing of scaled){
    const existing = list.find(x => x.name === ing)
    if (existing) existing.qty += 1
    else list.push({ name: ing, qty: 1, checked: false })
  }
  saveList(list)

  // Knapp-animation “Tillagd ✓”
  const original = btn.textContent
  btn.textContent = 'Tillagd ✓'
  btn.classList.add('added')
  btn.disabled = true
  showToast('Ingredienser tillagda')
  setTimeout(()=>{
    btn.textContent = original
    btn.classList.remove('added')
    btn.disabled = false
  }, 1200)
})
