import React, { useState, useEffect, useRef } from 'react';
import { jsPDF } from 'jspdf';
import autoTable from 'jspdf-autotable';

import { Download, Home, Trophy, Share2, Info, RotateCcw, Minus, Plus, BarChart2, PlusCircle, Trash2, Archive, Settings, Users, Hash, BookOpen, Crown, X, User, Cat, Dog, Bird, Ghost, Smile, Star, Rocket, Zap, Flame, Copy, Check, Camera, Image  } from 'lucide-react';
import confetti from 'canvas-confetti';
import { play } from 'cuelume';
import { db } from './firebase';
import { doc, setDoc, onSnapshot, getDoc, collection, getDocs, deleteDoc } from 'firebase/firestore';


export const triggerHaptic = (type: 'light' | 'medium' | 'success') => {
  if (typeof window !== 'undefined' && localStorage.getItem('lawn_bowls_vibration') === 'false') return;
  if (typeof navigator === 'undefined' || !navigator.vibrate) return;
  try {
    switch (type) {
      case 'light':
        navigator.vibrate(15); // slightly stronger tap (15ms instead of 10ms)
        break;
      case 'medium':
        navigator.vibrate([20, 20, 20]); // double pulse tap
        break;
      case 'success':
        navigator.vibrate([30, 40, 30, 40, 50]); // premium succession pulses
        break;
    }
  } catch (e) {
    // Graceful fallback for unsupported environments
  }
};

const ICONS: Record<string, React.FC<any>> = {
  user: User,
  cat: Cat,
  dog: Dog,
  bird: Bird,
  ghost: Ghost,
  smile: Smile,
  star: Star,
  rocket: Rocket,
  zap: Zap,
  flame: Flame,
};

const STORAGE_KEY_ENDS = 'lawn_bowls_ends_v2';
const STORAGE_KEY_CONFIG = 'lawn_bowls_config_v2';

type EndScore = {
  player1: number | '';
  player2: number | '';
};

type MatchType = 'individual' | 'team';

type TeamPosition = 'Lead' | 'Second' | 'Third' | 'Skip';

type TeamMember = {
  name: string;
  position: TeamPosition;
};

type MatchConfig = {
  matchType: MatchType;
  player1Name: string;
  player2Name: string;
  player1Avatar: string;
  player2Avatar: string;
  numEnds: number;
  team1Members?: TeamMember[];
  team2Members?: TeamMember[];
  bowlsPerPlayer?: number;
};

type MatchHistory = {
  id: string;
  date: string;
  config: MatchConfig;
  p1Total: number;
  p2Total: number;
  p1EndsWon: number;
  p2EndsWon: number;
  ends?: EndScore[];
  isArchived?: boolean;
};

const getTurnSequence = (config: MatchConfig, startTeam: 'team1' | 'team2') => {
  const t1 = config.team1Members || [];
  const t2 = config.team2Members || [];
  const bowls = config.bowlsPerPlayer || 2;
  
  const teamA = startTeam === 'team1' ? 'team1' : 'team2';
  const teamB = startTeam === 'team1' ? 'team2' : 'team1';
  const membersA = startTeam === 'team1' ? t1 : t2;
  const membersB = startTeam === 'team1' ? t2 : t1;
  const nameA = startTeam === 'team1' ? config.player1Name : config.player2Name;
  const nameB = startTeam === 'team1' ? config.player2Name : config.player1Name;
  const avatarA = startTeam === 'team1' ? config.player1Avatar : config.player2Avatar;
  const avatarB = startTeam === 'team1' ? config.player2Avatar : config.player1Avatar;
  
  const sequence: { team: 'team1' | 'team2'; playerName: string; position: string; bowlNum: number; teamName: string; avatar: string }[] = [];
  
  const positions: TeamPosition[] = ['Lead', 'Second', 'Third', 'Skip'];
  
  positions.forEach(pos => {
    const playerA = membersA.find(m => m.position === pos);
    const playerB = membersB.find(m => m.position === pos);
    
    // If neither team has this position, skip it
    if (!playerA && !playerB) return;
    
    // alternate bowls
    for (let b = 1; b <= bowls; b++) {
      if (playerA) {
        sequence.push({
          team: teamA,
          teamName: nameA,
          avatar: avatarA,
          playerName: playerA.name,
          position: pos,
          bowlNum: b
        });
      }
      if (playerB) {
        sequence.push({
          team: teamB,
          teamName: nameB,
          avatar: avatarB,
          playerName: playerB.name,
          position: pos,
          bowlNum: b
        });
      }
    }
  });
  
  return sequence;
};

function AvatarDisplay({ avatar, className = "" }: { avatar: string; className?: string }) {
  if (avatar?.startsWith("data:image/")) {
    return <img src={avatar} alt="Avatar" className={`object-cover rounded-full ${className}`} />;
  }
  const Icon = ICONS[avatar] || ICONS.user;
  return <Icon className={className} />;
}

function BumpNumber({ value, displayValue, className = '' }: { value: number; displayValue?: React.ReactNode; className?: string }) {
  const [key, setKey] = useState(0);
  const prevRef = React.useRef(value);

  useEffect(() => {
    if (value !== prevRef.current) {
      if (value > prevRef.current) {
        setKey((k) => k + 1);
      }
      prevRef.current = value;
    }
  }, [value]);

  return (
    <span key={key} className={`inline-block ${key > 0 ? 'bump-animation' : ''} ${className}`}>
      {displayValue !== undefined ? displayValue : value}
    </span>
  );
}

