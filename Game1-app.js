const { useState, useEffect } = React;
const e = React.createElement;

function seededRandom(seed) {
  const x = Math.sin(seed) * 10000;
  return x - Math.floor(x);
}

function getTodayDateString() {
  return new Date().toISOString().split('T')[0];
}

function getPuzzleForDate(dateString) {
  const seed = dateString.split('-').reduce((acc, val) => acc + parseInt(val), 0);
  const random = (i) => seededRandom(seed + i);
  
  // Pick 4 unique categories
  const pool = [...ALL_DIAGNOSES];
  const selected = [];
  for(let i=0; i<4; i++) {
    const idx = Math.floor(random(i) * pool.length);
    selected.push(pool.splice(idx, 1)[0]);
  }
  
  let clues = [];
  selected.forEach((diag, idx) => {
    diag.clues.forEach(clue => {
      clues.push({ ...clue, diagId: idx, diagName: diag.name });
    });
  });
  
  return clues.sort(() => seededRandom(seed) - 0.5);
}

function PsychConnections() {
  const [view, setView] = useState('game'); 
  const [date, setDate] = useState(getTodayDateString());
  const [clues, setClues] = useState([]);
  const [selected, setSelected] = useState([]);
  const [foundGroups, setFoundGroups] = useState([]);
  const [attempts, setAttempts] = useState(0);

  useEffect(() => {
    setClues(getPuzzleForDate(date));
    setFoundGroups([]);
    setSelected([]);
    setAttempts(0);
  }, [date]);

  const handleClueClick = (clue) => {
    if (foundGroups.some(g => g.diagName === clue.diagName)) return;
    if (selected.find(c => c.text === clue.text)) {
      setSelected(selected.filter(c => c.text !== clue.text));
      return;
    }
    if (selected.length >= 4) return;

    const newSelected = [...selected, clue];
    setSelected(newSelected);

    if (newSelected.length === 4) {
      const isMatch = newSelected.every(c => c.diagId === newSelected[0].diagId);
      if (isMatch) {
        setFoundGroups([...foundGroups, { diagName: newSelected[0].diagName, clues: newSelected }]);
        setSelected([]);
      } else {
        setAttempts(a => a + 1);
        setTimeout(() => setSelected([]), 800);
      }
    }
  };

  return e('div', {className: 'max-w-xl mx-auto p-4 font-serif min-h-screen'},
    e('header', {className: 'text-center mb-8 border-b border-slate-200 pb-4'},
      e('h1', {className: 'text-4xl font-bold mb-1 tracking-tighter'}, 'PsychConnections'),
      e('p', {className: 'text-slate-500 uppercase text-[10px] tracking-widest font-sans mb-4'}, `Diagnostic Formulation: ${date}`),
      e('div', {className: 'flex justify-center gap-6 font-sans text-xs font-bold'},
        e('button', {onClick: () => setView('game'), className: view === 'game' ? 'text-slate-900 underline underline-offset-4' : 'text-slate-400'}, 'DAILY PUZZLE'),
        e('button', {onClick: () => setView('archive'), className: view === 'archive' ? 'text-slate-900 underline underline-offset-4' : 'text-slate-400'}, 'ARCHIVE')
      )
    ),

    view === 'archive' ? e('div', {className: 'grid grid-cols-2 gap-2'},
      [...Array(10)].map((_, i) => {
        const d = new Date();
        d.setDate(d.getDate() - i);
        const dStr = d.toISOString().split('T')[0];
        return e('button', {
          key: dStr,
          onClick: () => { setDate(dStr); setView('game'); },
          className: 'p-4 bg-white border border-slate-200 text-xs font-sans hover:bg-slate-900 hover:text-white transition-all'
        }, dStr);
      })
