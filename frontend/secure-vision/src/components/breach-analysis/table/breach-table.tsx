"use client";

import { Badge } from "@/components/ui/badge";
import {
  HoverCard,
  HoverCardContent,
  HoverCardTrigger,
} from "@/components/ui/hover-card";
import { Progress } from "@/components/ui/progress";
import { BreachEntry } from "@/types";
import { AlertTriangle, Globe, Info, Shield, Lock } from "lucide-react";

interface BreachTableProps {
  entries: BreachEntry[];
}

export function BreachTable({ entries }: BreachTableProps) {
  const getRiskBadgeVariant = (score: number) => {
    if (score >= 0.8) return "destructive";
    if (score >= 0.5) return "secondary";
    return "outline";
  };

  const getTagColor = (tag: string) => {
    switch (tag.toLowerCase()) {
      case 'resolved': return 'border-emerald-800 bg-emerald-950/30 text-emerald-300';
      case 'active': return 'border-blue-800 bg-blue-950/30 text-blue-300';
      case 'login-form': return 'border-purple-800 bg-purple-950/30 text-purple-300';
      case 'captcha': return 'border-amber-800 bg-amber-950/30 text-amber-300';
      case 'mfa': return 'border-teal-800 bg-teal-950/30 text-teal-300';
      case 'parked': return 'border-zinc-800 bg-zinc-950/30 text-zinc-300';
      default: return 'border-zinc-800 bg-black/40 text-zinc-300';
    }
  };

  const formatTimeAgo = (date: string) => {
    const now = new Date();
    const past = new Date(date);
    const diffInSeconds = Math.floor((now.getTime() - past.getTime()) / 1000);
    
    if (diffInSeconds < 60) return 'just now';
    if (diffInSeconds < 3600) return `${Math.floor(diffInSeconds / 60)}m ago`;
    if (diffInSeconds < 86400) return `${Math.floor(diffInSeconds / 3600)}h ago`;
    return `${Math.floor(diffInSeconds / 86400)}d ago`;
  };

  return (
    <div className="w-full">
      <div className="grid grid-cols-4 gap-4 border-b border-zinc-800 p-4 text-xs font-mono sticky top-0 bg-black/60 backdrop-blur-sm">
        <div className="text-zinc-300">URL & Domain Info</div>
        <div className="text-zinc-300">Security Analysis</div>
        <div className="text-zinc-300">Access Details</div>
        <div className="text-zinc-300">Risk Assessment</div>
      </div>
      <div className="divide-y divide-zinc-800">
        {entries.map((entry) => (
          <div
            key={entry.id}
            className="grid grid-cols-4 gap-4 p-4 hover:bg-black/40 text-zinc-100 group"
          >
            <div>
              <HoverCard>
                <HoverCardTrigger className="cursor-default">
                  <div className="flex items-start gap-2">
                    <Globe className="h-4 w-4 mt-0.5 text-blue-400 group-hover:text-blue-300" />
                    <div>
                      <div className="font-mono text-sm text-blue-400 hover:text-blue-300 hover:underline cursor-pointer group-hover:text-blue-300">
                        {entry.url}
                      </div>
                      <div className="text-xs font-mono text-zinc-400 mt-1 group-hover:text-zinc-300">
                        {entry.metadata.domain}
                      </div>
                    </div>
                  </div>
                </HoverCardTrigger>
                <HoverCardContent className="w-80 bg-zinc-950/90 border-zinc-800 backdrop-blur-sm">
                  <div className="space-y-3">
                    <div className="flex items-center gap-2">
                      <Shield className="h-4 w-4 text-blue-400" />
                      <div className="text-sm font-mono text-zinc-100">Domain Analysis</div>
                    </div>
                    <div className="text-xs space-y-1.5 font-mono">
                      <div className="flex items-center justify-between text-zinc-400">
                        <span>IP Address</span>
                        <span className="text-zinc-100 bg-zinc-900/50 px-1.5 py-0.5 rounded">
                          {entry.metadata.ip_address || "N/A"}
                        </span>
                      </div>
                      <div className="flex items-center justify-between text-zinc-400">
                        <span>Port</span>
                        <span className="text-zinc-100 bg-zinc-900/50 px-1.5 py-0.5 rounded">
                          {entry.metadata.port || "N/A"}
                        </span>
                      </div>
                      <div className="flex items-center justify-between text-zinc-400">
                        <span>Last Check</span>
                        <span className="text-zinc-100 bg-zinc-900/50 px-1.5 py-0.5 rounded">
                          {formatTimeAgo(entry.last_analyzed)}
                        </span>
                      </div>
                      <div className="flex items-center justify-between text-zinc-400">
                        <span>Status</span>
                        <Badge variant="outline" className="font-mono text-[10px] border-zinc-800 bg-black/40 text-zinc-300">
                          {entry.metadata.status || "Unknown"}
                        </Badge>
                      </div>
                      <div className="flex items-center justify-between text-zinc-400">
                        <span>Page Title</span>
                        <span className="text-zinc-100 bg-zinc-900/50 px-1.5 py-0.5 rounded max-w-[200px] truncate">
                          {entry.metadata.page_title || "N/A"}
                        </span>
                      </div>
                    </div>
                  </div>
                </HoverCardContent>
              </HoverCard>
            </div>
            <div>
              <div className="flex items-center gap-2">
                <Info className="h-4 w-4 text-purple-400 group-hover:text-purple-300" />
                <div className="text-sm font-mono text-zinc-100 group-hover:text-white">
                  {entry.pattern_type}
                </div>
              </div>
              <div className="flex flex-wrap gap-1.5 mt-1.5">
                {entry.metadata.tags?.map((tag, index) => (
                  <Badge
                    key={`${entry.id}-${tag}-${index}`}
                    variant="outline"
                    className={`font-mono text-[10px] ${getTagColor(tag)}`}
                  >
                    {tag}
                  </Badge>
                ))}
              </div>
            </div>
            <div>
              <div className="flex items-center gap-2">
                <Lock className="h-4 w-4 text-teal-400 group-hover:text-teal-300" />
                <div className="text-sm font-mono text-zinc-100 group-hover:text-white">
                  {entry.username}
                </div>
              </div>
              <div className="text-xs font-mono text-zinc-400 mt-1.5 group-hover:text-zinc-300">
                Last seen {formatTimeAgo(entry.last_analyzed)}
              </div>
            </div>
            <div>
              <div className="flex items-center gap-2">
                <AlertTriangle
                  className={`h-4 w-4 ${
                    entry.risk_score >= 0.8
                      ? "text-red-400 group-hover:text-red-300"
                      : entry.risk_score >= 0.5
                      ? "text-amber-400 group-hover:text-amber-300"
                      : "text-emerald-400 group-hover:text-emerald-300"
                  }`}
                />
                <div className="text-sm font-mono text-zinc-100 group-hover:text-white">
                  {(entry.risk_score * 100).toFixed(0)}% Risk
                </div>
              </div>
              <div className="mt-2 p-0.5 rounded bg-zinc-900/50">
                <Progress value={entry.risk_score * 100} className="h-1.5 bg-zinc-900">
                  <div
                    className={`h-1.5 transition-all rounded-full ${
                      entry.risk_score >= 0.8
                        ? "bg-gradient-to-r from-red-400 to-red-500 shadow-[0_0_8px_rgba(239,68,68,0.3)]"
                        : entry.risk_score >= 0.5
                        ? "bg-gradient-to-r from-amber-400 to-amber-500 shadow-[0_0_8px_rgba(245,158,11,0.3)]"
                        : "bg-gradient-to-r from-emerald-400 to-emerald-500 shadow-[0_0_8px_rgba(16,185,129,0.3)]"
                    }`}
                    style={{ width: `${entry.risk_score * 100}%` }}
                  />
                </Progress>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
} 