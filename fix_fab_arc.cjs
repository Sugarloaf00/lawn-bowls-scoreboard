const fs = require('fs');
let code = fs.readFileSync('src/App.tsx', 'utf8');

const newFabMenu = `
      <div className="fixed bottom-8 right-12 md:right-16 z-50 flex items-center justify-center">
        <input type="checkbox" id="fab-menu" className="peer hidden" />
        
        {/* Item 1: Finish Match (Top) */}
        <div className="absolute transition-all duration-700 ease-[cubic-bezier(0.34,1.56,0.64,1)] scale-[0.4] opacity-0 peer-checked:opacity-100 peer-checked:scale-100 peer-checked:-translate-y-[120px] peer-checked:translate-x-0 delay-[250ms] peer-checked:delay-[0ms]">
          <button onClick={() => { 
            setShowSummaryModal(true); 
            handlePlaySound('success');
            confetti({
              particleCount: 150,
              spread: 70,
              origin: { y: 0.6 },
              colors: ['#059669', '#34d399', '#fcd34d', '#fbbf24']
            });
            document.getElementById('fab-menu')?.click(); 
          }} className="bg-white p-3 rounded-full shadow-lg border border-slate-200 text-primary-600 hover:text-primary-700 hover:scale-110 active:scale-95 transition-transform" title="Finish Match">
            <Trophy className="w-5 h-5" />
          </button>
        </div>

        {/* Item 2: Settings */}
        <div className="absolute transition-all duration-700 ease-[cubic-bezier(0.34,1.56,0.64,1)] scale-[0.4] opacity-0 peer-checked:opacity-100 peer-checked:scale-100 peer-checked:-translate-y-[114px] peer-checked:-translate-x-[37px] delay-[200ms] peer-checked:delay-[50ms]">
          <button onClick={() => { setShowSettings(true); document.getElementById('fab-menu')?.click(); }} className="bg-white p-3 rounded-full shadow-lg border border-slate-200 text-slate-700 hover:text-primary-600 hover:scale-110 active:scale-95 transition-transform" title="Settings">
            <Settings className="w-5 h-5" />
          </button>
        </div>

        {/* Item 3: Share */}
        <div className="absolute transition-all duration-700 ease-[cubic-bezier(0.34,1.56,0.64,1)] scale-[0.4] opacity-0 peer-checked:opacity-100 peer-checked:scale-100 peer-checked:-translate-y-[97px] peer-checked:-translate-x-[70px] delay-[150ms] peer-checked:delay-[100ms]">
          <button onClick={() => { handleShareScorecard(); document.getElementById('fab-menu')?.click(); }} className="bg-white p-3 rounded-full shadow-lg border border-slate-200 text-blue-500 hover:text-blue-600 hover:scale-110 active:scale-95 transition-transform" title="Share Match">
            {copySuccess ? <Check className="w-5 h-5 text-blue-600" /> : <Share2 className="w-5 h-5" />}
          </button>
        </div>

        {/* Item 4: Export */}
        <div className="absolute transition-all duration-700 ease-[cubic-bezier(0.34,1.56,0.64,1)] scale-[0.4] opacity-0 peer-checked:opacity-100 peer-checked:scale-100 peer-checked:-translate-y-[70px] peer-checked:-translate-x-[97px] delay-[100ms] peer-checked:delay-[150ms]">
          <button onClick={() => { handleExportScorecard(); document.getElementById('fab-menu')?.click(); }} className="bg-white p-3 rounded-full shadow-lg border border-slate-200 text-slate-700 hover:text-primary-600 hover:scale-110 active:scale-95 transition-transform" title="Export Match">
            {copySuccess ? <Check className="w-5 h-5 text-primary-600" /> : <Copy className="w-5 h-5" />}
          </button>
        </div>

        {/* Item 5: View History */}
        <div className="absolute transition-all duration-700 ease-[cubic-bezier(0.34,1.56,0.64,1)] scale-[0.4] opacity-0 peer-checked:opacity-100 peer-checked:scale-100 peer-checked:-translate-y-[37px] peer-checked:-translate-x-[114px] delay-[50ms] peer-checked:delay-[200ms]">
          <button onClick={() => { setShowHistory(true); document.getElementById('fab-menu')?.click(); }} className="bg-white p-3 rounded-full shadow-lg border border-slate-200 text-slate-700 hover:text-primary-600 hover:scale-110 active:scale-95 transition-transform" title="View History">
            <BookOpen className="w-5 h-5" />
          </button>
        </div>

        {/* Item 6: Clear All Scores (Left) */}
        <div className="absolute transition-all duration-700 ease-[cubic-bezier(0.34,1.56,0.64,1)] scale-[0.4] opacity-0 peer-checked:opacity-100 peer-checked:scale-100 peer-checked:-translate-y-0 peer-checked:-translate-x-[120px] delay-[0ms] peer-checked:delay-[250ms]">
          <button onClick={() => { handleReset(); document.getElementById('fab-menu')?.click(); }} className="bg-white p-3 rounded-full shadow-lg border border-slate-200 text-red-500 hover:text-red-600 hover:scale-110 active:scale-95 transition-transform" title="Clear All Scores">
            <Trash2 className="w-5 h-5" />
          </button>
        </div>

        <label htmlFor="fab-menu" className="peer-checked:rotate-45 relative z-10 flex items-center justify-center w-14 h-14 bg-primary-600 text-white rounded-full cursor-pointer shadow-xl transition-transform duration-700 ease-[cubic-bezier(0.34,1.56,0.64,1)] hover:scale-105 active:scale-95">
          <Plus className="w-6 h-6" />
        </label>
      </div>
`;

code = code.replace(
  /<div className="fixed bottom-8 right-8 md:right-12 z-50 flex items-center justify-center">[\s\S]*?<\/label>\s*<\/div>/,
  newFabMenu.trim()
);

fs.writeFileSync('src/App.tsx', code);
