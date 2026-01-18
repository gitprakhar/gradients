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
  // Two values: [startPosition, endPosition] as percentages (0-100)
  const [colorStops, setColorStops] = useState([0, 100])
  const [dragging, setDragging] = useState<number | null>(null)
  const sliderRef = useRef<HTMLDivElement>(null)
  
  const [startColor, setStartColor] = useState('#000518')
  const [endColor, setEndColor] = useState('#63B4E7')
  
  const startColorInputRef = useRef<HTMLInputElement>(null)
  const endColorInputRef = useRef<HTMLInputElement>(null)

  const handleMouseDown = (index: number) => (e: React.MouseEvent) => {
    e.preventDefault()
    setDragging(index)
  }
  
  const handleColorClick = (index: number) => (e: React.MouseEvent) => {
    e.stopPropagation()
    if (index === 0) {
      startColorInputRef.current?.click()
    } else {
      endColorInputRef.current?.click()
    }
  }

  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      if (dragging === null || !sliderRef.current) return

      const rect = sliderRef.current.getBoundingClientRect()
      const y = e.clientY - rect.top
      const percentage = Math.max(0, Math.min(100, (y / rect.height) * 100))

      const newStops = [...colorStops]
      newStops[dragging] = Math.round(percentage)
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
    
    // Create gradient with adjustable color stops
    const gradient = ctx.createLinearGradient(0, 0, 0, canvas.height);
    gradient.addColorStop(colorStops[0] / 100, startColor);
    gradient.addColorStop(colorStops[1] / 100, endColor);
    
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
    const code = `background: linear-gradient(to bottom, ${startColor} ${colorStops[0]}%, ${endColor} ${colorStops[1]}%);`;
    navigator.clipboard.writeText(code);
  };

  return (
    <ContextMenu>
      <ContextMenuTrigger asChild>
        <div 
          className="w-screen h-screen relative" 
          style={{
            background: `linear-gradient(to bottom, ${startColor} ${colorStops[0]}%, ${endColor} ${colorStops[1]}%)`
          }}
        >
          {/* Bottom center text */}
          <div className="absolute bottom-8 left-1/2 -translate-x-1/2 text-white text-xs font-sans">
            right click to download
          </div>

          {/* Vertical custom slider with two handles */}
          <div className="absolute left-8 top-8">
            <div 
              ref={sliderRef}
              className="relative w-px bg-white rounded-full cursor-pointer"
              style={{ height: 'calc(100vh - 4rem)' }}
            >
              {/* Track filled between the two dots */}
              <div 
                className="absolute w-full bg-white rounded-full"
                style={{
                  top: `${Math.min(colorStops[0], colorStops[1])}%`,
                  height: `${Math.abs(colorStops[1] - colorStops[0])}%`
                }}
              />
              
              {/* First dot (start color) */}
              <div
                className="absolute w-5 h-5 -left-2 cursor-pointer shadow-lg border-2 border-white"
                style={{ 
                  top: `${colorStops[0]}%`, 
                  transform: 'translateY(-50%)',
                  background: startColor
                }}
                onMouseDown={handleMouseDown(0)}
                onClick={handleColorClick(0)}
              />
              <input 
                ref={startColorInputRef}
                type="color" 
                value={startColor}
                onChange={(e) => setStartColor(e.target.value)}
                className="hidden"
              />
              
              {/* Second dot (end color) */}
              <div
                className="absolute w-5 h-5 -left-2 cursor-pointer shadow-lg border-2 border-white"
                style={{ 
                  top: `${colorStops[1]}%`, 
                  transform: 'translateY(-50%)',
                  background: endColor
                }}
                onMouseDown={handleMouseDown(1)}
                onClick={handleColorClick(1)}
              />
              <input 
                ref={endColorInputRef}
                type="color" 
                value={endColor}
                onChange={(e) => setEndColor(e.target.value)}
                className="hidden"
              />
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
