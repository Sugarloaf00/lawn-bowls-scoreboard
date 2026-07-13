const fs = require('fs');
let code = fs.readFileSync('src/App.tsx', 'utf8');

const globalSoundEffect = `
  useEffect(() => {
    const handleGlobalClick = (e: MouseEvent) => {
      if (isMuted) return;
      const target = e.target as HTMLElement;
      const isClickable = target.closest('button, a, input, label, select, [role="button"]');
      if (isClickable) {
        const hasCuelume = target.closest('[data-cuelume-press], [data-cuelume-release]');
        if (!hasCuelume) {
          play('tick'); // use direct play to bypass any potential double-mute checks though play() plays when called
        }
      }
    };
    document.addEventListener('click', handleGlobalClick, true);
    return () => document.removeEventListener('click', handleGlobalClick, true);
  }, [isMuted]);
`;

code = code.replace(
  "  useEffect(() => { localStorage.setItem('lawn_bowls_muted', isMuted.toString()); }, [isMuted]);",
  "  useEffect(() => { localStorage.setItem('lawn_bowls_muted', isMuted.toString()); }, [isMuted]);\n" + globalSoundEffect
);

fs.writeFileSync('src/App.tsx', code);
