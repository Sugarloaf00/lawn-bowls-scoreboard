const fs = require('fs');
const code = fs.readFileSync('src/App.tsx', 'utf8');
const stack = [];
for (let i = 0; i < code.length; i++) {
  if (code[i] === '{') {
    const line = code.substring(0, i).split('\n').length;
    stack.push(line);
  }
  if (code[i] === '}') {
    stack.pop();
  }
}
console.log('Unclosed braces at lines:', stack);
