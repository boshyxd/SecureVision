"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { BarChart, LineChart, DonutChart } from "@tremor/react";
import { useBreachSearch } from "@/hooks/useBreachSearch";
import { useMemo } from "react";
import { BreachEntry } from "@/types";

export default function StatisticsPage() {
  const { entries } = useBreachSearch();

  const stats = useMemo(() => {
    if (!entries) return null;

    const entriesArray = Array.from(entries.values()) as BreachEntry[];
    
    // Risk score distribution
    const riskScoreData = Array(10).fill(0);
    entriesArray.forEach(entry => {
      const score = Math.floor(entry.risk_score / 10);
      if (score >= 0 && score < 10) riskScoreData[score]++;
    });

    const riskScoreChartData = riskScoreData.map((count, i) => ({
      score: `${i * 10}-${(i + 1) * 10}`,
      count
    }));

    // Application distribution
    const appDistribution = new Map<string, number>();
    entriesArray.forEach(entry => {
      const app = entry.service_type || "Unknown";
      appDistribution.set(app, (appDistribution.get(app) || 0) + 1);
    });

    const appChartData = Array.from(appDistribution.entries()).map(([name, value]) => ({
      name,
      value
    }));

    // Security features distribution
    const securityData = [
      { name: "HTTPS", value: entriesArray.filter(e => e.isSecure).length },
      { name: "CAPTCHA", value: entriesArray.filter(e => e.hasCaptcha).length },
      { name: "MFA", value: entriesArray.filter(e => e.hasMfa).length }
    ];

    // Timeline data (last 30 days)
    const timelineData = Array(30).fill(0).map((_, i) => {
      const date = new Date();
      date.setDate(date.getDate() - i);
      return {
        date: date.toISOString().split('T')[0],
        breaches: 0
      };
    }).reverse();

    entriesArray.forEach(entry => {
      if (!entry.latest_breach) return;
      const breachDate = new Date(entry.latest_breach).toISOString().split('T')[0];
      const dataPoint = timelineData.find(d => d.date === breachDate);
      if (dataPoint) dataPoint.breaches++;
    });

    return {
      riskScoreChartData,
      appChartData,
      securityData,
      timelineData
    };
  }, [entries]);

  if (!stats) return null;

  return (
    <main className="container mx-auto py-6 px-8 max-w-7xl space-y-6">
      <h1 className="text-2xl font-mono tracking-tight text-zinc-100 mb-6">Breach Statistics</h1>
      
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <Card className="border-zinc-800 bg-black/20 backdrop-blur-sm text-zinc-100">
          <CardHeader>
            <CardTitle className="font-mono text-lg">Risk Score Distribution</CardTitle>
          </CardHeader>
          <CardContent>
            <BarChart
              data={stats.riskScoreChartData}
              index="score"
              categories={["count"]}
              colors={["blue"]}
              showLegend={false}
              className="h-64"
            />
          </CardContent>
        </Card>

        <Card className="border-zinc-800 bg-black/20 backdrop-blur-sm text-zinc-100">
          <CardHeader>
            <CardTitle className="font-mono text-lg">Application Distribution</CardTitle>
          </CardHeader>
          <CardContent>
            <DonutChart
              data={stats.appChartData}
              index="name"
              category="value"
              colors={["blue", "cyan", "indigo", "violet", "purple"]}
              className="h-64"
            />
          </CardContent>
        </Card>

        <Card className="border-zinc-800 bg-black/20 backdrop-blur-sm text-zinc-100">
          <CardHeader>
            <CardTitle className="font-mono text-lg">Security Features</CardTitle>
          </CardHeader>
          <CardContent>
            <BarChart
              data={stats.securityData}
              index="name"
              categories={["value"]}
              colors={["green"]}
              showLegend={false}
              className="h-64"
            />
          </CardContent>
        </Card>

        <Card className="border-zinc-800 bg-black/20 backdrop-blur-sm text-zinc-100">
          <CardHeader>
            <CardTitle className="font-mono text-lg">Breach Timeline (30 Days)</CardTitle>
          </CardHeader>
          <CardContent>
            <LineChart
              data={stats.timelineData}
              index="date"
              categories={["breaches"]}
              colors={["red"]}
              showLegend={false}
              className="h-64"
            />
          </CardContent>
        </Card>
      </div>
    </main>
  );
} 