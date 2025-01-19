"use client";

import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { useBreachSearch } from "@/hooks/useBreachSearch";
import { BreachTable } from "@/components/breach-analysis/table/breach-table";
import { Shield, AlertTriangle, Server, Network, Lock, Globe, FileDown, CheckCircle } from "lucide-react";
import { useMemo, useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { AdvancedFilters } from "@/components/breach-analysis/filters/advanced-filters";
import { UploadDialog } from "@/components/breach-analysis/layout/upload-dialog";
import { SearchFilters, BreachEntry } from "@/types";
import { analyzeRisk } from "@/lib/groq";
import { toast } from "@/components/ui/use-toast";
import { motion, AnimatePresence } from "framer-motion";
import { NumberScramble } from "@/components/ui/number-scramble";

export default function Home() {
  const [tempFilters, setTempFilters] = useState<SearchFilters>({});
  const { entries, isLoading, hasMore, loadMore, search, updateEntry } = useBreachSearch();

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

  const handleRiskAssessment = async (entry: BreachEntry) => {
    try {
      updateEntry({
        ...entry,
        isAssessing: true
      });

      const assessment = await analyzeRisk(entry);
      
      updateEntry({
        ...entry,
        risk_assessment: assessment,
        isAssessing: false
      });
    } catch (error) {
      console.error('Failed to assess risk:', error);
      updateEntry({
        ...entry,
        isAssessing: false
      });
      toast({
        title: "Error",
        description: "Failed to analyze risk. Please try again.",
        variant: "destructive"
      });
    }
  };

  const container = {
    hidden: { opacity: 0 },
    show: {
      opacity: 1,
      transition: {
        staggerChildren: 0.1
      }
    }
  };

  const item = {
    hidden: { opacity: 0, y: 20 },
    show: { opacity: 1, y: 0 }
  };

  return (
    <div className="min-h-screen bg-gradient-to-b from-black via-zinc-950 to-zinc-950">
      <div className="p-6 space-y-6 max-w-[1920px] mx-auto w-full">
        <motion.div 
          className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 w-full"
          variants={container}
          initial="hidden"
          animate="show"
        >
          <motion.div 
            className="min-w-[400px]"
            variants={item}
          >
            <Card className="bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60 border-emerald-500/20">
              <div className="p-6">
                <div className="flex items-start justify-between">
                  <div className="space-y-2">
                    <div className="text-xs font-mono text-muted-foreground tracking-wider">ACTIVE SERVICES</div>
                    <div className="text-2xl font-mono font-bold text-foreground">
                      <NumberScramble value={stats.activeServices} />
                    </div>
                  </div>
                  <div className="rounded-lg bg-muted p-2">
                    <Server className="h-4 w-4" />
                  </div>
                </div>
                <div className="mt-4 text-sm text-muted-foreground font-mono">
                  HTTP 200 Status
                </div>
              </div>
            </Card>
          </motion.div>

          <motion.div 
            className="min-w-[400px]"
            variants={item}
          >
            <Card className="bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60 border-emerald-500/20">
              <div className="p-6">
                <div className="flex items-start justify-between">
                  <div className="space-y-2">
                    <div className="text-xs font-mono text-muted-foreground tracking-wider">BREACHED ENTRIES</div>
                    <div className="text-2xl font-mono font-bold text-red-400">
                      <NumberScramble 
                        value={entries.filter(e => e.metadata.breach_info?.is_breached).length} 
                        className="text-red-400"
                      />
                    </div>
                  </div>
                  <div className="rounded-lg bg-red-500/10 p-2">
                    <AlertTriangle className="h-4 w-4 text-red-400" />
                  </div>
                </div>
                <div className="mt-4 text-sm text-muted-foreground font-mono">
                  Detected breaches
                </div>
              </div>
            </Card>
          </motion.div>

          <motion.div 
            className="min-w-[400px]"
            variants={item}
          >
            <Card className="bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60 border-emerald-500/20">
              <div className="p-6">
                <div className="flex items-start justify-between">
                  <div className="space-y-2">
                    <div className="text-xs font-mono text-muted-foreground tracking-wider">SECURE ENTRIES</div>
                    <div className="text-2xl font-mono font-bold text-emerald-400">
                      <NumberScramble 
                        value={entries.filter(e => !e.metadata.breach_info?.is_breached).length}
                        className="text-emerald-400"
                      />
                    </div>
                  </div>
                  <div className="rounded-lg bg-emerald-500/10 p-2">
                    <CheckCircle className="h-4 w-4" />
                  </div>
                </div>
                <div className="mt-4 text-sm text-muted-foreground font-mono">
                  Protected entries
                </div>
              </div>
            </Card>
          </motion.div>

          <motion.div 
            className="min-w-[400px]"
            variants={item}
          >
            <Card className="bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60 border-emerald-500/20">
              <div className="p-6">
                <div className="flex items-start justify-between">
                  <div className="space-y-2">
                    <div className="text-xs font-mono text-muted-foreground tracking-wider">TOTAL DOMAINS</div>
                    <div className="text-2xl font-mono font-bold text-foreground">
                      <NumberScramble value={stats.totalDomains} />
                    </div>
                  </div>
                  <div className="rounded-lg bg-muted p-2">
                    <Globe className="h-4 w-4" />
                  </div>
                </div>
                <div className="mt-4 text-sm text-muted-foreground font-mono">
                  Unique domains analyzed
                </div>
              </div>
            </Card>
          </motion.div>

          <motion.div 
            className="min-w-[400px]"
            variants={item}
          >
            <Card className="bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60 border-emerald-500/20">
              <div className="p-6">
                <div className="flex items-start justify-between">
                  <div className="space-y-2">
                    <div className="text-xs font-mono text-muted-foreground tracking-wider">NETWORK COVERAGE</div>
                    <div className="text-2xl font-mono font-bold text-foreground">
                      <NumberScramble 
                        value={parseFloat(stats.networkCoverage)} 
                        formatFn={(val) => `${val.toFixed(1)}%`}
                      />
                    </div>
                  </div>
                  <div className="rounded-lg bg-muted p-2">
                    <Network className="h-4 w-4" />
                  </div>
                </div>
                <div className="mt-4 text-sm text-muted-foreground font-mono">
                  Protected endpoints
                </div>
              </div>
            </Card>
          </motion.div>

          <motion.div 
            className="min-w-[400px]"
            variants={item}
          >
            <Card className="bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60 border-emerald-500/20">
              <div className="p-6">
                <div className="flex items-start justify-between">
                  <div className="space-y-2">
                    <div className="text-xs font-mono text-muted-foreground tracking-wider">PROTECTED SERVICES</div>
                    <div className="text-2xl font-mono font-bold text-foreground">
                      <NumberScramble value={stats.securedEndpoints} />
                    </div>
                  </div>
                  <div className="rounded-lg bg-muted p-2">
                    <Lock className="h-4 w-4" />
                  </div>
                </div>
                <div className="mt-4 text-sm text-muted-foreground font-mono">
                  HTTPS, MFA, or CAPTCHA enabled
                </div>
              </div>
            </Card>
          </motion.div>
        </motion.div>

        {/* Breach Analysis Card */}
        <motion.div 
          className="w-full min-w-0"
          layout
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.3, delay: 0.2 }}
        >
          <Card className="bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60 border-emerald-500/20">
            <div className="p-8">
              <div className="flex items-center justify-between mb-8">
                <div className="min-w-0 flex-1">
                  <h2 className="text-lg font-mono font-bold text-zinc-100 truncate">Breach Analysis</h2>
                  <p className="text-sm text-zinc-500 font-mono truncate">Real-time breach detection and analysis</p>
                </div>
                <div className="flex items-center gap-4 flex-shrink-0 ml-4">
                  <Button 
                    variant="outline" 
                    size="sm" 
                    className="font-mono border-zinc-800 bg-black/40 hover:bg-black/60 hover:text-zinc-100 text-zinc-400 whitespace-nowrap"
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
              <div className="w-full min-w-0 overflow-x-auto">
                <div className="min-w-full">
                  <BreachTable
                    entries={entries}
                    isLoading={isLoading}
                    hasMore={hasMore}
                    onLoadMore={loadMore}
                    onAssessRisk={handleRiskAssessment}
                  />
                </div>
              </div>
            </div>
          </Card>
        </motion.div>
      </div>
    </div>
  );
}
