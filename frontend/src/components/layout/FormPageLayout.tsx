import type { ReactNode } from "react"
import { ArrowLeft } from "lucide-react"

interface FormPageLayoutProps {
  title: string
  description?: string
  onBack: () => void
  actions: () => ReactNode
  children: ReactNode
  testId?: string
}

export function FormPageLayout({
  title,
  description,
  onBack,
  actions,
  children,
  testId,
}: FormPageLayoutProps) {
  return (
    <div className="flex h-full flex-col" data-testid={testId}>
      <div className="flex-1 overflow-y-auto p-8">
        <div className="mx-auto max-w-2xl">
          <button
            type="button"
            onClick={onBack}
            className="inline-flex items-center gap-1 text-sm text-muted-foreground transition-colors hover:text-foreground"
          >
            <ArrowLeft className="h-4 w-4" />
            Back
          </button>

          <div className="mt-4 flex flex-wrap items-center justify-between gap-3">
            <h1 className="text-2xl font-semibold">{title}</h1>
            <div className="hidden items-center gap-3 lg:flex">
              {actions()}
            </div>
          </div>

          {description && (
            <p className="mt-1 text-sm text-muted-foreground">{description}</p>
          )}

          <div className="mt-6">{children}</div>
        </div>
      </div>

      <div className="border-t border-border px-8 py-3 lg:hidden">
        <div className="mx-auto flex max-w-2xl items-center justify-end gap-3">
          {actions()}
        </div>
      </div>
    </div>
  )
}
