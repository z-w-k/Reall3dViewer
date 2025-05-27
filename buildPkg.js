import * as fs from 'fs';
import * as path from 'path';

const srcFile = './src/reall3d/sorter/SetupSorter.ts';
const bakFile = './pkg/SetupSorter.ts';
const assetsDir = './pkg/dist/assets';
const descFile = './pkg/dist/pkg.d.ts';
const faviconFile = './pkg/dist/favicon.ico';

if (process.argv.length > 2) {
    process.argv[2] === '--before' && beforeBuildPkg();
    process.argv[2] === '--after' && afterBuildPkg();
}

function afterBuildPkg() {
    fixDescFile(); // 修复 .d.ts
    write(srcFile, read(bakFile)); // 从备份文件中恢复SetupSorter.ts
    fs.unlinkSync(faviconFile); // 删除多余文件
    fs.unlinkSync(bakFile); // 删除备份文件
}

function fixDescFile() {
    const lines = read(descFile).split('\n');
    for (let i = 0; i < lines.length; i++) {
        if (lines[i].startsWith('declare interface')) {
            lines[i] = 'export ' + lines[i];
        }
    }
    write(descFile, lines.join('\n'));
}

function beforeBuildPkg() {
    write(bakFile, read(srcFile));

    const SorterFile = findSorterFile(assetsDir);
    console.info(SorterFile);
    const base64String = fs.readFileSync(SorterFile).toString('base64');

    const devLines = read(srcFile).split('\n');
    const pkgLines = [];
    for (let i = 0; i < devLines.length; i++) {
        if (devLines[i].includes(`new URL('./Sorter.ts', import.meta.url)`)) {
            pkgLines.push(`    const SorterBase64 = '';` + '\r');
            pkgLines.push(`    const workerUrl = URL.createObjectURL(new Blob([atob(SorterBase64)], { type: 'text/javascript' }));` + '\r');
            pkgLines.push(`    const worker = new Worker(new URL(workerUrl, import.meta.url), { type: 'module' });` + '\r');
        } else {
            pkgLines.push(devLines[i]);
        }
    }
    for (let i = 0; i < pkgLines.length; i++) {
        if (pkgLines[i].includes('const SorterBase64 =')) {
            if (pkgLines[i].trim() === 'const SorterBase64 =') {
                pkgLines[i + 1] = `        '${base64String}';` + '\r';
            } else {
                pkgLines[i] = `    const SorterBase64 = '${base64String}';` + '\r';
            }
        }
    }
    write(srcFile, pkgLines.join('\n'));
}

function read(file, encoding = 'utf-8') {
    return fs.readFileSync(file, encoding);
}

function write(file, text = '', encoding = 'utf-8') {
    fs.writeFileSync(file, text, encoding);
}

function findSorterFile(directoryPath) {
    const files = fs.readdirSync(directoryPath);
    const sorterFiles = files.filter(file => file.startsWith('Sorter') && file.endsWith('.js'));
    return path.join(directoryPath, sorterFiles[0]);
}
