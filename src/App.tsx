export function App() {
  return (
    <div 
      className="w-screen h-screen relative flex items-end justify-center pb-8" 
      style={{
        background: 'linear-gradient(to bottom, #000518, #63B4E7)'
      }}
    >
      <div className="flex gap-4">
        <button 
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
