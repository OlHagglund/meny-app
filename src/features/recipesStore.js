
const STORAGE_KEY="recipes:v1";
function read(){try{return JSON.parse(localStorage.getItem(STORAGE_KEY))||[]}catch{return[]}}
function write(x){localStorage.setItem(STORAGE_KEY,JSON.stringify(x))}
export function listRecipes(){return read().sort((a,b)=>a.title.localeCompare(b.title))}
export function getRecipe(id){return read().find(r=>r.id===id)||null}
export function createRecipe(d){const id=crypto.randomUUID();const now=new Date().toISOString();const rec={id,title:d.title.trim(),portion:Number(d.portion||4),tags:d.tags||[],ingredients:d.ingredients||[],steps:d.steps||[],createdAt:now,updatedAt:now};const l=read();l.push(rec);write(l);return rec}
export function updateRecipe(id,p){const l=read();const i=l.findIndex(r=>r.id===id);if(i===-1)return null;l[i]={...l[i],...p,updatedAt:new Date().toISOString()};write(l);return l[i]}
export function deleteRecipe(id){write(read().filter(r=>r.id!==id));return true}
