const fs = require('fs/promises');
const path = require('path');
const { IGNORED, MAX_FILES, MAX_TOTAL_SIZE } = require('../utils/safeExtract');

const languageByExtension = {
  '.js': 'JavaScript', '.mjs': 'JavaScript', '.cjs': 'JavaScript', '.jsx': 'JavaScript/JSX',
  '.ts': 'TypeScript', '.tsx': 'TypeScript/TSX', '.json': 'JSON', '.html': 'HTML', '.css': 'CSS',
  '.scss': 'SCSS', '.md': 'Markdown', '.yml': 'YAML', '.yaml': 'YAML', '.py': 'Python', '.java': 'Java'
};

async function walkRepository(root) {
  const files = [];
  let totalSize = 0;
  async function visit(directory) {
    const entries = await fs.readdir(directory, { withFileTypes: true });
    for (const entry of entries) {
      if (IGNORED.has(entry.name)) continue;
      const absolute = path.join(directory, entry.name);
      if (entry.isDirectory()) await visit(absolute);
      else if (entry.isFile()) {
        const stat = await fs.stat(absolute);
        totalSize += stat.size;
        if (files.length >= MAX_FILES) throw new Error(`Repository has more than ${MAX_FILES} files after exclusions.`);
        if (totalSize > MAX_TOTAL_SIZE) throw new Error('Repository source exceeds the 80 MB analysis limit.');
        const relativePath = path.relative(root, absolute).replace(/\\/g, '/');
        const extension = path.extname(entry.name).toLowerCase();
        files.push({ relativePath, fileName: entry.name, extension, language: languageByExtension[extension] || 'Other', size: stat.size, absolutePath: absolute });
      }
    }
  }
  await visit(root);
  const languages = Object.entries(files.reduce((all, file) => {
    if (file.language !== 'Other') all[file.language] = (all[file.language] || 0) + 1;
    return all;
  }, {})).sort((a, b) => b[1] - a[1]).map(([name, count]) => ({ name, count }));
  return { files, totalSize, languages };
}

function buildTree(files) {
  const root = { name: 'Repository', type: 'folder', children: [] };
  for (const file of files) {
    const pieces = file.relativePath.split('/');
    let cursor = root;
    pieces.forEach((piece, index) => {
      let child = cursor.children.find(item => item.name === piece);
      if (!child) { child = { name: piece, type: index === pieces.length - 1 ? 'file' : 'folder', children: index === pieces.length - 1 ? undefined : [] }; cursor.children.push(child); }
      cursor = child;
    });
  }
  const sortTree = node => node.children?.sort((a, b) => a.type.localeCompare(b.type) || a.name.localeCompare(b.name)).forEach(sortTree);
  sortTree(root);
  return root;
}

module.exports = { walkRepository, buildTree };
