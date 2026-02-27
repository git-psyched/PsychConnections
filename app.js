const { useState, useEffect } = React;
const e = React.createElement;

// USMLE-Style Clinical Categories
const CATEGORY_COLORS = {
  symptom: { bg: 'bg-emerald-600', selected: 'bg-emerald-500', found: 'bg-emerald-900/40', border: 'border-emerald-400', text: 'text-emerald-100' },
  treatment: { bg: 'bg-blue-600', selected: 'bg-blue-500', found: 'bg-blue-900/40', border: 'border-blue-400', text: 'text-blue-100' },
  criteria: { bg: 'bg-purple-600', selected: 'bg-purple-500', found: 'bg-purple-900/40', border: 'border-purple-400', text: 'text-purple-100' },
  risk: { bg: 'bg-rose-600', selected: 'bg-rose-500', found: 'bg-rose-900/40', border: 'border-rose-400', text: 'text-rose-100' }
};

// --- CORE UTILS: Daily Seeded Logic ---
const getTodayStr = () => new Date().toISOString().split('T')[0];

const seededRandom = (seed) => {
  const x = Math.sin(seed++) * 10000;
  return x - Math.floor(x);
};

const generatePuzzleFromDate = (dateStr) => {
  const seed = dateStr.split('-').reduce((acc, val) => acc + parseInt(val), 0);
  let randCount = 0;
  const getRand = () => seededRandom(seed + (randCount++));

  const pool = [...ALL_DIAGNOSES];
  const selectedSet = [];
  const tempPool = [...pool];
  
  // Pick 4 unique diagnoses based on date seed
  for(let i=0; i<4; i++) {
    const idx = Math.floor(getRand() * tempPool.length);
    selectedSet.push(tempPool.splice(idx, 1)[0]);
  }

  let clues = selectedSet.flatMap((d, i) => 
    d.clues.map(c => ({ ...c, group: i, name: d.name, fullData: d }))
  );

  // Shuffle the 16 clues using the seed
  for (let i = clues.length - 1; i > 0; i--) {
    const j = Math.floor(getRand() * (i + 1));
    [clues[i], clues[j]] = [clues[j], clues[i]];
  }
  return clues;
};

// --- AUDIO ENGINE ---
let audioCtx = null;
const playSfx = (freq, type = 'sine', duration = 0.1) => {
  if (!audioCtx) audioCtx = new (window.AudioContext || window.webkitAudioContext)();
  if (audioCtx.state === 'suspended') audioCtx.resume();
  const osc = audioCtx.createOscillator();
  const gain = audioCtx.createGain();
  osc.type = type; osc.connect(gain); gain.connect(audioCtx.destination);
  osc.frequency.setValueAtTime(freq, audioCtx.currentTime);
  gain.gain.exponentialRampToValueAtTime(0.01, audioCtx.currentTime + duration);
  osc.start(); osc.stop(audioCtx.currentTime + duration);
};

