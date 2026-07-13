const fs = require('fs');
let code = fs.readFileSync('src/App.tsx', 'utf8');

const imageUploadHandlerCode = `
  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>, setter: React.Dispatch<React.SetStateAction<string>>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = (ev) => {
        if (ev.target?.result) setter(ev.target.result as string);
      };
      reader.readAsDataURL(file);
    }
  };
`;

code = code.replace(
  "const [setupEnds, setSetupEnds] = useState<number>(15);",
  "const [setupEnds, setSetupEnds] = useState<number>(15);" + imageUploadHandlerCode
);

const renderAvatarOptions = (player) => `
                  <div className="flex flex-wrap gap-2">
                    {Object.keys(ICONS).map((iconKey) => {
                      const IconComponent = ICONS[iconKey];
                      return (
                        <button
                          key={iconKey}
                          onClick={() => setSetupAvatar${player}(iconKey)}
                          data-cuelume-press="tick"
                          className={\`p-2 rounded-lg border transition-all \${setupAvatar${player} === iconKey ? 'border-primary-500 bg-primary-50 text-primary-600' : 'border-slate-200 text-slate-400 hover:border-slate-300 hover:bg-slate-50'}\`}
                        >
                          <IconComponent className="w-5 h-5" />
                        </button>
                      );
                    })}
                    <label className={\`p-2 rounded-lg border transition-all cursor-pointer flex items-center justify-center \${setupAvatar${player}.startsWith('data:image/') ? 'border-primary-500 bg-primary-50 text-primary-600' : 'border-slate-200 text-slate-400 hover:border-slate-300 hover:bg-slate-50'}\`}>
                      <input type="file" className="hidden" accept="image/*" onChange={(e) => handleImageUpload(e, setSetupAvatar${player})} />
                      {setupAvatar${player}.startsWith('data:image/') ? <img src={setupAvatar${player}} className="w-5 h-5 object-cover rounded-sm" /> : <PlusCircle className="w-5 h-5" />}
                    </label>
                  </div>
`;

code = code.replace(
  /<div className="flex flex-wrap gap-2">\s*\{Object\.keys\(ICONS\)\.map\(\(iconKey\) => \{\s*const IconComponent = ICONS\[iconKey\];\s*return \(\s*<button\s*key=\{iconKey\}\s*onClick=\{\(\) => setSetupAvatar1\(iconKey\)\}\s*data-cuelume-press="tick"\s*className=\{`p-2 rounded-lg border transition-all \$\{setupAvatar1 === iconKey \? 'border-primary-500 bg-primary-50 text-primary-600' : 'border-slate-200 text-slate-400 hover:border-slate-300 hover:bg-slate-50'\}`\}\s*>\s*<IconComponent className="w-5 h-5" \/>\s*<\/button>\s*\);\s*\}\)\}\s*<\/div>/,
  renderAvatarOptions(1)
);

code = code.replace(
  /<div className="flex flex-wrap gap-2">\s*\{Object\.keys\(ICONS\)\.map\(\(iconKey\) => \{\s*const IconComponent = ICONS\[iconKey\];\s*return \(\s*<button\s*key=\{iconKey\}\s*onClick=\{\(\) => setSetupAvatar2\(iconKey\)\}\s*data-cuelume-press="tick"\s*className=\{`p-2 rounded-lg border transition-all \$\{setupAvatar2 === iconKey \? 'border-primary-500 bg-primary-50 text-primary-600' : 'border-slate-200 text-slate-400 hover:border-slate-300 hover:bg-slate-50'\}`\}\s*>\s*<IconComponent className="w-5 h-5" \/>\s*<\/button>\s*\);\s*\}\)\}\s*<\/div>/,
  renderAvatarOptions(2)
);

fs.writeFileSync('src/App.tsx', code);
