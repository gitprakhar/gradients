import { useState, useRef, useEffect } from 'react'
import { HexColorPicker } from 'react-colorful'
import { generateGradientFromPrompt, generateRadialGradientFromPrompt } from "@/lib/ollama"
import type { RadialGradientResult } from "@/lib/ollama"
import { logGradientGeneration } from "@/lib/supabase"
import Gallery from "@/pages/Gallery"

type GradientType = 'linear' | 'radial'

// --- Color interpolation for gradient transition ---
function hexToRgb(hex: string): { r: number; g: number; b: number } {
  const n = parseInt(hex.slice(1), 16)
  return { r: (n >> 16) & 255, g: (n >> 8) & 255, b: n & 255 }
}
function rgbToHex(r: number, g: number, b: number): string {
  return '#' + [r, g, b].map((x) => Math.round(x).toString(16).padStart(2, '0')).join('')
}
function lerpHex(a: string, b: string, t: number): string {
  const ra = hexToRgb(a), rb = hexToRgb(b)
  return rgbToHex(
    ra.r + (rb.r - ra.r) * t,
    ra.g + (rb.g - ra.g) * t,
    ra.b + (rb.b - ra.b) * t
  )
}
function sampleGradient(stops: { position: number; color: string }[], p: number): string {
  const sorted = [...stops].sort((a, b) => a.position - b.position)
  if (p <= 0) return sorted[0].color
  if (p >= 1) return sorted[sorted.length - 1].color
  const pos = p * 100
  for (let i = 0; i < sorted.length - 1; i++) {
    if (pos >= sorted[i].position && pos <= sorted[i + 1].position) {
      const d = sorted[i + 1].position - sorted[i].position
      const t = d === 0 ? 1 : (pos - sorted[i].position) / d
      return lerpHex(sorted[i].color, sorted[i + 1].color, t)
    }
  }
  return sorted[0].color
}
function easeInOutCubic(t: number): number {
  return t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2
}

// --- Hue rotation for pre-response "loading" animation ---
function rgbToHsv(r: number, g: number, b: number): { h: number; s: number; v: number } {
  r /= 255; g /= 255; b /= 255
  const max = Math.max(r, g, b), min = Math.min(r, g, b)
  const d = max - min
  const v = max
  const s = max === 0 ? 0 : d / max
  let h = 0
  if (d !== 0) {
    if (max === r) h = (g - b) / d + (g < b ? 6 : 0)
    else if (max === g) h = (b - r) / d + 2
    else h = (r - g) / d + 4
    h /= 6
  }
  return { h: h * 360, s, v }
}
function hsvToRgb(h: number, s: number, v: number): { r: number; g: number; b: number } {
  h = ((h % 360) + 360) % 360 / 360
  const i = Math.floor(h * 6), f = h * 6 - i
  const p = v * (1 - s), q = v * (1 - f * s), t = v * (1 - (1 - f) * s)
  let r = 0, g = 0, b = 0
  switch (i % 6) {
    case 0: r = v; g = t; b = p; break
    case 1: r = q; g = v; b = p; break
    case 2: r = p; g = v; b = t; break
    case 3: r = p; g = q; b = v; break
    case 4: r = t; g = p; b = v; break
    case 5: r = v; g = p; b = q; break
  }
  return { r: r * 255, g: g * 255, b: b * 255 }
}
function rotateHue(hex: string, degrees: number): string {
  const { r, g, b } = hexToRgb(hex)
  const { h, s, v } = rgbToHsv(r, g, b)
  const { r: R, g: G, b: B } = hsvToRgb(h + degrees, s, v)
  return rgbToHex(R, G, B)
}

const DOWNLOAD_SIZES = [
  { label: '16:9 (1920×1080)', width: 1920, height: 1080, name: '16-9' },
  { label: '16:9 (1600×900)', width: 1600, height: 900, name: '16-9-small' },
  { label: '4:3 (1920×1440)', width: 1920, height: 1440, name: '4-3' },
  { label: '1:1 (1080×1080)', width: 1080, height: 1080, name: '1-1' },
  { label: '21:9 (2560×1080)', width: 2560, height: 1080, name: '21-9' },
  { label: '9:16 (1080×1920)', width: 1080, height: 1920, name: '9-16' },
] as const

const PRESET_GRADIENTS: { title: string; stops: { color: string; stop: number }[] }[] = [
  { title: 'Golden hour', stops: [{ color: '#b38117', stop: 0 }, { color: '#deae3a', stop: 30 }, { color: '#ffd265', stop: 60 }, { color: '#fff8c0', stop: 100 }] },
  { title: 'Pink clouds at sunset', stops: [{ color: '#ffd1dc', stop: 0 }, { color: '#ffb6a4', stop: 60 }, { color: '#ff8a55', stop: 100 }] },
  { title: 'What Mars would look like', stops: [{ color: '#A52A2A', stop: 0 }, { color: '#FF6B0F', stop: 50 }, { color: '#E6B07C', stop: 100 }] },
  { title: 'Kind of blue', stops: [{ color: '#cce7ff', stop: 0 }, { color: '#a5ccef', stop: 60 }, { color: '#5f8dd5', stop: 100 }] },
  { title: 'Cherry blossoms in spring', stops: [{ color: '#fff0f6', stop: 0 }, { color: '#f4b8c4', stop: 33 }, { color: '#eb6d95', stop: 66 }, { color: '#c03e6a', stop: 100 }] },
  { title: 'Winter evening glow', stops: [{ color: '#0a1128', stop: 0 }, { color: '#e6ac53', stop: 60 }, { color: '#ffdfc7', stop: 100 }] },
  { title: 'Deep dark forest', stops: [{ color: '#0B1A0C', stop: 0 }, { color: '#1B4B29', stop: 50 }, { color: '#356B3A', stop: 100 }] },
]

