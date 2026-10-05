// MlTaiwanAddress and the address helpers.
import { afterEach, describe, expect, it } from 'vitest'
import { mount, type VueWrapper } from '@vue/test-utils'
import { MlTaiwanAddress, chineseNumeral, emptyTaiwanAddress, formatStreet, formatTwAddress, isTwAddressComplete, parseTwAddress, twZipStatus, type MlTaiwanAddressValue } from '../src'
import { fromChineseNumeral, rebaseZip } from '../src/components/address'

let wrapper: VueWrapper | undefined
afterEach(() => {
  wrapper?.unmount()
  wrapper = undefined
  document.body.innerHTML = ''
})
const prop = (key: string) => (wrapper!.props() as Record<string, unknown>)[key]

const value: MlTaiwanAddressValue = { county: '台北市', district: '中正區', zip: '100-603', road: '重慶南路', section: '1', number: '122之1', floor: '5', room: '3' }

describe('numerals', () => {
  it('round-trips 段 numbers', () => {
    expect([1, 10, 12, 20, 25, 99].map(chineseNumeral)).toEqual(['一', '十', '十二', '二十', '二十五', '九十九'])
    expect(['一', '十', '十二', '二十五', '九十九', '7'].map(fromChineseNumeral)).toEqual([1, 10, 12, 25, 99, 7])
    expect(fromChineseNumeral('x')).toBeNaN()
    expect(chineseNumeral('A')).toBe('A')
  })
})

describe('formatTwAddress', () => {
  it('Chinese, with 臺 and the 3+3 code', () => {
    expect(formatTwAddress(value)).toBe('100-603臺北市中正區重慶南路一段122之1號5樓之3')
    expect(formatTwAddress({ ...value, zip: '' })).toBe('100臺北市中正區重慶南路一段122之1號5樓之3')
    expect(formatTwAddress(value, { zip: false })).toBe('臺北市中正區重慶南路一段122之1號5樓之3')
  })

  it('English in Chunghwa Post order', () => {
    expect(formatTwAddress({ ...value, road: 'Chongqing S. Rd.', lane: '5', alley: '2' }, { lang: 'en' })).toBe(
      '5F.-3, No. 122-1, Aly. 2, Ln. 5, Sec. 1, Chongqing S. Rd., Zhongzheng Dist., Taipei City 100-603',
    )
    expect(formatTwAddress({ ...value, section: '二', floor: 'b1', room: '' }, { lang: 'en' })).toContain('B1F., No. 122-1, Sec. 2')
  })

  it('street only, and completeness', () => {
    expect(formatStreet({ road: '中山路', number: '1', lane: '2', alley: '3' })).toBe('中山路2巷3弄1號')
    expect(isTwAddressComplete(value)).toBe(true)
    expect(isTwAddressComplete({ ...value, number: '' })).toBe(false)
    expect(isTwAddressComplete(emptyTaiwanAddress())).toBe(false)
  })
})

describe('parseTwAddress', () => {
  it.each([
    ['100台北市中正區重慶南路一段122號5樓', { zip: '100', county: '臺北市', district: '中正區', road: '重慶南路', section: '1', number: '122', floor: '5', rest: '' }],
    ['高雄市苓雅區中山一路12巷3弄45號之1', { zip: '802', county: '高雄市', district: '苓雅區', road: '中山一路', lane: '12', alley: '3', number: '45之1', rest: '' }],
    ['臺中市西屯區文華里12鄰台灣大道三段99號B1', { county: '臺中市', district: '西屯區', road: '台灣大道', section: '3', number: '99', floor: 'B1', rest: '文華里12鄰' }],
    ['新北市板橋區文化路２段１８２巷５號十二樓之3', { county: '新北市', district: '板橋區', road: '文化路', section: '2', lane: '182', number: '5', floor: '12', room: '3' }],
    ['220-01 新北市板橋區中山路一段1號地下一樓', { zip: '220-01', road: '中山路', section: '1', number: '1', floor: 'B1' }],
    ['台灣台北市大安區', { county: '臺北市', district: '大安區', zip: '106' }],
  ])('%s', (text, expected) => {
    expect(parseTwAddress(text)).toMatchObject(expected)
  })

  it('leaves out what it cannot find', () => {
    expect(parseTwAddress('hello')).toEqual({ rest: 'hello' })
  })
})

