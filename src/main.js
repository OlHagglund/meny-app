import './style.css'
import { supabase } from './supabase'

/* ===========================
   Publika bilder i Supabase Storage (bucket)
   =========================== */
const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL
const IMAGE_BUCKET = 'hagglund-meny-images' // byt om din bucket heter något annat
function imageUrlFrom(fileName = '') {
  return `${SUPABASE_URL}/storage/v1/object/public/${IMAGE_BUCKET}/${fileName}`
}

/* ===========================
   Inköpslista i LocalStorage
   =========================== */
const KEY = 'shopping-list-v1'
function loadList() {
  try {
    return JSON.parse(localStorage.getItem(KEY)) || []
  } catch {
    return []
  }
}
function saveList(list) {
  localStorage.setItem(KEY, JSON.stringify(list))
}

/* ===========================
   Toast
   =========================== */
function showToast(msg) {
  let toast = document.querySelector('.toast')
  if (!toast) {
    toast = document.createElement('div')
    toast.className = 'toast'
    document.body.appendChild(toast)
  }
  toast.textContent = msg
  toast.classList.remove('show')
  void toast.offsetWidth
  toast.classList.add('show')
  setTimeout(() => toast.classList.remove('show'), 2000)
}

/* ===========================
   Skalning av ingredienser
   =========================== */
const UNIT_SET = new Set(['g', 'kg', 'ml', 'dl', 'l', 'msk', 'tsk', 'krm', 'st'])
function parseNumberToken(t) {
  t = t.replace(',', '.').trim()
  if (t === '½') return 0.5
  if (t === '¼') return 0.25
  if (t === '¾') return 0.75
  if (/^\d+\/\d+$/.test(t)) {
    const [a, b] = t.split('/').map(Number)
    if (b !== 0) return a / b
  }
  const n = Number(t)
  return Number.isFinite(n) ? n : null
}
function formatNumber(n) {
  const r = Math.round(n * 10) / 10
  return Math.abs(r - Math.round(r)) < 1e-9 ? String(Math.round(r)) : String(r).replace('.', ',')
}
function scaleIngredient(line, factor) {
  if (factor === 1) return line
  const m = line.trim().match(/^\s*(\d+\/\d+|[\d.,]+|½|¼|¾)\b\s*(.*)$/)
  if (!m) return `${line} ×${factor}`
  const val = parseNumberToken(m[1])
  if (val == null) return `${line} ×${factor}`
  let rest = m[2].trim()
  let unit = '',
    name = rest
  const w = rest.match(/^([^\s]+)\s*(.*)$/)
  if (w) {
    const first = w[1].toLowerCase()
    if (UNIT_SET.has(first)) {
      unit = w[1]
      name = w[2]
    }
  }
  const scaled = formatNumber(val * factor)
  return `${scaled}${unit ? ` ${unit}` : ''} ${name}`.trim()
}
const scaleAll = (ings, f) => ings.map((x) => scaleIngredient(x, f))

/* ===========================
   Makro-chips (kcal egen rad)
   =========================== */
function macroLabel(key) {
  const map = { protein: 'Protein', carbs: 'Kolhydrater', fat: 'Fett', fiber: 'Fiber' }
  return map[key] || key
}
function renderMacroBlocks(nutr) {
  if (!nutr) return ''
  const kcal = typeof nutr.kcal === 'number' ? nutr.kcal : null
  const order = ['protein', 'carbs', 'fat', 'fiber']
  const others = Object.entries(nutr)
    .filter(([k]) => k !== 'kcal')
    .sort((a, b) => order.indexOf(a[0]) - order.indexOf(b[0]))

  const kcalRow =
    kcal !== null
      ? `<div class="macros"><span class="chip kcal" title="Kalorier per portion">🔥 ${kcal} kcal</span></div>`
      : ''

  const otherChips = others
    .map(([k, v]) => {
      const cls = k === 'protein' || k === 'carbs' || k === 'fat' || k === 'fiber' ? k : ''
      const unit = k === 'protein' || k === 'carbs' || k === 'fat' || k === 'fiber' ? ' g' : ''
      return `<span class="chip ${cls}" title="${macroLabel(k)} per portion">${macroLabel(k)}: ${v}${unit}</span>`
    })
    .join('')

  const otherRow = otherChips ? `<div class="macros">${otherChips}</div>` : ''
  return kcalRow + otherRow
}

/* ===========================
   UI-skelett
   =========================== */
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

