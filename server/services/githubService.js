
const axios = require('axios');
const AdmZip = require('adm-zip');

const IGNORED_DIRS = new Set(['node_modules', '.git', 'dist', 'build', 'coverage', '__pycache__', '.next', '.nuxt', '.output']);
const IGNORED_EXTS = new Set(['.png', '.jpg', '.jpeg', '.gif', '.ico', '.svg', '.woff', '.woff2', '.ttf', '.eot', '.mp4', '.webm', '.mp3', '.zip', '.tar', '.gz', '.pdf', '.exe', '.dll', '.so', '.dylib', '.class', '.jar', '.pyc']);

const fetchGithubRepo = async (repoUrl) => {
  try {
    // 1. Parse URL to get owner/repo
    // Supported formats: https://github.com/owner/repo, https://github.com/owner/repo.git
    const cleanUrl = repoUrl.replace('.git', '');
    const parts = cleanUrl.split('github.com/');
    if (parts.length !== 2) throw new Error("Invalid GitHub URL");
    
    const [owner, repo] = parts[1].split('/').filter(Boolean);
    if (!owner || !repo) throw new Error("Invalid GitHub URL format");

    // 2. Download ZIP Archive (HEAD)
    const archiveUrl = `https://github.com/${owner}/${repo}/archive/HEAD.zip`;
    console.log(`[GitHub] Downloading archive from ${archiveUrl}`);

    const response = await axios.get(archiveUrl, { responseType: 'arraybuffer' });
    const zip = new AdmZip(response.data);
    const zipEntries = zip.getEntries();

    const files = [];

    // 3. Process Entries
    zipEntries.forEach(entry => {
      if (entry.isDirectory) return;

      const fullName = entry.entryName;
      // Remove top-level directory (e.g., "repo-main/")
      const pathParts = fullName.split('/');
      pathParts.shift(); // Remove root folder
      const relativePath = pathParts.join('/');

      if (!relativePath) return;

      // Filter Ignored Directories
      if (pathParts.some(part => IGNORED_DIRS.has(part))) return;

      // Filter Ignored Extensions
      const ext = '.' + relativePath.split('.').pop().toLowerCase();
      if (IGNORED_EXTS.has(ext)) return;

      // Filter Large Files (> 500KB) to prevent token overflow
      if (entry.header.size > 500 * 1024) return;

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
    throw new Error(`Failed to import repository: ${error.message}`);
  }
};

module.exports = { fetchGithubRepo };
