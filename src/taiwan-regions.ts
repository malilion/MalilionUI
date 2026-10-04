// 台灣縣市／鄉鎮市區／3 碼郵遞區號 — framework-free, shared by MlTaiwanRegion (Vue)
// and TaiwanRegion (React). Nothing here runs at import time, so apps that never
// touch these helpers tree-shake the whole table away.
//
// Data source: 中華郵政股份有限公司「縣市鄉鎮中英對照檔」(政府資料開放平臺 dataset 5949,
// https://data.gov.tw/dataset/5949 → https://www.post.gov.tw/post/download/County_h_10906.xml),
// English names in 中華郵政 romanization (漢語拼音). Cross-checked against 中華郵政「3碼郵遞區號與
// 行政區中心點經緯度對照表」(dataset 25489). License: 政府資料開放授權條款－第1版
// (Open Government Data License, version 1.0, https://data.gov.tw/license).
// Regenerate with `node scripts/build-taiwan-regions.mjs`.
//
// 22 縣市, 368 鄉鎮市區, plus the three areas Chunghwa Post also numbers —
// 290 釣魚臺 (宜蘭縣), 817 東沙群島 and 819 南沙群島 (高雄市) — flagged `island: true`.

export interface TaiwanDistrict {
  /** 3-digit postal code. Not unique: 新竹市 and 嘉義市 share one per city. */
  zip: string
  /** 鄉鎮市區, e.g. 中正區 */
  name: string
  /** e.g. Zhongzheng Dist. */
  en: string
  /** 縣市, e.g. 臺北市 */
  county: string
  /** e.g. Taipei City */
  countyEn: string
  /** 釣魚臺 / 東沙群島 / 南沙群島 — hidden unless `includeIslands`. */
  island?: boolean
}

export interface TaiwanCounty {
  name: string
  en: string
  districts: TaiwanDistrict[]
}

/** v-model / value of MlTaiwanRegion: a complete 縣市 + 鄉鎮市區 pick, or null. Names are official (臺). */
export interface MlTaiwanRegionValue {
  county: string
  district: string
  zip: string
}

export interface TaiwanRegionOptions {
  /** Include 釣魚臺 (290), 東沙群島 (817) and 南沙群島 (819). Default false. */
  includeIslands?: boolean
}

