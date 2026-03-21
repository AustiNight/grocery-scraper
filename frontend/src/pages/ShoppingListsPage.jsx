import { useState, useEffect } from "react";
import { toast } from "sonner";
import { Plus } from "lucide-react";
import { 
  getShoppingLists, 
  createShoppingList, 
  updateShoppingList, 
  deleteShoppingList 
} from "../lib/api";
import { Button } from "../components/ui/button";
import { ShoppingListEditor, ShoppingListCard } from "../components/ShoppingList";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "../components/ui/alert-dialog";

export const ShoppingListsPage = () => {
  const [lists, setLists] = useState([]);
  const [loading, setLoading] = useState(true);
  const [editingList, setEditingList] = useState(null);
  const [isCreating, setIsCreating] = useState(false);
  const [deleteConfirm, setDeleteConfirm] = useState(null);

  const fetchLists = async () => {
    try {
      const data = await getShoppingLists();
      setLists(data);
    } catch (error) {
      toast.error("Failed to load shopping lists");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchLists();
  }, []);

  const handleCreate = async (data) => {
    try {
      await createShoppingList(data);
      toast.success("Shopping list created");
      setIsCreating(false);
      fetchLists();
    } catch (error) {
      toast.error("Failed to create shopping list");
    }
  };

  const handleUpdate = async (data) => {
    try {
      await updateShoppingList(editingList.id, data);
      toast.success("Shopping list updated");
      setEditingList(null);
      fetchLists();
    } catch (error) {
      toast.error("Failed to update shopping list");
    }
  };

  const handleDelete = async (id) => {
    try {
      await deleteShoppingList(id);
      toast.success("Shopping list deleted");
      setDeleteConfirm(null);
      fetchLists();
    } catch (error) {
      toast.error("Failed to delete shopping list");
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64" data-testid="lists-loading">
        <div className="animate-pulse text-[#5C605A]">Loading...</div>
      </div>
    );
  }

  return (
    <div className="space-y-8" data-testid="shopping-lists-page">
      {/* Page Header */}
      <div className="flex items-start justify-between">
        <div>
          <h1 className="font-serif text-4xl text-[#1C1E1C] tracking-tight">Shopping Lists</h1>
          <p className="text-[#5C605A] mt-2">Manage your grocery lists for price comparison</p>
        </div>
        {!isCreating && !editingList && (
          <Button 
            onClick={() => setIsCreating(true)}
            className="btn-primary flex items-center gap-2"
            data-testid="create-list-btn"
          >
            <Plus className="w-4 h-4" />
            New List
          </Button>
        )}
      </div>

      {/* Create/Edit Form */}
      {(isCreating || editingList) && (
        <ShoppingListEditor
          list={editingList}
          isNew={isCreating}
          onSave={isCreating ? handleCreate : handleUpdate}
          onCancel={() => {
            setIsCreating(false);
            setEditingList(null);
          }}
        />
      )}

      {/* Lists Grid */}
      {!isCreating && !editingList && (
        <>
          {lists.length === 0 ? (
            <div className="empty-state bg-white border border-[#EBE9E0] py-16" data-testid="no-lists">
              <div className="w-16 h-16 bg-[#FAF8F5] rounded-full flex items-center justify-center mx-auto mb-4">
                <Plus className="w-8 h-8 text-[#5C605A]" />
              </div>
              <h3 className="font-serif text-xl text-[#1C1E1C] mb-2">No shopping lists yet</h3>
              <p className="text-[#5C605A] mb-6">Create your first list to start comparing prices</p>
              <Button 
                onClick={() => setIsCreating(true)}
                className="btn-primary"
                data-testid="create-first-list-btn"
              >
                Create Your First List
              </Button>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4" data-testid="lists-grid">
              {lists.map(list => (
                <ShoppingListCard
                  key={list.id}
                  list={list}
                  onEdit={setEditingList}
                  onDelete={(id) => setDeleteConfirm(id)}
                />
              ))}
            </div>
          )}
        </>
      )}

      {/* Delete Confirmation */}
      <AlertDialog open={!!deleteConfirm} onOpenChange={() => setDeleteConfirm(null)}>
        <AlertDialogContent className="border-[#EBE9E0]">
          <AlertDialogHeader>
            <AlertDialogTitle className="font-serif">Delete Shopping List?</AlertDialogTitle>
            <AlertDialogDescription>
              This action cannot be undone. The shopping list will be permanently deleted.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel className="btn-secondary">Cancel</AlertDialogCancel>
            <AlertDialogAction 
              onClick={() => handleDelete(deleteConfirm)}
              className="bg-red-500 text-white hover:bg-red-600"
              data-testid="confirm-delete-btn"
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
};

export default ShoppingListsPage;
