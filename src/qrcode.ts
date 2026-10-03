/**
 * A small QR Code encoder (byte mode, versions 1–40, all four error-correction
 * levels). Follows ISO/IEC 18004 and the structure of Project Nayuki's
 * reference implementation, trimmed down to what <MlQRCode> needs.
 */

export type QrLevel = 'L' | 'M' | 'Q' | 'H'

const LEVEL_INDEX: Record<QrLevel, number> = { L: 0, M: 1, Q: 2, H: 3 }
const FORMAT_BITS: Record<QrLevel, number> = { L: 1, M: 0, Q: 3, H: 2 }

// Indexed by [level][version]; index 0 is padding.
const ECC_PER_BLOCK = [
  [-1, 7, 10, 15, 20, 26, 18, 20, 24, 30, 18, 20, 24, 26, 30, 22, 24, 28, 30, 28, 28, 28, 28, 30, 30, 26, 28, 30, 30, 30, 30, 30, 30, 30, 30, 30, 30, 30, 30, 30, 30],
  [-1, 10, 16, 26, 18, 24, 16, 18, 22, 22, 26, 30, 22, 22, 24, 24, 28, 28, 26, 26, 26, 26, 28, 28, 28, 28, 28, 28, 28, 28, 28, 28, 28, 28, 28, 28, 28, 28, 28, 28, 28],
  [-1, 13, 22, 18, 26, 18, 24, 18, 22, 20, 24, 28, 26, 24, 20, 30, 24, 28, 28, 26, 30, 28, 30, 30, 30, 30, 28, 30, 30, 30, 30, 30, 30, 30, 30, 30, 30, 30, 30, 30, 30],
  [-1, 17, 28, 22, 16, 22, 28, 26, 26, 24, 28, 24, 28, 22, 24, 24, 30, 28, 28, 26, 28, 30, 24, 30, 30, 30, 30, 30, 30, 30, 30, 30, 30, 30, 30, 30, 30, 30, 30, 30, 30],
]
const NUM_BLOCKS = [
  [-1, 1, 1, 1, 1, 1, 2, 2, 2, 2, 4, 4, 4, 4, 4, 6, 6, 6, 6, 7, 8, 8, 9, 9, 10, 12, 12, 12, 13, 14, 15, 16, 17, 18, 19, 19, 20, 21, 22, 24, 25],
  [-1, 1, 1, 1, 2, 2, 4, 4, 4, 5, 5, 5, 8, 9, 9, 10, 10, 11, 13, 14, 16, 17, 17, 18, 20, 21, 23, 25, 26, 28, 29, 31, 33, 35, 37, 38, 40, 43, 45, 47, 49],
  [-1, 1, 1, 2, 2, 4, 4, 6, 6, 8, 8, 8, 10, 12, 16, 12, 17, 16, 18, 21, 20, 23, 23, 25, 27, 29, 34, 34, 35, 38, 40, 43, 45, 48, 51, 53, 56, 59, 62, 65, 68],
  [-1, 1, 1, 2, 4, 4, 4, 5, 6, 8, 8, 11, 11, 16, 16, 18, 16, 19, 21, 25, 25, 25, 34, 30, 32, 35, 37, 40, 42, 45, 48, 51, 54, 57, 60, 63, 66, 70, 74, 77, 81],
]

function rawDataModules(ver: number) {
  let result = (16 * ver + 128) * ver + 64
  if (ver >= 2) {
    const numAlign = Math.floor(ver / 7) + 2
    result -= (25 * numAlign - 10) * numAlign - 55
    if (ver >= 7) result -= 36
  }
  return result
}

function dataCodewords(ver: number, level: QrLevel) {
  const l = LEVEL_INDEX[level]
  return Math.floor(rawDataModules(ver) / 8) - ECC_PER_BLOCK[l][ver] * NUM_BLOCKS[l][ver]
}

/* ── Reed–Solomon over GF(2^8) with polynomial 0x11D ── */
function gfMul(x: number, y: number) {
  let z = 0
  for (let i = 7; i >= 0; i--) {
    z = (z << 1) ^ ((z >>> 7) * 0x11d)
    z ^= ((y >>> i) & 1) * x
  }
  return z
}

function rsDivisor(degree: number) {
  const result = new Array<number>(degree).fill(0)
  result[degree - 1] = 1
  let root = 1
  for (let i = 0; i < degree; i++) {
    for (let j = 0; j < degree; j++) {
      result[j] = gfMul(result[j], root)
      if (j + 1 < degree) result[j] ^= result[j + 1]
    }
    root = gfMul(root, 0x02)
  }
  return result
}

function rsRemainder(data: number[], divisor: number[]) {
  const result = new Array<number>(divisor.length).fill(0)
  for (const b of data) {
    const factor = b ^ (result.shift() as number)
    result.push(0)
    divisor.forEach((coef, i) => (result[i] ^= gfMul(coef, factor)))
  }
  return result
}

