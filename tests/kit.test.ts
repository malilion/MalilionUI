import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { mount } from '@vue/test-utils'
import { nextTick } from 'vue'
import {
  MlAccordion,
  MlAvatar,
  MlBarChart,
  MlBreadcrumb,
  MlDonut,
  MlEmpty,
  MlMascot,
  MlNumberInput,
  MlPagination,
  MlRing,
  MlSlider,
  MlSparkline,
  MlSteps,
  MlTag,
  MlUpload,
  lionAvatarUrl,
} from '../src'
import { addFiles, moveItem, reorderKey } from '../src/components/upload'

describe('MlMascot', () => {
  it('shows the lion with alt text, and can be decorative', () => {
    const img = mount(MlMascot).get('img')
    expect(img.attributes('alt')).toBe('碼力獅')
    expect(img.attributes('src')).toBe(lionAvatarUrl)
    expect(mount(MlMascot, { props: { title: '' } }).get('img').attributes('alt')).toBe('')
  })

  it('uses the full-body art for pose="full" and ignores frames there', () => {
    const wrapper = mount(MlMascot, { props: { pose: 'full', frame: 'ring' } })
    expect(wrapper.get('img').attributes('src')).not.toBe(lionAvatarUrl)
    expect(wrapper.classes()).toContain('ml-mascot--frame-none')
  })

  it('MlAvatar can wear the mascot', () => {
    const img = mount(MlAvatar, { props: { lion: true } }).get('img')
    expect(img.attributes('src')).toBe(lionAvatarUrl)
    expect(img.attributes('alt')).toBe('碼力獅')
  })
})

describe('MlBreadcrumb', () => {
  it('links all but the last item, which is the current page', () => {
    const wrapper = mount(MlBreadcrumb, {
      props: { items: [{ label: 'Home', href: '/' }, { label: 'Components', href: '/c' }, { label: 'Buttons' }] },
    })
    expect(wrapper.findAll('a').map((a) => a.text())).toEqual(['Home', 'Components'])
    expect(wrapper.get('[aria-current="page"]').text()).toBe('Buttons')
  })
})

describe('MlPagination', () => {
  const labels = (wrapper: ReturnType<typeof mount>) =>
    wrapper.findAll('.ml-pagination__btn:not(.ml-pagination__btn--nav), .ml-pagination__gap').map((el) => el.text())

  it.each([
    [1, 5, ['1', '2', '3', '4', '5']],
    [1, 7, ['1', '2', '3', '4', '5', '6', '7']],
    [1, 20, ['1', '2', '3', '4', '5', '…', '20']],
    [4, 20, ['1', '2', '3', '4', '5', '…', '20']],
    [10, 20, ['1', '…', '9', '10', '11', '…', '20']],
    [17, 20, ['1', '…', '16', '17', '18', '19', '20']],
    [20, 20, ['1', '…', '16', '17', '18', '19', '20']],
  ])('page %i of %i → %j', (page, total, expected) => {
    expect(labels(mount(MlPagination, { props: { page, total } }))).toEqual(expected)
  })

  it('moves with prev/next and clamps at the ends', async () => {
    const wrapper = mount(MlPagination, {
      props: { page: 1, total: 3, 'onUpdate:page': (v: number) => wrapper.setProps({ page: v }) },
    })
    const [prev, next] = [wrapper.get('[aria-label="上一頁"]'), wrapper.get('[aria-label="下一頁"]')]
    expect(prev.attributes('disabled')).toBeDefined()
    await next.trigger('click')
    await next.trigger('click')
    expect(wrapper.get('[aria-current="page"]').text()).toBe('3')
    expect(next.attributes('disabled')).toBeDefined()
  })
})

describe('MlSteps', () => {
  it('marks steps before current as done and the current one as aria-current', () => {
    const wrapper = mount(MlSteps, {
      props: { current: 1, items: [{ title: 'Setup' }, { title: 'Configure' }, { title: 'Review' }] },
    })
    const items = wrapper.findAll('li')
    expect(items[0].classes()).toContain('ml-steps__item--done')
    expect(items[0].find('.ml-paw').exists()).toBe(true)
    expect(items[1].attributes('aria-current')).toBe('step')
    expect(items[2].classes()).toContain('ml-steps__item--todo')
  })
})

