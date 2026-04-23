const fs = require('fs');
const path = require('path');

function walk(dir) {
    let results = [];
    if (!fs.existsSync(dir)) return results;
    const list = fs.readdirSync(dir);
    list.forEach(file => {
        if (file === 'node_modules' || file === '.git' || file === '.next') return;
        file = path.join(dir, file);
        const stat = fs.statSync(file);
        if (stat && stat.isDirectory()) {
            results = results.concat(walk(file));
        } else {
            if (file.endsWith('.md') || file.endsWith('.mdx')) {
                results.push(file);
            }
        }
    });
    return results;
}

const metadataPath = 'src/content/Notes/_data/metadata.json';
const metadata = JSON.parse(fs.readFileSync(metadataPath, 'utf8'));
const files = walk('src/content');
const missing = [];
const allRefs = [];

const mdImageRegex = /!\[.*?\]\((.+?)\)/g;
const imgTagRegex = /<img.*?src="(.*?)"/g;

files.forEach(file => {
    const content = fs.readFileSync(file, 'utf8');
    
    if (content.startsWith('---')) {
        const endOfFrontmatter = content.indexOf('---', 3);
        if (endOfFrontmatter !== -1) {
            const frontmatter = content.substring(0, endOfFrontmatter);
            const coverMatch = frontmatter.match(/src:\s*["']?([^"'\n]+)["']?/);
            if (coverMatch) {
                allRefs.push({ file, src: coverMatch[1], type: 'cover' });
            }
        }
    }

    let match;
    while ((match = mdImageRegex.exec(content)) !== null) {
        allRefs.push({ file, src: match[1], type: 'markdown' });
    }
    while ((match = imgTagRegex.exec(content)) !== null) {
        allRefs.push({ file, src: match[1], type: 'html' });
    }
});

const report = {};

allRefs.forEach(ref => {
    let src = ref.src.trim();
    if (src.startsWith('http') || src === "") return;
    
    src = src.replace(/^["']|["']$/g, '');
    let key = src;
    if (key.startsWith('/')) key = key.substring(1);
    
    let decodedKey = key;
    try { decodedKey = decodeURIComponent(key); } catch (e) {}

    if (!metadata[decodedKey] && !metadata[key]) {
        if (!report[decodedKey]) {
            report[decodedKey] = { src: ref.src, files: new Set() };
        }
        report[decodedKey].files.add(ref.file);
    }
});

const finalReport = Object.keys(report).map(key => ({
    key,
    files: Array.from(report[key].files)
}));

console.log(JSON.stringify(finalReport, null, 2));
