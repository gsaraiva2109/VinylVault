const _env_name = "VERCEL_PROJECT_PRODUCTION_URL";

export const siteHost = process.env[_env_name] || "nextjs-marketing-website.basehub.com";
export const siteUrl = `https://${siteHost}`;