// Radial gradient presets matching the linear ones by title
const PRESET_RADIAL_GRADIENTS: Record<string, RadialGradientResult> = {
  'Golden hour': {
    centerColor: '#FFC107',
    outerColor: '#FFF8E1',
    midColors: [{ color: '#FFB300', position: 40 }, { color: '#FF8F00', position: 60 }],
    shape: 'circle',
    size: 'large',
    softness: 'soft',
    position: 'center',
  },
  'Kind of blue': {
    centerColor: '#003366',
    outerColor: '#66B2FF',
    midColors: [{ color: '#0077CC', position: 34 }, { color: '#99CCFF', position: 60 }],
    shape: 'circle',
    size: 'medium',
    softness: 'soft',
    position: 'center',
  },
  'Cherry blossoms in spring': {
    centerColor: '#FFB6C1',
    outerColor: '#FFE6EE',
    midColors: [{ color: '#FFCCE5', position: 30 }, { color: '#FFF5FA', position: 60 }],
    shape: 'circle',
    size: 'large',
    softness: 'soft',
    position: 'center',
  },
  'Pink clouds at sunset': {
    centerColor: '#FF4D4D',
    outerColor: '#FFE5DC',
    midColors: [{ color: '#FF8E80', position: 40 }, { color: '#FFDAB7', position: 60 }],
    shape: 'circle',
    size: 'large',
    softness: 'soft',
    position: 'bottom-center',
  },
  'Deep dark forest': {
    centerColor: '#013224',
    outerColor: '#0A0A0A',
    midColors: [{ color: '#02462A', position: 26 }, { color: '#04662D', position: 60 }],
    shape: 'circle',
    size: 'large',
    softness: 'soft',
    position: 'center',
  },
  'Winter evening glow': {
    centerColor: '#FFCC66',
    outerColor: '#112244',
    midColors: [{ color: '#F1E8C6', position: 45 }],
    shape: 'circle',
    size: 'large',
    softness: 'soft',
    position: 'center',
  },
  'What Mars would look like': {
    centerColor: '#FF6B0F',
    outerColor: '#E6B07C',
    midColors: [{ color: '#A52A2A', position: 50 }],
    shape: 'circle',
    size: 'medium',
    softness: 'soft',
    position: 'center',
  },
}

function pickRandomPreset() {
  const idx = Math.floor(Math.random() * PRESET_GRADIENTS.length)
  const g = PRESET_GRADIENTS[idx]
  const radial = PRESET_RADIAL_GRADIENTS[g.title] || null
  return {
    title: g.title,
    stops: g.stops.map((s) => ({ position: s.stop, color: s.color })),
    radial,
  }
}

const GALLERY_APPLY_KEY = 'galleryApply'
interface GalleryApplyData {
  stops?: { color: string; stop: number }[]
  radialData?: RadialGradientResult
  gradientType?: 'linear' | 'radial'
  userQuery: string
}
function consumeGalleryApply(): GalleryApplyData | null {
  try {
    const raw = typeof sessionStorage !== 'undefined' ? sessionStorage.getItem(GALLERY_APPLY_KEY) : null
    if (!raw) return null
    sessionStorage.removeItem(GALLERY_APPLY_KEY)
    const data = JSON.parse(raw) as Record<string, unknown>
    if (!data) return null
    const userQuery = typeof data.userQuery === 'string' ? data.userQuery : ''

    // Radial gradient from gallery
    if (data.gradientType === 'radial' && data.radialData && typeof data.radialData === 'object') {
      return { radialData: data.radialData as RadialGradientResult, gradientType: 'radial', userQuery }
    }
    // Linear gradient from gallery
    if (Array.isArray(data.stops) && data.stops.length > 0) {
      return { stops: data.stops as { color: string; stop: number }[], userQuery }
    }
    return null
  } catch {
    return null
  }
}

// Create a plus cursor: square with plus inside, 24px to match h-6 buttons
const plusCursor = `data:image/svg+xml;base64,${btoa(`
  <svg width="24" height="24" xmlns="http://www.w3.org/2000/svg">
    <rect x="0" y="0" width="24" height="24" fill="rgba(255,255,255,0.9)" stroke="rgba(0,0,0,0.15)" stroke-width="1"/>
    <line x1="12" y1="8" x2="12" y2="16" stroke="#262626" stroke-width="1.5" stroke-linecap="round"/>
    <line x1="8" y1="12" x2="16" y2="12" stroke="#262626" stroke-width="1.5" stroke-linecap="round"/>
  </svg>
`)}`

