# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

This is a Next.js 16 application called "liftingdiary" built with:
- Next.js 16.1.6 (App Router)
- React 19.2.3
- TypeScript 5
- Tailwind CSS v4 (using PostCSS plugin)
- ESLint 9 with Next.js config

## Documentation-First Approach

**CRITICAL**: Before generating any code, ALWAYS consult the relevant documentation files in the `/docs` directory first. These files contain:
- UI standards and guidelines (`ui.md`)
- Data fetching patterns and security requirements (`data-fetching.md`)
- Authentication standards and Clerk integration (`auth.md`)
- Component patterns and best practices
- Project-specific conventions and requirements

All code generated must strictly adhere to the standards and patterns documented in these files. Do not proceed with code generation without first reviewing the appropriate documentation.

- /docs/ui.md
- /docs/data-fetching.md
- /docs/auth.md

## Development Commands

```bash
# Start development server (http://localhost:3000)
npm run dev

# Build for production
npm run build

# Start production server
npm start

# Run ESLint
npm run lint
```

## Architecture

### App Router Structure
This project uses Next.js App Router with the `src/app/` directory structure:
- `src/app/layout.tsx` - Root layout with Geist fonts (Sans and Mono) configured via `next/font/google`
- `src/app/page.tsx` - Home page component
- `src/app/globals.css` - Global styles with Tailwind CSS v4 imports and theme configuration

### TypeScript Configuration
- Path alias: `@/*` maps to `./src/*`
- Strict mode enabled
- JSX mode: `react-jsx`
- Target: ES2017

### Styling
- Uses Tailwind CSS v4 with the new PostCSS plugin (`@tailwindcss/postcss`)
- Tailwind v4 uses `@import "tailwindcss"` in CSS files instead of traditional directives
- Theme variables configured using `@theme inline` blocks in `globals.css`
- CSS variables for colors: `--background`, `--foreground`
- Geist fonts configured as CSS variables: `--font-geist-sans`, `--font-geist-mono`
- Dark mode via media query (`prefers-color-scheme: dark`)

### ESLint
- Uses ESLint 9 flat config format (`eslint.config.mjs`)
- Extends `eslint-config-next/core-web-vitals` and `eslint-config-next/typescript`
- Custom global ignores for `.next/`, `out/`, `build/`, and `next-env.d.ts`
