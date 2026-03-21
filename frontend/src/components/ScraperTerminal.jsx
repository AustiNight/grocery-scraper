import { useEffect, useRef } from "react";
import { cn } from "../lib/utils";

export const ScraperTerminal = ({ logs = [], status = "idle", progress = 0 }) => {
  const terminalRef = useRef(null);

  useEffect(() => {
    if (terminalRef.current) {
      terminalRef.current.scrollTop = terminalRef.current.scrollHeight;
    }
  }, [logs]);

  return (
    <div 
      className="relative overflow-hidden border border-[#EBE9E0]"
      data-testid="scraper-terminal"
    >
      {/* Terminal Header */}
      <div className="bg-[#1C1E1C] px-4 py-2 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className="flex gap-1.5">
            <div className="w-3 h-3 rounded-full bg-red-500/80" />
            <div className="w-3 h-3 rounded-full bg-yellow-500/80" />
            <div className="w-3 h-3 rounded-full bg-green-500/80" />
          </div>
          <span className="ml-3 text-white/60 font-mono text-xs">grocery-hunt-ai</span>
        </div>
        <div className="flex items-center gap-3">
          <span className={cn(
            "text-xs font-mono uppercase tracking-wider",
            status === "running" ? "text-[#D97706]" : 
            status === "completed" ? "text-[#4ADE80]" :
            status === "failed" ? "text-red-400" :
            "text-white/40"
          )}>
            {status}
          </span>
          {status === "running" && (
            <span className="text-[#4ADE80] font-mono text-xs">{progress}%</span>
          )}
        </div>
      </div>

      {/* Terminal Body */}
      <div 
        ref={terminalRef}
        className="terminal-container h-80 overflow-auto p-4 relative"
      >
        {/* Scanline effect when running */}
        {status === "running" && <div className="scanline" />}

        {logs.length === 0 ? (
          <div className="text-[#5C605A] font-mono text-sm">
            <span className="text-[#4ADE80]">$</span> Waiting for scrape job...
          </div>
        ) : (
          <div className="space-y-1">
            {logs.map((log, index) => (
              <div 
                key={index} 
                className="terminal-line font-mono text-sm leading-relaxed"
                data-testid={`terminal-log-${index}`}
              >
                <span className="text-[#4ADE80]">→</span>{" "}
                <span className="text-[#E5E5E5]">{log}</span>
              </div>
            ))}
            {status === "running" && (
              <div className="terminal-line">
                <span className="text-[#4ADE80]">$</span>{" "}
                <span className="terminal-cursor" />
              </div>
            )}
          </div>
        )}
      </div>

      {/* Progress Bar */}
      {status === "running" && (
        <div className="h-1 bg-[#1C1E1C]">
          <div 
            className="h-full bg-[#4ADE80] transition-all duration-500"
            style={{ width: `${progress}%` }}
          />
        </div>
      )}
    </div>
  );
};
