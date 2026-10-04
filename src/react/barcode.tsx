import { forwardRef, useImperativeHandle, useMemo, useRef, type ReactNode } from 'react'
import { barcodeLayout, encodeBarcode, type MlBarcodeFormat } from '../barcode'
import { useLocale } from './locale'
import { cx } from './utils'

/* ── Barcode ───────────────────────────────────────────── */

export interface BarcodeProps {
  value: string
  /** code128 for general text, code39 for 手機條碼載具 / 自然人憑證, ean13 for retail. */
  format?: MlBarcodeFormat
  /** Width of the narrowest bar in px. Keep ≥ 2 for phone cameras. */
  module?: number
  /** Bar height in px. */
  height?: number
  /** Quiet zone each side, in modules (scanners need ~10). */
  margin?: number
  /** Print the human-readable line under the bars. */
  showText?: boolean
  fontSize?: number
  /** Bar and background colours. Keep dark on light or scanners can't read it. */
  color?: string
  background?: string
  /** Accessible description; defaults to the encoded text. */
  title?: string
  /** Caption under the code. */
  children?: ReactNode
  className?: string
}

export interface BarcodeHandle {
  /** The SVG markup, e.g. to save as a file. */
  toSVG(): string
  /** A PNG data URL at `scale`× the rendered size. */
  toDataURL(scale?: number): Promise<string>
}

export const Barcode = forwardRef<BarcodeHandle, BarcodeProps>(function Barcode(
  {
    value,
    format = 'code128',
    module = 2,
    height = 64,
    margin = 10,
    showText = true,
    fontSize = 14,
    color = '#12151c',
    background = '#f4f6f9',
    title,
    children,
    className,
  },
  ref,
) {
  const loc = useLocale()
  const svg = useRef<SVGSVGElement>(null)
  const encoding = useMemo(() => {
    try {
      return encodeBarcode(value, format)
    } catch {
      return null
    }
  }, [value, format])
  const layout = useMemo(
    () => (encoding ? barcodeLayout(encoding, { module, height, margin, showText, fontSize }) : null),
    [encoding, module, height, margin, showText, fontSize],
  )

  useImperativeHandle(
    ref,
    () => {
      const toSVG = () => (svg.current ? new XMLSerializer().serializeToString(svg.current) : '')
      return {
        toSVG,
        toDataURL: (scale = 2) =>
          new Promise<string>((resolve, reject) => {
            if (!layout) return reject(new Error('nothing to draw'))
            const img = new Image()
            img.onload = () => {
              const canvas = document.createElement('canvas')
              canvas.width = layout.width * scale
              canvas.height = layout.height * scale
              canvas.getContext('2d')!.drawImage(img, 0, 0, canvas.width, canvas.height)
              resolve(canvas.toDataURL('image/png'))
            }
            img.onerror = reject
            img.src = `data:image/svg+xml;charset=utf-8,${encodeURIComponent(toSVG())}`
          }),
      }
    },
    [layout],
  )

  return (
    <figure className={cx('ml-barcode', `ml-barcode--${format}`, className)}>
      {layout && encoding ? (
        <svg
          ref={svg}
          xmlns="http://www.w3.org/2000/svg"
          viewBox={`0 0 ${layout.width} ${layout.height}`}
          width={layout.width}
          height={layout.height}
          role="img"
          aria-label={title ?? loc.barcode.label(encoding.text)}
          shapeRendering="crispEdges"
        >
          <rect width={layout.width} height={layout.height} fill={background} />
          <path d={layout.path} fill={color} />
          {layout.texts.map((t, i) => (
            <text
              key={i}
              x={t.x}
              y={t.y}
              textAnchor={t.anchor}
              fontSize={fontSize}
              fill={color}
              fontFamily="ui-monospace, SFMono-Regular, Menlo, Consolas, monospace"
              letterSpacing="0.08em"
            >
              {t.text}
            </text>
          ))}
        </svg>
      ) : (
        <p className="ml-barcode__error" role="alert">
          {loc.barcode.invalid}
        </p>
      )}
      {children && <figcaption className="ml-barcode__caption">{children}</figcaption>}
    </figure>
  )
})
