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
import { CheckCircle2, XCircle, AlertTriangle, Shield, Info, Loader2 } from "lucide-react";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Button } from "@/components/ui/button";
import {
  HoverCard,
  HoverCardContent,
  HoverCardTrigger,
} from "@/components/ui/hover-card";
import { useCallback, useState } from "react";
import { RiskAnalysisDialog } from "../dialogs/risk-analysis-dialog";

export interface BreachTableProps {
  entries: BreachEntry[];
  isLoading?: boolean;
  hasMore?: boolean;
  onLoadMore?: () => void;
  onAssessRisk?: (entry: BreachEntry) => Promise<any>;
}

export function BreachTable({ entries, isLoading, hasMore, onLoadMore, onAssessRisk }: BreachTableProps) {
  const [selectedEntry, setSelectedEntry] = useState<BreachEntry | undefined>();
  const [isDialogOpen, setIsDialogOpen] = useState(false);

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

  const getBreachStatus = (entry: BreachEntry) => {
    const breachInfo = entry.metadata?.breach_info || {
      is_breached: false,
      total_breaches: 0,
      total_pwned: 0,
      latest_breach: null,
      data_classes: [],
      breaches: []
    };

    return (
      <div className="flex items-center gap-2">
        {breachInfo.is_breached ? (
          <>
            <AlertTriangle className="h-4 w-4 text-red-500" />
            <div className="flex flex-col">
              <span className="text-red-500 font-semibold">Breached</span>
              <span className="text-xs text-zinc-400">
                {breachInfo.total_breaches} breaches, {breachInfo.total_pwned?.toLocaleString()} accounts
              </span>
            </div>
          </>
        ) : (
          <>
            <Shield className="h-4 w-4 text-emerald-500" />
            <span className="text-emerald-500 font-semibold">No Known Breaches</span>
          </>
        )}
      </div>
    );
  };

  const handleAnalyzeRisk = async (entry: BreachEntry) => {
    setSelectedEntry(entry);
    setIsDialogOpen(true);
    if (onAssessRisk) {
      await onAssessRisk(entry);
    }
  };

  return (
    <div className="relative">
      <RiskAnalysisDialog
        open={isDialogOpen}
        onOpenChange={setIsDialogOpen}
        entry={selectedEntry}
        isAnalyzing={selectedEntry?.isAssessing || false}
      />
      <ScrollArea className="h-[600px] rounded-md border border-zinc-800">
        <table className="w-full">
          <thead>
            <tr className="border-b border-zinc-800 bg-black/40">
              <th className="h-12 px-4 text-left align-middle font-mono text-sm text-zinc-400">URL</th>
              <th className="h-12 px-4 text-left align-middle font-mono text-sm text-zinc-400">Breach Info</th>
              <th className="h-12 px-4 text-left align-middle font-mono text-sm text-zinc-400">Status</th>
              <th className="h-12 px-4 text-left align-middle font-mono text-sm text-zinc-400">Security</th>
              <th className="h-12 px-4 text-left align-middle font-mono text-sm text-zinc-400">Tags</th>
            </tr>
          </thead>
          <tbody>
            {entries.map((entry) => (
              <tr key={entry.id} className="border-b border-zinc-800/50">
                <td className="p-4 align-middle">
                  <HoverCard>
                    <HoverCardTrigger asChild>
                      <div className="flex flex-col cursor-pointer">
                        <div className="flex items-center gap-2">
                          <span className="font-mono text-sm text-zinc-100">{entry.url}</span>
                          <Info className="h-4 w-4 text-zinc-500" />
                        </div>
                        <span className="font-mono text-xs text-zinc-500">{entry.metadata.domain}</span>
                      </div>
                    </HoverCardTrigger>
                    <HoverCardContent className="w-80 bg-zinc-950 border-zinc-800">
                      <div className="space-y-3">
                        <div className="flex flex-col gap-2">
                          <h4 className="font-mono text-sm font-semibold text-zinc-200">Credentials</h4>
                          <div className="grid grid-cols-[100px_1fr] gap-1 text-xs">
                            <span className="font-mono text-zinc-400">Username:</span>
                            <span className="font-mono text-zinc-200">{entry.username}</span>
                            <span className="font-mono text-zinc-400">Password:</span>
                            <span className="font-mono text-zinc-200">{entry.password}</span>
                          </div>
                        </div>
                        <div className="flex flex-col gap-2">
                          <h4 className="font-mono text-sm font-semibold text-zinc-200">Network Info</h4>
                          <div className="grid grid-cols-[100px_1fr] gap-1 text-xs">
                            <span className="font-mono text-zinc-400">IP Address:</span>
                            <span className="font-mono text-zinc-200">{entry.metadata.ip_address || 'N/A'}</span>
                            <span className="font-mono text-zinc-400">Port:</span>
                            <span className="font-mono text-zinc-200">{entry.metadata.port || 'N/A'}</span>
                            <span className="font-mono text-zinc-400">Path:</span>
                            <span className="font-mono text-zinc-200">{entry.metadata.path || 'N/A'}</span>
                          </div>
                        </div>
                        {entry.metadata.breach_info?.is_breached && (
                          <div className="flex flex-col gap-2">
                            <h4 className="font-mono text-sm font-semibold text-red-400">Breach Details</h4>
                            <div className="grid grid-cols-[100px_1fr] gap-1 text-xs">
                              <span className="font-mono text-zinc-400">Data Types:</span>
                              <span className="font-mono text-zinc-200">
                                {entry.metadata.breach_info.data_classes?.join(', ') || 'N/A'}
                              </span>
                              <span className="font-mono text-zinc-400">Latest:</span>
                              <span className="font-mono text-zinc-200">
                                {entry.metadata.breach_info.latest_breach ? 
                                  new Date(entry.metadata.breach_info.latest_breach).toLocaleDateString() : 
                                  'N/A'}
                              </span>
                            </div>
                          </div>
                        )}
                        <div className="flex flex-col gap-2">
                          <h4 className="font-mono text-sm font-semibold text-zinc-200">Risk Assessment</h4>
                          <div className="text-xs font-mono">
                            {entry.risk_assessment ? (
                              <div className="space-y-2">
                                <div className="flex items-center justify-between">
                                  <span className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-mono ${
                                    entry.risk_assessment.risk_level === 'high' ? 'bg-red-950/30 text-red-400' :
                                    entry.risk_assessment.risk_level === 'medium' ? 'bg-amber-950/30 text-amber-400' :
                                    'bg-emerald-950/30 text-emerald-400'
                                  }`}>
                                    {entry.risk_assessment.risk_level.toUpperCase()} RISK
                                  </span>
                                  <span className="text-zinc-400">
                                    Score: {entry.risk_assessment.risk_score}/100
                                  </span>
                                </div>
                                <p className="text-zinc-400">{entry.risk_assessment.analysis}</p>
                                {entry.risk_assessment.factors && (
                                  <div className="space-y-1">
                                    <h5 className="font-semibold text-zinc-300">Risk Factors:</h5>
                                    {entry.risk_assessment.factors.map((factor, index) => (
                                      <div key={index} className="flex items-start gap-2">
                                        <span className={`inline-flex items-center rounded-full px-1.5 py-0.5 text-[10px] ${
                                          factor.impact === 'negative' ? 'bg-red-950/30 text-red-400' : 'bg-emerald-950/30 text-emerald-400'
                                        }`}>
                                          {factor.impact === 'negative' ? '-' : '+'}{factor.weight}
                                        </span>
                                        <div className="flex-1">
                                          <p className="text-zinc-300">{factor.name}</p>
                                          <p className="text-zinc-500 text-[10px]">{factor.description}</p>
                                        </div>
                                      </div>
                                    ))}
                                  </div>
                                )}
                                {entry.risk_assessment.recommendations && (
                                  <div className="space-y-1">
                                    <h5 className="font-semibold text-zinc-300">Recommendations:</h5>
                                    <ul className="list-disc list-inside space-y-0.5">
                                      {entry.risk_assessment.recommendations.map((rec, index) => (
                                        <li key={index} className="text-zinc-400">{rec}</li>
                                      ))}
                                    </ul>
                                  </div>
                                )}
                              </div>
                            ) : (
                              <Button 
                                variant="outline" 
                                size="sm" 
                                className="w-full"
                                onClick={() => handleAnalyzeRisk(entry)}
                              >
                                {entry.isAssessing ? (
                                  <>
                                    <Loader2 className="mr-2 h-3 w-3 animate-spin" />
                                    Analyzing...
                                  </>
                                ) : (
                                  'Analyze Risk'
                                )}
                              </Button>
                            )}
                          </div>
                        </div>
                      </div>
                    </HoverCardContent>
                  </HoverCard>
                </td>
                <td className="p-4 align-middle">
                  <div className="flex flex-col gap-1">
                    {(entry.enrichment_status === 'processing' && entry.current_enrichment_step === 'breach_check') || 
                     (entry.enrichment_status === 'pending' && !entry.metadata.breach_info) ? (
                      <span className="inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-mono bg-blue-950/30 text-blue-400">
                        Processing...
                      </span>
                    ) : entry.metadata.breach_info?.is_breached ? (
                      <>
                        <span className="inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-mono bg-red-950/30 text-red-400">
                          {entry.metadata.breach_info.total_breaches} Breaches
                        </span>
                        <span className="inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-mono bg-red-950/30 text-red-400">
                          {(entry.metadata.breach_info.total_pwned || 0).toLocaleString()} Passwords
                        </span>
                      </>
                    ) : (
                      <span className="inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-mono bg-emerald-950/30 text-emerald-400">
                        No breaches found
                      </span>
                    )}
                  </div>
                </td>
                <td className="p-4 align-middle">
                  <span className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-mono ${
                    entry.metadata.status === 200 ? 'bg-emerald-950/30 text-emerald-400' : 'bg-red-950/30 text-red-400'
                  }`}>
                    {entry.metadata.status === 200 ? 'Active' : 'Unreachable'}
                  </span>
                </td>
                <td className="p-4 align-middle">
                  <div className="flex gap-1">
                    {entry.metadata.isSecure && (
                      <span className="inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-mono bg-emerald-950/30 text-emerald-400">
                        HTTPS
                      </span>
                    )}
                    {entry.metadata.hasCaptcha && (
                      <span className="inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-mono bg-blue-950/30 text-blue-400">
                        CAPTCHA
                      </span>
                    )}
                    {entry.metadata.hasMfa && (
                      <span className="inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-mono bg-purple-950/30 text-purple-400">
                        MFA
                      </span>
                    )}
                  </div>
                </td>
                <td className="p-4 align-middle">
                  <div className="flex flex-wrap gap-1">
                    {entry.metadata.tags?.map((tag) => (
                      <span key={tag} className="inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-mono bg-zinc-800/50 text-zinc-400">
                        {tag}
                      </span>
                    ))}
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </ScrollArea>

      {hasMore && (
        <div className="absolute bottom-0 left-0 right-0 flex justify-center py-4 bg-gradient-to-t from-black/40 to-transparent">
          <Button
            variant="outline"
            onClick={onLoadMore}
            disabled={isLoading}
            className="font-mono border-zinc-800 bg-black/40 hover:bg-black/60 hover:text-zinc-100 text-zinc-400"
          >
            {isLoading ? "Loading..." : "Load More"}
          </Button>
        </div>
      )}
    </div>
  );
} 