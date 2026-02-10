import { useEffect, useMemo, useRef, useState, useCallback } from "react"
import { useNavigate, useParams } from "react-router-dom"
import { useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import { z } from "zod"
import { Loader2 } from "lucide-react"
import { Skeleton } from "@/components/ui/Skeleton"
import { toast } from "sonner"
import {
  getCoffee,
  createCoffee,
  updateCoffee,
  getSuggestions,
} from "@/api/coffees"
import { FormPageLayout } from "@/components/layout/FormPageLayout"
import { CollapsibleSection, type SectionFill } from "@/components/ui/CollapsibleSection"

// --- Zod schema ---

const coffeeSchema = z.object({
  roaster: z.string().min(1, "Roaster is required").max(255),
  name: z.string().min(1, "Name is required").max(255),
  country: z.string().max(100).optional().or(z.literal("")),
  region: z.string().max(255).optional().or(z.literal("")),
  farm: z.string().max(255).optional().or(z.literal("")),
  varietal: z.string().max(255).optional().or(z.literal("")),
  elevation: z.string().max(100).optional().or(z.literal("")),
  process: z.string().max(100).optional().or(z.literal("")),
  roast_level: z.string().optional().or(z.literal("")),
  tasting_notes: z.string().optional().or(z.literal("")),
  roast_date: z.string().optional().or(z.literal("")),
  notes: z.string().optional().or(z.literal("")),
})

type CoffeeFormData = z.infer<typeof coffeeSchema>

const ROAST_LEVELS = ["Light", "Medium", "Medium-Dark", "Dark"]

// --- Autocomplete ---

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
  field: "roaster" | "country" | "process" | "region" | "farm" | "varietal"
  register: ReturnType<typeof useForm<CoffeeFormData>>["register"]
  setValue: ReturnType<typeof useForm<CoffeeFormData>>["setValue"]
  watch: ReturnType<typeof useForm<CoffeeFormData>>["watch"]
  error?: string
}) {
  const { suggestions, isOpen, fetchSuggestions, close } =
    useAutocomplete(field)
  const value = watch(field) ?? ""
  const containerRef = useRef<HTMLDivElement>(null)
  const hasTyped = useRef(false)

  useEffect(() => {
    if (hasTyped.current) {
      fetchSuggestions(value)
    }
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
          onInput={() => { hasTyped.current = true }}
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

// --- Main Page ---

export function CoffeeFormPage() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const isEditing = !!id

  const [isPageLoading, setIsPageLoading] = useState(!!id)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [serverError, setServerError] = useState<string | null>(null)

  const {
    register,
    handleSubmit,
    reset,
    watch,
    setValue,
    formState: { errors },
  } = useForm<CoffeeFormData>({
    resolver: zodResolver(coffeeSchema),
    defaultValues: {
      roaster: "",
      name: "",
      country: "",
      region: "",
      farm: "",
      varietal: "",
      elevation: "",
      process: "",
      roast_level: "",
      tasting_notes: "",
      roast_date: "",
      notes: "",
    },
  })

  useEffect(() => {
    if (!id) return
    async function load() {
      try {
        const coffee = await getCoffee(id!)
        reset({
          roaster: coffee.roaster ?? "",
          name: coffee.name ?? "",
          country: coffee.country ?? "",
          region: coffee.region ?? "",
          farm: coffee.farm ?? "",
          varietal: coffee.varietal ?? "",
          elevation: coffee.elevation ?? "",
          process: coffee.process ?? "",
          roast_level: coffee.roast_level ?? "",
          tasting_notes: coffee.tasting_notes ?? "",
          roast_date: coffee.roast_date ?? "",
          notes: coffee.notes ?? "",
        })
      } catch {
        setServerError("Failed to load coffee. Please try again.")
      } finally {
        setIsPageLoading(false)
      }
    }
    load()
  }, [id, reset])

  // Section fill indicators
  const watchAll = watch()

  const originFill: SectionFill = useMemo(() => {
    const fields = [
      watchAll.country,
      watchAll.region,
      watchAll.farm,
      watchAll.varietal,
      watchAll.elevation,
    ]
    const filled = fields.filter((v) => v !== "" && v !== undefined).length
    if (filled === 0) return "empty"
    if (filled === fields.length) return "full"
    return "partial"
  }, [watchAll.country, watchAll.region, watchAll.farm, watchAll.varietal, watchAll.elevation])

  const detailsFill: SectionFill = useMemo(() => {
    const fields = [
      watchAll.process,
      watchAll.roast_level,
      watchAll.tasting_notes,
      watchAll.roast_date,
      watchAll.notes,
    ]
    const filled = fields.filter((v) => v !== "" && v !== undefined).length
    if (filled === 0) return "empty"
    if (filled === fields.length) return "full"
    return "partial"
  }, [watchAll.process, watchAll.roast_level, watchAll.tasting_notes, watchAll.roast_date, watchAll.notes])

  const onSubmit = async (data: CoffeeFormData) => {
    setServerError(null)
    setIsSubmitting(true)

    const payload = {
      roaster: data.roaster,
      name: data.name,
      country: data.country || null,
      region: data.region || null,
      farm: data.farm || null,
      varietal: data.varietal || null,
      elevation: data.elevation || null,
      process: data.process || null,
      roast_level: data.roast_level || null,
      tasting_notes: data.tasting_notes || null,
      roast_date: data.roast_date || null,
      notes: data.notes || null,
    }

    try {
      if (isEditing && id) {
        await updateCoffee(id, payload)
        toast.success("Coffee updated")
        navigate(`/coffees/${id}`)
      } else {
        const created = await createCoffee(payload)
        toast.success("Coffee added")
        navigate(`/coffees/${created.id}`)
      }
    } catch {
      setServerError("Something went wrong. Please try again.")
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleCancel = () => {
    navigate(-1)
  }

  const inputClass = (hasError?: boolean) =>
    `flex h-10 w-full rounded-md border bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring ${
      hasError ? "border-error" : "border-input"
    }`

  const actionButtons = () => (
    <>
      <button
        type="button"
        onClick={handleCancel}
        className="flex h-10 items-center rounded-md border border-border px-4 text-sm font-medium text-foreground transition-colors hover:bg-muted"
      >
        Cancel
      </button>
      <button
        type="button"
        onClick={handleSubmit(onSubmit)}
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
    </>
  )

  if (isPageLoading) {
    return (
      <div className="flex h-full flex-col" data-testid="coffee-form-skeleton">
        <div className="flex-1 overflow-y-auto p-8">
          <div className="mx-auto max-w-2xl">
            <Skeleton className="h-5 w-16" />
            <div className="mt-4 flex items-center justify-between">
              <Skeleton className="h-8 w-32" />
              <div className="hidden items-center gap-3 lg:flex">
                <Skeleton className="h-10 w-20" />
                <Skeleton className="h-10 w-28" />
              </div>
            </div>
            <div className="mt-6 space-y-6">
              <div className="space-y-2">
                <Skeleton className="h-4 w-16" />
                <Skeleton className="h-10 w-full" />
              </div>
              <div className="space-y-2">
                <Skeleton className="h-4 w-12" />
                <Skeleton className="h-10 w-full" />
              </div>
              {Array.from({ length: 2 }).map((_, i) => (
                <div key={i} className="rounded-md border border-border">
                  <div className="flex items-center justify-between px-4 py-3">
                    <Skeleton className="h-5 w-20" />
                    <Skeleton className="h-3 w-3 rounded-full" />
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
        <div className="border-t border-border px-8 py-3 lg:hidden">
          <div className="mx-auto flex max-w-2xl justify-end gap-3">
            <Skeleton className="h-10 w-20" />
            <Skeleton className="h-10 w-28" />
          </div>
        </div>
      </div>
    )
  }

  return (
    <FormPageLayout
      title={isEditing ? "Edit Coffee" : "New Coffee"}
      onBack={handleCancel}
      actions={actionButtons}
    >
      <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
        {serverError && (
          <div className="rounded-md bg-error-muted p-3 text-sm text-error">
            {serverError}
          </div>
        )}

        {/* Top-level required fields (always visible) */}
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
            className={inputClass(!!errors.name)}
            placeholder="e.g., Kiamaina"
            {...register("name")}
          />
          {errors.name && (
            <p className="text-sm text-error">{errors.name.message}</p>
          )}
        </div>

        {/* Origin section */}
        <CollapsibleSection title="Origin" fill={originFill}>
          <AutocompleteInput
            id="coffee-country"
            label="Country"
            placeholder="e.g., Kenya"
            field="country"
            register={register}
            setValue={setValue}
            watch={watch}
          />

          <AutocompleteInput
            id="coffee-region"
            label="Region"
            placeholder="e.g., Nyeri"
            field="region"
            register={register}
            setValue={setValue}
            watch={watch}
          />

          <AutocompleteInput
            id="coffee-farm"
            label="Farm"
            placeholder="e.g., Kiamaina Estate"
            field="farm"
            register={register}
            setValue={setValue}
            watch={watch}
          />

          <AutocompleteInput
            id="coffee-varietal"
            label="Varietal"
            placeholder="e.g., SL28, SL34"
            field="varietal"
            register={register}
            setValue={setValue}
            watch={watch}
          />

          <div className="space-y-2">
            <label
              htmlFor="coffee-elevation"
              className="text-sm font-medium text-foreground"
            >
              Elevation
            </label>
            <input
              id="coffee-elevation"
              type="text"
              className={inputClass()}
              placeholder="e.g., 1800 masl"
              {...register("elevation")}
            />
          </div>
        </CollapsibleSection>

        {/* Details section */}
        <CollapsibleSection title="Details" fill={detailsFill}>
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
              className={inputClass()}
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
              className={inputClass()}
              {...register("roast_date")}
            />
          </div>

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
        </CollapsibleSection>
      </form>
    </FormPageLayout>
  )
}
