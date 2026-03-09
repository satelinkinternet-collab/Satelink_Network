import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
// rootDir is /Users/pradeepjakuraa/satelink-mvp/src
const rootDir = path.resolve(__dirname, '../../');
// projectRootDir is /Users/pradeepjakuraa/satelink-mvp
const projectRootDir = path.resolve(rootDir, '../');

let errors = 0;
let checkedFiles = 0;

function walk(dir) {
    const files = fs.readdirSync(dir);
    for (const file of files) {
        const fullPath = path.join(dir, file);
        if (fs.statSync(fullPath).isDirectory()) {
            walk(fullPath);
        } else if (file.endsWith('.js') || file.endsWith('.mjs')) {
            checkImports(fullPath);
        }
    }
}

function checkImports(file) {
    checkedFiles++;
    const content = fs.readFileSync(file, 'utf8');

    // Simple regex for ESM imports
    const importRegex = /import.*from\s+['"](\.\/|\.\.\/)(.*)['"]/g;
    let match;

    while ((match = importRegex.exec(content)) !== null) {
        let importPath = match[2];
        if (!importPath.endsWith('.js') && !importPath.endsWith('.mjs')) {
            importPath += '.js';
        }

        const relativeToDir = path.dirname(file);
        const matchPath = match[1] + importPath;
        let absoluteImportPath = path.resolve(relativeToDir, matchPath);

        if (!fs.existsSync(absoluteImportPath)) {
            // Check if it's a directory (might be importing index.js)
            const indexPathtest = path.resolve(absoluteImportPath, 'index.js');
            if (fs.existsSync(indexPathtest)) continue;

            // Fallback: check if it implicitly refers to src/ through some relative path
            if (fs.existsSync(path.resolve(rootDir, importPath))) continue;

            const trialPathFromRoot = path.resolve(projectRootDir, importPath);
            if (fs.existsSync(trialPathFromRoot)) continue;

            console.error(`[ERR] Broken import in ${path.relative(rootDir, file)}: ${match[0]}`);
            console.error(`      Attempted path: ${absoluteImportPath}`);
            errors++;
        }
    }
}

console.log('--- Modular Architecture Verification ---');
walk(rootDir);

console.log(`\nVerification complete:`);
console.log(`- Files checked: ${checkedFiles}`);
console.log(`- Errors found:  ${errors}`);

if (errors > 0) {
    console.error('\n[FAIL] Refactor has broken imports.');
    process.exit(1);
} else {
    console.log('\n[PASS] No broken local imports found.');
}
