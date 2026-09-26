import type { MetadataRoute } from "next";
import fs from "fs";
import path from "path";
import { getPostSlugsByType } from "@/lib/sanity";

const BASE_URL = "https://secure-house.co.uk";

const PAGE_MARKERS = new Set([
  "page.tsx",
  "page.ts",
  "page.jsx",
  "page.js",
  "content.html",
]);

function getPages(dir: string, basePath: string = ""): string[] {
  const entries = fs.readdirSync(dir, { withFileTypes: true });
  const urls: string[] = [];

  // A directory can carry both a page.tsx and a legacy content.html (raw-HTML
  // pages still mid-migration) — count it as one route, not one per marker file.
  const hasPage = entries.some(
    (entry) => !entry.isDirectory() && PAGE_MARKERS.has(entry.name),
  );
  if (hasPage) {
    urls.push(basePath || "/");
  }

  for (const entry of entries) {
    // Skip non-route directories, plus dynamic segments (e.g. "[slug]") —
    // these are route templates, not real URLs to list in the sitemap.
    if (
      entry.name.startsWith(".") ||
      entry.name.startsWith("_") ||
      entry.name === "api" ||
      (entry.name.startsWith("[") && entry.name.endsWith("]"))
    ) {
      continue;
    }

    if (entry.isDirectory()) {
      const fullPath = path.join(dir, entry.name);
      // Recurse into subdirectories
      urls.push(...getPages(fullPath, `${basePath}/${entry.name}`));
    }
  }

  return urls;
}

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const appDir = path.join(process.cwd(), "app");
  const pages = getPages(appDir);

  const staticEntries = pages.map((route) => ({
    url: `${BASE_URL}${route}${route.endsWith("/") ? "" : "/"}`,
    lastModified: new Date(),
    changeFrequency: "monthly" as const,
    priority: route === "/" ? 1.0 : route.split("/").length <= 2 ? 0.8 : 0.6,
  }));

  // getPages() above walks page.tsx files on disk and explicitly skips every
  // [slug] directory (dynamic routes aren't real filesystem URLs) - the only
  // two dynamic routes on the whole site are these, so their real posts are
  // added here instead, straight from Sanity.
  const [blogPosts, inspirationPosts] = await Promise.all([
    getPostSlugsByType("blog"),
    getPostSlugsByType("inspiration"),
  ]);

  const postEntries = [
    ...blogPosts.map((post) => ({ ...post, section: "blog" as const })),
    ...inspirationPosts.map((post) => ({ ...post, section: "inspiration" as const })),
  ].map((post) => ({
    url: `${BASE_URL}/${post.section}/${post.slug}/`,
    lastModified: new Date(post._updatedAt),
    changeFrequency: "monthly" as const,
    priority: 0.6,
  }));

  return [...staticEntries, ...postEntries];
}
