const fs = require('fs');
let code = fs.readFileSync('src/App.tsx', 'utf8');

const firebaseImports = `
import { auth, db, loginWithGoogle, logout } from './firebase';
import { onAuthStateChanged } from 'firebase/auth';
import { collection, query, where, orderBy, getDocs, setDoc, deleteDoc, doc, writeBatch } from 'firebase/firestore';

enum OperationType {
  CREATE = 'create',
  UPDATE = 'update',
  DELETE = 'delete',
  LIST = 'list',
  GET = 'get',
  WRITE = 'write',
}

interface FirestoreErrorInfo {
  error: string;
  operationType: OperationType;
  path: string | null;
  authInfo: any;
}
function handleFirestoreError(error: unknown, operationType: OperationType, path: string | null) {
  const errInfo: FirestoreErrorInfo = {
    error: error instanceof Error ? error.message : String(error),
    authInfo: {
      userId: auth.currentUser?.uid,
      email: auth.currentUser?.email,
      emailVerified: auth.currentUser?.emailVerified,
    },
    operationType,
    path
  };
  console.error('Firestore Error: ', JSON.stringify(errInfo));
}
`;

code = code.replace(
  "import { Trophy",
  firebaseImports + "\nimport { Trophy"
);

// Add user state
const userState = `
  const [user, setUser] = useState<any>(null);
  
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (currentUser) => {
      setUser(currentUser);
      if (currentUser) {
        // Fetch history from Firestore
        try {
          const q = query(collection(db, 'matches'), where('userId', '==', currentUser.uid));
          const querySnapshot = await getDocs(q);
          const matches: MatchHistory[] = [];
          querySnapshot.forEach((docSnap) => {
            const data = docSnap.data();
            matches.push({
              id: docSnap.id,
              date: data.date,
              config: data.config,
              p1Total: data.p1Total,
              p2Total: data.p2Total,
              p1EndsWon: data.p1EndsWon,
              p2EndsWon: data.p2EndsWon,
              ends: data.ends
            } as MatchHistory);
          });
          matches.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
          setHistory(matches);
        } catch (err) {
          handleFirestoreError(err, OperationType.LIST, 'matches');
        }
      }
    });
    return () => unsubscribe();
  }, []);
`;

code = code.replace(
  /const \[history, setHistory\] = useState<MatchHistory\[\]>\(\(\) => \{[\s\S]*?return \[\];\n  \}\);/,
  "const [history, setHistory] = useState<MatchHistory[]>([]);\n" + userState
);

// Remove local storage save for history
code = code.replace(
  /useEffect\(\(\) => \{\n    localStorage\.setItem\('lawn_bowls_history_v2', JSON\.stringify\(history\)\);\n  \}, \[history\]\);\n/,
  ""
);

// Update match saving
const newMatchSaving = `
      if (config) {
        const newMatch: MatchHistory = {
          id: Date.now().toString() + Math.random().toString(36).substring(2, 9),
          date: new Date().toISOString(),
          config,
          p1Total,
          p2Total,
          p1EndsWon,
          p2EndsWon,
          ends,
        };
        
        if (user) {
          try {
            await setDoc(doc(db, 'matches', newMatch.id), {
              ...newMatch,
              userId: user.uid
            });
          } catch (err) {
            handleFirestoreError(err, OperationType.CREATE, \`matches/\${newMatch.id}\`);
          }
        }
        
        setHistory(prev => [newMatch, ...prev]);
      }
`;

code = code.replace(
  /if \(config\) \{[\s\S]*?const newMatch: MatchHistory = \{[\s\S]*?\};[\s\S]*?setHistory\(prev => \[newMatch, \.\.\.prev\]\);\n      \}/,
  newMatchSaving.trim()
);

// Update clear history
const newClearHistory = `
      onConfirm: async () => {
        if (user) {
          try {
            const q = query(collection(db, 'matches'), where('userId', '==', user.uid));
            const querySnapshot = await getDocs(q);
            const batch = writeBatch(db);
            querySnapshot.forEach((docSnap) => {
              batch.delete(docSnap.ref);
            });
            await batch.commit();
          } catch (err) {
            handleFirestoreError(err, OperationType.DELETE, 'matches');
          }
        }
        setHistory([]);
      }
`;

code = code.replace(
  /onConfirm: \(\) => \{\n        setHistory\(\[\]\);\n      \}/,
  newClearHistory.trim()
);

// Update delete single match
const newDeleteMatch = `
  const handleDeleteMatch = async (matchId: string) => {
    if (user) {
      try {
        await deleteDoc(doc(db, 'matches', matchId));
      } catch (err) {
        handleFirestoreError(err, OperationType.DELETE, \`matches/\${matchId}\`);
      }
    }
    setHistory(prev => prev.filter(m => m.id !== matchId));
  };
`;

code = code.replace(
  /const handleClearHistory = \(\) => \{/,
  newDeleteMatch.trim() + "\n\n  const handleClearHistory = () => {"
);

code = code.replace(
  /onDelete=\{\(\) => setHistory\(prev => prev.filter\(m => m.id !== match.id\)\)\}/g,
  "onDelete={() => handleDeleteMatch(match.id)}"
);

code = code.replace(
  /onArchive=\{\(\) => setHistory\(prev => prev.filter\(m => m.id !== match.id\)\)\}/g,
  "onArchive={() => handleDeleteMatch(match.id)}"
);

// Add login button to header
const newHeaderBtn = `
          <div className="flex gap-2">
            {user ? (
              <button onClick={logout} className="p-2 sm:p-2.5 rounded-full bg-white/10 hover:bg-white/20 text-white transition-colors" title="Sign Out">
                <img src={user.photoURL || 'https://api.dicebear.com/7.x/avataaars/svg?seed=fallback'} alt="User" className="w-5 h-5 rounded-full" />
              </button>
            ) : (
              <button onClick={loginWithGoogle} className="p-2 sm:p-2.5 rounded-full bg-white/10 hover:bg-white/20 text-white transition-colors flex items-center gap-2 text-sm font-medium" title="Sign in to save history">
                <User className="w-5 h-5" />
                <span className="hidden sm:inline">Sign In</span>
              </button>
            )}
            <button onClick={() => setShowSettings(true)} className="p-2 sm:p-2.5 rounded-full bg-white/10 hover:bg-white/20 text-white transition-colors" title="Settings">
              <Settings className="w-5 h-5 sm:w-6 sm:h-6" />
            </button>
          </div>
`;

code = code.replace(
  /<button onClick=\{\(\) => setShowSettings\(true\)\} className="p-2 sm:p-2\.5 rounded-full bg-white\/10 hover:bg-white\/20 text-white transition-colors" title="Settings">[\s\S]*?<\/button>/,
  newHeaderBtn.trim()
);

fs.writeFileSync('src/App.tsx', code);
