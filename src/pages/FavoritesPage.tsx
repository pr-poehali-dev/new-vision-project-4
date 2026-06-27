import { useEffect, useState } from "react"
import { useNavigate } from "react-router-dom"
import Icon from "@/components/ui/icon"
import { useSession } from "@/hooks/use-session"

const TRACKER_URL = "https://functions.poehali.dev/e5caabea-3efe-4db8-b00b-d8bd37864965"

const STATUS_LABELS: Record<string, { label: string; color: string }> = {
  watching: { label: "Смотрю", color: "text-blue-400 bg-blue-400/10" },
  watched:  { label: "Посмотрел", color: "text-green-400 bg-green-400/10" },
  planned:  { label: "Буду смотреть", color: "text-yellow-400 bg-yellow-400/10" },
  dropped:  { label: "Бросил", color: "text-red-400 bg-red-400/10" },
}

interface TitleCard {
  id: number
  type: "movie" | "series"
  title: string
  poster_url?: string | null
  year?: number | null
  rating?: number | null
  status?: string
  added_at?: string
}

type TabKey = "favorites" | "watching" | "watched" | "planned" | "dropped"

export default function FavoritesPage() {
  const navigate = useNavigate()
  const sessionId = useSession()
  const [favorites, setFavorites] = useState<TitleCard[]>([])
  const [watchlist, setWatchlist] = useState<TitleCard[]>([])
  const [loading, setLoading] = useState(true)
  const [activeTab, setActiveTab] = useState<TabKey>("favorites")

  useEffect(() => {
    const load = async () => {
      setLoading(true)
      try {
        const [favRes, wlRes] = await Promise.all([
          fetch(TRACKER_URL, {
            method: "POST",
            headers: { "Content-Type": "application/json", "X-Session-Id": sessionId },
            body: JSON.stringify({ action: "get_favorites" }),
          }),
          fetch(TRACKER_URL, {
            method: "POST",
            headers: { "Content-Type": "application/json", "X-Session-Id": sessionId },
            body: JSON.stringify({ action: "get_watchlist" }),
          }),
        ])
        const favData = await favRes.json()
        const wlData = await wlRes.json()
        setFavorites(favData.favorites || [])
        setWatchlist(wlData.watchlist || [])
      } catch {
        // ignore
      } finally {
        setLoading(false)
      }
    }
    load()
  }, [sessionId])

  const TABS: { key: TabKey; label: string; icon: string }[] = [
    { key: "favorites", label: "Избранное", icon: "Star" },
    { key: "watching",  label: "Смотрю",    icon: "Play" },
    { key: "watched",   label: "Посмотрел", icon: "CheckCircle" },
    { key: "planned",   label: "Буду",      icon: "Clock" },
    { key: "dropped",   label: "Бросил",    icon: "XCircle" },
  ]

  const getCurrentList = (): TitleCard[] => {
    if (activeTab === "favorites") return favorites
    return watchlist.filter((t) => t.status === activeTab)
  }

  const list = getCurrentList()

  return (
    <div className="min-h-screen bg-black text-white">
      {/* Fixed grain */}
      <div className="pointer-events-none fixed inset-0 z-0 opacity-[0.03]"
        style={{ backgroundImage: "url(\"data:image/svg+xml,%3Csvg viewBox='0 0 200 200' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23n)'/%3E%3C/svg%3E\")", backgroundSize: "200px" }} />

      {/* Nav */}
      <nav className="relative z-10 flex items-center justify-between border-b border-white/10 px-5 py-5 md:px-10">
        <button onClick={() => navigate("/")} className="flex items-center gap-2 font-mono text-xs text-white/50 hover:text-white/80 transition-colors">
          <Icon name="ChevronLeft" size={16} />
          Главная
        </button>
        <span className="font-sans text-lg font-semibold tracking-tight">WatchLog</span>
        <div className="w-20" />
      </nav>

      {/* Header */}
      <div className="relative z-10 px-5 pb-4 pt-8 md:px-10">
        <h1 className="font-sans text-4xl font-light tracking-tight text-white md:text-5xl">Мой список</h1>
        <p className="mt-1 font-mono text-xs text-white/30">/ Фильмы и сериалы</p>
      </div>

      {/* Tabs */}
      <div className="relative z-10 border-b border-white/10 px-5 md:px-10">
        <div className="flex gap-1 overflow-x-auto pb-px" style={{ scrollbarWidth: "none" }}>
          {TABS.map((tab) => {
            const count = tab.key === "favorites" ? favorites.length : watchlist.filter((t) => t.status === tab.key).length
            return (
              <button
                key={tab.key}
                onClick={() => setActiveTab(tab.key)}
                className={`flex shrink-0 items-center gap-1.5 border-b-2 px-4 pb-3 pt-1 font-mono text-xs transition-all ${
                  activeTab === tab.key
                    ? "border-white text-white"
                    : "border-transparent text-white/40 hover:text-white/60"
                }`}
              >
                <Icon name={tab.icon} size={11} />
                {tab.label}
                {count > 0 && (
                  <span className="ml-1 rounded-full bg-white/10 px-1.5 py-0.5 font-mono text-[9px] text-white/40">
                    {count}
                  </span>
                )}
              </button>
            )
          })}
        </div>
      </div>

      {/* Content */}
      <div className="relative z-10 px-5 py-8 md:px-10">
        {loading ? (
          <div className="flex items-center justify-center py-20">
            <Icon name="Loader2" size={28} className="animate-spin text-white/30" />
          </div>
        ) : list.length === 0 ? (
          <div className="flex flex-col items-center justify-center gap-4 py-20">
            <div className="flex h-14 w-14 items-center justify-center rounded-full border border-white/10 bg-white/5">
              <Icon name="Film" size={22} className="text-white/30" />
            </div>
            <p className="font-mono text-sm text-white/30">Здесь пока пусто</p>
            <button
              onClick={() => navigate("/")}
              className="rounded-full border border-white/10 bg-white/5 px-5 py-2 font-mono text-xs text-white/60 transition-all hover:bg-white/10"
            >
              Найти фильм или сериал
            </button>
          </div>
        ) : (
          <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6">
            {list.map((item) => (
              <TitleCard key={item.id} item={item} onClick={() => navigate(`/title/${item.id}`)} />
            ))}
          </div>
        )}
      </div>
    </div>
  )
}

