import { useState, useRef, useEffect } from 'react'
import { generateGradientFromPrompt } from "@/lib/ollama"

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
  const pageRef = useRef<HTMLDivElement>(null)
  const colorInputRefs = useRef<(HTMLInputElement | null)[]>([])
  const hasDraggedRef = useRef<boolean>(false)
  const inputRef = useRef<HTMLInputElement>(null)
  const measureRef = useRef<HTMLSpanElement>(null)

  // Measure input width based on current value
  useEffect(() => {
    if (measureRef.current && inputRef.current) {
      const textToMeasure = inputValue || 'Generate Anything'
      measureRef.current.textContent = textToMeasure
      const textWidth = measureRef.current.offsetWidth
      // Add padding: px-2 = 0.5rem (8px) on each side = 16px total
      const paddingWidth = 16
      inputRef.current.style.width = `${textWidth + paddingWidth}px`
    }
  }, [inputValue])

  const handleLineClick = (e: React.MouseEvent) => {
    if (!pageRef.current || dragging !== null) return
    
    // Only create new stop if plus cursor is showing
    if (!showPlusCursor) return
    
    // Prevent creating new stop if we just finished dragging
    if (hasDraggedRef.current) {
      hasDraggedRef.current = false
      return
    }
    
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
    hasDraggedRef.current = false
    setDragging(index)
  }

  const handleCircleClick = (index: number) => (e: React.MouseEvent) => {
    e.stopPropagation()
    colorInputRefs.current[index]?.click()
  }

  const handleRemoveStop = (index: number) => (e: React.MouseEvent) => {
    e.stopPropagation()
    // Keep at least 2 stops
    if (colorStops.length <= 2) return
    
    const newStops = colorStops.filter((_, i) => i !== index)
    setColorStops(newStops)
  }

  const handleGenerateGradient = async () => {
    if (!inputValue.trim() || isGenerating) return

    setIsGenerating(true)
    try {
      const colors = await generateGradientFromPrompt(inputValue.trim())
      
      // Create color stops from the generated colors
      // Distribute evenly from 0 to 100
      const newStops = colors.map((color, index) => ({
        position: Math.round((index / (colors.length - 1)) * 100),
        color: color,
      }))

      setColorStops(newStops)
    } catch (error) {
      console.error('Failed to generate gradient:', error)
      // You could show an error message to the user here
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
    }

    const handleMouseUp = () => {
      setDragging(null)
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
    const availableHeight = pageHeight - TOP_MARGIN - BOTTOM_MARGIN
    
    // Check if cursor is horizontally near the center (where buttons are)
    const centerX = pageWidth / 2
    const buttonWidthTolerance = 150 // Approximate button width tolerance
    const isNearCenter = Math.abs(x - centerX) < buttonWidthTolerance
    
    if (!isNearCenter) {
      setShowPlusCursor(false)
      return
    }
    
    // Calculate button positions in pixels
    const sortedStops = [...colorStops].sort((a, b) => a.position - b.position)
    if (sortedStops.length < 2) {
      setShowPlusCursor(false)
      return
    }
    
    // Check if cursor is between any adjacent pair of buttons
    const buttonHalfHeight = 16
    let isBetween = false
    
    for (let i = 0; i < sortedStops.length - 1; i++) {
      const topStop = sortedStops[i]
      const bottomStop = sortedStops[i + 1]
      
      const topButtonPosition = topStop.position === 0
        ? TOP_MARGIN
        : TOP_MARGIN + (topStop.position / 100) * availableHeight
      
      const bottomButtonPosition = bottomStop.position === 100
        ? pageHeight - BOTTOM_MARGIN
        : TOP_MARGIN + (bottomStop.position / 100) * availableHeight
      
      if (y > topButtonPosition + buttonHalfHeight && y < bottomButtonPosition - buttonHalfHeight) {
        isBetween = true
        break
      }
    }
    
    setShowPlusCursor(isBetween)
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
          <div className="absolute top-8 left-8 flex items-stretch gap-2">
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
                className="h-6 min-h-0 border-0 bg-white/80 backdrop-blur-xl px-2 py-1 shadow outline-none text-gray-800 text-xs font-sans leading-none placeholder:text-gray-600 focus:placeholder:text-gray-600 disabled:opacity-50"
                onClick={(e) => e.stopPropagation()}
                onMouseDown={(e) => e.stopPropagation()}
              />
            </div>
            <div
              className="relative"
              onMouseEnter={() => setDownloadOpen(true)}
              onMouseLeave={() => setDownloadOpen(false)}
            >
              <button
                type="button"
                onMouseDown={(e) => e.stopPropagation()}
                className="h-6 min-h-0 border-0 bg-white/80 backdrop-blur-xl px-2 py-1 shadow text-gray-800 text-xs font-sans hover:opacity-90 transition-opacity"
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
                      className="w-full text-left px-3 py-1.5 text-xs font-sans text-gray-800 hover:opacity-90"
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
                  className="flex items-center gap-1.5 bg-white/80 backdrop-blur-xl px-2 py-1 shadow cursor-grab active:cursor-grabbing"
                  onMouseDown={handleCircleMouseDown(index)}
                >
                  {/* Color square */}
                  <div 
                    className="w-4 h-4 cursor-pointer"
                    style={{ background: stop.color }}
                    onClick={handleCircleClick(index)}
                  />
                  
                  {/* Hex code */}
                  <span className="text-xs font-mono text-gray-800">
                    {stop.color.toUpperCase()}
                  </span>
                  
                  {/* Remove button - only show if more than 2 stops */}
                  {colorStops.length > 2 && (
                    <button
                      onClick={handleRemoveStop(index)}
                      className="text-gray-800 text-lg leading-none hover:opacity-70 transition-opacity"
                    >
                      −
                    </button>
                  )}
                </div>
                
                <input 
                  ref={(el) => { colorInputRefs.current[index] = el }}
                  type="color" 
                  value={stop.color}
                  onChange={(e) => handleColorChange(index, e.target.value)}
                  className="hidden"
                />
              </div>
            )
          })}
    </div>
  )
}

export default App
