"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Sheet } from "@/components/ui/sheet";
import { BreachTable } from "@/components/breach-analysis/table/breach-table";
import { BreachStats } from "@/components/breach-analysis/stats/breach-stats";
import { AdvancedFilters } from "@/components/breach-analysis/filters/advanced-filters";
import { UploadDialog } from "@/components/breach-analysis/layout/upload-dialog";
import { Navbar } from "@/components/breach-analysis/layout/navbar";
import { SearchFilters } from "@/types";
import { useBreachSearch } from "@/hooks/useBreachSearch";
import { Separator } from "@/components/ui/separator";
import { ScrollArea } from "@/components/ui/scroll-area";
import { 
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle 
} from "@/components/ui/card";
import { 
  FileDown, 
  AlertTriangle,
  Clock,
  KeyRound,
  ShieldCheck,
  Shield,
  Globe,
  Server,
  Network,
  CheckCircle2,
  XCircle,
  Pause
} from "lucide-react";
import { Badge } from "@/components/ui/badge";

export default function Home() {
  const [searchQuery, setSearchQuery] = useState("");
  const [tempFilters, setTempFilters] = useState<SearchFilters>({});
  const [activeFilters, setActiveFilters] = useState<SearchFilters>({});
  const [activeSearchType, setActiveSearchType] = useState<'domain' | 'application' | 'port' | 'path'>('domain');
  const [isUploading, setIsUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);

  const {
    entries,
    isLoading,
    totalEntries,
    hasMore,
    search,
    loadMore
  } = useBreachSearch();

  const handleApplyFilters = () => {
    setActiveFilters(tempFilters);
    search(searchQuery, tempFilters);
  };

  const handleResetFilters = () => {
    setTempFilters({});
    setActiveFilters({});
    search(searchQuery, {});
  };

  return (
    <div className="min-h-screen flex bg-zinc-950 text-zinc-100">
      <aside className="w-72 border-r border-zinc-800/50 bg-black/20 backdrop-blur-sm">
        <ScrollArea className="h-screen">
          <div className="p-6 space-y-6">
            <div>
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-xl font-mono tracking-tight text-zinc-100">Quick Filters</h2>
                <Badge variant="outline" className="font-mono text-xs border-zinc-800 bg-black/50 text-zinc-300">5 filters</Badge>
              </div>
              <div className="space-y-1.5">
                <Button 
                  variant="outline" 
                  className="w-full justify-start font-mono border-zinc-800 bg-black/40 hover:bg-black/60 hover:text-zinc-100 hover:border-zinc-700 group text-zinc-400" 
                  size="sm"
                >
                  <AlertTriangle className="mr-2 h-4 w-4 text-red-500 group-hover:text-red-400" />
                  <span className="font-mono">High Risk (≥80%)</span>
                  <Badge variant="destructive" className="ml-auto font-mono bg-red-950/50 text-red-200">124</Badge>
                </Button>
                <Button 
                  variant="outline" 
                  className="w-full justify-start font-mono border-zinc-800 bg-black/40 hover:bg-black/60 hover:text-zinc-100 hover:border-zinc-700 group text-zinc-400" 
                  size="sm"
                >
                  <Clock className="mr-2 h-4 w-4 text-blue-500 group-hover:text-blue-400" />
                  <span className="font-mono">Recent (24h)</span>
                  <Badge variant="outline" className="ml-auto font-mono border-blue-900 bg-blue-950/30 text-zinc-100">45</Badge>
                </Button>
                <Button 
                  variant="outline" 
                  className="w-full justify-start font-mono border-zinc-800 bg-black/40 hover:bg-black/60 hover:text-zinc-100 hover:border-zinc-700 group text-zinc-400" 
                  size="sm"
                >
                  <KeyRound className="mr-2 h-4 w-4 text-orange-500 group-hover:text-orange-400" />
                  <span className="font-mono">Login Forms</span>
                  <Badge variant="outline" className="ml-auto font-mono border-orange-900 bg-orange-950/30 text-zinc-100">89</Badge>
                </Button>
                <Button 
                  variant="outline" 
                  className="w-full justify-start font-mono border-zinc-800 bg-black/40 hover:bg-black/60 hover:text-zinc-100 hover:border-zinc-700 group text-zinc-400" 
                  size="sm"
                >
                  <ShieldCheck className="mr-2 h-4 w-4 text-purple-500 group-hover:text-purple-400" />
                  <span className="font-mono">With CAPTCHA</span>
                  <Badge variant="outline" className="ml-auto font-mono border-purple-900 bg-purple-950/30 text-zinc-100">67</Badge>
                </Button>
                <Button 
                  variant="outline" 
                  className="w-full justify-start font-mono border-zinc-800 bg-black/40 hover:bg-black/60 hover:text-zinc-100 hover:border-zinc-700 group text-zinc-400" 
                  size="sm"
                >
                  <Shield className="mr-2 h-4 w-4 text-emerald-500 group-hover:text-emerald-400" />
                  <span className="font-mono">With MFA</span>
                  <Badge variant="outline" className="ml-auto font-mono border-emerald-900 bg-emerald-950/30 text-zinc-100">34</Badge>
                </Button>
              </div>
            </div>

            <Separator className="my-6 bg-zinc-800/50" />

            <div>
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-xl font-mono tracking-tight text-zinc-100">Applications</h2>
                <Badge variant="outline" className="font-mono text-xs border-zinc-800 bg-black/50 text-zinc-300">4 apps</Badge>
              </div>
              <div className="space-y-1.5">
                <Button 
                  variant="outline" 
                  className="w-full justify-start font-mono border-zinc-800 bg-black/40 hover:bg-black/60 hover:text-zinc-100 hover:border-zinc-700 group text-zinc-400" 
                  size="sm"
                >
                  <Globe className="mr-2 h-4 w-4 text-blue-500 group-hover:text-blue-400" />
                  <span className="font-mono">WordPress</span>
                  <Badge variant="outline" className="ml-auto font-mono border-zinc-800 bg-black/40 text-zinc-300">1.2k</Badge>
                </Button>
                <Button 
                  variant="outline" 
                  className="w-full justify-start font-mono border-zinc-800 bg-black/40 hover:bg-black/60 hover:text-zinc-100 hover:border-zinc-700 group text-zinc-400" 
                  size="sm"
                >
                  <Server className="mr-2 h-4 w-4 text-purple-500 group-hover:text-purple-400" />
                  <span className="font-mono">Citrix</span>
                  <Badge variant="outline" className="ml-auto font-mono border-zinc-800 bg-black/40 text-zinc-300">856</Badge>
                </Button>
                <Button 
                  variant="outline" 
                  className="w-full justify-start font-mono border-zinc-800 bg-black/40 hover:bg-black/60 hover:text-zinc-100 hover:border-zinc-700 group text-zinc-400" 
                  size="sm"
                >
                  <Network className="mr-2 h-4 w-4 text-emerald-500 group-hover:text-emerald-400" />
                  <span className="font-mono">RDWeb</span>
                  <Badge variant="outline" className="ml-auto font-mono border-zinc-800 bg-black/40 text-zinc-300">432</Badge>
                </Button>
                <Button 
                  variant="outline" 
                  className="w-full justify-start font-mono border-zinc-800 bg-black/40 hover:bg-black/60 hover:text-zinc-100 hover:border-zinc-700 group text-zinc-400" 
                  size="sm"
                >
                  <Shield className="mr-2 h-4 w-4 text-emerald-500 group-hover:text-emerald-400" />
                  <span className="font-mono">Cisco VPN</span>
                  <Badge variant="outline" className="ml-auto font-mono border-emerald-900 bg-emerald-950/30 text-zinc-100">67</Badge>
                </Button>
              </div>
            </div>

            <Separator className="my-6 bg-zinc-800/50" />

            <div>
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-xl font-mono tracking-tight text-zinc-100">Status</h2>
                <Badge variant="outline" className="font-mono text-xs border-zinc-800 bg-black/50 text-zinc-300">3 states</Badge>
              </div>
              <div className="space-y-1.5">
                <Button 
                  variant="outline" 
                  className="w-full justify-start font-mono border-zinc-800 bg-black/40 hover:bg-black/60 hover:text-zinc-100 hover:border-zinc-700 group text-zinc-400" 
                  size="sm"
                >
                  <CheckCircle2 className="mr-2 h-4 w-4 text-emerald-500 group-hover:text-emerald-400" />
                  <span className="font-mono">Active</span>
                  <Badge variant="outline" className="ml-auto font-mono border-zinc-800 bg-black/40 text-zinc-300">234</Badge>
                </Button>
                <Button 
                  variant="outline" 
                  className="w-full justify-start font-mono border-zinc-800 bg-black/40 hover:bg-black/60 hover:text-zinc-100 hover:border-zinc-700 group text-zinc-400" 
                  size="sm"
                >
                  <XCircle className="mr-2 h-4 w-4 text-blue-500 group-hover:text-blue-400" />
                  <span className="font-mono">Resolved</span>
                  <Badge variant="outline" className="ml-auto font-mono border-zinc-800 bg-black/40 text-zinc-300">156</Badge>
                </Button>
                <Button 
                  variant="outline" 
                  className="w-full justify-start font-mono border-zinc-800 bg-black/40 hover:bg-black/60 hover:text-zinc-100 hover:border-zinc-700 group text-zinc-400" 
                  size="sm"
                >
                  <Pause className="mr-2 h-4 w-4 text-amber-500 group-hover:text-amber-400" />
                  <span className="font-mono">Pending</span>
                  <Badge variant="outline" className="ml-auto font-mono border-zinc-800 bg-black/40 text-zinc-300">89</Badge>
                </Button>
              </div>
            </div>
          </div>
        </ScrollArea>
      </aside>

      <div className="flex-1 flex flex-col bg-zinc-950/50 backdrop-blur-sm">
        <Navbar 
          searchQuery={searchQuery}
          activeSearchType={activeSearchType}
          onSearchChange={(query) => {
            setSearchQuery(query);
            search(query, activeFilters);
          }}
          onSearchTypeChange={setActiveSearchType}
        />
        <main className="flex-1 container mx-auto py-6 px-8 max-w-7xl space-y-6">
          <BreachStats entries={entries} />

          <Card className="border-zinc-800 bg-black/20 backdrop-blur-sm text-zinc-100">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-4">
              <div>
                <CardTitle className="font-mono tracking-tight text-zinc-100">Real-time breach data analysis</CardTitle>
                <CardDescription className="font-mono text-zinc-400">
                  Analyze and enrich breach data in real-time
                </CardDescription>
              </div>
              <div className="flex items-center space-x-2">
                <Button 
                  variant="outline" 
                  size="sm" 
                  className="font-mono border-zinc-800 bg-black/40 hover:bg-black/60 hover:text-zinc-100 text-zinc-400"
                >
                  <FileDown className="mr-2 h-4 w-4" />
                  Export CSV
                </Button>
                <Sheet>
                  <AdvancedFilters
                    tempFilters={tempFilters}
                    onFilterChange={setTempFilters}
                    onApplyFilters={handleApplyFilters}
                    onResetFilters={handleResetFilters}
                  />
                </Sheet>
                <UploadDialog 
                  isUploading={isUploading}
                  progress={uploadProgress}
                />
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-4">
                  <div className="h-2 w-2 rounded-full bg-emerald-500 animate-pulse" />
                  <span className="text-sm font-mono text-zinc-400">Processing live breach data entries</span>
                </div>
                <span className="text-sm font-mono text-zinc-400">
                  {totalEntries.toLocaleString()} entries analyzed
                </span>
              </div>

              <div className="relative">
                <ScrollArea className="h-[600px] rounded-md border border-zinc-800">
                  <BreachTable entries={entries} />
                </ScrollArea>

                {hasMore && (
                  <div className="absolute bottom-0 left-0 right-0 flex justify-center py-4 bg-gradient-to-t from-black/40 to-transparent">
                    <Button
                      variant="outline"
                      onClick={loadMore}
                      disabled={isLoading}
                      className="font-mono border-zinc-800 bg-black/40 hover:bg-black/60 hover:text-zinc-100 text-zinc-400"
                    >
                      {isLoading ? "Loading..." : "Load More"}
                    </Button>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        </main>
      </div>
    </div>
  );
}
