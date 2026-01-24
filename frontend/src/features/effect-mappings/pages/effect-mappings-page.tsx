import { useState, useCallback } from "react";
import { useSearchParams } from "react-router-dom";
import { Plus } from "lucide-react";
import type { EffectMapping, EffectMappingFormData, InputVariable } from "@/lib/api";
import { RootLayout } from "@/components/layout/root-layout";
import { PageHeader } from "@/components/layout/page-header";
import { Button } from "@/components/ui/button";
import { EffectMappingList } from "../components/effect-mapping-list";
import { EffectMappingFilters } from "../components/effect-mapping-filters";
import { EffectMappingFormModal } from "../components/effect-mapping-form-modal";
import { DeleteConfirmModal } from "../components/delete-confirm-modal";
import { Pagination } from "../components/pagination";
import { useEffectMappings } from "../hooks/use-effect-mappings";
import { useEffectMappingMutations } from "../hooks/use-effect-mapping-mutations";

export function EffectMappingsPage() {
  const [searchParams, setSearchParams] = useSearchParams();

  // URL params state
  const search = searchParams.get("search") ?? "";
  const variable = searchParams.get("variable") ?? "";
  const active = searchParams.get("active") ?? "";
  const sortBy = searchParams.get("sort_by") ?? "created_at";
  const sortDir = searchParams.get("sort_dir") ?? "desc";
  const page = parseInt(searchParams.get("page") ?? "1", 10);

  // Modal state
  const [isFormModalOpen, setIsFormModalOpen] = useState(false);
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [selectedMapping, setSelectedMapping] = useState<EffectMapping | null>(
    null
  );
  const [editingMapping, setEditingMapping] = useState<
    EffectMapping | undefined
  >(undefined);

  // Hooks
  const { mappings, isLoading, error, pagination, refetch } = useEffectMappings({
    page,
    page_size: 12,
    search: search || undefined,
    variable: variable && variable !== "all" ? (variable as InputVariable) : undefined,
    active: active === "true" ? true : active === "false" ? false : undefined,
    sort_by: sortBy as "created_at" | "updated_at" | "name" | "variable",
    sort_dir: sortDir as "asc" | "desc",
  });

  const {
    createMapping,
    updateMapping,
    deleteMapping,
    toggleMapping,
    isCreating,
    isUpdating,
    isDeleting,
    isToggling,
  } = useEffectMappingMutations();

  // URL param handlers
  const updateSearchParams = useCallback(
    (updates: Record<string, string | null>) => {
      const newParams = new URLSearchParams(searchParams);
      Object.entries(updates).forEach(([key, value]) => {
        if (value === null || value === "" || value === "all") {
          newParams.delete(key);
        } else {
          newParams.set(key, value);
        }
      });
      setSearchParams(newParams);
    },
    [searchParams, setSearchParams]
  );

  const handleSearchChange = (value: string) => {
    updateSearchParams({ search: value, page: "1" });
  };

  const handleVariableChange = (value: string) => {
    updateSearchParams({ variable: value, page: "1" });
  };

  const handleActiveChange = (value: string) => {
    updateSearchParams({ active: value, page: "1" });
  };

  const handleSortByChange = (value: string) => {
    updateSearchParams({ sort_by: value, page: "1" });
  };

  const handleSortDirChange = (value: string) => {
    updateSearchParams({ sort_dir: value, page: "1" });
  };

  const handleClearFilters = () => {
    setSearchParams({});
  };

  const handlePageChange = (newPage: number) => {
    updateSearchParams({ page: String(newPage) });
  };

  // Mapping handlers
  const handleSelectMapping = (mapping: EffectMapping) => {
    setEditingMapping(mapping);
    setIsFormModalOpen(true);
  };

  const handleAddMapping = () => {
    setEditingMapping(undefined);
    setIsFormModalOpen(true);
  };

  const handleToggleMapping = async (mapping: EffectMapping) => {
    try {
      await toggleMapping(mapping.id);
      refetch();
    } catch {
      // Error is handled by the mutation hook
    }
  };

  const handleFormSubmit = async (data: EffectMappingFormData) => {
    try {
      if (editingMapping) {
        await updateMapping(editingMapping.id, data);
      } else {
        await createMapping(data);
      }
      setIsFormModalOpen(false);
      setEditingMapping(undefined);
      refetch();
    } catch {
      // Error is handled by the mutation hook
    }
  };

  const handleDeleteClick = () => {
    if (editingMapping) {
      setSelectedMapping(editingMapping);
      setIsFormModalOpen(false);
      setIsDeleteModalOpen(true);
    }
  };

  const handleConfirmDelete = async () => {
    if (!selectedMapping) return;

    try {
      await deleteMapping(selectedMapping.id);
      setIsDeleteModalOpen(false);
      setSelectedMapping(null);
      refetch();
    } catch {
      // Error is handled by the mutation hook
    }
  };

  return (
    <RootLayout>
      <PageHeader
        title="Effect Mappings"
        description="Define cause-effect relationships for brewing variables"
        actions={
          <Button onClick={handleAddMapping}>
            <Plus className="mr-2 h-4 w-4" />
            Add Mapping
          </Button>
        }
      />

      <div className="space-y-6">
        <EffectMappingFilters
          search={search}
          variable={variable}
          active={active}
          sortBy={sortBy}
          sortDir={sortDir}
          onSearchChange={handleSearchChange}
          onVariableChange={handleVariableChange}
          onActiveChange={handleActiveChange}
          onSortByChange={handleSortByChange}
          onSortDirChange={handleSortDirChange}
          onClearFilters={handleClearFilters}
        />

        <EffectMappingList
          mappings={mappings}
          isLoading={isLoading}
          error={error}
          onSelectMapping={handleSelectMapping}
          onToggleMapping={handleToggleMapping}
          isToggling={isToggling}
        />

        <Pagination
          page={pagination.page}
          totalPages={pagination.totalPages}
          onPageChange={handlePageChange}
        />
      </div>

      <EffectMappingFormModal
        open={isFormModalOpen}
        onOpenChange={(open) => {
          setIsFormModalOpen(open);
          if (!open) {
            setEditingMapping(undefined);
          }
        }}
        mapping={editingMapping}
        onSubmit={handleFormSubmit}
        isSubmitting={isCreating || isUpdating}
        onDelete={editingMapping ? handleDeleteClick : undefined}
      />

      <DeleteConfirmModal
        open={isDeleteModalOpen}
        onOpenChange={setIsDeleteModalOpen}
        mappingName={selectedMapping?.name ?? ""}
        onConfirm={handleConfirmDelete}
        isDeleting={isDeleting}
      />
    </RootLayout>
  );
}
