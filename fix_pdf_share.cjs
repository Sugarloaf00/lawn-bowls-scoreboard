const fs = require('fs');
let code = fs.readFileSync('src/App.tsx', 'utf8');

const importStatement = `import { jsPDF } from 'jspdf';\nimport autoTable from 'jspdf-autotable';`;
code = code.replace("import React, { useState, useEffect, useRef } from 'react';", "import React, { useState, useEffect, useRef } from 'react';\n" + importStatement);

const newShareMatchLogic = `
  const handleShareScorecard = () => {
    if (!config) return;
    const doc = new jsPDF();
    const isTeam = config.matchType === 'team';
    
    // Title
    doc.setFontSize(20);
    doc.text('Lawn Bowls Match Scorecard', 14, 22);
    
    // Match Info
    doc.setFontSize(12);
    doc.text(\`Date: \${new Date().toLocaleDateString()}\`, 14, 32);
    doc.text(\`Type: \${isTeam ? 'Team Match' : 'Singles Match'}\`, 14, 40);
    doc.text(\`Match: \${config.player1Name} vs \${config.player2Name}\`, 14, 48);
    
    // Scores
    let p1Total = 0;
    let p2Total = 0;
    let p1EndsWon = 0;
    let p2EndsWon = 0;
    const tableData = [];
    
    ends.forEach((end, i) => {
      const p1 = end.player1 === '' ? 0 : Number(end.player1);
      const p2 = end.player2 === '' ? 0 : Number(end.player2);
      p1Total += p1;
      p2Total += p2;
      if (p1 > p2) p1EndsWon++;
      if (p2 > p1) p2EndsWon++;
      
      tableData.push([
        (i + 1).toString(),
        p1.toString(),
        p2.toString()
      ]);
    });
    
    doc.setFontSize(14);
    doc.text('Final Score', 14, 60);
    doc.setFontSize(12);
    doc.text(\`\${config.player1Name}: \${p1Total} (\${p1EndsWon} ends)\`, 14, 68);
    doc.text(\`\${config.player2Name}: \${p2Total} (\${p2EndsWon} ends)\`, 14, 76);
    
    autoTable(doc, {
      startY: 85,
      head: [['End', config.player1Name, config.player2Name]],
      body: tableData,
      theme: 'grid',
      headStyles: { fillColor: [5, 150, 105] }
    });
    
    doc.save(\`LawnBowls_Scorecard_\${new Date().toISOString().split('T')[0]}.pdf\`);
  };
`;

code = code.replace(/const handleShareScorecard = async \(\) => \{[\s\S]*?  \};/, newShareMatchLogic.trim());

const historyPdfExport = `
  const exportHistoryToPdf = (match: MatchHistory) => {
    const doc = new jsPDF();
    const isTeam = match.config.matchType === 'team';
    
    doc.setFontSize(20);
    doc.text('Lawn Bowls Match Scorecard', 14, 22);
    
    doc.setFontSize(12);
    doc.text(\`Date: \${new Date(match.date).toLocaleDateString()}\`, 14, 32);
    doc.text(\`Type: \${isTeam ? 'Team Match' : 'Singles Match'}\`, 14, 40);
    doc.text(\`Match: \${match.config.player1Name} vs \${match.config.player2Name}\`, 14, 48);
    
    doc.setFontSize(14);
    doc.text('Final Score', 14, 60);
    doc.setFontSize(12);
    doc.text(\`\${match.config.player1Name}: \${match.p1Total} (\${match.p1EndsWon} ends)\`, 14, 68);
    doc.text(\`\${match.config.player2Name}: \${match.p2Total} (\${match.p2EndsWon} ends)\`, 14, 76);
    
    if (match.ends) {
      const tableData = match.ends.map((end, i) => [
        (i + 1).toString(),
        end.player1 === '' ? '0' : end.player1.toString(),
        end.player2 === '' ? '0' : end.player2.toString()
      ]);
      
      autoTable(doc, {
        startY: 85,
        head: [['End', match.config.player1Name, match.config.player2Name]],
        body: tableData,
        theme: 'grid',
        headStyles: { fillColor: [5, 150, 105] }
      });
    }
    
    doc.save(\`LawnBowls_Scorecard_\${new Date(match.date).toISOString().split('T')[0]}.pdf\`);
  };
`;

code = code.replace("const handleExportHistory = (match: MatchHistory) => {", historyPdfExport.trim() + "\n  const handleExportHistory = (match: MatchHistory) => {");

fs.writeFileSync('src/App.tsx', code);