function App() {
  const [view, setView] = useState('landing');
  const [gameDate, setGameDate] = useState(getTodayStr());
  const [gameBoard, setGameBoard] = useState([]);
  const [selected, setSelected] = useState([]);
  const [foundGroups, setFoundGroups] = useState([]);
  const [mistakes, setMistakes] = useState(0);
  const [message, setMessage] = useState("");
  const [unlocked, setUnlocked] = useState([]);
  const [history, setHistory] = useState({});
  const [showDetail, setShowDetail] = useState(null);

  useEffect(() => {
    const savedBank = localStorage.getItem('psychlink_unlocked');
    const savedHistory = localStorage.getItem('psychlink_history');
    if (savedBank) setUnlocked(JSON.parse(savedBank));
    if (savedHistory) setHistory(JSON.parse(savedHistory));
  }, []);

  const startPuzzle = (dateStr) => {
    playSfx(660);
    setGameDate(dateStr);
    setGameBoard(generatePuzzleFromDate(dateStr));
    setFoundGroups([]);
    setMistakes(0);
    setSelected([]);
    setMessage(dateStr === getTodayStr() ? "DAILY PROTOCOL" : "ARCHIVE ACCESS");
    setView('game');
  };

  const submit = () => {
    const group = gameBoard[selected[0]].group;
    const diagnosis = gameBoard[selected[0]].fullData;
    
    if (selected.every(i => gameBoard[i].group === group)) {
      playSfx(880, 'sine', 0.2);
      const newFound = [...foundGroups, [...selected]];
      setFoundGroups(newFound);
      setShowDetail(diagnosis);
      
      // Save to Bank
      if (!unlocked.find(u => u.name === diagnosis.name)) {
        const nextBank = [...unlocked, diagnosis];
        setUnlocked(nextBank);
        localStorage.setItem('psychlink_unlocked', JSON.stringify(nextBank));
      }

      // Mark Archive Solved
      if(newFound.length === 4) {
        const nextHistory = {...history, [gameDate]: true};
        setHistory(nextHistory);
        localStorage.setItem('psychlink_history', JSON.stringify(nextHistory));
      }
      setSelected([]);
    } else {
      playSfx(150, 'sawtooth', 0.3);
      setMistakes(m => m + 1);
      setMessage("CLINICAL MISMATCH");
    }
  };

  // --- RENDERING VIEWS ---

  if (view === 'help') return e('div', {className: 'max-w-md mx-auto p-8 text-white min-h-screen flex flex-col justify-center'},
    e('div', {className: 'glass p-8 rounded-[40px] border-white/10'},
      e('h2', {className: 'text-2xl font-black mb-6 text-emerald-400 uppercase italic'}, "Protocol Manual"),
      e('div', {className: 'space-y-4 text-sm text-slate-300 leading-relaxed'},
        e('p', null, e('b', {className:'text-white'}, "1. Identify Sets: "), "Select 4 tiles that describe a single psychiatric diagnosis."),
        e('p', null, e('b', {className:'text-white'}, "2. Structure: "), "Every set contains 1 Symptom, 1 Treatment, 1 Diagnostic Criteria, and 1 Risk Factor."),
        e('p', null, e('b', {className:'text-white'}, "3. Limits: "), "You have 4 attempts. High-stakes clinical precision required."),
        e('p', null, e('b', {className:'text-white'}, "4. Archives: "), "Missing a day is fine—visit the Archives to catch up on past clinical files.")
      ),
      e('button', {onClick: () => setView('landing'), className: 'mt-10 w-full py-4 bg-white text-slate-950 font-black rounded-2xl'}, "INITIALIZE")
    )
  );

  if (view === 'archive') return e('div', {className: 'max-w-md mx-auto p-6 text-white min-h-screen'},
    e('button', {onClick: () => setView('landing'), className: 'mb-6 text-[10px] font-black text-slate-500 font-mono tracking-widest'}, "← RETURN"),
    e('h2', {className: 'text-3xl font-black mb-8 tracking-tighter uppercase'}, "Clinical Files"),
    e('div', {className: 'grid grid-cols-1 gap-3 pb-10'},
      [...Array(30)].map((_, i) => {
        const d = new Date(); d.setDate(d.getDate() - i);
        const ds = d.toISOString().split('T')[0];
        return e('button', {
          key: ds,
          onClick: () => startPuzzle(ds),
          className: `flex justify-between items-center p-5 rounded-3xl border transition-all ${history[ds] ? 'bg-emerald-900/20 border-emerald-500/30' : 'bg-slate-900/40 border-white/5'}`
        }, 
          e('span', {className: 'font-mono text-sm'}, ds),
          history[ds] ? e('span', {className: 'text-[10px] text-emerald-500 font-black'}, "DECRYPTED") : e('span', {className: 'text-[10px] text-slate-600 font-black'}, "LOCKED")
        );
      })
    )
  );

  if (view === 'bank') return e('div', {className: 'max-w-md mx-auto p-6 text-white min-h-screen pb-20'},
    e('button', {onClick: () => setView('landing'), className: 'mb-6 text-[10px] font-black text-slate-500 font-mono tracking-widest'}, "← RETURN"),
    e('h2', {className: 'text-3xl font-black mb-8 tracking-tighter uppercase text-emerald-400 font-mono'}, "Study Bank"),
    unlocked.length === 0 ? e('p', {className: 'text-slate-600 text-center py-20 font-mono'}, "NO CLINICAL DATA SAVED") :
    unlocked.map((item, i) => e('div', {key: i, className: 'glass p-6 rounded-[32px] border-white/5 mb-6'}, 
      e('div', {className: 'text-xl font-black uppercase mb-4 text-white font-mono'}, item.name),
      e('div', {className: 'grid grid-cols-1 gap-3'}, item.clues.map((c, ci) => 
        e('div', {key: ci, className: 'flex gap-3 items-start'}, 
          e('div', {className: `w-2 h-2 mt-1 rounded-full ${CATEGORY_COLORS[c.category].bg}`}),
          e('div', null, e('div', {className:'text-[8px] uppercase text-slate-500 font-black'}, c.category), e('div', {className:'text-xs font-bold text-slate-300'}, c.text))
        )
      ))
    ))
  );

  if (view === 'game') return e('div', {className: 'max-w-md mx-auto p-3 pt-6 text-white min-h-screen flex flex-col font-sans'},
    e('header', {className: 'flex justify-between items-center mb-6 bg-slate-900/40 p-3 rounded-2xl border border-white/5'},
      e('button', {onClick: () => setView('landing'), className: 'text-[9px] font-black text-slate-500 uppercase'}, "Abort"),
      e('div', {className: 'font-mono text-[9px] text-slate-500'}, gameDate),
      e('div', {className: 'flex gap-1.5'}, [...Array(4)].map((_, i) => e('div', {key: i, className: `w-2 h-2 rounded-full border ${i < mistakes ? 'bg-rose-500 border-rose-300 shadow-[0_0_8px_red]' : 'bg-slate-950 border-slate-800'}`})))
    ),
    e('div', {className: 'grid grid-cols-4 gap-1.5 mb-6 flex-grow'},
      gameBoard.map((clue, index) => {
        const isFound = foundGroups.some(g => g.includes(index));
        const isSelected = selected.includes(index);
        const theme = CATEGORY_COLORS[clue.category];
        return e('button', {
          key: index,
          onClick: () => { if(!isFound && mistakes < 4) { playSfx(440, 'triangle', 0.05); isSelected ? setSelected(selected.filter(i=>i!==index)) : selected.length < 4 && setSelected([...selected, index]); } },
          className: `h-20 p-1.5 rounded-xl text-[9px] font-black border-2 transition-all duration-200 flex items-center justify-center text-center uppercase leading-tight
            ${isFound ? 'opacity-10 grayscale scale-90 border-transparent pointer-events-none' : 
              isSelected ? `${theme.bg} border-white scale-105 z-10 shadow-xl ring-2 ring-white/50` : 
              mistakes >= 4 ? 'bg-slate-900 opacity-30 border-slate-800' :
              `${theme.bg} border-white/5 text-white active:scale-95`}`
        }, clue.text);
      })
    ),
    e('div', {className: 'pb-8 flex flex-col items-center gap-4'},
      e('div', {className: 'h-4 text-[9px] font-mono tracking-widest text-emerald-400 font-black uppercase animate-pulse'}, message),
      (mistakes >= 4 || foundGroups.length === 4) ? 
        e('button', {onClick: () => setView('landing'), className: 'w-full py-5 bg-white text-slate-950 font-black rounded-[24px] uppercase text-sm'}, 'Protocol Exit') :
        e('button', {onClick: submit, disabled: selected.length !== 4, className: 'w-full py-5 bg-white text-slate-950 font-black rounded-[24px] disabled:opacity-20 shadow-xl uppercase text-sm tracking-tight'}, 'Verify Sequence')
    ),
    showDetail && e('div', {className: 'fixed inset-0 z-50 flex items-center justify-center p-6 bg-slate-950/95 backdrop-blur-md'},
      e('div', {className: 'glass p-8 rounded-[40px] w-full border border-white/20 shadow-2xl transform scale-100'},
        e('h2', {className: 'text-2xl font-black mb-6 text-white text-center font-mono uppercase tracking-tighter'}, showDetail.name),
        e('div', {className: 'space-y-4 mb-8'},
          showDetail.clues.map((c, idx) => e('div', {key: idx, className: 'flex items-center gap-4 p-3 rounded-2xl bg-white/5 border border-white/5'},
            e('div', {className: `w-3 h-3 rounded-full ${CATEGORY_COLORS[c.category].bg} shadow-[0_0_8px_currentColor]`}),
            e('div', null, e('div', {className: 'text-[8px] uppercase text-slate-500 font-black'}, c.category), e('div', {className: 'text-xs text-slate-100 font-bold'}, c.text))
          ))
        ),
        e('button', {onClick: () => setShowDetail(null), className: 'w-full py-4 bg-emerald-500 text-slate-950 font-black rounded-2xl uppercase'}, 'Continue')
      )
    )
  );

  return e('div', {className: 'flex flex-col items-center justify-center min-h-screen p-6 text-white text-center font-sans'},
    e('div', {className: 'mb-12'},
        e('h1', {className: 'text-6xl font-black tracking-tighter italic leading-none'}, 'PSYCH'),
        e('h2', {className: 'text-2xl font-black tracking-[0.3em] opacity-30 leading-none mt-1'}, 'CONNECTIONS')
    ),
    e('div', {className: 'flex flex-col gap-3 w-full max-w-[280px]'},
      e('button', {onClick: () => startPuzzle(getTodayStr()), className: 'py-5 bg-emerald-500 text-slate-950 font-black rounded-3xl shadow-2xl shadow-emerald-900/40 uppercase text-sm'}, 'Start Daily'),
      e('button', {onClick: () => setView('archive'), className: 'py-4 border border-slate-700 text-slate-300 font-bold rounded-2xl text-xs uppercase font-mono'}, 'Archives'),
      e('button', {onClick: () => setView('bank'), className: 'py-4 border border-slate-700 text-slate-300 font-bold rounded-2xl text-xs uppercase font-mono'}, 'Study Bank'),
      e('button', {onClick: () => setView('help'), className: 'mt-2 text-slate-500 font-black text-[10px] uppercase tracking-widest'}, 'Manual')
    )
  );
}

const root = ReactDOM.createRoot(document.getElementById('root'));
root.render(e(App));