describe('MlAccordion', () => {
  const items = [
    { value: 'a', title: 'A', content: 'Alpha' },
    { value: 'b', title: 'B', content: 'Beta' },
  ]

  it('wires trigger ↔ panel and keeps closed panels inert', () => {
    const wrapper = mount(MlAccordion, { props: { items, modelValue: ['a'] } })
    const [first, second] = wrapper.findAll('button')
    expect(first.attributes('aria-expanded')).toBe('true')
    const panel = wrapper.get(`#${first.attributes('aria-controls')}`)
    expect(panel.attributes('aria-labelledby')).toBe(first.attributes('id'))
    expect(wrapper.get(`#${second.attributes('aria-controls')}`).attributes('inert')).toBeDefined()
  })

  it('opens one at a time unless multiple', async () => {
    const single = mount(MlAccordion, {
      props: { items, modelValue: ['a'], 'onUpdate:modelValue': (v: string[]) => single.setProps({ modelValue: v }) },
    })
    await single.findAll('button')[1].trigger('click')
    expect(single.props('modelValue')).toEqual(['b'])

    const multi = mount(MlAccordion, {
      props: {
        items,
        multiple: true,
        modelValue: ['a'],
        'onUpdate:modelValue': (v: string[]) => multi.setProps({ modelValue: v }),
      },
    })
    await multi.findAll('button')[1].trigger('click')
    expect(multi.props('modelValue')).toEqual(['a', 'b'])
    await multi.findAll('button')[0].trigger('click')
    expect(multi.props('modelValue')).toEqual(['b'])
  })
})

describe('MlSlider', () => {
  it('labels the range and reports the fill percentage', async () => {
    const wrapper = mount(MlSlider, { props: { modelValue: 25, min: 0, max: 50, label: '音量', unit: '%' } })
    const input = wrapper.get('input[type="range"]')
    expect(wrapper.get('label').attributes('for')).toBe(input.attributes('id'))
    expect(wrapper.attributes('style')).toContain('--_pct: 50%')
    expect(wrapper.get('output').text()).toBe('25%')
    await input.setValue('40')
    expect(wrapper.emitted('update:modelValue')?.[0]).toEqual([40])
  })
})

describe('MlNumberInput', () => {
  it('steps within min/max and rounds float steps', async () => {
    const wrapper = mount(MlNumberInput, {
      props: { modelValue: 0.2, step: 0.1, min: 0, max: 0.3, 'onUpdate:modelValue': (v: number) => wrapper.setProps({ modelValue: v }) },
    })
    await wrapper.get('[aria-label="增加"]').trigger('click')
    expect(wrapper.props('modelValue')).toBe(0.3)
    expect(wrapper.get('[aria-label="增加"]').attributes('disabled')).toBeDefined()
  })

  it('clamps typed values on change', async () => {
    const wrapper = mount(MlNumberInput, { props: { modelValue: 1, min: 1, max: 10 } })
    const input = wrapper.get('input')
    ;(input.element as HTMLInputElement).value = '99'
    await input.trigger('change')
    expect(wrapper.emitted('update:modelValue')?.[0]).toEqual([10])
  })
})

describe('MlTag', () => {
  it('emits close from its remove button', async () => {
    const wrapper = mount(MlTag, { props: { closable: true }, slots: { default: 'Vue' } })
    await wrapper.get('[aria-label="移除"]').trigger('click')
    expect(wrapper.emitted('close')).toHaveLength(1)
  })

  it('selectable chips are toggle buttons', async () => {
    const wrapper = mount(MlTag, { props: { selectable: true, selected: false }, slots: { default: 'AI' } })
    expect(wrapper.element.tagName).toBe('BUTTON')
    expect(wrapper.attributes('aria-pressed')).toBe('false')
    await wrapper.trigger('click')
    expect(wrapper.emitted('update:selected')?.[0]).toEqual([true])
  })
})

