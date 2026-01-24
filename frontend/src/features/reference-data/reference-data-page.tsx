import { useState } from "react";
import { Plus, FileText, Droplets, Loader2 } from "lucide-react";
import type { FilterPaper, FilterPaperFormData, MineralProfile } from "@/lib/api";
import { RootLayout } from "@/components/layout/root-layout";
import { PageHeader } from "@/components/layout/page-header";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { FilterPaperCard } from "./components/filter-paper-card";
import { FilterPaperFormModal } from "./components/filter-paper-form-modal";
import { MineralProfileCard } from "./components/mineral-profile-card";
import { MineralProfileDetailModal } from "./components/mineral-profile-detail-modal";
import { DeleteConfirmModal } from "./components/delete-confirm-modal";
import { useFilterPapers } from "./hooks/use-filter-papers";
import { useFilterPaperMutations } from "./hooks/use-filter-paper-mutations";
import { useMineralProfiles } from "./hooks/use-mineral-profiles";

export function ReferenceDataPage() {
  // Filter paper state
  const [isFormModalOpen, setIsFormModalOpen] = useState(false);
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [editingFilterPaper, setEditingFilterPaper] = useState<
    FilterPaper | undefined
  >();
  const [deletingFilterPaper, setDeletingFilterPaper] = useState<
    FilterPaper | null
  >(null);

  // Mineral profile state
  const [isDetailModalOpen, setIsDetailModalOpen] = useState(false);
  const [selectedMineralProfile, setSelectedMineralProfile] =
    useState<MineralProfile | null>(null);

  // Hooks
  const {
    filterPapers,
    isLoading: isLoadingFilterPapers,
    error: filterPapersError,
    refetch: refetchFilterPapers,
  } = useFilterPapers();

  const {
    mineralProfiles,
    isLoading: isLoadingMineralProfiles,
    error: mineralProfilesError,
  } = useMineralProfiles();

  const {
    createFilterPaper,
    updateFilterPaper,
    deleteFilterPaper,
    isCreating,
    isUpdating,
    isDeleting,
  } = useFilterPaperMutations();

  // Filter paper handlers
  const handleAddFilterPaper = () => {
    setEditingFilterPaper(undefined);
    setIsFormModalOpen(true);
  };

  const handleEditFilterPaper = (filterPaper: FilterPaper) => {
    setEditingFilterPaper(filterPaper);
    setIsFormModalOpen(true);
  };

  const handleDeleteFilterPaper = (filterPaper: FilterPaper) => {
    setDeletingFilterPaper(filterPaper);
    setIsDeleteModalOpen(true);
  };

  const handleFormSubmit = async (data: FilterPaperFormData) => {
    try {
      if (editingFilterPaper) {
        await updateFilterPaper(editingFilterPaper.id, data);
      } else {
        await createFilterPaper(data);
      }
      setIsFormModalOpen(false);
      setEditingFilterPaper(undefined);
      refetchFilterPapers();
    } catch {
      // Error is handled by the mutation hook
    }
  };

  const handleConfirmDelete = async () => {
    if (!deletingFilterPaper) return;

    try {
      await deleteFilterPaper(deletingFilterPaper.id);
      setIsDeleteModalOpen(false);
      setDeletingFilterPaper(null);
      refetchFilterPapers();
    } catch {
      // Error is handled by the mutation hook
    }
  };

  // Mineral profile handlers
  const handleViewMineralProfile = (profile: MineralProfile) => {
    setSelectedMineralProfile(profile);
    setIsDetailModalOpen(true);
  };

  return (
    <RootLayout>
      <PageHeader
        title="Reference Data"
        description="Manage filter papers and view mineral profiles"
      />

      <div className="space-y-8">
        {/* Filter Papers Section */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between">
            <div className="flex items-center gap-2">
              <FileText className="h-5 w-5" />
              <CardTitle>Filter Papers</CardTitle>
            </div>
            <Button size="sm" onClick={handleAddFilterPaper}>
              <Plus className="mr-2 h-4 w-4" />
              Add Filter Paper
            </Button>
          </CardHeader>
          <CardContent>
            {isLoadingFilterPapers ? (
              <div className="flex justify-center py-8">
                <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
              </div>
            ) : filterPapersError ? (
              <div className="text-center py-8 text-destructive">
                {filterPapersError}
              </div>
            ) : filterPapers.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                No filter papers yet. Add your first filter paper to get started.
              </div>
            ) : (
              <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                {filterPapers.map((filterPaper) => (
                  <FilterPaperCard
                    key={filterPaper.id}
                    filterPaper={filterPaper}
                    onEdit={handleEditFilterPaper}
                    onDelete={handleDeleteFilterPaper}
                  />
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Mineral Profiles Section */}
        <Card>
          <CardHeader>
            <div className="flex items-center gap-2">
              <Droplets className="h-5 w-5" />
              <CardTitle>Mineral Profiles</CardTitle>
            </div>
          </CardHeader>
          <CardContent>
            {isLoadingMineralProfiles ? (
              <div className="flex justify-center py-8">
                <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
              </div>
            ) : mineralProfilesError ? (
              <div className="text-center py-8 text-destructive">
                {mineralProfilesError}
              </div>
            ) : mineralProfiles.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                No mineral profiles available.
              </div>
            ) : (
              <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                {mineralProfiles.map((profile) => (
                  <MineralProfileCard
                    key={profile.id}
                    mineralProfile={profile}
                    onViewDetails={handleViewMineralProfile}
                  />
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Modals */}
      <FilterPaperFormModal
        open={isFormModalOpen}
        onOpenChange={setIsFormModalOpen}
        filterPaper={editingFilterPaper}
        onSubmit={handleFormSubmit}
        isSubmitting={isCreating || isUpdating}
      />

      <DeleteConfirmModal
        open={isDeleteModalOpen}
        onOpenChange={setIsDeleteModalOpen}
        itemName={deletingFilterPaper?.name ?? ""}
        onConfirm={handleConfirmDelete}
        isDeleting={isDeleting}
      />

      <MineralProfileDetailModal
        open={isDetailModalOpen}
        onOpenChange={setIsDetailModalOpen}
        mineralProfile={selectedMineralProfile}
      />
    </RootLayout>
  );
}
