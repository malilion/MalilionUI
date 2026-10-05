import { ref, watch } from 'vue'

// Which framework the docs speak: Vue (the default) or React. Remembered per
// browser; a link can pick one with ?fw=react in the hash (#/button?fw=react).
export type Framework = 'vue' | 'react'

const KEY = 'ml-docs-framework'

function fromHash(): Framework | undefined {
  const fw = new URLSearchParams(window.location.hash.split('?')[1] ?? '').get('fw')
  return fw === 'vue' || fw === 'react' ? fw : undefined
}

function stored(): Framework | undefined {
  try {
    const v = localStorage.getItem(KEY)
    return v === 'vue' || v === 'react' ? v : undefined
  } catch {
    return undefined
  }
}

export const framework = ref<Framework>(fromHash() ?? stored() ?? 'vue')

watch(framework, (fw) => {
  try {
    localStorage.setItem(KEY, fw)
  } catch {
    // Private mode / blocked storage: the choice just won't persist.
  }
  document.documentElement.dataset.framework = fw
}, { immediate: true })

window.addEventListener('hashchange', () => {
  const fw = fromHash()
  if (fw) framework.value = fw
})
