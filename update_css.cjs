const fs = require('fs');
let code = fs.readFileSync('src/index.css', 'utf8');

code = code.replace(
  /:root {\n  --primary-800: #065f46;\n  --primary-950: #022c22;\n}/g,
  ""
);

code = code.replace(
  /:root {\s*--heading-font: 'Playfair Display', sans-serif;\s*--body-font: 'Lato', sans-serif;\s*--ink: currentColor;\s*--ink-2: #059669;\s*--ink-3: #10b981;\s*}/,
  `:root, :root[data-theme="emerald"] {
  --heading-font: 'Playfair Display', sans-serif;
  --body-font: 'Lato', sans-serif;
  --ink: currentColor;
  --ink-2: #059669;
  --ink-3: #10b981;
  --primary-50: #ecfdf5;
  --primary-100: #d1fae5;
  --primary-200: #a7f3d0;
  --primary-300: #6ee7b7;
  --primary-400: #34d399;
  --primary-500: #10b981;
  --primary-600: #059669;
  --primary-700: #047857;
  --primary-800: #065f46;
  --primary-900: #064e3b;
  --primary-950: #022c22;
}`
);

fs.writeFileSync('src/index.css', code);
