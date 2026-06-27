import { useEffect, useState, useCallback } from "react"
import { useParams, useNavigate } from "react-router-dom"
import Icon from "@/components/ui/icon"
import { useSession } from "@/hooks/use-session"

const TRACKER_URL = "https://functions.poehali.dev/e5caabea-3efe-4db8-b00b-d8bd37864965"

const STATUS_LABELS: Record<string, { label: string; icon: string; color: string }> = {
  watching:  { label: "Смотрю",         icon: "Play",         color: "text-blue-400 border-blue-400/40 bg-blue-400/10" },
  watched:   { label: "Посмотрел",      icon: "CheckCircle",  color: "text-green-400 border-green-400/40 bg-green-400/10" },
  planned:   { label: "Буду смотреть",  icon: "Clock",        color: "text-yellow-400 border-yellow-400/40 bg-yellow-400/10" },
  dropped:   { label: "Бросил",         icon: "XCircle",      color: "text-red-400 border-red-400/40 bg-red-400/10" },
}

interface Episode {
  season?: number
  episode?: number
  name?: string
  overview?: string
  air_date?: string
}

interface CastMember {
  name?: string
  character?: string
  profile?: string | null
}

interface CrewMember {
  name?: string
  job?: string
}

interface TitleData {
  id: number
  type: "movie" | "series"
  title: string
  original_title?: string
  year?: number
  description?: string
  poster_url?: string | null
  backdrop_url?: string | null
  genres?: string[]
  cast_members?: CastMember[]
  crew?: CrewMember[]
  episodes?: Episode[]
  rating?: number | null
  runtime?: number | null
  seasons_count?: number | null
  episodes_count?: number | null
  release_date?: string | null
  reviews?: { author?: string; text?: string; rating?: number }[]
}