export function App() {
  const initialPresetRef = useRef<ReturnType<typeof pickRandomPreset> | null>(null)
  if (initialPresetRef.current === null) initialPresetRef.current = pickRandomPreset()

  const galleryApplyRef = useRef(consumeGalleryApply())

  const [colorStops, setColorStops] = useState(() => {
    const g = galleryApplyRef.current
    if (g && Array.isArray(g.stops) && g.stops.length > 0) {
      return g.stops.map((s) => ({ position: s.stop, color: s.color }))
    }
    return initialPresetRef.current!.stops
  })
  const [gradientType, setGradientType] = useState<GradientType>(() => {
    const g = galleryApplyRef.current
    return g?.gradientType === 'radial' ? 'radial' : 'linear'
  })
  const [radialGradient, setRadialGradient] = useState<RadialGradientResult | null>(() => {
    const g = galleryApplyRef.current
    if (g?.gradientType === 'radial' && g.radialData) return g.radialData
    return initialPresetRef.current?.radial || null
  })
  const [dragging, setDragging] = useState<number | null>(null)
  const [showPlusCursor, setShowPlusCursor] = useState(false)
  const [inputValue, setInputValue] = useState(() => galleryApplyRef.current?.userQuery ?? '')
  const [placeholderText, setPlaceholderText] = useState(() => {
    const g = galleryApplyRef.current
    if (g) return g.userQuery || 'Describe a gradient'
    return initialPresetRef.current!.title
  })
  const [isGenerating, setIsGenerating] = useState(false)
  const [generateError, setGenerateError] = useState<string | null>(null)
  const [hasCompletedFirstGeneration, setHasCompletedFirstGeneration] = useState(() => !!galleryApplyRef.current)
  const [downloadOpen, setDownloadOpen] = useState(false)
  const [copiedCSS, setCopiedCSS] = useState(false)
  const [isEditingControls, setIsEditingControls] = useState(false)
  const [colorPickerFor, setColorPickerFor] = useState<number | null>(null)
  const [pickerPlaceAbove, setPickerPlaceAbove] = useState(false)
  const [showLinearLayer, setShowLinearLayer] = useState(gradientType === 'linear')
  // Cache generated gradients to avoid regenerating when switching back
  const [cachedLinearGradient, setCachedLinearGradient] = useState<{ position: number; color: string }[] | null>(null)
  const [cachedRadialGradient, setCachedRadialGradient] = useState<RadialGradientResult | null>(null)
  const pillRefs = useRef<(HTMLDivElement | null)[]>([])
  const stopContainerRefs = useRef<(HTMLDivElement | null)[]>([])
  const pageRef = useRef<HTMLDivElement>(null)
  const hasDraggedRef = useRef<boolean>(false)
  const inputRef = useRef<HTMLInputElement>(null)
  const colorStopsRef = useRef(colorStops)
  const animationFrameIdRef = useRef<number | null>(null)
  const preGenerateStopsRef = useRef<{ position: number; color: string }[]>([])
  const lastDisplayedStopsRef = useRef<{ position: number; color: string }[]>([])
  const generationIdRef = useRef(0)
  const preGenerateRadialRef = useRef<RadialGradientResult | null>(null)

  // On mobile: color strip starts below the top bar (input + download). sm (640px) = desktop.
  const [topMargin, setTopMargin] = useState(() =>
    typeof window !== 'undefined' && !window.matchMedia('(min-width: 640px)').matches ? 72 : 32
  )
  useEffect(() => {
    const mq = window.matchMedia('(min-width: 640px)')
    const update = () => setTopMargin(mq.matches ? 32 : 72)
    update()
    mq.addEventListener('change', update)
    return () => mq.removeEventListener('change', update)
  }, [])

  useEffect(() => { colorStopsRef.current = colorStops }, [colorStops])
  useEffect(() => () => {
    if (animationFrameIdRef.current != null) cancelAnimationFrame(animationFrameIdRef.current)
  }, [])

  // Keep cursor as grabbing for the whole drag, even when mouse moves over other elements
  useEffect(() => {
    if (dragging !== null) {
      document.body.style.setProperty('cursor', 'grabbing', 'important')
      return () => { document.body.style.removeProperty('cursor') }
    }
  }, [dragging])

  // Close color picker when mousedown outside the pill
  useEffect(() => {
    if (colorPickerFor === null) return
    const onMouseDown = (e: MouseEvent) => {
      if (!pillRefs.current[colorPickerFor]?.contains(e.target as Node)) setColorPickerFor(null)
    }
    window.addEventListener('mousedown', onMouseDown)
    return () => window.removeEventListener('mousedown', onMouseDown)
  }, [colorPickerFor])

  // Sync showLinearLayer with gradientType changes (for crossfade on homepage)
  useEffect(() => {
    if (!hasCompletedFirstGeneration) {
      setShowLinearLayer(gradientType === 'linear')
    }
  }, [gradientType, hasCompletedFirstGeneration])

  const handleLineClick = (e: React.MouseEvent) => {
    if (!hasCompletedFirstGeneration) return
    if (gradientType === 'radial') return
    if (!isEditingControls) return
    if (!pageRef.current || dragging !== null) return

    // Only create new stop if plus cursor is showing
    if (!showPlusCursor) return
    
    // Prevent creating new stop if we just finished dragging (hasDraggedRef is cleared in drag’s mouseup)
    if (hasDraggedRef.current) return
    
    const rect = pageRef.current.getBoundingClientRect()
    const y = e.clientY - rect.top
    const BOTTOM_MARGIN = 32
    const availableHeight = rect.height - topMargin - BOTTOM_MARGIN
    const relativeY = y - topMargin
    // Constrain to 0-100% within the available area (between margins)
    const percentage = Math.max(0, Math.min(100, (relativeY / availableHeight) * 100))
    
    // Add new color stop at clicked position with interpolated color
    const newPosition = Math.round(percentage)
    const newColor = interpolateColor(newPosition)
    
    const newStops = [...colorStops, { position: newPosition, color: newColor }]
    newStops.sort((a, b) => a.position - b.position)
    setColorStops(newStops)
  }

  const interpolateColor = (position: number) => {
    // Find surrounding stops and interpolate color
    const sortedStops = [...colorStops].sort((a, b) => a.position - b.position)
    
    for (let i = 0; i < sortedStops.length - 1; i++) {
      if (position >= sortedStops[i].position && position <= sortedStops[i + 1].position) {
        // Simple interpolation - just return the color of the lower stop for now
        return sortedStops[i].color
      }
    }
    return colorStops[0].color
  }

  const handleColorChange = (index: number, color: string) => {
    const newStops = [...colorStops]
    newStops[index].color = color
    setColorStops(newStops)
  }

  const handleCircleMouseDown = (index: number) => (e: React.MouseEvent) => {
    e.preventDefault()
    e.stopPropagation()
    setColorPickerFor(null)
    hasDraggedRef.current = false
    setDragging(index)
  }


  const handleRemoveStop = (index: number) => (e: React.MouseEvent) => {
    e.stopPropagation()
    // Keep at least 2 stops
    if (colorStops.length <= 2) return

    if (colorPickerFor === index) setColorPickerFor(null)

    const newStops = colorStops.filter((_, i) => i !== index)
    setColorStops(newStops)
  }

  const handleGenerateGradient = async (type: GradientType = gradientType) => {
    const prompt = (inputValue.trim() || placeholderText).trim()
    if (!prompt || isGenerating) return

    if (animationFrameIdRef.current != null) {
      cancelAnimationFrame(animationFrameIdRef.current)
      animationFrameIdRef.current = null
    }

    const id = ++generationIdRef.current
    const snapshot = colorStopsRef.current.map((s) => ({ position: s.position, color: s.color }))
    preGenerateStopsRef.current = snapshot
    lastDisplayedStopsRef.current = snapshot
    setGenerateError(null)
    setIsGenerating(true)
    setGradientType(type)

    // Clear cached gradients when generating with a new prompt
    // Only clear the cache if the prompt is different from the placeholder
    if (inputValue.trim() && inputValue.trim() !== placeholderText) {
      setCachedLinearGradient(null)
      setCachedRadialGradient(null)
    }

    if (type === 'radial') {
      // Capture the current radial gradient for animation
      const currentRadial = radialGradient
      preGenerateRadialRef.current = currentRadial

      // Pre-response: hue rotation animation while waiting for API
      if (currentRadial) {
        const rafState = { start: 0 }
        const animatePreRadial = (now: number) => {
          if (!rafState.start) rafState.start = now
          const elapsed = now - rafState.start
          const hueOffset = (elapsed * 0.08) % 360
          const base = preGenerateRadialRef.current
          if (base) {
            setRadialGradient({
              ...base,
              centerColor: rotateHue(base.centerColor, hueOffset),
              outerColor: rotateHue(base.outerColor, hueOffset),
              midColors: base.midColors?.map(m => ({
                ...m,
                color: rotateHue(m.color, hueOffset),
              })),
            })
          }
          animationFrameIdRef.current = requestAnimationFrame(animatePreRadial)
        }
        animationFrameIdRef.current = requestAnimationFrame(animatePreRadial)
      }

      try {
        const result = await generateRadialGradientFromPrompt(prompt)
        if (id !== generationIdRef.current) return

        // Log radial gradient generation with full radial data
        logGradientGeneration(prompt, result as unknown as Record<string, unknown>, 'radial')

        // Stop pre-animation
        if (animationFrameIdRef.current != null) {
          cancelAnimationFrame(animationFrameIdRef.current)
          animationFrameIdRef.current = null
        }

        // Animate transition from current to new radial gradient
        const startRadial = preGenerateRadialRef.current || result
        const DURATION = 600
        const transitionState = { start: 0 }

        const animateToRadialResult = (now: number) => {
          if (!transitionState.start) transitionState.start = now
          const elapsed = now - transitionState.start
          const t = Math.min(1, elapsed / DURATION)
          const eased = easeInOutCubic(t)

          // Interpolate colors
          const interpolatedRadial: RadialGradientResult = {
            ...result,
            centerColor: lerpHex(startRadial.centerColor, result.centerColor, eased),
            outerColor: lerpHex(startRadial.outerColor, result.outerColor, eased),
            midColors: result.midColors?.map((m, i) => ({
              ...m,
              color: lerpHex(
                startRadial.midColors?.[i]?.color || startRadial.centerColor,
                m.color,
                eased
              ),
            })),
          }
          setRadialGradient(interpolatedRadial)

          if (t < 1) {
            animationFrameIdRef.current = requestAnimationFrame(animateToRadialResult)
          } else {
            setRadialGradient(result)
            setCachedRadialGradient(result)
            animationFrameIdRef.current = null
          }
        }
        animationFrameIdRef.current = requestAnimationFrame(animateToRadialResult)

        setHasCompletedFirstGeneration(true)
        setPlaceholderText(prompt)
      } catch (error) {
        if (animationFrameIdRef.current != null) {
          cancelAnimationFrame(animationFrameIdRef.current)
          animationFrameIdRef.current = null
        }
        if (id === generationIdRef.current) {
          // Restore original radial gradient on error
          if (preGenerateRadialRef.current) {
            setRadialGradient(preGenerateRadialRef.current)
          }
          const msg = error instanceof Error ? error.message : String(error)
          setGenerateError(msg)
        }
      } finally {
        if (id === generationIdRef.current) setIsGenerating(false)
      }
      return
    }

    // Linear gradient logic (existing)
    // Pre-response: colors start changing immediately (hue rotation) while the model runs
    const rafState = { start: 0 }
    const animatePre = (now: number) => {
      if (!rafState.start) rafState.start = now
      const elapsed = now - rafState.start
      const hueOffset = (elapsed * 0.08) % 360
      const next = preGenerateStopsRef.current.map((s) => ({
        position: s.position,
        color: rotateHue(s.color, hueOffset),
      }))
      lastDisplayedStopsRef.current = next
      setColorStops(next)
      animationFrameIdRef.current = requestAnimationFrame(animatePre)
    }
    animationFrameIdRef.current = requestAnimationFrame(animatePre)

    try {
      const stops = await generateGradientFromPrompt(prompt)
      if (id !== generationIdRef.current) return
      logGradientGeneration(prompt, stops, 'linear')
      setHasCompletedFirstGeneration(true)
      if (animationFrameIdRef.current != null) {
        cancelAnimationFrame(animationFrameIdRef.current)
        animationFrameIdRef.current = null
      }

      const newStops = stops.map(({ color, stop }) => ({ position: stop, color }))
      const current = (lastDisplayedStopsRef.current?.length ? lastDisplayedStopsRef.current : colorStopsRef.current)
      const startColors = newStops.map((s) => sampleGradient(current, s.position / 100))
      const DURATION = 600
      const transitionState = { start: 0 }

      const animateToResult = (now: number) => {
        if (!transitionState.start) transitionState.start = now
        const elapsed = now - transitionState.start
        const t = Math.min(1, elapsed / DURATION)
        const eased = easeInOutCubic(t)

        const interpolated = newStops.map((stop, i) => ({
          position: stop.position,
          color: lerpHex(startColors[i], stop.color, eased),
        }))
        lastDisplayedStopsRef.current = interpolated
        setColorStops(interpolated)

        if (t < 1) {
          animationFrameIdRef.current = requestAnimationFrame(animateToResult)
        } else {
          lastDisplayedStopsRef.current = newStops
          setColorStops(newStops)
          setCachedLinearGradient(newStops)
          animationFrameIdRef.current = null
        }
      }
      animationFrameIdRef.current = requestAnimationFrame(animateToResult)
      setPlaceholderText(prompt)
    } catch (error) {
      if (animationFrameIdRef.current != null) {
        cancelAnimationFrame(animationFrameIdRef.current)
        animationFrameIdRef.current = null
      }
      if (id === generationIdRef.current) {
        setColorStops(preGenerateStopsRef.current)
        const msg = error instanceof Error ? error.message : String(error)
        setGenerateError(msg)
      }
    } finally {
      if (id === generationIdRef.current) setIsGenerating(false)
    }
  }

  const handleInputKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      handleGenerateGradient(gradientType)
    }
  }

  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      if (dragging === null || !pageRef.current) return
      
      hasDraggedRef.current = true
      
      const rect = pageRef.current.getBoundingClientRect()
      const y = e.clientY - rect.top
      const BOTTOM_MARGIN = 32
      const availableHeight = rect.height - topMargin - BOTTOM_MARGIN
      const relativeY = y - topMargin
      // Constrain to 0-100% within the available area (between margins)
      const percentage = Math.max(0, Math.min(100, (relativeY / availableHeight) * 100))
      
      const newStops = [...colorStops]
      newStops[dragging].position = Math.round(percentage)
      setColorStops(newStops)
    }

    const handleMouseUp = () => {
      setDragging(null)
      hasDraggedRef.current = false
    }

    if (dragging !== null) {
      window.addEventListener('mousemove', handleMouseMove)
      window.addEventListener('mouseup', handleMouseUp)
      return () => {
        window.removeEventListener('mousemove', handleMouseMove)
        window.removeEventListener('mouseup', handleMouseUp)
      }
    }
  }, [dragging, colorStops, topMargin])

  const handleDownload = (width: number, height: number, aspectRatioName: string) => {
    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d');

    if (!ctx) return;

    canvas.width = width;
    canvas.height = height;

    let gradient: CanvasGradient;

    if (gradientType === 'radial' && radialGradient) {
      const { position, size, softness } = radialGradient;

      // Calculate center position based on position string
      let centerX = width / 2;
      let centerY = height / 2;
      const pos = position || 'center';
      if (pos.includes('left')) centerX = pos.includes('off') ? -width * 0.2 : 0;
      if (pos.includes('right')) centerX = pos.includes('off') ? width * 1.2 : width;
      if (pos.includes('top')) centerY = pos.includes('off') ? -height * 0.2 : 0;
      if (pos.includes('bottom')) centerY = pos.includes('off') ? height * 1.2 : height;

      // Calculate radius based on size
      let radius: number;
      const sizeVal = size || 'medium';
      if (sizeVal === 'small') {
        radius = Math.min(width, height) / 3;
      } else if (sizeVal === 'large') {
        radius = Math.max(width, height);
      } else {
        radius = Math.max(width, height) / 2;
      }

      gradient = ctx.createRadialGradient(centerX, centerY, 0, centerX, centerY, radius);

      // Apply softness to color stops
      const softnessStops: Record<string, { center: number; outer: number }> = {
        'sharp': { center: 0, outer: 0.6 },
        'soft': { center: 0, outer: 0.85 },
        'ultra-soft': { center: 0, outer: 1 },
      };
      const { center: centerStop, outer: outerStop } = softnessStops[softness || 'soft'] || softnessStops['soft'];

      gradient.addColorStop(centerStop, radialGradient.centerColor);
      if (radialGradient.midColors) {
        const sortedMid = [...radialGradient.midColors].sort((a, b) => a.position - b.position);
        sortedMid.forEach((m) => {
          const scaledPos = centerStop + (m.position / 100) * (outerStop - centerStop);
          gradient.addColorStop(scaledPos, m.color);
        });
      }
      gradient.addColorStop(outerStop, radialGradient.outerColor);
      if (outerStop < 1) {
        gradient.addColorStop(1, radialGradient.outerColor);
      }
    } else {
      // Linear gradient
      gradient = ctx.createLinearGradient(0, 0, 0, canvas.height);
      const sortedStops = [...colorStops].sort((a, b) => a.position - b.position);
      sortedStops.forEach(stop => {
        gradient.addColorStop(stop.position / 100, stop.color);
      });
    }

    ctx.fillStyle = gradient;
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    canvas.toBlob((blob) => {
      if (blob) {
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `gradient-${aspectRatioName}.png`;
        a.click();
        URL.revokeObjectURL(url);
      }
    });
  };

  const handleCopyCSS = async () => {
    const css = `background: ${gradientString()};`
    try {
      await navigator.clipboard.writeText(css)
      setCopiedCSS(true)
      setTimeout(() => setCopiedCSS(false), 2000)
    } catch {
      // Fallback for older browsers
      const textarea = document.createElement('textarea')
      textarea.value = css
      document.body.appendChild(textarea)
      textarea.select()
      document.execCommand('copy')
      document.body.removeChild(textarea)
      setCopiedCSS(true)
      setTimeout(() => setCopiedCSS(false), 2000)
    }
  }

  const gradientString = () => {
    if (gradientType === 'radial' && radialGradient) {
      const { centerColor, outerColor, midColors, shape, position, size, softness } = radialGradient

      // Map position string to CSS position
      const positionMap: Record<string, string> = {
        'center': 'center',
        'top': 'center top',
        'bottom': 'center bottom',
        'left': 'left center',
        'right': 'right center',
        'top-left': 'left top',
        'top-right': 'right top',
        'bottom-left': 'left bottom',
        'bottom-right': 'right bottom',
        'bottom-center': 'center bottom',
        'top-center': 'center top',
        'off-left': '-20% center',
        'off-right': '120% center',
        'off-top': 'center -20%',
        'off-bottom': 'center 120%',
      }
      const cssPosition = positionMap[position || 'center'] || 'center'

      // Map size to gradient extent
      const sizeMap: Record<string, string> = {
        'small': 'closest-side',
        'medium': 'farthest-corner',
        'large': 'farthest-side',
      }
      const cssSize = sizeMap[size || 'medium'] || 'farthest-corner'

      // Map softness to color stop positions (affects how quickly center fades to outer)
      const softnessStops: Record<string, { center: number; outer: number }> = {
        'sharp': { center: 0, outer: 60 },
        'soft': { center: 0, outer: 85 },
        'ultra-soft': { center: 0, outer: 100 },
      }
      const { center: centerStop, outer: outerStop } = softnessStops[softness || 'soft'] || softnessStops['soft']

      const stops: string[] = [`${centerColor} ${centerStop}%`]
      if (midColors && midColors.length > 0) {
        const sortedMid = [...midColors].sort((a, b) => a.position - b.position)
        sortedMid.forEach((m) => {
          // Scale mid position between center and outer stops
          const scaledPos = centerStop + (m.position / 100) * (outerStop - centerStop)
          stops.push(`${m.color} ${scaledPos}%`)
        })
      }
      stops.push(`${outerColor} ${outerStop}%`)
      if (outerStop < 100) {
        stops.push(`${outerColor} 100%`)
      }

      return `radial-gradient(${shape || 'circle'} ${cssSize} at ${cssPosition}, ${stops.join(', ')})`
    }
    const sortedStops = [...colorStops].sort((a, b) => a.position - b.position)
    return `linear-gradient(to bottom, ${sortedStops.map(s => `${s.color} ${s.position}%`).join(', ')})`
  }

  const handlePageMouseMove = (e: React.MouseEvent) => {
    if (!hasCompletedFirstGeneration || gradientType === 'radial' || !isEditingControls) {
      setShowPlusCursor(false)
      return
    }
    if (!pageRef.current || dragging !== null) {
      setShowPlusCursor(false)
      return
    }
    
    const rect = pageRef.current.getBoundingClientRect()
    const y = e.clientY - rect.top
    const x = e.clientX - rect.left
    const BOTTOM_MARGIN = 32
    const pageHeight = rect.height

    // Only show plus cursor within the horizontal width of the buttons
    let leftMost = Infinity, rightMost = -Infinity
    for (const el of stopContainerRefs.current) {
      if (!el) continue
      const r = el.getBoundingClientRect()
      leftMost = Math.min(leftMost, r.left - rect.left)
      rightMost = Math.max(rightMost, r.right - rect.left)
    }
    if (leftMost === Infinity || x < leftMost || x > rightMost) {
      setShowPlusCursor(false)
      return
    }

    const sortedStops = [...colorStops].sort((a, b) => a.position - b.position)
    if (sortedStops.length < 2) {
      setShowPlusCursor(false)
      return
    }
    
    // Show plus in the full gradient strip: above, between, and below the buttons
    const inGradientStrip = y >= topMargin && y <= pageHeight - BOTTOM_MARGIN
    setShowPlusCursor(inGradientStrip)
  }

  if (typeof window !== 'undefined' && window.location.pathname === '/gallery') {
    return <Gallery onBack={() => { window.location.href = '/' }} />
  }

  return (
    <div
      ref={pageRef}
      className="w-full h-full min-h-0 relative overflow-hidden"
      style={{
        background: gradientString(),
        cursor: dragging !== null ? 'grabbing' : (hasCompletedFirstGeneration && showPlusCursor ? `url("${plusCursor}") 12 12, crosshair` : 'default')
      }}
      onClick={handleLineClick}
      onMouseMove={handlePageMouseMove}
      onMouseLeave={() => setShowPlusCursor(false)}
    >
      {/* Crossfade layers for gradient type switching on homepage */}
      {!hasCompletedFirstGeneration && (
        <>
          <div
            className="absolute inset-0 pointer-events-none"
            style={{
              background: (() => {
                const sortedStops = [...colorStops].sort((a, b) => a.position - b.position)
                return `linear-gradient(to bottom, ${sortedStops.map(s => `${s.color} ${s.position}%`).join(', ')})`
              })(),
              opacity: showLinearLayer ? 1 : 0,
              transition: 'opacity 0.6s ease-in-out',
            }}
          />
          <div
            className="absolute inset-0 pointer-events-none"
            style={{
              background: radialGradient ? (() => {
                const { centerColor, outerColor, midColors, shape, position, size, softness } = radialGradient
                const positionMap: Record<string, string> = {
                  'center': 'center', 'top': 'center top', 'bottom': 'center bottom',
                  'left': 'left center', 'right': 'right center', 'top-left': 'left top',
                  'top-right': 'right top', 'bottom-left': 'left bottom', 'bottom-right': 'right bottom',
                  'bottom-center': 'center bottom', 'top-center': 'center top',
                }
                const cssPosition = positionMap[position || 'center'] || 'center'
                const sizeMap: Record<string, string> = { 'small': 'closest-side', 'medium': 'farthest-corner', 'large': 'farthest-side' }
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
              })() : 'transparent',
              opacity: showLinearLayer ? 0 : 1,
              transition: 'opacity 0.6s ease-in-out',
            }}
          />
        </>
      )}
          {!hasCompletedFirstGeneration ? (
            /* Landing: gradient + centered input with radial/linear buttons */
            <div
              className="absolute inset-0 flex items-center justify-center"
              onClick={(e) => e.stopPropagation()}
              onMouseDown={(e) => e.stopPropagation()}
            >
              <div className="flex flex-col items-center gap-2">
                <div
                  className="bg-white/80 backdrop-blur-xl shadow"
                  style={{ width: 'clamp(280px, 28vw, 520px)', maxWidth: '90vw' }}
                >
                  <div className="px-3 py-3">
                    <input
                      ref={inputRef}
                      type="text"
                      autoFocus
                      enterKeyHint="go"
                      placeholder={placeholderText}
                      value={inputValue}
                      onChange={(e) => setInputValue(e.target.value)}
                      onKeyDown={handleInputKeyDown}
                      disabled={isGenerating}
                      style={{ width: '100%' }}
                      className="block h-6 m-0 p-0 border-0 bg-transparent outline-none text-gray-800 text-base font-sans placeholder:text-gray-500 disabled:opacity-50"
                      onClick={(e) => e.stopPropagation()}
                      onMouseDown={(e) => e.stopPropagation()}
                    />
                  </div>
                  <div className="flex items-center justify-between px-2 pb-2">
                    <div className="flex items-center gap-1">
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation()
                          if (hasCompletedFirstGeneration && gradientType !== 'linear') {
                            // Check if we have a cached linear gradient
                            if (cachedLinearGradient) {
                              setColorStops(cachedLinearGradient)
                              setGradientType('linear')
                            } else {
                              // Regenerate with linear if we've already generated and are switching types
                              handleGenerateGradient('linear')
                            }
                          } else {
                            setGradientType('linear')
                          }
                        }}
                        disabled={isGenerating}
                        className={`px-3 py-1.5 text-xs font-sans transition-colors ${
                          gradientType === 'linear'
                            ? 'bg-gray-800 text-white'
                            : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                        } disabled:opacity-50`}
                      >
                        Linear
                      </button>
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation()
                          if (hasCompletedFirstGeneration && gradientType !== 'radial') {
                            // Check if we have a cached radial gradient
                            if (cachedRadialGradient) {
                              setRadialGradient(cachedRadialGradient)
                              setGradientType('radial')
                            } else {
                              // Regenerate with radial if we've already generated and are switching types
                              handleGenerateGradient('radial')
                            }
                          } else {
                            setGradientType('radial')
                          }
                        }}
                        disabled={isGenerating}
                        className={`px-3 py-1.5 text-xs font-sans transition-colors ${
                          gradientType === 'radial'
                            ? 'bg-gray-800 text-white'
                            : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                        } disabled:opacity-50`}
                      >
                        Radial
                      </button>
                    </div>
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation()
                        handleGenerateGradient()
                      }}
                      disabled={isGenerating || !inputValue.trim()}
                      className="w-8 h-8 flex items-center justify-center bg-gray-800 text-white hover:bg-gray-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                      aria-label="Generate gradient"
                    >
                      <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                        <path d="M5 12h14" />
                        <path d="M12 5l7 7-7 7" />
                      </svg>
                    </button>
                  </div>
                </div>
                {generateError && (
                  <p className="text-xs font-sans text-red-600 mt-0.5" role="alert">
                    {generateError}
                  </p>
                )}
              </div>
            </div>
          ) : (
            <>
              {/* Bottom center: search bar (same style as landing) */}
              <div
                className="absolute bottom-8 left-1/2 -translate-x-1/2 z-20 flex flex-col items-center gap-2"
                onClick={(e) => e.stopPropagation()}
                onMouseDown={(e) => e.stopPropagation()}
              >
                <div
                  className="bg-white/80 backdrop-blur-xl shadow"
                  style={{ width: 'clamp(280px, 28vw, 520px)', maxWidth: '90vw' }}
                >
                  <div className="px-3 py-3">
                    <input
                      ref={inputRef}
                      type="text"
                      enterKeyHint="go"
                      placeholder={placeholderText}
                      value={inputValue}
                      onChange={(e) => setInputValue(e.target.value)}
                      onKeyDown={handleInputKeyDown}
                      disabled={isGenerating}
                      style={{ width: '100%' }}
                      className="block h-6 m-0 p-0 border-0 bg-transparent outline-none text-gray-800 text-base font-sans placeholder:text-gray-500 disabled:opacity-50"
                      onClick={(e) => e.stopPropagation()}
                      onMouseDown={(e) => e.stopPropagation()}
                    />
                  </div>
                  <div className="flex items-center justify-between px-2 pb-2">
                    <div className="flex items-center gap-1">
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation()
                          if (hasCompletedFirstGeneration && gradientType !== 'linear') {
                            // Check if we have a cached linear gradient
                            if (cachedLinearGradient) {
                              setColorStops(cachedLinearGradient)
                              setGradientType('linear')
                            } else {
                              // Regenerate with linear if we've already generated and are switching types
                              handleGenerateGradient('linear')
                            }
                          } else {
                            setGradientType('linear')
                          }
                        }}
                        disabled={isGenerating}
                        className={`px-3 py-1.5 text-xs font-sans transition-colors ${
                          gradientType === 'linear'
                            ? 'bg-gray-800 text-white'
                            : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                        } disabled:opacity-50`}
                      >
                        Linear
                      </button>
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation()
                          if (hasCompletedFirstGeneration && gradientType !== 'radial') {
                            // Check if we have a cached radial gradient
                            if (cachedRadialGradient) {
                              setRadialGradient(cachedRadialGradient)
                              setGradientType('radial')
                            } else {
                              // Regenerate with radial if we've already generated and are switching types
                              handleGenerateGradient('radial')
                            }
                          } else {
                            setGradientType('radial')
                          }
                        }}
                        disabled={isGenerating}
                        className={`px-3 py-1.5 text-xs font-sans transition-colors ${
                          gradientType === 'radial'
                            ? 'bg-gray-800 text-white'
                            : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                        } disabled:opacity-50`}
                      >
                        Radial
                      </button>
                    </div>
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation()
                        handleGenerateGradient()
                      }}
                      disabled={isGenerating || !inputValue.trim()}
                      className="w-8 h-8 flex items-center justify-center bg-gray-800 text-white hover:bg-gray-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                      aria-label="Generate gradient"
                    >
                      <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                        <path d="M5 12h14" />
                        <path d="M12 5l7 7-7 7" />
                      </svg>
                    </button>
                  </div>
                </div>
                {/* Download and Copy CSS buttons below search bar */}
                <div className="flex items-center gap-1">
                  <div
                    className="relative"
                    onMouseEnter={() => setDownloadOpen(true)}
                    onMouseLeave={() => setDownloadOpen(false)}
                  >
                    <button
                      type="button"
                      onClick={(e) => e.stopPropagation()}
                      onMouseDown={(e) => e.stopPropagation()}
                      className="px-3 py-1.5 text-xs font-sans transition-colors bg-gray-100 text-gray-600 hover:bg-gray-200"
                    >
                      Download
                    </button>
                    {downloadOpen && (
                      <div
                        className="absolute left-1/2 -translate-x-1/2 bottom-full mb-1 z-50 min-w-[180px] bg-white/95 backdrop-blur-xl shadow py-1"
                        onMouseDown={(e) => e.stopPropagation()}
                      >
                        {DOWNLOAD_SIZES.map(({ label, width, height, name }) => (
                          <button
                            key={name}
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation()
                              handleDownload(width, height, name)
                              setDownloadOpen(false)
                            }}
                            className="w-full text-left px-3 py-1.5 text-xs font-sans text-gray-800 hover:bg-gray-100"
                          >
                            {label}
                          </button>
                        ))}
                      </div>
                    )}
                  </div>
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation()
                      handleCopyCSS()
                    }}
                    onMouseDown={(e) => e.stopPropagation()}
                    className="hidden sm:block px-3 py-1.5 text-xs font-sans transition-colors bg-gray-100 text-gray-600 hover:bg-gray-200"
                  >
                    {copiedCSS ? 'Copied!' : 'Copy CSS'}
                  </button>
                  {gradientType === 'linear' && (
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation()
                        setIsEditingControls(!isEditingControls)
                      }}
                      onMouseDown={(e) => e.stopPropagation()}
                      className="hidden sm:block px-3 py-1.5 text-xs font-sans transition-colors bg-gray-100 text-gray-600 hover:bg-gray-200"
                    >
                      {isEditingControls ? 'Done' : 'Edit'}
                    </button>
                  )}
                </div>
                {generateError && (
                  <p className="text-xs font-sans text-red-600 mt-0.5" role="alert">
                    {generateError}
                  </p>
                )}
              </div>

              {/* Color stop controls: on the left side, hidden on mobile and when radial gradient is selected or not editing */}
              {gradientType === 'linear' && isEditingControls && <div className="hidden sm:block">
              {colorStops.map((stop, index) => {
            const BOTTOM_MARGIN = 32
            const pageHeight = pageRef.current?.clientHeight || window.innerHeight
            const availableHeight = pageHeight - topMargin - BOTTOM_MARGIN

            // For position 100, use bottom instead of top to prevent going off screen
            const isBottom = stop.position === 100
            const topPx = topMargin + (stop.position / 100) * availableHeight

            return (
              <div
                key={index}
                ref={(el) => { stopContainerRefs.current[index] = el }}
                className={`absolute left-8 flex items-center gap-1.5 ${colorPickerFor === index ? 'z-[100]' : 'z-10'}`}
                style={{
                  ...(isBottom
                    ? { bottom: `${BOTTOM_MARGIN}px` }
                    : { top: `${topPx}px` }
                  ),
                }}
              >
                <div
                  ref={(el) => { pillRefs.current[index] = el }}
                  className={`relative flex items-center gap-1.5 bg-white/80 backdrop-blur-xl px-2 py-1 shadow cursor-grab active:cursor-grabbing ${colorPickerFor === index ? 'z-10' : ''}`}
                  onMouseDown={handleCircleMouseDown(index)}
                  onClick={(e) => e.stopPropagation()}
                >
                  {/* Color square — only this opens the picker; input overlay for real click (Safari), stopPropagation so pill doesn't drag */}
                  <div
                    className="relative w-4 h-4 flex-shrink-0 cursor-pointer"
                    onClick={(e) => {
                      e.stopPropagation()
                      if (colorPickerFor === index) {
                        setColorPickerFor(null)
                      } else {
                        const rect = pillRefs.current[index]?.getBoundingClientRect()
                        const pickerHeight = 240
                        setPickerPlaceAbove(!!(rect && (window.innerHeight - rect.bottom) < pickerHeight))
                        setColorPickerFor(index)
                      }
                    }}
                    onMouseDown={(e) => e.stopPropagation()}
                  >
                    <div
                      className="absolute inset-0 rounded-none"
                      style={{ background: stop.color }}
                      aria-hidden
                    />
                  </div>

                  {/* Hex code — rest of pill is for drag */}
                  <span className="text-xs font-sans leading-none text-gray-800">
                    {stop.color.toUpperCase()}
                  </span>

                  {colorPickerFor === index && (
                    <div
                      className={`gradients-color-picker absolute left-0 z-[100] p-1.5 bg-white/95 backdrop-blur-xl shadow rounded-none ${pickerPlaceAbove ? 'bottom-full mb-1' : 'top-full mt-1'}`}
                      onMouseDown={(e) => e.stopPropagation()}
                    >
                      <HexColorPicker color={stop.color} onChange={(c) => handleColorChange(index, c)} />
                    </div>
                  )}
                </div>

                {/* Delete square — beside the pill, follows when dragged */}
                {colorStops.length > 2 && (
                  <button
                    type="button"
                    onMouseDown={(e) => e.stopPropagation()}
                    onClick={handleRemoveStop(index)}
                    className="w-6 h-6 flex items-center justify-center flex-shrink-0 bg-white/80 backdrop-blur-xl shadow rounded-none text-gray-800 text-xs font-sans leading-none hover:opacity-70 transition-opacity cursor-pointer"
                  >
                    −
                  </button>
                )}
              </div>
            )
          })}
              </div>}
            </>
          )}
    </div>
  )
}

export default App
