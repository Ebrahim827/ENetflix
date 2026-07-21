import { useState, useEffect } from 'react'

// ---------- TMDB API helpers ----------
const API_KEY = import.meta.env.VITE_TMDB_API_KEY
const BASE_URL = 'https://api.themoviedb.org/3'
const IMAGE_BASE = 'https://image.tmdb.org/t/p/w500'
const BLOCKED_GENRES = ['Romance']
const BLOCKED_CERTIFICATIONS = ['R', 'NC-17', '18', '18A']

const BLOCKED_WORDS = [
  "sex", "sexual", "erotic", "porn", "nude", "nudity", "strip",
  "escort", "prostitute", "brothel", "xxx", "fetish", "bdsm", "hot",
  "orgy", "incest", "affair", "mistress", "seduction", "seduce"
]

const THEMES = ["light", "dark", "ocean", "emerald", "purple", "sunset", "rose", "oled"]

async function tmdb(path, params = {}) {
  const url = new URL(`${BASE_URL}${path}`)
  url.searchParams.set('api_key', API_KEY)
  Object.entries(params).forEach(([k, v]) => v && url.searchParams.set(k, v))
  const res = await fetch(url.toString())
  if (!res.ok) throw new Error(`TMDB request failed: ${res.status}`)
  return res.json()
}

const posterUrl = (path) => (path ? `${IMAGE_BASE}${path}` : null)

async function getCertification(id) {
  const data = await tmdb(`/movie/${id}/release_dates`)
  const us = data.results.find((r) => r.iso_3166_1 === 'US')
  return us?.release_dates.find((d) => d.certification)?.certification || 'NR'
}

function isAllowedMovie(movie) {
  if (movie.adult) return false
  if (movie.certification && BLOCKED_CERTIFICATIONS.includes(movie.certification.toUpperCase().trim())) return false

  const genres = movie.genre_names || []
  if (genres.some((g) => BLOCKED_GENRES.includes(g))) return false

  const title = (movie.title || "").toLowerCase()
  const overview = (movie.overview || "").toLowerCase()
  const blocked = BLOCKED_WORDS.some((word) => title.includes(word) || overview.includes(word))
  if (blocked) return false

  return true
}

