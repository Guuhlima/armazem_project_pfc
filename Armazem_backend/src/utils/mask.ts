function maskEmail(
  email: string,
  options?: { keep?: number; showDomain?: boolean }
): string {
  if (!email || typeof email !== 'string') return email;

  const KEEP = options?.keep ?? 3;
  const SHOW_DOMAIN = options?.showDomain ?? true;

  const [local, domain = ''] = email.split('@');
  if (!local) return email;

  const keepN = Math.min(KEEP, local.length);
  const head = local.slice(0, keepN);
  const restLen = Math.max(local.length - keepN, 0);

  const maskedLocal = head + (restLen > 0 ? '*'.repeat(restLen) : '');

  if (!SHOW_DOMAIN || !domain) {
    return maskedLocal + (domain ? '@****' : '');
  }

  return `${maskedLocal}@${domain}`;
}