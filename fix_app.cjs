const fs = require('fs');
let code = fs.readFileSync('src/App.tsx', 'utf8');

const regex = /  const \[confirmDialog, setConfirmDialog\] = useState<\{ isOpen: boolean; title: string; message: string; onConfirm: \(\) => void \} \| null>\(null\);[\s\S]*?    useEffect\(\(\) => \{[\s\S]*?    if \(config\) \{[\s\S]*?        const newMatch: MatchHistory = \{/;

const replacement = `  const [confirmDialog, setConfirmDialog] = useState<{ isOpen: boolean; title: string; message: string; onConfirm: () => void } | null>(null);

  useEffect(() => {
    if (config) {
      localStorage.setItem(STORAGE_KEY_CONFIG, JSON.stringify(config));
    } else {
      localStorage.removeItem(STORAGE_KEY_CONFIG);
    }
  }, [config]);

  useEffect(() => {
    localStorage.setItem(STORAGE_KEY_ENDS, JSON.stringify(ends));
  }, [ends]);

  const handleEndMatch = async (force: boolean = false) => {
    const hasScores = ends.some(end => end.player1 !== '' || end.player2 !== '');
    
    const executeEnd = async () => {
      if (hasScores && config) {
        const newMatch: MatchHistory = {`;

code = code.replace(regex, replacement);

fs.writeFileSync('src/App.tsx', code);
