const fs = require('fs');
const path = require('path');

const filePath = path.join(__dirname, 'games', 'scribble', 'Words.js');
const content = fs.readFileSync(filePath, 'utf8');
const lines = content.split('\n');
const originalLineCount = lines.length;

const camelToSpace = (word) => {
  return word.replace(/([a-z])([A-Z])/g, '$1 $2');
};

let changes = 0;
for (let i = 0; i < Math.min(lines.length, 7086); i++) {
  const line = lines[i];
  const match = line.match(/^(\s*)"([a-z]+[A-Z][a-zA-Z]*)"(,?\s*)$/);
  if (match) {
    const newWord = camelToSpace(match[2]);
    const newLine = `${match[1]}"${newWord}"${match[3]}`;
    if (newLine !== line) {
      lines[i] = newLine;
      changes++;
    }
  }
}

console.log(`Changed ${changes} CamelCase words`);
fs.writeFileSync(filePath, lines.join('\n'), 'utf8');

const newContent = fs.readFileSync(filePath, 'utf8');
const newLineCount = newContent.split('\n').length;
console.log(`Original lines: ${originalLineCount}, New lines: ${newLineCount}`);
