// MlTaiwanRegion: the Chunghwa Post table, the search helpers, then the Vue component.
import { describe, expect, it } from 'vitest'
import { mount } from '@vue/test-utils'
import { defineComponent, h, nextTick, reactive } from 'vue'
import { MlForm, MlFormItem, MlTaiwanRegion, en } from '../src'
import MlConfigProvider from '../src/components/MlConfigProvider.vue'
import {
  findTaiwanDistrict,
  findTaiwanDistrictsByZip,
  formatTaiwanAddress,
  getTaiwanCounties,
  getTaiwanCounty,
  getTaiwanDistricts,
  normalizeTaiwanName,
  searchTaiwanRegions,
  type MlTaiwanRegionValue,
} from '../src/taiwan-regions'

/* ── data ─────────────────────────────────────────────────── */

describe('Taiwan region data', () => {
  const counties = getTaiwanCounties()
  const districts = counties.flatMap((c) => c.districts)
  const withIslands = getTaiwanCounties({ includeIslands: true }).flatMap((c) => c.districts)

  it('has 22 counties and 368 districts', () => {
    expect(counties).toHaveLength(22)
    expect(districts).toHaveLength(368)
    expect(withIslands).toHaveLength(371)
  })

  it('every zip is 3 digits and every county/district pair is unique', () => {
    for (const d of withIslands) expect(d.zip).toMatch(/^\d{3}$/)
    expect(new Set(withIslands.map((d) => `${d.county}${d.name}`)).size).toBe(371)
    expect(new Set(counties.map((c) => c.name)).size).toBe(22)
    expect(new Set(counties.map((c) => c.en)).size).toBe(22)
    // Codes are shared only inside 新竹市 (300) and 嘉義市 (600).
    const zips = new Map<string, string[]>()
    for (const d of withIslands) zips.set(d.zip, [...(zips.get(d.zip) ?? []), d.county])
    const shared = [...zips].filter(([, list]) => list.length > 1)
    expect(shared.map(([zip, list]) => [zip, [...new Set(list)]])).toEqual([
      ['300', ['新竹市']],
      ['600', ['嘉義市']],
    ])
  })

  it('district counts match the official administrative divisions', () => {
    const count = Object.fromEntries(counties.map((c) => [c.name, c.districts.length]))
    expect(count).toMatchObject({
      臺北市: 12, 新北市: 29, 桃園市: 13, 臺中市: 29, 臺南市: 37, 高雄市: 38,
      基隆市: 7, 新竹市: 3, 嘉義市: 2, 新竹縣: 13, 苗栗縣: 18, 彰化縣: 26, 南投縣: 13,
      雲林縣: 20, 嘉義縣: 18, 屏東縣: 33, 宜蘭縣: 12, 花蓮縣: 13, 臺東縣: 16, 澎湖縣: 6,
      金門縣: 6, 連江縣: 4,
    })
  })

  it('uses the official 臺 everywhere', () => {
    for (const d of withIslands) expect(`${d.county}${d.name}`).not.toContain('台')
    expect(counties.map((c) => c.name)).toEqual(expect.arrayContaining(['臺北市', '臺中市', '臺南市', '臺東縣']))
  })

  it('spot checks', () => {
    expect(findTaiwanDistrict('臺北市', '中正區')).toEqual({ zip: '100', name: '中正區', en: 'Zhongzheng Dist.', county: '臺北市', countyEn: 'Taipei City' })
    expect(findTaiwanDistrictsByZip('300').map((d) => d.name)).toEqual(['東區', '北區', '香山區'])
    expect(findTaiwanDistrictsByZip(300).every((d) => d.county === '新竹市' && d.countyEn === 'Hsinchu City')).toBe(true)
    expect(findTaiwanDistrictsByZip('880')).toMatchObject([{ county: '澎湖縣', name: '馬公市', en: 'Magong City', countyEn: 'Penghu County' }])
    expect(getTaiwanDistricts('金門縣').map((d) => `${d.zip}${d.name}`)).toEqual(['890金沙鎮', '891金湖鎮', '892金寧鄉', '893金城鎮', '894烈嶼鄉', '896烏坵鄉'])
    expect(getTaiwanDistricts('連江縣').map((d) => `${d.zip}${d.name}`)).toEqual(['209南竿鄉', '210北竿鄉', '211莒光鄉', '212東引鄉'])
    expect(findTaiwanDistrict('新北市', '板橋區')).toMatchObject({ zip: '220', en: 'Banqiao Dist.', countyEn: 'New Taipei City' })
    expect(findTaiwanDistrict('高雄市', '那瑪夏區')).toMatchObject({ zip: '849', en: 'Namaxia Dist.' })
    expect(findTaiwanDistrict('臺南市', '中西區')).toMatchObject({ zip: '700', en: 'West Central Dist.' })
    expect(findTaiwanDistrict('臺東縣', '蘭嶼鄉')).toMatchObject({ zip: '952', en: 'Lanyu Township' })
    expect(findTaiwanDistrict('臺北市', '大安區')?.en).toBe('Da’an Dist.')
    expect(getTaiwanCounty('Changhua County')?.name).toBe('彰化縣')
    expect(getTaiwanCounties().map((c) => c.en)).toContain('Lienchiang County')
  })

  it('flags 釣魚臺 and 南海諸島 and hides them by default', () => {
    const islands = withIslands.filter((d) => d.island)
    expect(islands.map((d) => [d.zip, d.county, d.name, d.en])).toEqual([
      ['290', '宜蘭縣', '釣魚臺', 'Diaoyutai'],
      ['817', '高雄市', '東沙群島', 'Dongsha Islands'],
      ['819', '高雄市', '南沙群島', 'Nansha Islands'],
    ])
    expect(districts.some((d) => d.island)).toBe(false)
    expect(getTaiwanDistricts('高雄市', { includeIslands: true })).toHaveLength(40)
    expect(searchTaiwanRegions('817')).toEqual([])
    expect(searchTaiwanRegions('817', { includeIslands: true })[0].name).toBe('東沙群島')
  })
})

