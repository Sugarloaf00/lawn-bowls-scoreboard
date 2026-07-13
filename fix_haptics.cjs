const fs = require('fs');
let code = fs.readFileSync('src/App.tsx', 'utf8');

const hapticUtils = `
export const triggerHaptic = (type: 'light' | 'medium' | 'success') => {
  if (typeof navigator === 'undefined' || !navigator.vibrate) return;
  try {
    switch (type) {
      case 'light':
        navigator.vibrate(10); // subtle tap
        break;
      case 'medium':
        navigator.vibrate(25); // firm tap
        break;
      case 'success':
        navigator.vibrate([20, 40, 30]); // double tap
        break;
    }
  } catch (e) {
    // Graceful fallback for unsupported environments
  }
};
`;

code = code.replace(
  "const ICONS: Record<string, React.FC<any>> = {",
  hapticUtils + "\nconst ICONS: Record<string, React.FC<any>> = {"
);

fs.writeFileSync('src/App.tsx', code);
