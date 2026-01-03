# Catalog Frontend

Next.js frontend with shadcn UI and Tailwind CSS.

## Setup

1. Install dependencies:
   ```bash
   npm install
   ```

2. Run the development server:
   ```bash
   npm run dev
   ```

The app will be available at `http://localhost:3000`

## Adding shadcn UI Components

To add shadcn UI components, use:
```bash
npx shadcn@latest add [component-name]
```

For example:
```bash
npx shadcn@latest add button
npx shadcn@latest add card
```

## Project Structure

- `app/` - Next.js app directory with pages and layouts
- `components/` - React components
- `components/ui/` - shadcn UI components
- `lib/` - Utility functions
- `public/` - Static assets