// <generated-data>
const DATA =
  "臺北市Taipei:100中正區Zhongzheng,103大同區Datong,104中山區Zhongshan,105松山區Songshan,106大安區Da’an,108萬華區Wanhua,110信義區Xinyi,111士林區Shilin,112北投區Beitou,114內湖區Neihu,115南港區Nangang,116文山區Wenshan|" +
  "基隆市Keelung:200仁愛區Ren’ai,201信義區Xinyi,202中正區Zhongzheng,203中山區Zhongshan,204安樂區Anle,205暖暖區Nuannuan,206七堵區Qidu|" +
  "新北市New Taipei:207萬里區Wanli,208金山區Jinshan,220板橋區Banqiao,221汐止區Xizhi,222深坑區Shenkeng,223石碇區Shiding,224瑞芳區Ruifang,226平溪區Pingxi,227雙溪區Shuangxi,228貢寮區Gongliao,231新店區Xindian,232坪林區Pinglin,233烏來區Wulai,234永和區Yonghe,235中和區Zhonghe,236土城區Tucheng,237三峽區Sanxia,238樹林區Shulin,239鶯歌區Yingge,241三重區Sanchong,242新莊區Xinzhuang,243泰山區Taishan,244林口區Linkou,247蘆洲區Luzhou,248五股區Wugu,249八里區Bali,251淡水區Tamsui,252三芝區Sanzhi,253石門區Shimen|" +
  "連江縣Lienchiang:209南竿鄉Nangan,210北竿鄉Beigan,211莒光鄉Juguang,212東引鄉Dongyin|" +
  "宜蘭縣Yilan:260宜蘭市Yilan,261頭城鎮Toucheng,262礁溪鄉Jiaoxi,263壯圍鄉Zhuangwei,264員山鄉Yuanshan,265羅東鎮Luodong,266三星鄉Sanxing,267大同鄉Datong,268五結鄉Wujie,269冬山鄉Dongshan,270蘇澳鎮Su’ao,272南澳鄉Nan’ao,!290釣魚臺=Diaoyutai|" +
  "新竹市Hsinchu:300東區East,300北區North,300香山區Xiangshan|" +
  "新竹縣Hsinchu:302竹北市Zhubei,303湖口鄉Hukou,304新豐鄉Xinfeng,305新埔鎮Xinpu,306關西鎮Guanxi,307芎林鄉Qionglin,308寶山鄉Baoshan,310竹東鎮Zhudong,311五峰鄉Wufeng,312橫山鄉Hengshan,313尖石鄉Jianshi,314北埔鄉Beipu,315峨眉鄉Emei|" +
  "桃園市Taoyuan:320中壢區Zhongli,324平鎮區Pingzhen,325龍潭區Longtan,326楊梅區Yangmei,327新屋區Xinwu,328觀音區Guanyin,330桃園區Taoyuan,333龜山區Guishan,334八德區Bade,335大溪區Daxi,336復興區Fuxing,337大園區Dayuan,338蘆竹區Luzhu|" +
  "苗栗縣Miaoli:350竹南鎮Zhunan,351頭份市Toufen,352三灣鄉Sanwan,353南庄鄉Nanzhuang,354獅潭鄉Shitan,356後龍鎮Houlong,357通霄鎮Tongxiao,358苑裡鎮Yuanli,360苗栗市Miaoli,361造橋鄉Zaoqiao,362頭屋鄉Touwu,363公館鄉Gongguan,364大湖鄉Dahu,365泰安鄉Tai’an,366銅鑼鄉Tongluo,367三義鄉Sanyi,368西湖鄉Xihu,369卓蘭鎮Zhuolan|" +
  "臺中市Taichung:400中區Central,401東區East,402南區South,403西區West,404北區North,406北屯區Beitun,407西屯區Xitun,408南屯區Nantun,411太平區Taiping,412大里區Dali,413霧峰區Wufeng,414烏日區Wuri,420豐原區Fengyuan,421后里區Houli,422石岡區Shigang,423東勢區Dongshi,424和平區Heping,426新社區Xinshe,427潭子區Tanzi,428大雅區Daya,429神岡區Shengang,432大肚區Dadu,433沙鹿區Shalu,434龍井區Longjing,435梧棲區Wuqi,436清水區Qingshui,437大甲區Dajia,438外埔區Waipu,439大安區Da’an|" +
  "彰化縣Changhua:500彰化市Changhua,502芬園鄉Fenyuan,503花壇鄉Huatan,504秀水鄉Xiushui,505鹿港鎮Lukang,506福興鄉Fuxing,507線西鄉Xianxi,508和美鎮Hemei,509伸港鄉Shengang,510員林市Yuanlin,511社頭鄉Shetou,512永靖鄉Yongjing,513埔心鄉Puxin,514溪湖鎮Xihu,515大村鄉Dacun,516埔鹽鄉Puyan,520田中鎮Tianzhong,521北斗鎮Beidou,522田尾鄉Tianwei,523埤頭鄉Pitou,524溪州鄉Xizhou,525竹塘鄉Zhutang,526二林鎮Erlin,527大城鄉Dacheng,528芳苑鄉Fangyuan,530二水鄉Ershui|" +
  "南投縣Nantou:540南投市Nantou,541中寮鄉Zhongliao,542草屯鎮Caotun,544國姓鄉Guoxing,545埔里鎮Puli,546仁愛鄉Ren’ai,551名間鄉Mingjian,552集集鎮Jiji,553水里鄉Shuili,555魚池鄉Yuchi,556信義鄉Xinyi,557竹山鎮Zhushan,558鹿谷鄉Lugu|" +
  "嘉義市Chiayi:600東區East,600西區West|" +
  "嘉義縣Chiayi:602番路鄉Fanlu,603梅山鄉Meishan,604竹崎鄉Zhuqi,605阿里山鄉Alishan,606中埔鄉Zhongpu,607大埔鄉Dapu,608水上鄉Shuishang,611鹿草鄉Lucao,612太保市Taibao,613朴子市Puzi,614東石鄉Dongshi,615六腳鄉Liujiao,616新港鄉Xingang,621民雄鄉Minxiong,622大林鎮Dalin,623溪口鄉Xikou,624義竹鄉Yizhu,625布袋鎮Budai|" +
  "雲林縣Yunlin:630斗南鎮Dounan,631大埤鄉Dapi,632虎尾鎮Huwei,633土庫鎮Tuku,634褒忠鄉Baozhong,635東勢鄉Dongshi,636臺西鄉Taixi,637崙背鄉Lunbei,638麥寮鄉Mailiao,640斗六市Douliu,643林內鄉Linnei,646古坑鄉Gukeng,647莿桐鄉Citong,648西螺鎮Xiluo,649二崙鄉Erlun,651北港鎮Beigang,652水林鄉Shuilin,653口湖鄉Kouhu,654四湖鄉Sihu,655元長鄉Yuanzhang|" +
  "臺南市Tainan:700中西區West Central,701東區East,702南區South,704北區North,708安平區Anping,709安南區Annan,710永康區Yongkang,711歸仁區Guiren,712新化區Xinhua,713左鎮區Zuozhen,714玉井區Yujing,715楠西區Nanxi,716南化區Nanhua,717仁德區Rende,718關廟區Guanmiao,719龍崎區Longqi,720官田區Guantian,721麻豆區Madou,722佳里區Jiali,723西港區Xigang,724七股區Qigu,725將軍區Jiangjun,726學甲區Xuejia,727北門區Beimen,730新營區Xinying,731後壁區Houbi,732白河區Baihe,733東山區Dongshan,734六甲區Liujia,735下營區Xiaying,736柳營區Liuying,737鹽水區Yanshui,741善化區Shanhua,742大內區Danei,743山上區Shanshang,744新市區Xinshi,745安定區Anding|" +
  "高雄市Kaohsiung:800新興區Xinxing,801前金區Qianjin,802苓雅區Lingya,803鹽埕區Yancheng,804鼓山區Gushan,805旗津區Qijin,806前鎮區Qianzhen,807三民區Sanmin,811楠梓區Nanzi,812小港區Xiaogang,813左營區Zuoying,814仁武區Renwu,815大社區Dashe,!817東沙群島=Dongsha Islands,!819南沙群島=Nansha Islands,820岡山區Gangshan,821路竹區Luzhu,822阿蓮區Alian,823田寮區Tianliao,824燕巢區Yanchao,825橋頭區Qiaotou,826梓官區Ziguan,827彌陀區Mituo,828永安區Yong’an,829湖內區Hunei,830鳳山區Fengshan,831大寮區Daliao,832林園區Linyuan,833鳥松區Niaosong,840大樹區Dashu,842旗山區Qishan,843美濃區Meinong,844六龜區Liugui,845內門區Neimen,846杉林區Shanlin,847甲仙區Jiaxian,848桃源區Taoyuan,849那瑪夏區Namaxia,851茂林區Maolin,852茄萣區Qieding|" +
  "澎湖縣Penghu:880馬公市Magong,881西嶼鄉Xiyu,882望安鄉Wang’an,883七美鄉Qimei,884白沙鄉Baisha,885湖西鄉Huxi|" +
  "金門縣Kinmen:890金沙鎮Jinsha,891金湖鎮Jinhu,892金寧鄉Jinning,893金城鎮Jincheng,894烈嶼鄉Lieyu,896烏坵鄉Wuqiu|" +
  "屏東縣Pingtung:900屏東市Pingtung,901三地門鄉Sandimen,902霧臺鄉Wutai,903瑪家鄉Majia,904九如鄉Jiuru,905里港鄉Ligang,906高樹鄉Gaoshu,907鹽埔鄉Yanpu,908長治鄉Changzhi,909麟洛鄉Linluo,911竹田鄉Zhutian,912內埔鄉Neipu,913萬丹鄉Wandan,920潮州鎮Chaozhou,921泰武鄉Taiwu,922來義鄉Laiyi,923萬巒鄉Wanluan,924崁頂鄉Kanding,925新埤鄉Xinpi,926南州鄉Nanzhou,927林邊鄉Linbian,928東港鎮Donggang,929琉球鄉Liuqiu,931佳冬鄉Jiadong,932新園鄉Xinyuan,940枋寮鄉Fangliao,941枋山鄉Fangshan,942春日鄉Chunri,943獅子鄉Shizi,944車城鄉Checheng,945牡丹鄉Mudan,946恆春鎮Hengchun,947滿州鄉Manzhou|" +
  "臺東縣Taitung:950臺東市Taitung,951綠島鄉Ludao,952蘭嶼鄉Lanyu,953延平鄉Yanping,954卑南鄉Beinan,955鹿野鄉Luye,956關山鎮Guanshan,957海端鄉Haiduan,958池上鄉Chishang,959東河鄉Donghe,961成功鎮Chenggong,962長濱鄉Changbin,963太麻里鄉Taimali,964金峰鄉Jinfeng,965大武鄉Dawu,966達仁鄉Daren|" +
  "花蓮縣Hualien:970花蓮市Hualien,971新城鄉Xincheng,972秀林鄉Xiulin,973吉安鄉Ji’an,974壽豐鄉Shoufeng,975鳳林鎮Fenglin,976光復鄉Guangfu,977豐濱鄉Fengbin,978瑞穗鄉Ruisui,979萬榮鄉Wanrong,981玉里鎮Yuli,982卓溪鄉Zhuoxi,983富里鄉Fuli"
