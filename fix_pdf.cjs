const fs = require('fs');
let code = fs.readFileSync('src/App.tsx', 'utf8');

// replace handleExportScorecard usages
code = code.replace(/handleExportScorecard\(\)/g, 'handleShareScorecard()');

// rewrite handleShareMatchHistory to use pdf
const newShareMatchHistory = `
  const handleShareMatchHistory = async (match: MatchHistory) => {
    const doc = new jsPDF();
    const isTeam = match.config.matchType === 'team';
    
    // Title
    doc.setFontSize(20);
    doc.text('Lawn Bowls Match Scorecard', 14, 22);
    
    // Match Info
    doc.setFontSize(12);
    doc.text(\`Date: \${new Date(match.date).toLocaleDateString()}\`, 14, 32);
    doc.text(\`Type: \${isTeam ? 'Team Match' : 'Singles Match'}\`, 14, 40);
    doc.text(\`Match: \${match.config.player1Name} vs \${match.config.player2Name}\`, 14, 48);
    
    // Scores
    let p1Total = 0;
    let p2Total = 0;
    let p1EndsWon = 0;
    let p2EndsWon = 0;
    const tableData: any[] = [];
    
    if (match.ends) {
      match.ends.forEach((end, i) => {
        const p1Score = Number(end.player1) || 0;
        const p2Score = Number(end.player2) || 0;
        p1Total += p1Score;
        p2Total += p2Score;
        if (p1Score > p2Score) p1EndsWon++;
        if (p2Score > p1Score) p2EndsWon++;
        
        tableData.push([
          i + 1,
          end.player1 !== '' ? end.player1 : '-',
          end.player2 !== '' ? end.player2 : '-',
          p1Total,
          p2Total
        ]);
      });
      
      autoTable(doc, {
        startY: 55,
        head: [['End', match.config.player1Name, match.config.player2Name, \`Total (\${match.config.player1Name})\`, \`Total (\${match.config.player2Name})\`]],
        body: tableData,
        theme: 'striped',
        headStyles: { fillColor: [14, 165, 233] }
      });
    }
    
    // Final Summary
    const finalY = (doc as any).lastAutoTable ? (doc as any).lastAutoTable.finalY + 10 : 65;
    doc.setFontSize(14);
    doc.text('Final Result', 14, finalY);
    doc.setFontSize(12);
    doc.text(\`\${match.config.player1Name}: \${match.p1Total} (\${match.p1EndsWon} ends)\`, 14, finalY + 10);
    doc.text(\`\${match.config.player2Name}: \${match.p2Total} (\${match.p2EndsWon} ends)\`, 14, finalY + 18);
    
    doc.save(\`LawnBowls_Match_\${new Date(match.date).toISOString().split('T')[0]}.pdf\`);
  };
`;

code = code.replace(/const handleShareMatchHistory = async \(match: MatchHistory\) => \{[\s\S]*?  \};/m, newShareMatchHistory.trim());

// update FAB icon
code = code.replace(
  /\{copySuccess \? <Check className="w-5 h-5 text-primary-600" \/> : <Copy className="w-5 h-5" \/>\}/g,
  `<Download className="w-5 h-5" />`
);

fs.writeFileSync('src/App.tsx', code);
