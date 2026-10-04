// Link targets that come from props. Vue doesn't filter `javascript:` URLs at
// all (React 19 does, with an error), so a link built from user data could run
// script. Only schemes that execute or embed a document are dropped; relative
// paths, http(s), mailto:, tel: and app schemes pass through untouched.

const DANGEROUS = new Set(['javascript', 'vbscript', 'data'])

/** `href` unless it would run script (javascript:, vbscript:, data:), else undefined. */
export function safeHref(href: string | null | undefined): string | undefined {
  if (!href) return undefined
  // URL parsers ignore control characters and whitespace inside the scheme.
  const probe = href.replace(/[\u0000- \u007f-\u009f]/g, '')
  const scheme = /^([a-z][a-z0-9+.-]*):/i.exec(probe)
  return scheme && DANGEROUS.has(scheme[1].toLowerCase()) ? undefined : href
}
