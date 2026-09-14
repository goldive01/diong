// A nav link is "current" for its own path and any path nested under it
// (so /messages/42 still highlights "Messages"), but never for an unrelated
// path that merely shares a text prefix (/discover must not match a
// hypothetical /discover-archive).
export function isNavLinkActive(pathname: string | null, href: string): boolean {
  if (!pathname) return false;
  return pathname === href || pathname.startsWith(`${href}/`);
}
