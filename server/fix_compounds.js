const fs = require('fs');
const path = require('path');

const filePath = path.join(__dirname, 'games', 'scribble', 'Words.js');
const content = fs.readFileSync(filePath, 'utf8');
const lines = content.split('\n');

// Find lines with CamelCase words (lowercase followed by uppercase inside quotes)
const camelCaseWords = [];
for (let i = 0; i < Math.min(lines.length, 7086); i++) {
  const match = lines[i].match(/"([a-z]+[A-Z][a-zA-Z]*)"/);
  if (match) {
    camelCaseWords.push({ line: i + 1, word: match[1] });
  }
}

console.log(`Found ${camelCaseWords.length} CamelCase words:`);
camelCaseWords.forEach(w => console.log(`  Line ${w.line}: "${w.word}"`));
