# ClassPulse

[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](LICENSE)

ClassPulse is a real-time classroom engagement platform and client for [ClassPoint](https://classpoint.app), built with Next.js, React, and SignalR. It enables presenters and participants to interact through live activities, slide sharing, and instant feedback. The app is designed for seamless classroom experiences, supporting drawing, short answers, and ranking activities.

Developed by [p55d2k](https://github.com/p55d2k).

## Features

- **Real-time Class Sessions**: Join and participate in live classroom sessions with instant updates.
- **Presenter & Participant Roles**: Dedicated interfaces for educators and students.
- **Live Slide Sharing**: View and interact with presentation slides in real-time.
- **Interactive Activities**:
  - Drawing canvas for collaborative sketching.
  - Short answer submissions for quick responses.
  - Ranking and choice-based activities.
- **Gamification**: Star and level system to encourage participation.
- **Session Stats & Logs**: Track engagement and view real-time feeds.
- **Responsive UI**: Built with Tailwind CSS for a modern, mobile-friendly experience.
- **SignalR Integration**: Seamless real-time communication.

## Tech Stack

- **Framework**: Next.js 15 (App Router)
- **Frontend**: React 19, TypeScript
- **Styling**: Tailwind CSS, Radix UI
- **Real-time**: Microsoft SignalR
- **Drawing**: Konva, Fabric.js
- **Icons**: Lucide React
- **Build Tool**: Turbopack (via Next.js)

## Prerequisites

- Node.js 18+ or Bun
- npm, yarn, pnpm, or bun package manager

## Getting Started

### Installation

Clone the repository:

```bash
git clone https://github.com/p55d2k/classpoint-client.git
cd classpoint-client
```

Install dependencies:

```bash
npm install
# or
yarn install
# or
pnpm install
# or
bun install
```

### Development

Run the development server:

```bash
npm run dev
# or
yarn dev
# or
pnpm dev
# or
bun dev
```

Open [http://localhost:3000](http://localhost:3000) in your browser.

The app auto-updates as you edit files. Start by modifying `src/app/page.tsx`.

## Scripts

- `dev`: Start development server with Turbopack
- `build`: Build for production
- `start`: Start production server
- `lint`: Run ESLint

## API Routes

ClassPulse includes several API routes that proxy requests to ClassPoint's backend:

- `GET /api/byclasscode?classcode=<code>`: Retrieve region information for a class code.
- `POST /api/validate-join`: Validate and join a class session.
- `GET /api/participant-app?email=<email>`: Fetch participant user data.

These routes handle authentication and data fetching from the upstream ClassPoint API.

## Project Structure

```
src/
├── app/
│   ├── api/          # API routes
│   ├── class/        # Class session page
│   ├── globals.css   # Global styles
│   ├── layout.tsx    # Root layout
│   └── page.tsx      # Home page
├── components/
│   ├── ui/           # Reusable UI components (Radix-based)
│   └── class/        # Class-specific components
├── hooks/            # Custom React hooks
├── lib/              # Utilities and helpers
└── types/            # TypeScript definitions
```

## Contributing

Contributions are welcome! Please follow these steps:

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

Please open an issue to discuss major changes before submitting PRs.

## License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## Acknowledgments

- Built on top of [ClassPoint](https://classpoint.app) platform
- UI components powered by [Radix UI](https://www.radix-ui.com/)
- Icons from [Lucide](https://lucide.dev/)

## Deploy

Deploy easily on [Vercel](https://vercel.com/new?utm_medium=default-template&filter=next.js&utm_source=create-next-app&utm_campaign=create-next-app-readme) or your preferred platform.

See [Next.js deployment docs](https://nextjs.org/docs/app/building-your-application/deploying) for more details.
