import { useState, useEffect, useMemo } from 'react'
import { supabase } from '@/lib/supabase'

interface GradientStop {
  color: string
  stop: number
}

interface RadialGradientData {
  centerColor: string
  outerColor: string
  midColors?: { color: string; position: number }[]
  shape?: string
  position?: string
  size?: string
  softness?: string
}

interface LAB {
  L: number
  a: number
  b: number
}

function hexToRgb(hex: string): { r: number; g: number; b: number } {
  const n = parseInt(hex.slice(1), 16)
  return { r: (n >> 16) & 255, g: (n >> 8) & 255, b: n & 255 }
}

function lerpHex(a: string, hexB: string, t: number): string {
  const ra = hexToRgb(a)
  const rb = hexToRgb(hexB)
  const r = Math.round(ra.r + (rb.r - ra.r) * t)
  const g = Math.round(ra.g + (rb.g - ra.g) * t)
  const bVal = Math.round(ra.b + (rb.b - ra.b) * t)
  return '#' + [r, g, bVal].map((x: number) => Math.max(0, Math.min(255, x)).toString(16).padStart(2, '0')).join('')
}

function sampleGradientAt(stops: GradientStop[], t: number): string {
  const sorted = [...stops].sort((a, b) => (a.stop ?? 0) - (b.stop ?? 0))
  if (sorted.length === 0) return '#888'
  if (t <= 0) return sorted[0].color ?? '#888'
  if (t >= 1) return sorted[sorted.length - 1].color ?? '#888'
  const pos = t * 100
  for (let i = 0; i < sorted.length - 1; i++) {
    const s0 = sorted[i].stop ?? 0
    const s1 = sorted[i + 1].stop ?? 100
    if (pos >= s0 && pos <= s1) {
      const d = s1 - s0
      const u = d === 0 ? 1 : (pos - s0) / d
      return lerpHex(sorted[i].color ?? '#888', sorted[i + 1].color ?? '#888', u)
    }
  }
  return sorted[0].color ?? '#888'
}

function hexToLab(hex: string): LAB {
  const { r, g, b } = hexToRgb(hex)
  let R = r / 255
  let G = g / 255
  let B = b / 255
  R = R <= 0.04045 ? R / 12.92 : Math.pow((R + 0.055) / 1.055, 2.4)
  G = G <= 0.04045 ? G / 12.92 : Math.pow((G + 0.055) / 1.055, 2.4)
  B = B <= 0.04045 ? B / 12.92 : Math.pow((B + 0.055) / 1.055, 2.4)
  let X = R * 0.4124564 + G * 0.3575761 + B * 0.1804375
  let Y = R * 0.2126729 + G * 0.7151522 + B * 0.072175
  let Z = R * 0.0193339 + G * 0.119192 + B * 0.9503041
  const xn = 0.95047
  const yn = 1
  const zn = 1.08883
  X /= xn
  Y /= yn
  Z /= zn
  const f = (t: number) => (t > 0.008856 ? Math.pow(t, 1 / 3) : 7.787 * t + 16 / 116)
  const L = 116 * f(Y) - 16
  const a = 500 * (f(X) - f(Y))
  const b_ = 200 * (f(Y) - f(Z))
  return { L, a, b: b_ }
}

function dominantLabFromStops(stops: GradientStop[]): LAB {
  const samples = [0, 0.25, 0.5, 0.75, 1].map((t) => hexToLab(sampleGradientAt(stops, t)))
  return {
    L: samples.reduce((s, p) => s + p.L, 0) / samples.length,
    a: samples.reduce((s, p) => s + p.a, 0) / samples.length,
    b: samples.reduce((s, p) => s + p.b, 0) / samples.length,
  }
}

function dominantLabFromRadial(radial: RadialGradientData): LAB {
  const colors = [radial.centerColor, radial.outerColor]
  if (radial.midColors) colors.push(...radial.midColors.map((m) => m.color))
  const labs = colors.map((c) => hexToLab(c))
  return {
    L: labs.reduce((s, p) => s + p.L, 0) / labs.length,
    a: labs.reduce((s, p) => s + p.a, 0) / labs.length,
    b: labs.reduce((s, p) => s + p.b, 0) / labs.length,
  }
}

