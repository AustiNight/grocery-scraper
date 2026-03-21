import { useState, useEffect } from "react";
import { useParams, Link } from "react-router-dom";
import { toast } from "sonner";
import { ArrowLeft, Clock, RefreshCw } from "lucide-react";
import { getScrapeJobs, getComparisonResult } from "../lib/api";
import { formatDate, getStatusColor, cn } from "../lib/utils";
import { Button } from "../components/ui/button";
import { PriceComparisonTable } from "../components/PriceComparisonTable";

export const ResultsPage = () => {
  const { jobId } = useParams();
  const [jobs, setJobs] = useState([]);
  const [selectedJob, setSelectedJob] = useState(null);
  const [comparisonData, setComparisonData] = useState(null);
  const [loading, setLoading] = useState(true);

  // Fetch all jobs
  useEffect(() => {
    const fetchJobs = async () => {
      try {
        const data = await getScrapeJobs();
        setJobs(data);
        
        // If jobId provided, select that job
        if (jobId) {
          const job = data.find(j => j.id === jobId);
          if (job) {
            setSelectedJob(job);
          }
        } else if (data.length > 0) {
          // Otherwise select the most recent completed job
          const completedJob = data.find(j => j.status === "completed");
          if (completedJob) {
            setSelectedJob(completedJob);
          }
        }
      } catch (error) {
        toast.error("Failed to load scrape jobs");
      } finally {
        setLoading(false);
      }
    };
    fetchJobs();
  }, [jobId]);

  // Fetch comparison data when job selected
  useEffect(() => {
    const fetchComparison = async () => {
      if (!selectedJob || selectedJob.status !== "completed") {
        setComparisonData(null);
        return;
      }

      try {
        const data = await getComparisonResult(selectedJob.id);
        setComparisonData(data);
      } catch (error) {
        console.error("Failed to load comparison:", error);
        setComparisonData(null);
      }
    };
    fetchComparison();
  }, [selectedJob]);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64" data-testid="results-loading">
        <div className="animate-pulse text-[#5C605A]">Loading...</div>
      </div>
    );
  }

  return (
    <div className="space-y-8" data-testid="results-page">
      {/* Page Header */}
      <div className="flex items-start justify-between">
        <div>
          <h1 className="font-serif text-4xl text-[#1C1E1C] tracking-tight">Price Comparisons</h1>
          <p className="text-[#5C605A] mt-2">View and analyze your grocery price comparisons</p>
        </div>
        <Link to="/scraper">
          <Button className="btn-primary flex items-center gap-2" data-testid="new-comparison-btn">
            <RefreshCw className="w-4 h-4" />
            New Comparison
          </Button>
        </Link>
      </div>

      {jobs.length === 0 ? (
        <div className="empty-state bg-white border border-[#EBE9E0] py-16" data-testid="no-results">
          <Clock className="w-12 h-12 text-[#5C605A]/50 mx-auto mb-4" />
          <h3 className="font-serif text-xl text-[#1C1E1C] mb-2">No comparisons yet</h3>
          <p className="text-[#5C605A] mb-6">Run your first price comparison to see results here</p>
          <Link to="/scraper">
            <Button className="btn-primary">Start Comparing Prices</Button>
          </Link>
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
          {/* Jobs List */}
          <div className="lg:col-span-1 space-y-4">
            <p className="overline">Recent Scrapes</p>
            <div className="space-y-2">
              {jobs.map(job => (
                <button
                  key={job.id}
                  onClick={() => setSelectedJob(job)}
                  className={cn(
                    "w-full text-left p-4 border transition-all duration-200",
                    selectedJob?.id === job.id 
                      ? "border-[#C8553D] bg-[#C8553D]/5" 
                      : "border-[#EBE9E0] bg-white hover:border-[#C8553D]/50"
                  )}
                  data-testid={`job-item-${job.id}`}
                >
                  <div className="flex items-center justify-between mb-2">
                    <span className={cn(
                      "text-xs px-2 py-0.5 uppercase font-mono",
                      getStatusColor(job.status)
                    )}>
                      {job.status}
                    </span>
                    <span className="text-xs text-[#5C605A]">
                      {formatDate(job.created_at)}
                    </span>
                  </div>
                  <p className="text-sm text-[#1C1E1C] font-medium truncate">
                    {job.stores?.map(s => s.name).join(", ") || "Unknown"}
                  </p>
                </button>
              ))}
            </div>
          </div>

          {/* Comparison Results */}
          <div className="lg:col-span-3">
            {!selectedJob ? (
              <div className="bg-white border border-[#EBE9E0] p-8 text-center">
                <p className="text-[#5C605A]">Select a scrape job to view results</p>
              </div>
            ) : selectedJob.status !== "completed" ? (
              <div className="bg-white border border-[#EBE9E0] p-8 text-center">
                <div className={cn(
                  "inline-block px-3 py-1 mb-4 text-sm uppercase font-mono",
                  getStatusColor(selectedJob.status)
                )}>
                  {selectedJob.status}
                </div>
                <p className="text-[#5C605A]">
                  {selectedJob.status === "running" 
                    ? "Scraping in progress..." 
                    : selectedJob.status === "pending"
                    ? "Job is queued..."
                    : "This job did not complete successfully"}
                </p>
                {selectedJob.status === "running" && (
                  <div className="mt-4">
                    <div className="w-full bg-[#EBE9E0] h-2">
                      <div 
                        className="bg-[#C8553D] h-2 transition-all duration-500"
                        style={{ width: `${selectedJob.progress || 0}%` }}
                      />
                    </div>
                    <p className="text-sm text-[#5C605A] mt-2">{selectedJob.progress || 0}% complete</p>
                  </div>
                )}
              </div>
            ) : comparisonData ? (
              <PriceComparisonTable data={comparisonData} />
            ) : (
              <div className="bg-white border border-[#EBE9E0] p-8 text-center">
                <p className="text-[#5C605A]">No comparison data available for this job</p>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

export default ResultsPage;