export default function TitlePage() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const sessionId = useSession()

  const [title, setTitle] = useState<TitleData | null>(null)
  const [userStatus, setUserStatus] = useState<string | null>(null)
  const [episodeProgress, setEpisodeProgress] = useState<{ season: number; episode: number; watched: boolean }[]>([])
  const [isFavorite, setIsFavorite] = useState(false)
  const [loading, setLoading] = useState(true)
  const [activeTab, setActiveTab] = useState<"overview" | "episodes" | "cast">("overview")

  const fetchTitle = useCallback(async () => {
    if (!id) return
    setLoading(true)
    try {
      const res = await fetch(`${TRACKER_URL}?id=${id}`, {
        headers: { "X-Session-Id": sessionId },
      })
      const data = await res.json()
      setTitle(data.title)
      setUserStatus(data.user_status)
      setEpisodeProgress(data.episode_progress || [])
      setIsFavorite(data.is_favorite)
    } catch {
      // ignore
    } finally {
      setLoading(false)
    }
  }, [id, sessionId])

  useEffect(() => { fetchTitle() }, [fetchTitle])

  const postAction = async (body: object) => {
    await fetch(TRACKER_URL, {
      method: "POST",
      headers: { "Content-Type": "application/json", "X-Session-Id": sessionId },
      body: JSON.stringify(body),
    })
  }

  const handleSetStatus = async (status: string) => {
    const newStatus = userStatus === status ? null : status
    setUserStatus(newStatus)
    if (newStatus) await postAction({ action: "set_status", title_id: Number(id), status: newStatus })
  }

  const handleToggleFavorite = async () => {
    setIsFavorite(true)
    await postAction({ action: "toggle_favorite", title_id: Number(id) })
  }

  const isEpisodeWatched = (season: number, episode: number) =>
    episodeProgress.some((ep) => ep.season === season && ep.episode === episode && ep.watched)

  const handleToggleEpisode = async (season: number, episode: number) => {
    const currentlyWatched = isEpisodeWatched(season, episode)
    const newWatched = !currentlyWatched
    setEpisodeProgress((prev) => {
      const filtered = prev.filter((ep) => !(ep.season === season && ep.episode === episode))
      return [...filtered, { season, episode, watched: newWatched }]
    })
    await postAction({ action: "toggle_episode", title_id: Number(id), season, episode, watched: newWatched })
  }

  if (loading) {
    return (
      <div className="flex h-screen items-center justify-center bg-black">
        <Icon name="Loader2" size={32} className="animate-spin text-white/40" />
      </div>
    )
  }

  if (!title) {
    return (
      <div className="flex h-screen flex-col items-center justify-center gap-4 bg-black">
        <p className="font-mono text-sm text-white/40">Тайтл не найден</p>
        <button onClick={() => navigate("/")} className="rounded-full border border-white/10 px-5 py-2 font-mono text-xs text-white/60 hover:bg-white/5">
          На главную
        </button>
      </div>
    )
  }

  const watchedCount = episodeProgress.filter((ep) => ep.watched).length
  const totalEpisodes = title.episodes?.length || 0

  return (
    <div className="min-h-screen bg-black text-white">
      {/* Backdrop */}
      {title.backdrop_url && (
        <div className="pointer-events-none fixed inset-0 z-0">
          <img src={title.backdrop_url} alt="" className="h-full w-full object-cover opacity-10" />
          <div className="absolute inset-0 bg-gradient-to-b from-black/30 via-black/70 to-black" />
        </div>
      )}

      {/* Nav */}
      <nav className="relative z-10 flex items-center justify-between px-5 py-5 md:px-10">
        <button
          onClick={() => navigate(-1)}
          className="flex items-center gap-2 font-mono text-xs text-white/50 transition-colors hover:text-white/80"
        >
          <Icon name="ChevronLeft" size={16} />
          Назад
        </button>
        <span className="font-sans text-lg font-semibold tracking-tight">WatchLog</span>
        <button
          onClick={handleToggleFavorite}
          className={`flex items-center gap-1.5 rounded-full border px-4 py-1.5 font-mono text-xs transition-all ${
            isFavorite
              ? "border-yellow-400/40 bg-yellow-400/10 text-yellow-400"
              : "border-white/10 bg-white/5 text-white/50 hover:border-white/20 hover:text-white/70"
          }`}
        >
          <Icon name={isFavorite ? "Star" : "Star"} size={13} />
          {isFavorite ? "В избранном" : "В избранное"}
        </button>
      </nav>

      {/* Hero */}
      <div className="relative z-10 flex flex-col gap-6 px-5 pb-8 pt-2 md:flex-row md:items-start md:px-10">
        {/* Poster */}
        <div className="h-52 w-36 shrink-0 overflow-hidden rounded-xl border border-white/10 bg-white/5 shadow-2xl md:h-72 md:w-48">
          {title.poster_url
            ? <img src={title.poster_url} alt={title.title} className="h-full w-full object-cover" />
            : <div className="flex h-full w-full items-center justify-center"><Icon name="Film" size={32} className="text-white/20" /></div>}
        </div>

        {/* Info */}
        <div className="flex-1">
          <div className="mb-1 flex flex-wrap items-center gap-2">
            <span className="rounded-full border border-white/10 bg-white/5 px-3 py-0.5 font-mono text-[10px] text-white/50">
              {title.type === "movie" ? "Фильм" : "Сериал"}
            </span>
            {title.genres?.slice(0, 3).map((g) => (
              <span key={g} className="rounded-full border border-white/10 bg-white/5 px-3 py-0.5 font-mono text-[10px] text-white/40">{g}</span>
            ))}
          </div>

          <h1 className="mb-1 font-sans text-3xl font-light leading-tight tracking-tight text-white md:text-4xl lg:text-5xl">
            {title.title}
          </h1>
          {title.original_title && title.original_title !== title.title && (
            <p className="mb-3 font-mono text-xs text-white/30">{title.original_title}</p>
          )}

          <div className="mb-4 flex flex-wrap items-center gap-4 font-mono text-xs text-white/40">
            {title.year && <span>{title.year}</span>}
            {title.runtime && <span>{title.runtime} мин</span>}
            {title.rating && <span className="text-yellow-400">★ {title.rating.toFixed(1)}</span>}
            {title.seasons_count && <span>{title.seasons_count} сез.</span>}
            {title.episodes_count && <span>{title.episodes_count} эп.</span>}
          </div>

          {/* Status buttons */}
          <div className="flex flex-wrap gap-2">
            {Object.entries(STATUS_LABELS).map(([key, cfg]) => (
              <button
                key={key}
                onClick={() => handleSetStatus(key)}
                className={`flex items-center gap-1.5 rounded-full border px-4 py-1.5 font-mono text-xs transition-all ${
                  userStatus === key ? cfg.color : "border-white/10 bg-white/5 text-white/40 hover:border-white/20 hover:text-white/60"
                }`}
              >
                <Icon name={cfg.icon} size={12} />
                {cfg.label}
              </button>
            ))}
          </div>

          {/* Progress bar for series */}
          {title.type === "series" && totalEpisodes > 0 && (
            <div className="mt-4">
              <div className="mb-1.5 flex items-center justify-between font-mono text-[10px] text-white/40">
                <span>Просмотрено серий</span>
                <span>{watchedCount} / {totalEpisodes}</span>
              </div>
              <div className="h-1 w-full overflow-hidden rounded-full bg-white/10">
                <div
                  className="h-full rounded-full bg-green-400 transition-all duration-500"
                  style={{ width: `${totalEpisodes > 0 ? (watchedCount / totalEpisodes) * 100 : 0}%` }}
                />
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Tabs */}
      <div className="relative z-10 border-b border-white/10 px-5 md:px-10">
        <div className="flex gap-6">
          {([
            { key: "overview", label: "Сюжет" },
            ...(title.type === "series" && totalEpisodes > 0 ? [{ key: "episodes", label: `Серии (${totalEpisodes})` }] : []),
            { key: "cast", label: "Актёры" },
          ] as { key: "overview" | "episodes" | "cast"; label: string }[]).map((tab) => (
            <button
              key={tab.key}
              onClick={() => setActiveTab(tab.key)}
              className={`border-b-2 pb-3 pt-1 font-mono text-xs transition-all ${
                activeTab === tab.key
                  ? "border-white text-white"
                  : "border-transparent text-white/40 hover:text-white/60"
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>
      </div>

      {/* Tab Content */}
      <div className="relative z-10 px-5 py-8 md:px-10">
        {activeTab === "overview" && (
          <div className="max-w-2xl space-y-6">
            {title.description ? (
              <p className="leading-relaxed text-white/80">{title.description}</p>
            ) : (
              <p className="text-white/30 italic">Описание отсутствует</p>
            )}
            {title.release_date && (
              <div>
                <p className="mb-1 font-mono text-[10px] uppercase tracking-widest text-white/30">Дата выхода</p>
                <p className="font-sans text-sm text-white/70">{title.release_date}</p>
              </div>
            )}
            {(title.crew || []).length > 0 && (
              <div>
                <p className="mb-3 font-mono text-[10px] uppercase tracking-widest text-white/30">Съёмочная группа</p>
                <div className="space-y-1.5">
                  {title.crew!.slice(0, 6).map((c, i) => (
                    <div key={i} className="flex items-center gap-3">
                      <span className="w-24 font-mono text-[10px] text-white/30">{c.job}</span>
                      <span className="font-sans text-sm text-white/70">{c.name}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}

        {activeTab === "episodes" && title.episodes && title.episodes.length > 0 && (
          <div className="max-w-2xl space-y-2">
            {title.episodes.map((ep, i) => {
              const season = ep.season || 1
              const epNum = ep.episode || i + 1
              const watched = isEpisodeWatched(season, epNum)
              return (
                <div
                  key={i}
                  onClick={() => handleToggleEpisode(season, epNum)}
                  className={`flex cursor-pointer items-start gap-4 rounded-xl border p-4 transition-all ${
                    watched
                      ? "border-green-400/20 bg-green-400/5"
                      : "border-white/5 bg-white/3 hover:border-white/10 hover:bg-white/5"
                  }`}
                >
                  <div className={`flex h-7 w-7 shrink-0 items-center justify-center rounded-full border text-xs transition-all ${
                    watched ? "border-green-400/50 bg-green-400/20 text-green-400" : "border-white/10 text-white/30"
                  }`}>
                    {watched ? <Icon name="Check" size={12} /> : <span className="font-mono text-[10px]">{epNum}</span>}
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="font-sans text-sm text-white/90">{ep.name || `Серия ${epNum}`}</p>
                    {ep.air_date && <p className="mt-0.5 font-mono text-[10px] text-white/30">{ep.air_date}</p>}
                    {ep.overview && <p className="mt-1 line-clamp-2 text-xs text-white/40">{ep.overview}</p>}
                  </div>
                </div>
              )
            })}
          </div>
        )}

        {activeTab === "cast" && (
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 max-w-3xl">
            {(title.cast_members || []).length === 0 && (
              <p className="col-span-full text-white/30 italic">Информация об актёрах отсутствует</p>
            )}
            {(title.cast_members || []).map((c, i) => (
              <div key={i} className="rounded-xl border border-white/5 bg-white/3 p-3 text-center">
                <div className="mx-auto mb-2 h-12 w-12 overflow-hidden rounded-full bg-white/10">
                  {c.profile
                    ? <img src={`https://image.tmdb.org/t/p/w185${c.profile}`} alt={c.name} className="h-full w-full object-cover" />
                    : <div className="flex h-full w-full items-center justify-center"><Icon name="User" size={18} className="text-white/20" /></div>}
                </div>
                <p className="font-sans text-xs font-medium text-white/80 leading-tight">{c.name}</p>
                {c.character && <p className="mt-0.5 font-mono text-[9px] text-white/30 leading-tight">{c.character}</p>}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
