import { useState } from "react"
import { useNavigate } from "react-router-dom"
import Icon from "@/components/ui/icon"

const SEED_URL = "https://functions.poehali.dev/e131b40e-0fbc-4ca5-9d3f-14be229ab050"

export default function AdminSeed() {
  const navigate = useNavigate()
  const [loading, setLoading] = useState(false)
  const [result, setResult] = useState<{ added: string[]; skipped: string[]; failed: string[] } | null>(null)
  const [error, setError] = useState("")

  const runSeed = async () => {
    setLoading(true)
    setError("")
    setResult(null)
    try {
      const res = await fetch(SEED_URL, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({}),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || "Ошибка")
      setResult(data)
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : "Ошибка")
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-black text-white">
      <nav className="flex items-center justify-between border-b border-white/10 px-6 py-5">
        <button onClick={() => navigate("/")} className="flex items-center gap-2 font-mono text-xs text-white/50 hover:text-white/80 transition-colors">
          <Icon name="ChevronLeft" size={16} /> Главная
        </button>
        <span className="font-sans font-semibold">WatchLog · Наполнение базы</span>
        <div className="w-20" />
      </nav>

      <div className="mx-auto max-w-2xl px-6 py-12">
        <h1 className="mb-2 font-sans text-3xl font-light text-white">Загрузить тайтлы</h1>
        <p className="mb-8 font-mono text-sm text-white/40">
          Импорт фильмов и сериалов через TMDB API. Уже добавленные будут пропущены.
        </p>

        <button
          onClick={runSeed}
          disabled={loading}
          className="mb-8 flex items-center gap-3 rounded-full bg-white/95 px-8 py-3.5 font-sans text-base font-medium text-black transition-all hover:bg-white disabled:opacity-40"
        >
          {loading ? <Icon name="Loader2" size={18} className="animate-spin" /> : <Icon name="Download" size={18} />}
          {loading ? "Загружаем... (займёт ~30 сек)" : "Запустить импорт"}
        </button>

        {error && (
          <div className="mb-6 rounded-xl bg-red-500/10 border border-red-500/20 px-5 py-4">
            <p className="font-mono text-sm text-red-400">{error}</p>
          </div>
        )}

        {result && (
          <div className="space-y-5">
            <div className="rounded-xl border border-green-400/20 bg-green-400/5 p-5">
              <p className="mb-3 font-mono text-xs uppercase tracking-widest text-green-400">
                Добавлено: {result.added.length}
              </p>
              <div className="space-y-1">
                {result.added.map((t, i) => (
                  <p key={i} className="font-sans text-sm text-white/70">✓ {t}</p>
                ))}
                {result.added.length === 0 && <p className="font-mono text-xs text-white/30">Ничего не добавлено</p>}
              </div>
            </div>

            {result.skipped.length > 0 && (
              <div className="rounded-xl border border-white/10 bg-white/3 p-5">
                <p className="mb-3 font-mono text-xs uppercase tracking-widest text-white/40">
                  Пропущено (уже есть): {result.skipped.length}
                </p>
                <div className="space-y-1">
                  {result.skipped.map((t, i) => (
                    <p key={i} className="font-sans text-sm text-white/40">— {t}</p>
                  ))}
                </div>
              </div>
            )}

            {result.failed.length > 0 && (
              <div className="rounded-xl border border-red-400/20 bg-red-400/5 p-5">
                <p className="mb-3 font-mono text-xs uppercase tracking-widest text-red-400">
                  Не найдено: {result.failed.length}
                </p>
                <div className="space-y-1">
                  {result.failed.map((t, i) => (
                    <p key={i} className="font-sans text-sm text-red-400/60">✗ {t}</p>
                  ))}
                </div>
              </div>
            )}

            <button
              onClick={() => navigate("/")}
              className="rounded-full border border-white/10 px-6 py-2.5 font-mono text-xs text-white/60 transition-all hover:bg-white/5"
            >
              Перейти к поиску →
            </button>
          </div>
        )}
      </div>
    </div>
  )
}
