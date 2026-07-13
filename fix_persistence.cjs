const fs = require('fs');
let code = fs.readFileSync('src/App.tsx', 'utf8');

code = code.replace(
  "const [isMuted, setIsMuted] = useState(false);",
  "const [isMuted, setIsMuted] = useState(() => localStorage.getItem('lawn_bowls_muted') === 'true');"
);

code = code.replace(
  "const [theme, setTheme] = useState('emerald');",
  "const [theme, setTheme] = useState(() => localStorage.getItem('lawn_bowls_theme') || 'emerald');"
);

code = code.replace(
  "document.documentElement.setAttribute('data-theme', theme);",
  "document.documentElement.setAttribute('data-theme', theme);\n    localStorage.setItem('lawn_bowls_theme', theme);"
);

code = code.replace(
  "const handlePlaySound",
  "useEffect(() => { localStorage.setItem('lawn_bowls_muted', isMuted.toString()); }, [isMuted]);\n\n  const handlePlaySound"
);

fs.writeFileSync('src/App.tsx', code);