describe('MlEmpty', () => {
  it('renders title, description and actions', () => {
    const wrapper = mount(MlEmpty, {
      props: { title: 'No Data Yet', description: 'Let this little lion take a nap…' },
      slots: { default: '<button>Create</button>' },
    })
    expect(wrapper.text()).toContain('No Data Yet')
    expect(wrapper.find('.ml-mascot').exists()).toBe(true)
    expect(wrapper.find('.ml-empty__actions button').exists()).toBe(true)
  })
})

describe('MlUpload', () => {
  const file = (name: string, type: string, size = 10) => new File([new Uint8Array(size)], name, { type })

  function drop(wrapper: ReturnType<typeof mount>, files: File[]) {
    const zone = wrapper.get('.ml-upload__zone')
    const event = new Event('drop', { bubbles: true, cancelable: true }) as DragEvent
    Object.defineProperty(event, 'dataTransfer', { value: { files } })
    zone.element.dispatchEvent(event)
  }

  it('accepts matching files, rejects wrong type and oversize ones', async () => {
    const onReject = vi.fn()
    const wrapper = mount(MlUpload, {
      props: {
        accept: '.png,application/pdf',
        maxSize: 100,
        modelValue: [] as File[],
        'onUpdate:modelValue': (v: File[]) => wrapper.setProps({ modelValue: v }),
        onReject,
      },
    })
    drop(wrapper, [file('a.png', 'image/png'), file('b.pdf', 'application/pdf'), file('c.txt', 'text/plain'), file('d.png', 'image/png', 500)])
    await nextTick()
    expect((wrapper.props('modelValue') as File[]).map((f) => f.name)).toEqual(['a.png', 'b.pdf'])
    expect(onReject.mock.calls.map(([f, reason]) => [f.name, reason])).toEqual([
      ['c.txt', 'type'],
      ['d.png', 'size'],
    ])

    await wrapper.get('[aria-label="移除 a.png"]').trigger('click')
    expect((wrapper.props('modelValue') as File[]).map((f) => f.name)).toEqual(['b.pdf'])
  })

  it('keeps only one file when multiple is false', async () => {
    const wrapper = mount(MlUpload, {
      props: { multiple: false, modelValue: [] as File[], 'onUpdate:modelValue': (v: File[]) => wrapper.setProps({ modelValue: v }) },
    })
    drop(wrapper, [file('a.png', 'image/png'), file('b.png', 'image/png')])
    await nextTick()
    expect(wrapper.props('modelValue')).toHaveLength(1)
  })

  it('shares its filtering and reorder math with React', () => {
    const a = file('a.png', 'image/png')
    const b = file('b.png', 'image/png')
    expect(addFiles([a], [b], { multiple: true, maxCount: 1 })).toEqual({ next: null, rejected: [[b, 'count']] })
    expect(addFiles([a], [b, a], { multiple: false, maxCount: 1 })).toEqual({ next: [b], rejected: [] })
    expect(moveItem(['a', 'b', 'c'], 0, 9)).toEqual(['b', 'c', 'a'])
    expect(reorderKey('ArrowLeft', 0, 3)).toBeNull()
    expect(reorderKey('ArrowRight', 1, 3)).toBe(2)
    expect(reorderKey('ArrowUp', 1, 3)).toBeNull()
  })

  describe('picture wall', () => {
    type Wall = ReturnType<typeof wall>
    const names = (wrapper: Wall) => (wrapper.props('modelValue') as File[]).map((f) => f.name)
    function wall(props: Record<string, unknown> = {}) {
      const wrapper = mount(MlUpload, {
        attachTo: document.body,
        props: { listType: 'picture' as const, modelValue: [] as File[], 'onUpdate:modelValue': (v: File[]) => wrapper.setProps({ modelValue: v }), ...props },
      })
      return wrapper
    }
    function dropOnAdd(wrapper: Wall, files: File[]) {
      const event = new Event('drop', { bubbles: true, cancelable: true }) as DragEvent
      Object.defineProperty(event, 'dataTransfer', { value: { files } })
      wrapper.get('.ml-upload__add').element.dispatchEvent(event)
    }
    let made = 0
    const created: string[] = []
    const revoked: string[] = []
    beforeEach(() => {
      created.length = revoked.length = 0
      vi.spyOn(URL, 'createObjectURL').mockImplementation(() => {
        const url = `blob:test/${made++}`
        created.push(url)
        return url
      })
      vi.spyOn(URL, 'revokeObjectURL').mockImplementation((url) => void revoked.push(url))
    })
    afterEach(() => {
      vi.restoreAllMocks()
      delete (document as { elementsFromPoint?: unknown }).elementsFromPoint
      document.body.innerHTML = ''
    })

    it('shows thumbnails for images and an icon for other files, and revokes URLs', async () => {
      const wrapper = wall({ modelValue: [file('photo.png', 'image/png'), file('spec.pdf', 'application/pdf')] })
      await nextTick()
      const cards = wrapper.findAll('[role="listitem"]')
      expect(wrapper.get('ul').attributes('role')).toBe('list')
      expect(cards).toHaveLength(2)
      expect(cards[0].get('img').attributes('src')).toBe(created[0])
      expect(cards[1].find('img').exists()).toBe(false)
      expect(cards[1].get('.ml-upload__doc-name').text()).toBe('spec.pdf')
      expect(cards[0].find('[aria-label="預覽 photo.png"]').exists()).toBe(true)
      expect(cards[1].find('[aria-label="預覽 spec.pdf"]').exists()).toBe(false)

      await wrapper.get('[aria-label="移除 photo.png"]').trigger('click')
      await nextTick()
      expect(names(wrapper)).toEqual(['spec.pdf'])
      expect(revoked).toEqual([created[0]])

      await wrapper.setProps({ modelValue: [file('b.jpg', 'image/jpeg')] })
      await nextTick()
      wrapper.unmount()
      expect(revoked).toEqual(created)
    })

    it('opens the preview at the clicked image, skipping non-images', async () => {
      const wrapper = wall({ modelValue: [file('a.png', 'image/png'), file('doc.pdf', 'application/pdf'), file('b.png', 'image/png')] })
      await nextTick()
      await wrapper.get('[aria-label="預覽 b.png"]').trigger('click')
      await nextTick()
      const preview = document.body.querySelector('.ml-preview')!
      expect(preview.querySelector('img')!.getAttribute('src')).toBe(created[1])
      expect(preview.querySelector('img')!.getAttribute('alt')).toBe('b.png')
      expect(preview.querySelector('.ml-preview__counter')!.textContent).toContain('02')
    })

    it('rejects files past max-count and hides the add tile when full', async () => {
      const onReject = vi.fn()
      const wrapper = wall({ maxCount: 2, accept: 'image/*', onReject })
      dropOnAdd(wrapper, [file('a.png', 'image/png')])
      await nextTick()
      dropOnAdd(wrapper, [file('b.png', 'image/png'), file('c.png', 'image/png'), file('d.txt', 'text/plain')])
      await nextTick()
      expect(names(wrapper)).toEqual(['a.png', 'b.png'])
      expect(onReject.mock.calls.map(([f, reason]) => [f.name, reason])).toEqual([
        ['d.txt', 'type'],
        ['c.png', 'count'],
      ])
      expect(wrapper.find('.ml-upload__add').exists()).toBe(false)
      expect(wrapper.get('input').attributes('disabled')).toBeDefined()
    })

    it('shows progress and error overlays from the file status', async () => {
      const busy = Object.assign(file('busy.png', 'image/png'), { status: 'uploading' as const, percent: 42.4 })
      const bad = Object.assign(file('bad.png', 'image/png'), { status: 'error' as const })
      const wrapper = wall({ modelValue: [busy, bad, file('ok.png', 'image/png')] })
      const bar = wrapper.get('[role="progressbar"]')
      expect(bar.attributes('aria-valuenow')).toBe('42')
      expect(bar.attributes('aria-label')).toBe('busy.png 上傳中 42%')
      expect(wrapper.get('.ml-upload__card--error .ml-upload__error').text()).toBe('上傳失敗')
      expect(wrapper.findAll('.ml-upload__overlay')).toHaveLength(2)
    })

    it('reorders with Alt+Arrow keys, keeps focus and announces the new place', async () => {
      const wrapper = wall({ modelValue: [file('a.png', 'image/png'), file('b.png', 'image/png'), file('c.png', 'image/png')] })
      const first = wrapper.findAll('[role="listitem"]')[0]
      expect(first.attributes('tabindex')).toBe('0')
      await first.trigger('keydown', { key: 'ArrowRight' })
      expect(names(wrapper)).toEqual(['a.png', 'b.png', 'c.png'])
      await first.trigger('keydown', { key: 'ArrowRight', altKey: true })
      await nextTick()
      expect(names(wrapper)).toEqual(['b.png', 'a.png', 'c.png'])
      expect(wrapper.get('[aria-live="polite"]').text()).toBe('已移到第 2 張')
      expect(document.activeElement?.getAttribute('aria-label')).toBe('a.png')
      await wrapper.findAll('[role="listitem"]')[0].trigger('keydown', { key: 'ArrowLeft', altKey: true })
      expect(names(wrapper)).toEqual(['b.png', 'a.png', 'c.png'])
    })

    it('reorders by dragging a card onto another', async () => {
      const wrapper = wall({ modelValue: [file('a.png', 'image/png'), file('b.png', 'image/png'), file('c.png', 'image/png')] })
      const cards = wrapper.findAll('[role="listitem"]')
      const target = cards[2].element
      document.elementsFromPoint = () => [cards[0].element, target]
      await cards[0].trigger('pointerdown', { button: 0, clientX: 10, clientY: 10 })
      await cards[0].trigger('pointermove', { clientX: 200, clientY: 12 })
      expect(cards[0].classes()).toContain('ml-upload__card--dragging')
      expect(cards[2].classes()).toContain('ml-upload__card--over')
      await cards[0].trigger('pointerup')
      expect(names(wrapper)).toEqual(['b.png', 'c.png', 'a.png'])
      expect(wrapper.get('[aria-live="polite"]').text()).toBe('已移到第 3 張')
    })
  })
})