/* ── search & formatting ─────────────────────────────────── */

describe('Taiwan region search', () => {
  const names = (q: string, limit?: number) => searchTaiwanRegions(q, { limit }).map((d) => `${d.zip}${d.county}${d.name}`)

  it('accepts 台 or 臺', () => {
    expect(normalizeTaiwanName(' 台中市 ')).toBe('臺中市')
    expect(getTaiwanDistricts('台北市')).toHaveLength(12)
    expect(findTaiwanDistrict('台東縣', '台東市')?.zip).toBe('950')
    expect(names('台北 中正')).toEqual(['100臺北市中正區'])
    expect(names('台西')).toEqual(['636雲林縣臺西鄉'])
  })

  it('matches Chinese, English and zip prefix', () => {
    expect(names('板橋')).toEqual(['220新北市板橋區'])
    expect(names('220')).toEqual(['220新北市板橋區'])
    expect(names('Banqiao')).toEqual(['220新北市板橋區'])
    expect(names('banqiao dist')).toEqual(['220新北市板橋區'])
    expect(names('新北板橋')).toEqual(['220新北市板橋區'])
    expect(names('daan')).toEqual(['106臺北市大安區', '439臺中市大安區'])
    expect(names('Da’an Taipei')).toEqual(['106臺北市大安區'])
    expect(names('89')).toHaveLength(6)
    expect(names('300')).toEqual(['300新竹市東區', '300新竹市北區', '300新竹市香山區'])
  })

  it('ranks exact zips and name prefixes first', () => {
    expect(names('10', 3)).toEqual(['100臺北市中正區', '103臺北市大同區', '104臺北市中山區'])
    // 「中正」 hits 臺北市 and 基隆市; a 2-word query narrows it.
    expect(names('中正')).toEqual(['100臺北市中正區', '202基隆市中正區'])
    expect(names('中正 基隆')).toEqual(['202基隆市中正區'])
    expect(names('Xinyi', 3)).toEqual(['110臺北市信義區', '201基隆市信義區', '556南投縣信義鄉'])
    expect(names('')).toEqual([])
    expect(names('火星')).toEqual([])
  })

  it('formats an address line', () => {
    const v = { county: '臺北市', district: '中正區', zip: '100' }
    expect(formatTaiwanAddress(v, { address: '重慶南路一段122號' })).toBe('100臺北市中正區重慶南路一段122號')
    expect(formatTaiwanAddress({ county: '台北市', district: '中正區' }, { zip: false })).toBe('臺北市中正區')
    expect(formatTaiwanAddress(v, { lang: 'en', address: 'No. 122, Sec. 1, Chongqing S. Rd.' })).toBe(
      'No. 122, Sec. 1, Chongqing S. Rd., Zhongzheng Dist., Taipei City 100',
    )
  })
})

/* ── MlTaiwanRegion ───────────────────────────────────────── */

const checked = (select: { element: Element }) => {
  const el = select.element as HTMLSelectElement
  return el.options[el.selectedIndex]?.textContent?.trim()
}

const pick = async (select: { setValue: (v: string) => Promise<void> }, value: string) => {
  await select.setValue(value)
  await nextTick()
}

