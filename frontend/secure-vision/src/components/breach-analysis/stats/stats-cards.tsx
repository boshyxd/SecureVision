import React from "react";
import { Network } from "lucide-react";
import { BreachEntry } from "@/types";

interface StatsCardsProps {
  entries: BreachEntry[];
}

interface ServiceCount {
  name: string;
  count: number;
}

interface ServiceCounts {
  [key: string]: number;
}

export function StatsCard({
  title,
  value,
  description,
  icon,
}: {
  title: string;
  value: string;
  description: string;
  icon: React.ReactNode;
}) {
  return (
    <div className="rounded-lg border border-zinc-800 bg-black/40 p-4">
      <div className="flex items-center gap-2">
        {icon}
        <h3 className="font-mono text-sm font-medium text-zinc-200">{title}</h3>
      </div>
      <p className="mt-2 font-mono text-2xl font-bold text-zinc-100">{value}</p>
      <p className="mt-1 font-mono text-xs text-zinc-400">{description}</p>
    </div>
  );
}

export function StatsCards({ entries }: StatsCardsProps) {
  const getServiceType = (url: string) => {
    const lowercaseUrl = url.toLowerCase();
    if (lowercaseUrl.includes('rdweb')) return 'RD Web Access';
    if (lowercaseUrl.includes('citrix')) return 'Citrix';
    if (lowercaseUrl.includes('wp-login')) return 'WordPress';
    if (lowercaseUrl.includes('cisco')) return 'Cisco';
    if (lowercaseUrl.includes('coremail')) return 'Coremail';
    if (lowercaseUrl.includes('admin') || lowercaseUrl.includes('administrator')) return 'Admin Portal';
    return 'Standard Login';
  };

  const getActiveServices = (): ServiceCount[] => {
    const services = entries
      .filter(entry => entry.metadata.status === 200)
      .reduce((acc: ServiceCounts, entry: BreachEntry) => {
        const serviceType = getServiceType(entry.url);
        acc[serviceType] = (acc[serviceType] || 0) + 1;
        return acc;
      }, {});

    return Object.entries(services)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 3)
      .map(([name, count]) => ({ name, count }));
  };

  const activeServices = getActiveServices();
  
  return (
    <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
      <StatsCard
        title="Active Services"
        value={activeServices.map(service => 
          `${service.name}: ${service.count}`
        ).join(', ')}
        description="Most common active service types"
        icon={<Network className="h-4 w-4 text-zinc-500" />}
      />
      {/* Add other stats cards here */}
    </div>
  );
} 