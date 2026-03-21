import { useState } from "react";
import { Plus, Link2, Trash2 } from "lucide-react";
import { Button } from "./ui/button";
import { Input } from "./ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "./ui/select";

const PRESET_STORES = [
  { name: "Walmart", url: "https://www.walmart.com", search_path: "/search?q={query}" },
  { name: "Target", url: "https://www.target.com", search_path: "/s?searchTerm={query}" },
  { name: "Kroger", url: "https://www.kroger.com", search_path: "/search?query={query}" },
  { name: "Safeway", url: "https://www.safeway.com", search_path: "/shop/search-results.html?q={query}" },
  { name: "Whole Foods", url: "https://www.wholefoodsmarket.com", search_path: "/search?text={query}" },
  { name: "Costco", url: "https://www.costco.com", search_path: "/s?keyword={query}" },
  { name: "Custom", url: "", search_path: "/search?q={query}" },
];

export const URLInputForm = ({ stores, onStoresChange }) => {
  const [selectedPreset, setSelectedPreset] = useState("");

  const handleAddPreset = (presetName) => {
    const preset = PRESET_STORES.find(p => p.name === presetName);
    if (preset && preset.name !== "Custom") {
      // Check if store already added
      if (!stores.find(s => s.name === preset.name)) {
        onStoresChange([...stores, { ...preset }]);
      }
    }
    setSelectedPreset("");
  };

  const handleAddCustom = () => {
    onStoresChange([
      ...stores, 
      { name: `Store ${stores.length + 1}`, url: "", search_path: "/search?q={query}" }
    ]);
  };

  const handleUpdateStore = (index, field, value) => {
    const updated = [...stores];
    updated[index][field] = value;
    onStoresChange(updated);
  };

  const handleRemoveStore = (index) => {
    onStoresChange(stores.filter((_, i) => i !== index));
  };

  return (
    <div className="space-y-4" data-testid="url-input-form">
      {/* Add Store */}
      <div className="flex gap-3">
        <Select value={selectedPreset} onValueChange={handleAddPreset}>
          <SelectTrigger className="w-48 border-[#EBE9E0]" data-testid="store-preset-select">
            <SelectValue placeholder="Add store..." />
          </SelectTrigger>
          <SelectContent>
            {PRESET_STORES.filter(p => p.name !== "Custom" && !stores.find(s => s.name === p.name)).map(preset => (
              <SelectItem key={preset.name} value={preset.name}>
                {preset.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Button 
          onClick={handleAddCustom}
          variant="outline"
          className="btn-secondary flex items-center gap-2"
          data-testid="add-custom-store-btn"
        >
          <Plus className="w-4 h-4" />
          Custom URL
        </Button>
      </div>

      {/* Store List */}
      {stores.length === 0 ? (
        <div className="text-center py-8 text-[#5C605A]">
          <Link2 className="w-8 h-8 mx-auto mb-2 opacity-50" />
          <p>Add stores to compare prices</p>
        </div>
      ) : (
        <div className="space-y-3">
          {stores.map((store, index) => (
            <div 
              key={index}
              className="bg-white border border-[#EBE9E0] p-4"
              data-testid={`store-entry-${index}`}
            >
              <div className="flex items-start gap-3">
                <div className="flex-1 grid grid-cols-1 md:grid-cols-3 gap-3">
                  <Input
                    value={store.name}
                    onChange={(e) => handleUpdateStore(index, "name", e.target.value)}
                    placeholder="Store name"
                    className="border-[#EBE9E0]"
                    data-testid={`store-name-${index}`}
                  />
                  <Input
                    value={store.url}
                    onChange={(e) => handleUpdateStore(index, "url", e.target.value)}
                    placeholder="https://store.com"
                    className="border-[#EBE9E0]"
                    data-testid={`store-url-${index}`}
                  />
                  <Input
                    value={store.search_path}
                    onChange={(e) => handleUpdateStore(index, "search_path", e.target.value)}
                    placeholder="/search?q={query}"
                    className="border-[#EBE9E0] font-mono text-sm"
                    data-testid={`store-search-path-${index}`}
                  />
                </div>
                <button
                  onClick={() => handleRemoveStore(index)}
                  className="text-[#5C605A] hover:text-red-500 transition-colors p-2"
                  data-testid={`remove-store-${index}`}
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
              <p className="text-xs text-[#5C605A] mt-2 font-mono">
                Preview: {store.url}{store.search_path?.replace("{query}", "milk")}
              </p>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};