function TitleCard({ item, onClick }: { item: TitleCard; onClick: () => void }) {
  const statusCfg = item.status ? STATUS_LABELS[item.status] : null
  return (
    <div
      onClick={onClick}
      className="group cursor-pointer overflow-hidden rounded-xl border border-white/5 bg-white/3 transition-all hover:border-white/15 hover:bg-white/7"
    >
      <div className="relative aspect-[2/3] overflow-hidden bg-white/5">
        {item.poster_url
          ? <img src={item.poster_url} alt={item.title} className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-105" />
          : <div className="flex h-full w-full items-center justify-center"><Icon name="Film" size={24} className="text-white/15" /></div>}
        {statusCfg && (
          <div className={`absolute right-2 top-2 rounded-full px-2 py-0.5 font-mono text-[9px] backdrop-blur-sm ${statusCfg.color}`}>
            {statusCfg.label}
          </div>
        )}
      </div>
      <div className="p-3">
        <p className="line-clamp-2 font-sans text-xs font-medium text-white/80 leading-tight">{item.title}</p>
        <div className="mt-1 flex items-center gap-2 font-mono text-[9px] text-white/30">
          <span>{item.type === "movie" ? "Фильм" : "Сериал"}</span>
          {item.year && <span>· {item.year}</span>}
          {item.rating && <span>· ★{item.rating.toFixed(1)}</span>}
        </div>
      </div>
    </div>
  )
}
