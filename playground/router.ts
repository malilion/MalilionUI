import { readonly, ref } from 'vue'

// A tiny hash router: #/button → "button". Enough for a docs site, no dependency.
function parse() {
  return window.location.hash.replace(/^#\/?/, '').split(/[?#]/)[0] || 'home'
}

const current = ref(parse())

window.addEventListener('hashchange', () => {
  current.value = parse()
  window.scrollTo({ top: 0 })
})

export const route = readonly(current)

export function href(id: string) {
  return `#/${id}`
}
