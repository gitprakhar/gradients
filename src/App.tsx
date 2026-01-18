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

export function App() {
  // Array of color stops: { position: 0-100, color: string }
  const [colorStops, setColorStops] = useState([
    { position: 0, color: '#000518' },
    { position: 100, color: '#63B4E7' }
  ])
  const [dragging, setDragging] = useState<number | null>(null)
  const sliderRef = useRef<HTMLDivElement>(null)
  const colorInputRefs = useRef<(HTMLInputElement | null)[]>([])

  const handleMouseDown = (index: number) => (e: React.MouseEvent) => {
    e.preventDefault()
    e.stopPropagation()
    setDragging(index)
  }
  
  const handleColorClick = (index: number) => (e: React.MouseEvent) => {
    e.stopPropagation()
    colorInputRefs.current[index]?.click()
  }

  const handleLineClick = (e: React.MouseEvent) => {
    if (!sliderRef.current || dragging !== null) return
    
    const rect = sliderRef.current.getBoundingClientRect()
    const y = e.clientY - rect.top
    const percentage = Math.max(0, Math.min(100, (y / rect.height) * 100))
    
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

  const handleRemoveStop = (index: number) => (e: React.MouseEvent) => {
    e.stopPropagation()
    // Keep at least 2 stops
    if (colorStops.length <= 2) return
    
    const newStops = colorStops.filter((_, i) => i !== index)
    setColorStops(newStops)
  }

  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      if (dragging === null || !sliderRef.current) return

      const rect = sliderRef.current.getBoundingClientRect()
      const y = e.clientY - rect.top
      const percentage = Math.max(0, Math.min(100, (y / rect.height) * 100))

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

  return (
    <ContextMenu>
      <ContextMenuTrigger asChild>
        <div 
          className="w-screen h-screen relative" 
          style={{
            background: gradientString()
          }}
        >
          {/* Bottom center text */}
          <div className="absolute bottom-8 left-1/2 -translate-x-1/2 text-white text-xs font-sans">
            right click to download
          </div>

          {/* Vertical custom slider with multiple handles */}
          <div className="absolute left-8 top-8">
            <div 
              ref={sliderRef}
              className="relative w-px h-64 bg-white rounded-full cursor-pointer"
              style={{ height: 'calc(100vh - 4rem)' }}
              onClick={handleLineClick}
            >
              {/* Render all color stop squares */}
              {colorStops.map((stop, index) => (
                <div key={index} className="absolute" style={{ top: `${stop.position}%`, transform: 'translateY(-50%)' }}>
                  <div className="flex items-center gap-2">
                    {/* Color square */}
                    <div
                      className="w-5 h-5 -ml-2 cursor-pointer shadow-lg border-2 border-white"
                      style={{ 
                        background: stop.color
                      }}
                      onMouseDown={handleMouseDown(index)}
                      onClick={handleColorClick(index)}
                    />
                    
                    {/* Remove button - only show if more than 2 stops */}
                    {colorStops.length > 2 && (
                      <button
                        onClick={handleRemoveStop(index)}
                        className="w-4 h-4 flex items-center justify-center bg-white rounded-full text-gray-800 text-xs hover:bg-red-500 hover:text-white transition-colors"
                      >
                        −
                      </button>
                    )}
                  </div>
                  
                  <input 
                    ref={(el) => colorInputRefs.current[index] = el}
                    type="color" 
                    value={stop.color}
                    onChange={(e) => handleColorChange(index, e.target.value)}
                    className="hidden"
                  />
                </div>
              ))}
            </div>
          </div>
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
