// View helpers shared by MlTaiwanRegion (Vue) and TaiwanRegion (React) — framework-free.
import {
  findTaiwanDistrict,
  getTaiwanCounties,
  type MlTaiwanRegionValue,
  type TaiwanCounty,
  type TaiwanDistrict,
} from '../taiwan-regions'

export type RegionLang = 'zh' | 'en'

/** ConfigProvider locale → which names to show. */
export const regionLang = (localeName: string, lang?: RegionLang): RegionLang =>
  lang ?? (localeName.toLowerCase().startsWith('zh') ? 'zh' : 'en')

export const countyLabel = (c: TaiwanCounty, lang: RegionLang) => (lang === 'en' ? c.en : c.name)

export const districtLabel = (d: TaiwanDistrict, lang: RegionLang, zip: boolean) =>
  `${zip ? `${d.zip} ` : ''}${lang === 'en' ? d.en : d.name}`

/** One-line label for the searchable variant: 「220 新北市 板橋區」 / 「220 Banqiao Dist., New Taipei City」. */
export const searchLabel = (d: TaiwanDistrict, lang: RegionLang, zip: boolean) =>
  `${zip ? `${d.zip} ` : ''}${lang === 'en' ? `${d.en}, ${d.countyEn}` : `${d.county} ${d.name}`}`

/** Stable option key — zips aren't unique (300, 600), names within a county are. */
export const regionKey = (county: string, district: string) => `${county}/${district}`

export const toValue = (d: TaiwanDistrict): MlTaiwanRegionValue => ({ county: d.county, district: d.name, zip: d.zip })

/** Resolve a (possibly 台-spelled or English) value to its district. */
export const resolveRegion = (value: MlTaiwanRegionValue | null | undefined): TaiwanDistrict | undefined =>
  value?.county && value.district ? findTaiwanDistrict(value.county, value.district) : undefined

export const regionCounties = (includeIslands: boolean) => getTaiwanCounties({ includeIslands })
