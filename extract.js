const cp = require('child_process');
const fs = require('fs');
const diff = cp.execSync('git log -p "src/components/CatalogoPublico.jsx"').toString();
const idx = diff.indexOf('-            // EL LINK MAGICO CORTO');
if(idx > -1) {
   fs.writeFileSync('oldCode.txt', diff.substring(Math.max(0, idx - 1000), idx + 1000));
} else {
   fs.writeFileSync('oldCode.txt', diff.substring(0, 2000));
}
