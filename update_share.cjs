const fs = require('fs');
let code = fs.readFileSync('src/App.tsx', 'utf8');

// 1. Add ends?: EndScore[]; to MatchHistory
code = code.replace(
  "  p2EndsWon: number;\n};",
  "  p2EndsWon: number;\n  ends?: EndScore[];\n};"
);

// 2. Pass ends when saving to history
code = code.replace(
  "p2EndsWon,\n        };",
  "p2EndsWon,\n          ends,\n        };"
);

// 3. Update HistoryItem to take onShare
code = code.replace(
  "const HistoryItem: React.FC<{ match: MatchHistory, onDelete: () => void, onArchive: () => void }> = ({ match, onDelete, onArchive }) => {",
  "const HistoryItem: React.FC<{ match: MatchHistory, onDelete: () => void, onArchive: () => void, onShare: () => void }> = ({ match, onDelete, onArchive, onShare }) => {"
);

// Update HistoryItem nextX to -144
code = code.replace(
  "let nextX = isOpen ? -96 + dx : dx;",
  "let nextX = isOpen ? -144 + dx : dx;"
);

// Update HistoryItem background actions width and buttons
const newBgActions = `
      {/* Background Actions */}
      <div className="absolute inset-y-0 right-0 flex items-center pr-4 gap-2 bg-slate-100 w-full justify-end">
        <button onClick={() => { onShare(); setIsOpen(false); }} className="w-10 h-10 rounded-full bg-blue-100 text-blue-600 flex items-center justify-center hover:bg-blue-200 transition-colors">
          <Share2 className="w-5 h-5" />
        </button>
        <button onClick={onArchive} className="w-10 h-10 rounded-full bg-amber-100 text-amber-600 flex items-center justify-center hover:bg-amber-200 transition-colors">
          <Archive className="w-5 h-5" />
        </button>
        <button onClick={onDelete} className="w-10 h-10 rounded-full bg-red-100 text-red-600 flex items-center justify-center hover:bg-red-200 transition-colors">
          <Trash2 className="w-5 h-5" />
        </button>
      </div>
`;
code = code.replace(
  /\{\/\* Background Actions \*\/\}[^{]*<div className="absolute inset-y-0 right-0 flex items-center pr-4 gap-2 bg-slate-100 w-full justify-end">[\s\S]*?<\/div>/,
  newBgActions.trim()
);

// Update HistoryItem .open width
code = code.replace(
  /const isOpen = currentX.current < -60;/, // wait, where is it set?
  ""
); // I'll just leave this regex empty and do it explicitly if needed

// Add the match share function
const matchShareFn = `
  const handleShareMatchHistory = async (match: MatchHistory) => {
    let summaryText = \`LAWN BOWLS MATCH SUMMARY\\n\`;
    summaryText += \`\${new Date(match.date).toLocaleDateString()} - \${match.config.matchType === 'team' ? 'Team Match' : 'Singles Match'}\\n\`;
    summaryText += \`\${match.config.player1Name} vs \${match.config.player2Name}\\n\\n\`;
    summaryText += \`FINAL SCORE\\n\`;
    summaryText += \`\${match.config.player1Name}: \${match.p1Total} (\${match.p1EndsWon} ends)\\n\`;
    summaryText += \`\${match.config.player2Name}: \${match.p2Total} (\${match.p2EndsWon} ends)\\n\\n\`;

    if (match.ends) {
      summaryText += \`SCORECARD\\n\`;
      summaryText += \`End | \${match.config.player1Name} | \${match.config.player2Name}\\n\`;
      summaryText += \`----|\${'-'.repeat(match.config.player1Name.length + 2)}|\${'-'.repeat(match.config.player2Name.length + 2)}\\n\`;
      match.ends.forEach((end, i) => {
        const p1 = end.player1 !== '' ? end.player1 : '-';
        const p2 = end.player2 !== '' ? end.player2 : '-';
        summaryText += \`\${(i + 1).toString().padEnd(3)} | \${p1.toString().padEnd(match.config.player1Name.length)} | \${p2}\\n\`;
      });
    }

    if (navigator.share) {
      try {
        await navigator.share({
          title: 'Lawn Bowls Match Scorecard',
          text: summaryText,
        });
      } catch (err) {
        console.error('Error sharing:', err);
      }
    } else {
      try {
        await navigator.clipboard.writeText(summaryText);
        setCopySuccess(true);
        setTimeout(() => setCopySuccess(false), 2000);
      } catch (err) {
        console.error('Failed to copy text: ', err);
      }
    }
  };
`;

code = code.replace(
  "  const handleClearHistory = () => {",
  matchShareFn + "\n  const handleClearHistory = () => {"
);

// Update history mapping
code = code.replace(
  /<HistoryItem\s+key=\{match\.id\}\s+match=\{match\}\s+onDelete=\{[^}]+\}\s+onArchive=\{[^}]+\}\s+\/>/g,
  `<HistoryItem \n                    key={match.id} \n                    match={match} \n                    onDelete={() => setHistory(prev => prev.filter(m => m.id !== match.id))} \n                    onArchive={() => setHistory(prev => prev.filter(m => m.id !== match.id))} \n                    onShare={() => handleShareMatchHistory(match)}\n                  />`
);

// Add Share button to Summary Modal
const shareButtonSummaryModal = `
                <button 
                  onClick={handleShareScorecard}
                  data-cuelume-press={isMuted ? undefined : "chime"}
                  className="btn fx-10 w-full"
                  style={{ '--bink': '#0284c7', '--bsurf': '#f0f9ff', padding: '12px 16px' } as React.CSSProperties}
                >
                  <span className="btn-label flex w-full justify-center text-center items-center gap-2"><Share2 className="w-4 h-4" /> Share Match</span>
                </button>
`;
code = code.replace(
  /<button \s*onClick=\{\(\) => setShowSummaryModal\(false\)\}\s*data-cuelume-press=\{isMuted \? undefined : "chime"\}\s*className="btn fx-10 w-full"\s*style=\{\{ '--bink': '#059669', '--bsurf': '#ecfdf5', padding: '12px 16px' \} as React\.CSSProperties\}\s*>\s*<span className="btn-label flex w-full justify-center text-center">Review Scorecard<\/span>\s*<\/button>/,
  `$&` + "\n" + shareButtonSummaryModal
);

// Update FAB
const shareFAB = `
        {/* Share Match (Right) */}
        <div className="absolute transition-all duration-700 ease-[cubic-bezier(0.34,1.56,0.64,1)] scale-[0.4] opacity-0 peer-checked:opacity-100 peer-checked:scale-100 peer-checked:translate-x-20 peer-checked:-translate-y-0 delay-0 peer-checked:delay-[150ms]">
          <button onClick={() => { handleShareScorecard(); document.getElementById('fab-menu')?.click(); }} className="bg-white p-3 rounded-full shadow-lg border border-slate-200 text-blue-500 hover:text-blue-600 hover:scale-110 active:scale-95 transition-transform" title="Share Match">
            {copySuccess ? <Check className="w-5 h-5 text-blue-600" /> : <Share2 className="w-5 h-5" />}
          </button>
        </div>
`;
code = code.replace(
  /\{\/\* Export Match \(Upper Right\) \*\/\}/,
  shareFAB + "\n        {/* Export Match (Upper Right) */}"
);

fs.writeFileSync('src/App.tsx', code);
