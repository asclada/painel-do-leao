import type { MetadataRoute } from "next";
import { meta } from "@/lib/data";
import { SITE_URL } from "@/lib/site";

export default function sitemap(): MetadataRoute.Sitemap {
  return [{ url: SITE_URL, lastModified: meta.updatedAt ?? undefined, changeFrequency: "hourly", priority: 1 }];
}
