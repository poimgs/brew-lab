import { useEffect, useCallback } from "react"
import { useNavigate } from "react-router-dom"

interface UseKeyboardNavigationOptions {
  prevId: string | null
  nextId: string | null
  enabled?: boolean
}

export function useKeyboardNavigation({
  prevId,
  nextId,
  enabled = true,
}: UseKeyboardNavigationOptions) {
  const navigate = useNavigate()

  const handleKeyDown = useCallback(
    (event: KeyboardEvent) => {
      // Don't handle if user is typing in an input
      const target = event.target as HTMLElement
      if (
        target.tagName === "INPUT" ||
        target.tagName === "TEXTAREA" ||
        target.tagName === "SELECT" ||
        target.isContentEditable
      ) {
        return
      }

      // Don't handle if modifier keys are pressed (except shift)
      if (event.ctrlKey || event.metaKey || event.altKey) {
        return
      }

      if (event.key === "ArrowLeft" && prevId) {
        event.preventDefault()
        navigate(`/experiments/${prevId}`)
      } else if (event.key === "ArrowRight" && nextId) {
        event.preventDefault()
        navigate(`/experiments/${nextId}`)
      }
    },
    [prevId, nextId, navigate]
  )

  useEffect(() => {
    if (!enabled) return

    window.addEventListener("keydown", handleKeyDown)
    return () => window.removeEventListener("keydown", handleKeyDown)
  }, [enabled, handleKeyDown])
}
