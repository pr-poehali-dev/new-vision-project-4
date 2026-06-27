import { useState } from "react"
import Icon from "@/components/ui/icon"

const TITLES_URL = "https://functions.poehali.dev/686bbaf4-e45e-42d0-86e0-945790211257"

interface AddTitleModalProps {
  prefill?: {
    source?: string
    tmdb_id?: number
    type?: "movie" | "series"
    title?: string
    original_title?: string
    year?: string | number
    description?: string
    poster_url?: string | null
  }
  onClose: () => void
  onAdded: () => void
}

export function AddTitleModal({ prefill, onClose, onAdded }: AddTitleModalProps) {
  const canImportFromTmdb = prefill?.source === "tmdb" && prefill?.tmdb_id
  const [step, setStep] = useState<"choose" | "form">(canImportFromTmdb ? "choose" : "form")
  const [loading, setLoading] = useState(false)
  const [success, setSuccess] = useState(false)
  const [error, setError] = useState("")

  const [form, setForm] = useState({
    type: prefill?.type || "movie",
    title: prefill?.title || "",
    original_title: prefill?.original_title || "",
    year: prefill?.year ? String(prefill.year) : "",
    description: prefill?.description || "",
    poster_url: prefill?.poster_url || "",
    genres: "",
    cast_members: "",
  })

  const handleImportTmdb = async () => {
    setLoading(true)
    setError("")
    try {
      const res = await fetch(TITLES_URL, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ mode: "import_tmdb", tmdb_id: prefill?.tmdb_id, type: prefill?.type || "movie" }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || "Ошибка импорта")
      setSuccess(true)
      setTimeout(onAdded, 1200)
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : "Ошибка")
    } finally {
      setLoading(false)
    }
  }

  const handleManualSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError("")
    try {
      const genres = form.genres ? form.genres.split(",").map((g) => g.trim()).filter(Boolean) : []
      const cast_members = form.cast_members
        ? form.cast_members.split(",").map((n) => ({ name: n.trim() })).filter((c) => c.name)
        : []
      const res = await fetch(TITLES_URL, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          mode: "manual",
          type: form.type,
          title: form.title,
          original_title: form.original_title,
          year: form.year ? parseInt(form.year) : undefined,
          description: form.description,
          poster_url: form.poster_url,
          genres,
          cast_members,
        }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || "Ошибка")
      setSuccess(true)
      setTimeout(onAdded, 1200)
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : "Ошибка")
    } finally {
      setLoading(false)
    }
  }

  return (
    <>
      <div className="fixed inset-0 z-[110] bg-black/60 backdrop-blur-sm" onClick={onClose} />
      <div className="fixed inset-x-4 top-[8%] z-[111] mx-auto max-w-lg rounded-2xl border border-white/10 bg-[#0d0d0d] shadow-2xl md:inset-x-auto md:left-1/2 md:-translate-x-1/2 md:w-full">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-white/10 px-6 py-4">
          <h2 className="font-sans text-base font-medium text-white">
            {prefill?.title ? `Добавить «${prefill.title}»` : "Добавить тайтл"}
          </h2>
          <button onClick={onClose} className="text-white/40 hover:text-white/80">
            <Icon name="X" size={18} />
          </button>
        </div>

        <div className="max-h-[75vh] overflow-y-auto p-6">
          {success ? (
            <div className="flex flex-col items-center gap-3 py-8">
              <div className="flex h-12 w-12 items-center justify-center rounded-full bg-green-500/20">
                <Icon name="Check" size={24} className="text-green-400" />
              </div>
              <p className="font-sans text-sm text-white/80">Успешно добавлено!</p>
            </div>
          ) : step === "choose" ? (
            <div className="space-y-3">
              <p className="mb-4 font-mono text-xs text-white/50">Выберите способ добавления</p>

              {/* TMDB import option */}
              <button
                onClick={handleImportTmdb}
                disabled={loading}
                className="w-full rounded-xl border border-white/10 bg-white/5 p-4 text-left transition-all hover:border-white/20 hover:bg-white/10 disabled:opacity-50"
              >
                <div className="mb-1 flex items-center gap-2">
                  <Icon name="Zap" size={16} className="text-yellow-400" />
                  <span className="font-sans text-sm font-medium text-white">
                    {loading ? "Импортируем..." : "Импортировать из TMDB"}
                  </span>
                </div>
                <p className="font-mono text-xs text-white/40">
                  Автоматически: актёры, сюжет, серии, постер — всё сразу
                </p>
              </button>

              <button
                onClick={() => setStep("form")}
                className="w-full rounded-xl border border-white/10 bg-white/5 p-4 text-left transition-all hover:border-white/20 hover:bg-white/10"
              >
                <div className="mb-1 flex items-center gap-2">
                  <Icon name="PenLine" size={16} className="text-white/60" />
                  <span className="font-sans text-sm font-medium text-white">Заполнить вручную</span>
                </div>
                <p className="font-mono text-xs text-white/40">Укажите данные самостоятельно</p>
              </button>

              {error && <p className="rounded-lg bg-red-500/10 px-4 py-2 font-mono text-xs text-red-400">{error}</p>}
            </div>
          ) : (
            <form onSubmit={handleManualSubmit} className="space-y-4">
              {/* Type */}
              <div>
                <label className="mb-1.5 block font-mono text-xs text-white/50">Тип *</label>
                <div className="flex gap-2">
                  {(["movie", "series"] as const).map((t) => (
                    <button
                      key={t}
                      type="button"
                      onClick={() => setForm({ ...form, type: t })}
                      className={`rounded-full border px-4 py-1.5 font-mono text-xs transition-all ${
                        form.type === t
                          ? "border-white/40 bg-white/15 text-white"
                          : "border-white/10 bg-transparent text-white/40 hover:border-white/20 hover:text-white/60"
                      }`}
                    >
                      {t === "movie" ? "Фильм" : "Сериал"}
                    </button>
                  ))}
                </div>
              </div>

              {/* Title */}
              <FormField
                label="Название *"
                value={form.title}
                onChange={(v) => setForm({ ...form, title: v })}
                placeholder="Название на русском"
                required
              />
              <FormField
                label="Оригинальное название"
                value={form.original_title}
                onChange={(v) => setForm({ ...form, original_title: v })}
                placeholder="Original title"
              />
              <FormField
                label="Год выхода"
                value={form.year}
                onChange={(v) => setForm({ ...form, year: v })}
                placeholder="2024"
                type="number"
              />
              <FormField
                label="Ссылка на постер"
                value={form.poster_url}
                onChange={(v) => setForm({ ...form, poster_url: v })}
                placeholder="https://..."
              />
              <div>
                <label className="mb-1.5 block font-mono text-xs text-white/50">Сюжет</label>
                <textarea
                  value={form.description}
                  onChange={(e) => setForm({ ...form, description: e.target.value })}
                  rows={3}
                  placeholder="Краткое описание..."
                  className="w-full rounded-lg border border-white/10 bg-white/5 px-3 py-2 font-sans text-sm text-white placeholder:text-white/30 focus:border-white/25 focus:outline-none"
                />
              </div>
              <FormField
                label="Жанры (через запятую)"
                value={form.genres}
                onChange={(v) => setForm({ ...form, genres: v })}
                placeholder="Драма, Триллер, Фантастика"
              />
              <FormField
                label="Актёры (через запятую)"
                value={form.cast_members}
                onChange={(v) => setForm({ ...form, cast_members: v })}
                placeholder="Тимоти Шаламе, Зендея"
              />

              {error && <p className="rounded-lg bg-red-500/10 px-4 py-2 font-mono text-xs text-red-400">{error}</p>}

              <div className="flex gap-3 pt-2">
                {canImportFromTmdb && (
                  <button
                    type="button"
                    onClick={() => setStep("choose")}
                    className="rounded-full border border-white/10 px-5 py-2.5 font-mono text-xs text-white/60 transition-all hover:bg-white/5"
                  >
                    Назад
                  </button>
                )}
                <button
                  type="submit"
                  disabled={loading || !form.title}
                  className="flex-1 rounded-full bg-white/95 py-2.5 font-sans text-sm font-medium text-black transition-all hover:bg-white disabled:opacity-40"
                >
                  {loading ? "Добавляем..." : "Добавить"}
                </button>
              </div>
            </form>
          )}
        </div>
      </div>
    </>
  )
}

function FormField({
  label, value, onChange, placeholder, required, type = "text",
}: {
  label: string; value: string; onChange: (v: string) => void; placeholder?: string; required?: boolean; type?: string
}) {
  return (
    <div>
      <label className="mb-1.5 block font-mono text-xs text-white/50">{label}</label>
      <input
        type={type}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        required={required}
        className="w-full rounded-lg border border-white/10 bg-white/5 px-3 py-2 font-sans text-sm text-white placeholder:text-white/30 focus:border-white/25 focus:outline-none"
      />
    </div>
  )
}
