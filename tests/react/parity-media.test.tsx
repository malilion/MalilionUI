// Markup parity for the signature pad and image cropper (see parity.test.tsx).
import { describe, expect, it } from 'vitest'
import { createSSRApp, h } from 'vue'
import { renderToString } from 'vue/server-renderer'
import * as V from '../../src'
import * as R from '../../src/react/media'
import { react, signature, vue } from './parity-utils'

const sig = 'data:image/png;base64,AAAA'

async function cropperWithPreview() {
  const app = createSSRApp({
    render: () => h(V.MlImageCropper, { src: '/a.png', shape: 'circle' }, { preview: () => h('span', { class: 'pv' }, 'Preview') }),
  })
  return signature(await renderToString(app))
}

const cases: [string, () => Promise<string>, () => string][] = [
  ['SignaturePad', () => vue(V.MlSignaturePad), () => react(<R.SignaturePad />)],
  ['SignaturePad signed', () => vue(V.MlSignaturePad, { modelValue: sig, label: 'Sign', placeholder: 'Here', height: 160, background: '#fff' }), () => react(<R.SignaturePad value={sig} label="Sign" placeholder="Here" height={160} background="#fff" />)],
  ['SignaturePad disabled', () => vue(V.MlSignaturePad, { disabled: true, paw: true }), () => react(<R.SignaturePad disabled paw />)],
  ['ImageCropper empty', () => vue(V.MlImageCropper), () => react(<R.ImageCropper />)],
  ['ImageCropper src', () => vue(V.MlImageCropper, { src: '/a.png', aspectRatio: 1, alt: 'Photo', height: 240 }), () => react(<R.ImageCropper src="/a.png" aspectRatio={1} alt="Photo" height={240} />)],
  ['ImageCropper bare', () => vue(V.MlImageCropper, { src: '/a.png', toolbar: false, grid: false, disabled: true }), () => react(<R.ImageCropper src="/a.png" toolbar={false} grid={false} disabled />)],
  ['ImageCropper preview', cropperWithPreview, () => react(<R.ImageCropper src="/a.png" shape="circle" preview={() => <span className="pv">Preview</span>} />)],
]

describe('React ↔ Vue markup parity: media', () => {
  for (const [name, fromVue, fromReact] of cases) {
    it(name, async () => {
      expect(fromReact()).toBe(await fromVue())
    })
  }
})
