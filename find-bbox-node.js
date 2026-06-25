import fs from 'fs';

const content = fs.readFileSync('src/components/BrazilPaths.ts', 'utf8');

// Use regex to find all state blocks
const blockRegex = /\{\s*uf:\s*'([^']+)'[\s\S]*?name:\s*'([^']+)'[\s\S]*?d1:\s*'([^']+)'[\s\S]*?\}/g;

let match;
while ((match = blockRegex.exec(content)) !== null) {
  const uf = match[1];
  const name = match[2];
  const d = match[3];
  
  if (!['BA', 'PI', 'CE', 'RN', 'PB', 'PE', 'SE'].includes(uf)) continue;

  const cmdRegex = /([MmLlCcSsHhVvZz])|([^MmLlCcSsHhVvZz]+)/g;
  let cmdMatch;
  let curX = 0;
  let curY = 0;
  const points = [];
  
  while ((cmdMatch = cmdRegex.exec(d)) !== null) {
    if (cmdMatch[1]) {
      const cmd = cmdMatch[1];
      const rest = cmdRegex.exec(d);
      if (!rest || rest[1]) {
        if (rest) cmdRegex.lastIndex -= rest[0].length;
        continue;
      }
      const args = (rest[2].match(/-?\d*\.?\d+/g) || []).map(Number);
      
      if (cmd === 'M') {
        for (let i = 0; i < args.length; i += 2) {
          curX = args[i];
          curY = args[i+1];
          points.push({x: curX, y: curY});
        }
      } else if (cmd === 'm') {
        for (let i = 0; i < args.length; i += 2) {
          curX += args[i];
          curY += args[i+1];
          points.push({x: curX, y: curY});
        }
      } else if (cmd === 'c') {
        for (let i = 0; i < args.length; i += 6) {
          curX += args[i+4];
          curY += args[i+5];
          points.push({x: curX, y: curY});
        }
      } else if (cmd === 'C') {
        for (let i = 0; i < args.length; i += 6) {
          curX = args[i+4];
          curY = args[i+5];
          points.push({x: curX, y: curY});
        }
      }
    }
  }
  
  const xs = points.map(p => p.x);
  const ys = points.map(p => p.y);
  console.log(`${uf}: x [${Math.min(...xs).toFixed(1)}, ${Math.max(...xs).toFixed(1)}], y [${Math.min(...ys).toFixed(1)}, ${Math.max(...ys).toFixed(1)}]`);
}
