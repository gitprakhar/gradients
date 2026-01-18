import { useState, useRef, useEffect } from 'react'
import {
  ContextMenu,
  ContextMenuContent,
  ContextMenuItem,
  ContextMenuSeparator,
  ContextMenuSub,
  ContextMenuSubContent,
  ContextMenuSubTrigger,
  ContextMenuTrigger,
} from "@/components/ui/context-menu"

// Create a plus cursor using SVG data URL
const plusCursor = `data:image/svg+xml;base64,${btoa(`
  <svg width="24" height="24" xmlns="http://www.w3.org/2000/svg">
    <line x1="12" y1="4" x2="12" y2="20" stroke="white" stroke-width="2" stroke-linecap="round"/>
    <line x1="4" y1="12" x2="20" y2="12" stroke="white" stroke-width="2" stroke-linecap="round"/>
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
  const pageRef = useRef<HTMLDivElement>(null)
  const colorInputRefs = useRef<(HTMLInputElement | null)[]>([])
  const hasDraggedRef = useRef<boolean>(false)
  const inputRef = useRef<HTMLInputElement>(null)
  const measureRef = useRef<HTMLSpanElement>(null)
  
  // Measure input width based on current value
  useEffect(() => {
    if (measureRef.current && inputRef.current) {
      const textToMeasure = inputValue || 'generate a gradient'
      measureRef.current.textContent = textToMeasure
      const width = measureRef.current.offsetWidth
      inputRef.current.style.width = `${width}px`
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

  const handleCopyCode = () => {
    const sortedStops = [...colorStops].sort((a, b) => a.position - b.position)
    const stopsString = sortedStops.map(s => `${s.color} ${s.position}%`).join(', ')
    const code = `background: linear-gradient(to bottom, ${stopsString});`;
    navigator.clipboard.writeText(code);
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
    <ContextMenu>
      <ContextMenuTrigger asChild>
        <div 
          ref={pageRef}
          className="w-screen h-screen relative" 
          style={{
            background: gradientString(),
            cursor: showPlusCursor ? `url("${plusCursor}") 12 12, crosshair` : 'default'
          }}
          onClick={handleLineClick}
          onMouseMove={handlePageMouseMove}
          onMouseLeave={() => setShowPlusCursor(false)}
        >
          {/* Top left text input */}
          <div className="absolute top-8 left-8 inline-block">
            <span
              ref={measureRef}
              className="absolute invisible whitespace-pre text-xs font-sans"
              style={{ visibility: 'hidden', position: 'absolute' }}
            >
              Generate a custom gradient
            </span>
            <input
              ref={inputRef}
              type="text"
              placeholder="generate a gradient"
              value={inputValue}
              onChange={(e) => setInputValue(e.target.value)}
              className="bg-transparent border-b border-white outline-none text-white text-xs font-sans placeholder:text-white focus:placeholder:text-white pb-0.5"
              onClick={(e) => e.stopPropagation()}
              onMouseDown={(e) => e.stopPropagation()}
            />
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
                className="absolute left-1/2 -translate-x-1/2 z-10 flex items-center gap-2"
                style={{ 
                  ...(isBottom 
                    ? { bottom: `${BOTTOM_MARGIN}px` }
                    : { top: `${topPx}px` }
                  ),
                }}
              >
                <div 
                  className="flex items-center gap-1.5 bg-white/80 backdrop-blur-xl px-2 py-1 shadow-lg cursor-grab active:cursor-grabbing"
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
                </div>
                
                {/* Remove button - only show if more than 2 stops */}
                {colorStops.length > 2 && (
                  <button
                    onClick={handleRemoveStop(index)}
                    className="text-white text-lg leading-none hover:opacity-70 transition-opacity"
                  >
                    −
                  </button>
                )}
                
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
      </ContextMenuTrigger>
      <ContextMenuContent className="min-w-[220px]">
        <ContextMenuSub>
          <ContextMenuSubTrigger>Download Gradient</ContextMenuSubTrigger>
          <ContextMenuSubContent>
            <ContextMenuItem onClick={() => handleDownload(1920, 1080, '16-9')}>
              16:9 (1920x1080)
            </ContextMenuItem>
            <ContextMenuItem onClick={() => handleDownload(1600, 900, '16-9-small')}>
              16:9 (1600x900)
            </ContextMenuItem>
            <ContextMenuItem onClick={() => handleDownload(1920, 1440, '4-3')}>
              4:3 (1920x1440)
            </ContextMenuItem>
            <ContextMenuItem onClick={() => handleDownload(1080, 1080, '1-1')}>
              1:1 (1080x1080)
            </ContextMenuItem>
            <ContextMenuItem onClick={() => handleDownload(2560, 1080, '21-9')}>
              21:9 (2560x1080)
            </ContextMenuItem>
            <ContextMenuItem onClick={() => handleDownload(1080, 1920, '9-16')}>
              9:16 (1080x1920)
            </ContextMenuItem>
          </ContextMenuSubContent>
        </ContextMenuSub>
        <ContextMenuSeparator />
        <ContextMenuItem onClick={handleCopyCode}>
          Copy CSS Code
        </ContextMenuItem>
      </ContextMenuContent>
    </ContextMenu>
  )
}

export default App
