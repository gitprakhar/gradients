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

const DOWNLOAD_SIZES = [
  { label: '16:9 (1920×1080)', width: 1920, height: 1080, name: '16-9' },
  { label: '16:9 (1600×900)', width: 1600, height: 900, name: '16-9-small' },
  { label: '4:3 (1920×1440)', width: 1920, height: 1440, name: '4-3' },
  { label: '1:1 (1080×1080)', width: 1080, height: 1080, name: '1-1' },
  { label: '21:9 (2560×1080)', width: 2560, height: 1080, name: '21-9' },
  { label: '9:16 (1080×1920)', width: 1080, height: 1920, name: '9-16' },
] as const

// Create a plus cursor using SVG data URL
const plusCursor = `data:image/svg+xml;base64,${btoa(`
  <svg width="16" height="16" xmlns="http://www.w3.org/2000/svg">
    <line x1="8" y1="2" x2="8" y2="14" stroke="white" stroke-width="1.5" stroke-linecap="round"/>
    <line x1="2" y1="8" x2="14" y2="8" stroke="white" stroke-width="1.5" stroke-linecap="round"/>
  </svg>
`)}`

export function App() {
  // Array of color stops: { position: 0-100, color: string }
  const [colorStops, setColorStops] = useState([
    { position: 0, color: '#000518' },
    { position: 100, color: '#63B4E7' }
  ])
  const [dragging, setDragging] = useState<number | null>(null)
  const [showPlusCursor, setShowPlusCursor] = useState(false)
  const [inputValue, setInputValue] = useState('')
  const [isGenerating, setIsGenerating] = useState(false)
  const [downloadOpen, setDownloadOpen] = useState(false)
  const [showDownload, setShowDownload] = useState(false)
  const [colorPickerFor, setColorPickerFor] = useState<number | null>(null)
  const pickerPillRef = useRef<HTMLDivElement | null>(null)
  const pageRef = useRef<HTMLDivElement>(null)
  const hasDraggedRef = useRef<boolean>(false)
  const inputRef = useRef<HTMLInputElement>(null)
  const measureRef = useRef<HTMLSpanElement>(null)
  const colorStopsRef = useRef(colorStops)
  const animationFrameIdRef = useRef<number | null>(null)

  useEffect(() => { colorStopsRef.current = colorStops }, [colorStops])
  useEffect(() => () => {
    if (animationFrameIdRef.current != null) cancelAnimationFrame(animationFrameIdRef.current)
  }, [])

  // Close color picker when mousedown outside the pill
  useEffect(() => {
    if (colorPickerFor === null) return
    const onMouseDown = (e: MouseEvent) => {
      if (!pickerPillRef.current?.contains(e.target as Node)) setColorPickerFor(null)
    }
    window.addEventListener('mousedown', onMouseDown)
    return () => window.removeEventListener('mousedown', onMouseDown)
  }, [colorPickerFor])

  // Measure input width: min = "Generate Anything", expand only when prompt exceeds that
  useEffect(() => {
    if (measureRef.current && inputRef.current) {
      // Minimum width = placeholder "Generate Anything"
      measureRef.current.textContent = 'Generate Anything'
      const minTextWidth = measureRef.current.offsetWidth

      // Width for current content (when empty, use placeholder for measure)
      const textToMeasure = inputValue || 'Generate Anything'
      measureRef.current.textContent = textToMeasure
      const textWidth = measureRef.current.offsetWidth

      // Padding: px-2 = 0.5rem (8px) on each side = 16px total
      const paddingWidth = 16
      const width = Math.max(textWidth, minTextWidth) + paddingWidth
      inputRef.current.style.width = `${width}px`
    }
  }, [inputValue])

  const handleLineClick = (e: React.MouseEvent) => {
    if (!pageRef.current || dragging !== null) return
    
    // Only create new stop if plus cursor is showing
    if (!showPlusCursor) return
    
    // Prevent creating new stop if we just finished dragging (hasDraggedRef is cleared in drag’s mouseup)
    if (hasDraggedRef.current) return
    
    const rect = pageRef.current.getBoundingClientRect()
    const y = e.clientY - rect.top
    const TOP_MARGIN = 32 // Match top-8 (2rem) where text is
    const BOTTOM_MARGIN = 32 // Same as top margin
    const availableHeight = rect.height - TOP_MARGIN - BOTTOM_MARGIN
    const relativeY = y - TOP_MARGIN
    // Constrain to 0-100% within the available area (between margins)
    const percentage = Math.max(0, Math.min(100, (relativeY / availableHeight) * 100))
    
    // Add new color stop at clicked position with interpolated color
    const newPosition = Math.round(percentage)
    const newColor = interpolateColor(newPosition)
    
    const newStops = [...colorStops, { position: newPosition, color: newColor }]
    newStops.sort((a, b) => a.position - b.position)
    setColorStops(newStops)
    setShowDownload(true)
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
    setShowDownload(true)
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
    
    const newStops = colorStops.filter((_, i) => i !== index)
    setColorStops(newStops)
    setShowDownload(true)
  }

  const handleGenerateGradient = async () => {
    if (!inputValue.trim() || isGenerating) return

    if (animationFrameIdRef.current != null) {
      cancelAnimationFrame(animationFrameIdRef.current)
      animationFrameIdRef.current = null
    }
    setIsGenerating(true)
    try {
      const colors = await generateGradientFromPrompt(inputValue.trim())
      
      // Create color stops from the generated colors (distribute evenly 0–100)
      const newStops = colors.map((color, index) => ({
        position: Math.round((index / (colors.length - 1)) * 100),
        color: color,
      }))

      const current = colorStopsRef.current
      const startColors = newStops.map((s) => sampleGradient(current, s.position / 100))
      const DURATION = 600
      const rafState = { start: 0 }

      const animate = (now: number) => {
        if (!rafState.start) rafState.start = now
        const elapsed = now - rafState.start
        const t = Math.min(1, elapsed / DURATION)
        const eased = easeInOutCubic(t)

        const interpolated = newStops.map((stop, i) => ({
          position: stop.position,
          color: lerpHex(startColors[i], stop.color, eased),
        }))
        setColorStops(interpolated)

        if (t < 1) {
          animationFrameIdRef.current = requestAnimationFrame(animate)
        } else {
          setColorStops(newStops)
          animationFrameIdRef.current = null
        }
      }
      animationFrameIdRef.current = requestAnimationFrame(animate)
      setShowDownload(true)
    } catch (error) {
      console.error('Failed to generate gradient:', error)
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
      const TOP_MARGIN = 32 // Match top-8 (2rem) where text is
      const BOTTOM_MARGIN = 32 // Same as top margin
      const availableHeight = rect.height - TOP_MARGIN - BOTTOM_MARGIN
      const relativeY = y - TOP_MARGIN
      // Constrain to 0-100% within the available area (between margins)
      const percentage = Math.max(0, Math.min(100, (relativeY / availableHeight) * 100))
      
      const newStops = [...colorStops]
      newStops[dragging].position = Math.round(percentage)
      setColorStops(newStops)
      setShowDownload(true)
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
  }, [dragging, colorStops])

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
    if (!pageRef.current || dragging !== null) {
      setShowPlusCursor(false)
      return
    }
    
    const rect = pageRef.current.getBoundingClientRect()
    const y = e.clientY - rect.top
    const x = e.clientX - rect.left
    const TOP_MARGIN = 32
    const BOTTOM_MARGIN = 32
    const pageHeight = rect.height
    const pageWidth = rect.width
    
    // Check if cursor is horizontally near the center (where buttons are)
    const centerX = pageWidth / 2
    const buttonWidthTolerance = 150 // Approximate button width tolerance
    const isNearCenter = Math.abs(x - centerX) < buttonWidthTolerance
    
    if (!isNearCenter) {
      setShowPlusCursor(false)
      return
    }
    
    const sortedStops = [...colorStops].sort((a, b) => a.position - b.position)
    if (sortedStops.length < 2) {
      setShowPlusCursor(false)
      return
    }
    
    // Show plus in the full gradient strip: above, between, and below the buttons
    const inGradientStrip = y >= TOP_MARGIN && y <= pageHeight - BOTTOM_MARGIN
    setShowPlusCursor(inGradientStrip)
  }

  return (
    <div 
      ref={pageRef}
      className="w-screen h-screen relative" 
      style={{
        background: gradientString(),
        cursor: showPlusCursor ? `url("${plusCursor}") 8 8, crosshair` : 'default'
      }}
      onClick={handleLineClick}
      onMouseMove={handlePageMouseMove}
      onMouseLeave={() => setShowPlusCursor(false)}
    >
          {/* Top left text input and download */}
          <div className="absolute top-8 left-8 flex items-center gap-2">
            <div className="flex items-center">
              <span
                ref={measureRef}
                className="absolute invisible whitespace-pre text-xs font-sans"
                style={{ visibility: 'hidden', position: 'absolute' }}
              >
                Generate Anything
              </span>
              <input
                ref={inputRef}
                type="text"
                placeholder="Generate Anything"
                value={inputValue}
                onChange={(e) => setInputValue(e.target.value)}
                onKeyDown={handleInputKeyDown}
                disabled={isGenerating}
                className="h-6 min-h-0 m-0 border-0 bg-white/80 backdrop-blur-xl px-2 py-1 shadow outline-none text-gray-800 text-xs font-sans leading-none placeholder:text-gray-600 focus:placeholder:text-gray-600 disabled:opacity-50"
                onClick={(e) => e.stopPropagation()}
                onMouseDown={(e) => e.stopPropagation()}
              />
            </div>
            <div
              className="relative flex items-center"
              onMouseEnter={() => setDownloadOpen(true)}
              onMouseLeave={() => setDownloadOpen(false)}
            >
              <button
                type="button"
                onMouseDown={(e) => e.stopPropagation()}
                className="h-6 min-h-0 m-0 border-0 bg-white/80 backdrop-blur-xl px-2 py-1 shadow text-gray-800 text-xs font-sans leading-none hover:opacity-90 transition-opacity appearance-none"
              >
                Download
              </button>
              {downloadOpen && (
                <div
                  className="absolute left-0 top-full mt-0 z-50 min-w-[180px] bg-white/80 backdrop-blur-xl shadow py-1"
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

          {/* Render all color stops as buttons */}
          {colorStops.map((stop, index) => {
            const TOP_MARGIN = 32 // Match top-8 (2rem) where text is
            const BOTTOM_MARGIN = 32 // Same as top margin
            const pageHeight = pageRef.current?.clientHeight || window.innerHeight
            const availableHeight = pageHeight - TOP_MARGIN - BOTTOM_MARGIN
            
            // For position 100, use bottom instead of top to prevent going off screen
            const isBottom = stop.position === 100
            const topPx = TOP_MARGIN + (stop.position / 100) * availableHeight
            
            return (
              <div
                key={index}
                className="absolute left-1/2 -translate-x-1/2 z-10"
                style={{ 
                  ...(isBottom 
                    ? { bottom: `${BOTTOM_MARGIN}px` }
                    : { top: `${topPx}px` }
                  ),
                }}
              >
                <div 
                  ref={colorPickerFor === index ? (el) => { pickerPillRef.current = el } : undefined}
                  className="relative flex items-center gap-1.5 bg-white/80 backdrop-blur-xl px-2 py-1 shadow cursor-grab active:cursor-grabbing"
                  onMouseDown={handleCircleMouseDown(index)}
                  onClick={(e) => e.stopPropagation()}
                >
                  {/* Color square — only this opens the picker; input overlay for real click (Safari), stopPropagation so pill doesn’t drag */}
                  <div
                    className="relative w-4 h-4 flex-shrink-0 cursor-pointer"
                    onClick={(e) => { e.stopPropagation(); setColorPickerFor((c) => (c === index ? null : index)) }}
                    onMouseDown={(e) => e.stopPropagation()}
                  >
                    <div
                      className="absolute inset-0 rounded-[2px]"
                      style={{ background: stop.color }}
                      aria-hidden
                    />
                  </div>
                  
                  {/* Hex code — rest of pill is for drag */}
                  <span className="text-xs font-mono text-gray-800">
                    {stop.color.toUpperCase()}
                  </span>
                  
                  {/* Remove button - only show if more than 2 stops */}
                  {colorStops.length > 2 && (
                    <button
                      type="button"
                      onMouseDown={(e) => e.stopPropagation()}
                      onClick={handleRemoveStop(index)}
                      className="relative z-10 text-gray-800 text-lg leading-none hover:opacity-70 transition-opacity"
                    >
                      −
                    </button>
                  )}

                  {colorPickerFor === index && (
                    <div
                      className="absolute left-0 top-full z-50 mt-1 p-1.5 bg-white/95 backdrop-blur-xl shadow rounded"
                      onMouseDown={(e) => e.stopPropagation()}
                    >
                      <HexColorPicker color={stop.color} onChange={(c) => handleColorChange(index, c)} />
                    </div>
                  )}
                </div>
              </div>
            )
          })}
    </div>
  )
}

export default App