function interleaveWithEcc(data: number[], ver: number, level: QrLevel) {
  const l = LEVEL_INDEX[level]
  const numBlocks = NUM_BLOCKS[l][ver]
  const eccLen = ECC_PER_BLOCK[l][ver]
  const raw = Math.floor(rawDataModules(ver) / 8)
  const numShort = numBlocks - (raw % numBlocks)
  const shortLen = Math.floor(raw / numBlocks)
  const divisor = rsDivisor(eccLen)
  const blocks: number[][] = []
  for (let i = 0, k = 0; i < numBlocks; i++) {
    const dat = data.slice(k, k + shortLen - eccLen + (i < numShort ? 0 : 1))
    k += dat.length
    const ecc = rsRemainder(dat, divisor)
    if (i < numShort) dat.push(0)
    blocks.push(dat.concat(ecc))
  }
  const result: number[] = []
  for (let i = 0; i < blocks[0].length; i++) {
    blocks.forEach((block, j) => {
      // Skip the padding byte of short blocks.
      if (i !== shortLen - eccLen || j >= numShort) result.push(block[i])
    })
  }
  return result
}

function alignmentPositions(ver: number) {
  if (ver === 1) return []
  const numAlign = Math.floor(ver / 7) + 2
  const size = ver * 4 + 17
  const step = ver === 32 ? 26 : Math.ceil((ver * 4 + 4) / (numAlign * 2 - 2)) * 2
  const result = [6]
  for (let pos = size - 7; result.length < numAlign; pos -= step) result.splice(1, 0, pos)
  return result
}

const bit = (x: number, i: number) => ((x >>> i) & 1) !== 0

export interface QrMatrix {
  size: number
  version: number
  /** modules[y][x] — true is a dark module. */
  modules: boolean[][]
  /** Finder / timing / alignment / format areas (for styling the "eyes"). */
  isFunction: boolean[][]
}

