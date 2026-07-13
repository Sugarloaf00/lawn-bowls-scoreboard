const fs = require('fs');
let code = fs.readFileSync('src/App.tsx', 'utf8');

// HistoryItem
code = code.replace(
  /const P1Icon = match\.config\.player1Avatar.*/g,
  ''
);
code = code.replace(
  /const P2Icon = match\.config\.player2Avatar.*/g,
  ''
);
code = code.replace(
  /<P1Icon className="w-5 h-5" \/>/g,
  '<AvatarDisplay avatar={match.config.player1Avatar} className="w-5 h-5" />'
);
code = code.replace(
  /<P2Icon className="w-5 h-5" \/>/g,
  '<AvatarDisplay avatar={match.config.player2Avatar} className="w-5 h-5" />'
);

// App main render
code = code.replace(
  /const Player1Icon = config\.player1Avatar.*/g,
  ''
);
code = code.replace(
  /const Player2Icon = config\.player2Avatar.*/g,
  ''
);
code = code.replace(
  /<Player1Icon className=\{`w-6 h-6 \$\{p1Total > p2Total \? 'text-amber-400' : 'text-primary-100'\}`\} \/>/g,
  '<AvatarDisplay avatar={config.player1Avatar} className={`w-6 h-6 ${p1Total > p2Total ? "text-amber-400" : "text-primary-100"}`} />'
);
code = code.replace(
  /<Player2Icon className=\{`w-6 h-6 \$\{p2Total > p1Total \? 'text-amber-400' : 'text-primary-100'\}`\} \/>/g,
  '<AvatarDisplay avatar={config.player2Avatar} className={`w-6 h-6 ${p2Total > p1Total ? "text-amber-400" : "text-primary-100"}`} />'
);
code = code.replace(
  /<Player1Icon className="w-5 h-5" \/>/g,
  '<AvatarDisplay avatar={config.player1Avatar} className="w-5 h-5" />'
);
code = code.replace(
  /<Player2Icon className="w-5 h-5" \/>/g,
  '<AvatarDisplay avatar={config.player2Avatar} className="w-5 h-5" />'
);

fs.writeFileSync('src/App.tsx', code);
