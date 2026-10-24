import { GitHubRelease, UpdateCheckResult } from '../shared/types/github';

const GITHUB_REPO = 'ntuan2502/ntgz';
const RELEASES_API_URL = `https://api.github.com/repos/${GITHUB_REPO}/releases/latest`;

/**
 * Compare two semver strings: v1 > v2 returns 1, v1 < v2 returns -1, equal returns 0
 */
export function compareSemVer(v1: string, v2: string): number {
  const clean1 = v1.replace(/^v/, '').trim();
  const clean2 = v2.replace(/^v/, '').trim();

  const parts1 = clean1.split('.').map(p => parseInt(p, 10) || 0);
  const parts2 = clean2.split('.').map(p => parseInt(p, 10) || 0);

  const maxLen = Math.max(parts1.length, parts2.length);
  for (let i = 0; i < maxLen; i++) {
    const num1 = parts1[i] ?? 0;
    const num2 = parts2[i] ?? 0;
    if (num1 > num2) return 1;
    if (num1 < num2) return -1;
  }
  return 0;
}

/**
 * Fetch latest release information from GitHub Releases API
 */
export async function fetchLatestRelease(): Promise<GitHubRelease> {
  const res = await fetch(RELEASES_API_URL, {
    headers: {
      Accept: 'application/vnd.github.v3+json',
    },
  });

  if (!res.ok) {
    throw new Error(`GitHub API returned status ${res.status}: ${res.statusText}`);
  }

  return (await res.json()) as GitHubRelease;
}

/**
 * Check if a newer version is available compared to the current extension version
 */
export async function checkForUpdates(currentVersionOverride?: string): Promise<UpdateCheckResult> {
  let currentVersion = currentVersionOverride;
  if (!currentVersion) {
    try {
      currentVersion = chrome.runtime.getManifest().version;
    } catch {
      currentVersion = '1.0.0';
    }
  }

  const release = await fetchLatestRelease();
  const latestTag = release.tag_name || '1.0.0';
  const cleanLatest = latestTag.replace(/^v/, '');

  const hasUpdate = compareSemVer(cleanLatest, currentVersion) > 0;

  // Find direct zip asset if available
  const zipAsset = release.assets?.find(a => a.name.endsWith('.zip'));

  return {
    hasUpdate,
    currentVersion,
    latestVersion: cleanLatest,
    releaseName: release.name || latestTag,
    releaseNotes: release.body || '',
    releaseUrl: release.html_url,
    downloadUrl: zipAsset?.browser_download_url || release.html_url,
    publishedAt: release.published_at,
  };
}
