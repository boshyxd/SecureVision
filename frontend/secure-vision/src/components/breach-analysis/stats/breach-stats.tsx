"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { BreachEntry } from "@/types";
import { AlertTriangle, Users, Globe, Braces } from "lucide-react";

interface BreachStatsProps {
  entries: BreachEntry[];
}

export function BreachStats({ entries }: BreachStatsProps) {
  const calculateStats = () => {
    const totalEntries = entries.length;
    const highRiskCount = entries.filter(e => e.risk_score >= 0.8).length;
    const uniqueDomains = new Set(entries.map(e => e.metadata.domain).filter(Boolean)).size;
    const patternCounts = entries.reduce((acc, entry) => {
      acc[entry.pattern_type] = (acc[entry.pattern_type] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);
    const mostCommonPattern = Object.entries(patternCounts)
      .sort(([,a], [,b]) => b - a)[0]?.[0] || "None";

    return {
      totalEntries,
      highRiskCount,
      uniqueDomains,
      mostCommonPattern,
    };
  };

  const stats = calculateStats();

  return (
    <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
      <Card className="border-zinc-800 bg-black/20 backdrop-blur-sm">
        <CardHeader className="flex flex-row items-center justify-between pb-2 space-y-0">
          <CardTitle className="text-sm font-mono text-zinc-300">Total Entries</CardTitle>
          <Users className="h-4 w-4 text-zinc-500" />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold font-mono text-zinc-100">{stats.totalEntries}</div>
          <p className="text-xs font-mono text-zinc-400">
            Breached accounts analyzed
          </p>
        </CardContent>
      </Card>
      <Card className="border-zinc-800 bg-black/20 backdrop-blur-sm">
        <CardHeader className="flex flex-row items-center justify-between pb-2 space-y-0">
          <CardTitle className="text-sm font-mono text-zinc-300">High Risk</CardTitle>
          <AlertTriangle className="h-4 w-4 text-red-500" />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold font-mono text-red-400">{stats.highRiskCount}</div>
          <p className="text-xs font-mono text-zinc-400">
            Entries with risk score ≥ 80%
          </p>
        </CardContent>
      </Card>
      <Card className="border-zinc-800 bg-black/20 backdrop-blur-sm">
        <CardHeader className="flex flex-row items-center justify-between pb-2 space-y-0">
          <CardTitle className="text-sm font-mono text-zinc-300">Unique Domains</CardTitle>
          <Globe className="h-4 w-4 text-blue-500" />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold font-mono text-zinc-100">{stats.uniqueDomains}</div>
          <p className="text-xs font-mono text-zinc-400">
            Distinct domains affected
          </p>
        </CardContent>
      </Card>
      <Card className="border-zinc-800 bg-black/20 backdrop-blur-sm">
        <CardHeader className="flex flex-row items-center justify-between pb-2 space-y-0">
          <CardTitle className="text-sm font-mono text-zinc-300">Common Pattern</CardTitle>
          <Braces className="h-4 w-4 text-purple-500" />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold font-mono text-zinc-100 capitalize">{stats.mostCommonPattern}</div>
          <p className="text-xs font-mono text-zinc-400">
            Most frequent password pattern
          </p>
        </CardContent>
      </Card>
    </div>
  );
} 