import { cn, formatCurrency } from "../lib/utils";
import { 
  Table, 
  TableBody, 
  TableCell, 
  TableHead, 
  TableHeader, 
  TableRow 
} from "./ui/table";
import { Badge } from "./ui/badge";
import { ExternalLink, TrendingDown } from "lucide-react";

export const PriceComparisonTable = ({ data }) => {
  if (!data || !data.item_breakdown || data.item_breakdown.length === 0) {
    return (
      <div className="empty-state" data-testid="comparison-empty">
        <p className="text-[#5C605A]">No comparison data available</p>
      </div>
    );
  }

  const { summary, store_comparison, item_breakdown, hybrid_strategy } = data;

  // Get all unique stores
  const stores = store_comparison?.map(s => s.store) || [];

  return (
    <div className="space-y-8" data-testid="price-comparison-table">
      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {/* Cheapest Store */}
        <div className="bg-white border border-[#EBE9E0] p-6" data-testid="cheapest-store-card">
          <p className="overline mb-2">Cheapest Single Store</p>
          <p className="font-serif text-2xl text-[#1C1E1C]">{summary?.cheapest_store || "N/A"}</p>
          <p className="text-3xl font-serif font-semibold text-[#C8553D] mt-2">
            {formatCurrency(summary?.total_cost)}
          </p>
          {summary?.savings_vs_next > 0 && (
            <p className="text-sm text-[#2D4A22] mt-2 flex items-center gap-1">
              <TrendingDown className="w-4 h-4" />
              Save {formatCurrency(summary.savings_vs_next)} vs next
            </p>
          )}
        </div>

        {/* Hybrid Strategy */}
        {hybrid_strategy?.enabled && (
          <div className="bg-[#2D4A22]/5 border border-[#2D4A22]/20 p-6" data-testid="hybrid-strategy-card">
            <p className="overline mb-2 text-[#2D4A22]">Hybrid Strategy</p>
            <p className="font-serif text-2xl text-[#1C1E1C]">Multi-Store</p>
            <p className="text-3xl font-serif font-semibold text-[#2D4A22] mt-2">
              {formatCurrency(hybrid_strategy.total_cost)}
            </p>
            <p className="text-sm text-[#2D4A22] mt-2">
              {hybrid_strategy.note}
            </p>
          </div>
        )}

        {/* Total Items */}
        <div className="bg-white border border-[#EBE9E0] p-6" data-testid="items-summary-card">
          <p className="overline mb-2">Items Analyzed</p>
          <p className="text-3xl font-serif font-semibold text-[#1C1E1C]">
            {item_breakdown.length}
          </p>
          <p className="text-sm text-[#5C605A] mt-2">
            Across {stores.length} stores
          </p>
        </div>
      </div>

      {/* Store Totals */}
      <div className="bg-white border border-[#EBE9E0]">
        <div className="p-4 border-b border-[#EBE9E0]">
          <h3 className="font-serif text-lg">Store Totals</h3>
        </div>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 p-4">
          {store_comparison?.map((store, idx) => (
            <div 
              key={store.store} 
              className={cn(
                "p-4 border",
                idx === 0 ? "border-[#C8553D] bg-[#C8553D]/5" : "border-[#EBE9E0]"
              )}
              data-testid={`store-total-${store.store}`}
            >
              <div className="flex items-start justify-between">
                <p className="font-medium text-[#1C1E1C]">{store.store}</p>
                {idx === 0 && <Badge className="best-deal-badge">Best</Badge>}
              </div>
              <p className={cn(
                "text-2xl font-serif mt-2",
                idx === 0 ? "text-[#C8553D]" : "text-[#1C1E1C]"
              )}>
                {formatCurrency(store.total)}
              </p>
              <p className="text-xs text-[#5C605A] mt-1">
                {store.items_found} found • {store.items_missing} missing
              </p>
            </div>
          ))}
        </div>
      </div>

      {/* Item-by-Item Breakdown */}
      <div className="bg-white border border-[#EBE9E0] overflow-hidden">
        <div className="p-4 border-b border-[#EBE9E0]">
          <h3 className="font-serif text-lg">Item Breakdown</h3>
        </div>
        <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow className="bg-[#FAF8F5]">
                <TableHead className="font-medium text-[#5C605A]">Item</TableHead>
                {stores.map(store => (
                  <TableHead key={store} className="font-medium text-[#5C605A] text-center">
                    {store}
                  </TableHead>
                ))}
                <TableHead className="font-medium text-[#5C605A] text-center">Best</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {item_breakdown.map((item, idx) => {
                const bestPrice = item.best_option?.price;
                
                return (
                  <TableRow key={idx} className="hover:bg-[#FAF8F5]/50">
                    <TableCell className="font-medium" data-testid={`item-row-${idx}`}>
                      {item.item}
                    </TableCell>
                    {stores.map(store => {
                      const match = item.matches?.find(m => m.store === store);
                      const isBest = match?.price === bestPrice && bestPrice !== null;
                      
                      return (
                        <TableCell 
                          key={store} 
                          className={cn(
                            "text-center",
                            isBest ? "price-best" : "price-worst"
                          )}
                        >
                          {match?.price ? (
                            <div>
                              <span>{formatCurrency(match.price)}</span>
                              {match.url && (
                                <a 
                                  href={match.url} 
                                  target="_blank" 
                                  rel="noopener noreferrer"
                                  className="ml-1 inline-block text-[#5C605A] hover:text-[#C8553D]"
                                >
                                  <ExternalLink className="w-3 h-3" />
                                </a>
                              )}
                              {match.size && (
                                <p className="text-xs text-[#5C605A]">{match.size}</p>
                              )}
                            </div>
                          ) : (
                            <span className="text-[#5C605A]/50">—</span>
                          )}
                        </TableCell>
                      );
                    })}
                    <TableCell className="text-center">
                      {item.best_option ? (
                        <div className="flex items-center justify-center gap-2">
                          <Badge className="best-deal-badge">{item.best_option.store}</Badge>
                        </div>
                      ) : (
                        <span className="text-[#5C605A]/50">—</span>
                      )}
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </div>
      </div>

      {/* Hybrid Strategy Details */}
      {hybrid_strategy?.enabled && hybrid_strategy.purchases && (
        <div className="bg-[#2D4A22]/5 border border-[#2D4A22]/20 p-6" data-testid="hybrid-details">
          <h3 className="font-serif text-lg text-[#2D4A22] mb-4">Optimal Shopping Route</h3>
          <div className="space-y-4">
            {hybrid_strategy.purchases.map((purchase, idx) => (
              <div key={idx} className="flex items-start gap-4">
                <div className="w-8 h-8 rounded-full bg-[#2D4A22] text-white flex items-center justify-center text-sm font-medium">
                  {idx + 1}
                </div>
                <div>
                  <p className="font-medium text-[#1C1E1C]">{purchase.store}</p>
                  <p className="text-sm text-[#5C605A]">
                    {purchase.items?.join(", ")}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};