describe('MlTaiwanRegion', () => {
  it('links the county and district selects and emits { county, district, zip }', async () => {
    const w = mount(MlTaiwanRegion, { props: { label: '地區', id: 'r' } })
    const [county, district] = w.findAll('select')
    expect(county.attributes('id')).toBe('r')
    expect(district.attributes('disabled')).toBeDefined()
    expect(county.findAll('option')).toHaveLength(23)
    await pick(county, '新北市')
    expect(w.emitted('update:modelValue')).toBeUndefined()
    expect(district.attributes('disabled')).toBeUndefined()
    expect(district.findAll('option').map((o) => o.text()).slice(0, 3)).toEqual(['請選擇鄉鎮市區', '207 萬里區', '208 金山區'])
    await pick(district, '板橋區')
    expect(w.emitted('update:modelValue')!.at(-1)).toEqual([{ county: '新北市', district: '板橋區', zip: '220' }])
    expect(w.emitted('change')!.at(-1)![1]).toMatchObject({ en: 'Banqiao Dist.' })
    // Changing the county drops the now-stale district.
    await w.setProps({ modelValue: { county: '新北市', district: '板橋區', zip: '220' } })
    await pick(county, '臺北市')
    expect(w.emitted('update:modelValue')!.at(-1)).toEqual([null])
    expect((county.element as HTMLSelectElement).value).toBe('臺北市')
    expect((district.element as HTMLSelectElement).value).toBe('')
  })

  it('shows a value given with 台 and can hide zips', async () => {
    const w = mount(MlTaiwanRegion, { props: { modelValue: { county: '台中市', district: '北屯區', zip: '406' }, zip: false, clearable: true } })
    const [county, district] = w.findAll('select')
    expect((county.element as HTMLSelectElement).value).toBe('臺中市')
    expect((district.element as HTMLSelectElement).value).toBe('北屯區')
    expect(checked(district)).toBe('北屯區')
    await w.find('.ml-region__clear').trigger('click')
    expect(w.emitted('update:modelValue')!.at(-1)).toEqual([null])
    await w.setProps({ modelValue: null })
    expect((county.element as HTMLSelectElement).value).toBe('')
    expect(w.find('.ml-region__clear').exists()).toBe(false)
  })

  it('follows the ConfigProvider locale and lang prop', async () => {
    const w = mount(MlConfigProvider, {
      props: { locale: en },
      slots: { default: () => h(MlTaiwanRegion, { modelValue: { county: '新竹市', district: '香山區', zip: '300' } }) },
    })
    const [county, district] = w.findAll('select')
    expect(checked(county)).toBe('Hsinchu City')
    expect(checked(district)).toBe('300 Xiangshan Dist.')
    expect(county.attributes('aria-label')).toBe('City / County')
    const zh = mount(MlTaiwanRegion, { props: { lang: 'en', modelValue: { county: '臺北市', district: '中正區', zip: '100' } } })
    expect(checked(zh.findAll('select')[0])).toBe('Taipei City')
  })

  it('hides the special islands unless include-islands', () => {
    const w = mount(MlTaiwanRegion, { props: { modelValue: { county: '高雄市', district: '新興區', zip: '800' } } })
    expect(w.findAll('select')[1].findAll('option')).toHaveLength(39)
    const all = mount(MlTaiwanRegion, { props: { includeIslands: true, modelValue: { county: '高雄市', district: '新興區', zip: '800' } } })
    expect(all.findAll('select')[1].text()).toContain('817 東沙群島')
  })

  it('search variant filters by 台/臺, English and zip', async () => {
    const w = mount(MlTaiwanRegion, { props: { variant: 'search', id: 's' }, attachTo: document.body })
    const input = w.find('input')
    await input.setValue('台中 北屯')
    expect(w.findAll('[role="option"]').map((o) => o.text())).toEqual(['406 臺中市 北屯區'])
    await input.setValue('Banqiao')
    expect(w.findAll('[role="option"]').map((o) => o.text())).toEqual(['220 新北市 板橋區'])
    await input.setValue('300')
    expect(w.findAll('[role="option"]')).toHaveLength(3)
    await w.findAll('[role="option"]')[2].trigger('click')
    expect(w.emitted('update:modelValue')!.at(-1)).toEqual([{ county: '新竹市', district: '香山區', zip: '300' }])
    await w.setProps({ modelValue: { county: '新竹市', district: '香山區', zip: '300' } })
    expect((w.find('input').element as HTMLInputElement).value).toBe('300 新竹市 香山區')
    w.unmount()
  })

  it('validates inside MlFormItem: a county alone is still empty', async () => {
    const model = reactive({ region: null as MlTaiwanRegionValue | null })
    const Demo = defineComponent({
      setup: () => () =>
        h(MlForm, { model, rules: { region: { required: true, message: '請選擇地區' } } }, () =>
          h(MlFormItem, { prop: 'region' }, () =>
            h(MlTaiwanRegion, { modelValue: model.region, 'onUpdate:modelValue': (v: MlTaiwanRegionValue | null) => (model.region = v), label: '地區' }),
          ),
        ),
    })
    const w = mount(Demo, { attachTo: document.body })
    expect(w.find('.ml-field__required').exists()).toBe(true)
    const [county] = w.findAll('select')
    expect(county.attributes('required')).toBeDefined()
    await pick(county, '澎湖縣')
    await w.find('form').trigger('submit')
    await new Promise((r) => setTimeout(r))
    await nextTick()
    expect(w.findAll('.ml-field__error').map((e) => e.text())).toEqual(['請選擇地區'])
    expect(county.attributes('aria-invalid')).toBe('true')
    await pick(w.findAll('select')[1], '馬公市')
    await new Promise((r) => setTimeout(r))
    await nextTick()
    expect(model.region).toEqual({ county: '澎湖縣', district: '馬公市', zip: '880' })
    expect(w.find('.ml-field__error').exists()).toBe(false)
    w.unmount()
  })
})
