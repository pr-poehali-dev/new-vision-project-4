import { useMemo } from "react"

const SESSION_KEY = "watchlog_session_id"

function generateId(): string {
  return Math.random().toString(36).slice(2) + Date.now().toString(36)
}

export function useSession(): string {
  return useMemo(() => {
    let id = localStorage.getItem(SESSION_KEY)
    if (!id) {
      id = generateId()
      localStorage.setItem(SESSION_KEY, id)
    }
    return id
  }, [])
}
