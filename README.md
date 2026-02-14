# ProjectPulse

A modern landing page with an admin dashboard, built with **Next.js 14**, **Tailwind CSS**, **TypeScript**, and **Supabase**.

## Features

- Responsive landing page with hero, features, and contact form
- Admin login and dashboard
- Contact form submissions stored in Supabase
- Dashboard table to view submissions

## Getting Started

1. Install dependencies:
   ```bash
   npm install
   ```

2. Add your Supabase credentials to `.env.local`:
   ```
   NEXT_PUBLIC_SUPABASE_URL=your_supabase_url
   NEXT_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key
   ```

3. Run the development server:
   ```bash
   npm run dev
   ```

4. Open [http://localhost:3000](http://localhost:3000) in your browser.

## Project Structure

- `app/` — Next.js App Router pages and layouts
- `components/` — Reusable UI components
- `lib/` — External service configs (Supabase)
- `types/` — TypeScript type definitions
- `public/` — Static assets
