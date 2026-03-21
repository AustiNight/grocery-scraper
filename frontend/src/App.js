import { BrowserRouter, Routes, Route } from "react-router-dom";
import { Toaster } from "sonner";
import { DashboardLayout } from "./components/DashboardLayout";
import { DashboardPage } from "./pages/DashboardPage";
import { ShoppingListsPage } from "./pages/ShoppingListsPage";
import { ScraperPage } from "./pages/ScraperPage";
import { ResultsPage } from "./pages/ResultsPage";
import "@/App.css";

function App() {
  return (
    <BrowserRouter>
      <Toaster 
        position="top-right" 
        toastOptions={{
          style: {
            background: '#FFFFFF',
            border: '1px solid #EBE9E0',
            borderRadius: '0',
            fontFamily: 'IBM Plex Sans, sans-serif',
          },
        }}
      />
      <Routes>
        <Route path="/" element={<DashboardLayout />}>
          <Route index element={<DashboardPage />} />
          <Route path="lists" element={<ShoppingListsPage />} />
          <Route path="scraper" element={<ScraperPage />} />
          <Route path="results" element={<ResultsPage />} />
          <Route path="results/:jobId" element={<ResultsPage />} />
        </Route>
      </Routes>
    </BrowserRouter>
  );
}

export default App;
