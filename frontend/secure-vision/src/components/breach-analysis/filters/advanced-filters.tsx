"use client";

import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import { SlidersHorizontal } from "lucide-react";
import { Switch } from "@/components/ui/switch";
import { SearchFilters } from "@/types";

interface AdvancedFiltersProps {
  tempFilters: SearchFilters;
  onFilterChange: (filters: SearchFilters) => void;
  onApplyFilters: () => void;
  onResetFilters: () => void;
}

export function AdvancedFilters({ 
  tempFilters,
  onFilterChange,
  onApplyFilters,
  onResetFilters 
}: AdvancedFiltersProps) {
  return (
    <Dialog>
      <DialogTrigger asChild>
        <Button variant="outline" size="icon" className="border-zinc-800 bg-black/40 hover:bg-black/60 hover:text-zinc-100 text-zinc-400">
          <SlidersHorizontal className="h-4 w-4 text-zinc-400" />
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-[425px] bg-zinc-950 border-zinc-800">
        <DialogHeader>
          <DialogTitle className="font-mono text-zinc-100">Advanced Filters</DialogTitle>
          <DialogDescription className="font-mono text-zinc-400">
            Configure advanced search filters and exclusions.
          </DialogDescription>
        </DialogHeader>
        <div className="grid gap-4 py-4">
          <div className="space-y-4">
            <div>
              <Label className="text-xs font-mono text-zinc-300">IP Range Exclusions</Label>
              <Input 
                placeholder="e.g., 192.168.0.0/16, 127.0.0.1" 
                className="font-mono bg-black/40 border-zinc-800 text-zinc-100 placeholder:text-zinc-500"
              />
            </div>
            <div>
              <Label className="text-xs font-mono text-zinc-300">Application Types</Label>
              <Input 
                placeholder="e.g., wordpress, citrix, rdweb" 
                className="font-mono bg-black/40 border-zinc-800 text-zinc-100 placeholder:text-zinc-500"
              />
            </div>
            <Separator className="bg-zinc-800/50" />
            <div className="space-y-4">
              <Label className="text-xs font-mono text-zinc-300">Tag Filters</Label>
              <div className="flex items-center justify-between">
                <Label className="text-sm font-mono text-zinc-400" htmlFor="resolved">
                  Show Resolved
                </Label>
                <Switch id="resolved" />
              </div>
              <div className="flex items-center justify-between">
                <Label className="text-sm font-mono text-zinc-400" htmlFor="local-ip">
                  Exclude Local IPs
                </Label>
                <Switch id="local-ip" />
              </div>
              <div className="flex items-center justify-between">
                <Label className="text-sm font-mono text-zinc-400" htmlFor="parked">
                  Show Parked Domains
                </Label>
                <Switch id="parked" />
              </div>
              <div className="flex items-center justify-between">
                <Label className="text-sm font-mono text-zinc-400" htmlFor="active">
                  Active URLs Only
                </Label>
                <Switch id="active" />
              </div>
            </div>
          </div>
          <div className="flex justify-end gap-2">
            <Button 
              variant="outline" 
              onClick={onResetFilters}
              className="font-mono border-zinc-800 bg-black/40 hover:bg-black/60 hover:text-zinc-100 text-zinc-400"
            >
              Reset
            </Button>
            <Button 
              onClick={onApplyFilters}
              className="font-mono bg-blue-600 hover:bg-blue-700 text-zinc-100"
            >
              Apply Filters
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
} 