describe('postal codes', () => {
  it('checks the prefix against the district', () => {
    expect(twZipStatus('', '臺北市', '中正區')).toBe('empty')
    expect(twZipStatus('100', '臺北市', '中正區')).toBe('partial')
    expect(twZipStatus('100-603', '臺北市', '中正區')).toBe('ok')
    expect(twZipStatus('10060', '臺北市', '中正區')).toBe('ok')
    expect(twZipStatus('106', '臺北市', '中正區')).toBe('mismatch')
    expect(twZipStatus('10', '', '')).toBe('invalid')
    expect(rebaseZip('100-603', '106')).toBe('106-603')
    expect(rebaseZip('100', '106')).toBe('106')
    expect(rebaseZip('100-603', '')).toBe('')
  })
})

describe('MlTaiwanAddress', () => {
  it('renders region, zip, street parts and the preview', () => {
    wrapper = mount(MlTaiwanAddress, { props: { modelValue: value, label: '地址', required: true, english: true } })
    expect(wrapper.find('legend').text()).toBe('地址*')
    expect((wrapper.find('.ml-address__zip input').element as HTMLInputElement).value).toBe('100-603')
    expect(wrapper.findAll('.ml-address__row--street .ml-input__affix').map((a) => a.text())).toEqual(['段', '巷', '弄', '號', '樓', '之'])
    const lines = wrapper.findAll('.ml-address__line').map((l) => l.text())
    expect(lines[0]).toBe('100-603臺北市中正區重慶南路一段122之1號5樓之3')
    expect(lines[1]).toContain('Zhongzheng Dist., Taipei City 100-603')
  })

  it('edits parts and keeps the zip suffix when the district changes', async () => {
    wrapper = mount(MlTaiwanAddress, { props: { modelValue: value, 'onUpdate:modelValue': (v: MlTaiwanAddressValue) => wrapper!.setProps({ modelValue: v }) } })
    await wrapper.find('.ml-address__number input').setValue('200')
    expect((prop('modelValue') as MlTaiwanAddressValue).number).toBe('200')
    const district = wrapper.findAll('select')[1]
    const daan = [...(district.element as HTMLSelectElement).options].find((o) => o.textContent?.includes('大安'))!.value
    await district.setValue(daan)
    expect(prop('modelValue')).toMatchObject({ district: '大安區', zip: '106-603' })
  })

  it('flags a zip that belongs elsewhere; shows the 3-digit hint', async () => {
    wrapper = mount(MlTaiwanAddress, { props: { modelValue: { ...value, zip: '106-603' } } })
    expect(wrapper.find('.ml-address__zip .ml-field__error').text()).toBe('郵遞區號前 3 碼和行政區不符')
    await wrapper.setProps({ modelValue: { ...value, zip: '100' } })
    expect(wrapper.find('.ml-field__hint').text()).toContain('前 3 碼依行政區自動帶入')
  })

  it('splits a pasted address into the fields', async () => {
    wrapper = mount(MlTaiwanAddress, { props: { modelValue: emptyTaiwanAddress(), 'onUpdate:modelValue': (v: MlTaiwanAddressValue) => wrapper!.setProps({ modelValue: v }) } })
    const event = new Event('paste', { bubbles: true, cancelable: true }) as Event & { clipboardData: { getData: () => string } }
    event.clipboardData = { getData: () => '802高雄市苓雅區中山二路12巷3弄45號之1' }
    wrapper.find('.ml-address__road input').element.dispatchEvent(event)
    await wrapper.vm.$nextTick()
    expect(event.defaultPrevented).toBe(true)
    expect(prop('modelValue')).toMatchObject({ zip: '802', county: '高雄市', district: '苓雅區', road: '中山二路', lane: '12', alley: '3', number: '45之1' })
    expect(wrapper.find('.ml-address__note').text()).toBe('已自動拆解貼上的地址')
    expect(wrapper.emitted('paste')).toHaveLength(1)
  })

  it('ordinary text pastes normally', () => {
    wrapper = mount(MlTaiwanAddress)
    const event = new Event('paste', { bubbles: true, cancelable: true }) as Event & { clipboardData: { getData: () => string } }
    event.clipboardData = { getData: () => '中山' }
    wrapper.find('.ml-address__road input').element.dispatchEvent(event)
    expect(event.defaultPrevented).toBe(false)
  })
})