// </generated-data>

const SUFFIX: Record<string, string> = { 市: ' City', 縣: ' County', 區: ' Dist.', 鄉: ' Township', 鎮: ' Township' }
const expand = (zh: string, en: string) => (en.startsWith('=') ? en.slice(1) : en + (SUFFIX[zh[zh.length - 1]] ?? ''))

let table: TaiwanCounty[] | undefined

function all(): TaiwanCounty[] {
  if (table) return table
  table = DATA.split('|').map((chunk) => {
    const [head, list] = chunk.split(':')
    const [, name, enBase] = /^([㐀-鿿]+)(.*)$/.exec(head)!
    const county: TaiwanCounty = { name, en: expand(name, enBase), districts: [] }
    for (const item of list.split(',')) {
      const [, flag, zip, zh, en] = /^(!?)(\d{3})([㐀-鿿]+)(.*)$/.exec(item)!
      const d: TaiwanDistrict = { zip, name: zh, en: expand(zh, en), county: name, countyEn: county.en }
      if (flag) d.island = true
      county.districts.push(d)
    }
    return county
  })
  return table
}

/** 台 → 臺 so either spelling finds the official name. */
export function normalizeTaiwanName(text: string): string {
  return text.replace(/台/g, '臺').trim()
}

/** Every 縣市 in Chunghwa Post order (north → south → islands), each with its 鄉鎮市區. */
export function getTaiwanCounties(options: TaiwanRegionOptions = {}): TaiwanCounty[] {
  if (options.includeIslands) return all()
  return all().map((c) => ({ ...c, districts: c.districts.filter((d) => !d.island) }))
}

