export function offlineStatusMatches(
  status: { ready?: unknown; version?: unknown; buildId?: unknown },
  bundleVersion: string | undefined,
  buildId: string | undefined,
) {
  return Boolean(
    buildId &&
      bundleVersion &&
      status.ready === true &&
      status.version === bundleVersion &&
      status.buildId === buildId,
  );
}
