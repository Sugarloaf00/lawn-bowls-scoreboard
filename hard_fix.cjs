const fs = require('fs');
let code = fs.readFileSync('src/App.tsx', 'utf8');

// I want to replace from line 368 to 376.
// I will just use string index.

const match1 = "  const [confirmDialog, setConfirmDialog] = useState<{ isOpen: boolean; title: string; message: string; onConfirm: () => void } | null>(null);";
const match2 = "        const newMatch: MatchHistory = {";

const idx1 = code.indexOf(match1);
const idx2 = code.indexOf(match2, idx1);

if (idx1 !== -1 && idx2 !== -1) {
  const replacement = match1 + `

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
`;

  code = code.slice(0, idx1) + replacement + code.slice(idx2);
  fs.writeFileSync('src/App.tsx', code);
  console.log('Fixed');
} else {
  console.log('Not found');
}
