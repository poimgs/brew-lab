import { Slider } from "@/components/ui/slider"
import { cn } from "@/lib/utils"

interface IntensitySliderProps {
  value?: number
  onChange: (value: number | undefined) => void
  lowLabel?: string
  highLabel?: string
  min?: number
  max?: number
  className?: string
  disabled?: boolean
}

export function IntensitySlider({
  value,
  onChange,
  lowLabel = "Low",
  highLabel = "High",
  min = 1,
  max = 10,
  className,
  disabled,
}: IntensitySliderProps) {
  const handleValueChange = (values: number[]) => {
    onChange(values[0])
  }

  const handleClear = () => {
    onChange(undefined)
  }

  return (
    <div className={cn("space-y-2", className)}>
      <div className="flex items-center gap-4">
        <Slider
          value={value !== undefined ? [value] : [Math.floor((min + max) / 2)]}
          onValueChange={handleValueChange}
          min={min}
          max={max}
          step={1}
          disabled={disabled}
          className={cn("flex-1", value === undefined && "opacity-40")}
        />
        <div className="flex items-center gap-2 min-w-[4rem]">
          <span
            className={cn(
              "font-mono text-lg font-medium w-6 text-center",
              value === undefined && "text-muted-foreground"
            )}
          >
            {value ?? "-"}
          </span>
          {value !== undefined && (
            <button
              type="button"
              onClick={handleClear}
              className="text-xs text-muted-foreground hover:text-foreground"
              disabled={disabled}
            >
              clear
            </button>
          )}
        </div>
      </div>
      <div className="flex justify-between text-xs text-muted-foreground">
        <span>{lowLabel}</span>
        <span>{highLabel}</span>
      </div>
    </div>
  )
}