function itemDominantLab(item: GalleryItem): LAB {
  if (item.gradientType === 'radial' && item.radialData) {
    return dominantLabFromRadial(item.radialData)
  }
  return dominantLabFromStops(item.stops || [])
}

function deltaE76(a: LAB, b: LAB): number {
  return Math.sqrt((a.L - b.L) ** 2 + (a.a - b.a) ** 2 + (a.b - b.b) ** 2)
}

interface GalleryItem {
  stops?: GradientStop[]
  radialData?: RadialGradientData
  gradientType: 'linear' | 'radial'
  userQuery: string
}

function isRadialGradientData(obj: unknown): obj is RadialGradientData {
  if (!obj || typeof obj !== 'object' || Array.isArray(obj)) return false
  const o = obj as Record<string, unknown>
  return typeof o.centerColor === 'string' && typeof o.outerColor === 'string'
}

function clusterBySimilarity(items: GalleryItem[]): GalleryItem[] {
  if (items.length <= 1) return [...items]
  const labs = items.map((it) => itemDominantLab(it))
  const placed = new Set<number>()
  const order: GalleryItem[] = [items[0]]
  placed.add(0)
  while (placed.size < items.length) {
    const lastIdx = items.indexOf(order[order.length - 1])
    const lastLab = labs[lastIdx]
    let best = -1
    let bestD = Infinity
    for (let i = 0; i < items.length; i++) {
      if (placed.has(i)) continue
      const d = deltaE76(lastLab, labs[i])
      if (d < bestD) {
        bestD = d
        best = i
      }
    }
    if (best < 0) break
    order.push(items[best])
    placed.add(best)
  }
  return order
}

function toCssGradient(stops: GradientStop[]): string {
  if (!Array.isArray(stops) || stops.length === 0) return 'linear-gradient(to bottom, #ccc, #999)'
  const sorted = [...stops].sort((a, b) => (a.stop ?? 0) - (b.stop ?? 0))
  const parts = sorted.map((s) => `${s.color ?? '#888'} ${s.stop ?? 0}%`)
  return `linear-gradient(to bottom, ${parts.join(', ')})`
}

function toRadialCssGradient(radial: RadialGradientData): string {
  const { centerColor, outerColor, midColors, shape, position, size, softness } = radial

  const positionMap: Record<string, string> = {
    'center': 'center', 'top': 'center top', 'bottom': 'center bottom',
    'left': 'left center', 'right': 'right center', 'top-left': 'left top',
    'top-right': 'right top', 'bottom-left': 'left bottom', 'bottom-right': 'right bottom',
    'bottom-center': 'center bottom', 'top-center': 'center top',
    'off-left': '-20% center', 'off-right': '120% center',
    'off-top': 'center -20%', 'off-bottom': 'center 120%',
  }
  const cssPosition = positionMap[position || 'center'] || 'center'

  const sizeMap: Record<string, string> = {
    'small': 'closest-side', 'medium': 'farthest-corner', 'large': 'farthest-side',
  }
  const cssSize = sizeMap[size || 'medium'] || 'farthest-corner'

  const softnessStops: Record<string, { center: number; outer: number }> = {
    'sharp': { center: 0, outer: 60 }, 'soft': { center: 0, outer: 85 }, 'ultra-soft': { center: 0, outer: 100 },
  }
  const { center: centerStop, outer: outerStop } = softnessStops[softness || 'soft'] || softnessStops['soft']

  const stops: string[] = [`${centerColor} ${centerStop}%`]
  if (midColors && midColors.length > 0) {
    const sortedMid = [...midColors].sort((a, b) => a.position - b.position)
    sortedMid.forEach((m) => {
      const scaledPos = centerStop + (m.position / 100) * (outerStop - centerStop)
      stops.push(`${m.color} ${scaledPos}%`)
    })
  }
  stops.push(`${outerColor} ${outerStop}%`)
  if (outerStop < 100) stops.push(`${outerColor} 100%`)

  return `radial-gradient(${shape || 'circle'} ${cssSize} at ${cssPosition}, ${stops.join(', ')})`
}

function itemCssBackground(item: GalleryItem): string {
  if (item.gradientType === 'radial' && item.radialData) {
    return toRadialCssGradient(item.radialData)
  }
  return toCssGradient(item.stops || [])
}

