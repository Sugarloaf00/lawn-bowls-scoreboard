const fs = require('fs');
let code = fs.readFileSync('src/App.tsx', 'utf8');

code = code.replace(/onClick=\{\(\) => handleExportHistory\(match\)\}/g, "onClick={() => exportHistoryToPdf(match)}");

fs.writeFileSync('src/App.tsx', code);
