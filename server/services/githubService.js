
const axios = require('axios');
const AdmZip = require('adm-zip');

// Expanded list of ignored directories to keep context clean
const IGNORED_DIRS = new Set([
    'node_modules', '.git', 'dist', 'build', 'coverage', 
    '__pycache__', '.next', '.nuxt', '.output', 'vendor', 
    'bin', 'obj', '.idea', '.vscode', '.github', 'target',
    'cmake-build-debug', 'out'
]);

// Expanded list of ignored extensions (binaries, assets)
const IGNORED_EXTS = new Set([
    '.png', '.jpg', '.jpeg', '.gif', '.ico', '.svg', '.webp',
    '.woff', '.woff2', '.ttf', '.eot', '.otf',
    '.mp4', '.webm', '.mp3', '.wav',
    '.zip', '.tar', '.gz', '.7z', '.rar',
    '.pdf', '.doc', '.docx', '.xls', '.xlsx',
    '.exe', '.dll', '.so', '.dylib', '.bin',
    '.class', '.jar', '.pyc', '.o', '.a'
]);

const fetchGithubRepo = async (repoUrl) => {
  try {
    // 1. Parse URL to get owner, repo, and potentially branch
    // Supported: 
    // https://github.com/owner/repo
    // https://github.com/owner/repo.git
    // https://github.com/owner/repo/tree/branchName
    
    const cleanUrl = repoUrl.replace('.git', '');
    const urlParts = cleanUrl.split('github.com/');
    if (urlParts.length !== 2) throw new Error("Invalid GitHub URL");
    
    const pathSegments = urlParts[1].split('/').filter(Boolean);
    if (pathSegments.length < 2) throw new Error("Invalid GitHub URL format");

    const owner = pathSegments[0];
    const repo = pathSegments[1];
    let branch = 'HEAD'; // Default to main/master

    // Detect branch if "tree" exists
    if (pathSegments.length >= 4 && pathSegments[2] === 'tree') {
        branch = pathSegments.slice(3).join('/');
    }

    // 2. Download ZIP Archive for the specific branch
    const archiveUrl = `https://github.com/${owner}/${repo}/archive/${branch}.zip`;
    console.log(`[GitHub] Downloading archive from ${archiveUrl}`);

    const response = await axios.get(archiveUrl, { responseType: 'arraybuffer' });
    const zip = new AdmZip(response.data);
    const zipEntries = zip.getEntries();

    const files = [];

    // 3. Process Entries
    zipEntries.forEach(entry => {
      if (entry.isDirectory) return;

      const fullName = entry.entryName;
      // Remove top-level directory (e.g., "repo-main/" or "repo-branch/")
      const pathParts = fullName.split('/');
      pathParts.shift(); // Remove root folder
      const relativePath = pathParts.join('/');

      if (!relativePath) return;

      // Filter Ignored Directories
      if (pathParts.some(part => IGNORED_DIRS.has(part))) return;

      // Filter Ignored Extensions
      const ext = '.' + relativePath.split('.').pop().toLowerCase();
      if (IGNORED_EXTS.has(ext)) return;

      // Filter Large Files (> 100KB for imports to save token budget)
      if (entry.header.size > 100 * 1024) return;

      // Read Content
      const content = zip.readAsText(entry);
      
      // Verify content is text (simple check)
      if (content.includes('\0')) return; // Likely binary

      files.push({
        path: relativePath,
        content: content
      });
    });

    return files;

  } catch (error) {
    console.error("[GitHub Service] Error:", error.message);
    throw new Error(`Failed to import repository: ${error.message}. Check if the branch/URL is correct.`);
  }
};

module.exports = { fetchGithubRepo };
