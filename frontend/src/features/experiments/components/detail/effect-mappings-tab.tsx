import { useState } from "react"
import { Plus, Link as LinkIcon } from "lucide-react"
import { Link } from "react-router-dom"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import {
  EffectMappingList,
  EffectMappingFormModal,
  DeleteConfirmModal,
  useEffectMappings,
  useEffectMappingMutations,
} from "@/features/effect-mappings"
import type { EffectMapping, EffectMappingFormData } from "@/lib/api"

interface EffectMappingsTabProps {
  experimentId: string
}

export function EffectMappingsTab({ experimentId: _experimentId }: EffectMappingsTabProps) {
  // Modal state
  const [isFormModalOpen, setIsFormModalOpen] = useState(false)
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false)
  const [editingMapping, setEditingMapping] = useState<EffectMapping | undefined>(
    undefined
  )
  const [selectedMapping, setSelectedMapping] = useState<EffectMapping | null>(null)

  // Hooks
  const { mappings, isLoading, error, refetch } = useEffectMappings({
    page_size: 100, // Get all mappings for this tab
    active: true, // Only show active mappings
  })

  const {
    createMapping,
    updateMapping,
    deleteMapping,
    toggleMapping,
    isCreating,
    isUpdating,
    isDeleting,
    isToggling,
  } = useEffectMappingMutations()

  // Handlers
  const handleSelectMapping = (mapping: EffectMapping) => {
    setEditingMapping(mapping)
    setIsFormModalOpen(true)
  }

  const handleAddMapping = () => {
    setEditingMapping(undefined)
    setIsFormModalOpen(true)
  }

  const handleToggleMapping = async (mapping: EffectMapping) => {
    try {
      await toggleMapping(mapping.id)
      refetch()
    } catch {
      // Error handled by mutation hook
    }
  }

  const handleFormSubmit = async (data: EffectMappingFormData) => {
    try {
      if (editingMapping) {
        await updateMapping(editingMapping.id, data)
      } else {
        await createMapping(data)
      }
      setIsFormModalOpen(false)
      setEditingMapping(undefined)
      refetch()
    } catch {
      // Error handled by mutation hook
    }
  }

  const handleDeleteClick = () => {
    if (editingMapping) {
      setSelectedMapping(editingMapping)
      setIsFormModalOpen(false)
      setIsDeleteModalOpen(true)
    }
  }

  const handleConfirmDelete = async () => {
    if (!selectedMapping) return

    try {
      await deleteMapping(selectedMapping.id)
      setIsDeleteModalOpen(false)
      setSelectedMapping(null)
      refetch()
    } catch {
      // Error handled by mutation hook
    }
  }

  return (
    <div className="space-y-6">
      {/* Header with actions */}
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-lg font-medium">Effect Mappings</h3>
          <p className="text-sm text-muted-foreground">
            Cause-effect relationships that may apply to this brew
          </p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" asChild>
            <Link to="/effect-mappings">
              <LinkIcon className="mr-2 h-4 w-4" />
              View All
            </Link>
          </Button>
          <Button onClick={handleAddMapping}>
            <Plus className="mr-2 h-4 w-4" />
            Add Mapping
          </Button>
        </div>
      </div>

      {/* Mappings list */}
      {mappings.length > 0 || isLoading ? (
        <EffectMappingList
          mappings={mappings}
          isLoading={isLoading}
          error={error}
          onSelectMapping={handleSelectMapping}
          onToggleMapping={handleToggleMapping}
          isToggling={isToggling}
        />
      ) : (
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">No Effect Mappings Yet</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-muted-foreground mb-4">
              Effect mappings help you understand how changes in your brewing
              variables affect the taste of your coffee. Create mappings to track
              patterns like &quot;increasing grind size reduces bitterness&quot;.
            </p>
            <Button onClick={handleAddMapping}>
              <Plus className="mr-2 h-4 w-4" />
              Create Your First Mapping
            </Button>
          </CardContent>
        </Card>
      )}

      {/* Form modal */}
      <EffectMappingFormModal
        open={isFormModalOpen}
        onOpenChange={(open) => {
          setIsFormModalOpen(open)
          if (!open) {
            setEditingMapping(undefined)
          }
        }}
        mapping={editingMapping}
        onSubmit={handleFormSubmit}
        isSubmitting={isCreating || isUpdating}
        onDelete={editingMapping ? handleDeleteClick : undefined}
      />

      {/* Delete confirmation modal */}
      <DeleteConfirmModal
        open={isDeleteModalOpen}
        onOpenChange={setIsDeleteModalOpen}
        mappingName={selectedMapping?.name ?? ""}
        onConfirm={handleConfirmDelete}
        isDeleting={isDeleting}
      />
    </div>
  )
}
