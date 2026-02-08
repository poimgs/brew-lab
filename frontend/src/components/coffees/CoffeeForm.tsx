import { useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import { z } from "zod"
import { Loader2, X } from "lucide-react"
import { useEffect, useRef, useState, useCallback } from "react"
import type { Coffee } from "@/api/coffees"
import { getSuggestions } from "@/api/coffees"

const coffeeSchema = z.object({
  roaster: z.string().min(1, "Roaster is required").max(255),
  name: z.string().min(1, "Name is required").max(255),
  country: z.string().max(100).optional().or(z.literal("")),
  farm: z.string().max(255).optional().or(z.literal("")),
  process: z.string().max(100).optional().or(z.literal("")),
  roast_level: z.string().optional().or(z.literal("")),
  tasting_notes: z.string().optional().or(z.literal("")),
  roast_date: z.string().optional().or(z.literal("")),
  notes: z.string().optional().or(z.literal("")),
})

type CoffeeFormData = z.infer<typeof coffeeSchema>

interface CoffeeFormProps {
  coffee?: Coffee | null
  isOpen: boolean
  isSubmitting: boolean
  serverError: string | null
  onSubmit: (data: CoffeeFormData) => void
  onClose: () => void
}

export type { CoffeeFormData }

const ROAST_LEVELS = ["Light", "Medium", "Medium-Dark", "Dark"]

function useAutocomplete(field: string) {
  const [suggestions, setSuggestions] = useState<string[]>([])
  const [isOpen, setIsOpen] = useState(false)
  const timeoutRef = useRef<ReturnType<typeof setTimeout>>(undefined)

  const fetchSuggestions = useCallback(
    (query: string) => {
      if (timeoutRef.current) clearTimeout(timeoutRef.current)
      if (query.length < 1) {
        setSuggestions([])
        setIsOpen(false)
        return
      }
      timeoutRef.current = setTimeout(async () => {
        try {
          const items = await getSuggestions(field, query)
          setSuggestions(items)
          setIsOpen(items.length > 0)
        } catch {
          setSuggestions([])
          setIsOpen(false)
        }
      }, 200)
    },
    [field]
  )

  const close = useCallback(() => {
    setIsOpen(false)
  }, [])

  useEffect(() => {
    return () => {
      if (timeoutRef.current) clearTimeout(timeoutRef.current)
    }
  }, [])

  return { suggestions, isOpen, fetchSuggestions, close }
}

function AutocompleteInput({
  id,
  label,
  placeholder,
  field,
  register,
  setValue,
  watch,
  error,
}: {
  id: string
  label: string
  placeholder: string
  field: "roaster" | "country" | "process"
  register: ReturnType<typeof useForm<CoffeeFormData>>["register"]
  setValue: ReturnType<typeof useForm<CoffeeFormData>>["setValue"]
  watch: ReturnType<typeof useForm<CoffeeFormData>>["watch"]
  error?: string
}) {
  const { suggestions, isOpen, fetchSuggestions, close } =
    useAutocomplete(field)
  const value = watch(field) ?? ""
  const containerRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    fetchSuggestions(value)
  }, [value, fetchSuggestions])

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (
        containerRef.current &&
        !containerRef.current.contains(e.target as Node)
      ) {
        close()
      }
    }
    document.addEventListener("mousedown", handleClickOutside)
    return () => document.removeEventListener("mousedown", handleClickOutside)
  }, [close])

  const required = field === "roaster"

  return (
    <div className="space-y-2" ref={containerRef}>
      <label htmlFor={id} className="text-sm font-medium text-foreground">
        {label} {required && <span className="text-error">*</span>}
      </label>
      <div className="relative">
        <input
          id={id}
          type="text"
          autoComplete="off"
          className={`flex h-10 w-full rounded-md border bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring ${
            error ? "border-error" : "border-input"
          }`}
          placeholder={placeholder}
          {...register(field)}
        />
        {isOpen && (
          <ul
            className="absolute z-10 mt-1 max-h-40 w-full overflow-auto rounded-md border border-border bg-card py-1 shadow-lg"
            role="listbox"
          >
            {suggestions.map((item) => (
              <li
                key={item}
                role="option"
                aria-selected={false}
                className="cursor-pointer px-3 py-1.5 text-sm text-card-foreground hover:bg-muted"
                onMouseDown={(e) => {
                  e.preventDefault()
                  setValue(field, item, { shouldValidate: true })
                  close()
                }}
              >
                {item}
              </li>
            ))}
          </ul>
        )}
      </div>
      {error && <p className="text-sm text-error">{error}</p>}
    </div>
  )
}

