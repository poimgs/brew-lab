import * as React from "react"
import { Input } from "@/components/ui/input"
import { cn } from "@/lib/utils"
import { Calculator } from "lucide-react"
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip"

interface NumericInputProps
  extends Omit<React.ComponentProps<"input">, "type" | "onChange"> {
  unit: string
  calculated?: boolean
  calculatedTooltip?: string
  value?: number | string
  onChange?: (value: number | undefined) => void
}

const NumericInput = React.forwardRef<HTMLInputElement, NumericInputProps>(
  (
    {
      className,
      unit,
      calculated,
      calculatedTooltip = "Auto-calculated",
      value,
      onChange,
      ...props
    },
    ref
  ) => {
    const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
      const val = e.target.value
      if (val === "") {
        onChange?.(undefined)
      } else {
        const num = parseFloat(val)
        if (!isNaN(num)) {
          onChange?.(num)
        }
      }
    }

    return (
      <div className="relative">
        <Input
          type="number"
          className={cn("pr-12", calculated && "pr-20", className)}
          value={value ?? ""}
          onChange={handleChange}
          ref={ref}
          {...props}
        />
        <div className="absolute right-3 top-1/2 -translate-y-1/2 flex items-center gap-1.5 pointer-events-none">
          {calculated && (
            <Tooltip>
              <TooltipTrigger asChild>
                <span className="pointer-events-auto">
                  <Calculator className="h-3.5 w-3.5 text-muted-foreground" />
                </span>
              </TooltipTrigger>
              <TooltipContent side="top">
                <p>{calculatedTooltip}</p>
              </TooltipContent>
            </Tooltip>
          )}
          <span className="text-sm text-muted-foreground">{unit}</span>
        </div>
      </div>
    )
  }
)
NumericInput.displayName = "NumericInput"

export { NumericInput }