const HistoryItem: React.FC<{ match: MatchHistory, onDelete: () => void, onArchive: () => void, onShare: () => void }> = ({ match, onDelete, onArchive, onShare }) => {
  
  
  const itemRef = useRef<HTMLDivElement>(null);
  const [isOpen, setIsOpen] = useState(false);
  
  const isDragging = useRef(false);
  const startX = useRef(0);
  const currentX = useRef(0);

  const handlePointerDown = (e: React.PointerEvent) => {
    isDragging.current = true;
    startX.current = e.clientX;
    if (itemRef.current) {
      itemRef.current.style.transition = 'none';
      itemRef.current.classList.remove('open');
      itemRef.current.setPointerCapture(e.pointerId);
    }
  };

  const handlePointerMove = (e: React.PointerEvent) => {
    if (!isDragging.current) return;
    const dx = e.clientX - startX.current;
    
    let nextX = isOpen ? -144 + dx : dx;
    if (nextX > 0) nextX = 0;
    currentX.current = nextX;
    
    if (itemRef.current) {
      itemRef.current.style.transform = `translateX(${nextX}px)`;
    }
  };

  const handlePointerUp = (e: React.PointerEvent) => {
    if (!isDragging.current) return;
    isDragging.current = false;
    if (itemRef.current) {
      itemRef.current.releasePointerCapture(e.pointerId);
      itemRef.current.style.transition = 'transform 0.5s cubic-bezier(0.34, 1.56, 0.64, 1)';
      itemRef.current.style.transform = '';
      
      if (currentX.current < -60) {
        setIsOpen(true);
      } else {
        setIsOpen(false);
      }
    }
  };

  return (
    <div className="relative rounded-2xl overflow-hidden bg-slate-100 shadow-sm border border-slate-200">
      {/* Background Actions */}
      <div className="absolute inset-y-0 right-0 flex items-center pr-4 gap-2 bg-slate-100 w-full justify-end">
        <button onClick={() => { onShare(); setIsOpen(false); }} className="w-10 h-10 rounded-full bg-blue-100 text-blue-600 flex items-center justify-center hover:bg-blue-200 transition-colors">
          <Share2 className="w-5 h-5" />
        </button>
        <button 
          onClick={() => { onArchive(); setIsOpen(false); }} 
          className={`w-10 h-10 rounded-full flex items-center justify-center transition-colors ${match.isArchived ? 'bg-emerald-100 text-emerald-600 hover:bg-emerald-200' : 'bg-amber-100 text-amber-600 hover:bg-amber-200'}`}
          title={match.isArchived ? "Restore Match" : "Archive Match"}
        >
          {match.isArchived ? <RotateCcw className="w-5 h-5" /> : <Archive className="w-5 h-5" />}
        </button>
        <button onClick={onDelete} className="w-10 h-10 rounded-full bg-red-100 text-red-600 flex items-center justify-center hover:bg-red-200 transition-colors">
          <Trash2 className="w-5 h-5" />
        </button>
      </div>
      
      {/* Foreground Item */}
      <div
        ref={itemRef}
        className={`bg-white rounded-2xl p-6 flex flex-col sm:flex-row sm:items-center justify-between gap-4 relative z-10 touch-pan-y will-change-transform ${isOpen ? 'open' : ''}`}
        onPointerDown={handlePointerDown}
        onPointerMove={handlePointerMove}
        onPointerUp={handlePointerUp}
        onPointerCancel={handlePointerUp}
      >
        <div className="flex-1">
          <div className="text-sm text-slate-400 mb-4 font-medium">
            {new Date(match.date).toLocaleDateString(undefined, { weekday: 'short', month: 'short', day: 'numeric', year: 'numeric' })} &bull; {match.config.numEnds} Ends &bull; {match.config.matchType === 'team' ? 'Team Match' : 'Singles Match'}
          </div>
          <div className="flex items-center gap-6">
            <div className={`flex flex-col items-center ${match.p1Total > match.p2Total ? 'font-bold text-primary-700' : 'text-slate-600'}`}>
              <div className={`w-10 h-10 rounded-full flex items-center justify-center mb-2 ${match.p1Total > match.p2Total ? 'bg-primary-100 text-primary-600' : 'bg-slate-100 text-slate-400'}`}>
                <AvatarDisplay avatar={match.config.player1Avatar} className="w-5 h-5" />
              </div>
              <span className="text-2xl">{match.p1Total}</span>
              <span className="text-xs uppercase tracking-wider truncate max-w-[100px]">{match.config.player1Name}</span>
            </div>
            <div className="text-slate-300 font-bold">VS</div>
            <div className={`flex flex-col items-center ${match.p2Total > match.p1Total ? 'font-bold text-primary-700' : 'text-slate-600'}`}>
              <div className={`w-10 h-10 rounded-full flex items-center justify-center mb-2 ${match.p2Total > match.p1Total ? 'bg-primary-100 text-primary-600' : 'bg-slate-100 text-slate-400'}`}>
                <AvatarDisplay avatar={match.config.player2Avatar} className="w-5 h-5" />
              </div>
              <span className="text-2xl">{match.p2Total}</span>
              <span className="text-xs uppercase tracking-wider truncate max-w-[100px]">{match.config.player2Name}</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

// Helper: Extract dominant vibrant color from an image data URL or URL
function extractColorsFromImage(dataUrl: string): Promise<{ h: number; s: number; l: number }> {
  return new Promise((resolve) => {
    const img = new window.Image();
    img.crossOrigin = 'Anonymous';
    img.onload = () => {
      const canvas = document.createElement('canvas');
      canvas.width = 32;
      canvas.height = 32;
      const ctx = canvas.getContext('2d');
      if (!ctx) {
        resolve({ h: 140, s: 70, l: 50 }); // fallback emerald
        return;
      }
      ctx.drawImage(img, 0, 0, 32, 32);
      let imgData;
      try {
        imgData = ctx.getImageData(0, 0, 32, 32).data;
      } catch (e) {
        resolve({ h: 140, s: 70, l: 50 });
        return;
      }
      
      const rgbToHsl = (r: number, g: number, b: number) => {
        r /= 255; g /= 255; b /= 255;
        const max = Math.max(r, g, b), min = Math.min(r, g, b);
        let h = 0, s = 0, l = (max + min) / 2;
        if (max !== min) {
          const d = max - min;
          s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
          switch (max) {
            case r: h = (g - b) / d + (g < b ? 6 : 0); break;
            case g: h = (b - r) / d + 2; break;
            case b: h = (r - g) / d + 4; break;
          }
          h /= 6;
        }
        return { h: Math.round(h * 360), s: Math.round(s * 100), l: Math.round(l * 100) };
      };

      let bestColor = { h: 140, s: 70, l: 50 };
      let maxVibrancy = -1;
      let validCount = 0;

      for (let i = 0; i < imgData.length; i += 4) {
        const r = imgData[i];
        const g = imgData[i+1];
        const b = imgData[i+2];
        const a = imgData[i+3];
        if (a < 150) continue; // skip highly transparent pixels

        const hsl = rgbToHsl(r, g, b);
        
        // Filter out extreme dark, extreme light, or gray pixels for a better primary color
        if (hsl.l > 15 && hsl.l < 85 && hsl.s > 15) {
          // Vibrancy metric: highly saturated colors closer to 50% lightness
          const vibrancy = hsl.s * (50 - Math.abs(hsl.l - 50));
          if (vibrancy > maxVibrancy) {
            maxVibrancy = vibrancy;
            bestColor = hsl;
          }
          validCount++;
        }
      }

      if (validCount > 0) {
        resolve(bestColor);
      } else {
        // Fallback to average color
        let rSum = 0, gSum = 0, bSum = 0, count = 0;
        for (let i = 0; i < imgData.length; i += 4) {
          if (imgData[i+3] > 150) {
            rSum += imgData[i];
            gSum += imgData[i+1];
            bSum += imgData[i+2];
            count++;
          }
        }
        if (count > 0) {
          resolve(rgbToHsl(rSum / count, gSum / count, bSum / count));
        } else {
          resolve({ h: 140, s: 70, l: 50 });
        }
      }
    };
    img.onerror = () => {
      resolve({ h: 140, s: 70, l: 50 });
    };
    img.src = dataUrl;
  });
}

function applyCustomTheme(h: number, s: number) {
  const root = document.documentElement;
  root.style.setProperty('--primary-50', `hsl(${h}, ${s}%, 97%)`);
  root.style.setProperty('--primary-100', `hsl(${h}, ${s}%, 93%)`);
  root.style.setProperty('--primary-200', `hsl(${h}, ${s}%, 85%)`);
  root.style.setProperty('--primary-300', `hsl(${h}, ${s}%, 75%)`);
  root.style.setProperty('--primary-400', `hsl(${h}, ${s}%, 60%)`);
  root.style.setProperty('--primary-500', `hsl(${h}, ${s}%, 50%)`);
  root.style.setProperty('--primary-600', `hsl(${h}, ${s}%, 40%)`);
  root.style.setProperty('--primary-700', `hsl(${h}, ${s}%, 30%)`);
  root.style.setProperty('--primary-800', `hsl(${h}, ${s}%, 20%)`);
  root.style.setProperty('--primary-900', `hsl(${h}, ${s}%, 15%)`);
  root.style.setProperty('--primary-950', `hsl(${h}, ${s}%, 8%)`);
}

export default function App() {
  const [history, setHistory] = useState<MatchHistory[]>([]);
  const [customTheme, setCustomTheme] = useState<{ h: number; s: number } | null>(() => {
    const saved = localStorage.getItem('lawn_bowls_custom_theme');
    try {
      return saved ? JSON.parse(saved) : null;
    } catch (e) {
      return null;
    }
  });

  const [config, setConfig] = useState<MatchConfig | null>(() => {
    const saved = localStorage.getItem(STORAGE_KEY_CONFIG);
    if (saved) {
      try { return JSON.parse(saved); } catch (e) {}
    }
    return null;
  });

  const [ends, setEnds] = useState<EndScore[]>(() => {
    const saved = localStorage.getItem(STORAGE_KEY_ENDS);
    if (saved) {
      try { return JSON.parse(saved); } catch (e) {}
    }
    return [];
  });

  const [activeRow, setActiveRow] = useState<number | null>(null);

  // Setup form state
  const [setupPlayer1, setSetupPlayer1] = useState('Brod');
  const [setupPlayer2, setSetupPlayer2] = useState('Amigo');
  const [setupMatchType, setSetupMatchType] = useState<MatchType>('individual');
  const [setupAvatar1, setSetupAvatar1] = useState('user');
  const [setupAvatar2, setSetupAvatar2] = useState('user');
  const [setupEnds, setSetupEnds] = useState<number>(15);

  // Live Session States
  const [sessionCode, setSessionCode] = useState<string | null>(null);
  const [isHost, setIsHost] = useState(false);
  const [isSyncing, setIsSyncing] = useState(false);
  const [liveSessionError, setLiveSessionError] = useState<string | null>(null);
  const [showLiveLobbyModal, setShowLiveLobbyModal] = useState(false);
  const [liveMatches, setLiveMatches] = useState<any[]>([]);
  const [isLoadingLiveMatches, setIsLoadingLiveMatches] = useState(false);


  // Team positions form states
  const [t1Lead, setT1Lead] = useState('');
  const [t1Second, setT1Second] = useState('');
  const [t1Third, setT1Third] = useState('');
  const [t1Skip, setT1Skip] = useState('');

  const [t2Lead, setT2Lead] = useState('');
  const [t2Second, setT2Second] = useState('');
  const [t2Third, setT2Third] = useState('');
  const [t2Skip, setT2Skip] = useState('');

  const [bowlsPerPlayer, setBowlsPerPlayer] = useState(2);

  // Active turn tracking states
  const [currentBowlIndex, setCurrentBowlIndex] = useState(0);
  const [startTeamForCurrentEnd, setStartTeamForCurrentEnd] = useState<'team1' | 'team2'>('team1');

  useEffect(() => {
    if (activeRow === null || activeRow === 0) {
      setStartTeamForCurrentEnd('team1');
      setCurrentBowlIndex(0);
    } else {
      const prevEnd = ends[activeRow - 1];
      if (prevEnd) {
        const p1Score = Number(prevEnd.player1) || 0;
        const p2Score = Number(prevEnd.player2) || 0;
        if (p1Score > 0 && p2Score === 0) {
          setStartTeamForCurrentEnd('team1');
        } else if (p2Score > 0 && p1Score === 0) {
          setStartTeamForCurrentEnd('team2');
        }
      }
      setCurrentBowlIndex(0);
    }
  }, [activeRow, ends]);

  const [showSummaryModal, setShowSummaryModal] = useState(false);
  const [gameOver, setGameOver] = useState(false);
  const [hasTriggeredConfetti, setHasTriggeredConfetti] = useState(false);
  const [showHistory, setShowHistory] = useState(false);
  const [showArchivedOnly, setShowArchivedOnly] = useState(false);
  const [isFabOpen, setIsFabOpen] = useState(false);

  const [isMuted, setIsMuted] = useState(() => localStorage.getItem('lawn_bowls_muted') === 'true');
  const [isVibrationEnabled, setIsVibrationEnabled] = useState(() => localStorage.getItem('lawn_bowls_vibration') !== 'false');
  const [theme, setTheme] = useState(() => localStorage.getItem('lawn_bowls_theme') || 'emerald');
  const [showSettings, setShowSettings] = useState(false);

  const autoAdvanceTimeout = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    localStorage.setItem('lawn_bowls_vibration', isVibrationEnabled.toString());
  }, [isVibrationEnabled]);

  // Load history from localStorage
  useEffect(() => {
    const saved = localStorage.getItem('lawn_bowls_history_v2');
    if (saved) {
      try {
        setHistory(JSON.parse(saved));
      } catch (e) {}
    }
  }, []);

  // Save history to localStorage
  useEffect(() => {
    localStorage.setItem('lawn_bowls_history_v2', JSON.stringify(history));
  }, [history]);

  // Apply UI theme & handle preset clearing
  useEffect(() => {
    document.documentElement.setAttribute('data-theme', theme);
    localStorage.setItem('lawn_bowls_theme', theme);
    if (theme === 'custom' && customTheme) {
      applyCustomTheme(customTheme.h, customTheme.s);
    } else {
      const root = document.documentElement;
      const keys = ['50', '100', '200', '300', '400', '500', '600', '700', '800', '900', '950'];
      keys.forEach(k => root.style.removeProperty(`--primary-${k}`));
    }
  }, [theme, customTheme]);

  useEffect(() => { localStorage.setItem('lawn_bowls_muted', isMuted.toString()); }, [isMuted]);

  // Auto-theme based on Player 1's uploaded logo/avatar
  useEffect(() => {
    const avatar = config ? config.player1Avatar : setupAvatar1;
    if (avatar && avatar.startsWith('data:image/')) {
      extractColorsFromImage(avatar).then((colors) => {
        setCustomTheme({ h: colors.h, s: colors.s });
        setTheme('custom');
        localStorage.setItem('lawn_bowls_custom_theme', JSON.stringify({ h: colors.h, s: colors.s }));
      });
    } else {
      setCustomTheme(null);
      localStorage.removeItem('lawn_bowls_custom_theme');
      if (theme === 'custom') {
        setTheme('emerald');
      }
    }
  }, [setupAvatar1, config]);

  // Helper to generate a random 6-character uppercase alphanumeric code
  const generateSessionCode = () => {
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
    let code = '';
    for (let i = 0; i < 6; i++) {
      code += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return code;
  };

  // Fetch all active live matches from Firestore
  const fetchLiveMatches = async () => {
    setIsLoadingLiveMatches(true);
    try {
      const querySnapshot = await getDocs(collection(db, 'live_sessions'));
      const matches: any[] = [];
      const now = Date.now();
      const sixHours = 6 * 60 * 60 * 1000;
      
      querySnapshot.forEach((doc) => {
        const data = doc.data();
        if (data.lastUpdated) {
          const lastUpdatedTime = new Date(data.lastUpdated).getTime();
          if (now - lastUpdatedTime < sixHours) {
            let p1Total = 0;
            let p2Total = 0;
            if (data.ends && Array.isArray(data.ends)) {
              p1Total = data.ends.reduce((sum: number, end: any) => sum + (Number(end.player1) || 0), 0);
              p2Total = data.ends.reduce((sum: number, end: any) => sum + (Number(end.player2) || 0), 0);
            }
            matches.push({
              id: doc.id,
              ...data,
              p1Total,
              p2Total
            });
          }
        }
      });
      matches.sort((a, b) => new Date(b.lastUpdated).getTime() - new Date(a.lastUpdated).getTime());
      setLiveMatches(matches);
    } catch (e) {
      console.error("Error fetching live matches:", e);
    } finally {
      setIsLoadingLiveMatches(false);
    }
  };

  // Host a Live Session
  const sanitizeForFirestore = (cfg: typeof config, rawEnds: typeof ends) => {
    // Recursively remove undefined values — Firestore rejects any undefined field
    const stripUndefined = (obj: any): any => {
      if (Array.isArray(obj)) return obj.map(stripUndefined);
      if (obj !== null && typeof obj === 'object') {
        return Object.fromEntries(
          Object.entries(obj)
            .filter(([, v]) => v !== undefined)
            .map(([k, v]) => [k, stripUndefined(v)])
        );
      }
      return obj;
    };

    // Keep avatars — they are already compressed to 128×128 JPEG (~5-10KB each),
    // well within Firestore's 1MB doc limit. Only strip undefined fields.
    const safeConfig = cfg ? stripUndefined({ ...cfg }) : cfg;

    // Firestore rejects '' inside arrays with mixed types — store as null
    const safeEnds = rawEnds.map(e => ({
      player1: e.player1 === '' ? null : e.player1,
      player2: e.player2 === '' ? null : e.player2,
    }));
    return { safeConfig, safeEnds };
  };

  const handleHostSession = async () => {
    const newCode = generateSessionCode();
    setLiveSessionError(null);
    setIsSyncing(true);
    try {
      const docRef = doc(db, 'live_sessions', newCode);
      const initialConfig = config || {
        matchType: setupMatchType,
        player1Name: setupPlayer1.trim() || 'Team 1',
        player2Name: setupPlayer2.trim() || 'Team 2',
        player1Avatar: setupAvatar1,
        player2Avatar: setupAvatar2,
        numEnds: setupEnds
      };
      const initialEnds = ends.length > 0 ? ends : Array.from({ length: setupEnds }, () => ({ player1: '', player2: '' }));
      const { safeConfig, safeEnds } = sanitizeForFirestore(initialConfig, initialEnds);

      await setDoc(docRef, {
        config: safeConfig,
        ends: safeEnds,
        activeRow: activeRow !== null ? activeRow : 0,
        currentBowlIndex: currentBowlIndex,
        startTeamForCurrentEnd: startTeamForCurrentEnd,
        lastUpdated: new Date().toISOString()
      });

      setConfig(initialConfig);
      setEnds(initialEnds);
      if (activeRow === null) setActiveRow(0);
      setSessionCode(newCode);
      setIsHost(true);
      handlePlaySound('success');
      triggerHaptic('success');
    } catch (err: any) {
      console.error("Error creating session:", err);
      setLiveSessionError(`Failed to host session: ${err?.message || 'Check your internet connection.'}`);
    } finally {
      setIsSyncing(false);
    }
  };

  // Join a Live Session
  const handleJoinSession = async (codeToJoin: string) => {
    const cleanCode = codeToJoin.trim().toUpperCase();
    if (!cleanCode) return;
    
    setLiveSessionError(null);
    setIsSyncing(true);
    try {
      const docRef = doc(db, 'live_sessions', cleanCode);
      const snapshot = await getDoc(docRef);
      if (snapshot.exists()) {
        const data = snapshot.data();
        setSessionCode(cleanCode);
        setIsHost(false);
        
        // Load initial state — restore null scores back to '' (stored as null in Firestore)
        if (data.config) setConfig(data.config);
        if (data.ends) {
          const restoredEnds = data.ends.map((e: any) => ({
            player1: e.player1 === null || e.player1 === undefined ? '' : e.player1,
            player2: e.player2 === null || e.player2 === undefined ? '' : e.player2,
          }));
          setEnds(restoredEnds);
        }
        if (data.activeRow !== undefined) setActiveRow(data.activeRow);
        if (data.currentBowlIndex !== undefined) setCurrentBowlIndex(data.currentBowlIndex);
        if (data.startTeamForCurrentEnd !== undefined) setStartTeamForCurrentEnd(data.startTeamForCurrentEnd);
        
        setShowHistory(false);
        handlePlaySound('chime');
        triggerHaptic('success');
      } else {
        setLiveSessionError("Session code not found. Double check the code.");
      }
    } catch (err: any) {
      console.error("Error joining session:", err);
      setLiveSessionError(`Failed to join: ${err?.message || 'Check your connection.'}`);
    } finally {
      setIsSyncing(false);
    }
  };

  // Leave Live Session
  const handleDisconnectSession = () => {
    setSessionCode(null);
    setIsHost(false);
    setLiveSessionError(null);
    handlePlaySound('release');
    triggerHaptic('light');
  };

  // Check URL query parameter for session on mount
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const code = params.get('session');
    if (code) {
      handleJoinSession(code);
    }
  }, []);

  // Ref storing the last snapshot we received from Firestore.
  // Using a ref (not state) keeps the listener stable and prevents
  // re-subscriptions every time local state changes.
  const lastRemoteSnapshot = React.useRef<string>('');
  const isHostRef = React.useRef<boolean>(false);

  // Track whether we are the host so the snapshot listener knows
  useEffect(() => {
    isHostRef.current = isHost;
  }, [isHost]);

  // Listen to live session updates in Firestore — stable listener, only
  // recreated when sessionCode changes (not on every local state mutation).
  useEffect(() => {
    if (!sessionCode) return;

    const docRef = doc(db, 'live_sessions', sessionCode);
    const unsubscribe = onSnapshot(docRef, (snapshot) => {
      if (!snapshot.exists()) return;

      // Host is the source of truth — never apply incoming Firestore data
      // back onto the host's state. Doing so causes jumpy scoring because
      // every push triggers a snapshot which then "resets" local state.
      if (isHostRef.current) return;

      const data = snapshot.data();

      // Build a fingerprint to skip duplicate snapshots
      const remoteFingerprint = JSON.stringify({
        ends: data.ends,
        activeRow: data.activeRow,
        currentBowlIndex: data.currentBowlIndex,
        startTeamForCurrentEnd: data.startTeamForCurrentEnd,
      });

      if (remoteFingerprint === lastRemoteSnapshot.current) return;
      lastRemoteSnapshot.current = remoteFingerprint;

      // Spectator: apply full remote state
      if (data.config) setConfig(data.config);

      if (data.ends) {
        // Restore null → '' (we store '' as null to satisfy Firestore)
        const restoredEnds = data.ends.map((e: any) => ({
          player1: e.player1 === null ? '' : e.player1,
          player2: e.player2 === null ? '' : e.player2,
        }));
        setEnds(restoredEnds);
      }
      if (data.activeRow !== undefined) setActiveRow(data.activeRow);
      if (data.currentBowlIndex !== undefined) setCurrentBowlIndex(data.currentBowlIndex);
      if (data.startTeamForCurrentEnd !== undefined) setStartTeamForCurrentEnd(data.startTeamForCurrentEnd);

      // Each side keeps their own theme — no cross-theme sync

      // Show victory modal on all spectators when host ends the game
      if (data.gameOver === true) {
        setGameOver(true);
        setShowSummaryModal(true);
        confetti({ particleCount: 150, spread: 70, origin: { y: 0.6 } });
      }
    }, (err) => {
      console.error("Firestore onSnapshot error:", err);
      setLiveSessionError("Lost connection to live session.");
    });

    return () => unsubscribe();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [sessionCode]);

  // Debounced push to Firestore when local states change (host only)
  useEffect(() => {
    if (!sessionCode) return;

    const payload = JSON.stringify({ config, ends, activeRow, currentBowlIndex, startTeamForCurrentEnd });

    // Don't push back data that just arrived from Firestore
    if (payload === lastRemoteSnapshot.current) return;

    const timer = setTimeout(async () => {
      try {
        const { safeConfig, safeEnds } = sanitizeForFirestore(config, ends);
        const docRef = doc(db, 'live_sessions', sessionCode);
        await setDoc(docRef, {
          config: safeConfig,
          ends: safeEnds,
          activeRow,
          currentBowlIndex,
          startTeamForCurrentEnd,
          theme,          // sync colour theme to spectators
          gameOver,       // broadcast game-over state
          lastUpdated: new Date().toISOString()
        }, { merge: true });
      } catch (err) {
        console.error("Firestore write error:", err);
      }
    }, 150); // 150ms debounce

    return () => clearTimeout(timer);
  }, [sessionCode, config, ends, activeRow, currentBowlIndex, startTeamForCurrentEnd, theme, gameOver]);

  const handleScoreboardAvatarUpload = (e: React.ChangeEvent<HTMLInputElement>, playerKey: 'player1' | 'player2') => {
    handleImageUpload(e, (dataUrl) => {
      if (!config) return;
      setConfig(prev => {
        if (!prev) return null;
        return {
          ...prev,
          player1Avatar: playerKey === 'player1' ? dataUrl : prev.player1Avatar,
          player2Avatar: playerKey === 'player2' ? dataUrl : prev.player2Avatar,
        };
      });
      handlePlaySound('sparkle');
    });
  };

  // Global click listeners for haptics & ticks
  useEffect(() => {
    const handleGlobalClick = (e: MouseEvent) => {
      const target = e.target as HTMLElement;
      const isClickable = target.closest('button, a, input, label, select, [role="button"]');
      if (isClickable) {
        // Trigger haptic feedback (slight vibration) on every click on mobile
        triggerHaptic('light');

        if (!isMuted) {
          const hasCuelume = target.closest('[data-cuelume-press], [data-cuelume-release]');
          if (!hasCuelume) {
            play('tick'); // use direct play to bypass any potential double-mute checks though play() plays when called
          }
        }
      }
    };
    document.addEventListener('click', handleGlobalClick, true);
    return () => document.removeEventListener('click', handleGlobalClick, true);
  }, [isMuted]);

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>, setter: React.Dispatch<React.SetStateAction<string>>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = (ev) => {
        if (ev.target?.result) {
          const img = new window.Image();
          img.onload = () => {
            const canvas = document.createElement('canvas');
            const MAX_SIZE = 128;
            let width = img.width;
            let height = img.height;
            if (width > height) {
              if (width > MAX_SIZE) {
                height *= MAX_SIZE / width;
                width = MAX_SIZE;
              }
            } else {
              if (height > MAX_SIZE) {
                width *= MAX_SIZE / height;
                height = MAX_SIZE;
              }
            }
            canvas.width = width;
            canvas.height = height;
            const ctx = canvas.getContext('2d');
            ctx?.drawImage(img, 0, 0, width, height);
            setter(canvas.toDataURL('image/jpeg', 0.8));
          };
          img.src = ev.target.result as string;
        }
      };
      reader.readAsDataURL(file);
    }
  };

  const handlePlaySound = (type: "toggle" | "chime" | "press" | "release" | "droplet" | "tick" | "whisper" | "success" | "sparkle" | "bloom") => {
    if (!isMuted) play(type);
  };

  const [copySuccess, setCopySuccess] = useState(false);
  const [confirmDialog, setConfirmDialog] = useState<{ isOpen: boolean; title: string; message: string; onConfirm: () => void } | null>(null);


  const handleStartMatch = () => {
    if (setupPlayer1.trim() && setupPlayer2.trim()) {
      setShowHistory(false);

      const team1Members: TeamMember[] = [];
      if (t1Lead.trim()) team1Members.push({ name: t1Lead.trim(), position: 'Lead' });
      if (t1Second.trim()) team1Members.push({ name: t1Second.trim(), position: 'Second' });
      if (t1Third.trim()) team1Members.push({ name: t1Third.trim(), position: 'Third' });
      if (t1Skip.trim()) team1Members.push({ name: t1Skip.trim(), position: 'Skip' });

      const team2Members: TeamMember[] = [];
      if (t2Lead.trim()) team2Members.push({ name: t2Lead.trim(), position: 'Lead' });
      if (t2Second.trim()) team2Members.push({ name: t2Second.trim(), position: 'Second' });
      if (t2Third.trim()) team2Members.push({ name: t2Third.trim(), position: 'Third' });
      if (t2Skip.trim()) team2Members.push({ name: t2Skip.trim(), position: 'Skip' });

      setConfig({
        matchType: setupMatchType,
        player1Name: setupPlayer1.trim(),
        player2Name: setupPlayer2.trim(),
        player1Avatar: setupAvatar1,
        player2Avatar: setupAvatar2,
        numEnds: setupEnds,
        team1Members: setupMatchType === 'team' ? team1Members : undefined,
        team2Members: setupMatchType === 'team' ? team2Members : undefined,
        bowlsPerPlayer: setupMatchType === 'team' ? bowlsPerPlayer : undefined
      });
      setEnds(Array.from({ length: setupEnds }, () => ({ player1: '', player2: '' })));
      handlePlaySound('chime');
    }
  };

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

  const handleEndMatch = (force: boolean = false) => {
    const hasScores = ends.some(end => end.player1 !== '' || end.player2 !== '');
    
    const executeEnd = () => {
      if (hasScores && config) {
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
        
        setHistory(prev => [newMatch, ...prev]);
      }

      setConfig(null);
      setEnds([]);
      setGameOver(false);
      setHasTriggeredConfetti(false);
      setShowHistory(false);
    };

    if (force) {
      executeEnd();
    } else {
      setConfirmDialog({
        isOpen: true,
        title: 'End Match',
        message: hasScores ? 'Are you sure you want to end this match? It will be saved to your history.' : 'Are you sure you want to end this match and return to setup?',
        onConfirm: executeEnd
      });
    }
  };


  const generateSummaryText = () => {
    if (!config) return "";
    let summaryText = `LAWN BOWLS MATCH SUMMARY\n`;
    summaryText += `${new Date().toLocaleDateString()} - ${config.matchType === 'team' ? 'Team Match' : 'Singles Match'}\n`;
    summaryText += `${config.player1Name} vs ${config.player2Name}\n\n`;
    
    const p1TotalExport = ends.reduce((sum, end) => sum + (Number(end.player1) || 0), 0);
    const p2TotalExport = ends.reduce((sum, end) => sum + (Number(end.player2) || 0), 0);
    const p1EndsWonExport = ends.filter(end => (Number(end.player1) || 0) > (Number(end.player2) || 0)).length;
    const p2EndsWonExport = ends.filter(end => (Number(end.player2) || 0) > (Number(end.player1) || 0)).length;

    summaryText += `FINAL SCORE\n`;
    summaryText += `${config.player1Name}: ${p1TotalExport} (${p1EndsWonExport} ends)\n`;
    summaryText += `${config.player2Name}: ${p2TotalExport} (${p2EndsWonExport} ends)\n\n`;

    summaryText += `SCORECARD\n`;
    summaryText += `End | ${config.player1Name} | ${config.player2Name}\n`;
    summaryText += `----|${'-'.repeat(config.player1Name.length + 2)}|${'-'.repeat(config.player2Name.length + 2)}\n`;
    
    ends.forEach((end, i) => {
      const p1 = end.player1 !== '' ? end.player1 : '-';
      const p2 = end.player2 !== '' ? end.player2 : '-';
      summaryText += `${(i + 1).toString().padEnd(3)} | ${p1.toString().padEnd(config.player1Name.length)} | ${p2}\n`;
    });
    return summaryText;
  };

  const handleShareScorecard = () => {
    if (!config) return;
    const doc = new jsPDF();
    const isTeam = config.matchType === 'team';
    
    // Title
    doc.setFontSize(20);
    doc.text('Lawn Bowls Match Scorecard', 14, 22);
    
    // Match Info
    doc.setFontSize(12);
    doc.text(`Date: ${new Date().toLocaleDateString()}`, 14, 32);
    doc.text(`Type: ${isTeam ? 'Team Match' : 'Singles Match'}`, 14, 40);
    doc.text(`Match: ${config.player1Name} vs ${config.player2Name}`, 14, 48);
    
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
    doc.text(`${config.player1Name}: ${p1Total} (${p1EndsWon} ends)`, 14, 68);
    doc.text(`${config.player2Name}: ${p2Total} (${p2EndsWon} ends)`, 14, 76);
    
    autoTable(doc, {
      startY: 85,
      head: [['End', config.player1Name, config.player2Name]],
      body: tableData,
      theme: 'grid',
      headStyles: { fillColor: [5, 150, 105] }
    });
    
    doc.save(`LawnBowls_Scorecard_${new Date().toISOString().split('T')[0]}.pdf`);
  };

  const handleExportScorecard = async () => {
    const summaryText = generateSummaryText();
    if (!summaryText) return;

    

    try {
      await navigator.clipboard.writeText(summaryText);
      setCopySuccess(true);
      setTimeout(() => setCopySuccess(false), 2000);
    } catch (err) {
      console.error('Failed to copy text: ', err);
    }
  };


  const handleShareMatchHistory = async (match: MatchHistory) => {
    const doc = new jsPDF();
    const isTeam = match.config.matchType === 'team';
    
    // Title
    doc.setFontSize(20);
    doc.text('Lawn Bowls Match Scorecard', 14, 22);
    
    // Match Info
    doc.setFontSize(12);
    doc.text(`Date: ${new Date(match.date).toLocaleDateString()}`, 14, 32);
    doc.text(`Type: ${isTeam ? 'Team Match' : 'Singles Match'}`, 14, 40);
    doc.text(`Match: ${match.config.player1Name} vs ${match.config.player2Name}`, 14, 48);
    
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
        head: [['End', match.config.player1Name, match.config.player2Name, `Total (${match.config.player1Name})`, `Total (${match.config.player2Name})`]],
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
    doc.text(`${match.config.player1Name}: ${match.p1Total} (${match.p1EndsWon} ends)`, 14, finalY + 10);
    doc.text(`${match.config.player2Name}: ${match.p2Total} (${match.p2EndsWon} ends)`, 14, finalY + 18);
    
    doc.save(`LawnBowls_Match_${new Date(match.date).toISOString().split('T')[0]}.pdf`);
  };

  const handleDeleteMatch = (matchId: string) => {
    setHistory(prev => prev.filter(m => m.id !== matchId));
  };

  const handleArchiveMatch = (matchId: string) => {
    setHistory(prev => prev.map(m => m.id === matchId ? { ...m, isArchived: !m.isArchived } : m));
    handlePlaySound('droplet');
    triggerHaptic('light');
  };

  const handleClearHistory = () => {
    setConfirmDialog({
      isOpen: true,
      title: 'Clear History',
      message: 'Are you sure you want to delete all saved match history? This cannot be undone.',
      onConfirm: () => {
        setHistory([]);
      }
    });
  };

  const handleIncrement = (index: number, player: 'player1' | 'player2', e: React.MouseEvent) => {
    e.stopPropagation();
    triggerHaptic('medium');
    handlePlaySound('sparkle');
    const newEnds = [...ends];
    const current = newEnds[index][player] === '' ? 0 : Number(newEnds[index][player]);
    newEnds[index][player] = current + 1;
    
    // In lawn bowls, only one team scores per end
    const otherPlayer = player === 'player1' ? 'player2' : 'player1';
    newEnds[index][otherPlayer] = '';
    
    setEnds(newEnds);

    // Auto-advance to next end after 1.2s of score entry inactivity
    if (autoAdvanceTimeout.current) clearTimeout(autoAdvanceTimeout.current);
    autoAdvanceTimeout.current = setTimeout(() => {
      if (index < ends.length - 1) {
        setActiveRow(index + 1);
      }
    }, 1200);
  };

  const handleDecrement = (index: number, player: 'player1' | 'player2', e: React.MouseEvent) => {
    e.stopPropagation();
    triggerHaptic('light');
    handlePlaySound('whisper');
    const newEnds = [...ends];
    const current = newEnds[index][player] === '' ? 0 : Number(newEnds[index][player]);
    if (current > 1) {
      newEnds[index][player] = current - 1;
    } else if (current === 1) {
      newEnds[index][player] = '';
    }
    setEnds(newEnds);
  };

  const handleReset = () => {
    if (window.confirm('Are you sure you want to clear all scores?')) {
      handlePlaySound('droplet');
      if (config) {
        setEnds(Array.from({ length: config.numEnds }, () => ({ player1: '', player2: '' })));
      }
      setActiveRow(null);
    }
  };

  const calculateRunningTotal = (upToIndex: number) => {
    let player1 = 0;
    let player2 = 0;
    for (let i = 0; i <= upToIndex; i++) {
      player1 += Number(ends[i].player1) || 0;
      player2 += Number(ends[i].player2) || 0;
    }
    return { player1, player2 };
  };

  if (showHistory) {
    const filteredHistory = history.filter(match => showArchivedOnly ? match.isArchived : !match.isArchived);

    return (
      <div className="min-h-screen bg-slate-50 font-sans py-12 px-4 animate-fade-in-up">
        <div className="max-w-4xl mx-auto">
          <div className="flex items-center justify-between mb-8">
            <div className="flex items-center gap-3">
              <div className="p-3 bg-primary-100 text-primary-600 rounded-xl">
                <BookOpen className="w-6 h-6" />
              </div>
              <h1 className="text-3xl font-bold text-slate-900">Match History</h1>
            </div>
            <div className="flex items-center gap-3">
              {history.length > 0 && (
                <button
                  onClick={handleClearHistory}
                  data-cuelume-press={isMuted ? undefined : "droplet"}
                  className="btn fx-10"
                  style={{ '--bink': '#ef4444', '--bsurf': '#fee2e2', padding: '10px 16px', fontSize: '12px' } as React.CSSProperties}
                >
                  <span className="btn-label flex items-center gap-1"><Trash2 className="w-4 h-4"/> Clear History</span>
                </button>
              )}
              <button
                onClick={() => { setShowHistory(false); handlePlaySound('release'); }}
                className="w-10 h-10 rounded-full bg-slate-100 hover:bg-slate-200 text-slate-600 transition-colors flex items-center justify-center hover:scale-105 active:scale-95 transition-transform shadow-sm"
                title="Close History"
              >
                <Plus className="w-5 h-5 rotate-45" />
              </button>
            </div>
          </div>

          {/* Active / Archived Tabs */}
          <div className="flex bg-slate-200/60 backdrop-blur-sm rounded-xl p-1 mb-8 max-w-[280px] border border-slate-200/80 shadow-sm animate-fade-in-up delay-100">
            <button 
              onClick={() => { setShowArchivedOnly(false); handlePlaySound('toggle'); }}
              className={`flex-1 py-2 rounded-lg text-xs font-semibold transition-all ${!showArchivedOnly ? 'bg-white shadow-sm text-slate-800' : 'text-slate-500 hover:text-slate-700'}`}
            >
              Active ({history.filter(m => !m.isArchived).length})
            </button>
            <button 
              onClick={() => { setShowArchivedOnly(true); handlePlaySound('toggle'); }}
              className={`flex-1 py-2 rounded-lg text-xs font-semibold transition-all ${showArchivedOnly ? 'bg-white shadow-sm text-slate-800' : 'text-slate-500 hover:text-slate-700'}`}
            >
              Archived ({history.filter(m => m.isArchived).length})
            </button>
          </div>

          {filteredHistory.length === 0 ? (
            <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-12 text-center text-slate-500 animate-fade-in-up delay-150">
              {showArchivedOnly ? "No archived matches." : "No matches have been saved yet. Complete a match to see it here!"}
            </div>
          ) : (
            <div className="space-y-4 animate-fade-in-up delay-150">
              {filteredHistory.map((match) => (
                <HistoryItem 
                  key={match.id} 
                  match={match} 
                  onDelete={() => handleDeleteMatch(match.id)} 
                  onArchive={() => handleArchiveMatch(match.id)} 
                  onShare={() => handleShareMatchHistory(match)}
                />
              ))}
            </div>
          )}
        </div>

        {/* Floating plus button to return / start match */}
        <div className="fixed bottom-6 right-6 sm:bottom-12 sm:right-12 z-[100] animate-fade-in-up delay-200">
          <button 
            onClick={() => { setShowHistory(false); handlePlaySound('release'); }}
            className="flex items-center justify-center w-14 h-14 bg-primary-600 hover:bg-primary-500 text-white rounded-full shadow-xl hover:scale-105 active:scale-95 transition-transform"
            title={config ? "Return to Match" : "Start New Match"}
          >
            <Plus className="w-6 h-6" />
          </button>
        </div>

        {confirmDialog?.isOpen && (
          <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
            <div className="bg-white rounded-3xl w-full max-w-sm p-6 sm:p-8 shadow-2xl animate-fade-in-up">
              <h2 className="text-2xl font-bold text-slate-900 mb-2">{confirmDialog.title}</h2>
              <p className="text-slate-600 mb-8">{confirmDialog.message}</p>
              <div className="flex gap-4">
                <button
                  onClick={() => setConfirmDialog(null)}
                  className="btn fx-10 flex-1"
                  style={{ '--bink': '#64748b', '--bsurf': '#f8fafc' } as React.CSSProperties}
                >
                  <span className="btn-label flex w-full justify-center">Cancel</span>
                </button>
                <button
                  onClick={() => {
                    confirmDialog.onConfirm();
                    setConfirmDialog(null);
                  }}
                  className="btn fx-10 flex-1"
                  style={{ '--bink': confirmDialog.title === 'Clear History' ? '#ef4444' : 'var(--color-primary-600)', '--bsurf': confirmDialog.title === 'Clear History' ? '#fee2e2' : 'var(--color-primary-50)' } as React.CSSProperties}
                >
                  <span className="btn-label flex w-full justify-center">Confirm</span>
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    );
  }

  if (!config) {
    return (
      <div className="min-h-screen bg-slate-50 font-sans py-6 sm:py-12 px-3 sm:px-4 animate-fade-in-up">
        <div className="max-w-2xl mx-auto">
          <div className="text-center mb-8 sm:mb-10 relative">
            <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-primary-100 text-primary-600 mb-3 sm:mb-4 overflow-hidden border border-slate-200 shadow-sm">
              {setupAvatar1.startsWith('data:image/') ? (
                <img src={setupAvatar1} alt="Logo" className="w-full h-full object-cover" />
              ) : (
                <Trophy className="w-8 h-8" />
              )}
            </div>
            <div className="mb-1 sm:mb-2">
              <h1 className="text-3xl sm:text-4xl font-bold text-slate-900 heading tracking-tight">LAWN BOWLS</h1>
            </div>
            <p className="text-sm text-slate-500 font-medium">Configure your upcoming match parameters.</p>
          </div>

          <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-4 sm:p-8 mb-6 sm:mb-8">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-lg sm:text-xl font-bold text-slate-800">
                Match Setup
              </h2>
              
              <div className="flex items-center gap-3">
                <div className="flex bg-slate-100 rounded-lg p-1">
                  <button 
                    onClick={() => setSetupMatchType('individual')}
                    className={`px-2.5 py-1.5 rounded-md text-xs sm:text-sm font-medium transition-colors ${setupMatchType === 'individual' ? 'bg-white shadow-sm text-slate-800' : 'text-slate-500 hover:text-slate-700'}`}
                  >
                    Singles
                  </button>
                  <button 
                    onClick={() => setSetupMatchType('team')}
                    className={`px-2.5 py-1.5 rounded-md text-xs sm:text-sm font-medium transition-colors ${setupMatchType === 'team' ? 'bg-white shadow-sm text-slate-800' : 'text-slate-500 hover:text-slate-700'}`}
                  >
                    Teams
                  </button>
                </div>
                 <button
                  onClick={() => { setShowHistory(true); handlePlaySound('bloom'); }}
                  className="p-2 rounded-full text-slate-400 hover:bg-slate-100 hover:text-slate-600 transition-colors"
                  title="Match History"
                >
                  <BookOpen className="w-5 h-5" />
                </button>
                <button
                  onClick={() => { setShowSettings(!showSettings); handlePlaySound('toggle'); }}
                  className={`p-2 rounded-full transition-colors ${showSettings ? 'bg-primary-100 text-primary-600' : 'text-slate-400 hover:bg-slate-100 hover:text-slate-600'}`}
                  title="Settings"
                >
                  <Settings className="w-5 h-5" />
                </button>
              </div>

            </div>

            {showSettings && !config && (
              <div className="bg-slate-50 rounded-xl p-4 mb-6 border border-slate-200 animate-in fade-in slide-in-from-top-2">
                <h3 className="text-sm font-bold text-slate-700 mb-4">App Settings</h3>
                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-6">
                  <div>
                    <label className="block text-xs font-semibold text-slate-500 mb-2 uppercase tracking-wider">Sound Effects</label>
                    <label className="flex items-center gap-3 cursor-pointer w-max">
                      <div className={`w-10 h-6 rounded-full p-1 transition-colors ${!isMuted ? 'bg-primary-500' : 'bg-slate-300'}`}>
                        <div className={`w-4 h-4 bg-white rounded-full transition-transform ${!isMuted ? 'translate-x-4' : 'translate-x-0'}`} />
                      </div>
                      <span className="text-sm text-slate-700 font-medium">{!isMuted ? 'Enabled' : 'Muted'}</span>
                      <input type="checkbox" className="hidden" checked={!isMuted} onChange={() => setIsMuted(!isMuted)} />
                    </label>
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-slate-500 mb-2 uppercase tracking-wider">UI Color Theme</label>
                    <div className="flex flex-wrap gap-2">
                      {['emerald', 'blue', 'purple', 'rose', 'amber'].map(t => (
                        <button
                          key={t}
                          onClick={() => { setTheme(t); handlePlaySound('toggle'); }}
                          className={`w-8 h-8 rounded-full border-2 transition-transform hover:scale-110 ${theme === t ? 'border-slate-800 scale-110 shadow-sm' : 'border-transparent'}`}
                          style={{
                            backgroundColor: 
                              t === 'emerald' ? '#10b981' : 
                              t === 'blue' ? '#3b82f6' : 
                              t === 'purple' ? '#a855f7' : 
                              t === 'rose' ? '#f43f5e' : 
                              '#f59e0b'
                          }}
                        />
                      ))}
                      {setupAvatar1.startsWith('data:image/') && customTheme && (
                        <button
                          key="custom"
                          onClick={() => { setTheme('custom'); handlePlaySound('sparkle'); }}
                          className={`w-8 h-8 rounded-full border-2 transition-transform hover:scale-110 flex items-center justify-center ${theme === 'custom' ? 'border-slate-800 scale-110 shadow-md' : 'border-transparent'}`}
                          style={{
                            background: `hsl(${customTheme.h}, ${customTheme.s}%, 50%)`
                          }}
                          title="Logo Theme"
                        >
                          <Crown className="w-3.5 h-3.5 text-white" />
                        </button>
                      )}
                    </div>
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-slate-500 mb-2 uppercase tracking-wider">Join Live Match</label>
                    {sessionCode ? (
                      <div className="flex items-center justify-between bg-white border border-slate-100 p-2 rounded-xl shadow-xs">
                        <div className="text-xs font-bold font-mono text-slate-700 tracking-wider">Code: {sessionCode}</div>
                        <button
                          type="button"
                          onClick={handleDisconnectSession}
                          className="btn fx-10 px-2 py-1 text-[10px]"
                          style={{ '--bink': '#ef4444', '--bsurf': '#fee2e2' } as React.CSSProperties}
                        >
                          <span className="btn-label">Disconnect</span>
                        </button>
                      </div>
                     ) : (
                      <div className="flex flex-col gap-2">
                        <div className="flex items-center gap-1.5">
                          <input
                            type="text"
                            maxLength={6}
                            placeholder="6-DIGIT CODE"
                            id="setupJoinSessionInput"
                            className="flex-grow px-2 py-1.5 bg-white border border-slate-200 rounded-lg text-xs font-mono text-center outline-none focus:border-primary-500 uppercase tracking-wider font-semibold text-slate-700 shadow-xs w-28"
                            onKeyDown={(e) => {
                              if (e.key === 'Enter') {
                                const input = document.getElementById('setupJoinSessionInput') as HTMLInputElement;
                                if (input) {
                                  handleJoinSession(input.value);
                                }
                              }
                            }}
                          />
                          <button
                            type="button"
                            onClick={() => {
                              const input = document.getElementById('setupJoinSessionInput') as HTMLInputElement;
                              if (input) {
                                handleJoinSession(input.value);
                              }
                            }}
                            disabled={isSyncing}
                            className="btn fx-10 px-3 py-1.5 text-xs"
                            style={{ '--bink': '#0284c7', '--bsurf': '#f0f9ff' } as React.CSSProperties}
                          >
                            <span className="btn-label">Join</span>
                          </button>
                        </div>
                        <button
                          type="button"
                          onClick={() => {
                            fetchLiveMatches();
                            setShowLiveLobbyModal(true);
                          }}
                          className="text-xs text-primary-600 hover:text-primary-700 font-semibold flex items-center gap-1 mt-1 justify-center w-full bg-primary-50/50 hover:bg-primary-50 py-1.5 rounded-lg border border-dashed border-primary-200 transition-colors"
                        >
                          <Users className="w-3.5 h-3.5" /> Browse Live Matches Lobby
                        </button>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            )}


            
            <div className="space-y-6">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-semibold text-slate-700 mb-2 flex items-center gap-1.5">
                    <Users className="w-4 h-4 text-slate-400" /> {setupMatchType === 'team' ? 'Team 1' : 'Player 1'}
                  </label>
                  <input 
                    type="text" 
                    value={setupPlayer1}
                    onChange={(e) => setSetupPlayer1(e.target.value)}
                    className="w-full px-4 py-2.5 mb-3 bg-slate-50 border border-slate-200 rounded-xl outline-none focus:border-primary-500 focus:ring-1 focus:ring-primary-500 transition-all"
                    placeholder={setupMatchType === 'team' ? 'E.g. Tigers' : 'E.g. Brod'}
                  />
                  
                  <div className="flex flex-wrap gap-2">
                    {Object.keys(ICONS).map((iconKey) => {
                      const IconComponent = ICONS[iconKey];
                      return (
                        <button
                          key={iconKey}
                          onClick={() => { setSetupAvatar1(iconKey); handlePlaySound('press'); }}
                          data-cuelume-press={isMuted ? undefined : "tick"}
                          className={`w-11 h-11 rounded-full border transition-all flex items-center justify-center hover:scale-105 active:scale-95 ${setupAvatar1 === iconKey ? 'border-primary-500 bg-primary-50 text-primary-600 shadow-sm' : 'border-slate-200 text-slate-400 hover:border-slate-300 hover:bg-slate-50'}`}
                        >
                          <IconComponent className="w-5 h-5" />
                        </button>
                      );
                    })}
                    <label
                      className={`w-11 h-11 rounded-full border border-dashed transition-all cursor-pointer flex items-center justify-center hover:scale-105 active:scale-95 ${setupAvatar1.startsWith('data:image/') ? 'border-primary-500 bg-primary-50 text-primary-600 shadow-sm border-solid' : 'border-slate-300 bg-white text-slate-400 hover:border-primary-500 hover:text-primary-600 hover:bg-primary-50/20'}`}
                      title="Upload Custom Logo"
                    >
                      <input 
                        type="file" 
                        className="hidden" 
                        accept="image/*" 
                        onChange={(e) => handleImageUpload(e, setSetupAvatar1)} 
                      />
                      {setupAvatar1.startsWith('data:image/') ? (
                        <img src={setupAvatar1} className="w-full h-full object-cover rounded-full" />
                      ) : (
                        <Plus className="w-5 h-5" />
                      )}
                    </label>
                  </div>

                </div>
                <div>
                  <label className="block text-sm font-semibold text-slate-700 mb-2 flex items-center gap-1.5">
                    <Users className="w-4 h-4 text-slate-400" /> {setupMatchType === 'team' ? 'Team 2' : 'Player 2'}
                  </label>
                  <input 
                    type="text" 
                    value={setupPlayer2}
                    onChange={(e) => setSetupPlayer2(e.target.value)}
                    className="w-full px-4 py-2.5 mb-3 bg-slate-50 border border-slate-200 rounded-xl outline-none focus:border-primary-500 focus:ring-1 focus:ring-primary-500 transition-all"
                    placeholder={setupMatchType === 'team' ? 'E.g. Lions' : 'E.g. Amigo'}
                  />
                  
                  <div className="flex flex-wrap gap-2">
                    {Object.keys(ICONS).map((iconKey) => {
                      const IconComponent = ICONS[iconKey];
                      return (
                        <button
                          key={iconKey}
                          onClick={() => { setSetupAvatar2(iconKey); handlePlaySound('press'); }}
                          data-cuelume-press={isMuted ? undefined : "tick"}
                          className={`w-11 h-11 rounded-full border transition-all flex items-center justify-center hover:scale-105 active:scale-95 ${setupAvatar2 === iconKey ? 'border-primary-500 bg-primary-50 text-primary-600 shadow-sm' : 'border-slate-200 text-slate-400 hover:border-slate-300 hover:bg-slate-50'}`}
                        >
                          <IconComponent className="w-5 h-5" />
                        </button>
                      );
                    })}
                    <label
                      className={`w-11 h-11 rounded-full border border-dashed transition-all cursor-pointer flex items-center justify-center hover:scale-105 active:scale-95 ${setupAvatar2.startsWith('data:image/') ? 'border-primary-500 bg-primary-50 text-primary-600 shadow-sm border-solid' : 'border-slate-300 bg-white text-slate-400 hover:border-primary-500 hover:text-primary-600 hover:bg-primary-50/20'}`}
                      title="Upload Custom Logo"
                    >
                      <input 
                        type="file" 
                        className="hidden" 
                        accept="image/*" 
                        onChange={(e) => handleImageUpload(e, setSetupAvatar2)} 
                      />
                      {setupAvatar2.startsWith('data:image/') ? (
                        <img src={setupAvatar2} className="w-full h-full object-cover rounded-full" />
                      ) : (
                        <Plus className="w-5 h-5" />
                      )}
                    </label>
                  </div>

                </div>
              </div>
              
              {setupMatchType === 'team' && (
                <div className="bg-slate-50 border border-slate-200 rounded-2xl p-4 sm:p-6 mb-6 sm:mb-8 animate-fade-in-up">
                  <h3 className="font-bold text-slate-800 mb-4 flex items-center gap-2 text-sm sm:text-base uppercase tracking-wider text-primary-700">
                    <Users className="w-5 h-5" /> Team Members & Positions
                  </h3>
                  
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    {/* Team 1 Positions */}
                    <div className="space-y-4">
                      <h4 className="font-bold text-slate-700 text-sm border-b pb-2 flex items-center justify-between">
                        <span>{setupPlayer1 || 'Team 1'}</span>
                        <span className="text-xs bg-primary-100 text-primary-700 px-2 py-0.5 rounded-full uppercase">Positions</span>
                      </h4>
                      <div className="space-y-3">
                        <div>
                          <label className="block text-xs text-slate-500 font-medium mb-1">Lead (First Player)</label>
                          <input 
                            type="text" 
                            value={t1Lead} 
                            onChange={(e) => setT1Lead(e.target.value)} 
                            placeholder="Lead Player Name"
                            className="w-full px-3 py-2 bg-white border border-slate-200 rounded-lg text-sm outline-none focus:border-primary-500"
                          />
                        </div>
                        <div>
                          <label className="block text-xs text-slate-500 font-medium mb-1">Second (Optional)</label>
                          <input 
                            type="text" 
                            value={t1Second} 
                            onChange={(e) => setT1Second(e.target.value)} 
                            placeholder="Second Player Name"
                            className="w-full px-3 py-2 bg-white border border-slate-200 rounded-lg text-sm outline-none focus:border-primary-500"
                          />
                        </div>
                        <div>
                          <label className="block text-xs text-slate-500 font-medium mb-1">Third (Optional)</label>
                          <input 
                            type="text" 
                            value={t1Third} 
                            onChange={(e) => setT1Third(e.target.value)} 
                            placeholder="Third Player Name"
                            className="w-full px-3 py-2 bg-white border border-slate-200 rounded-lg text-sm outline-none focus:border-primary-500"
                          />
                        </div>
                        <div>
                          <label className="block text-xs text-slate-500 font-medium mb-1">Skip (Captain / Bowls Last)</label>
                          <input 
                            type="text" 
                            value={t1Skip} 
                            onChange={(e) => setT1Skip(e.target.value)} 
                            placeholder="Skip Player Name"
                            className="w-full px-3 py-2 bg-white border border-slate-200 rounded-lg text-sm outline-none focus:border-primary-500"
                          />
                        </div>
                      </div>
                    </div>

                    {/* Team 2 Positions */}
                    <div className="space-y-4">
                      <h4 className="font-bold text-slate-700 text-sm border-b pb-2 flex items-center justify-between">
                        <span>{setupPlayer2 || 'Team 2'}</span>
                        <span className="text-xs bg-primary-100 text-primary-700 px-2 py-0.5 rounded-full uppercase">Positions</span>
                      </h4>
                      <div className="space-y-3">
                        <div>
                          <label className="block text-xs text-slate-500 font-medium mb-1">Lead (First Player)</label>
                          <input 
                            type="text" 
                            value={t2Lead} 
                            onChange={(e) => setT2Lead(e.target.value)} 
                            placeholder="Lead Player Name"
                            className="w-full px-3 py-2 bg-white border border-slate-200 rounded-lg text-sm outline-none focus:border-primary-500"
                          />
                        </div>
                        <div>
                          <label className="block text-xs text-slate-500 font-medium mb-1">Second (Optional)</label>
                          <input 
                            type="text" 
                            value={t2Second} 
                            onChange={(e) => setT2Second(e.target.value)} 
                            placeholder="Second Player Name"
                            className="w-full px-3 py-2 bg-white border border-slate-200 rounded-lg text-sm outline-none focus:border-primary-500"
                          />
                        </div>
                        <div>
                          <label className="block text-xs text-slate-500 font-medium mb-1">Third (Optional)</label>
                          <input 
                            type="text" 
                            value={t2Third} 
                            onChange={(e) => setT2Third(e.target.value)} 
                            placeholder="Third Player Name"
                            className="w-full px-3 py-2 bg-white border border-slate-200 rounded-lg text-sm outline-none focus:border-primary-500"
                          />
                        </div>
                        <div>
                          <label className="block text-xs text-slate-500 font-medium mb-1">Skip (Captain / Bowls Last)</label>
                          <input 
                            type="text" 
                            value={t2Skip} 
                            onChange={(e) => setT2Skip(e.target.value)} 
                            placeholder="Skip Player Name"
                            className="w-full px-3 py-2 bg-white border border-slate-200 rounded-lg text-sm outline-none focus:border-primary-500"
                          />
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Bowls Config */}
                  <div className="mt-6 border-t pt-4">
                    <label className="block text-xs font-semibold text-slate-500 mb-2 uppercase tracking-wider">Bowls per Player</label>
                    <div className="flex gap-2">
                      {[2, 3, 4].map(num => (
                        <button
                          key={num}
                          type="button"
                          onClick={() => setBowlsPerPlayer(num)}
                          className={`px-4 py-2 rounded-lg text-sm font-semibold transition-all ${bowlsPerPlayer === num ? 'bg-primary-600 text-white shadow-sm' : 'bg-white border border-slate-200 text-slate-600 hover:bg-slate-50'}`}
                        >
                          {num} Bowls
                        </button>
                      ))}
                    </div>
                  </div>
                </div>
              )}

              <div>
                <label className="block text-sm font-semibold text-slate-700 mb-2 flex items-center gap-1.5">
                  <Hash className="w-4 h-4 text-slate-400" /> Number of Ends (Rounds)
                </label>
                <input 
                  type="number" 
                  min="1"
                  max="100"
                  value={setupEnds}
                  onChange={(e) => setSetupEnds(parseInt(e.target.value) || 0)}
                  className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl outline-none focus:border-primary-500 focus:ring-1 focus:ring-primary-500 transition-all"
                />
              </div>

              <button 
                onClick={handleStartMatch}
                data-cuelume-press={isMuted ? undefined : "press"}
                data-cuelume-release={isMuted ? undefined : "release"}
                className="btn fx-10 w-full"
                style={{ '--bink': 'var(--color-primary-600)', '--bsurf': 'var(--color-primary-50)' } as React.CSSProperties}
              >
                <span className="btn-label flex w-full items-center justify-center text-lg">Start Match</span>
              </button>
            </div>
          </div>

        </div>
      </div>
    );
  }

  const p1Total = ends.reduce((sum, end) => sum + (Number(end.player1) || 0), 0);
  const p2Total = ends.reduce((sum, end) => sum + (Number(end.player2) || 0), 0);

  const p1EndsWon = ends.filter(end => {
    const p1 = Number(end.player1) || 0;
    const p2 = Number(end.player2) || 0;
    return p1 > p2;
  }).length;
  
  const p2EndsWon = ends.filter(end => {
    const p1 = Number(end.player1) || 0;
    const p2 = Number(end.player2) || 0;
    return p2 > p1;
  }).length;

  
  

  return (
    <div className="min-h-screen bg-slate-50 font-sans pb-12 animate-fade-in-up">
      {/* Header section with Lawn Bowls theme */}
      <div className="bg-primary-700 text-white pt-6 pb-16 px-4 rounded-b-[2rem] shadow-md">
        <div className="max-w-4xl mx-auto">
          <div className="flex justify-between items-center mb-6">
            <button 
              onClick={() => handleEndMatch()}
              data-cuelume-press={isMuted ? undefined : "press"}
              className="btn fx-10"
              style={{ '--bink': 'var(--color-primary-100)', '--bsurf': 'var(--color-primary-900)' } as React.CSSProperties}
            >
              <span className="btn-label flex items-center gap-1">&larr; Setup</span>
            </button>

            {sessionCode && (
              <div className="flex items-center gap-2 bg-primary-900/50 px-3.5 py-1.5 rounded-full border border-white/10 shadow-sm">
                <span className="relative flex h-2 w-2">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                  <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
                </span>
                <span className="text-xs font-bold tracking-wider font-mono">LIVE: {sessionCode}</span>
                <button
                  type="button"
                  onClick={() => {
                    const url = `${window.location.origin}${window.location.pathname}?session=${sessionCode}`;
                    navigator.clipboard.writeText(url);
                    handlePlaySound('sparkle');
                    triggerHaptic('success');
                    alert("Shareable live session link copied!");
                  }}
                  className="ml-1 text-primary-200 hover:text-white transition-colors"
                  title="Copy Live Link"
                >
                  <Copy className="w-3.5 h-3.5" />
                </button>
              </div>
            )}

          {/* Spectator avatar upload strip */}
          {sessionCode && !isHost && (
            <div className="mt-3 flex items-center gap-2 bg-primary-900/40 border border-white/10 rounded-2xl px-3 py-2">
              <label className="flex items-center gap-2 cursor-pointer flex-1">
                <input
                  type="file"
                  accept="image/*"
                  className="hidden"
                  onChange={(e) => handleImageUpload(e, (dataUrl) => {
                    // Apply color theme from spectator's own avatar locally only
                    const img = new window.Image();
                    img.onload = () => {
                      const canvas = document.createElement('canvas');
                      canvas.width = 50; canvas.height = 50;
                      const ctx = canvas.getContext('2d');
                      if (!ctx) return;
                      ctx.drawImage(img, 0, 0, 50, 50);
                      const d = ctx.getImageData(0, 0, 50, 50).data;
                      let r = 0, g = 0, b = 0, count = 0;
                      for (let i = 0; i < d.length; i += 16) {
                        if (d[i+3] > 128) { r += d[i]; g += d[i+1]; b += d[i+2]; count++; }
                      }
                      if (count > 0) {
                        r = Math.round(r/count); g = Math.round(g/count); b = Math.round(b/count);
                        const max = Math.max(r,g,b)/255, min = Math.min(r,g,b)/255;
                        const l = (max+min)/2;
                        const s = max===min ? 0 : l>0.5 ? (max-min)/(2-max-min) : (max-min)/(max+min);
                        let h = 0;
                        if (max !== min) {
                          const d2 = max-min;
                          if (max===r/255) h=((g/255-b/255)/d2+6)%6;
                          else if (max===g/255) h=(b/255-r/255)/d2+2;
                          else h=(r/255-g/255)/d2+4;
                          h = Math.round(h*60);
                        }
                        applyCustomTheme(h, Math.round(s*100));
                        setTheme('custom');
                      }
                    };
                    img.src = dataUrl;
                  })}
                />
                <Camera className="w-4 h-4 text-primary-200" />
                <span className="text-xs text-primary-200 font-semibold">Upload your logo to theme your view</span>
              </label>
            </div>
          )}
          </div>
          <div className="flex flex-col items-center">
            {config.player1Avatar.startsWith('data:image/') ? (
              <img src={config.player1Avatar} alt="Logo" className="w-16 h-16 mb-2 object-cover rounded-full shadow-md border border-white/20" />
            ) : (
              <Trophy className="w-10 h-10 mb-2 opacity-80" />
            )}
            <h1 className="text-2xl font-bold tracking-wide mb-8 heading">LAWN BOWLS MATCH</h1>
          </div>
 
          {/* Match Scoreboard */}
          <div className="flex w-full justify-between items-center bg-primary-800/50 rounded-2xl p-4 sm:p-6 backdrop-blur-sm border border-primary-600/30">
            {/* Player 1 Score */}
            <div className={`flex flex-col items-center flex-1 transition-all ${p1Total > p2Total ? 'scale-110 drop-shadow-lg' : 'opacity-80'}`}>
              <label className="w-12 h-12 rounded-full bg-primary-900/50 flex items-center justify-center mb-3 cursor-pointer hover:bg-primary-900/70 hover:scale-105 active:scale-95 transition-all relative overflow-hidden" title="Tap to upload player/team photo">
                <input 
                  type="file" 
                  className="hidden" 
                  accept="image/*" 
                  onChange={(e) => handleScoreboardAvatarUpload(e, 'player1')} 
                />
                <AvatarDisplay avatar={config.player1Avatar} className={`w-6 h-6 ${p1Total > p2Total ? "text-amber-400" : "text-primary-100"}`} />
              </label>
              <div className="flex items-center gap-2 mb-1">
                {p1Total > p2Total && p1Total > 0 && <Crown className="w-4 h-4 text-amber-400" />}
                <span className={`text-primary-100 text-sm font-medium uppercase tracking-widest truncate max-w-[120px] sm:max-w-[180px] ${p1Total > p2Total ? 'text-amber-300 font-bold' : ''}`}>
                  {config.player1Name}
                </span>
              </div>
              <BumpNumber value={p1Total} className={`text-5xl font-bold ${p1Total > p2Total ? 'text-white' : ''}`} />
              <span className="text-primary-200/70 text-xs mt-2">{p1EndsWon} Ends</span>
            </div>
 
            <div className="flex flex-col items-center px-4">
              <span className="text-primary-300/50 text-sm font-semibold">VS</span>
            </div>
 
            {/* Player 2 Score */}
            <div className={`flex flex-col items-center flex-1 transition-all ${p2Total > p1Total ? 'scale-110 drop-shadow-lg' : 'opacity-80'}`}>
              <label className="w-12 h-12 rounded-full bg-primary-900/50 flex items-center justify-center mb-3 cursor-pointer hover:bg-primary-900/70 hover:scale-105 active:scale-95 transition-all relative overflow-hidden" title="Tap to upload player/team photo">
                <input 
                  type="file" 
                  className="hidden" 
                  accept="image/*" 
                  onChange={(e) => handleScoreboardAvatarUpload(e, 'player2')} 
                />
                <AvatarDisplay avatar={config.player2Avatar} className={`w-6 h-6 ${p2Total > p1Total ? "text-amber-400" : "text-primary-100"}`} />
              </label>
              <div className="flex items-center gap-2 mb-1">
                {p2Total > p1Total && p2Total > 0 && <Crown className="w-4 h-4 text-amber-400" />}
                <span className={`text-primary-100 text-sm font-medium uppercase tracking-widest truncate max-w-[120px] sm:max-w-[180px] ${p2Total > p1Total ? 'text-amber-300 font-bold' : ''}`}>
                  {config.player2Name}
                </span>
              </div>
              <BumpNumber value={p2Total} className={`text-5xl font-bold ${p2Total > p1Total ? 'text-white' : ''}`} />
              <span className="text-primary-200/70 text-xs mt-2">{p2EndsWon} Ends</span>
            </div>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="max-w-4xl mx-auto px-4 -mt-8 relative z-10 space-y-6">
        
        {/* Bowls Turn Tracker (Only for Team Matches) */}
        {config.matchType === 'team' && activeRow !== null && (() => {
          const sequence = getTurnSequence(config, startTeamForCurrentEnd);
          const hasPlayers = sequence.length > 0;
          if (!hasPlayers) return null;

          const currentTurn = currentBowlIndex < sequence.length ? sequence[currentBowlIndex] : null;
          const nextTurn = currentBowlIndex + 1 < sequence.length ? sequence[currentBowlIndex + 1] : null;
          const totalBowls = config.bowlsPerPlayer || 2;
          const endDirection = (activeRow % 2 === 0) ? 'Playing North → South' : 'Playing South → North';

          return (
            <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-6 animate-fade-in-up">
              {/* Tracker Header */}
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-100 pb-4 mb-5">
                <div>
                  <h3 className="font-bold text-slate-800 text-base sm:text-lg flex items-center gap-2">
                    <Users className="w-5 h-5 text-primary-600" /> End {activeRow + 1} Turn Tracker
                  </h3>
                  <p className="text-xs text-slate-500 font-medium mt-1 flex items-center gap-1.5">
                    <span className="inline-block w-2 h-2 rounded-full bg-primary-500 animate-pulse"></span>
                    {endDirection}
                  </p>
                </div>
                
                <button
                  type="button"
                  onClick={() => {
                    setStartTeamForCurrentEnd(prev => prev === 'team1' ? 'team2' : 'team1');
                    setCurrentBowlIndex(0);
                    handlePlaySound('toggle');
                    triggerHaptic('light');
                  }}
                  className="px-3 py-1.5 rounded-lg text-xs font-semibold bg-slate-50 border border-slate-200 text-slate-600 hover:bg-slate-100 hover:text-primary-600 transition-colors shadow-sm w-max"
                >
                  Starts: {startTeamForCurrentEnd === 'team1' ? config.player1Name : config.player2Name} (Toggle)
                </button>
              </div>

              {/* Tracker Body */}
              {currentTurn ? (
                <div>
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-6 mb-6">
                    <div className="flex items-center gap-4">
                      {/* Winner-style Avatar */}
                      <div className="w-16 h-16 rounded-full overflow-hidden border-2 border-primary-500/20 shadow-md bg-primary-50 flex items-center justify-center flex-shrink-0">
                        <AvatarDisplay avatar={currentTurn.avatar} className="w-10 h-10 object-cover" />
                      </div>
                      <div>
                        <div className="text-xs font-semibold text-slate-500 uppercase tracking-widest">{currentTurn.teamName} &bull; {currentTurn.position}</div>
                        <h4 className="text-xl font-bold text-slate-800 mt-0.5">{currentTurn.playerName}</h4>
                        
                        {/* Bowl indicators (dots) */}
                        <div className="flex items-center gap-1.5 mt-2">
                          {Array.from({ length: totalBowls }).map((_, i) => {
                            const isFilled = i < currentTurn.bowlNum;
                            return (
                              <div 
                                key={i} 
                                className={`w-3 h-3 rounded-full border transition-all ${isFilled ? 'bg-primary-600 border-primary-600 scale-110 shadow-sm' : 'bg-slate-100 border-slate-300'}`}
                                title={`Bowl ${i + 1}`}
                              />
                            );
                          })}
                          <span className="text-xs text-slate-500 font-semibold ml-1.5">Bowl {currentTurn.bowlNum} of {totalBowls}</span>
                        </div>
                      </div>
                    </div>

                    {/* Actions */}
                    <div className="flex flex-wrap gap-2.5 sm:w-auto w-full">
                      {currentBowlIndex > 0 && (
                        <button
                          type="button"
                          onClick={() => {
                            setCurrentBowlIndex(prev => prev - 1);
                            handlePlaySound('whisper');
                            triggerHaptic('light');
                          }}
                          className="px-3.5 py-2 rounded-xl text-sm font-semibold border border-slate-200 text-slate-600 hover:bg-slate-50 active:scale-95 transition-all flex-1 sm:flex-initial"
                        >
                          Undo
                        </button>
                      )}
                      
                      <button
                        type="button"
                        onClick={() => {
                          setCurrentBowlIndex(prev => prev + 1);
                          handlePlaySound('tick');
                          triggerHaptic('medium');
                        }}
                        className="px-5 py-2.5 rounded-xl text-sm font-bold bg-primary-600 text-white hover:bg-primary-500 shadow-md hover:scale-105 active:scale-95 transition-all flex-1 sm:flex-initial"
                      >
                        Deliver Bowl
                      </button>
                      
                      <button
                        type="button"
                        onClick={() => {
                          setCurrentBowlIndex(sequence.length);
                          handlePlaySound('bloom');
                          triggerHaptic('success');
                        }}
                        className="px-3.5 py-2 rounded-xl text-sm font-semibold border border-slate-200 text-slate-500 hover:text-red-500 hover:bg-slate-50 active:scale-95 transition-all flex-1 sm:flex-initial"
                      >
                        Skip
                      </button>
                    </div>
                  </div>

                  {/* Turn Footer / Preview */}
                  {nextTurn && (
                    <div className="bg-slate-50 rounded-xl px-4 py-2 text-xs text-slate-500 border border-slate-100 flex items-center justify-between">
                      <span className="font-semibold text-slate-400">NEXT TURN</span>
                      <span className="font-bold text-slate-700">{nextTurn.playerName} ({nextTurn.teamName} - {nextTurn.position})</span>
                    </div>
                  )}
                </div>
              ) : (
                <div className="text-center py-4">
                  <div className="inline-flex items-center justify-center w-12 h-12 rounded-full bg-primary-50 text-primary-600 mb-2 border border-primary-100">
                    <Check className="w-6 h-6" />
                  </div>
                  <h4 className="font-bold text-slate-800 text-base">All bowls delivered for End {activeRow + 1}!</h4>
                  <p className="text-xs text-slate-500 mt-1 mb-4">Enter the final score in the scorecard below.</p>
                  
                  <div className="flex justify-center gap-3">
                    <button
                      type="button"
                      onClick={() => {
                        setCurrentBowlIndex(0);
                        handlePlaySound('toggle');
                        triggerHaptic('light');
                      }}
                      className="px-4 py-2 rounded-xl text-xs font-semibold border border-slate-200 text-slate-600 hover:bg-slate-50 transition-all"
                    >
                      Reset Turn Tracker
                    </button>
                  </div>
                </div>
              )}
            </div>
          );
        })()}

        <div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-slate-100 text-slate-500 text-xs uppercase tracking-wider">
                  <th className="py-4 px-4 font-semibold w-16 text-center">End</th>
                  <th className="py-4 px-4 font-semibold text-center w-24 sm:w-32 truncate">{config.player1Name}</th>
                  <th className="py-4 px-4 font-semibold text-center w-24 sm:w-32 truncate">{config.player2Name}</th>
                  <th className="py-4 px-4 font-semibold text-right">Running Total</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-slate-800">
                {ends.map((end, index) => {
                  const { player1: rP1, player2: rP2 } = calculateRunningTotal(index);
                  const isStarted = rP1 > 0 || rP2 > 0 || end.player1 !== '' || end.player2 !== '';
                  const isActive = activeRow === index;

                  return (
                    <tr
                      key={index}
                      onClick={() => setActiveRow(index)}
                      className={`transition-colors cursor-pointer ${
                        isActive
                          ? 'bg-primary-50 ring-1 ring-inset ring-primary-200'
                          : 'hover:bg-slate-50'
                      }`}
                    >
                      <td className="py-3 px-4 font-medium text-slate-400 text-center">
                        {index + 1}
                      </td>
                      <td className="py-2 px-2 text-center h-[60px]">
                        {isActive ? (
                          <div className="flex items-center justify-center gap-1 sm:gap-2">
                            <button
                              onClick={(e) => handleDecrement(index, 'player1', e)}
                              data-cuelume-press={isMuted ? undefined : "whisper"}
                              className="w-7 h-7 sm:w-8 sm:h-8 rounded-full bg-white border border-slate-200 text-slate-500 hover:bg-slate-50 hover:text-primary-600 flex items-center justify-center active:bg-slate-100 transition-colors"
                            >
                              <Minus className="w-4 h-4" />
                            </button>
                            <BumpNumber 
                              value={end.player1 !== '' ? Number(end.player1) : 0} 
                              displayValue={end.player1 !== '' ? end.player1 : '-'}
                              className="w-4 sm:w-6 text-base sm:text-lg font-bold text-center" 
                            />
                            <button
                              onClick={(e) => handleIncrement(index, 'player1', e)}
                              data-cuelume-press={isMuted ? undefined : "tick"}
                              className="w-7 h-7 sm:w-8 sm:h-8 rounded-full bg-primary-600 text-white shadow-sm hover:bg-primary-500 flex items-center justify-center active:bg-primary-700 transition-colors"
                            >
                              <Plus className="w-4 h-4" />
                            </button>
                          </div>
                        ) : (
                          <span className="text-lg font-semibold text-slate-800">
                            {end.player1 !== '' ? end.player1 : '-'}
                          </span>
                        )}
                      </td>
                      <td className="py-2 px-2 text-center h-[60px]">
                        {isActive ? (
                          <div className="flex items-center justify-center gap-1 sm:gap-2">
                            <button
                              onClick={(e) => handleDecrement(index, 'player2', e)}
                              data-cuelume-press={isMuted ? undefined : "whisper"}
                              className="w-7 h-7 sm:w-8 sm:h-8 rounded-full bg-white border border-slate-200 text-slate-500 hover:bg-slate-50 hover:text-primary-600 flex items-center justify-center active:bg-slate-100 transition-colors"
                            >
                              <Minus className="w-4 h-4" />
                            </button>
                            <BumpNumber 
                              value={end.player2 !== '' ? Number(end.player2) : 0} 
                              displayValue={end.player2 !== '' ? end.player2 : '-'}
                              className="w-4 sm:w-6 text-base sm:text-lg font-bold text-center" 
                            />
                            <button
                              onClick={(e) => handleIncrement(index, 'player2', e)}
                              data-cuelume-press={isMuted ? undefined : "tick"}
                              className="w-7 h-7 sm:w-8 sm:h-8 rounded-full bg-primary-600 text-white shadow-sm hover:bg-primary-500 flex items-center justify-center active:bg-primary-700 transition-colors"
                            >
                              <Plus className="w-4 h-4" />
                            </button>
                          </div>
                        ) : (
                          <span className="text-lg font-semibold text-slate-800">
                            {end.player2 !== '' ? end.player2 : '-'}
                          </span>
                        )}
                      </td>
                      <td className="py-3 px-4 text-right">
                        <div className="flex justify-end items-center gap-2 font-mono text-sm">
                          <span className={`${isStarted && rP1 > rP2 ? 'font-bold text-primary-600' : 'text-slate-600'}`}>
                            {isStarted ? rP1 : '-'}
                          </span>
                          <span className="text-slate-300">vs</span>
                          <span className={`${isStarted && rP2 > rP1 ? 'font-bold text-primary-600' : 'text-slate-600'}`}>
                            {isStarted ? rP2 : '-'}
                          </span>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      </div>
      {showSettings && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center bg-slate-900/40 backdrop-blur-sm p-4">
          <div className="bg-white rounded-3xl shadow-xl w-full max-w-sm p-6 sm:p-8 animate-in fade-in zoom-in duration-300 relative">
            <button 
              onClick={() => setShowSettings(false)}
              className="absolute top-6 right-6 text-slate-400 hover:text-slate-600 transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
            
            <h3 className="text-xl font-bold text-slate-800 flex items-center gap-2 mb-6">
              <Settings className="w-5 h-5 text-primary-600" /> App Settings
            </h3>
            <div className="space-y-6">
              <div>
                <label className="block text-xs font-semibold text-slate-500 mb-2 uppercase tracking-wider">Sound Effects</label>
                <label className="flex items-center gap-3 cursor-pointer w-max">
                  <div className={`w-12 h-7 rounded-full p-1 transition-colors ${!isMuted ? 'bg-primary-500' : 'bg-slate-300'}`}>
                    <div className={`w-5 h-5 bg-white rounded-full transition-transform shadow-sm ${!isMuted ? 'translate-x-5' : 'translate-x-0'}`} />
                  </div>
                  <span className="text-sm text-slate-700 font-medium">{!isMuted ? 'Enabled' : 'Muted'}</span>
                  <input type="checkbox" className="hidden" checked={!isMuted} onChange={() => setIsMuted(!isMuted)} />
                </label>
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-500 mb-2 uppercase tracking-wider">Haptic Feedback (Vibrations)</label>
                <label className="flex items-center gap-3 cursor-pointer w-max">
                  <div className={`w-12 h-7 rounded-full p-1 transition-colors ${isVibrationEnabled ? 'bg-primary-500' : 'bg-slate-300'}`}>
                    <div className={`w-5 h-5 bg-white rounded-full transition-transform shadow-sm ${isVibrationEnabled ? 'translate-x-5' : 'translate-x-0'}`} />
                  </div>
                  <span className="text-sm text-slate-700 font-medium">{isVibrationEnabled ? 'Enabled' : 'Disabled'}</span>
                  <input type="checkbox" className="hidden" checked={isVibrationEnabled} onChange={() => setIsVibrationEnabled(!isVibrationEnabled)} />
                </label>
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-500 mb-2 uppercase tracking-wider">UI Color Theme</label>
                <div className="flex flex-wrap gap-3">
                  {['emerald', 'blue', 'purple', 'rose', 'amber'].map(t => (
                    <button
                      key={t}
                      onClick={() => setTheme(t)}
                      className={`w-10 h-10 rounded-full border-2 transition-transform hover:scale-110 ${theme === t ? 'border-slate-800 scale-110 shadow-md' : 'border-transparent shadow-sm'}`}
                      style={{
                        backgroundColor: 
                          t === 'emerald' ? '#10b981' : 
                          t === 'blue' ? '#3b82f6' : 
                          t === 'purple' ? '#a855f7' : 
                          t === 'rose' ? '#f43f5e' : 
                          '#f59e0b'
                      }}
                    />
                  ))}
                  {(config ? config.player1Avatar : setupAvatar1).startsWith('data:image/') && customTheme && (
                    <button
                      key="custom"
                      onClick={() => setTheme('custom')}
                      className={`w-10 h-10 rounded-full border-2 transition-transform hover:scale-110 flex items-center justify-center ${theme === 'custom' ? 'border-slate-800 scale-110 shadow-md' : 'border-transparent'}`}
                      style={{
                        background: `hsl(${customTheme.h}, ${customTheme.s}%, 50%)`
                      }}
                      title="Logo Theme"
                    >
                      <Crown className="w-4 h-4 text-white" />
                    </button>
                  )}
                </div>
              </div>
            </div>

            {/* Live Session Sync inside Settings */}
            <div className="border-t pt-6 mt-6">
              {config ? (
                // Inside an active match (Host/Share/Disconnect controls)
                <div>
                  <label className="block text-xs font-semibold text-slate-500 mb-3 uppercase tracking-wider flex items-center gap-1.5">
                    <Users className="w-4 h-4 text-slate-400" /> Live Sync Session
                  </label>
                  {sessionCode ? (
                    <div className="bg-slate-50 border border-slate-200 rounded-2xl p-4">
                      <div className="flex items-center justify-between gap-3">
                        <div>
                          <span className="text-[10px] text-slate-400 uppercase font-bold tracking-wider">Session Code</span>
                          <div className="text-lg font-bold font-mono text-slate-800 tracking-wider">{sessionCode}</div>
                        </div>
                        <div className="flex items-center gap-2">
                          <button
                            type="button"
                            onClick={() => {
                              const url = `${window.location.origin}${window.location.pathname}?session=${sessionCode}`;
                              navigator.clipboard.writeText(url);
                              handlePlaySound('sparkle');
                              triggerHaptic('success');
                              alert("Link copied!");
                            }}
                            className="btn fx-10 text-xs"
                            style={{ '--bink': 'var(--color-primary-600)', '--bsurf': 'var(--color-primary-50)', padding: '6px 12px' } as React.CSSProperties}
                          >
                            <span className="btn-label flex items-center gap-1"><Copy className="w-3.5 h-3.5" /> Share</span>
                          </button>
                          <button
                            type="button"
                            onClick={handleDisconnectSession}
                            className="btn fx-10 text-xs"
                            style={{ '--bink': '#ef4444', '--bsurf': '#fee2e2', padding: '6px 12px' } as React.CSSProperties}
                          >
                            <span className="btn-label">Disconnect</span>
                          </button>
                        </div>
                      </div>
                    </div>
                  ) : (
                    <div className="flex flex-col gap-3">
                      <button
                        type="button"
                        onClick={handleHostSession}
                        disabled={isSyncing}
                        className="btn fx-10 w-full py-2"
                        style={{ '--bink': 'var(--color-primary-600)', '--bsurf': 'var(--color-primary-50)' } as React.CSSProperties}
                      >
                        <span className="btn-label">{isSyncing ? "Connecting..." : "Host Live Session"}</span>
                      </button>
                    </div>
                  )}
                </div>
              ) : (
                // On the Home Screen Settings (Render the card box for joining!)
                <div className="bg-slate-50 border border-slate-200 rounded-2xl p-4 sm:p-5">
                  <h3 className="font-bold text-slate-800 flex items-center gap-2 text-sm uppercase tracking-wider text-primary-700 mb-2">
                    <Users className="w-5 h-5" /> Live Multiplayer Sessions
                  </h3>
                  <p className="text-xs text-slate-500 mb-4 leading-relaxed">
                    Sync your scoreboard with opponent devices in real-time. Share your game and logos seamlessly!
                  </p>

                  {sessionCode ? (
                    <div className="flex items-center justify-between bg-white border border-slate-100 p-3 rounded-xl shadow-sm">
                      <div>
                        <span className="text-[10px] text-slate-400 uppercase font-bold tracking-wider">Connected Live Code</span>
                        <div className="text-base font-bold font-mono text-slate-800 tracking-wider">{sessionCode}</div>
                      </div>
                      <button
                        type="button"
                        onClick={handleDisconnectSession}
                        className="btn fx-10 text-xs"
                        style={{ '--bink': '#ef4444', '--bsurf': '#fee2e2', padding: '6px 12px' } as React.CSSProperties}
                      >
                        <span className="btn-label">Disconnect</span>
                      </button>
                    </div>
                  ) : (
                    <div className="flex items-center gap-2">
                      <input
                        type="text"
                        maxLength={6}
                        placeholder="ENTER 6-DIGIT CODE"
                        id="settingsJoinSessionInput"
                        className="flex-grow px-3 py-2.5 bg-white border border-slate-200 rounded-xl text-sm font-mono text-center outline-none focus:border-primary-500 uppercase tracking-wider shadow-sm font-semibold text-slate-700"
                        onKeyDown={(e) => {
                          if (e.key === 'Enter') {
                            const input = document.getElementById('settingsJoinSessionInput') as HTMLInputElement;
                            if (input) {
                              handleJoinSession(input.value);
                              setShowSettings(false);
                            }
                          }
                        }}
                      />
                      <button
                        type="button"
                        onClick={() => {
                          const input = document.getElementById('settingsJoinSessionInput') as HTMLInputElement;
                          if (input) {
                            handleJoinSession(input.value);
                            setShowSettings(false);
                          }
                        }}
                        disabled={isSyncing}
                        className="btn fx-10 text-sm"
                        style={{ '--bink': '#0284c7', '--bsurf': '#f0f9ff', padding: '8px 16px' } as React.CSSProperties}
                      >
                        <span className="btn-label">Join</span>
                      </button>
                    </div>
                  )}
                </div>
              )}
              
              {liveSessionError && (
                <div className="mt-2.5 text-[10px] text-red-500 font-semibold bg-red-50 border border-red-100 rounded-lg p-2">
                  ⚠️ {liveSessionError}
                </div>
              )}
            </div>

            <div className="mt-8 flex justify-end">
              <button onClick={() => setShowSettings(false)} className="btn fx-10 w-full sm:w-auto" style={{ '--bink': '#64748b', '--bsurf': '#f8fafc', padding: '10px 24px' } as React.CSSProperties}>
                <span className="btn-label">Done</span>
              </button>
            </div>
          </div>
        </div>
      )}
      {showSummaryModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 backdrop-blur-sm p-4">
          <div className="bg-white rounded-3xl shadow-xl w-full max-w-sm overflow-hidden animate-in fade-in zoom-in duration-300">
            <div className="bg-primary-600 px-6 py-8 text-center text-white relative flex flex-col items-center justify-center">
              <button 
                onClick={() => setShowSummaryModal(false)}
                className="absolute top-4 right-4 text-primary-200 hover:text-white transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
              {p1Total > p2Total ? (
                <>
                  <div className="w-16 h-16 rounded-full overflow-hidden border-2 border-white/20 mb-3 shadow-md bg-primary-700 flex items-center justify-center">
                    <AvatarDisplay avatar={config.player1Avatar} className="w-10 h-10 object-cover" />
                  </div>
                  <h2 className="text-2xl font-bold mb-1 truncate max-w-[240px]">{config.player1Name}</h2>
                  <p className="text-amber-300 font-bold uppercase tracking-wider text-sm flex items-center gap-1.5 justify-center"><Crown className="w-4 h-4" /> WINS!</p>
                </>
              ) : p2Total > p1Total ? (
                <>
                  <div className="w-16 h-16 rounded-full overflow-hidden border-2 border-white/20 mb-3 shadow-md bg-primary-700 flex items-center justify-center">
                    <AvatarDisplay avatar={config.player2Avatar} className="w-10 h-10 object-cover" />
                  </div>
                  <h2 className="text-2xl font-bold mb-1 truncate max-w-[240px]">{config.player2Name}</h2>
                  <p className="text-amber-300 font-bold uppercase tracking-wider text-sm flex items-center gap-1.5 justify-center"><Crown className="w-4 h-4" /> WINS!</p>
                </>
              ) : (
                <>
                  <Trophy className="w-12 h-12 mx-auto mb-3 text-primary-100" />
                  <h2 className="text-2xl font-bold mb-1">Match Complete!</h2>
                  <p className="text-primary-100/90 text-sm">{config.numEnds} Ends Played</p>
                </>
              )}
            </div>
            
            <div className="p-6">
              <div className="flex justify-between items-end mb-6">
                <div className="text-center flex-1 flex flex-col items-center">
                  <div className={`w-10 h-10 rounded-full flex items-center justify-center mb-2 ${p1Total > p2Total ? 'bg-amber-100 text-amber-600' : 'bg-slate-100 text-slate-400'}`}>
                    <AvatarDisplay avatar={config.player1Avatar} className="w-5 h-5" />
                  </div>
                  <div className="text-xs font-semibold text-slate-500 uppercase tracking-widest mb-1 truncate px-2">{config.player1Name}</div>
                  <div className={`text-4xl font-bold ${p1Total > p2Total ? 'text-primary-600' : 'text-slate-700'}`}>{p1Total}</div>
                </div>
                <div className="text-slate-300 font-semibold mb-2">VS</div>
                <div className="text-center flex-1 flex flex-col items-center">
                  <div className={`w-10 h-10 rounded-full flex items-center justify-center mb-2 ${p2Total > p1Total ? 'bg-amber-100 text-amber-600' : 'bg-slate-100 text-slate-400'}`}>
                    <AvatarDisplay avatar={config.player2Avatar} className="w-5 h-5" />
                  </div>
                  <div className="text-xs font-semibold text-slate-500 uppercase tracking-widest mb-1 truncate px-2">{config.player2Name}</div>
                  <div className={`text-4xl font-bold ${p2Total > p1Total ? 'text-primary-600' : 'text-slate-700'}`}>{p2Total}</div>
                </div>
              </div>
              
              <div className="bg-slate-50 rounded-xl p-4 border border-slate-100 mb-6">
                <div className="text-center text-sm text-slate-600">
                  {p1Total > p2Total ? (
                    <span className="font-bold text-slate-800">{config.player1Name} wins by {p1Total - p2Total} shots!</span>
                  ) : p2Total > p1Total ? (
                    <span className="font-bold text-slate-800">{config.player2Name} wins by {p2Total - p1Total} shots!</span>
                  ) : (
                    <span className="font-bold text-slate-800">It's a draw!</span>
                  )}
                </div>
              </div>

              <div className="flex flex-col gap-5 pt-2">
                <button 
                  onClick={() => setShowSummaryModal(false)}
                  data-cuelume-press={isMuted ? undefined : "chime"}
                  className="btn fx-10 w-full"
                  style={{ '--bink': 'var(--color-primary-600)', '--bsurf': 'var(--color-primary-50)', padding: '12px 16px' } as React.CSSProperties}
                >
                  <span className="btn-label flex w-full justify-center text-center">Review Scorecard</span>
                </button>

                <button 
                  onClick={handleShareScorecard}
                  data-cuelume-press={isMuted ? undefined : "chime"}
                  className="btn fx-10 w-full"
                  style={{ '--bink': '#0284c7', '--bsurf': '#f0f9ff', padding: '12px 16px' } as React.CSSProperties}
                >
                  <span className="btn-label flex w-full justify-center text-center items-center gap-2"><Share2 className="w-4 h-4" /> Share Match</span>
                </button>

                <button 
                  onClick={() => {
                    setShowSummaryModal(false);
                    handleEndMatch(true);
                  }}
                  data-cuelume-press={isMuted ? undefined : "press"}
                  className="btn fx-10 w-full"
                  style={{ '--bink': '#64748b', '--bsurf': '#f8fafc', padding: '12px 16px' } as React.CSSProperties}
                >
                  <span className="btn-label flex w-full justify-center text-center">New Match</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
      {showLiveLobbyModal && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl w-full max-w-lg p-6 sm:p-8 shadow-2xl overflow-hidden flex flex-col max-h-[90vh] animate-in fade-in zoom-in duration-300">
            <div className="flex items-center justify-between border-b pb-4 mb-4">
              <h2 className="text-xl font-bold text-slate-800 flex items-center gap-2">
                <span className="relative flex h-3.5 w-3.5">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                  <span className="relative inline-flex rounded-full h-3.5 w-3.5 bg-emerald-500"></span>
                </span>
                Live Match Lobby
              </h2>
              <button 
                onClick={() => setShowLiveLobbyModal(false)}
                className="p-1 rounded-full hover:bg-slate-100 transition-colors"
              >
                <X className="w-5 h-5 text-slate-400 hover:text-slate-600" />
              </button>
            </div>

            <div className="flex-grow overflow-y-auto space-y-6 pr-1">
              {/* Active Sync Status */}
              <div className="bg-slate-50 border border-slate-200 rounded-2xl p-4">
                <h3 className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-2.5">Your Match Status</h3>
                {sessionCode ? (
                  <div className="flex items-center justify-between gap-3">
                    <div>
                      <span className="text-[10px] text-slate-400 uppercase font-semibold">Active Sync Code</span>
                      <div className="text-lg font-bold font-mono text-slate-800 tracking-wider">{sessionCode}</div>
                    </div>
                    <div className="flex items-center gap-2">
                      <button
                        type="button"
                        onClick={() => {
                          const url = `${window.location.origin}${window.location.pathname}?session=${sessionCode}`;
                          navigator.clipboard.writeText(url);
                          handlePlaySound('sparkle');
                          triggerHaptic('success');
                          alert("Shareable live session link copied!");
                        }}
                        className="btn fx-10 px-3 py-1.5 text-xs"
                        style={{ '--bink': 'var(--color-primary-600)', '--bsurf': 'var(--color-primary-50)' } as React.CSSProperties}
                      >
                        <span className="btn-label flex items-center gap-1.5"><Copy className="w-3.5 h-3.5" /> Share</span>
                      </button>
                      <button
                        type="button"
                        onClick={() => {
                          handleDisconnectSession();
                          setShowLiveLobbyModal(false);
                        }}
                        className="btn fx-10 px-3 py-1.5 text-xs"
                        style={{ '--bink': '#ef4444', '--bsurf': '#fee2e2' } as React.CSSProperties}
                      >
                        <span className="btn-label">Disconnect</span>
                      </button>
                    </div>
                  </div>
                ) : (
                  <div className="flex items-center justify-between gap-3">
                    <p className="text-xs text-slate-500">Your match is currently local-only.</p>
                    {config && (
                      <button
                        type="button"
                        onClick={() => {
                          handleHostSession();
                        }}
                        disabled={isSyncing}
                        className="btn fx-10 px-4 py-2 text-xs"
                        style={{ '--bink': 'var(--color-primary-600)', '--bsurf': 'var(--color-primary-50)' } as React.CSSProperties}
                      >
                        <span className="btn-label">{isSyncing ? "Going Live..." : "Go Live"}</span>
                      </button>
                    )}
                  </div>
                )}
              </div>

              {/* Lobby List */}
              <div>
                <div className="flex items-center justify-between mb-3">
                  <h3 className="text-xs font-bold text-slate-500 uppercase tracking-wider">All Active Live Matches</h3>
                  <div className="flex items-center gap-2">
                    <button 
                      onClick={fetchLiveMatches}
                      disabled={isLoadingLiveMatches}
                      className="text-xs text-primary-600 hover:text-primary-700 font-semibold flex items-center gap-1 bg-primary-50 hover:bg-primary-100/75 px-2 py-1 rounded-md transition-colors"
                    >
                      🔄 {isLoadingLiveMatches ? "Refreshing..." : "Refresh"}
                    </button>
                    <button
                      onClick={async () => {
                        if (!window.confirm("Delete ALL live sessions? This will disconnect everyone currently spectating.")) return;
                        try {
                          const snapshot = await getDocs(collection(db, 'live_sessions'));
                          await Promise.all(snapshot.docs.map(d => deleteDoc(d.ref)));
                          setLiveMatches([]);
                          handlePlaySound('droplet');
                          triggerHaptic('success');
                        } catch (err) {
                          console.error("Error clearing sessions:", err);
                        }
                      }}
                      className="text-xs text-red-500 hover:text-red-600 font-semibold flex items-center gap-1 bg-red-50 hover:bg-red-100/75 px-2 py-1 rounded-md transition-colors"
                    >
                      <Trash2 className="w-3 h-3" /> Clear All
                    </button>
                  </div>
                </div>

                {isLoadingLiveMatches ? (
                  <div className="flex flex-col items-center justify-center py-8 text-slate-400 gap-2">
                    <div className="w-6 h-6 border-2 border-primary-500 border-t-transparent rounded-full animate-spin"></div>
                    <span className="text-xs font-medium">Scanning live scoreboards...</span>
                  </div>
                ) : liveMatches.length === 0 ? (
                  <div className="text-center py-8 bg-slate-50/50 border border-slate-100 rounded-2xl">
                    <Users className="w-8 h-8 text-slate-300 mx-auto mb-2" />
                    <h4 className="text-sm font-semibold text-slate-700">No active matches found</h4>
                    <p className="text-xs text-slate-400 mt-1">Host a match or tell your opponents to go live!</p>
                  </div>
                ) : (
                  <div className="space-y-3">
                    {liveMatches.map((m) => (
                      <div 
                        key={m.id} 
                        className="bg-white border border-slate-100 hover:border-primary-200 p-4 rounded-2xl transition-all shadow-xs flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3"
                      >
                        <div className="space-y-1">
                          <div className="flex items-center gap-2">
                            <span className="text-sm font-bold text-slate-800">{m.config?.player1Name || 'Team 1'}</span>
                            <span className="text-xs text-slate-400 font-bold font-mono">VS</span>
                            <span className="text-sm font-bold text-slate-800">{m.config?.player2Name || 'Team 2'}</span>
                          </div>
                          <div className="flex items-center gap-3 text-xs text-slate-500">
                            <span className="font-semibold bg-primary-50 text-primary-700 px-1.5 py-0.5 rounded-md uppercase text-[10px]">
                              {m.config?.matchType || 'singles'}
                            </span>
                            <span>•</span>
                            <span className="font-medium">Score: <strong className="text-slate-700 font-bold">{m.p1Total} - {m.p2Total}</strong></span>
                            <span>•</span>
                            <span className="font-medium text-slate-400">Ends: {m.activeRow + 1} / {m.config?.numEnds}</span>
                          </div>
                        </div>

                        <button
                          type="button"
                          onClick={() => {
                            if (ends.some(e => e.player1 !== '' || e.player2 !== '')) {
                              if (!window.confirm("You have active scores in this match. Spectating another match will clear your current board. Continue?")) {
                                return;
                              }
                            }
                            handleJoinSession(m.id);
                            setShowLiveLobbyModal(false);
                          }}
                          className="btn fx-10 px-4 py-2 text-xs w-full sm:w-auto"
                          style={{ '--bink': 'var(--color-primary-600)', '--bsurf': 'var(--color-primary-50)' } as React.CSSProperties}
                        >
                          <span className="btn-label">Spectate</span>
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>

            <div className="mt-6 border-t pt-4 flex justify-end">
              <button 
                onClick={() => setShowLiveLobbyModal(false)} 
                className="btn fx-10 px-5 py-2 text-xs" 
                style={{ '--bink': '#64748b', '--bsurf': '#f8fafc' } as React.CSSProperties}
              >
                <span className="btn-label">Close</span>
              </button>
            </div>
          </div>
        </div>
      )}
      {confirmDialog?.isOpen && (
        <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl w-full max-w-sm p-6 sm:p-8 shadow-2xl">
            <h2 className="text-2xl font-bold text-slate-900 mb-2">{confirmDialog.title}</h2>
            <p className="text-slate-600 mb-8">{confirmDialog.message}</p>
            <div className="flex gap-4">
              <button
                onClick={() => setConfirmDialog(null)}
                className="btn fx-10 flex-1"
                style={{ '--bink': '#64748b', '--bsurf': '#f8fafc' } as React.CSSProperties}
              >
                <span className="btn-label flex w-full justify-center">Cancel</span>
              </button>
              <button
                onClick={() => {
                  confirmDialog.onConfirm();
                  setConfirmDialog(null);
                }}
                className="btn fx-10 flex-1"
                style={{ '--bink': confirmDialog.title === 'Clear History' ? '#ef4444' : 'var(--color-primary-600)', '--bsurf': confirmDialog.title === 'Clear History' ? '#fee2e2' : 'var(--color-primary-50)' } as React.CSSProperties}
              >
                <span className="btn-label flex w-full justify-center">Confirm</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Floating Action Button */}
      <div className="fixed bottom-6 right-6 sm:bottom-12 sm:right-12 z-[100] flex items-center justify-center">
        {/* Item 1: Finish Match (Top) */}
        <div className={`absolute transition-all duration-700 ease-[cubic-bezier(0.34,1.56,0.64,1)] ${isFabOpen ? 'opacity-100 scale-100 -translate-y-[336px]' : 'opacity-0 scale-[0.4] pointer-events-none'}`}>
          <button onClick={() => { 
            setIsFabOpen(false);
            setGameOver(true);
            setShowSummaryModal(true); 
            triggerHaptic('success');
            
            // Play victory.mp3 custom sound instead of handlePlaySound('success')
            const victoryAudio = new Audio('/victory.mp3');
            victoryAudio.volume = isMuted ? 0 : 0.8;
            victoryAudio.play().catch(e => console.error("Victory audio play failed:", e));
            
            confetti({
              particleCount: 150,
              spread: 70,
              origin: { y: 0.6 },
              colors: ['#059669', '#34d399', '#fcd34d', '#fbbf24']
            });
          }} className="bg-white p-3 rounded-full shadow-lg border border-slate-200 text-primary-600 hover:text-primary-700 hover:scale-110 active:scale-95 transition-transform animate-in zoom-in duration-200" title="Finish Match">
            <Trophy className="w-5 h-5" />
          </button>
        </div>

        {/* Item 2: Home Navigation */}
        <div className={`absolute transition-all duration-700 ease-[cubic-bezier(0.34,1.56,0.64,1)] ${isFabOpen ? 'opacity-100 scale-100 -translate-y-[288px]' : 'opacity-0 scale-[0.4] pointer-events-none'}`}>
          <button onClick={() => { 
            setIsFabOpen(false); 
            handleEndMatch(); 
          }} className="bg-white p-3 rounded-full shadow-lg border border-slate-200 text-blue-600 hover:text-blue-700 hover:scale-110 active:scale-95 transition-transform animate-in zoom-in duration-200" title="Go to Home Screen">
            <Home className="w-5 h-5" />
          </button>
        </div>

        {/* Item 3: Export (Third) */}
        <div className={`absolute transition-all duration-700 ease-[cubic-bezier(0.34,1.56,0.64,1)] ${isFabOpen ? 'opacity-100 scale-100 -translate-y-[240px]' : 'opacity-0 scale-[0.4] pointer-events-none'}`}>
          <button onClick={() => { setIsFabOpen(false); handleShareScorecard(); }} className="bg-white p-3 rounded-full shadow-lg border border-slate-200 text-slate-700 hover:text-primary-600 hover:scale-110 active:scale-95 transition-transform animate-in zoom-in duration-200" title="Export Match">
            <Download className="w-5 h-5" />
          </button>
        </div>

        {/* Item 4: Settings (Fourth) */}
        <div className={`absolute transition-all duration-700 ease-[cubic-bezier(0.34,1.56,0.64,1)] ${isFabOpen ? 'opacity-100 scale-100 -translate-y-[192px]' : 'opacity-0 scale-[0.4] pointer-events-none'}`}>
          <button onClick={() => { setIsFabOpen(false); setShowSettings(true); }} className="bg-white p-3 rounded-full shadow-lg border border-slate-200 text-slate-700 hover:text-primary-600 hover:scale-110 active:scale-95 transition-transform animate-in zoom-in duration-200" title="Settings">
            <Settings className="w-5 h-5" />
          </button>
        </div>

        {/* Item 5: Live Session Sync (Fifth - Dynamic) */}
        <div className={`absolute transition-all duration-700 ease-[cubic-bezier(0.34,1.56,0.64,1)] ${isFabOpen ? 'opacity-100 scale-100 -translate-y-[144px]' : 'opacity-0 scale-[0.4] pointer-events-none'}`}>
          <button 
            onClick={() => { 
              setIsFabOpen(false); 
              fetchLiveMatches();
              setShowLiveLobbyModal(true);
            }} 
            className={`p-3 rounded-full shadow-lg border transition-transform hover:scale-110 active:scale-95 animate-in zoom-in duration-200 ${sessionCode ? 'bg-emerald-500 text-white border-emerald-600' : 'bg-white text-slate-700 border-slate-200'}`}
            title="Live Matches Lobby"
          >
            <Users className="w-5 h-5" />
          </button>
        </div>

        {/* Item 6: View History (Sixth) */}
        <div className={`absolute transition-all duration-700 ease-[cubic-bezier(0.34,1.56,0.64,1)] ${isFabOpen ? 'opacity-100 scale-100 -translate-y-[96px]' : 'opacity-0 scale-[0.4] pointer-events-none'}`}>
          <button onClick={() => { setIsFabOpen(false); setShowHistory(true); }} className="bg-white p-3 rounded-full shadow-lg border border-slate-200 text-slate-700 hover:text-primary-600 hover:scale-110 active:scale-95 transition-transform animate-in zoom-in duration-200" title="View History">
            <BookOpen className="w-5 h-5" />
          </button>
        </div>

        {/* Item 7: Clear All Scores (Seventh) */}
        <div className={`absolute transition-all duration-700 ease-[cubic-bezier(0.34,1.56,0.64,1)] ${isFabOpen ? 'opacity-100 scale-100 -translate-y-[48px]' : 'opacity-0 scale-[0.4] pointer-events-none'}`}>
          <button onClick={() => { setIsFabOpen(false); handleReset(); }} className="bg-white p-3 rounded-full shadow-lg border border-slate-200 text-red-500 hover:text-red-600 hover:scale-110 active:scale-95 transition-transform animate-in zoom-in duration-200" title="Clear All Scores">
            <Trash2 className="w-5 h-5" />
          </button>
        </div>

        <button 
          onClick={() => { setIsFabOpen(!isFabOpen); handlePlaySound('toggle'); }}
          className={`relative z-10 flex items-center justify-center w-14 h-14 bg-primary-600 text-white rounded-full shadow-xl transition-transform duration-700 ease-[cubic-bezier(0.34,1.56,0.64,1)] hover:scale-105 active:scale-95 ${isFabOpen ? 'rotate-[135deg]' : ''}`}
        >
          <Plus className="w-6 h-6" />
        </button>
      </div>
    </div>
  );
}