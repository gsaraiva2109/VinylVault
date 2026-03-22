export function isExternalLink(url: string | null | undefined) {
  return url && /^https?:\/\//.test(url);
}
