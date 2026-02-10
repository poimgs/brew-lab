import { useState, type ReactNode } from "react"
import { ChevronDown, ChevronRight } from "lucide-react"

export type SectionFill = "empty" | "partial" | "full"

function SectionFillDot({ fill }: { fill: SectionFill }) {
  if (fill === "full")
    return (
      <span className="inline-block h-2.5 w-2.5 rounded-full bg-primary" />
    )
  if (fill === "partial")
    return (
      <span className="relative inline-block h-2.5 w-2.5 rounded-full border border-primary">
        <span className="absolute bottom-0 left-0 h-full w-1/2 rounded-l-full bg-primary" />
      </span>
    )
  return (
    <span className="inline-block h-2.5 w-2.5 rounded-full border border-muted-foreground" />
  )
}

interface CollapsibleSectionProps {
  title: string
  fill: SectionFill
  defaultOpen?: boolean
  open?: boolean
  onToggle?: () => void
  children: ReactNode
}

export function CollapsibleSection({
  title,
  fill,
  defaultOpen,
  open: controlledOpen,
  onToggle,
  children,
}: CollapsibleSectionProps) {
  const [internalOpen, setInternalOpen] = useState(defaultOpen ?? false)

  const isControlled = controlledOpen !== undefined
  const isOpen = isControlled ? controlledOpen : internalOpen

  const handleToggle = () => {
    if (isControlled) {
      onToggle?.()
    } else {
      setInternalOpen((prev) => !prev)
    }
  }

  return (
    <div className="rounded-md border border-border">
      <button
        type="button"
        onClick={handleToggle}
        className="flex w-full items-center justify-between px-4 py-3 text-sm font-medium text-foreground hover:bg-muted/50"
      >
        <div className="flex items-center gap-2">
          {isOpen ? (
            <ChevronDown className="h-4 w-4" />
          ) : (
            <ChevronRight className="h-4 w-4" />
          )}
          {title}
        </div>
        <SectionFillDot fill={fill} />
      </button>
      {isOpen && (
        <div className="space-y-4 border-t border-border px-4 py-4">
          {children}
        </div>
      )}
    </div>
  )
}
