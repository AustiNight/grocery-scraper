import { useState } from "react";
import { Plus, Trash2, Edit2, Save, X } from "lucide-react";
import { Button } from "./ui/button";
import { Input } from "./ui/input";
import { cn } from "../lib/utils";

export const ShoppingListEditor = ({ 
  list, 
  onSave, 
  onCancel,
  isNew = false 
}) => {
  const [name, setName] = useState(list?.name || "");
  const [items, setItems] = useState(list?.items || []);
  const [newItem, setNewItem] = useState("");

  const handleAddItem = () => {
    if (newItem.trim()) {
      setItems([...items, { name: newItem.trim(), quantity: 1 }]);
      setNewItem("");
    }
  };

  const handleRemoveItem = (index) => {
    setItems(items.filter((_, i) => i !== index));
  };

  const handleUpdateQuantity = (index, quantity) => {
    const updated = [...items];
    updated[index].quantity = Math.max(1, parseInt(quantity) || 1);
    setItems(updated);
  };

  const handleSave = () => {
    if (name.trim() && items.length > 0) {
      onSave({ name: name.trim(), items });
    }
  };

  return (
    <div className="bg-white border border-[#EBE9E0] p-6" data-testid="shopping-list-editor">
      {/* List Name */}
      <div className="mb-6">
        <label className="overline block mb-2">List Name</label>
        <Input
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="e.g., Weekly Groceries"
          className="border-[#EBE9E0] focus:ring-[#C8553D]"
          data-testid="list-name-input"
        />
      </div>

      {/* Add Item */}
      <div className="mb-6">
        <label className="overline block mb-2">Add Items</label>
        <div className="flex gap-2">
          <Input
            value={newItem}
            onChange={(e) => setNewItem(e.target.value)}
            onKeyPress={(e) => e.key === "Enter" && handleAddItem()}
            placeholder="e.g., Whole Milk, Organic Eggs..."
            className="border-[#EBE9E0] focus:ring-[#C8553D]"
            data-testid="add-item-input"
          />
          <Button 
            onClick={handleAddItem}
            className="btn-primary px-4"
            data-testid="add-item-btn"
          >
            <Plus className="w-4 h-4" />
          </Button>
        </div>
      </div>

      {/* Items List */}
      <div className="mb-6">
        <label className="overline block mb-2">Shopping Items ({items.length})</label>
        {items.length === 0 ? (
          <p className="text-[#5C605A] text-sm py-4">No items added yet</p>
        ) : (
          <div className="space-y-2">
            {items.map((item, index) => (
              <div 
                key={index}
                className="flex items-center gap-3 p-3 bg-[#FAF8F5] border border-[#EBE9E0]"
                data-testid={`item-${index}`}
              >
                <span className="flex-1 text-[#1C1E1C]">{item.name}</span>
                <div className="flex items-center gap-2">
                  <span className="text-xs text-[#5C605A]">Qty:</span>
                  <Input
                    type="number"
                    value={item.quantity}
                    onChange={(e) => handleUpdateQuantity(index, e.target.value)}
                    className="w-16 h-8 text-center border-[#EBE9E0]"
                    min="1"
                    data-testid={`item-qty-${index}`}
                  />
                </div>
                <button
                  onClick={() => handleRemoveItem(index)}
                  className="text-[#5C605A] hover:text-red-500 transition-colors"
                  data-testid={`remove-item-${index}`}
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Actions */}
      <div className="flex gap-3 pt-4 border-t border-[#EBE9E0]">
        <Button 
          onClick={handleSave}
          disabled={!name.trim() || items.length === 0}
          className="btn-primary flex items-center gap-2"
          data-testid="save-list-btn"
        >
          <Save className="w-4 h-4" />
          {isNew ? "Create List" : "Save Changes"}
        </Button>
        {onCancel && (
          <Button 
            onClick={onCancel}
            variant="outline"
            className="btn-secondary flex items-center gap-2"
            data-testid="cancel-btn"
          >
            <X className="w-4 h-4" />
            Cancel
          </Button>
        )}
      </div>
    </div>
  );
};

export const ShoppingListCard = ({ list, onEdit, onDelete, onSelect, isSelected }) => {
  return (
    <div 
      className={cn(
        "bg-white border p-4 hover-lift cursor-pointer transition-all duration-200",
        isSelected ? "border-[#C8553D] bg-[#C8553D]/5" : "border-[#EBE9E0]"
      )}
      onClick={() => onSelect?.(list)}
      data-testid={`list-card-${list.id}`}
    >
      <div className="flex items-start justify-between mb-3">
        <h3 className="font-serif text-lg text-[#1C1E1C]">{list.name}</h3>
        <div className="flex gap-2">
          <button
            onClick={(e) => { e.stopPropagation(); onEdit?.(list); }}
            className="text-[#5C605A] hover:text-[#C8553D] transition-colors"
            data-testid={`edit-list-${list.id}`}
          >
            <Edit2 className="w-4 h-4" />
          </button>
          <button
            onClick={(e) => { e.stopPropagation(); onDelete?.(list.id); }}
            className="text-[#5C605A] hover:text-red-500 transition-colors"
            data-testid={`delete-list-${list.id}`}
          >
            <Trash2 className="w-4 h-4" />
          </button>
        </div>
      </div>
      <p className="text-sm text-[#5C605A] mb-2">
        {list.items?.length || 0} items
      </p>
      <div className="flex flex-wrap gap-1">
        {list.items?.slice(0, 5).map((item, idx) => (
          <span 
            key={idx}
            className="text-xs bg-[#FAF8F5] px-2 py-1 text-[#5C605A]"
          >
            {item.name}
          </span>
        ))}
        {(list.items?.length || 0) > 5 && (
          <span className="text-xs bg-[#FAF8F5] px-2 py-1 text-[#5C605A]">
            +{list.items.length - 5} more
          </span>
        )}
      </div>
    </div>
  );
};