/* ===== Edit-modal (full redigering inkl. instruktioner) ===== */
const editHost = document.createElement('div')
editHost.innerHTML = `
  <div class="modal" id="editModal" aria-hidden="true" role="dialog" aria-labelledby="editTitle" aria-modal="true">
    <div class="modal-backdrop"></div>
    <div class="modal-card" role="document">
      <div class="modal-header" id="editTitle">Redigera recept</div>
      <div class="modal-body">
        <div style="text-align:left; display:grid; gap:10px;">
          <label style="font-weight:600;">Namn</label>
          <input id="editName" class="input" placeholder="Maträttens namn" />

          <label style="font-weight:600;">Kategori</label>
          <input id="editCategory" class="input" list="catList" placeholder="t.ex. Husman, Pasta, Fisk" />
          <datalist id="catList"></datalist>

          <label style="font-weight:600;">Bildfil i Storage</label>
          <input id="editImageFile" class="input" placeholder="t.ex. kottfarslimpa.png" />
          <small style="color:var(--text-sec)">Filen ska ligga i Supabase-bucket <b>${IMAGE_BUCKET}</b>. Ange bara filnamn + ändelse.</small>

          <div class="row" style="gap:8px; flex-wrap:wrap;">
            <div style="display:grid; gap:6px;">
              <label style="font-weight:600;">Kalorier / port</label>
              <input id="editKcal" class="input" type="number" min="0" step="1" placeholder="kcal" style="width:140px;" />
            </div>
            <div style="display:grid; gap:6px;">
              <label style="font-weight:600;">Protein (g) / port</label>
              <input id="editProtein" class="input" type="number" min="0" step="1" placeholder="g" style="width:160px;" />
            </div>
            <div style="display:grid; gap:6px;">
              <label style="font-weight:600;">Kolhydrater (g) / port</label>
              <input id="editCarbs" class="input" type="number" min="0" step="1" placeholder="g" style="width:180px;" />
            </div>
            <div style="display:grid; gap:6px;">
              <label style="font-weight:600;">Fett (g) / port</label>
              <input id="editFat" class="input" type="number" min="0" step="1" placeholder="g" style="width:140px;" />
            </div>
          </div>

          <label style="font-weight:600; margin-top:6px;">Ingredienser (en per rad)</label>
          <textarea id="editIngredients" class="input" rows="8" style="resize:vertical;" placeholder="150 g nötfärs&#10;0,5 dl mjölk&#10;..."></textarea>
          <small style="color:var(--text-sec)">Tips: börja varje rad med mängd + enhet för snygg skalning.</small>

          <label style="font-weight:600; margin-top:6px;">Instruktioner</label>
          <textarea id="editInstructions" class="input" rows="10" style="resize:vertical;" placeholder="1) Sätt ugnen på 200°C&#10;2) Hacka lök..."></textarea>
          <small style="color:var(--text-sec)">Skriv fritt. Blankrader = nya stycken.</small>
        </div>
      </div>
      <div class="modal-footer">
        <button class="modal-btn" id="editCancel">Avbryt</button>
        <button class="modal-btn danger" id="editSave">Spara</button>
      </div>
    </div>
  </div>
`
document.body.appendChild(editHost)

/* ===== Modal helpers ===== */
function openEditModal(dish) {
  // stäng ev. andra modaler
  document.querySelectorAll('.modal.open').forEach((m) => m.classList.remove('open'))

  const modal = document.getElementById('editModal')
  modal.dataset.id = dish.id
  document.getElementById('editTitle').textContent = `Redigera: ${dish.name}`

  document.getElementById('editName').value = dish.name || ''
  document.getElementById('editCategory').value = dish.category || ''
  document.getElementById('editImageFile').value = (dish.img ? dish.img.split('/').pop() : '') || ''

  const n = dish.nutr || {}
  document.getElementById('editKcal').value = n.kcal ?? ''
  document.getElementById('editProtein').value = n.protein ?? ''
  document.getElementById('editCarbs').value = n.carbs ?? ''
  document.getElementById('editFat').value = n.fat ?? ''

  document.getElementById('editIngredients').value = (dish.ingredients || []).join('\n')
  document.getElementById('editInstructions').value = dish.instructions || ''

  const cats = [...new Set(menu.map((m) => m.category))].sort((a, b) => a.localeCompare(b, 'sv'))
  document.getElementById('catList').innerHTML = cats.map((c) => `<option value="${c}">`).join('')

  modal.classList.add('open')
  modal.setAttribute('aria-hidden', 'false')
}
function closeEditModal() {
  const modal = document.getElementById('editModal')
  modal.classList.remove('open')
  modal.setAttribute('aria-hidden', 'true')
  delete modal.dataset.id
}
document.getElementById('editCancel').addEventListener('click', closeEditModal)
document.querySelector('#editModal .modal-backdrop').addEventListener('click', closeEditModal)

/* ===========================
   State + elementref
   =========================== */
let menu = [] // laddas från Supabase
const servings = {} // { dishId: number }
const active = new Set() // kategori-filter (tom = alla)

