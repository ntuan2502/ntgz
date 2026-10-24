import { GitHubRelease, UpdateCheckResult, OlderReleaseInfo } from '../shared/types/github';

const GITHUB_REPO = 'ntuan2502/ntgz';
const RELEASES_API_URL = `https://api.github.com/repos/${GITHUB_REPO}/releases?per_page=15`;
const LATEST_RELEASE_API_URL = `https://api.github.com/repos/${GITHUB_REPO}/releases/latest`;

/**
 * Compare two semver strings: v1 > v2 returns 1, v1 < v2 returns -1, equal returns 0
 */
export function compareSemVer(v1: string, v2: string): number {
  const clean1 = v1.replace(/^v/, '').trim();
  const clean2 = v2.replace(/^v/, '').trim();

  const parts1 = clean1.split('.').map((p) => parseInt(p, 10) || 0);
  const parts2 = clean2.split('.').map((p) => parseInt(p, 10) || 0);

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
 * Fetch all releases from GitHub Releases API
 */
export async function fetchAllReleases(): Promise<GitHubRelease[]> {
  try {
    const res = await fetch(RELEASES_API_URL, {
      headers: {
        Accept: 'application/vnd.github.v3+json',
      },
    });

    if (res.ok) {
      const data = (await res.json()) as GitHubRelease[];
      if (Array.isArray(data) && data.length > 0) {
        return data.filter((r) => !r.draft);
      }
    }
  } catch {
    // Fall back to latest endpoint below
  }

  // Fallback to latest single release
  const resLatest = await fetch(LATEST_RELEASE_API_URL, {
    headers: {
      Accept: 'application/vnd.github.v3+json',
    },
  });

  if (!resLatest.ok) {
    throw new Error(`GitHub API returned status ${resLatest.status}: ${resLatest.statusText}`);
  }

  const single = (await resLatest.json()) as GitHubRelease;
  return [single];
}

/**
 * Check if a newer version is available and get all release notes
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

  const releases = await fetchAllReleases();
  if (releases.length === 0) {
    throw new Error('Không tìm thấy bản phát hành nào trên GitHub.');
  }

  const latest = releases[0] as GitHubRelease;
  const latestTag = latest.tag_name || '1.0.0';
  const cleanLatest = latestTag.replace(/^v/, '');

  const hasUpdate = compareSemVer(cleanLatest, currentVersion) > 0;

  // Direct zip download asset if available
  const zipAsset = latest.assets?.find((a) => a.name.endsWith('.zip'));

  const olderReleases: OlderReleaseInfo[] = releases.slice(1).map((r) => {
    const asset = r.assets?.find((a) => a.name.endsWith('.zip'));
    return {
      tag: r.tag_name,
      name: r.name || r.tag_name,
      body: r.body || '',
      publishedAt: r.published_at,
      htmlUrl: r.html_url,
      downloadUrl: asset?.browser_download_url || r.html_url,
    };
  });

  return {
    hasUpdate,
    currentVersion,
    latestVersion: cleanLatest,
    releaseName: latest.name || latestTag,
    releaseNotes: latest.body || '',
    releaseUrl: latest.html_url,
    downloadUrl: zipAsset?.browser_download_url || latest.html_url,
    publishedAt: latest.published_at,
    olderReleases,
  };
}
