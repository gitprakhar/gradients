import { useState, useRef, useEffect } from 'react'
import { HexColorPicker } from 'react-colorful'
import { generateGradientFromPrompt } from "@/lib/ollama"

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

function pickRandomPreset() {
  const g = PRESET_GRADIENTS[Math.floor(Math.random() * PRESET_GRADIENTS.length)]
  return { title: g.title, stops: g.stops.map((s) => ({ position: s.stop, color: s.color })) }
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

  const [colorStops, setColorStops] = useState(initialPresetRef.current.stops)
  const [dragging, setDragging] = useState<number | null>(null)
  const [showPlusCursor, setShowPlusCursor] = useState(false)
  const [inputValue, setInputValue] = useState('')
  const [placeholderText, setPlaceholderText] = useState(initialPresetRef.current!.title)
  const [isGenerating, setIsGenerating] = useState(false)
  const [generateError, setGenerateError] = useState<string | null>(null)
  const [hasCompletedFirstGeneration, setHasCompletedFirstGeneration] = useState(false)
  const [downloadOpen, setDownloadOpen] = useState(false)
  const [colorPickerFor, setColorPickerFor] = useState<number | null>(null)
  const [pickerPlaceAbove, setPickerPlaceAbove] = useState(false)
  const pillRefs = useRef<(HTMLDivElement | null)[]>([])
  const stopContainerRefs = useRef<(HTMLDivElement | null)[]>([])
  const pageRef = useRef<HTMLDivElement>(null)
  const hasDraggedRef = useRef<boolean>(false)
  const inputRef = useRef<HTMLInputElement>(null)
  const measureRef = useRef<HTMLSpanElement>(null)
  const colorStopsRef = useRef(colorStops)
  const animationFrameIdRef = useRef<number | null>(null)
  const preGenerateStopsRef = useRef<{ position: number; color: string }[]>([])

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

  // Measure input width: min = placeholder, expand when prompt exceeds that
  useEffect(() => {
    if (measureRef.current && inputRef.current) {
      measureRef.current.textContent = placeholderText
      const minTextWidth = measureRef.current.offsetWidth

      const textToMeasure = inputValue || placeholderText
      measureRef.current.textContent = textToMeasure
      const textWidth = measureRef.current.offsetWidth

      const { paddingLeft, paddingRight } = getComputedStyle(inputRef.current)
      const padding = parseFloat(paddingLeft) + parseFloat(paddingRight)
      inputRef.current.style.width = `${Math.max(textWidth, minTextWidth) + padding}px`
    }
  }, [inputValue, placeholderText])

  const handleLineClick = (e: React.MouseEvent) => {
    if (!hasCompletedFirstGeneration) return
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

  const handleGenerateGradient = async () => {
    const prompt = inputValue.trim()
    if (!prompt || isGenerating) return

    if (animationFrameIdRef.current != null) {
      cancelAnimationFrame(animationFrameIdRef.current)
      animationFrameIdRef.current = null
    }

    const snapshot = colorStopsRef.current.map((s) => ({ position: s.position, color: s.color }))
    preGenerateStopsRef.current = snapshot
    setGenerateError(null)
    setIsGenerating(true)

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
      setColorStops(next)
      animationFrameIdRef.current = requestAnimationFrame(animatePre)
    }
    animationFrameIdRef.current = requestAnimationFrame(animatePre)

    try {
      const stops = await generateGradientFromPrompt(prompt)
      setHasCompletedFirstGeneration(true)
      if (animationFrameIdRef.current != null) {
        cancelAnimationFrame(animationFrameIdRef.current)
        animationFrameIdRef.current = null
      }

      const newStops = stops.map(({ color, stop }) => ({ position: stop, color }))
      const current = colorStopsRef.current
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
        setColorStops(interpolated)

        if (t < 1) {
          animationFrameIdRef.current = requestAnimationFrame(animateToResult)
        } else {
          setColorStops(newStops)
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
      setColorStops(preGenerateStopsRef.current)
      const msg = error instanceof Error ? error.message : String(error)
      setGenerateError(msg)
    } finally {
      setIsGenerating(false)
    }
  }

  const handleInputKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      handleGenerateGradient()
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
    // Create a canvas with specified aspect ratio
    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d');
    
    if (!ctx) return;
    
    // Set canvas size
    canvas.width = width;
    canvas.height = height;
    
    // Create gradient with all color stops
    const gradient = ctx.createLinearGradient(0, 0, 0, canvas.height);
    const sortedStops = [...colorStops].sort((a, b) => a.position - b.position)
    sortedStops.forEach(stop => {
      gradient.addColorStop(stop.position / 100, stop.color)
    })
    
    // Fill canvas with gradient
    ctx.fillStyle = gradient;
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    
    // Convert canvas to blob and download
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

  const gradientString = () => {
    const sortedStops = [...colorStops].sort((a, b) => a.position - b.position)
    return `linear-gradient(to bottom, ${sortedStops.map(s => `${s.color} ${s.position}%`).join(', ')})`
  }

  const handlePageMouseMove = (e: React.MouseEvent) => {
    if (!hasCompletedFirstGeneration) {
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
          {!hasCompletedFirstGeneration ? (
            /* Landing: gradient + centered input only; no download, no color pills */
            <div
              className="absolute inset-0 flex items-center justify-center"
              onClick={(e) => e.stopPropagation()}
              onMouseDown={(e) => e.stopPropagation()}
            >
              <div className="flex flex-col items-center gap-2">
                <span
                  ref={measureRef}
                  className="absolute invisible whitespace-pre text-xs font-sans"
                  style={{ visibility: 'hidden', position: 'absolute' }}
                >
                  {placeholderText}
                </span>
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
                  className="h-6 min-h-0 m-0 border-0 bg-white/80 backdrop-blur-xl px-2 py-1 shadow outline-none text-gray-800 text-xs font-sans leading-none placeholder:text-gray-600 focus:placeholder:text-gray-600 disabled:opacity-50"
                  onClick={(e) => e.stopPropagation()}
                  onMouseDown={(e) => e.stopPropagation()}
                />
                {generateError && (
                  <p className="text-xs font-sans text-red-600 mt-0.5" role="alert">
                    {generateError}
                  </p>
                )}
              </div>
            </div>
          ) : (
            <>
              {/* Mobile: centered, input + square download button; sm+: top-left row with "Download" text */}
              <div className="absolute inset-0 sm:inset-auto sm:top-8 sm:left-8 sm:right-auto sm:bottom-auto sm:max-w-[min(48vw,1100px)] flex flex-col items-center justify-center sm:items-stretch sm:justify-start gap-1">
                <div className="flex flex-row items-center justify-center sm:justify-start gap-2 min-w-0 max-w-[calc(100vw-4rem)] px-4 sm:px-0">
                  <div className="flex items-center min-w-0 flex-1 sm:flex-1">
                    <span
                      ref={measureRef}
                      className="absolute invisible whitespace-pre text-xs font-sans"
                      style={{ visibility: 'hidden', position: 'absolute' }}
                    >
                      {placeholderText}
                    </span>
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
                      className="h-6 min-h-0 m-0 border-0 bg-white/80 backdrop-blur-xl px-2 py-1 shadow outline-none text-gray-800 text-xs font-sans leading-none placeholder:text-gray-600 focus:placeholder:text-gray-600 disabled:opacity-50 max-w-full"
                      onClick={(e) => e.stopPropagation()}
                      onMouseDown={(e) => e.stopPropagation()}
                    />
                  </div>
                  <div
                    className="relative flex items-center justify-center flex-shrink-0"
                    onMouseEnter={() => setDownloadOpen(true)}
                    onMouseLeave={() => setDownloadOpen(false)}
                  >
                    <button
                      type="button"
                      onMouseDown={(e) => e.stopPropagation()}
                      className="h-6 w-6 min-h-0 min-w-0 m-0 p-0 border-0 bg-white/80 backdrop-blur-xl shadow text-gray-800 flex items-center justify-center hover:opacity-90 transition-opacity appearance-none sm:w-auto sm:min-w-0 sm:px-2 sm:py-1"
                      aria-label="Download"
                    >
                      <img src="https://img.icons8.com/?size=48&id=14100&format=png&color=000000" alt="" className="w-3.5 h-3.5 sm:hidden object-contain" aria-hidden />
                      <span className="hidden sm:inline text-xs font-sans leading-none">Download</span>
                    </button>
                    {downloadOpen && (
                      <div
                        className="absolute right-0 left-auto sm:left-0 sm:right-auto top-full mt-0 z-50 min-w-[180px] bg-white/80 backdrop-blur-xl shadow py-1"
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
                </div>
                {generateError && (
                  <p className="text-xs font-sans text-red-600 mt-0.5" role="alert">
                    {generateError}
                  </p>
                )}
              </div>

              {/* Color stop controls: hidden on mobile, only search + download; visible from sm+ */}
              <div className="hidden sm:block">
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
                className={`absolute left-8 sm:left-1/2 sm:-translate-x-1/2 flex items-center gap-1.5 ${colorPickerFor === index ? 'z-[100]' : 'z-10'}`}
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
                  {/* Color square — only this opens the picker; input overlay for real click (Safari), stopPropagation so pill doesn’t drag */}
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
              </div>
            </>
          )}
    </div>
  )
}

export default App
