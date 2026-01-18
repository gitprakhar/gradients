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

  return (
    <div 
      className="w-screen h-screen relative flex items-end justify-center pb-8" 
      style={{
        background: 'linear-gradient(to bottom, #000518, #63B4E7)'
      }}
    >
      <div className="flex gap-4">
        <button 
          onClick={handleDownload}
          className="w-12 h-12 rounded-full flex items-center justify-center backdrop-blur-md bg-white/20 border border-white/30 hover:bg-white/30 transition-all"
          aria-label="Download"
        >
          <svg 
            xmlns="http://www.w3.org/2000/svg" 
            width="20" 
            height="20" 
            viewBox="0 0 24 24" 
            fill="none" 
            stroke="currentColor" 
            strokeWidth="2" 
            strokeLinecap="round" 
            strokeLinejoin="round"
            className="text-white"
          >
            <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
            <polyline points="7 10 12 15 17 10" />
            <line x1="12" y1="15" x2="12" y2="3" />
          </svg>
        </button>
        
        <button 
          className="w-12 h-12 rounded-full flex items-center justify-center backdrop-blur-md bg-white/20 border border-white/30 hover:bg-white/30 transition-all"
          aria-label="Code"
        >
          <svg 
            xmlns="http://www.w3.org/2000/svg" 
            width="20" 
            height="20" 
            viewBox="0 0 24 24" 
            fill="none" 
            stroke="currentColor" 
            strokeWidth="2" 
            strokeLinecap="round" 
            strokeLinejoin="round"
            className="text-white"
          >
            <polyline points="16 18 22 12 16 6" />
            <polyline points="8 6 2 12 8 18" />
          </svg>
        </button>
      </div>
    </div>
  )
}

export default App
