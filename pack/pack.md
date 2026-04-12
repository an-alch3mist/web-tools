## `run following command in terminal`
> `make sure pack.js in the root of folder to be packaged:`
```
node pack.js "learn/phase-b(New)"
```

## `the pack.js`
```js
const fs = require('fs');
const path = require('path');

const DELIMITER_PREFIX = '<!-- ==== FILE: ';
const DELIMITER_SUFFIX = ' ==== -->';

function getAllFiles(dirPath) {
    let results = [];
    for (const entry of fs.readdirSync(dirPath, { withFileTypes: true })) {
        const fullPath = path.join(dirPath, entry.name);
        if (entry.isDirectory()) results = results.concat(getAllFiles(fullPath));
        else results.push(fullPath);
    }
    return results.sort();
}

const targetDir = process.argv[2];
if (!targetDir) { console.error('Usage: node pack.js <folder>'); process.exit(1); }
if (!fs.existsSync(targetDir)) { console.error(`Folder not found: ${targetDir}`); process.exit(1); }

const folderName = path.basename(targetDir);
const outputFile = folderName + '.txt';
const files = getAllFiles(targetDir);
let packed = '';

for (const filePath of files) {
    const relativePath = folderName + '/' + path.relative(targetDir, filePath).replace(/\\/g, '/');
    const content = fs.readFileSync(filePath, 'utf8');
    packed += DELIMITER_PREFIX + relativePath + DELIMITER_SUFFIX + '\n' + content;
    if (!content.endsWith('\n')) packed += '\n';
    packed += '\n';
}

fs.writeFileSync(outputFile, packed, 'utf8');
console.log(`Packed ${files.length} files -> ${outputFile}`);
```

