import { useState, useCallback, useRef } from "react"
import Icon from "@/components/ui/icon"
import { AddTitleModal } from "@/components/add-title-modal"

const SEARCH_URL = "https://functions.poehali.dev/99369ae5-7bbd-4eaa-8de5-f7f249ca6702"

interface SearchResult {
  source: "local" | "tmdb"
  id?: number
  tmdb_id?: number
  type: "movie" | "series"
  title: string
  original_title?: string
  year?: string | number
  description?: string
  poster_url?: string | null
  genres?: string[]
  rating?: number | null
}

interface SearchModalProps {
  isOpen: boolean
  onClose: () => void
}

export function SearchModal({ isOpen, onClose }: SearchModalProps) {
  const [query, setQuery] = useState("")
  const [localResults, setLocalResults] = useState<SearchResult[]>([])
  const [tmdbResults, setTmdbResults] = useState<SearchResult[]>([])
  const [loading, setLoading] = useState(false)
  const [searched, setSearched] = useState(false)
  const [addTarget, setAddTarget] = useState<SearchResult | null>(null)
  const debounceRef = useRef<ReturnType<typeof setTimeout>>()

  const search = useCallback(async (q: string) => {
    if (!q.trim()) {
      setLocalResults([])
      setTmdbResults([])
      setSearched(false)
      return
    }
    setLoading(true)
    try {
      const res = await fetch(`${SEARCH_URL}?q=${encodeURIComponent(q)}`)
      const data = await res.json()
      setLocalResults(data.local || [])
      setTmdbResults(data.tmdb || [])
      setSearched(true)
    } catch {
      setLocalResults([])
      setTmdbResults([])
    } finally {
      setLoading(false)
    }
  }, [])

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value
    setQuery(val)
    clearTimeout(debounceRef.current)
    debounceRef.current = setTimeout(() => search(val), 450)
  }

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Escape") onClose()
    if (e.key === "Enter") {
      clearTimeout(debounceRef.current)
      search(query)
    }
  }

  if (!isOpen) return null

  const totalResults = localResults.length + tmdbResults.length
  const noResults = searched && !loading && totalResults === 0

  return (
    <>
      <div
        className="fixed inset-0 z-[100] bg-black/70 backdrop-blur-sm"
        onClick={onClose}
      />
      <div className="fixed inset-x-4 top-[10%] z-[101] mx-auto max-w-2xl rounded-2xl border border-white/10 bg-black/90 shadow-2xl backdrop-blur-xl md:inset-x-auto md:left-1/2 md:-translate-x-1/2 md:w-full">
        {/* Search input */}
        <div className="flex items-center gap-3 border-b border-white/10 px-5 py-4">
          <Icon name="Search" size={18} className="shrink-0 text-white/50" />
          <input
            autoFocus
            type="text"
            value={query}
            onChange={handleChange}
            onKeyDown={handleKeyDown}
            placeholder="Найти фильм или сериал..."
            className="flex-1 bg-transparent font-sans text-base text-white placeholder:text-white/40 focus:outline-none"
          />
          {loading && <Icon name="Loader2" size={16} className="animate-spin text-white/50" />}
          <button onClick={onClose} className="text-white/40 transition-colors hover:text-white/80">
            <Icon name="X" size={18} />
          </button>
        </div>

        {/* Results */}
        <div className="max-h-[60vh] overflow-y-auto p-2">
          {!searched && !loading && (
            <p className="px-4 py-8 text-center font-mono text-sm text-white/30">
              Начните вводить название
            </p>
          )}

          {noResults && (
            <div className="px-4 py-6 text-center">
              <p className="mb-3 font-sans text-sm text-white/60">Ничего не найдено по запросу «{query}»</p>
              <button
                onClick={() => setAddTarget({ source: "local", type: "movie", title: query })}
                className="inline-flex items-center gap-2 rounded-full border border-white/20 bg-white/10 px-5 py-2 font-mono text-xs text-white transition-all hover:bg-white/15"
              >
                <Icon name="Plus" size={14} />
                Добавить вручную
              </button>
            </div>
          )}

          {/* Local results */}
          {localResults.length > 0 && (
            <div className="mb-2">
              <p className="px-3 py-1.5 font-mono text-[10px] uppercase tracking-widest text-white/30">В базе</p>
              {localResults.map((r, i) => (
                <ResultRow key={i} result={r} inBase />
              ))}
            </div>
          )}

          {/* TMDB results */}
          {tmdbResults.length > 0 && (
            <div>
              <p className="px-3 py-1.5 font-mono text-[10px] uppercase tracking-widest text-white/30">Найдено в TMDB</p>
              {tmdbResults.map((r, i) => (
                <ResultRow key={i} result={r} onAdd={() => setAddTarget(r)} />
              ))}
            </div>
          )}
        </div>
      </div>

      {addTarget && (
        <AddTitleModal
          prefill={addTarget}
          onClose={() => setAddTarget(null)}
          onAdded={() => {
            setAddTarget(null)
            search(query)
          }}
        />
      )}
    </>
  )
}

function ResultRow({ result, inBase, onAdd }: { result: SearchResult; inBase?: boolean; onAdd?: () => void }) {
  return (
    <div className="flex items-center gap-3 rounded-xl px-3 py-2.5 transition-colors hover:bg-white/5">
      <div className="h-12 w-9 shrink-0 overflow-hidden rounded-md bg-white/10">
        {result.poster_url ? (
          <img src={result.poster_url} alt={result.title} className="h-full w-full object-cover" />
        ) : (
          <div className="flex h-full w-full items-center justify-center">
            <Icon name="Film" size={14} className="text-white/30" />
          </div>
        )}
      </div>

      <div className="min-w-0 flex-1">
        <p className="truncate font-sans text-sm font-medium text-white">{result.title}</p>
        <p className="font-mono text-xs text-white/40">
          {result.type === "movie" ? "Фильм" : "Сериал"}
          {result.year ? ` · ${result.year}` : ""}
          {result.rating ? ` · ★ ${Number(result.rating).toFixed(1)}` : ""}
        </p>
      </div>

      {inBase ? (
        <span className="shrink-0 rounded-full bg-green-500/20 px-2.5 py-0.5 font-mono text-[10px] text-green-400">
          В базе
        </span>
      ) : (
        <button
          onClick={onAdd}
          className="shrink-0 rounded-full border border-white/20 bg-white/5 px-3 py-1 font-mono text-[10px] text-white/70 transition-all hover:bg-white/15 hover:text-white"
        >
          + Добавить
        </button>
      )}
    </div>
  )
}