/** One 縣市 by Chinese (台 or 臺) or English name. */
export function getTaiwanCounty(name: string, options: TaiwanRegionOptions = {}): TaiwanCounty | undefined {
  const key = normalizeTaiwanName(name)
  const lower = key.toLowerCase()
  return getTaiwanCounties(options).find((c) => c.name === key || c.en.toLowerCase() === lower)
}

/** The 鄉鎮市區 of a 縣市 (empty when the 縣市 is unknown). */
export function getTaiwanDistricts(county: string, options: TaiwanRegionOptions = {}): TaiwanDistrict[] {
  return getTaiwanCounty(county, options)?.districts ?? []
}

/** One 鄉鎮市區. Accepts 台/臺 and English names. Islands are always found. */
export function findTaiwanDistrict(county: string, district: string): TaiwanDistrict | undefined {
  const name = normalizeTaiwanName(district)
  const lower = name.toLowerCase()
  return getTaiwanDistricts(county, { includeIslands: true }).find((d) => d.name === name || d.en.toLowerCase() === lower)
}

/** Every 鄉鎮市區 using a postal code — usually one, but 300 is all of 新竹市 and 600 all of 嘉義市. */
export function findTaiwanDistrictsByZip(zip: string | number): TaiwanDistrict[] {
  const code = String(zip).trim().slice(0, 3)
  return all().flatMap((c) => c.districts.filter((d) => d.zip === code))
}

