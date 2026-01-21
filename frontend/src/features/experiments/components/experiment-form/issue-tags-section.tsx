import { useState, useEffect } from "react"
import { X, Plus } from "lucide-react"
import { FormSection } from "@/components/ui/form-section"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import {
  Command,
  CommandInput,
  CommandList,
  CommandEmpty,
  CommandGroup,
  CommandItem,
  Popover,
  PopoverTrigger,
  PopoverContent,
} from "@/components/ui/combobox"
import { api, type IssueTag } from "@/lib/api"
import { cn } from "@/lib/utils"

interface IssueTagsSectionProps {
  selectedTagIds: string[]
  onChange: (tagIds: string[]) => void
}

export function IssueTagsSection({
  selectedTagIds,
  onChange,
}: IssueTagsSectionProps) {
  const [tags, setTags] = useState<IssueTag[]>([])
  const [loading, setLoading] = useState(true)
  const [open, setOpen] = useState(false)
  const [search, setSearch] = useState("")
  const [creating, setCreating] = useState(false)

  useEffect(() => {
    fetchTags()
  }, [])

  async function fetchTags() {
    try {
      const response = await api.listTags()
      setTags(response.data)
    } catch (err) {
      console.error("Failed to fetch tags:", err)
    } finally {
      setLoading(false)
    }
  }

  const selectedTags = tags.filter((t) => selectedTagIds.includes(t.id))
  const availableTags = tags.filter((t) => !selectedTagIds.includes(t.id))
  const filteredTags = availableTags.filter((tag) =>
    tag.name.toLowerCase().includes(search.toLowerCase())
  )

  const handleSelect = (tagId: string) => {
    onChange([...selectedTagIds, tagId])
    setSearch("")
  }

  const handleRemove = (tagId: string) => {
    onChange(selectedTagIds.filter((id) => id !== tagId))
  }

  const handleCreateTag = async () => {
    if (!search.trim()) return
    setCreating(true)
    try {
      const response = await api.createTag(search.trim())
      setTags([...tags, response.data])
      onChange([...selectedTagIds, response.data.id])
      setSearch("")
      setOpen(false)
    } catch (err) {
      console.error("Failed to create tag:", err)
    } finally {
      setCreating(false)
    }
  }

  const canCreateTag =
    search.trim() &&
    !tags.some((t) => t.name.toLowerCase() === search.trim().toLowerCase())

  return (
    <FormSection
      title="Issue Tags"
      description="Tag any issues or observations about this brew"
    >
      <div className="space-y-4">
        {selectedTags.length > 0 && (
          <div className="flex flex-wrap gap-2">
            {selectedTags.map((tag) => (
              <Badge
                key={tag.id}
                variant={tag.is_system ? "secondary" : "outline"}
                className="gap-1 pr-1"
              >
                {tag.name}
                <button
                  type="button"
                  onClick={() => handleRemove(tag.id)}
                  className="ml-1 rounded-full p-0.5 hover:bg-muted"
                >
                  <X className="h-3 w-3" />
                  <span className="sr-only">Remove {tag.name}</span>
                </button>
              </Badge>
            ))}
          </div>
        )}

        <Popover open={open} onOpenChange={setOpen}>
          <PopoverTrigger asChild>
            <Button variant="outline" size="sm" className="gap-2">
              <Plus className="h-4 w-4" />
              Add Tag
            </Button>
          </PopoverTrigger>
          <PopoverContent className="w-64 p-0" align="start">
            <Command shouldFilter={false}>
              <CommandInput
                placeholder="Search or create tag..."
                value={search}
                onValueChange={setSearch}
              />
              <CommandList>
                {loading ? (
                  <div className="py-6 text-center text-sm text-muted-foreground">
                    Loading tags...
                  </div>
                ) : (
                  <>
                    {filteredTags.length === 0 && !canCreateTag && (
                      <CommandEmpty>No tags found.</CommandEmpty>
                    )}
                    {filteredTags.length > 0 && (
                      <CommandGroup>
                        {filteredTags.map((tag) => (
                          <CommandItem
                            key={tag.id}
                            value={tag.id}
                            onSelect={() => handleSelect(tag.id)}
                          >
                            <span
                              className={cn(
                                tag.is_system && "text-muted-foreground"
                              )}
                            >
                              {tag.name}
                            </span>
                            {tag.is_system && (
                              <span className="ml-2 text-xs text-muted-foreground">
                                (system)
                              </span>
                            )}
                          </CommandItem>
                        ))}
                      </CommandGroup>
                    )}
                    {canCreateTag && (
                      <CommandGroup>
                        <CommandItem
                          onSelect={handleCreateTag}
                          disabled={creating}
                          className="gap-2"
                        >
                          <Plus className="h-4 w-4" />
                          Create "{search.trim()}"
                        </CommandItem>
                      </CommandGroup>
                    )}
                  </>
                )}
              </CommandList>
            </Command>
          </PopoverContent>
        </Popover>

        <p className="text-xs text-muted-foreground">
          Common issues: channeling, astringency, sourness, bitterness, under-extraction, over-extraction
        </p>
      </div>
    </FormSection>
  )
}
