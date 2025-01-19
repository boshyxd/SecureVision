"use client";

import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Download } from "lucide-react";
import { BreachEntry } from "@/types";

interface DownloadButtonProps {
  entries: BreachEntry[];
}

export function DownloadButton({ entries }: DownloadButtonProps) {
  const downloadCSV = () => {
    const headers = [
      "URL",
      "Username",
      "Password",
      "Domain",
      "IP Address",
      "Port",
      "Risk Score",
      "Pattern Type",
      "Service Type",
      "Status",
      "Has CAPTCHA",
      "Has MFA",
      "Is Secure",
      "Tags",
    ];

    const rows = entries.map((entry) => [
      entry.url,
      entry.username,
      entry.password,
      entry.metadata.domain,
      entry.metadata.ip_address,
      entry.metadata.port,
      entry.risk_score,
      entry.pattern_type,
      entry.metadata.service_type,
      entry.metadata.status,
      entry.metadata.hasCaptcha ? "Yes" : "No",
      entry.metadata.hasMfa ? "Yes" : "No",
      entry.metadata.isSecure ? "Yes" : "No",
      entry.metadata.tags?.join(", "),
    ]);

    const csvContent = [
      headers.join(","),
      ...rows.map((row) => row.map((cell) => `"${cell || ""}"`).join(",")),
    ].join("\n");

    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
    const link = document.createElement("a");
    link.href = URL.createObjectURL(blob);
    link.setAttribute("download", `breach_data_${new Date().toISOString()}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const downloadJSON = () => {
    const jsonContent = JSON.stringify(entries, null, 2);
    const blob = new Blob([jsonContent], { type: "application/json" });
    const link = document.createElement("a");
    link.href = URL.createObjectURL(blob);
    link.setAttribute("download", `breach_data_${new Date().toISOString()}.json`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const downloadTXT = () => {
    const txtContent = entries
      .map((entry) => `${entry.url}:${entry.username}:${entry.password}`)
      .join("\n");
    const blob = new Blob([txtContent], { type: "text/plain" });
    const link = document.createElement("a");
    link.href = URL.createObjectURL(blob);
    link.setAttribute("download", `breach_data_${new Date().toISOString()}.txt`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          variant="outline"
          size="sm"
          className="font-mono border-zinc-800 bg-black/40 hover:bg-black/60 hover:text-zinc-100 text-zinc-400"
        >
          <Download className="mr-2 h-4 w-4" />
          Download
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent className="bg-zinc-950 border-zinc-800">
        <DropdownMenuItem
          onClick={downloadCSV}
          className="font-mono text-zinc-400 hover:text-zinc-100 cursor-pointer"
        >
          Download as CSV
        </DropdownMenuItem>
        <DropdownMenuItem
          onClick={downloadJSON}
          className="font-mono text-zinc-400 hover:text-zinc-100 cursor-pointer"
        >
          Download as JSON
        </DropdownMenuItem>
        <DropdownMenuItem
          onClick={downloadTXT}
          className="font-mono text-zinc-400 hover:text-zinc-100 cursor-pointer"
        >
          Download as TXT
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
} 