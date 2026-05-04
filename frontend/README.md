# Lead with AI (Marketing Website)

## Overview

This is the frontend marketing website for the **"Lead with AI"** 2-day professional AI program hosted by Global Knowledge Technologies. 

It is a lightweight, frontend-only React application built with Vite. It features a bespoke plain CSS design system, implementing a luxury-editorial aesthetic (beige/espresso palette, with fonts like Playfair Display, EB Garamond, and DM Sans).

## Pages & Structure

The app uses `wouter` for lightweight routing. There are four main pages:
- **Home (`/`)**: Features a hero section, an interactive "Six Things" grid with staggered scroll-reveals and ghost numerals, schedule breakdown, and call-to-actions.
- **Program (`/program`)**: Detailed program breakdown and curriculum.
- **Speakers (`/speakers`)**: Information about the industry practitioners mentoring the program.
- **Register (`/register`)**: Registration and brochure download forms.

### Key Components

- **`SixThings.tsx`**: A highly interactive grid displaying the core takeaways of the program. Includes click-to-flip dark states, hover lifts, ghost numerals, navigation dots, and an exploration progress tracker.
- **`NavBar.tsx` / `Footer.tsx`**: Global navigation components.

## Tech Stack
- **Framework**: React 19
- **Bundler**: Vite
- **Routing**: Wouter
- **Styling**: Vanilla CSS (`index.css` contains the design system)

## Commands

Run these from the project root using `pnpm --filter`:

- **Start Dev Server**: `pnpm --filter @workspace/lead-with-ai run dev`
- **Build**: `pnpm --filter @workspace/lead-with-ai run build`
- **Typecheck**: `pnpm --filter @workspace/lead-with-ai run typecheck`