const squash = (s: string) => s.toLowerCase().replace(/[\s'’.,-]/g, '')

/** Does one district match a single search token? */
function matchToken(d: TaiwanDistrict, token: string): boolean {
  if (/^\d+$/.test(token)) return d.zip.startsWith(token)
  if (/[㐀-鿿]/.test(token)) {
    const t = normalizeTaiwanName(token)
    if ((d.county + d.name).includes(t)) return true
    // 「新北板橋」: a 縣市 piece (2+ characters, so 「台西」 isn't 臺… + 西區) then a 鄉鎮市區 piece.
    for (let i = 2; i < t.length; i++) {
      if (d.county.includes(t.slice(0, i)) && d.name.includes(t.slice(i))) return true
    }
    return false
  }
  const t = squash(token)
  return !!t && (squash(d.en).includes(t) || squash(d.countyEn).includes(t) || squash(`${d.en}${d.countyEn}`).includes(t))
}

/** Is `query` a match for this district? Every whitespace-separated word must hit the zip prefix, Chinese or English name. */
export function matchTaiwanDistrict(d: TaiwanDistrict, query: string): boolean {
  const tokens = query.trim().split(/[\s,，、/]+/).filter(Boolean)
  return tokens.length > 0 && tokens.every((t) => matchToken(d, t))
}

/**
 * Search by 中文 (台 or 臺), English or postal-code prefix — 「板橋」「台北 中正」「220」
 * 「Banqiao」. Exact zip and name-prefix hits come first; ties keep the official order.
 */
export function searchTaiwanRegions(query: string, options: TaiwanRegionOptions & { limit?: number } = {}): TaiwanDistrict[] {
  const q = query.trim()
  if (!q) return []
  const nq = normalizeTaiwanName(q)
  const lower = squash(q)
  const rank = (d: TaiwanDistrict) =>
    d.zip === q ? 0 : d.name.startsWith(nq) || squash(d.en).startsWith(lower) ? 1 : d.zip.startsWith(q) ? 2 : 3
  const hits = getTaiwanCounties(options)
    .flatMap((c) => c.districts)
    .filter((d) => matchTaiwanDistrict(d, q))
    .map((d, i) => ({ d, i, r: rank(d) }))
    .sort((a, b) => a.r - b.r || a.i - b.i)
    .map((x) => x.d)
  return options.limit ? hits.slice(0, options.limit) : hits
}

export interface TaiwanAddressParts {
  county: string
  district: string
  zip?: string
}

/**
 * One address line. Chinese: 「100臺北市中正區重慶南路一段122號」.
 * English (Chunghwa Post order): 「No. 122, Sec. 1, Chongqing S. Rd., Zhongzheng Dist., Taipei City 100」.
 */
export function formatTaiwanAddress(
  region: TaiwanAddressParts,
  options: { lang?: 'zh' | 'en'; address?: string; zip?: boolean } = {},
): string {
  const d = findTaiwanDistrict(region.county, region.district)
  const zip = options.zip === false ? '' : (region.zip ?? d?.zip ?? '')
  const address = options.address?.trim() ?? ''
  if (options.lang === 'en') {
    const place = `${d?.en ?? region.district}, ${d?.countyEn ?? region.county}${zip ? ` ${zip}` : ''}`
    return address ? `${address}, ${place}` : place
  }
  return `${zip}${d?.county ?? normalizeTaiwanName(region.county)}${d?.name ?? normalizeTaiwanName(region.district)}${address}`
}
