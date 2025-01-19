"use client";

import { Inter } from "next/font/google";
import "./globals.css";
import { Toaster } from "@/components/ui/toaster";
import { Sidebar, SidebarContent, SidebarProvider, SidebarTrigger } from "@/components/ui/sidebar";
import { BarChart2, Home, Search, Shield, Eye, Lock, Terminal, Settings, BookOpen, HelpCircle } from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { useState, useEffect } from "react";
import { Badge } from "@/components/ui/badge";
import { useBreachSearch } from "@/hooks/useBreachSearch";
import { useDebounce } from "@/hooks/useDebounce";
import { SearchFilters } from "@/types";
import { cn } from "@/lib/utils";

const inter = Inter({ subsets: ["latin"] });

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const pathname = usePathname();
  const [searchQuery, setSearchQuery] = useState("");
  const [activeSearchType, setActiveSearchType] = useState<'domain' | 'application' | 'port' | 'path'>('domain');
  const debouncedSearch = useDebounce(searchQuery, 300);
  const { search } = useBreachSearch();

  // Handle search when query or type changes
  useEffect(() => {
    if (debouncedSearch) {
      const filters: SearchFilters = {};
      
      // Set the appropriate filter based on search type
      switch (activeSearchType) {
        case 'domain':
          filters.domain = debouncedSearch;
          break;
        case 'application':
          filters.application = [debouncedSearch];
          break;
        case 'port':
          filters.port = parseInt(debouncedSearch) || undefined;
          break;
        case 'path':
          filters.urlPaths = [debouncedSearch];
          break;
      }

      search(debouncedSearch, filters);
    }
  }, [debouncedSearch, activeSearchType, search]);

  // Handle search type change
  useEffect(() => {
    if (searchQuery) {
      setSearchQuery(""); // Clear search when changing type
    }
  }, [activeSearchType]);

  return (
    <html lang="en" className="dark">
      <body className={cn("min-h-screen bg-black font-sans antialiased", inter.className)}>
        <SidebarProvider>
          <div className="relative flex min-h-screen">
            <Sidebar className="sticky top-0 h-screen border-r border-zinc-800 bg-black/95">
              <SidebarContent className="bg-black">
                <div className="flex flex-col items-center gap-2 mb-6 px-4 py-4">
                  <div className="relative w-12 h-12">
                    <div className="absolute inset-0 bg-emerald-500/10 rounded-lg animate-pulse" />
                    <div className="absolute inset-0 flex items-center justify-center">
                      <Eye className="h-8 w-8 text-emerald-500" strokeWidth={1.5} />
                    </div>
                    <div className="absolute -bottom-1 -right-1">
                      <Shield className="h-5 w-5 text-emerald-500" strokeWidth={1.5} />
                    </div>
                  </div>
                  <div className="text-center">
                    <h2 className="text-xl font-mono tracking-tight text-zinc-100 font-bold">
                      SecureVision
                    </h2>
                    <p className="text-xs font-mono text-zinc-500 tracking-wider">
                      BREACH ANALYSIS PLATFORM
                    </p>
                  </div>
                  <Badge variant="outline" className="bg-emerald-500/5 text-emerald-400 border-emerald-500/20 font-mono text-[10px]">
                    uOttaHacks 2025
                  </Badge>
                </div>
                <div className="space-y-4 px-3">
                  <div className="space-y-1">
                    <h3 className="px-3 text-xs font-mono font-medium text-zinc-500">Navigation</h3>
                    <Link
                      href="/"
                      className={`flex items-center rounded-lg px-3 py-2 text-sm font-mono transition-all hover:bg-emerald-500/5 ${
                        pathname === "/" ? "bg-emerald-500/10 text-emerald-400 hover:bg-emerald-500/15" : "text-zinc-400 hover:text-emerald-400"
                      }`}
                    >
                      <Terminal className="mr-2 h-4 w-4" />
                      Command Center
                    </Link>
                    <Link
                      href="/statistics"
                      className={`flex items-center rounded-lg px-3 py-2 text-sm font-mono transition-all hover:bg-emerald-500/5 ${
                        pathname === "/statistics" ? "bg-emerald-500/10 text-emerald-400 hover:bg-emerald-500/15" : "text-zinc-400 hover:text-emerald-400"
                      }`}
                    >
                      <BarChart2 className="mr-2 h-4 w-4" />
                      Intelligence
                    </Link>
                    <Link
                      href="/settings"
                      className={`flex items-center rounded-lg px-3 py-2 text-sm font-mono transition-all hover:bg-emerald-500/5 ${
                        pathname === "/settings" ? "bg-emerald-500/10 text-emerald-400 hover:bg-emerald-500/15" : "text-zinc-400 hover:text-emerald-400"
                      }`}
                    >
                      <Settings className="mr-2 h-4 w-4" />
                      Settings
                    </Link>
                  </div>
                  
                  <div className="space-y-1">
                    <h3 className="px-3 text-xs font-mono font-medium text-zinc-500">Resources</h3>
                    <Button
                      variant="ghost"
                      className="w-full justify-start font-mono text-zinc-400 hover:text-emerald-400 hover:bg-emerald-500/5"
                      onClick={() => window.open('https://haveibeenpwned.com', '_blank')}
                    >
                      <Shield className="mr-2 h-4 w-4" />
                      HIBP Database
                    </Button>
                    <Button
                      variant="ghost"
                      className="w-full justify-start font-mono text-zinc-400 hover:text-emerald-400 hover:bg-emerald-500/5"
                    >
                      <BookOpen className="mr-2 h-4 w-4" />
                      Documentation
                    </Button>
                    <Button
                      variant="ghost"
                      className="w-full justify-start font-mono text-zinc-400 hover:text-emerald-400 hover:bg-emerald-500/5"
                    >
                      <HelpCircle className="mr-2 h-4 w-4" />
                      Support
                    </Button>
                  </div>
                </div>
                <div className="absolute bottom-0 left-0 right-0 p-4 border-t border-zinc-800 bg-black">
                  <div className="flex items-center gap-2">
                    <div className="relative flex h-2 w-2">
                      <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-500 opacity-75"></span>
                      <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
                    </div>
                    <span className="font-mono text-xs text-zinc-400">All Systems Operational</span>
                  </div>
                </div>
              </SidebarContent>
            </Sidebar>
            <main className="flex-1 bg-black">
              <div className="sticky top-0 z-10 flex h-16 items-center gap-4 border-b border-zinc-800 bg-black px-6">
                <div className="relative flex-1 max-w-2xl">
                  <div className="relative group">
                    <div className="absolute inset-0 rounded-lg bg-emerald-500/5 group-hover:bg-emerald-500/10 transition-colors -m-0.5 pointer-events-none" />
                    <div className="absolute inset-0 rounded-lg border border-emerald-500/20 group-hover:border-emerald-500/30 transition-colors -m-0.5 pointer-events-none" />
                    <Search className="absolute left-3 top-2.5 h-4 w-4 text-emerald-500/50 group-hover:text-emerald-500/70 transition-colors pointer-events-none z-10" />
                    <Input
                      placeholder="Search by domain, IP, or application type..."
                      className="pl-9 pr-4 py-2 font-mono bg-black/60 border-transparent text-zinc-100 placeholder:text-zinc-500 focus-visible:ring-emerald-500/20 focus-visible:border-emerald-500/30 relative z-0"
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                    />
                  </div>
                </div>
                <div className="flex items-center space-x-1 bg-black/40 rounded-lg p-1 border border-zinc-800/50">
                  <Button
                    variant="ghost"
                    size="sm"
                    className={`font-mono px-3 rounded transition-all duration-200 ${
                      activeSearchType === 'domain' 
                        ? 'text-emerald-400 bg-emerald-500/10 shadow-[0_0_10px_rgba(16,185,129,0.1)] hover:bg-emerald-500/20' 
                        : 'text-zinc-400 hover:bg-black/60 hover:text-emerald-400'
                    }`}
                    onClick={() => setActiveSearchType('domain')}
                  >
                    Domain
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    className={`font-mono px-3 rounded transition-all duration-200 ${
                      activeSearchType === 'application' 
                        ? 'text-emerald-400 bg-emerald-500/10 shadow-[0_0_10px_rgba(16,185,129,0.1)] hover:bg-emerald-500/20' 
                        : 'text-zinc-400 hover:bg-black/60 hover:text-emerald-400'
                    }`}
                    onClick={() => setActiveSearchType('application')}
                  >
                    Application
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    className={`font-mono px-3 rounded transition-all duration-200 ${
                      activeSearchType === 'port' 
                        ? 'text-emerald-400 bg-emerald-500/10 shadow-[0_0_10px_rgba(16,185,129,0.1)] hover:bg-emerald-500/20' 
                        : 'text-zinc-400 hover:bg-black/60 hover:text-emerald-400'
                    }`}
                    onClick={() => setActiveSearchType('port')}
                  >
                    Port
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    className={`font-mono px-3 rounded transition-all duration-200 ${
                      activeSearchType === 'path' 
                        ? 'text-emerald-400 bg-emerald-500/10 shadow-[0_0_10px_rgba(16,185,129,0.1)] hover:bg-emerald-500/20' 
                        : 'text-zinc-400 hover:bg-black/60 hover:text-emerald-400'
                    }`}
                    onClick={() => setActiveSearchType('path')}
                  >
                    Path
                  </Button>
                </div>
              </div>
              {children}
            </main>
          </div>
        </SidebarProvider>
        <Toaster />
      </body>
    </html>
  );
}