/** Encode text as a QR matrix. Throws when the text is too long for version 40. */
export function encodeQr(text: string, level: QrLevel = 'M', minVersion = 1): QrMatrix {
  const bytes = [...new TextEncoder().encode(text)]

  // Smallest version that fits: 4-bit mode + char count + 8 bits per byte.
  let ver = Math.max(1, Math.min(40, minVersion))
  for (; ; ver++) {
    if (ver > 40) throw new RangeError('QR: text is too long')
    const countBits = ver <= 9 ? 8 : 16
    if (4 + countBits + bytes.length * 8 <= dataCodewords(ver, level) * 8) break
  }

  // Bit stream: byte mode (0100), count, data, terminator, padding.
  const bits: number[] = []
  const push = (value: number, len: number) => {
    for (let i = len - 1; i >= 0; i--) bits.push((value >>> i) & 1)
  }
  push(0b0100, 4)
  push(bytes.length, ver <= 9 ? 8 : 16)
  bytes.forEach((b) => push(b, 8))
  const capacity = dataCodewords(ver, level) * 8
  push(0, Math.min(4, capacity - bits.length))
  push(0, (8 - (bits.length % 8)) % 8)
  for (let pad = 0xec; bits.length < capacity; pad ^= 0xec ^ 0x11) push(pad, 8)
  const codewords: number[] = []
  for (let i = 0; i < bits.length; i += 8) codewords.push(parseInt(bits.slice(i, i + 8).join(''), 2))

  const all = interleaveWithEcc(codewords, ver, level)
  const size = ver * 4 + 17
  const modules = Array.from({ length: size }, () => new Array<boolean>(size).fill(false))
  const isFunction = Array.from({ length: size }, () => new Array<boolean>(size).fill(false))
  const setFn = (x: number, y: number, dark: boolean) => {
    modules[y][x] = dark
    isFunction[y][x] = true
  }

  // Timing patterns.
  for (let i = 0; i < size; i++) {
    setFn(6, i, i % 2 === 0)
    setFn(i, 6, i % 2 === 0)
  }
  // Finder patterns with their separators.
  for (const [cx, cy] of [[3, 3], [size - 4, 3], [3, size - 4]]) {
    for (let dy = -4; dy <= 4; dy++) {
      for (let dx = -4; dx <= 4; dx++) {
        const dist = Math.max(Math.abs(dx), Math.abs(dy))
        const x = cx + dx
        const y = cy + dy
        if (x >= 0 && x < size && y >= 0 && y < size) setFn(x, y, dist !== 2 && dist !== 4)
      }
    }
  }
  // Alignment patterns (except where they'd overlap a finder).
  const align = alignmentPositions(ver)
  const last = align.length - 1
  align.forEach((ay, i) =>
    align.forEach((ax, j) => {
      if ((i === 0 && j === 0) || (i === 0 && j === last) || (i === last && j === 0)) return
      for (let dy = -2; dy <= 2; dy++) {
        for (let dx = -2; dx <= 2; dx++) setFn(ax + dx, ay + dy, Math.max(Math.abs(dx), Math.abs(dy)) !== 1)
      }
    }),
  )

  const drawFormat = (mask: number) => {
    const data = (FORMAT_BITS[level] << 3) | mask
    let rem = data
    for (let i = 0; i < 10; i++) rem = (rem << 1) ^ ((rem >>> 9) * 0x537)
    const f = ((data << 10) | rem) ^ 0x5412
    for (let i = 0; i <= 5; i++) setFn(8, i, bit(f, i))
    setFn(8, 7, bit(f, 6))
    setFn(8, 8, bit(f, 7))
    setFn(7, 8, bit(f, 8))
    for (let i = 9; i < 15; i++) setFn(14 - i, 8, bit(f, i))
    for (let i = 0; i < 8; i++) setFn(size - 1 - i, 8, bit(f, i))
    for (let i = 8; i < 15; i++) setFn(8, size - 15 + i, bit(f, i))
    setFn(8, size - 8, true) // the always-dark module
  }
  drawFormat(0) // reserve the area; redrawn with the real mask below

  if (ver >= 7) {
    let rem = ver
    for (let i = 0; i < 12; i++) rem = (rem << 1) ^ ((rem >>> 11) * 0x1f25)
    const v = (ver << 12) | rem
    for (let i = 0; i < 18; i++) {
      const a = size - 11 + (i % 3)
      const b = Math.floor(i / 3)
      setFn(a, b, bit(v, i))
      setFn(b, a, bit(v, i))
    }
  }

  // Data in the zig-zag column pairs, right to left.
  let i = 0
  for (let right = size - 1; right >= 1; right -= 2) {
    if (right === 6) right = 5
    for (let vert = 0; vert < size; vert++) {
      for (let j = 0; j < 2; j++) {
        const x = right - j
        const upward = ((right + 1) & 2) === 0
        const y = upward ? size - 1 - vert : vert
        if (!isFunction[y][x] && i < all.length * 8) {
          modules[y][x] = bit(all[i >>> 3], 7 - (i & 7))
          i++
        }
      }
    }
  }

  const masks: ((x: number, y: number) => boolean)[] = [
    (x, y) => (x + y) % 2 === 0,
    (_x, y) => y % 2 === 0,
    (x) => x % 3 === 0,
    (x, y) => (x + y) % 3 === 0,
    (x, y) => (Math.floor(x / 3) + Math.floor(y / 2)) % 2 === 0,
    (x, y) => ((x * y) % 2) + ((x * y) % 3) === 0,
    (x, y) => (((x * y) % 2) + ((x * y) % 3)) % 2 === 0,
    (x, y) => (((x + y) % 2) + ((x * y) % 3)) % 2 === 0,
  ]
  const applyMask = (m: number) => {
    for (let y = 0; y < size; y++) {
      for (let x = 0; x < size; x++) if (!isFunction[y][x] && masks[m](x, y)) modules[y][x] = !modules[y][x]
    }
  }

  // Pick the mask with the lowest penalty (runs, 2×2 blocks, dark balance).
  const penalty = () => {
    let score = 0
    for (let a = 0; a < size; a++) {
      let runRow = 1
      let runCol = 1
      for (let b = 1; b < size; b++) {
        runRow = modules[a][b] === modules[a][b - 1] ? runRow + 1 : 1
        runCol = modules[b][a] === modules[b - 1][a] ? runCol + 1 : 1
        if (runRow === 5) score += 3
        else if (runRow > 5) score += 1
        if (runCol === 5) score += 3
        else if (runCol > 5) score += 1
      }
    }
    let dark = 0
    for (let y = 0; y < size; y++) {
      for (let x = 0; x < size; x++) {
        if (modules[y][x]) dark++
        if (x < size - 1 && y < size - 1) {
          const c = modules[y][x]
          if (c === modules[y][x + 1] && c === modules[y + 1][x] && c === modules[y + 1][x + 1]) score += 3
        }
      }
    }
    const total = size * size
    score += (Math.ceil(Math.abs(dark * 20 - total * 10) / total) - 1) * 10
    return score
  }

  let best = 0
  let bestScore = Infinity
  for (let m = 0; m < 8; m++) {
    applyMask(m)
    drawFormat(m)
    const score = penalty()
    if (score < bestScore) {
      best = m
      bestScore = score
    }
    applyMask(m) // undo (XOR)
  }
  applyMask(best)
  drawFormat(best)

  return { size, version: ver, modules, isFunction }
}
