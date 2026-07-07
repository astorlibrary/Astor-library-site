# Astor Library site starter

This is the first Astro starter site for Astor Library.

## What is included

- Homepage
- Library page
- Shakespeare page
- Study resources page
- Individual book/product pages
- Author pages
- Period pages
- Sitemap route
- Book/Product schema on book pages
- Placeholder covers until final covers are added

## Cloudflare Pages settings

Use these settings when connecting the repository:

- Framework preset: Astro
- Build command: npm run build
- Build output directory: dist
- Production branch: main

## Editing books

Book data is in:

src/data/books.ts

Each book has:
- title
- author
- period
- description
- opening context
- study sections
- adaptations
- sources
- buy links

## Domain

When the final domain is confirmed, update:

src/site.config.ts
astro.config.mjs
public/robots.txt
