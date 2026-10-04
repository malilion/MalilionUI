// Regenerate the 縣市／鄉鎮市區／郵遞區號 table inside src/taiwan-regions.ts.
//   node scripts/build-taiwan-regions.mjs            download the official file and rewrite
//   node scripts/build-taiwan-regions.mjs file.xml   use a local copy instead
//
// Source: 中華郵政「縣市鄉鎮中英對照檔」(data.gov.tw dataset 5949,
// https://www.post.gov.tw/post/download/County_h_10906.xml), released under the
// 政府資料開放授權條款－第1版 (Open Government Data License, version 1.0).
// Each record is <欄位1>zip</欄位1><欄位2>縣市+鄉鎮市區</欄位2><欄位3>English</欄位3>.
import { readFileSync, writeFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'

const SOURCE = 'https://www.post.gov.tw/post/download/County_h_10906.xml'
const target = fileURLToPath(new URL('../src/taiwan-regions.ts', import.meta.url))

const xml = process.argv[2] ? readFileSync(process.argv[2], 'utf8') : await (await fetch(SOURCE)).text()

const rows = [...xml.matchAll(/<欄位1>(.*?)<\/欄位1>\s*<欄位2>(.*?)<\/欄位2>\s*<欄位3>(.*?)<\/欄位3>/g)].map((m) => ({
  zip: m[1].trim(),
  // The official names use 臺; the file has one stray 台 (釣魚台).
  zh: m[2].trim().replaceAll('台', '臺'),
  en: m[3].trim().replaceAll('&amp;', '&'),
}))

// Special areas the file lists without a real county. Chunghwa Post files them
// under 宜蘭縣 (釣魚臺列嶼, per its 3-digit zip ↔ district centroid table) and
// 高雄市 (南海諸島, administered by Kaohsiung); the UI hides them by default.
const ISLANDS = { 290: '宜蘭縣', 817: '高雄市', 819: '高雄市' }

const counties = new Map()
for (const row of rows) {
  if (!/^\d{3}$/.test(row.zip)) throw new Error(`bad zip ${row.zip}`)
  const island = row.zip in ISLANDS
  let county, district, districtEn
  if (island) {
    county = ISLANDS[row.zip]
    district = row.zh.startsWith(county) ? row.zh.slice(county.length) : row.zh
    districtEn = row.en.split(',')[0].trim()
  } else {
    county = row.zh.slice(0, 3)
    district = row.zh.slice(3)
    const parts = row.en.split(',').map((s) => s.trim())
    if (parts.length !== 2) throw new Error(`unexpected English name ${row.en}`)
    districtEn = parts[0]
    const countyEn = parts[1]
    const c = counties.get(county)
    if (c && c.en && c.en !== countyEn) throw new Error(`county English mismatch ${county}`)
    if (c && !c.en) c.en = countyEn
    if (!c) counties.set(county, { en: countyEn, districts: [] })
  }
  if (!/^[㐀-鿿]+$/.test(county + district)) throw new Error(`unexpected characters in ${county}${district}`)
  if (!counties.has(county)) counties.set(county, { en: '', districts: [] })
  counties.get(county).districts.push({ zip: row.zip, name: district, en: districtEn, island })
}

/* Compact encoding — see decode() in src/taiwan-regions.ts:
 *   counties joined by "|"; a county is "<中文><English base>:" + districts joined by ",";
 *   a district is ["!" if special island] + zip + <中文> + <English base>.
 *   The English suffix is implied by the last Chinese character (市 City, 縣 County,
 *   區 Dist., 鄉/鎮 Township); a base that doesn't follow the rule starts with "=" and is kept whole. */
const SUFFIX = { 市: ' City', 縣: ' County', 區: ' Dist.', 鄉: ' Township', 鎮: ' Township' }
const shorten = (zh, en) => {
  const s = SUFFIX[zh.at(-1)]
  return s && en.endsWith(s) && en.length > s.length ? en.slice(0, -s.length) : `=${en}`
}
const encoded = [...counties]
  .map(([name, c]) => {
    const list = c.districts.map((d) => `${d.island ? '!' : ''}${d.zip}${d.name}${shorten(d.name, d.en)}`).join(',')
    return `${name}${shorten(name, c.en)}:${list}`
  })
  .join('|')
if (/[|:,!=]/.test([...counties.values()].flatMap((c) => [c.en, ...c.districts.map((d) => d.en)]).join(''))) throw new Error('separator character inside a name')

const total = [...counties.values()].reduce((n, c) => n + c.districts.filter((d) => !d.island).length, 0)
if (counties.size !== 22 || total !== 368) throw new Error(`expected 22 counties / 368 districts, got ${counties.size} / ${total}`)

const src = readFileSync(target, 'utf8')
const start = '// <generated-data>'
const end = '// </generated-data>'
const block = `${start}\nconst DATA =\n  ${JSON.stringify(encoded).replace(/\|/g, '|" +\n  "')}\n${end}`
const next = src.replace(new RegExp(`${start}[\\s\\S]*?${end}`), block)
if (next === src && !src.includes(block)) throw new Error('markers not found in src/taiwan-regions.ts')
writeFileSync(target, next)
console.log(`taiwan-regions: ${counties.size} counties, ${total} districts (+${Object.keys(ISLANDS).length} special islands)`)
