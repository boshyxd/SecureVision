"use client";

import { Card } from "@/components/ui/card";
import { useBreachSearch } from "@/hooks/useBreachSearch";
import { BreachTable } from "@/components/breach-analysis/table/breach-table";
import { Shield, AlertTriangle, Server, Network, Lock, Globe, FileDown } from "lucide-react";
import { useMemo, useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { AdvancedFilters } from "@/components/breach-analysis/filters/advanced-filters";
import { UploadDialog } from "@/components/breach-analysis/layout/upload-dialog";
import { SearchFilters } from "@/types";

export default function Home() {
  const [tempFilters, setTempFilters] = useState<SearchFilters>({});
  const { entries, isLoading, hasMore, loadMore, search } = useBreachSearch();

  // Load initial data when component mounts
  useEffect(() => {
    search("", {});
  }, [search]);

  const handleApplyFilters = () => {
    search("", tempFilters);
  };

  const handleResetFilters = () => {
    setTempFilters({});
    search("", {});
  };

  const handleUploadComplete = () => {
    // Refresh the data after successful upload
    search("", tempFilters);
  };

  const downloadCSV = () => {
    const headers = [
      "URL",
      "Username",
      "Password",
      "Domain",
      "IP Address",
      "Port",
      "Risk Score",
      "Pattern Type",
      "Service Type",
      "Status",
      "Has CAPTCHA",
      "Has MFA",
      "Is Secure",
      "Tags",
    ];

    const rows = entries.map((entry) => [
      entry.url,
      entry.username,
      entry.password,
      entry.metadata.domain,
      entry.metadata.ip_address,
      entry.metadata.port,
      entry.risk_score,
      entry.pattern_type,
      entry.metadata.service_type,
      entry.metadata.status,
      entry.metadata.hasCaptcha ? "Yes" : "No",
      entry.metadata.hasMfa ? "Yes" : "No",
      entry.metadata.isSecure ? "Yes" : "No",
      entry.metadata.tags?.join(", "),
    ]);

    const csvContent = [
      headers.join(","),
      ...rows.map((row) => row.map((cell) => `"${cell || ""}"`).join(",")),
    ].join("\n");

    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
    const link = document.createElement("a");
    link.href = URL.createObjectURL(blob);
    link.setAttribute("download", `breach_data_${new Date().toISOString()}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  // Calculate real-time statistics
  const stats = useMemo(() => {
    const activeServices = entries.filter(entry => entry.metadata?.status === 200).length;
    const criticalEndpoints = entries.filter(entry => entry.risk_score >= 7).length;
    const totalDomains = new Set(entries.map(entry => entry.metadata?.domain).filter(Boolean)).size;
    const securedEndpoints = entries.filter(entry => 
      entry.metadata?.isSecure || 
      entry.metadata?.hasMfa || 
      entry.metadata?.hasCaptcha
    ).length;
    const averageRiskScore = entries.length > 0 
      ? (entries.reduce((sum, entry) => sum + (entry.risk_score || 0), 0) / entries.length).toFixed(1)
      : "0.0";
    const networkCoverage = entries.length > 0
      ? ((securedEndpoints / entries.length) * 100).toFixed(1)
      : "0.0";

    return {
      activeServices,
      criticalEndpoints,
      totalDomains,
      securedEndpoints,
      averageRiskScore,
      networkCoverage,
      securedPercentage: entries.length > 0 
        ? ((securedEndpoints / entries.length) * 100).toFixed(1)
        : "0.0"
    };
  }, [entries]);

  return (
    <div className="min-h-screen bg-gradient-to-b from-black via-zinc-950 to-zinc-950">
      <div className="p-6 space-y-6">
        {/* Stats Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          <Card className="bg-black/40 border-zinc-800/50 backdrop-blur-sm group hover:border-emerald-500/20 transition-colors">
            <div className="p-6">
              <div className="flex items-start justify-between">
                <div className="space-y-2">
                  <div className="text-xs font-mono text-zinc-500 tracking-wider">ACTIVE SERVICES</div>
                  <div className="text-2xl font-mono font-bold text-zinc-100">{stats.activeServices}</div>
                </div>
                <div className="rounded-lg bg-emerald-500/10 p-2 group-hover:bg-emerald-500/20 transition-colors">
                  <Server className="h-4 w-4 text-emerald-400" />
                </div>
              </div>
              <div className="mt-4 text-sm text-zinc-400 font-mono">
                HTTP 200 Status
              </div>
            </div>
          </Card>

          <Card className="bg-black/40 border-zinc-800/50 backdrop-blur-sm group hover:border-red-500/20 transition-colors">
            <div className="p-6">
              <div className="flex items-start justify-between">
                <div className="space-y-2">
                  <div className="text-xs font-mono text-zinc-500 tracking-wider">CRITICAL ENDPOINTS</div>
                  <div className="text-2xl font-mono font-bold text-zinc-100">{stats.criticalEndpoints}</div>
                </div>
                <div className="rounded-lg bg-red-500/10 p-2 group-hover:bg-red-500/20 transition-colors">
                  <AlertTriangle className="h-4 w-4 text-red-400" />
                </div>
              </div>
              <div className="mt-4 text-sm text-zinc-400 font-mono">
                Risk Score ≥ 7
              </div>
            </div>
          </Card>

          <Card className="bg-black/40 border-zinc-800/50 backdrop-blur-sm group hover:border-blue-500/20 transition-colors">
            <div className="p-6">
              <div className="flex items-start justify-between">
                <div className="space-y-2">
                  <div className="text-xs font-mono text-zinc-500 tracking-wider">NETWORK COVERAGE</div>
                  <div className="text-2xl font-mono font-bold text-zinc-100">{stats.networkCoverage}%</div>
                </div>
                <div className="rounded-lg bg-blue-500/10 p-2 group-hover:bg-blue-500/20 transition-colors">
                  <Network className="h-4 w-4 text-blue-400" />
                </div>
              </div>
              <div className="mt-4 text-sm text-zinc-400 font-mono">
                Of total endpoints
              </div>
            </div>
          </Card>

          <Card className="bg-black/40 border-zinc-800/50 backdrop-blur-sm group hover:border-purple-500/20 transition-colors">
            <div className="p-6">
              <div className="flex items-start justify-between">
                <div className="space-y-2">
                  <div className="text-xs font-mono text-zinc-500 tracking-wider">DOMAINS MONITORED</div>
                  <div className="text-2xl font-mono font-bold text-zinc-100">{stats.totalDomains}</div>
                </div>
                <div className="rounded-lg bg-purple-500/10 p-2 group-hover:bg-purple-500/20 transition-colors">
                  <Globe className="h-4 w-4 text-purple-400" />
                </div>
              </div>
              <div className="mt-4 text-sm text-zinc-400 font-mono">
                Unique domains
              </div>
            </div>
          </Card>

          <Card className="bg-black/40 border-zinc-800/50 backdrop-blur-sm group hover:border-yellow-500/20 transition-colors">
            <div className="p-6">
              <div className="flex items-start justify-between">
                <div className="space-y-2">
                  <div className="text-xs font-mono text-zinc-500 tracking-wider">AVERAGE RISK SCORE</div>
                  <div className="text-2xl font-mono font-bold text-zinc-100">{stats.averageRiskScore}</div>
                </div>
                <div className="rounded-lg bg-yellow-500/10 p-2 group-hover:bg-yellow-500/20 transition-colors">
                  <Shield className="h-4 w-4 text-yellow-400" />
                </div>
              </div>
              <div className="mt-4 text-sm text-zinc-400 font-mono">
                Across all endpoints
              </div>
            </div>
          </Card>

          <Card className="bg-black/40 border-zinc-800/50 backdrop-blur-sm group hover:border-indigo-500/20 transition-colors">
            <div className="p-6">
              <div className="flex items-start justify-between">
                <div className="space-y-2">
                  <div className="text-xs font-mono text-zinc-500 tracking-wider">SECURED ENDPOINTS</div>
                  <div className="text-2xl font-mono font-bold text-zinc-100">{stats.securedPercentage}%</div>
                </div>
                <div className="rounded-lg bg-indigo-500/10 p-2 group-hover:bg-indigo-500/20 transition-colors">
                  <Lock className="h-4 w-4 text-indigo-400" />
                </div>
              </div>
              <div className="mt-4 text-sm text-zinc-400 font-mono">
                HTTPS, MFA, or CAPTCHA
              </div>
            </div>
          </Card>
        </div>

        {/* Breach Table */}
        <Card className="bg-black/40 border-zinc-800/50 backdrop-blur-sm">
          <div className="p-6">
            <div className="flex items-center justify-between mb-6">
              <div>
                <h2 className="text-lg font-mono font-bold text-zinc-100">Breach Analysis</h2>
                <p className="text-sm text-zinc-500 font-mono">Real-time breach detection and analysis</p>
              </div>
              <div className="flex items-center space-x-2">
                <Button 
                  variant="outline" 
                  size="sm" 
                  className="font-mono border-zinc-800 bg-black/40 hover:bg-black/60 hover:text-zinc-100 text-zinc-400"
                  onClick={downloadCSV}
                >
                  <FileDown className="mr-2 h-4 w-4" />
                  Export CSV
                </Button>
                <AdvancedFilters
                  tempFilters={tempFilters}
                  onFilterChange={setTempFilters}
                  onApplyFilters={handleApplyFilters}
                  onResetFilters={handleResetFilters}
                />
                <UploadDialog onUploadComplete={handleUploadComplete} />
              </div>
            </div>
            <BreachTable 
              entries={entries} 
              isLoading={isLoading}
              hasMore={hasMore}
              onLoadMore={loadMore}
            />
          </div>
        </Card>
      </div>
    </div>
  );
}
