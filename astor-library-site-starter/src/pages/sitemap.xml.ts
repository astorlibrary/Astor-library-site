import { books, authors, periods } from '../data/books';
import { siteConfig } from '../site.config';

export async function GET() {
  const routes = [
    '/',
    '/library/',
    '/shakespeare/',
    '/study/',
    ...books.map((book) => `/books/${book.slug}/`),
    ...authors.map((author) => `/authors/${author.slug}/`),
    ...periods.map((period) => `/periods/${period.slug}/`)
  ];

  const body = `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${routes
    .map((route) => `  <url><loc>${siteConfig.url}${route}</loc></url>`)
    .join('\n')}\n</urlset>`;

  return new Response(body, {
    headers: { 'Content-Type': 'application/xml' }
  });
}
