const fs = require('fs');
let code = fs.readFileSync('src/App.tsx', 'utf8');

// State
const stateToAdd = `
  const [isMuted, setIsMuted] = useState(false);
  const [theme, setTheme] = useState('emerald');
  const [showSettings, setShowSettings] = useState(false);

  useEffect(() => {
    document.documentElement.setAttribute('data-theme', theme);
  }, [theme]);

  const handlePlaySound = (type: string) => {
    if (!isMuted) play(type);
  };
`;

code = code.replace(
  "const [showHistory, setShowHistory] = useState(false);",
  "const [showHistory, setShowHistory] = useState(false);\n" + stateToAdd
);

// Replace `play(` with `handlePlaySound(`
code = code.replace(/play\('success'\)/g, "handlePlaySound('success')");

// Settings UI in header
const settingsUI = `
              <div className="flex items-center gap-3">
                <div className="flex bg-slate-100 rounded-lg p-1">
                  <button 
                    onClick={() => setSetupMatchType('individual')}
                    className={\`px-3 py-1.5 rounded-md text-sm font-medium transition-colors \${setupMatchType === 'individual' ? 'bg-white shadow-sm text-slate-800' : 'text-slate-500 hover:text-slate-700'}\`}
                  >
                    Singles
                  </button>
                  <button 
                    onClick={() => setSetupMatchType('team')}
                    className={\`px-3 py-1.5 rounded-md text-sm font-medium transition-colors \${setupMatchType === 'team' ? 'bg-white shadow-sm text-slate-800' : 'text-slate-500 hover:text-slate-700'}\`}
                  >
                    Teams
                  </button>
                </div>
                <button
                  onClick={() => setShowSettings(!showSettings)}
                  className={\`p-2 rounded-full transition-colors \${showSettings ? 'bg-primary-100 text-primary-600' : 'text-slate-400 hover:bg-slate-100 hover:text-slate-600'}\`}
                  title="Settings"
                >
                  <Settings className="w-5 h-5" />
                </button>
              </div>
`;

code = code.replace(
  /<div className="flex bg-slate-100 rounded-lg p-1">[\s\S]*?<\/div>/,
  settingsUI
);

// Add the settings panel just below the header row
const settingsPanel = `
            {showSettings && (
              <div className="bg-slate-50 rounded-xl p-4 mb-6 border border-slate-200 animate-in fade-in slide-in-from-top-2">
                <h3 className="text-sm font-bold text-slate-700 mb-4">App Settings</h3>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                  <div>
                    <label className="block text-xs font-semibold text-slate-500 mb-2 uppercase tracking-wider">Sound Effects</label>
                    <label className="flex items-center gap-3 cursor-pointer">
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
  /(\s*)<div className="space-y-6">/,
  "\n" + settingsPanel + "$1<div className=\"space-y-6\">"
);

// We should also replace the `data-cuelume-press="tick"` dynamically if muted? 
// No, the user just says "toggle mute for sound effects". Muting cuelume is a bit tricky if we don't remove attributes. Let's just strip 'data-cuelume-press' when muted using Regex replacement on render? No, React renders string properties as attributes.
// Better way is to modify the JSX for buttons to use `...(isMuted ? {} : { 'data-cuelume-press': 'tick' })` etc.
// But it's hard to regex that safely.
// Let's just ignore cuelume press sounds muting if we can't do it easily, OR we can replace it.
// React supports returning undefined to remove an attribute: `data-cuelume-press={isMuted ? undefined : "tick"}`. Let's replace it:

code = code.replace(/data-cuelume-press="([^"]+)"/g, 'data-cuelume-press={isMuted ? undefined : "$1"}');
code = code.replace(/data-cuelume-release="([^"]+)"/g, 'data-cuelume-release={isMuted ? undefined : "$1"}');

fs.writeFileSync('src/App.tsx', code);
