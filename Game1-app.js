const { useState, useEffect } = React;
const e = React.createElement;

// Categories mapped to Psych Connections logic with high-end Gene-Link colors
const CATEGORY_COLORS = {
  symptom: { bg: 'bg-emerald-600', selected: 'bg-emerald-500', found: 'bg-emerald-900/40', border: 'border-emerald-400', text: 'text-emerald-100' },
  treatment: { bg: 'bg-blue-600', selected: 'bg-blue-500', found: 'bg-blue-900/40', border: 'border-blue-400', text: 'text-blue-100' },
  criteria: { bg: 'bg-purple-600', selected: 'bg-purple-500', found: 'bg-purple-900/40', border: 'border-purple-400', text: 'text-purple-100' },
  risk: { bg: 'bg-rose-600', selected: 'bg-rose-500', found: 'bg-rose-900/40', border: 'border-rose-400', text: 'text-rose-100' }
};

// SFX Engine
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
  const [gameBoard, setGameBoard] = useState([]);
  const [selected, setSelected] = useState([]);
  const [foundGroups, setFoundGroups] = useState([]);
  const [mistakes, setMistakes] = useState(0);
  const [message, setMessage] = useState("");
  const [unlocked, setUnlocked] = useState([]);
  const [showDetail, setShowDetail] = useState(null);

  // Load Study Bank from LocalStorage
  useEffect(() => {
    const saved = localStorage.getItem('psychlink_unlocked');
    if (saved) setUnlocked(JSON.parse(saved));
  }, []);

  const initGame = () => {
    playSfx(660);
    // 1. Pick 4 random diagnoses from the data file
    const pool = [...ALL_DIAGNOSES];
    const shuffledPool = pool.sort(() => 0.5 - Math.random());
    const selectedSet = shuffledPool.slice(0, 4);
    
    // 2. Map clues and categories
    let clues = selectedSet.flatMap((d, i) => 
      d.clues.map(c => ({ 
        ...c, 
        group: i, 
        name: d.name, 
        fullData: d 
      }))
    );

    // 3. Fisher-Yates Shuffle for the 16 tiles
    for (let i = clues.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [clues[i], clues[j]] = [clues[j], clues[i]];
    }

    setGameBoard(clues);
    setFoundGroups([]);
    setMistakes(0);
    setSelected([]);
    setMessage("DSM-5 PROTOCOL ACTIVE");
    setView('game');
  };

  const handleSelect = (i) => {
    if (foundGroups.flat().includes(i) || mistakes >= 4) return;
    playSfx(440, 'triangle', 0.05);
    if (selected.includes(i)) {
      setSelected(selected.filter(idx => idx !== i));
    } else if (selected.length < 4) {
      setSelected([...selected, i]);
    }
  };

  const submit = () => {
    const group = gameBoard[selected[0]].group;
    const diagnosis = gameBoard[selected[0]].fullData;
    
    if (selected.every(i => gameBoard[i].group === group)) {
      playSfx(880, 'sine', 0.2);
      setFoundGroups([...foundGroups, [...selected]]);
      setShowDetail(diagnosis);
      
      // Save to Study Bank if new
      if (!unlocked.find(u => u.name === diagnosis.name)) {
        const nextUnlocked = [...unlocked, diagnosis];
        setUnlocked(nextUnlocked);
        localStorage.setItem('psychlink_unlocked', JSON.stringify(nextUnlocked));
      }
      setSelected([]);
      setMessage("DIAGNOSIS VERIFIED");
    } else {
      playSfx(150, 'sawtooth', 0.3);
      setMistakes(m => m + 1);
      setMessage("CLINICAL MISMATCH");
    }
  };

  const isLoss = mistakes >= 4;

  // GRID RENDERING
  const renderGrid = () => (
    e('div', {className: 'grid grid-cols-4 gap-2 mb-8'},
      gameBoard.map((clue, index) => {
        const isFound = foundGroups.some(g => g.includes(index));
        const isSelected = selected.includes(index);
        const theme = CATEGORY_COLORS[clue.category];
        
        return e('button', {
          key: index,
          onClick: () => handleSelect(index),
          className: `h-24 p-2 rounded-xl text-[10px] font-black border-2 transition-all duration-300 flex items-center justify-center text-center uppercase leading-tight
            ${isFound ? 'opacity-10 grayscale scale-90 border-transparent pointer-events-none' : 
              isSelected ? `${theme.bg} border-white scale-105 z-10 shadow-[0_0_25px_rgba(255,255,255,0.4)] ring-2 ring-white` : 
              isLoss ? 'bg-slate-900 opacity-40 border-slate-800' :
              `${theme.bg} border-white/10 hover:brightness-110 hover:scale-[1.02] text-white shadow-lg`}`
        }, clue.text);
      })
    )
  );

  // VIEWS
  if (view === 'landing') return e('div', {className: 'flex items-center justify-center min-h-screen p-6 text-white text-center'},
    e('div', {className: 'glass p-10 rounded-3xl shadow-2xl max-w-sm w-full border border-white/10'},
      e('h1', {className: 'text-4xl font-black mb-2 tracking-tighter'}, 'PSYCH-LINK'),
      e('p', {className: 'text-emerald-500/80 text-[10px] uppercase tracking-widest mb-10 font-mono'}, "Clinical Connection Protocol"),
      e('div', {className: 'flex flex-col gap-3'},
        e('button', {onClick: initGame, className: 'w-full py-4 bg-white text-slate-950 font-bold rounded-2xl hover:bg-emerald-400 transition-all'}, 'START ASSESSMENT'),
        e('button', {onClick: () => setView('bank'), className: 'w-full py-4 border border-slate-700 text-slate-300 font-bold rounded-2xl hover:bg-slate-800 text-sm font-mono tracking-tighter'}, 'ACCESS STUDY BANK')
      )
    )
  );

  if (view === 'bank') return e('div', {className: 'max-w-md mx-auto p-6 text-white min-h-screen'},
    e('button', {onClick: () => setView('landing'), className: 'mb-6 text-xs font-bold text-slate-500 hover:text-white transition-colors'}, "← TERMINAL HOME"),
    e('h2', {className: 'text-3xl font-black mb-8 tracking-tighter uppercase font-mono'}, "Study Bank"),
    e('div', {className: 'space-y-4 pb-10'},
        unlocked.length === 0 ? e('p', {className: 'text-slate-600 text-center py-20 font-mono text-xs'}, "NO DATA RECOVERED. COMPLETE ASSESSMENTS TO UNLOCK.") :
        unlocked.map((item, i) => e('div', {key: i, className: 'glass p-6 rounded-3xl border-white/5'}, 
            e('div', {className: 'text-xl font-black uppercase mb-4 text-emerald-400 font-mono leading-none'}, item.name),
            e('div', {className: 'grid grid-cols-1 gap-3'}, item.clues.map((c, ci) => 
                e('div', {key: ci, className: 'flex items-start gap-3'}, 
                    e('div', {className: `w-1.5 h-1.5 mt-1.5 rounded-full ${CATEGORY_COLORS[c.category].bg}`}),
                    e('div', null,
                      e('div', {className: 'text-[8px] text-slate-500 uppercase font-black'}, c.category),
                      e('div', {className: 'text-xs text-slate-300 font-medium leading-tight'}, c.text)
                    )
                )
            ))
        ))
    )
  );

  return e('div', {className: 'max-w-md mx-auto p-4 pt-8 text-white min-h-screen'},
    e('header', {className: 'flex justify-between items-center mb-8 bg-slate-900/40 p-4 rounded-2xl border border-white/5'},
      e('button', {onClick: () => setView('landing'), className: 'text-[10px] font-black text-slate-500 hover:text-rose-500 uppercase tracking-tighter transition-colors'}, "Abort Protocol"),
      e('div', {className: 'flex gap-2'}, [...Array(4)].map((_, i) => e('div', {key: i, className: `w-2.5 h-2.5 rounded-full border-2 ${i < mistakes ? 'bg-rose-600 border-rose-400 shadow-[0_0_10px_rgba(225,29,72,0.8)]' : 'bg-slate-950 border-slate-800'}`})))
    ),
    renderGrid(),
    e('div', {className: 'flex flex-col gap-4 items-center mt-6 text-center'},
      e('div', {className: 'h-4 text-[10px] font-mono tracking-[0.3em] text-emerald-400 uppercase animate-pulse font-bold'}, message),
      (isLoss || foundGroups.length === 4) ? 
        e('button', {onClick: initGame, className: 'w-full py-5 bg-emerald-500 text-slate-950 font-black rounded-3xl shadow-[0_0_30px_rgba(16,185,129,0.3)] hover:bg-emerald-400 transition-all scale-105 uppercase'}, 'New Assessment') :
        e('button', {onClick: submit, disabled: selected.length !== 4, className: 'w-full py-5 bg-white text-slate-950 font-black rounded-3xl disabled:opacity-10 transition-all shadow-xl hover:scale-[1.02] active:scale-95 uppercase'}, 'Verify Selection'),
      !isLoss && foundGroups.length < 4 && e('button', {onClick: () => setSelected([]), className: 'text-[10px] font-black text-slate-600 hover:text-white uppercase tracking-widest transition-colors'}, "Flush Buffer")
    ),
    showDetail && e('div', {className: 'fixed inset-0 z-50 flex items-center justify-center p-6 bg-slate-950/90 backdrop-blur-xl'},
        e('div', {className: 'glass p-8 rounded-[40px] max-w-sm w-full border border-white/20 shadow-2xl transform animate-in fade-in zoom-in duration-300'},
          e('div', {className: 'text-[10px] text-emerald-400 font-mono mb-2 tracking-[0.4em] font-black text-center'}, "DECRYPTION COMPLETE"),
          e('h2', {className: 'text-4xl font-black mb-8 text-white tracking-tighter uppercase leading-none text-center font-mono'}, showDetail.name),
          e('div', {className: 'space-y-5 mb-10'},
            showDetail.clues.map((c, idx) => e('div', {key: idx, className: 'flex items-start gap-4 p-3 rounded-2xl bg-white/5 border border-white/5'},
              e('div', {className: `w-3 h-3 mt-1.5 rounded-full ${CATEGORY_COLORS[c.category].bg} shadow-[0_0_10px_currentColor]`}),
              e('div', null, 
                  e('div', {className: 'text-[8px] uppercase text-slate-500 font-black tracking-widest'}, c.category),
                  e('div', {className: 'text-sm text-slate-100 font-bold leading-tight'}, c.text)
              )
            ))
          ),
          e('button', {onClick: () => setShowDetail(null), className: 'w-full py-5 bg-emerald-500 text-slate-950 font-black rounded-3xl hover:bg-emerald-400 transition-all shadow-lg uppercase'}, 'Return to Grid')
        )
    )
  );
}

const root = ReactDOM.createRoot(document.getElementById('root'));
root.render(e(App));
