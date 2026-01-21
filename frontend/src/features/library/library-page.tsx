import { useState, useCallback } from "react";
import { useSearchParams } from "react-router-dom";
import { Plus } from "lucide-react";
import type { Coffee, CoffeeFormData } from "@/lib/api";
import { RootLayout } from "@/components/layout/root-layout";
import { PageHeader } from "@/components/layout/page-header";
import { Button } from "@/components/ui/button";
import { CoffeeGrid } from "./components/coffee-grid";
import { CoffeeFilters } from "./components/coffee-filters";
import { CoffeeFormModal } from "./components/coffee-form-modal";
import { CoffeeDetailModal } from "./components/coffee-detail-modal";
import { DeleteConfirmModal } from "./components/delete-confirm-modal";
import { Pagination } from "./components/pagination";
import { useCoffees } from "./hooks/use-coffees";
import { useCoffeeMutations } from "./hooks/use-coffee-mutations";

export function LibraryPage() {
  const [searchParams, setSearchParams] = useSearchParams();

  // URL params state
  const search = searchParams.get("search") ?? "";
  const sortBy = searchParams.get("sort_by") ?? "created_at";
  const sortDir = searchParams.get("sort_dir") ?? "desc";
  const page = parseInt(searchParams.get("page") ?? "1", 10);

  // Modal state
  const [isFormModalOpen, setIsFormModalOpen] = useState(false);
  const [isDetailModalOpen, setIsDetailModalOpen] = useState(false);
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [selectedCoffee, setSelectedCoffee] = useState<Coffee | null>(null);
  const [editingCoffee, setEditingCoffee] = useState<Coffee | undefined>(
    undefined
  );

  // Hooks
  const { coffees, isLoading, error, pagination, refetch } = useCoffees({
    page,
    page_size: 12,
    search: search || undefined,
    sort_by: sortBy as "created_at" | "roast_date" | "roaster" | "name",
    sort_dir: sortDir as "asc" | "desc",
  });

  const {
    createCoffee,
    updateCoffee,
    deleteCoffee,
    isCreating,
    isUpdating,
    isDeleting,
  } = useCoffeeMutations();

  // URL param handlers
  const updateSearchParams = useCallback(
    (updates: Record<string, string | null>) => {
      const newParams = new URLSearchParams(searchParams);
      Object.entries(updates).forEach(([key, value]) => {
        if (value === null || value === "") {
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

  // Coffee handlers
  const handleSelectCoffee = (coffee: Coffee) => {
    setSelectedCoffee(coffee);
    setIsDetailModalOpen(true);
  };

  const handleAddCoffee = () => {
    setEditingCoffee(undefined);
    setIsFormModalOpen(true);
  };

  const handleEditCoffee = () => {
    setEditingCoffee(selectedCoffee ?? undefined);
    setIsDetailModalOpen(false);
    setIsFormModalOpen(true);
  };

  const handleDeleteCoffee = () => {
    setIsDetailModalOpen(false);
    setIsDeleteModalOpen(true);
  };

  const handleFormSubmit = async (data: CoffeeFormData) => {
    try {
      if (editingCoffee) {
        await updateCoffee(editingCoffee.id, data);
      } else {
        await createCoffee(data);
      }
      setIsFormModalOpen(false);
      setEditingCoffee(undefined);
      refetch();
    } catch {
      // Error is handled by the mutation hook
    }
  };

  const handleConfirmDelete = async () => {
    if (!selectedCoffee) return;

    try {
      await deleteCoffee(selectedCoffee.id);
      setIsDeleteModalOpen(false);
      setSelectedCoffee(null);
      refetch();
    } catch {
      // Error is handled by the mutation hook
    }
  };

  return (
    <RootLayout>
      <PageHeader
        title="Coffee Library"
        description="Manage your coffee collection"
        actions={
          <Button onClick={handleAddCoffee}>
            <Plus className="mr-2 h-4 w-4" />
            Add Coffee
          </Button>
        }
      />

      <div className="space-y-6">
        <CoffeeFilters
          search={search}
          sortBy={sortBy}
          sortDir={sortDir}
          onSearchChange={handleSearchChange}
          onSortByChange={handleSortByChange}
          onSortDirChange={handleSortDirChange}
          onClearFilters={handleClearFilters}
        />

        <CoffeeGrid
          coffees={coffees}
          isLoading={isLoading}
          error={error}
          onSelectCoffee={handleSelectCoffee}
        />

        <Pagination
          page={pagination.page}
          totalPages={pagination.totalPages}
          onPageChange={handlePageChange}
        />
      </div>

      <CoffeeFormModal
        open={isFormModalOpen}
        onOpenChange={setIsFormModalOpen}
        coffee={editingCoffee}
        onSubmit={handleFormSubmit}
        isSubmitting={isCreating || isUpdating}
      />

      <CoffeeDetailModal
        open={isDetailModalOpen}
        onOpenChange={setIsDetailModalOpen}
        coffee={selectedCoffee}
        onEdit={handleEditCoffee}
        onDelete={handleDeleteCoffee}
      />

      <DeleteConfirmModal
        open={isDeleteModalOpen}
        onOpenChange={setIsDeleteModalOpen}
        coffeeName={selectedCoffee?.name ?? ""}
        onConfirm={handleConfirmDelete}
        isDeleting={isDeleting}
      />
    </RootLayout>
  );
}
