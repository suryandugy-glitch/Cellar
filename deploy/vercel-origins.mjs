function httpsOrigin(value, name) {
  if (!value) return '';
  try {
    const url = new URL(value);
    const hostname = /^(?:[a-z0-9.-]+|\[[a-f0-9:]+\])$/i;
    if (url.protocol === 'https:' && hostname.test(url.hostname) &&
        !url.username && !url.password && url.href === url.origin + '/') {
      return url.origin;
    }
  } catch {
    // Report only the variable name in case a URL contains credentials.
  }
  throw new Error(name + ' must be an HTTPS origin, such as https://cellar.example.com');
}

const productionDomain = process.env.VERCEL_PROJECT_PRODUCTION_URL;
export const siteOrigin = httpsOrigin(process.env.CELLAR_SITE_URL || (productionDomain && 'https://' + productionDomain),
  'CELLAR_SITE_URL or VERCEL_PROJECT_PRODUCTION_URL');
export const workspaceOrigin = httpsOrigin(process.env.CELLAR_WORKSPACE_URL, 'CELLAR_WORKSPACE_URL');
if (workspaceOrigin && workspaceOrigin === siteOrigin) {
  throw new Error('The Java API must use a separate origin from the Vercel site.');
}
