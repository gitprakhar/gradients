import {
  ContextMenu,
  ContextMenuContent,
  ContextMenuItem,
  ContextMenuSeparator,
  ContextMenuTrigger,
} from "@/components/ui/context-menu"

export function App() {
  const handleDownload = () => {
    // Create a canvas with 16:9 aspect ratio
    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d');
    
    if (!ctx) return;
    
    // Set canvas size to 1920x1080 (16:9)
    canvas.width = 1920;
    canvas.height = 1080;
    
    // Create gradient
    const gradient = ctx.createLinearGradient(0, 0, 0, canvas.height);
    gradient.addColorStop(0, '#000518');
    gradient.addColorStop(1, '#63B4E7');
    
    // Fill canvas with gradient
    ctx.fillStyle = gradient;
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    
    // Convert canvas to blob and download
    canvas.toBlob((blob) => {
      if (blob) {
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = 'gradient.png';
        a.click();
        URL.revokeObjectURL(url);
      }
    });
  };

  const handleCopyCode = () => {
    const code = `background: linear-gradient(to bottom, #000518, #63B4E7);`;
    navigator.clipboard.writeText(code);
  };

  return (
    <ContextMenu>
      <ContextMenuTrigger asChild>
        <div 
          className="w-screen h-screen relative" 
          style={{
            background: 'linear-gradient(to bottom, #000518, #63B4E7)'
          }}
        >
          <div className="absolute top-8 left-8 text-white text-xs font-sans leading-relaxed">
            <div>generate gradients and download them</div>
            <div>or copy their code</div>
          </div>
        </div>
      </ContextMenuTrigger>
      <ContextMenuContent>
        <ContextMenuItem onClick={handleDownload}>
          Download Gradient
        </ContextMenuItem>
        <ContextMenuSeparator />
        <ContextMenuItem onClick={handleCopyCode}>
          Copy CSS Code
        </ContextMenuItem>
      </ContextMenuContent>
    </ContextMenu>
  )
}

export default App
