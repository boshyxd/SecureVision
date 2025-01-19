"use client";

import { Card, CardContent } from "@/components/ui/card";
import { BreachEntry } from "@/types";
import { AlertTriangle, Globe, Network, Shield, Server, XCircle } from "lucide-react";

interface BreachStatsProps {
  entries: BreachEntry[];
}

export function BreachStats({ entries }: BreachStatsProps) {
  const stats = {
    criticalEndpoints: 2134,
    activeServices: 15678,
    exposedAdminPaths: 432,
    vulnerableServices: 867,
    unprotectedEndpoints: 1243,
    unreachableServices: 342
  };

  return (
    <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
      <Card className="border-zinc-800 bg-black/20 backdrop-blur-sm">
        <CardContent className="p-6">
          <div className="flex items-center gap-4">
            <AlertTriangle className="h-8 w-8 text-red-500" />
            <div>
              <p className="text-sm font-mono text-zinc-400">Critical Endpoints</p>
              <p className="text-2xl font-mono font-bold text-zinc-100">{stats.criticalEndpoints.toLocaleString()}</p>
            </div>
          </div>
        </CardContent>
      </Card>
      
      <Card className="border-zinc-800 bg-black/20 backdrop-blur-sm">
        <CardContent className="p-6">
          <div className="flex items-center gap-4">
            <Globe className="h-8 w-8 text-emerald-500" />
            <div>
              <p className="text-sm font-mono text-zinc-400">Active Services</p>
              <p className="text-2xl font-mono font-bold text-zinc-100">{stats.activeServices.toLocaleString()}</p>
            </div>
          </div>
        </CardContent>
      </Card>

      <Card className="border-zinc-800 bg-black/20 backdrop-blur-sm">
        <CardContent className="p-6">
          <div className="flex items-center gap-4">
            <Server className="h-8 w-8 text-purple-500" />
            <div>
              <p className="text-sm font-mono text-zinc-400">Admin Paths</p>
              <p className="text-2xl font-mono font-bold text-zinc-100">{stats.exposedAdminPaths.toLocaleString()}</p>
            </div>
          </div>
        </CardContent>
      </Card>

      <Card className="border-zinc-800 bg-black/20 backdrop-blur-sm">
        <CardContent className="p-6">
          <div className="flex items-center gap-4">
            <Network className="h-8 w-8 text-blue-500" />
            <div>
              <p className="text-sm font-mono text-zinc-400">Vulnerable Services</p>
              <p className="text-2xl font-mono font-bold text-zinc-100">{stats.vulnerableServices.toLocaleString()}</p>
            </div>
          </div>
        </CardContent>
      </Card>

      <Card className="border-zinc-800 bg-black/20 backdrop-blur-sm">
        <CardContent className="p-6">
          <div className="flex items-center gap-4">
            <Shield className="h-8 w-8 text-amber-500" />
            <div>
              <p className="text-sm font-mono text-zinc-400">Unprotected Endpoints</p>
              <p className="text-2xl font-mono font-bold text-zinc-100">{stats.unprotectedEndpoints.toLocaleString()}</p>
            </div>
          </div>
        </CardContent>
      </Card>

      <Card className="border-zinc-800 bg-black/20 backdrop-blur-sm">
        <CardContent className="p-6">
          <div className="flex items-center gap-4">
            <XCircle className="h-8 w-8 text-zinc-500" />
            <div>
              <p className="text-sm font-mono text-zinc-400">Unreachable Services</p>
              <p className="text-2xl font-mono font-bold text-zinc-100">{stats.unreachableServices.toLocaleString()}</p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
} 