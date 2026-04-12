import { APP_VERSION } from "@/lib/config";
import { errorResponse, successResponse } from "@/lib/api-response";
import { logger } from "@/lib/logger";

export const dynamic = "force-dynamic";

const GITHUB_REPO_OWNER = "wallacemt";
const GITHUB_REPO_NAME = "critix-vault-desktop";

interface GithubReleaseResponse {
  tag_name: string;
  html_url: string;
  name?: string;
  prerelease: boolean;
  published_at?: string;
}

function normalizeVersion(version: string): string {
  return version.trim().replace(/^v/i, "");
}

function parseVersionTokens(version: string): number[] {
  const baseVersion = normalizeVersion(version).split("-")[0] || "0";
  return baseVersion.split(".").map((token) => {
    const parsed = Number.parseInt(token, 10);
    return Number.isNaN(parsed) ? 0 : parsed;
  });
}

function compareVersions(a: string, b: string): number {
  const aTokens = parseVersionTokens(a);
  const bTokens = parseVersionTokens(b);
  const maxLength = Math.max(aTokens.length, bTokens.length);

  for (let index = 0; index < maxLength; index += 1) {
    const aToken = aTokens[index] ?? 0;
    const bToken = bTokens[index] ?? 0;

    if (aToken > bToken) return 1;
    if (aToken < bToken) return -1;
  }

  return 0;
}

export async function GET() {
  try {
    const githubApiUrl = `https://api.github.com/repos/${GITHUB_REPO_OWNER}/${GITHUB_REPO_NAME}/releases/latest`;
    const response = await fetch(githubApiUrl, {
      headers: {
        Accept: "application/vnd.github+json",
        "User-Agent": `${GITHUB_REPO_NAME}-updater`,
      },
      cache: "no-store",
    });

    if (!response.ok) {
      logger.error("Update check failed", {
        status: response.status,
        statusText: response.statusText,
      });
      return errorResponse(502, "EXTERNAL_API_ERROR", "Failed to check latest release information");
    }

    const release = (await response.json()) as GithubReleaseResponse;
    const currentVersion = normalizeVersion(APP_VERSION);
    const latestVersion = normalizeVersion(release.tag_name || APP_VERSION);
    const isUpdateAvailable = compareVersions(latestVersion, currentVersion) > 0;

    return successResponse({
      currentVersion,
      latestVersion,
      isUpdateAvailable,
      releaseUrl: release.html_url,
      releaseName: release.name || release.tag_name,
      prerelease: release.prerelease,
      publishedAt: release.published_at || null,
      checkedAt: new Date().toISOString(),
    });
  } catch (error) {
    logger.error("Unexpected error while checking updates", error);
    return errorResponse(500, "INTERNAL_ERROR", "Unable to verify updates at this time");
  }
}
