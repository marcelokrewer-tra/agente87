import { BRAZIL_STATES } from './src/components/BrazilPaths';

const states = ['BA', 'PI'];
states.forEach(uf => {
  const state = BRAZIL_STATES.find(s => s.uf === uf)!;
  const d = state.d1;
  // Parse SVG path commands properly
  const cmdRegex = /([MmLlCcSsHhVvZz])|([^MmLlCcSsHhVvZz]+)/g;
  let match;
  let curX = 0;
  let curY = 0;
  const points: {x: number, y: number}[] = [];
  
  while ((match = cmdRegex.exec(d)) !== null) {
    if (match[1]) {
      const cmd = match[1];
      const rest = cmdRegex.exec(d);
      if (!rest || rest[1]) {
        // Backtrack
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
});