// ---------- Main app ----------
export default function App() {
  const [genres, setGenres] = useState([])
  const [selectedGenreIds, setSelectedGenreIds] = useState([])
  const [query, setQuery] = useState('')
  const [suggestions, setSuggestions] = useState([])
  const [movies, setMovies] = useState([])
  const [loading, setLoading] = useState(true)
  const [activeMovie, setActiveMovie] = useState(null)

  const [showSettings, setShowSettings] = useState(false)
  const [theme, setTheme] = useState(localStorage.getItem("theme") || "light")

  // Load genre list once
  useEffect(() => {
    tmdb('/genre/movie/list').then((d) =>
      setGenres(d.genres.filter((g) => g.name !== 'Romance'))
    )
  }, [])

  // Debounced autocomplete search
  useEffect(() => {
    if (!query.trim()) return setSuggestions([])
    const timer = setTimeout(() => {
      tmdb('/search/movie', { query }).then(async (d) => {
        const results = await Promise.all(
          d.results.map(async (m) => {
            const cert = await getCertification(m.id).catch(() => null)
            return {
              ...m,
              certification: cert,
              genre_names: genres.filter((g) => m.genre_ids.includes(g.id)).map((g) => g.name),
            }
          })
        )
        setSuggestions(results.filter(isAllowedMovie).slice(0, 6))
      })
    }, 300)
    return () => clearTimeout(timer)
  }, [query, genres])

  // Browse grid, refetches whenever genre filters change
  useEffect(() => {
    async function loadMovies() {
      setLoading(true)
      let allowedMovies = []
      let page = 1

      while (allowedMovies.length < 50 && page <= 10) {
        const data = await tmdb('/discover/movie', {
          with_genres: selectedGenreIds.join(','),
          sort_by: 'popularity.desc',
          page,
        })

        const withCerts = await Promise.all(
          data.results.map(async (m) => ({
            ...m,
            certification: await getCertification(m.id).catch(() => null),
            genre_names: genres.filter((g) => m.genre_ids.includes(g.id)).map((g) => g.name),
          }))
        )

        allowedMovies.push(...withCerts.filter(isAllowedMovie))
        page++
      }

      setMovies(allowedMovies.slice(0, 50))
      setLoading(false)
    }

    loadMovies()
  }, [selectedGenreIds, genres])

  function toggleGenre(id) {
    setSelectedGenreIds((prev) =>
      prev.includes(id) ? prev.filter((g) => g !== id) : [...prev, id]
    )
  }

  function changeTheme(newTheme) {
    setTheme(newTheme)
    document.documentElement.setAttribute("data-theme", newTheme)
    localStorage.setItem("theme", newTheme)
  }

  function openMovie(id) {
    setActiveMovie({ id, loading: true })
    Promise.all([tmdb(`/movie/${id}`), getCertification(id).catch(() => null)]).then(
      ([details, cert]) => setActiveMovie({ ...details, certification: cert })
    )
  }

  return (
    <div className="theme-bg theme-text min-h-screen">
      <div className="mx-auto max-w-6xl px-4 py-8">

        {/* Header row: title + settings gear */}
        <div className="mb-6 flex items-center justify-between">
          <h1 className="font-display text-6xl tracking-wide">ENetflix</h1>

          <button
            onClick={() => setShowSettings((s) => !s)}
            aria-label="Open theme settings"
            className="theme-card theme-border flex h-11 w-11 items-center justify-center rounded-full border shadow-sm hover:opacity-80"
          >
            <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24"
              fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <circle cx="12" cy="12" r="3" />
              <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 1 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 1 1-2.83-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 1 1 2.83-2.83l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 1 1 2.83 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z" />
            </svg>
          </button>
        </div>

        {/* Settings palette dropdown */}
        {showSettings && (
          <div className="theme-card theme-border fixed right-6 top-20 z-50 w-72 rounded-2xl border p-5 shadow-2xl">
            <div className="mb-4 flex items-center justify-between">
              <h2 className="text-lg font-semibold">Appearance</h2>
              <button onClick={() => setShowSettings(false)} className="theme-muted text-sm hover:opacity-70">
                ✕
              </button>
            </div>
            <div className="grid grid-cols-2 gap-3">
              {THEMES.map((t) => (
                <button
                  key={t}
                  onClick={() => changeTheme(t)}
                  className={`theme-border rounded-lg border p-3 text-sm capitalize hover:opacity-80 ${
                    theme === t ? 'ring-2 ring-offset-1' : ''
                  }`}
                  style={theme === t ? { borderColor: 'var(--accent)' } : {}}
                >
                  {t}
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Search with autocomplete dropdown */}
        <div className="relative mb-4 max-w-xl">
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search for a movie..."
            className="theme-card theme-border theme-text w-full rounded-lg border px-4 py-2.5 text-sm outline-none focus:border-current"
          />
          {suggestions.length > 0 && (
            <ul className="theme-card theme-border absolute z-10 mt-1 w-full overflow-hidden rounded-lg border shadow-lg">
              {suggestions.map((m) => (
                <li
                  key={m.id}
                  onClick={() => {
                    openMovie(m.id)
                    setQuery(m.title)
                    setSuggestions([])
                  }}
                  className="flex cursor-pointer items-center gap-3 px-3 py-2 hover:opacity-80"
                >
                  <div className="h-11 w-8 flex-shrink-0 overflow-hidden rounded bg-black/10">
                    {m.poster_path && (
                      <img src={posterUrl(m.poster_path)} alt="" className="h-full w-full object-cover" />
                    )}
                  </div>
                  <span className="text-sm">{m.title}</span>
                </li>
              ))}
            </ul>
          )}
        </div>

        {/* Genre filter chips */}
        <div className="mb-6 flex flex-wrap gap-2">
          {genres.map((g) => (
            <button
              key={g.id}
              onClick={() => toggleGenre(g.id)}
              className={`theme-border rounded-full border px-3.5 py-1.5 text-sm transition ${
                selectedGenreIds.includes(g.id) ? 'theme-button' : 'hover:opacity-80'
              }`}
            >
              {g.name}
            </button>
          ))}
        </div>

        {/* Poster grid */}
        {loading ? (
          <p className="theme-muted py-12 text-center text-sm">Loading movies…</p>
        ) : movies.length === 0 ? (
          <p className="theme-muted py-12 text-center text-sm">No movies found. Try different filters.</p>
        ) : (
          <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5">
            {movies.map((m) => (
              <button key={m.id} onClick={() => openMovie(m.id)} className="group text-left">
                <div className="relative aspect-[2/3] overflow-hidden rounded-lg bg-black/10">
                  {m.poster_path ? (
                    <img
                      src={posterUrl(m.poster_path)}
                      alt={m.title}
                      loading="lazy"
                      className="h-full w-full object-cover transition group-hover:scale-105"
                    />
                  ) : (
                    <div className="theme-muted flex h-full items-center justify-center text-xs">No poster</div>
                  )}
                  <span className="absolute left-1.5 top-1.5 rounded bg-black/70 px-1.5 py-0.5 text-[11px] text-white">
                    {m.certification || '—'}
                  </span>
                  <span className="absolute right-1.5 top-1.5 rounded bg-black/70 px-1.5 py-0.5 text-[11px] text-white">
                    ★ {m.vote_average?.toFixed(1)}
                  </span>
                </div>
                <p className="mt-1.5 line-clamp-1 text-sm font-medium">{m.title}</p>
              </button>
            ))}
          </div>
        )}

        {/* Detail modal - info only, no playback */}
        {activeMovie && (
          <div
            className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4"
            onClick={() => setActiveMovie(null)}
          >
            <div
              onClick={(e) => e.stopPropagation()}
              className="theme-card max-h-[85vh] w-full max-w-2xl overflow-y-auto rounded-xl p-5"
            >
              {activeMovie.loading ? (
                <p className="theme-muted py-12 text-center text-sm">Loading…</p>
              ) : (
                <div className="flex gap-5">
                  <img
                    src={posterUrl(activeMovie.poster_path)}
                    alt={activeMovie.title}
                    className="h-64 w-44 flex-shrink-0 rounded-lg object-cover"
                  />
                  <div>
                    <h2 className="text-xl font-semibold">{activeMovie.title}</h2>
                    <div className="theme-muted mt-1 flex gap-2 text-sm">
                      <span>{activeMovie.release_date?.slice(0, 4)}</span>
                      <span>·</span>
                      <span>{activeMovie.certification || 'NR'}</span>
                      <span>·</span>
                      <span>★ {activeMovie.vote_average?.toFixed(1)}</span>
                    </div>
                    <div className="mt-2 flex flex-wrap gap-1.5">
                      {activeMovie.genres?.map((g) => (
                        <span key={g.id} className="rounded-full bg-black/10 px-2.5 py-0.5 text-xs">
                          {g.name}
                        </span>
                      ))}
                    </div>
                    <p className="theme-muted mt-3 text-sm leading-relaxed">{activeMovie.overview}</p>
                  </div>
                </div>
              )}
              <button onClick={() => setActiveMovie(null)} className="theme-muted mt-4 text-sm hover:opacity-70">
                Close
              </button>
            </div>
          </div>
        )}

        <p className="theme-muted mt-10 text-center text-xs">
          This product uses the TMDB API but is not endorsed by TMDB.
        </p>
      </div>
    </div>
  )
}