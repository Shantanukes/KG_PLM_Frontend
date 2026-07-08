const fs = require('fs');
const path = require('path');

const pagesDir = path.join(__dirname, 'src', 'pages');
const files = fs.readdirSync(pagesDir).filter(f => f.endsWith('.js'));

files.forEach(file => {
  const filePath = path.join(pagesDir, file);
  let content = fs.readFileSync(filePath, 'utf8');
  let originalContent = content;

  // Replace console.log, console.error, console.warn with devLog
  let modified = false;
  if (content.match(/console\.(log|error|warn)/)) {
    content = content.replace(/console\.(log|error|warn)/g, 'devLog');
    modified = true;
  }

  if (modified) {
    // Add import { devLog } from '../utils.js'; if not present
    if (!content.includes('import { devLog }') && !content.includes('import {devLog}') && !content.includes('import { esc, devLog }') && !content.includes(', devLog')) {
        // Try to find an existing import from '../utils.js'
        if (content.includes("from '../utils.js'")) {
            content = content.replace(/(import\s+{)([^}]+)(}\s+from\s+['"]\.\.\/utils\.js['"])/, (match, p1, p2, p3) => {
                if (p2.includes('devLog')) return match;
                return `${p1}${p2}, devLog ${p3}`;
            });
        } else {
            // Add a new import at the top
            content = `import { devLog } from '../utils.js';\n` + content;
        }
    }
    fs.writeFileSync(filePath, content, 'utf8');
    console.log(`Updated ${file}`);
  }
});
