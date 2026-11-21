const fs = require('fs');
const fsp = require('fs/promises');
const path = require('path');
const os = require('os');
const axios = require('axios');
const { pipeline } = require('stream/promises');
const { normalizeRepoUrl, repoParts } = require('../utils/normalizeRepoUrl');
const { safeExtract } = require('../utils/safeExtract');
const { analyzeRepository } = require('./analysisService');

async function makeTemp() { return fsp.mkdtemp(path.join(os.tmpdir(), 'repoverse-')); }
async function findContentRoot(folder) {
  const entries = await fsp.readdir(folder, { withFileTypes: true });
  const visible = entries.filter(entry => entry.name !== '__MACOSX');
  return visible.length === 1 && visible[0].isDirectory() ? path.join(folder, visible[0].name) : folder;
}

async function getGithubRepository(normalizedUrl) {
  const { owner, repo } = repoParts(normalizedUrl);
  try {
    const response = await axios.get(`https://api.github.com/repos/${encodeURIComponent(owner)}/${encodeURIComponent(repo)}`, { timeout: 12000, maxRedirects: 0, headers: { Accept: 'application/vnd.github+json', 'User-Agent': 'RepoVerse-3D' } });
    return response.data;
  } catch (error) {
    if (error.response?.status === 404) throw new Error('Repository was not found, is private, or cannot be accessed publicly.');
    throw new Error('GitHub could not be reached while checking this repository.');
  }
}

async function downloadGithubArchive(normalizedUrl, directory, ref) {
  const { owner, repo } = repoParts(normalizedUrl);
  const details = await getGithubRepository(normalizedUrl);
  if (details.private) throw new Error('Private repositories are not supported yet.');
  const archive = path.join(directory, 'repository.zip');
  const version = encodeURIComponent(ref || details.default_branch);
  const url = ref
    ? `https://codeload.github.com/${encodeURIComponent(owner)}/${encodeURIComponent(repo)}/zip/${version}`
    : `https://codeload.github.com/${encodeURIComponent(owner)}/${encodeURIComponent(repo)}/zip/refs/heads/${version}`;
  try {
    const response = await axios.get(url, { responseType: 'stream', timeout: 30000, maxRedirects: 0, maxContentLength: 100 * 1024 * 1024, headers: { 'User-Agent': 'RepoVerse-3D' } });
    await pipeline(response.data, fs.createWriteStream(archive, { flags: 'wx' }));
  } catch { throw new Error('GitHub archive download failed or exceeded the 30 MB download limit.'); }
  return { archive, name: details.name || repo };
}

async function inspectGithubRepository(url, ref) {
  const normalizedUrl = normalizeRepoUrl(url);
  const { owner, repo } = repoParts(normalizedUrl);
  const temp = await makeTemp();
  try {
    const { archive, name } = await downloadGithubArchive(normalizedUrl, temp, ref);
    const extracted = path.join(temp, 'source'); await fsp.mkdir(extracted);
    await safeExtract(archive, extracted);
    const details = await getGithubRepository(normalizedUrl);
    let sha = ref || null;
    let commitDate = null;
    if (!sha) {
      try {
        const commitResponse = await axios.get(
          `https://api.github.com/repos/${encodeURIComponent(owner)}/${encodeURIComponent(repo)}/commits/${encodeURIComponent(details.default_branch)}`,
          { timeout: 12000, headers: { Accept: 'application/vnd.github+json', 'User-Agent': 'RepoVerse-3D' } }
        );
        sha = commitResponse.data.sha;
        commitDate = commitResponse.data.commit?.committer?.date || commitResponse.data.commit?.author?.date || null;
      } catch {
        sha = null;
      }
    } else {
      try {
        const commitResponse = await axios.get(
          `https://api.github.com/repos/${encodeURIComponent(owner)}/${encodeURIComponent(repo)}/commits/${encodeURIComponent(ref)}`,
          { timeout: 12000, headers: { Accept: 'application/vnd.github+json', 'User-Agent': 'RepoVerse-3D' } }
        );
        commitDate = commitResponse.data.commit?.committer?.date || commitResponse.data.commit?.author?.date || null;
      } catch {}
    }
    const result = await analyzeRepository(await findContentRoot(extracted), {
      name,
      url: normalizedUrl,
      owner,
      repo,
      sha: sha || ref || details.default_branch,
      latestCommitDate: commitDate
    });
    return result;
  } finally { await fsp.rm(temp, { recursive: true, force: true }); }
}

async function inspectZipRepository(uploadPath, originalName, url) {
  const normalizedUrl = normalizeRepoUrl(url);
  const temp = await makeTemp();
  try {
    const extracted = path.join(temp, 'source'); await fsp.mkdir(extracted);
    await safeExtract(uploadPath, extracted);
    const { repo } = repoParts(normalizedUrl);
    return await analyzeRepository(await findContentRoot(extracted), { name: repo || path.basename(originalName, '.zip'), url: normalizedUrl });
  } finally {
    await Promise.all([fsp.rm(temp, { recursive: true, force: true }), fsp.rm(uploadPath, { force: true })]);
  }
}

module.exports = { inspectGithubRepository, inspectZipRepository, getGithubRepository };
