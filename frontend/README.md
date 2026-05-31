This is a [Next.js](https://nextjs.org) project bootstrapped with [`create-next-app`](https://nextjs.org/docs/app/api-reference/cli/create-next-app).

## API and deployment

The UI calls the FastAPI backend under `/api/v1/...`.

- **Default (local):** Client code uses same-origin URLs (empty base). `next.config.ts` rewrites `/api/*` to `http://127.0.0.1:8000` so you can run `npm run dev` and `uvicorn` without setting `NEXT_PUBLIC_API_URL`.
- **Production (split host):** Set `NEXT_API_REWRITE_URL` to your deployed API origin (no trailing slash), e.g. `https://api.example.com`, so the rewrite targets the right backend. The Python server must list your site origin in `NIGHTMARENET_CORS_ORIGINS` if the browser calls the API **directly** via `NEXT_PUBLIC_API_URL` instead; with same-origin rewrites, CORS is not involved for those requests.
- **Direct API URL in the browser:** If you set `NEXT_PUBLIC_API_URL`, all fetches go there and Next rewrites are not used for those calls. Configure CORS on the API for your frontend origin.

## Getting Started

First, run the development server:

```bash
npm run dev
# or
yarn dev
# or
pnpm dev
# or
bun dev
```

Open [http://localhost:3000](http://localhost:3000) with your browser to see the result.

You can start editing the page by modifying `app/page.tsx`. The page auto-updates as you edit the file.

This project uses [`next/font`](https://nextjs.org/docs/app/building-your-application/optimizing/fonts) to automatically optimize and load [Geist](https://vercel.com/font), a new font family for Vercel.

## Learn More

To learn more about Next.js, take a look at the following resources:

- [Next.js Documentation](https://nextjs.org/docs) - learn about Next.js features and API.
- [Learn Next.js](https://nextjs.org/learn) - an interactive Next.js tutorial.

You can check out [the Next.js GitHub repository](https://github.com/vercel/next.js) - your feedback and contributions are welcome!

## Deploy on Vercel

The easiest way to deploy your Next.js app is to use the [Vercel Platform](https://vercel.com/new?utm_medium=default-template&filter=next.js&utm_source=create-next-app&utm_campaign=create-next-app-readme) from the creators of Next.js.

Check out our [Next.js deployment documentation](https://nextjs.org/docs/app/building-your-application/deploying) for more details.