describe('charts', () => {
  it('MlRing clamps and reports progress', () => {
    const wrapper = mount(MlRing, { props: { value: 130, label: '完成率' } })
    expect(wrapper.attributes('aria-valuenow')).toBe('100')
    expect(wrapper.text()).toContain('100%')
  })

  it('MlSparkline draws one point per value', () => {
    const wrapper = mount(MlSparkline, { props: { data: [1, 4, 2, 8], area: false } })
    expect(wrapper.get('path').attributes('d')?.match(/[ML]/g)).toHaveLength(4)
  })

  it('MlBarChart rounds the axis up and highlights the max', () => {
    const wrapper = mount(MlBarChart, {
      props: { data: [{ label: 'Jan', value: 12 }, { label: 'Feb', value: 42 }, { label: 'Mar', value: 30 }] },
    })
    expect(wrapper.findAll('.ml-bars__axis span').map((el) => el.text())).toEqual(['60', '45', '30', '15', '0'])
    const hi = wrapper.get('.ml-bars__bar--hi')
    expect(hi.text()).toBe('42')
    expect(hi.attributes('style')).toContain('height: 70%')
    expect(wrapper.attributes('aria-label')).toContain('Feb 42')
  })

  it('MlDonut turns values into shares', () => {
    const wrapper = mount(MlDonut, {
      props: { data: [{ label: 'Direct', value: 3 }, { label: 'Search', value: 1 }], title: '4' },
    })
    expect(wrapper.findAll('.ml-donut__pct').map((el) => el.text())).toEqual(['75%', '25%'])
    expect(wrapper.findAll('.ml-donut__seg')).toHaveLength(2)
  })
})
