# Movie finder

A movie discovery app: search with autocomplete, filter by genre, browse
posters with rating and content-rating (PG/PG-13/R) badges. No playback —
browsing and discovery only. Built on the free TMDB API.

## Setup

1. Get a free TMDB API key: https://www.themoviedb.org/settings/api
2. `cp .env.example .env` and paste your key in as `VITE_TMDB_API_KEY`
3. `npm install`
4. `npm run dev`

## Deploy to Vercel

1. Push this repo to GitHub
2. Import it in Vercel (vercel.com/new)
3. Add an environment variable: `VITE_TMDB_API_KEY` = your key
4. Deploy

Note: since this key is prefixed `VITE_`, it ships to the browser bundle.
That's fine for TMDB's free non-commercial tier, but if you want to hide it,
move the calls in `src/api/tmdb.js` behind a Vercel serverless function
(`/api/*.js`) instead of calling TMDB directly from the client.

## Project structure

```
src/
├── api/tmdb.js          all TMDB network calls
├── hooks/useDebounce.js  debounce for the search input
└── components/
    ├── SearchBar.jsx     autocomplete input + dropdown
    ├── GenreFilter.jsx   multi-select genre chips
    ├── MovieGrid.jsx     responsive poster grid
    ├── MovieCard.jsx     poster + rating/certification badges
    └── MovieModal.jsx    detail popup (overview, cast info, no player)
```

## Attribution

This product uses the TMDB API but is not endorsed or certified by TMDB.
Required by TMDB's API terms of use.
