const fs = require('fs');
let code = fs.readFileSync('src/App.tsx', 'utf8');

const settingsContent = `
                <h3 className="text-xl font-bold text-slate-800 flex items-center gap-2 mb-6">
                  <Settings className="w-5 h-5 text-primary-600" /> App Settings
                </h3>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                  <div>
                    <label className="block text-xs font-semibold text-slate-500 mb-2 uppercase tracking-wider">Sound Effects</label>
                    <label className="flex items-center gap-3 cursor-pointer w-max">
                      <div className={\`w-12 h-7 rounded-full p-1 transition-colors \${!isMuted ? 'bg-primary-500' : 'bg-slate-300'}\`}>
                        <div className={\`w-5 h-5 bg-white rounded-full transition-transform shadow-sm \${!isMuted ? 'translate-x-5' : 'translate-x-0'}\`} />
                      </div>
                      <span className="text-sm text-slate-700 font-medium">{!isMuted ? 'Enabled' : 'Muted'}</span>
                      <input type="checkbox" className="hidden" checked={!isMuted} onChange={() => setIsMuted(!isMuted)} />
                    </label>
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-slate-500 mb-2 uppercase tracking-wider">UI Color Theme</label>
                    <div className="flex flex-wrap gap-3">
                      {['emerald', 'blue', 'purple', 'rose', 'amber'].map(t => (
                        <button
                          key={t}
                          onClick={() => setTheme(t)}
                          className={\`w-10 h-10 rounded-full border-2 transition-transform hover:scale-110 \${theme === t ? 'border-slate-800 scale-110 shadow-md' : 'border-transparent shadow-sm'}\`}
                          style={{
                            backgroundColor: 
                              t === 'emerald' ? '#10b981' : 
                              t === 'blue' ? '#3b82f6' : 
                              t === 'purple' ? '#a855f7' : 
                              t === 'rose' ? '#f43f5e' : 
                              '#f59e0b'
                          }}
                        />
                      ))}
                    </div>
                  </div>
                </div>
`;

// Render modal at the end of the App, just before the FAB menu or history modal
const settingsModal = `
      {showSettings && config && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center bg-slate-900/40 backdrop-blur-sm p-4">
          <div className="bg-white rounded-3xl shadow-xl w-full max-w-md p-6 sm:p-8 animate-in fade-in zoom-in duration-300 relative">
            <button 
              onClick={() => setShowSettings(false)}
              className="absolute top-6 right-6 text-slate-400 hover:text-slate-600 transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
            ${settingsContent}
            <div className="mt-8 flex justify-end">
              <button onClick={() => setShowSettings(false)} className="btn fx-10" style={{ '--bink': '#64748b', '--bsurf': '#f8fafc', padding: '10px 24px' } as React.CSSProperties}>
                <span className="btn-label">Done</span>
              </button>
            </div>
          </div>
        </div>
      )}
`;

code = code.replace(
  /\{showSummaryModal && \(/,
  settingsModal.trim() + "\\n      {showSummaryModal && ("
);

// We should also replace the inline settings panel to look similar but inline, or just keep what it is.
// I'll update the inline one slightly to match.
const inlineSettings = `
            {showSettings && !config && (
              <div className="bg-slate-50 rounded-xl p-4 mb-6 border border-slate-200 animate-in fade-in slide-in-from-top-2">
                <h3 className="text-sm font-bold text-slate-700 mb-4">App Settings</h3>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                  <div>
                    <label className="block text-xs font-semibold text-slate-500 mb-2 uppercase tracking-wider">Sound Effects</label>
                    <label className="flex items-center gap-3 cursor-pointer w-max">
                      <div className={\`w-10 h-6 rounded-full p-1 transition-colors \${!isMuted ? 'bg-primary-500' : 'bg-slate-300'}\`}>
                        <div className={\`w-4 h-4 bg-white rounded-full transition-transform \${!isMuted ? 'translate-x-4' : 'translate-x-0'}\`} />
                      </div>
                      <span className="text-sm text-slate-700 font-medium">{!isMuted ? 'Enabled' : 'Muted'}</span>
                      <input type="checkbox" className="hidden" checked={!isMuted} onChange={() => setIsMuted(!isMuted)} />
                    </label>
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-slate-500 mb-2 uppercase tracking-wider">UI Color Theme</label>
                    <div className="flex flex-wrap gap-2">
                      {['emerald', 'blue', 'purple', 'rose', 'amber'].map(t => (
                        <button
                          key={t}
                          onClick={() => setTheme(t)}
                          className={\`w-8 h-8 rounded-full border-2 transition-transform hover:scale-110 \${theme === t ? 'border-slate-800 scale-110' : 'border-transparent'}\`}
                          style={{
                            backgroundColor: 
                              t === 'emerald' ? '#10b981' : 
                              t === 'blue' ? '#3b82f6' : 
                              t === 'purple' ? '#a855f7' : 
                              t === 'rose' ? '#f43f5e' : 
                              '#f59e0b'
                          }}
                        />
                      ))}
                    </div>
                  </div>
                </div>
              </div>
            )}
`;

code = code.replace(
  /\{showSettings && \([\s\S]*?<\/div>\s*<\/div>\s*\)\}/,
  inlineSettings.trim()
);

fs.writeFileSync('src/App.tsx', code);
