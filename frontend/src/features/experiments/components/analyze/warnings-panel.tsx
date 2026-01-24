import { AlertTriangle } from "lucide-react"
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
import type { Warning } from "@/lib/api"

interface WarningsPanelProps {
  warnings: Warning[]
}

export function WarningsPanel({ warnings }: WarningsPanelProps) {
  if (warnings.length === 0) {
    return null
  }

  return (
    <Alert variant="default" className="border-amber-200 bg-amber-50">
      <AlertTriangle className="h-4 w-4 text-amber-600" />
      <AlertTitle className="text-amber-800">Data Quality Notes</AlertTitle>
      <AlertDescription>
        <ul className="mt-2 space-y-1">
          {warnings.map((warning, idx) => (
            <li key={idx} className="text-sm text-amber-700">
              {warning.message}
            </li>
          ))}
        </ul>
      </AlertDescription>
    </Alert>
  )
}
