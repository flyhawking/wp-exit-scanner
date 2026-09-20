/** @type {import('next').NextConfig} */
const config = {};

// Lets `next dev` read the Cloudflare bindings declared in wrangler.jsonc,
// so KV/D1 work locally exactly as they do in production.
if (process.env.NODE_ENV === 'development') {
  const { initOpenNextCloudflareForDev } = await import('@opennextjs/cloudflare');
  initOpenNextCloudflareForDev();
}

export default config;
