const fs = require('fs');
const path = require('path');

let ok = true;

// 1. JSX syntax check
try {
  const parser = require('@babel/parser');
  parser.parse(
    fs.readFileSync('app/(lister)/Lister/components/WelcomeMessage.jsx', 'utf8'),
    { sourceType: 'module', plugins: ['jsx'] }
  );
  console.log('JSX syntax: OK');
} catch (e) {
  ok = false;
  console.log('JSX syntax: FAIL -> ' + e.message);
}

// 2. CSS module syntax check
try {
  const postcss = require('postcss');
  postcss.parse(fs.readFileSync('app/(lister)/Lister/css/WelcomeMessage.module.css', 'utf8'));
  console.log('CSS syntax: OK');
} catch (e) {
  ok = false;
  console.log('CSS syntax: FAIL -> ' + e.message);
}

// 3. Cross-check: every styles.* reference in JSX must exist as a class in the CSS module
const jsx = fs.readFileSync('app/(lister)/Lister/components/WelcomeMessage.jsx', 'utf8');
const css = fs.readFileSync('app/(lister)/Lister/css/WelcomeMessage.module.css', 'utf8');
const used = [...new Set([...jsx.matchAll(/styles\.([A-Za-z0-9_]+)/g)].map((m) => m[1]))];
const defined = new Set([...css.matchAll(/\.([A-Za-z0-9_]+)\s*[,{[]/g)].map((m) => m[1]));
const missing = used.filter((name) => !defined.has(name));
if (missing.length === 0) {
  console.log('CSS module classes (' + used.length + ' used): all defined');
} else {
  ok = false;
  console.log('MISSING CSS classes: ' + missing.join(', '));
}

console.log(ok ? 'ALL CHECKS PASSED' : 'CHECKS FAILED');
process.exit(ok ? 0 : 1);