export function CoffeeForm({
  coffee,
  isOpen,
  isSubmitting,
  serverError,
  onSubmit,
  onClose,
}: CoffeeFormProps) {
  const overlayRef = useRef<HTMLDivElement>(null)

  const {
    register,
    handleSubmit,
    reset,
    watch,
    setValue,
    formState: { errors },
  } = useForm<CoffeeFormData>({
    resolver: zodResolver(coffeeSchema),
  })

  useEffect(() => {
    if (isOpen) {
      reset({
        roaster: coffee?.roaster ?? "",
        name: coffee?.name ?? "",
        country: coffee?.country ?? "",
        farm: coffee?.farm ?? "",
        process: coffee?.process ?? "",
        roast_level: coffee?.roast_level ?? "",
        tasting_notes: coffee?.tasting_notes ?? "",
        roast_date: coffee?.roast_date ?? "",
        notes: coffee?.notes ?? "",
      })
    }
  }, [isOpen, coffee, reset])

  useEffect(() => {
    if (!isOpen) return
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose()
    }
    document.addEventListener("keydown", handleKeyDown)
    return () => document.removeEventListener("keydown", handleKeyDown)
  }, [isOpen, onClose])

  if (!isOpen) return null

  const isEditing = !!coffee

  return (
    <div
      ref={overlayRef}
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 sm:px-4"
      onClick={(e) => {
        if (e.target === overlayRef.current) onClose()
      }}
      role="dialog"
      aria-modal="true"
      aria-label={isEditing ? "Edit Coffee" : "Add Coffee"}
    >
      <div className="flex h-screen w-full flex-col overflow-y-auto bg-card p-6 sm:h-auto sm:max-h-[90vh] sm:max-w-lg sm:rounded-lg sm:shadow-lg">
        <div className="flex items-center justify-between">
          <h2 className="text-xl font-semibold text-card-foreground">
            {isEditing ? "Edit Coffee" : "Add Coffee"}
          </h2>
          <button
            onClick={onClose}
            className="flex h-9 w-9 items-center justify-center rounded-md text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
            aria-label="Close"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        <form onSubmit={handleSubmit(onSubmit)} className="mt-4 space-y-4">
          {serverError && (
            <div className="rounded-md bg-error-muted p-3 text-sm text-error">
              {serverError}
            </div>
          )}

          <AutocompleteInput
            id="coffee-roaster"
            label="Roaster"
            placeholder="e.g., Cata Coffee"
            field="roaster"
            register={register}
            setValue={setValue}
            watch={watch}
            error={errors.roaster?.message}
          />

          <div className="space-y-2">
            <label
              htmlFor="coffee-name"
              className="text-sm font-medium text-foreground"
            >
              Name <span className="text-error">*</span>
            </label>
            <input
              id="coffee-name"
              type="text"
              className={`flex h-10 w-full rounded-md border bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring ${
                errors.name ? "border-error" : "border-input"
              }`}
              placeholder="e.g., Kiamaina"
              {...register("name")}
            />
            {errors.name && (
              <p className="text-sm text-error">{errors.name.message}</p>
            )}
          </div>

          <div className="border-t border-border pt-4">
            <p className="mb-3 text-xs font-medium uppercase tracking-wider text-muted-foreground">
              Origin
            </p>

            <div className="space-y-4">
              <AutocompleteInput
                id="coffee-country"
                label="Country"
                placeholder="e.g., Kenya"
                field="country"
                register={register}
                setValue={setValue}
                watch={watch}
              />

              <div className="space-y-2">
                <label
                  htmlFor="coffee-farm"
                  className="text-sm font-medium text-foreground"
                >
                  Farm
                </label>
                <input
                  id="coffee-farm"
                  type="text"
                  className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                  placeholder="e.g., Kiamaina Estate"
                  {...register("farm")}
                />
              </div>
            </div>
          </div>

          <div className="border-t border-border pt-4">
            <p className="mb-3 text-xs font-medium uppercase tracking-wider text-muted-foreground">
              Details
            </p>

            <div className="space-y-4">
              <AutocompleteInput
                id="coffee-process"
                label="Process"
                placeholder="e.g., Washed"
                field="process"
                register={register}
                setValue={setValue}
                watch={watch}
              />

              <div className="space-y-2">
                <label
                  htmlFor="coffee-roast-level"
                  className="text-sm font-medium text-foreground"
                >
                  Roast Level
                </label>
                <select
                  id="coffee-roast-level"
                  className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                  {...register("roast_level")}
                >
                  <option value="">Select roast level</option>
                  {ROAST_LEVELS.map((level) => (
                    <option key={level} value={level}>
                      {level}
                    </option>
                  ))}
                </select>
              </div>

              <div className="space-y-2">
                <label
                  htmlFor="coffee-tasting-notes"
                  className="text-sm font-medium text-foreground"
                >
                  Tasting Notes
                </label>
                <textarea
                  id="coffee-tasting-notes"
                  rows={2}
                  className="flex w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                  placeholder="Roaster's described flavor notes"
                  {...register("tasting_notes")}
                />
              </div>

              <div className="space-y-2">
                <label
                  htmlFor="coffee-roast-date"
                  className="text-sm font-medium text-foreground"
                >
                  Latest Roast Date
                </label>
                <input
                  id="coffee-roast-date"
                  type="date"
                  max={new Date().toISOString().split("T")[0]}
                  className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                  {...register("roast_date")}
                />
              </div>
            </div>
          </div>

          <div className="border-t border-border pt-4">
            <p className="mb-3 text-xs font-medium uppercase tracking-wider text-muted-foreground">
              Notes
            </p>

            <div className="space-y-2">
              <label
                htmlFor="coffee-notes"
                className="text-sm font-medium text-foreground"
              >
                Personal Notes
              </label>
              <textarea
                id="coffee-notes"
                rows={3}
                className="flex w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                placeholder="Your personal notes about this coffee..."
                {...register("notes")}
              />
            </div>
          </div>

          <div className="flex justify-end gap-3 pt-2">
            <button
              type="button"
              onClick={onClose}
              className="flex h-10 items-center rounded-md border border-border px-4 text-sm font-medium text-foreground transition-colors hover:bg-muted"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isSubmitting}
              className="flex h-10 items-center rounded-md bg-primary px-4 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary-hover disabled:opacity-50"
            >
              {isSubmitting ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Saving...
                </>
              ) : (
                "Save Coffee"
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
