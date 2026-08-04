import type { MetadataRoute } from 'next';
import { siteConfig } from '@/lib/config';

export default function sitemap(): MetadataRoute.Sitemap {
  const lastModified = new Date();

  return [
    {
      url: siteConfig.url,
      lastModified,
      changeFrequency: 'monthly',
      priority: 1,
    },
    {
      url: `${siteConfig.url}/pricing`,
      lastModified,
      changeFrequency: 'monthly',
      priority: 0.9,
    },
    {
      url: `${siteConfig.url}/services`,
      lastModified,
      changeFrequency: 'monthly',
      priority: 0.8,
    },
    {
      url: `${siteConfig.url}/works`,
      lastModified,
      changeFrequency: 'monthly',
      priority: 0.6,
    },
    {
      url: `${siteConfig.url}/contacts`,
      lastModified,
      changeFrequency: 'yearly',
      priority: 0.5,
    },
  ];
}