export default function Gallery({ onBack }: { onBack: () => void }) {
  const [items, setItems] = useState<GalleryItem[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const sorted = useMemo(() => clusterBySimilarity(items), [items])

  useEffect(() => {
    if (!supabase) {
      setError('Database not configured')
      setLoading(false)
      return
    }
    supabase
      .from('gradient_generations')
      .select('gradient_json, user_query, gradient_type')
      .order('created_at', { ascending: false })
      .limit(500)
      .then(({ data, error: e }) => {
        setLoading(false)
        if (e) {
          setError(e.message)
          return
        }
        const valid: GalleryItem[] = []
        for (const r of data ?? []) {
          const json = r?.gradient_json as unknown
          const type = (r?.gradient_type ?? 'linear') as string
          const userQuery = (r?.user_query ?? '') as string

          if (type === 'radial' && isRadialGradientData(json)) {
            valid.push({ radialData: json, gradientType: 'radial', userQuery })
          } else if (Array.isArray(json) && json.length > 0) {
            valid.push({ stops: json as GradientStop[], gradientType: 'linear', userQuery })
          }
        }
        setItems(valid)
      })
  }, [])

  const handleApply = (item: GalleryItem) => {
    try {
      if (item.gradientType === 'radial' && item.radialData) {
        sessionStorage.setItem(
          'galleryApply',
          JSON.stringify({ radialData: item.radialData, gradientType: 'radial', userQuery: item.userQuery || '' })
        )
      } else {
        sessionStorage.setItem(
          'galleryApply',
          JSON.stringify({ stops: item.stops, userQuery: item.userQuery || '' })
        )
      }
    } catch {}
    onBack()
  }

  return (
    <div className="w-full h-full min-h-0 overflow-auto bg-gray-100 relative">
      <button
        type="button"
        onClick={onBack}
        className="fixed top-4 left-4 z-10 h-9 sm:h-6 min-h-0 m-0 border-0 bg-white/80 backdrop-blur-xl px-2 py-1 shadow text-gray-800 text-sm font-sans leading-none hover:opacity-90 transition-opacity appearance-none"
      >
        Back
      </button>
      <div className="px-4 pt-14 pb-4">
        {loading && (
          <p className="text-sm font-sans text-gray-500 py-8 text-center">Loading…</p>
        )}
        {error && (
          <p className="text-sm font-sans text-red-600 py-8 text-center">{error}</p>
        )}
        {!loading && !error && items.length === 0 && (
          <p className="text-sm font-sans text-gray-500 py-8 text-center">No gradients yet.</p>
        )}
        {!loading && !error && sorted.length > 0 && (
          <div
            className="grid gap-2 grid-cols-1 sm:grid-cols-[repeat(auto-fill,minmax(112px,1fr))]"
          >
            {sorted.map((item, i) => (
              <div
                key={i}
                role="button"
                tabIndex={0}
                onClick={() => handleApply(item)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' || e.key === ' ') {
                    e.preventDefault()
                    handleApply(item)
                  }
                }}
                className="flex flex-col sm:block cursor-pointer"
              >
                {/* Gradient: 16:9 on mobile, square on desktop */}
                <div
                  className="group relative aspect-video sm:aspect-square rounded-none shadow-sm ring-1 ring-black/5"
                  style={{ background: itemCssBackground(item) }}
                >
                  {/* Desktop: hover tooltip below */}
                  {item.userQuery ? (
                    <div
                      className="hidden sm:block absolute top-full left-1/2 -translate-x-1/2 mt-1 z-20 w-max max-w-[260px] opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none"
                      role="tooltip"
                    >
                      <div className="h-6 min-h-0 px-2 py-1 bg-white/80 backdrop-blur-xl shadow border-0 flex items-center text-sm font-sans leading-none text-gray-800 truncate">
                        {item.userQuery}
                      </div>
                    </div>
                  ) : null}
                </div>
                {/* Mobile: text below image, centered — h-9 to match homepage input on mobile */}
                {item.userQuery ? (
                  <div className="sm:hidden mt-1 flex justify-center min-w-0">
                    <div className="h-9 min-h-0 px-2 py-1 bg-white/80 backdrop-blur-xl shadow border-0 flex items-center text-sm font-sans leading-none text-gray-800 truncate max-w-full">
                      {item.userQuery}
                    </div>
                  </div>
                ) : null}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
