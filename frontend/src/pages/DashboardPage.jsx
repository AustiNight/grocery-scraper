import { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import { getShoppingLists, getScrapeJobs, getAllComparisons } from "../lib/api";
import { formatCurrency, formatDate, getStatusColor, cn } from "../lib/utils";
import { 
  ShoppingCart, 
  TrendingDown, 
  Clock, 
  ArrowRight,
  ListChecks,
  Search,
  BarChart3
} from "lucide-react";
import { Button } from "../components/ui/button";

export const DashboardPage = () => {
  const [lists, setLists] = useState([]);
  const [jobs, setJobs] = useState([]);
  const [comparisons, setComparisons] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const [listsData, jobsData, comparisonsData] = await Promise.all([
          getShoppingLists().catch(() => []),
          getScrapeJobs().catch(() => []),
          getAllComparisons().catch(() => []),
        ]);
        setLists(listsData);
        setJobs(jobsData);
        setComparisons(comparisonsData);
      } catch (error) {
        console.error("Error fetching dashboard data:", error);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, []);

  const recentJobs = jobs.slice(0, 5);
  const totalSavings = comparisons.reduce((sum, c) => sum + (c.summary?.savings_vs_next || 0), 0);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64" data-testid="dashboard-loading">
        <div className="animate-pulse text-[#5C605A]">Loading...</div>
      </div>
    );
  }

  return (
    <div className="space-y-8" data-testid="dashboard-page">
      {/* Page Header */}
      <div>
        <h1 className="font-serif text-4xl text-[#1C1E1C] tracking-tight">Dashboard</h1>
        <p className="text-[#5C605A] mt-2">Track your grocery savings at a glance</p>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white border border-[#EBE9E0] p-6 hover-lift" data-testid="stat-lists">
          <div className="flex items-center gap-3 mb-4">
            <div className="w-10 h-10 bg-[#FAF8F5] flex items-center justify-center">
              <ListChecks className="w-5 h-5 text-[#C8553D]" />
            </div>
            <span className="overline">Shopping Lists</span>
          </div>
          <p className="text-3xl font-serif font-semibold text-[#1C1E1C]">{lists.length}</p>
        </div>

        <div className="bg-white border border-[#EBE9E0] p-6 hover-lift" data-testid="stat-scrapes">
          <div className="flex items-center gap-3 mb-4">
            <div className="w-10 h-10 bg-[#FAF8F5] flex items-center justify-center">
              <Search className="w-5 h-5 text-[#C8553D]" />
            </div>
            <span className="overline">Price Scrapes</span>
          </div>
          <p className="text-3xl font-serif font-semibold text-[#1C1E1C]">{jobs.length}</p>
        </div>

        <div className="bg-white border border-[#EBE9E0] p-6 hover-lift" data-testid="stat-comparisons">
          <div className="flex items-center gap-3 mb-4">
            <div className="w-10 h-10 bg-[#FAF8F5] flex items-center justify-center">
              <BarChart3 className="w-5 h-5 text-[#C8553D]" />
            </div>
            <span className="overline">Comparisons</span>
          </div>
          <p className="text-3xl font-serif font-semibold text-[#1C1E1C]">{comparisons.length}</p>
        </div>

        <div className="bg-[#2D4A22]/5 border border-[#2D4A22]/20 p-6 hover-lift" data-testid="stat-savings">
          <div className="flex items-center gap-3 mb-4">
            <div className="w-10 h-10 bg-[#2D4A22]/10 flex items-center justify-center">
              <TrendingDown className="w-5 h-5 text-[#2D4A22]" />
            </div>
            <span className="overline text-[#2D4A22]">Total Savings</span>
          </div>
          <p className="text-3xl font-serif font-semibold text-[#2D4A22]">{formatCurrency(totalSavings)}</p>
        </div>
      </div>

      {/* Quick Actions */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <Link 
          to="/lists" 
          className="bg-white border border-[#EBE9E0] p-6 hover-lift group flex items-center justify-between"
          data-testid="quick-action-lists"
        >
          <div>
            <h3 className="font-serif text-xl text-[#1C1E1C]">Create Shopping List</h3>
            <p className="text-[#5C605A] mt-1">Add items you want to compare</p>
          </div>
          <ArrowRight className="w-5 h-5 text-[#5C605A] group-hover:text-[#C8553D] transition-colors" />
        </Link>

        <Link 
          to="/scraper" 
          className="bg-[#C8553D] p-6 hover-lift group flex items-center justify-between"
          data-testid="quick-action-scraper"
        >
          <div>
            <h3 className="font-serif text-xl text-white">Start Price Comparison</h3>
            <p className="text-white/80 mt-1">Scrape stores with AI analysis</p>
          </div>
          <ArrowRight className="w-5 h-5 text-white/80 group-hover:text-white transition-colors" />
        </Link>
      </div>

      {/* Recent Activity */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Recent Scrape Jobs */}
        <div className="bg-white border border-[#EBE9E0]">
          <div className="p-4 border-b border-[#EBE9E0] flex items-center justify-between">
            <h3 className="font-serif text-lg">Recent Scrapes</h3>
            <Link to="/scraper" className="text-sm text-[#C8553D] hover:underline">View all</Link>
          </div>
          {recentJobs.length === 0 ? (
            <div className="p-8 text-center text-[#5C605A]">
              <Clock className="w-8 h-8 mx-auto mb-2 opacity-50" />
              <p>No scrape jobs yet</p>
            </div>
          ) : (
            <div className="divide-y divide-[#EBE9E0]">
              {recentJobs.map(job => (
                <Link 
                  key={job.id}
                  to={`/results/${job.id}`}
                  className="p-4 flex items-center justify-between hover:bg-[#FAF8F5] transition-colors"
                  data-testid={`recent-job-${job.id}`}
                >
                  <div>
                    <p className="text-[#1C1E1C] font-medium">
                      {job.stores?.map(s => s.name).join(", ") || "Unknown stores"}
                    </p>
                    <p className="text-sm text-[#5C605A]">{formatDate(job.created_at)}</p>
                  </div>
                  <span className={cn("text-xs px-2 py-1 uppercase font-mono", getStatusColor(job.status))}>
                    {job.status}
                  </span>
                </Link>
              ))}
            </div>
          )}
        </div>

        {/* Shopping Lists */}
        <div className="bg-white border border-[#EBE9E0]">
          <div className="p-4 border-b border-[#EBE9E0] flex items-center justify-between">
            <h3 className="font-serif text-lg">Shopping Lists</h3>
            <Link to="/lists" className="text-sm text-[#C8553D] hover:underline">View all</Link>
          </div>
          {lists.length === 0 ? (
            <div className="p-8 text-center text-[#5C605A]">
              <ShoppingCart className="w-8 h-8 mx-auto mb-2 opacity-50" />
              <p>No shopping lists yet</p>
            </div>
          ) : (
            <div className="divide-y divide-[#EBE9E0]">
              {lists.slice(0, 5).map(list => (
                <Link 
                  key={list.id}
                  to="/lists"
                  className="p-4 flex items-center justify-between hover:bg-[#FAF8F5] transition-colors"
                  data-testid={`recent-list-${list.id}`}
                >
                  <div>
                    <p className="text-[#1C1E1C] font-medium">{list.name}</p>
                    <p className="text-sm text-[#5C605A]">{list.items?.length || 0} items</p>
                  </div>
                  <ArrowRight className="w-4 h-4 text-[#5C605A]" />
                </Link>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default DashboardPage;