const filtersEl = document.querySelector('#filters')
const searchEl = document.querySelector('#search')
const sortEl = document.querySelector('#sort')
const grid = document.querySelector('#menuGrid')

searchEl.addEventListener('input', renderMenu)
sortEl.addEventListener('change', renderMenu)
filtersEl.addEventListener('click', (e) => {
  const cat = e.target?.dataset?.cat
  if (!cat) return
  if (cat === '__ALL__') {
    active.clear()
  } else {
    active.has(cat) ? active.delete(cat) : active.add(cat)
  }
  updateFilterButtons()
  renderMenu()
})

/* ===========================
   Supabase: hämta rätter
   =========================== */
async function loadMenuFromDB() {
  grid.innerHTML = `<div class="card"><div class="card-body">Laddar rätter…</div></div>`

  const { data, error } = await supabase
    .from('dishes')
    .select('id, name, category, image_file, ingredients, nutr, instructions')
    .order('name', { ascending: true })

  if (error) {
    console.error('Supabase error:', error)
    grid.innerHTML = `<div class="card"><div class="card-body">Kunde inte hämta rätter.</div></div>`
    showToast('Kunde inte hämta rätter')
    return
  }

  menu = (data || []).map((row) => ({
    id: row.id,
    name: row.name,
    category: row.category,
    img: imageUrlFrom(row.image_file || ''),
    ingredients: Array.isArray(row.ingredients) ? row.ingredients : [],
    nutr: row.nutr && typeof row.nutr === 'object' ? row.nutr : null,
    instructions: typeof row.instructions === 'string' ? row.instructions : null,
  }))

  for (const d of menu) {
    if (!servings[d.id]) servings[d.id] = 1
  }

  rebuildFilters()
  renderMenu()
}

/* ===========================
   Filter-knappar
   =========================== */
function rebuildFilters() {
  const categories = [...new Set(menu.map((m) => m.category))].sort((a, b) =>
    a.localeCompare(b, 'sv'),
  )
  filtersEl.innerHTML = `
    <button class="chip ${active.size === 0 ? 'active' : ''}" data-cat="__ALL__">Alla</button>
    ${categories.map((c) => `<button class="chip" data-cat="${c}">${c}</button>`).join('')}
  `
}
function updateFilterButtons() {
  const btns = filtersEl.querySelectorAll('.chip')
  btns.forEach((b) => {
    const c = b.dataset.cat
    if (c === '__ALL__') b.classList.toggle('active', active.size === 0)
    else b.classList.toggle('active', active.has(c))
  })
}

/* ===========================
   Render-hjälpare
   =========================== */
function applySearchFilterSort(items) {
  const q = (searchEl.value || '').toLowerCase().trim()
  let out = items.filter((m) => {
    const inCat = active.size === 0 || active.has(m.category)
    if (!inCat) return false
    if (!q) return true
    const hay = (m.name + ' ' + m.ingredients.join(' ')).toLowerCase()
    return hay.includes(q)
  })
  const key = sortEl.value
  out.sort((a, b) => {
    if (key === 'name') return a.name.localeCompare(b.name, 'sv')
    if (key === 'category') return a.category.localeCompare(b.category, 'sv')
    if (key === 'ings') return a.ingredients.length - b.ingredients.length
    return 0
  })
  return out
}

function renderCard(dish) {
  const factor = servings[dish.id] || 1
  const scaled = scaleAll(dish.ingredients, factor)
  const href = `./recipe.html?id=${dish.id}`

  return `
    <article class="card" data-card="${dish.id}">
      <div class="card-img-wrapper" style="position:relative;">
        <a href="${href}" class="card-link" aria-label="Öppna recept: ${dish.name}">
          ${dish.img ? `<img class="card-img" src="${dish.img}" alt="${dish.name}">` : ''}
        </a>
        <button class="edit-btn" data-edit="${dish.id}" title="Redigera recept">✏️ Edit</button>
      </div>

      <div class="card-body">
        <a href="${href}" class="card-link title-link">
          <div class="card-title">${dish.name}</div>
        </a>

        <div class="row">
          <label for="serv-${dish.id}">Portioner:</label>
          <input id="serv-${dish.id}" class="input servings" data-id="${dish.id}"
                 type="number" min="1" step="1" value="${factor}" style="width:90px" />
        </div>

        ${renderMacroBlocks(dish.nutr)}

        <div class="ing-list" data-ings="${dish.id}">
          ${scaled.map((i) => `• ${i}`).join('<br>')}
        </div>

        <button class="btn primary add-btn" data-add="${dish.id}">Lägg till</button>
      </div>
    </article>
  `
}

function renderMenu() {
  const items = applySearchFilterSort(menu)
  if (!items.length) {
    grid.innerHTML = `<div class="card"><div class="card-body">Inga rätter matchar just nu.</div></div>`
    return
  }
  grid.innerHTML = items.map(renderCard).join('')
}

