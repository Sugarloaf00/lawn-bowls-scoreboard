const fs = require('fs');
let code = fs.readFileSync('src/App.tsx', 'utf8');

if (!code.includes('Download,')) {
  code = code.replace(/import \{([^}]+)\} from 'lucide-react';/, "import { Download, $1 } from 'lucide-react';");
  fs.writeFileSync('src/App.tsx', code);
}
