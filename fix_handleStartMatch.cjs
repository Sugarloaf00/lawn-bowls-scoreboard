const fs = require('fs');
let code = fs.readFileSync('src/App.tsx', 'utf8');

const replacement = `
  const handleStartMatch = () => {
    if (setupPlayer1.trim() && setupPlayer2.trim()) {
      setConfig({
        matchType: setupMatchType,
        player1Name: setupPlayer1.trim(),
        player2Name: setupPlayer2.trim(),
        player1Avatar: setupAvatar1,
        player2Avatar: setupAvatar2,
        numEnds: setupEnds
      });
      setEnds(Array.from({ length: setupEnds }, () => ({ player1: '', player2: '' })));
      handlePlaySound('chime');
    }
  };
`;

code = code.replace(
  "  useEffect(() => {\n    if (config) {",
  replacement + "\n  useEffect(() => {\n    if (config) {"
);

fs.writeFileSync('src/App.tsx', code);
