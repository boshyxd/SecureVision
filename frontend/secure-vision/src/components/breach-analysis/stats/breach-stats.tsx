"use client";

import { useEffect, useState, useMemo } from 'react';
import { Card, CardContent } from "@/components/ui/card";
import { BreachEntry } from "@/types";
import { AlertTriangle, Globe, Network, Shield, Server, XCircle } from "lucide-react";

interface BreachStatsProps {
  entries: BreachEntry[];
}

interface Stats {
  criticalEndpoints: number;
  activeServices: number;
  exposedAdminPaths: number;
  vulnerableServices: number;
  unprotectedEndpoints: number;
  unreachableServices: number;
}

export function BreachStats({ entries }: BreachStatsProps) {
  // Calculate stats in real-time using useMemo
  const stats = useMemo(() => {
    const newStats = {
      criticalEndpoints: 0,
      activeServices: 0,
      exposedAdminPaths: 0,
      vulnerableServices: 0,
      unprotectedEndpoints: 0,
      unreachableServices: 0
    };

    entries.forEach(entry => {
      // Count active services (status code 200)
      if (entry.metadata?.status === 200) {
        newStats.activeServices++;
      }

      // Count unreachable services (no status code or non-200)
      if (!entry.metadata?.status || entry.metadata.status !== 200) {
        newStats.unreachableServices++;
      }

      // Count critical endpoints (has breaches or high risk score)
      if (entry.metadata?.breach_info?.is_breached || (entry.risk_score && entry.risk_score > 0.7)) {
        newStats.criticalEndpoints++;
      }

      // Count admin paths
      const lowercaseUrl = entry.url.toLowerCase();
      if (lowercaseUrl.includes('admin') || lowercaseUrl.includes('administrator') || 
          lowercaseUrl.includes('wp-admin') || lowercaseUrl.includes('dashboard')) {
        newStats.exposedAdminPaths++;
      }

      // Count vulnerable services (has breaches or no security features)
      if (entry.metadata?.breach_info?.is_breached || 
          (!entry.metadata?.hasCaptcha && !entry.metadata?.hasMfa && !entry.metadata?.isSecure)) {
        newStats.vulnerableServices++;
      }

      // Count unprotected endpoints (no security features)
      if (!entry.metadata?.hasCaptcha && !entry.metadata?.hasMfa && !entry.metadata?.isSecure) {
        newStats.unprotectedEndpoints++;
      }
    });

    return newStats;
  }, [entries]);

  return (
    <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
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