import { useEffect, useState } from "react"
import { Copy, Loader2, RefreshCw, Trash2 } from "lucide-react"
import { toast } from "sonner"
import {
  getShareLink,
  createShareLink,
  revokeShareLink,
  type ShareLink,
} from "@/api/shareLink"

export function ShareLinkManager() {
  const [isLoading, setIsLoading] = useState(true)
  const [link, setLink] = useState<ShareLink | null>(null)
  const [isActing, setIsActing] = useState(false)
  const [confirmAction, setConfirmAction] = useState<"regenerate" | "revoke" | null>(null)

  useEffect(() => {
    loadLink()
  }, [])

  async function loadLink() {
    setIsLoading(true)
    try {
      const data = await getShareLink()
      setLink(data)
    } catch {
      toast.error("Failed to load share link")
    } finally {
      setIsLoading(false)
    }
  }

  async function handleCreate() {
    setIsActing(true)
    try {
      const data = await createShareLink()
      setLink(data)
      toast.success("Share link created")
    } catch {
      toast.error("Failed to create share link")
    } finally {
      setIsActing(false)
    }
  }

  async function handleRegenerate() {
    setConfirmAction(null)
    setIsActing(true)
    try {
      const data = await createShareLink()
      setLink(data)
      toast.success("Share link regenerated")
    } catch {
      toast.error("Failed to regenerate share link")
    } finally {
      setIsActing(false)
    }
  }

  async function handleRevoke() {
    setConfirmAction(null)
    setIsActing(true)
    try {
      await revokeShareLink()
      setLink({ token: null, url: null, created_at: null })
      toast.success("Share link revoked")
    } catch {
      toast.error("Failed to revoke share link")
    } finally {
      setIsActing(false)
    }
  }

  async function handleCopy() {
    if (!link?.url) return
    try {
      await navigator.clipboard.writeText(link.url)
      toast.success("Link copied")
    } catch {
      toast.error("Failed to copy link")
    }
  }

  const hasLink = link?.token != null

  const inputClass =
    "flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"

  if (isLoading) {
    return (
      <div data-testid="share-link-loading" className="flex items-center justify-center py-8">
        <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
      </div>
    )
  }

  return (
    <div className="space-y-4">
      <p className="text-sm text-muted-foreground">
        Share your coffee collection with friends. They can browse your active
        coffees and see scores and tasting profiles.
      </p>

      {!hasLink && (
        <button
          onClick={handleCreate}
          disabled={isActing}
          className="flex h-10 items-center justify-center rounded-md bg-primary px-4 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary-hover disabled:opacity-50"
        >
          {isActing ? (
            <>
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              Creating...
            </>
          ) : (
            "Create Share Link"
          )}
        </button>
      )}

      {hasLink && (
        <>
          <div className="flex items-center gap-2">
            <input
              type="text"
              readOnly
              value={link.url ?? ""}
              className={inputClass}
              aria-label="Share link URL"
            />
            <button
              onClick={handleCopy}
              className="flex h-10 w-10 shrink-0 items-center justify-center rounded-md border border-border text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
              aria-label="Copy share link"
            >
              <Copy className="h-4 w-4" />
            </button>
          </div>

          {link.created_at && (
            <p className="text-xs text-muted-foreground">
              Created{" "}
              {new Date(link.created_at).toLocaleDateString(undefined, {
                month: "short",
                day: "numeric",
                year: "numeric",
              })}
            </p>
          )}

          {confirmAction && (
            <div className="rounded-md border border-border bg-muted p-3">
              <p className="text-sm text-foreground">
                {confirmAction === "regenerate"
                  ? "Regenerate share link? The current link will stop working."
                  : "Revoke share link? Anyone with the current link will lose access."}
              </p>
              <div className="mt-2 flex gap-2">
                <button
                  onClick={confirmAction === "regenerate" ? handleRegenerate : handleRevoke}
                  className="flex h-8 items-center rounded-md bg-primary px-3 text-xs font-medium text-primary-foreground hover:bg-primary-hover"
                >
                  Confirm
                </button>
                <button
                  onClick={() => setConfirmAction(null)}
                  className="flex h-8 items-center rounded-md border border-border px-3 text-xs font-medium text-foreground hover:bg-muted"
                >
                  Cancel
                </button>
              </div>
            </div>
          )}

          <div className="flex gap-2">
            <button
              onClick={() => setConfirmAction("regenerate")}
              disabled={isActing || confirmAction !== null}
              className="flex h-9 items-center gap-1.5 rounded-md border border-border px-3 text-sm font-medium text-foreground transition-colors hover:bg-muted disabled:opacity-50"
            >
              {isActing ? (
                <Loader2 className="h-3.5 w-3.5 animate-spin" />
              ) : (
                <RefreshCw className="h-3.5 w-3.5" />
              )}
              Regenerate
            </button>
            <button
              onClick={() => setConfirmAction("revoke")}
              disabled={isActing || confirmAction !== null}
              className="flex h-9 items-center gap-1.5 rounded-md border border-border px-3 text-sm font-medium text-error transition-colors hover:bg-muted disabled:opacity-50"
            >
              <Trash2 className="h-3.5 w-3.5" />
              Revoke
            </button>
          </div>
        </>
      )}
    </div>
  )
}
