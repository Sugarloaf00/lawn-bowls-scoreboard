const fs = require('fs');
let code = fs.readFileSync('src/App.tsx', 'utf8');

const generateSummaryText = `
  const generateSummaryText = () => {
    if (!config) return "";
    let summaryText = \`LAWN BOWLS MATCH SUMMARY\\n\`;
    summaryText += \`\${new Date().toLocaleDateString()} - \${config.matchType === 'team' ? 'Team Match' : 'Singles Match'}\\n\`;
    summaryText += \`\${config.player1Name} vs \${config.player2Name}\\n\\n\`;
    
    const p1TotalExport = ends.reduce((sum, end) => sum + (Number(end.player1) || 0), 0);
    const p2TotalExport = ends.reduce((sum, end) => sum + (Number(end.player2) || 0), 0);
    const p1EndsWonExport = ends.filter(end => (Number(end.player1) || 0) > (Number(end.player2) || 0)).length;
    const p2EndsWonExport = ends.filter(end => (Number(end.player2) || 0) > (Number(end.player1) || 0)).length;

    summaryText += \`FINAL SCORE\\n\`;
    summaryText += \`\${config.player1Name}: \${p1TotalExport} (\${p1EndsWonExport} ends)\\n\`;
    summaryText += \`\${config.player2Name}: \${p2TotalExport} (\${p2EndsWonExport} ends)\\n\\n\`;

    summaryText += \`SCORECARD\\n\`;
    summaryText += \`End | \${config.player1Name} | \${config.player2Name}\\n\`;
    summaryText += \`----|\${'-'.repeat(config.player1Name.length + 2)}|\${'-'.repeat(config.player2Name.length + 2)}\\n\`;
    
    ends.forEach((end, i) => {
      const p1 = end.player1 !== '' ? end.player1 : '-';
      const p2 = end.player2 !== '' ? end.player2 : '-';
      summaryText += \`\${(i + 1).toString().padEnd(3)} | \${p1.toString().padEnd(config.player1Name.length)} | \${p2}\\n\`;
    });
    return summaryText;
  };

  const handleShareScorecard = async () => {
    const text = generateSummaryText();
    if (!text) return;
    if (navigator.share) {
      try {
        await navigator.share({
          title: 'Lawn Bowls Match Scorecard',
          text: text,
        });
      } catch (err) {
        console.error('Error sharing:', err);
      }
    } else {
      // Fallback to clipboard
      handleExportScorecard();
    }
  };
`;

code = code.replace(
  "  const handleExportScorecard = async () => {",
  generateSummaryText + "\n  const handleExportScorecard = async () => {\n    const summaryText = generateSummaryText();\n    if (!summaryText) return;\n"
);

// Remove the old summaryText generation inside handleExportScorecard
code = code.replace(/if \(\!config\) return;\s*let summaryText = `LAWN BOWLS MATCH SUMMARY\\n`;[\s\S]*?ends\.forEach\(\(end, i\) => {[\s\S]*?}\);/g, "");

fs.writeFileSync('src/App.tsx', code);
