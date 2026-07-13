const fs = require('fs');
const code = fs.readFileSync('src/App.tsx', 'utf8');
let openCount = 0;
for (let i = 0; i < code.length; i++) {
  if (code[i] === '{') openCount++;
  if (code[i] === '}') openCount--;
}
console.log('Open braces left:', openCount);
