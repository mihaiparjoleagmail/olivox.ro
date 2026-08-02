import { MetadataRoute } from "next";

// A crawler obeys ONLY the most specific group matching its user-agent — rules
// from the "*" group are NOT inherited. So every named group has to repeat the
// disallow list, otherwise the AI crawlers below would be free to walk /admin
// and /api/.
const DISALLOW = ["/admin", "/api/", "/cautare?"];

// Allowed for brand visibility in AI-generated answers.
const AI_CRAWLERS = [
  "GPTBot",
  "OAI-SearchBot",
  "ChatGPT-User",
  "CCBot",
  "Google-Extended",
  "PerplexityBot",
  "ClaudeBot",
  "Claude-SearchBot",
  "Claude-User",
  "anthropic-ai",
  "Applebot-Extended",
  "meta-externalagent",
];

export default function robots(): MetadataRoute.Robots {
  return {
    rules: [
      { userAgent: "*", allow: "/", disallow: DISALLOW },
      ...AI_CRAWLERS.map((userAgent) => ({ userAgent, allow: "/", disallow: DISALLOW })),
    ],
    sitemap: [
      "https://olivox.ro/sitemap.xml",
      "https://olivox.ro/sitemap-images.xml",
    ],
    host: "https://olivox.ro",
  };
}
