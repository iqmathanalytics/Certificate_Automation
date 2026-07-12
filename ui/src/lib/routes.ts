export const APP_BASENAME = "/certificates";

export const RESERVED_SLUGS = new Set(["login", "issue", "template"]);

export function isCredentialSlug(slug: string | undefined): boolean {
  if (!slug) return false;
  return !RESERVED_SLUGS.has(slug.toLowerCase());
}
