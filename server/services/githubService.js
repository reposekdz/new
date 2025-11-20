
const axios = require('axios');
const AdmZip = require('adm-zip');

// Expanded list of ignored directories to keep context clean.
// We filter these out to prevent filling the AI's context window with dependency lock files
// or build artifacts which are irrelevant for code generation tasks.
const IGNORED_DIRS = new Set([
    'node_modules', '.git', 'dist', 'build', 'coverage', 
    '__pycache__', '.next', '.nuxt', '.output', 'vendor', 
    'bin', 'obj', '.idea', '.vscode', '.github', 'target',
    'cmake-build-debug', 'out'
]);

// Expanded list of ignored extensions (binaries, assets).
// We only want text-based source code. Binaries cause token bloat and encoding issues.
const IGNORED_EXTS = new Set([
    '.png', '.jpg', '.jpeg', '.gif', '.ico', '.svg', '.webp',
    '.woff', '.woff2', '.ttf', '.eot', '.otf',
    '.mp4', '.webm', '.mp3', '.wav',
    '.zip', '.tar', '.gz', '.7z', '.rar',
    '.pdf', '.doc', '.docx', '.xls', '.xlsx',
    '.exe', '.dll', '.so', '.dylib', '.bin',
    '.class', '.jar', '.pyc', '.o', '.a',
    '.lock', '.json.lock'
]);

/**
 * Fetches a GitHub repository, downloads the ZIP archive, and extracts valid source files.
 * 
 * @param {string} repoUrl - The full GitHub URL (e.g., https://github.com/user/repo/tree/dev)
 * @returns {Promise<Array<{path: string, content: string}>>} Array of file objects
 */
const fetchGithubRepo = async (repoUrl) => {
  try {
    // 1. URL Parsing Logic
    // Supported formats: 
    // - https://github.com/owner/repo (Defaults to HEAD/main)
    // - https://github.com/owner/repo.git
    // - https://github.com/owner/repo/tree/branchName (Specific branch)
    
    const cleanUrl = repoUrl.replace('.git', '');
    const urlParts = cleanUrl.split('github.com/');
    if (urlParts.length !== 2) throw new Error("Invalid GitHub URL");
    
    const pathSegments = urlParts[1].split('/').filter(Boolean);
    if (pathSegments.length < 2) throw new Error("Invalid GitHub URL format");

    const owner = pathSegments[0];
    const repo = pathSegments[1];
    let branch = 'HEAD'; // Default to main/master/default branch

    // Detect branch if "tree" segment exists in URL
    if (pathSegments.length >= 4 && pathSegments[2] === 'tree') {
        branch = pathSegments.slice(3).join('/');
    }

    // 2. Download ZIP Archive
    // We use the archive endpoint to get the full source tree efficiently.
    const archiveUrl = `https://github.com/${owner}/${repo}/archive/${branch}.zip`;
    console.log(`[GitHub] Downloading archive from ${archiveUrl}`);

    const response = await axios.get(archiveUrl, { responseType: 'arraybuffer' });
    const zip = new AdmZip(response.data);
    const zipEntries = zip.getEntries();

    const files = [];

    // 3. Process ZIP Entries
    zipEntries.forEach(entry => {
      if (entry.isDirectory) return;

      const fullName = entry.entryName;
      // GitHub ZIPs always wrap contents in a root folder (e.g., "repo-main/src/...").
      // We remove this top-level directory to get clean relative paths.
      const pathParts = fullName.split('/');
      pathParts.shift(); // Remove root folder
      const relativePath = pathParts.join('/');

      if (!relativePath) return;

      // Filter Ignored Directories (e.g., node_modules)
      if (pathParts.some(part => IGNORED_DIRS.has(part))) return;

      // Filter Ignored Extensions (e.g., .png, .exe)
      const ext = '.' + relativePath.split('.').pop().toLowerCase();
      if (IGNORED_EXTS.has(ext)) return;

      // Filter Large Files (> 100KB)
      // Large text files (like huge logs or minified bundles) burn tokens unnecessarily.
      if (entry.header.size > 100 * 1024) return;

      // Read Content
      const content = zip.readAsText(entry);
      
      // Verify content is text (basic heuristic checking for null bytes)
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
