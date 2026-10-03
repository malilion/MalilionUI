import { afterEach, describe, expect, it } from 'vitest'
import { mount } from '@vue/test-utils'
import { createApp, h, nextTick, ref } from 'vue'
import MalilionUI, {
  MlCombobox,
  MlConfigProvider,
  MlEmpty,
  MlPagination,
  MlResult,
  en,
  getLocale,
  setLocale,
  validateValue,
  zhTW,
  type MlLocale,
} from '../src'

afterEach(() => {
  setLocale(zhTW)
  document.body.innerHTML = ''
})

describe('locale', () => {
  it('defaults to Traditional Chinese', () => {
    const wrapper = mount(MlEmpty)
    expect(wrapper.text()).toContain('這裡還沒有東西')
  })

  it('MlConfigProvider switches the text of everything inside, reactively', async () => {
    const locale = ref<MlLocale>(en)
    const wrapper = mount({
      render: () =>
        h(MlConfigProvider, { locale: locale.value }, () => [
          h(MlEmpty),
          h(MlResult, { status: '404' }),
          h(MlCombobox, { options: [] }),
          h(MlPagination, { total: 50 }),
        ]),
    })
    expect(wrapper.text()).toContain('Nothing here yet')
    expect(wrapper.text()).toContain('Page not found')
    expect(wrapper.find('.ml-combobox__placeholder').text()).toBe('Select…')
    expect(wrapper.find('nav.ml-pagination').attributes('aria-label')).toBe('Pagination')

    locale.value = zhTW
    await nextTick()
    expect(wrapper.text()).toContain('找不到這個頁面')
  })

  it('explicit props still win over the locale', () => {
    const wrapper = mount(MlConfigProvider, {
      props: { locale: en },
      slots: { default: () => h(MlEmpty, { title: 'Custom' }) },
    })
    expect(wrapper.text()).toContain('Custom')
  })

  it('app.use(MalilionUI, { locale }) sets the app-wide default', () => {
    const app = createApp({ render: () => h(MlEmpty) })
    app.use(MalilionUI, { locale: en })
    expect(getLocale().name).toBe('en')
    const el = document.createElement('div')
    app.mount(el)
    expect(el.textContent).toContain('Nothing here yet')
    app.unmount()
  })

  it('validation messages follow the locale', async () => {
    expect(await validateValue('', [{ required: true }], {}, en)).toBe('This field is required')
    expect(await validateValue('ab', [{ min: 3 }], {}, en)).toBe('At least 3 characters')
    setLocale(en)
    expect(await validateValue('x', [{ type: 'email' }])).toBe('Enter a valid email address')
  })

  it('both locales define every key', () => {
    const keys = (o: object, prefix = ''): string[] =>
      Object.entries(o).flatMap(([k, v]) =>
        v && typeof v === 'object' && !Array.isArray(v) ? keys(v, `${prefix}${k}.`) : [`${prefix}${k}`],
      )
    expect(keys(en).sort()).toEqual(keys(zhTW).sort())
  })
})
