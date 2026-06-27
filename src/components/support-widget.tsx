import { useState } from "react"
import Icon from "@/components/ui/icon"

const SUPPORT_URL = "https://functions.poehali.dev/356a5984-87c3-4f7d-b01e-725c03a18169"

const SUBJECTS = [
  "Не работает поиск",
  "Ошибка при добавлении",
  "Предложение по улучшению",
  "Другое",
]

export function SupportWidget() {
  const [open, setOpen] = useState(false)
  const [form, setForm] = useState({ name: "", email: "", subject: SUBJECTS[0], message: "" })
  const [loading, setLoading] = useState(false)
  const [success, setSuccess] = useState(false)
  const [error, setError] = useState("")

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError("")
    try {
      const res = await fetch(SUPPORT_URL, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || "Ошибка")
      setSuccess(true)
      setForm({ name: "", email: "", subject: SUBJECTS[0], message: "" })
      setTimeout(() => { setSuccess(false); setOpen(false) }, 3000)
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : "Ошибка отправки")
    } finally {
      setLoading(false)
    }
  }

  return (
    <>
      {/* Floating button */}
      <button
        onClick={() => setOpen((v) => !v)}
        aria-label="Служба поддержки"
        className="fixed bottom-6 right-6 z-50 flex h-13 w-13 items-center justify-center rounded-full bg-white/95 shadow-lg shadow-black/40 transition-all duration-300 hover:scale-110 hover:bg-white active:scale-95"
        style={{ width: 52, height: 52 }}
      >
        <Icon name={open ? "X" : "MessageCircle"} size={22} className="text-black" />
      </button>

      {/* Panel */}
      {open && (
        <>
          <div
            className="fixed inset-0 z-40 md:hidden"
            onClick={() => setOpen(false)}
          />
          <div className="fixed bottom-[72px] right-4 z-50 w-[calc(100vw-2rem)] max-w-sm rounded-2xl border border-white/10 bg-black/90 shadow-2xl backdrop-blur-xl md:right-6 md:w-80">
            {/* Header */}
            <div className="flex items-center gap-3 border-b border-white/10 px-5 py-4">
              <div className="flex h-8 w-8 items-center justify-center rounded-full bg-white/10">
                <Icon name="Headphones" size={16} className="text-white" />
              </div>
              <div>
                <p className="font-sans text-sm font-medium text-white">Служба поддержки</p>
                <p className="font-mono text-[10px] text-white/40">Ответим в течение 24 часов</p>
              </div>
            </div>

            <div className="p-5">
              {success ? (
                <div className="flex flex-col items-center gap-3 py-6">
                  <div className="flex h-12 w-12 items-center justify-center rounded-full bg-green-500/20">
                    <Icon name="Check" size={24} className="text-green-400" />
                  </div>
                  <p className="text-center font-sans text-sm text-white/80">
                    Обращение отправлено! Скоро ответим.
                  </p>
                </div>
              ) : (
                <form onSubmit={handleSubmit} className="space-y-3">
                  <SupportInput
                    label="Имя"
                    value={form.name}
                    onChange={(v) => setForm({ ...form, name: v })}
                    placeholder="Ваше имя"
                    required
                  />
                  <SupportInput
                    label="Email"
                    type="email"
                    value={form.email}
                    onChange={(v) => setForm({ ...form, email: v })}
                    placeholder="your@email.com"
                    required
                  />

                  {/* Subject select */}
                  <div>
                    <label className="mb-1 block font-mono text-[10px] text-white/40">Тема</label>
                    <select
                      value={form.subject}
                      onChange={(e) => setForm({ ...form, subject: e.target.value })}
                      className="w-full rounded-lg border border-white/10 bg-white/5 px-3 py-2 font-sans text-sm text-white focus:border-white/25 focus:outline-none"
                    >
                      {SUBJECTS.map((s) => (
                        <option key={s} value={s} className="bg-black">{s}</option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="mb-1 block font-mono text-[10px] text-white/40">Сообщение</label>
                    <textarea
                      value={form.message}
                      onChange={(e) => setForm({ ...form, message: e.target.value })}
                      rows={3}
                      required
                      placeholder="Опишите проблему..."
                      className="w-full rounded-lg border border-white/10 bg-white/5 px-3 py-2 font-sans text-sm text-white placeholder:text-white/30 focus:border-white/25 focus:outline-none resize-none"
                    />
                  </div>

                  {error && (
                    <p className="rounded-lg bg-red-500/10 px-3 py-2 font-mono text-xs text-red-400">{error}</p>
                  )}

                  <button
                    type="submit"
                    disabled={loading}
                    className="w-full rounded-full bg-white/95 py-2.5 font-sans text-sm font-medium text-black transition-all hover:bg-white disabled:opacity-40"
                  >
                    {loading ? "Отправляем..." : "Отправить"}
                  </button>
                </form>
              )}
            </div>
          </div>
        </>
      )}
    </>
  )
}

function SupportInput({
  label, value, onChange, placeholder, required, type = "text",
}: {
  label: string; value: string; onChange: (v: string) => void; placeholder?: string; required?: boolean; type?: string
}) {
  return (
    <div>
      <label className="mb-1 block font-mono text-[10px] text-white/40">{label}</label>
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
