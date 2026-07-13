const fs = require('fs');
let code = fs.readFileSync('src/App.tsx', 'utf8');

const hapticUtils = `
const triggerHaptic = (type: 'light' | 'medium' | 'success') => {
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
  "const MAX_ENDS = 30;",
  hapticUtils + "\nconst MAX_ENDS = 30;"
);

code = code.replace(
  "if (navigator.vibrate) navigator.vibrate(50);",
  "triggerHaptic('medium');"
);

code = code.replace(
  "if (navigator.vibrate) navigator.vibrate(20);",
  "triggerHaptic('light');"
);

code = code.replace(
  "handlePlaySound('success');",
  "handlePlaySound('success');\n            triggerHaptic('success');"
);

fs.writeFileSync('src/App.tsx', code);
