"use client";

import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { BreachEntry } from "@/types";
import { CheckCircle2, XCircle, AlertTriangle, Shield } from "lucide-react";

interface BreachTableProps {
  entries: BreachEntry[];
}

export function BreachTable({ entries }: BreachTableProps) {
  const getStatusIcon = (status: number | undefined) => {
    if (!status) return <XCircle className="h-4 w-4 text-red-500" />;
    if (status === 200) return <CheckCircle2 className="h-4 w-4 text-emerald-500" />;
    return <AlertTriangle className="h-4 w-4 text-amber-500" />;
  };

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

  const getSecurityFeatures = (metadata: any) => {
    const features = [];
    if (metadata.hasCaptcha) features.push('CAPTCHA');
    if (metadata.hasMfa) features.push('MFA');
    if (metadata.isSecure) features.push('HTTPS');
    return features;
  };

  return (
    <Table>
      <TableHeader>
        <TableRow className="border-zinc-800">
          <TableHead className="font-mono text-zinc-400">Status</TableHead>
          <TableHead className="font-mono text-zinc-400">Domain</TableHead>
          <TableHead className="font-mono text-zinc-400">Service Type</TableHead>
          <TableHead className="font-mono text-zinc-400">Port</TableHead>
          <TableHead className="font-mono text-zinc-400">Path</TableHead>
          <TableHead className="font-mono text-zinc-400">Security</TableHead>
          <TableHead className="font-mono text-zinc-400">Tags</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {entries.map((entry) => {
          const url = new URL(entry.url);
          const securityFeatures = getSecurityFeatures(entry.metadata);
          
          return (
            <TableRow key={entry.id} className="border-zinc-800">
              <TableCell className="font-mono">
                {getStatusIcon(entry.metadata.status)}
              </TableCell>
              <TableCell className="font-mono text-zinc-300">
                {url.hostname}
              </TableCell>
              <TableCell className="font-mono">
                <Badge variant="outline" className="bg-black/40 border-zinc-700 text-zinc-300">
                  {getServiceType(entry.url)}
                </Badge>
              </TableCell>
              <TableCell className="font-mono text-zinc-400">
                {url.port || (url.protocol === 'https:' ? '443' : '80')}
              </TableCell>
              <TableCell className="font-mono text-zinc-400">
                {url.pathname === '/' ? '-' : url.pathname}
              </TableCell>
              <TableCell>
                <div className="flex gap-1">
                  {securityFeatures.map((feature) => (
                    <Badge 
                      key={`${entry.id}-${feature}`}
                      variant="outline" 
                      className="bg-emerald-950/30 border-emerald-800 text-emerald-400"
                    >
                      {feature}
                    </Badge>
                  ))}
                </div>
              </TableCell>
              <TableCell>
                <div className="flex gap-1 flex-wrap">
                  {entry.metadata.tags?.map((tag: string) => {
                    let className = "bg-black/40 border-zinc-700 text-zinc-300";
                    if (tag === 'unresolved') className = "bg-red-950/30 border-red-800 text-red-400";
                    if (tag === 'parked') className = "bg-amber-950/30 border-amber-800 text-amber-400";
                    if (tag === 'ransomed') className = "bg-purple-950/30 border-purple-800 text-purple-400";
                    
                    return (
                      <Badge 
                        key={`${entry.id}-${tag}`}
                        variant="outline" 
                        className={className}
                      >
                        {tag}
                      </Badge>
                    );
                  })}
                </div>
              </TableCell>
            </TableRow>
          );
        })}
      </TableBody>
    </Table>
  );
} 