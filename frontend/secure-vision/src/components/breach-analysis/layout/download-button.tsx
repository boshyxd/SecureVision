import { Button } from "@/components/ui/button";
import { FileDown } from "lucide-react";
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

  return (
    <Button 
      variant="outline" 
      size="sm" 
      className="font-mono border-zinc-800 bg-black/40 hover:bg-black/60 hover:text-zinc-100 text-zinc-400 whitespace-nowrap"
      onClick={downloadCSV}
    >
      <FileDown className="mr-2 h-4 w-4" />
      Export CSV
    </Button>
  );
} 