/* ===========================
   Interaktioner i grid
   =========================== */
// 1) Klick: Edit/Lägg till eller navigera till receptsidan
grid.addEventListener('click', async (e) => {
  const editId = e.target?.dataset?.edit
  const addId = e.target?.dataset?.add

  // a) Edit först
  if (editId) {
    const dish = menu.find((m) => m.id === editId)
    if (!dish) return
    openEditModal(dish)
    return
  }

  // b) Lägg till i inköpslistan
  if (addId) {
    const btn = e.target
    const dish = menu.find((m) => m.id === addId)
    const factor = servings[addId] || 1
    const scaled = scaleAll(dish.ingredients, factor)

    const list = loadList()
    for (const ing of scaled) {
      const existing = list.find((x) => x.name === ing)
      if (existing) existing.qty += 1
      else list.push({ name: ing, qty: 1, checked: false })
    }
    saveList(list)

    const original = btn.textContent
    btn.textContent = 'Tillagd ✓'
    btn.classList.add('added')
    btn.disabled = true
    showToast('Ingredienser tillagda')
    setTimeout(() => {
      btn.textContent = original
      btn.classList.remove('added')
      btn.disabled = false
    }, 1200)
    return
  }

  // c) Om klicket inte var på en knapp/input/label → navigera till receptsidan
  const isInteractive = e.target.closest('button, input, select, textarea, label')
  if (isInteractive) return

  const card = e.target.closest('.card')
  if (card?.dataset?.card) {
    // Relativ länk (fungerar i Vite dev & build)
    window.location.href = `./recipe.html?id=${card.dataset.card}`
  }
})

// 2) Input: uppdatera ingredienslistan när man ändrar portioner
grid.addEventListener('input', (e) => {
  const id = e.target?.dataset?.id
  if (!id) return
  const v = Math.max(1, parseInt(e.target.value || '1', 10))
  servings[id] = v
  const dish = menu.find((m) => m.id === id)
  const host = grid.querySelector(`.ing-list[data-ings="${id}"]`)
  if (dish && host)
    host.innerHTML = scaleAll(dish.ingredients, v)
      .map((i) => `• ${i}`)
      .join('<br>')
})

/* ===========================
   Spara ändringar (uppdatera DB)
   =========================== */
document.getElementById('editSave').addEventListener('click', async () => {
  const modal = document.getElementById('editModal')
  const id = modal.dataset.id
  if (!id) {
    showToast('Hittar inte id')
    return
  }

  const name = document.getElementById('editName').value.trim()
  const category = document.getElementById('editCategory').value.trim()
  const imageFile = document.getElementById('editImageFile').value.trim()
  const instructions = document.getElementById('editInstructions').value.trim()

  const toNum = (v) => {
    if (v === null || v === undefined || v === '') return null
    const n = Number(v)
    return Number.isFinite(n) ? n : null
  }
  const kcal = toNum(document.getElementById('editKcal').value)
  const protein = toNum(document.getElementById('editProtein').value)
  const carbs = toNum(document.getElementById('editCarbs').value)
  const fat = toNum(document.getElementById('editFat').value)

  const ingredients = document
    .getElementById('editIngredients')
    .value.split('\n')
    .map((s) => s.trim())
    .filter(Boolean)

  if (!name) {
    showToast('Namn saknas')
    return
  }
  if (!category) {
    showToast('Kategori saknas')
    return
  }
  if (!imageFile) {
    showToast('Bildfil saknas')
    return
  }

  const nutr = {}
  if (kcal !== null) nutr.kcal = kcal
  if (protein !== null) nutr.protein = protein
  if (carbs !== null) nutr.carbs = carbs
  if (fat !== null) nutr.fat = fat
  const nutrPayload = Object.keys(nutr).length ? nutr : null

  const payload = {
    name,
    category,
    image_file: imageFile,
    ingredients,
    nutr: nutrPayload,
    instructions: instructions || null,
  }

  console.log('UPDATING dish id:', id, payload)

  const { error } = await supabase.from('dishes').update(payload).eq('id', id)

  if (error) {
    console.error('Supabase UPDATE error:', error)
    showToast('Kunde inte spara till databasen')
    return
  }

  // uppdatera lokalt
  const d = menu.find((m) => m.id === id)
  if (d) {
    d.name = name
    d.category = category
    d.img = imageUrlFrom(imageFile)
    d.ingredients = ingredients
    d.nutr = nutrPayload
    d.instructions = instructions || null
  }
  renderMenu()
  closeEditModal()
  showToast('Recept uppdaterat')
})

/* ===========================
   Start
   =========================== */
loadMenuFromDB()
