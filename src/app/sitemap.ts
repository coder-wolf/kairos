import type { MetadataRoute } from "next";

const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? "https://kairos-app.live";

export default function sitemap(): MetadataRoute.Sitemap {
  const lastModified = new Date();
  return [
    { url: `${appUrl}/`, lastModified, changeFrequency: "weekly", priority: 1 },
    { url: `${appUrl}/signup`, lastModified, changeFrequency: "monthly", priority: 0.7 },
    { url: `${appUrl}/login`, lastModified, changeFrequency: "monthly", priority: 0.5 },
  ];
}
