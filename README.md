# BadCase Tools

A static Markdown and LaTeX editor with dual-pane real-time preview. Built for GitHub Pages deployment.

## Features

- Left-right split pane: Markdown source on the left, rendered preview on the right
- LaTeX math rendering via KaTeX (supports `$...$`, `$$...$$`, `\(...\)`, and `\[...\]`)
- Syntax highlighting powered by Monaco Editor
- Auto-save to browser localStorage
- Debounced rendering for smooth editing experience
- Pure client-side -- no backend required

## Tech Stack

| Layer | Library |
|-------|---------|
| Build | Vite |
| UI Framework | React 18 (TypeScript) |
| Styling | Tailwind CSS + @tailwindcss/typography |
| Editor | Monaco Editor (@monaco-editor/react) |
| Markdown | markdown-it |
| LaTeX | KaTeX + markdown-it-katex |

## Getting Started

```bash
# Install dependencies
npm install

# Start dev server
npm run dev

# Build for production
npm run build

# Preview production build locally
npm run preview
```

The dev server runs at `http://localhost:5173` by default.

## Deployment

This project is designed to deploy to GitHub Pages via GitHub Actions. On every push to the `main` branch, the workflow:

1. Checks out the repository
2. Installs dependencies
3. Runs `npm run build`
4. Deploys the `dist/` directory to the `gh-pages` branch

Make sure GitHub Pages is enabled in your repository settings and set to deploy from the `gh-pages` branch.
