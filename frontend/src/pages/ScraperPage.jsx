import { useState, useEffect, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { toast } from "sonner";
import { Play, AlertCircle } from "lucide-react";
import { 
  getShoppingLists, 
  startScrapeJob, 
  getScrapeJob 
} from "../lib/api";
import { Button } from "../components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "../components/ui/select";
import { URLInputForm } from "../components/URLInputForm";
import { ScraperTerminal } from "../components/ScraperTerminal";

export const ScraperPage = () => {
  const navigate = useNavigate();
  const [lists, setLists] = useState([]);
  const [selectedListId, setSelectedListId] = useState("");
  const [stores, setStores] = useState([]);
  const [currentJob, setCurrentJob] = useState(null);
  const [loading, setLoading] = useState(true);

  // Fetch shopping lists
  useEffect(() => {
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
    fetchLists();
  }, []);

  // Poll job status
  const pollJobStatus = useCallback(async (jobId) => {
    try {
      const job = await getScrapeJob(jobId);
      setCurrentJob(job);

      if (job.status === "completed") {
        toast.success("Scraping completed! Redirecting to results...");
        setTimeout(() => navigate(`/results/${jobId}`), 2000);
      } else if (job.status === "failed") {
        toast.error("Scraping failed. Check the logs for details.");
      } else if (job.status === "running" || job.status === "pending") {
        // Continue polling
        setTimeout(() => pollJobStatus(jobId), 2000);
      }
    } catch (error) {
      console.error("Error polling job status:", error);
    }
  }, [navigate]);

  const handleStartScrape = async () => {
    if (!selectedListId) {
      toast.error("Please select a shopping list");
      return;
    }
    if (stores.length === 0) {
      toast.error("Please add at least one store");
      return;
    }
    if (stores.some(s => !s.url)) {
      toast.error("Please fill in all store URLs");
      return;
    }

    try {
      const job = await startScrapeJob({
        list_id: selectedListId,
        stores: stores.map(s => ({
          name: s.name,
          url: s.url,
          search_path: s.search_path || "/search?q={query}"
        }))
      });
      
      setCurrentJob(job);
      toast.success("Scrape job started!");
      pollJobStatus(job.id);
    } catch (error) {
      toast.error("Failed to start scrape job");
      console.error(error);
    }
  };

  const selectedList = lists.find(l => l.id === selectedListId);
  const isJobActive = currentJob && (currentJob.status === "pending" || currentJob.status === "running");

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64" data-testid="scraper-loading">
        <div className="animate-pulse text-[#5C605A]">Loading...</div>
      </div>
    );
  }

  return (
    <div className="space-y-8" data-testid="scraper-page">
      {/* Page Header */}
      <div>
        <h1 className="font-serif text-4xl text-[#1C1E1C] tracking-tight">Price Scraper</h1>
        <p className="text-[#5C605A] mt-2">Compare grocery prices across multiple stores</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* Configuration Panel */}
        <div className="space-y-6">
          {/* Select Shopping List */}
          <div className="bg-white border border-[#EBE9E0] p-6">
            <label className="overline block mb-4">1. Select Shopping List</label>
            {lists.length === 0 ? (
              <div className="p-4 bg-amber-50 border border-amber-200 flex items-start gap-3">
                <AlertCircle className="w-5 h-5 text-amber-600 flex-shrink-0 mt-0.5" />
                <div>
                  <p className="text-amber-800 font-medium">No shopping lists found</p>
                  <p className="text-amber-700 text-sm mt-1">
                    Create a shopping list first to start comparing prices.
                  </p>
                  <Button 
                    onClick={() => navigate("/lists")}
                    className="mt-3 btn-primary"
                    data-testid="go-to-lists-btn"
                  >
                    Create Shopping List
                  </Button>
                </div>
              </div>
            ) : (
              <Select 
                value={selectedListId} 
                onValueChange={setSelectedListId}
                disabled={isJobActive}
              >
                <SelectTrigger className="border-[#EBE9E0]" data-testid="select-list">
                  <SelectValue placeholder="Choose a shopping list..." />
                </SelectTrigger>
                <SelectContent>
                  {lists.map(list => (
                    <SelectItem key={list.id} value={list.id}>
                      {list.name} ({list.items?.length || 0} items)
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            )}

            {selectedList && (
              <div className="mt-4 p-3 bg-[#FAF8F5] border border-[#EBE9E0]">
                <p className="text-sm text-[#5C605A] mb-2">Items to compare:</p>
                <div className="flex flex-wrap gap-1">
                  {selectedList.items?.map((item, idx) => (
                    <span 
                      key={idx}
                      className="text-xs bg-white px-2 py-1 border border-[#EBE9E0]"
                    >
                      {item.name}
                    </span>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* Store URLs */}
          <div className="bg-white border border-[#EBE9E0] p-6">
            <label className="overline block mb-4">2. Add Stores to Compare</label>
            <URLInputForm 
              stores={stores} 
              onStoresChange={setStores}
            />
          </div>

          {/* Start Button */}
          <Button
            onClick={handleStartScrape}
            disabled={!selectedListId || stores.length === 0 || isJobActive}
            className="w-full btn-primary h-12 text-lg flex items-center justify-center gap-2"
            data-testid="start-scrape-btn"
          >
            <Play className="w-5 h-5" />
            {isJobActive ? "Scraping in Progress..." : "Start Price Comparison"}
          </Button>
        </div>

        {/* Terminal Output */}
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <label className="overline">Live Scraper Output</label>
            {currentJob && (
              <span className="text-xs font-mono text-[#5C605A]">
                Job: {currentJob.id.slice(0, 8)}...
              </span>
            )}
          </div>
          <ScraperTerminal
            logs={currentJob?.logs || []}
            status={currentJob?.status || "idle"}
            progress={currentJob?.progress || 0}
          />
        </div>
      </div>
    </div>
  );
};

export default ScraperPage;
