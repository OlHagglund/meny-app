// src/recipe.js
import './style.css'
import { supabase } from './supabase'

// Samma bucket som i main.js
const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL
const IMAGE_BUCKET = 'hagglund-meny-images'
const imageUrlFrom = (file) => `${SUPABASE_URL}/storage/v1/object/public/${IMAGE_BUCKET}/${file}`

const app = document.querySelector('#app')
app.innerHTML = `<div class="container"><div class="card"><div class="card-body">Laddar recept…</div></div></div>`

// Hämta id från URL
const id = new URLSearchParams(location.search).get('id')
if (!id) {
  app.innerHTML = `<div class="container"><div class="card"><div class="card-body">Inget recept-ID i URL:en.</div></div></div>`
  throw new Error('Missing recipe id')
}

try {
  const { data, error } = await supabase
    .from('dishes')
    .select('id, name, category, image_file, ingredients, nutr, instructions')
    .eq('id', id)
    .single()

  if (error) throw error
  if (!data) throw new Error('Recipe not found')

  // Instruktioner kan vara text[] ELLER text. Vi stödjer båda.
  let instructionsHtml = ''
  if (Array.isArray(data.instructions)) {
    // text[] -> numrerad lista
    const items = data.instructions
      .map((s) => (s || '').trim())
      .filter(Boolean)
      .map((s) => `<li>${escapeHtml(s)}</li>`)
      .join('')
    instructionsHtml = items ? `<ol>${items}</ol>` : `<p>Inga instruktioner tillgängliga.</p>`
  } else if (typeof data.instructions === 'string' && data.instructions.trim()) {
    // lång text -> stycken av blankrader, radbrytningar -> <br>
    const parts = data.instructions
      .split(/\r?\n\r?\n/)
      .map((p) => p.trim())
      .filter(Boolean)
      .map((p) => `<p>${escapeHtml(p).replace(/\r?\n/g, '<br>')}</p>`)
      .join('')
    instructionsHtml = parts || `<p>Inga instruktioner tillgängliga.</p>`
  } else {
    instructionsHtml = `<p>Inga instruktioner tillgängliga.</p>`
  }

  const kcal = data?.nutr?.kcal ?? null
  const macros = data?.nutr
    ? `
      <div class="macros">
        ${kcal !== null ? `<span class="chip kcal">🔥 ${kcal} kcal</span>` : ''}
        ${numberOrNull(data.nutr.protein) !== null ? `<span class="chip protein">Protein: ${data.nutr.protein} g</span>` : ''}
        ${numberOrNull(data.nutr.carbs) !== null ? `<span class="chip carbs">Kolhydrater: ${data.nutr.carbs} g</span>` : ''}
        ${numberOrNull(data.nutr.fat) !== null ? `<span class="chip fat">Fett: ${data.nutr.fat} g</span>` : ''}
      </div>`
    : ''

  app.innerHTML = `
    <header>
      <div class="head">
      <div class="brand">Recept</div>
        <a class="btn" href="./index.html">← Tillbaka</a>
      </div>
    </header>

    <main class="container" style="display-grid">
      <article class="card">
        ${data.image_file ? `<img class="card-img" style="max-height:300px" src="${imageUrlFrom(data.image_file)}" alt="${escapeHtml(data.name)}">` : ''}
        <div class="card-body" style="gap:12px">
          <h1 style="margin:0">${escapeHtml(data.name)}</h1>
          <h3 style="margin:0">Kategori: ${escapeHtml(data.category || '—')}</h3>
          ${macros}

          <h3>Ingredienser</h3>
          <ul>
            ${(data.ingredients || []).map((i) => `<li>${escapeHtml(i)}</li>`).join('')}
          </ul>

          <h3>Instruktioner</h3>
          ${instructionsHtml}
        </div>
      </article>
    </main>
  `
} catch (err) {
  console.error(err)
  app.innerHTML = `<div class="container"><div class="card"><div class="card-body">Kunde inte ladda receptet.</div></div></div>`
}

// Hjälpare
function numberOrNull(v) {
  const n = Number(v)
  return Number.isFinite(n) ? n : null
}
function escapeHtml(s) {
  return String(s).replace(
    /[&<>"']/g,
    (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c],
  )
}
