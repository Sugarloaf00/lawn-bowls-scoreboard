const fs = require('fs');
let code = fs.readFileSync('src/App.tsx', 'utf8');

const newImageUploadHandler = `
  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>, setter: React.Dispatch<React.SetStateAction<string>>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = (ev) => {
        if (ev.target?.result) {
          const img = new Image();
          img.onload = () => {
            const canvas = document.createElement('canvas');
            const MAX_SIZE = 128;
            let width = img.width;
            let height = img.height;
            if (width > height) {
              if (width > MAX_SIZE) {
                height *= MAX_SIZE / width;
                width = MAX_SIZE;
              }
            } else {
              if (height > MAX_SIZE) {
                width *= MAX_SIZE / height;
                height = MAX_SIZE;
              }
            }
            canvas.width = width;
            canvas.height = height;
            const ctx = canvas.getContext('2d');
            ctx?.drawImage(img, 0, 0, width, height);
            setter(canvas.toDataURL('image/jpeg', 0.8));
          };
          img.src = ev.target.result as string;
        }
      };
      reader.readAsDataURL(file);
    }
  };
`;

code = code.replace(
  /const handleImageUpload[\s\S]*?reader\.readAsDataURL\(file\);\s*}\s*};/,
  newImageUploadHandler.trim()
);

fs.writeFileSync('src/App.tsx', code);
