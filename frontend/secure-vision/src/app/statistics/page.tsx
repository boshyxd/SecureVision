"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { BarChart, DonutChart } from "@tremor/react";
import { useBreachSearch } from "@/hooks/useBreachSearch";
import { useMemo } from "react";
import { BreachEntry } from "@/types";
import { Shield, Globe } from "lucide-react";

export default function StatisticsPage() {
  const { entries } = useBreachSearch();

  const stats = useMemo(() => {
    if (!entries) return null;

    const entriesArray = Array.from(entries.values()) as BreachEntry[];
    
    // Application distribution
    const appDistribution = new Map<string, number>();
    entriesArray.forEach(entry => {
      const app = entry.service_type || "Unknown";
      appDistribution.set(app, (appDistribution.get(app) || 0) + 1);
    });

    const appChartData = Array.from(appDistribution.entries())
      .sort((a, b) => b[1] - a[1]) // Sort by count descending
      .map(([name, value]) => ({
        name: name === "Unknown" ? "Other" : name,
        value
      }));

    // Security features distribution
    const securityData = [
      { name: "HTTPS Enabled", value: entriesArray.filter(e => e.isSecure).length },
      { name: "CAPTCHA Protected", value: entriesArray.filter(e => e.hasCaptcha).length },
      { name: "MFA Implemented", value: entriesArray.filter(e => e.hasMfa).length }
    ];

    // Calculate percentages for security features
    const totalEntries = entriesArray.length;
    const securityPercentages = securityData.map(item => ({
      ...item,
      percentage: Math.round((item.value / totalEntries) * 100)
    }));

    return {
      appChartData,
      securityPercentages,
      totalServices: totalEntries
    };
  }, [entries]);

  if (!stats) return null;

  return (
    <main className="container mx-auto p-6 space-y-8">
      <div className="flex items-center gap-3 mb-8">
        <h1 className="text-3xl font-bold text-zinc-100">Security Analytics</h1>
        <div className="text-zinc-400 text-sm font-mono">
          {stats.totalServices.toLocaleString()} services analyzed
        </div>
      </div>
      
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        <Card className="bg-black/20 border-zinc-800 backdrop-blur-sm">
          <CardHeader className="flex flex-row items-center gap-2">
            <Globe className="w-5 h-5 text-blue-400" />
            <CardTitle className="text-zinc-100">Application Distribution</CardTitle>
          </CardHeader>
          <CardContent>
            <DonutChart
              data={stats.appChartData}
              category="value"
              index="name"
              valueFormatter={(value) => `${value.toLocaleString()} services`}
              colors={["sky", "blue", "indigo", "violet", "purple", "cyan"]}
              className="h-80 mt-4"
              showAnimation={true}
              showTooltip={true}
              showLabel={true}
            />
          </CardContent>
        </Card>

        <Card className="bg-black/20 border-zinc-800 backdrop-blur-sm">
          <CardHeader className="flex flex-row items-center gap-2">
            <Shield className="w-5 h-5 text-emerald-400" />
            <CardTitle className="text-zinc-100">Security Implementation</CardTitle>
          </CardHeader>
          <CardContent>
            <BarChart
              data={stats.securityPercentages}
              index="name"
              categories={["value"]}
              colors={["emerald"]}
              valueFormatter={(value) => `${value.toLocaleString()} services`}
              className="h-80 mt-4"
              showAnimation={true}
              showLegend={false}
            />
            <div className="grid grid-cols-3 gap-4 mt-6">
              {stats.securityPercentages.map((feature) => (
                <div key={feature.name} className="text-center">
                  <div className="text-2xl font-bold text-zinc-100">{feature.percentage}%</div>
                  <div className="text-sm text-zinc-400 mt-1">{feature.name}</div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>
    </main>
  );
} 