import React from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { BreachEntry } from "@/types";
import { Bot, Shield, AlertTriangle, CheckCircle } from "lucide-react";
import { ScrollArea } from "@/components/ui/scroll-area";

interface RiskAnalysisDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  entry?: BreachEntry;
  isAnalyzing: boolean;
}

export function RiskAnalysisDialog({
  open,
  onOpenChange,
  entry,
  isAnalyzing,
}: RiskAnalysisDialogProps) {
  if (!entry) return null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl bg-black border-zinc-800">
        <DialogHeader>
          <DialogTitle className="font-mono text-lg flex items-center gap-2">
            <Bot className="h-5 w-5 text-emerald-500" />
            Risk Analysis
          </DialogTitle>
          <DialogDescription className="font-mono text-zinc-400">
            Powered by Groq LLaMA 3.3
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-4">
          <div className="rounded-lg border border-zinc-800 bg-zinc-950/50 p-4">
            <h3 className="font-mono text-sm font-medium text-zinc-200 mb-2">Target Information</h3>
            <div className="grid grid-cols-[100px_1fr] gap-1 text-xs font-mono">
              <span className="text-zinc-400">URL:</span>
              <span className="text-zinc-200">{entry.url}</span>
              <span className="text-zinc-400">Username:</span>
              <span className="text-zinc-200">{entry.username}</span>
              <span className="text-zinc-400">Password:</span>
              <span className="text-zinc-200">{entry.password}</span>
            </div>
          </div>

          {isAnalyzing ? (
            <div className="flex flex-col items-center justify-center py-8 text-zinc-400">
              <Bot className="h-8 w-8 mb-4 animate-pulse" />
              <p className="text-sm font-mono">Analyzing security risks...</p>
            </div>
          ) : entry.risk_assessment ? (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  {entry.risk_assessment.risk_level === 'high' ? (
                    <AlertTriangle className="h-5 w-5 text-red-500" />
                  ) : entry.risk_assessment.risk_level === 'medium' ? (
                    <AlertTriangle className="h-5 w-5 text-amber-500" />
                  ) : (
                    <CheckCircle className="h-5 w-5 text-emerald-500" />
                  )}
                  <span className={`font-mono text-sm font-medium ${
                    entry.risk_assessment.risk_level === 'high' ? 'text-red-400' :
                    entry.risk_assessment.risk_level === 'medium' ? 'text-amber-400' :
                    'text-emerald-400'
                  }`}>
                    {entry.risk_assessment.risk_level.toUpperCase()} RISK
                  </span>
                </div>
                <span className="font-mono text-sm text-zinc-400">
                  Risk Score: {entry.risk_assessment.risk_score}/100
                </span>
              </div>

              <div className="rounded-lg border border-zinc-800 bg-zinc-950/50 p-4">
                <h3 className="font-mono text-sm font-medium text-zinc-200 mb-2">Analysis</h3>
                <p className="text-sm font-mono text-zinc-400 whitespace-pre-wrap">
                  {entry.risk_assessment.analysis}
                </p>
              </div>

              <ScrollArea className="h-[200px] rounded-lg border border-zinc-800 bg-zinc-950/50 p-4">
                <h3 className="font-mono text-sm font-medium text-zinc-200 mb-2">Risk Factors</h3>
                <div className="space-y-2">
                  {entry.risk_assessment.factors?.map((factor, index) => (
                    <div key={index} className="flex items-start gap-2">
                      <span className={`inline-flex items-center rounded-full px-1.5 py-0.5 text-[10px] font-mono ${
                        factor.impact === 'negative' ? 'bg-red-950/30 text-red-400' : 'bg-emerald-950/30 text-emerald-400'
                      }`}>
                        {factor.impact === 'negative' ? '-' : '+'}{factor.weight}
                      </span>
                      <div className="flex-1">
                        <p className="text-sm font-mono text-zinc-200">{factor.name}</p>
                        <p className="text-xs font-mono text-zinc-500">{factor.description}</p>
                      </div>
                    </div>
                  ))}
                </div>
              </ScrollArea>

              {entry.risk_assessment.recommendations && (
                <div className="rounded-lg border border-zinc-800 bg-zinc-950/50 p-4">
                  <h3 className="font-mono text-sm font-medium text-zinc-200 mb-2">Recommendations</h3>
                  <ul className="list-disc list-inside space-y-1">
                    {entry.risk_assessment.recommendations.map((rec, index) => (
                      <li key={index} className="text-sm font-mono text-zinc-400">
                        {rec}
                      </li>
                    ))}
                  </ul>
                </div>
              )}
            </div>
          ) : null}
        </div>
      </DialogContent>
    </Dialog>
  );
} 