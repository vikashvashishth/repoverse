function normalizeRepoUrl(value) {
  if (typeof value !== 'string') throw new Error('Repository URL is required.');
  let url;
  try { url = new URL(value.trim()); } catch { throw new Error('Enter a valid GitHub repository URL.'); }
  if (url.protocol !== 'https:' || url.hostname.toLowerCase() !== 'github.com') {
    throw new Error('Only public https://github.com/owner/repository URLs are accepted.');
  }
  const segments = url.pathname.split('/').filter(Boolean);
  if (segments.length !== 2 || !/^[A-Za-z0-9_.-]+$/.test(segments[0]) || !/^[A-Za-z0-9_.-]+(?:\.git)?$/.test(segments[1])) {
    throw new Error('Use a repository URL in the form https://github.com/owner/repository.');
  }
  const owner = segments[0].toLowerCase();
  const repo = segments[1].replace(/\.git$/i, '').toLowerCase();
  if (!repo) throw new Error('Repository name is required.');
  return `https://github.com/${owner}/${repo}`;
}

function repoParts(normalizedUrl) {
  const [, owner, repo] = new URL(normalizedUrl).pathname.match(/^\/([^/]+)\/([^/]+)$/) || [];
  return { owner, repo };
}

module.exports = { normalizeRepoUrl, repoParts };
