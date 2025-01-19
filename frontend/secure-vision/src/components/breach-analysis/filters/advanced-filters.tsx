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
import { ScrollArea } from "@/components/ui/scroll-area";

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
  const handleFilterChange = (key: keyof SearchFilters, value: any) => {
    onFilterChange({
      ...tempFilters,
      [key]: value
    });
  };

  return (
    <Dialog>
      <DialogTrigger asChild>
        <Button variant="outline" size="icon" className="border-zinc-800 bg-black/40 hover:bg-black/60 hover:text-zinc-100 text-zinc-400">
          <SlidersHorizontal className="h-4 w-4 text-zinc-400" />
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-[400px] h-[80vh] p-0 bg-zinc-950 border-zinc-800">
        <DialogHeader className="p-6 pb-0">
          <DialogTitle className="font-mono text-zinc-100">Advanced Filters</DialogTitle>
          <DialogDescription className="font-mono text-zinc-400">
            Configure advanced search filters and exclusions.
          </DialogDescription>
        </DialogHeader>
        <ScrollArea className="flex-1 h-[calc(80vh-8rem)] px-6 py-4">
          <div className="space-y-4">
            <div>
              <Label className="text-xs font-mono text-zinc-300">Domain Filter</Label>
              <Input 
                value={tempFilters.domain || ''}
                onChange={(e) => handleFilterChange('domain', e.target.value)}
                placeholder="e.g., example.com" 
                className="font-mono bg-black/40 border-zinc-800 text-zinc-100 placeholder:text-zinc-500"
              />
            </div>
            <div>
              <Label className="text-xs font-mono text-zinc-300">Port Filter</Label>
              <Input 
                value={tempFilters.port || ''}
                onChange={(e) => handleFilterChange('port', e.target.value ? parseInt(e.target.value) : undefined)}
                type="number"
                placeholder="e.g., 443" 
                className="font-mono bg-black/40 border-zinc-800 text-zinc-100 placeholder:text-zinc-500"
              />
            </div>
            <div>
              <Label className="text-xs font-mono text-zinc-300">Application Types</Label>
              <Input 
                value={tempFilters.application?.join(', ') || ''}
                onChange={(e) => handleFilterChange('application', e.target.value.split(',').map(s => s.trim()).filter(Boolean))}
                placeholder="e.g., wordpress, citrix, rdweb" 
                className="font-mono bg-black/40 border-zinc-800 text-zinc-100 placeholder:text-zinc-500"
              />
            </div>
            <Separator className="bg-zinc-800/50" />
            <div className="space-y-4">
              <Label className="text-xs font-mono text-zinc-300">Security Filters</Label>
              <div className="flex items-center justify-between">
                <Label className="text-sm font-mono text-zinc-400" htmlFor="has_captcha">
                  Has CAPTCHA
                </Label>
                <Switch 
                  id="has_captcha"
                  checked={tempFilters.has_captcha || false}
                  onCheckedChange={(checked) => handleFilterChange('has_captcha', checked)}
                  className="data-[state=checked]:bg-zinc-700"
                />
              </div>
              <div className="flex items-center justify-between">
                <Label className="text-sm font-mono text-zinc-400" htmlFor="has_mfa">
                  Has MFA
                </Label>
                <Switch 
                  id="has_mfa"
                  checked={tempFilters.has_mfa || false}
                  onCheckedChange={(checked) => handleFilterChange('has_mfa', checked)}
                  className="data-[state=checked]:bg-zinc-700"
                />
              </div>
              <div className="flex items-center justify-between">
                <Label className="text-sm font-mono text-zinc-400" htmlFor="is_secure">
                  HTTPS Only
                </Label>
                <Switch 
                  id="is_secure"
                  checked={tempFilters.is_secure || false}
                  onCheckedChange={(checked) => handleFilterChange('is_secure', checked)}
                  className="data-[state=checked]:bg-zinc-700"
                />
              </div>
              <div className="flex items-center justify-between">
                <Label className="text-sm font-mono text-zinc-400" htmlFor="exclude_non_routable">
                  Exclude Local IPs
                </Label>
                <Switch 
                  id="exclude_non_routable"
                  checked={tempFilters.excludeNonRoutable || false}
                  onCheckedChange={(checked) => handleFilterChange('excludeNonRoutable', checked)}
                  className="data-[state=checked]:bg-zinc-700"
                />
              </div>
            </div>
            <Separator className="bg-zinc-800/50" />
            <div className="space-y-4">
              <Label className="text-xs font-mono text-zinc-300">Risk Score Range</Label>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label className="text-sm font-mono text-zinc-400">Min</Label>
                  <Input 
                    type="number"
                    min="0"
                    max="1"
                    step="0.1"
                    value={tempFilters.risk_score_min || ''}
                    onChange={(e) => handleFilterChange('risk_score_min', e.target.value ? parseFloat(e.target.value) : undefined)}
                    className="font-mono bg-black/40 border-zinc-800 text-zinc-100"
                  />
                </div>
                <div>
                  <Label className="text-sm font-mono text-zinc-400">Max</Label>
                  <Input 
                    type="number"
                    min="0"
                    max="1"
                    step="0.1"
                    value={tempFilters.risk_score_max || ''}
                    onChange={(e) => handleFilterChange('risk_score_max', e.target.value ? parseFloat(e.target.value) : undefined)}
                    className="font-mono bg-black/40 border-zinc-800 text-zinc-100"
                  />
                </div>
              </div>
            </div>
          </div>
        </ScrollArea>
        <div className="flex justify-end gap-2 p-4 border-t border-zinc-800">
          <Button 
            variant="outline" 
            onClick={onResetFilters}
            className="font-mono border-zinc-800 bg-black/40 hover:bg-black/60 hover:text-zinc-100 text-zinc-400"
          >
            Reset
          </Button>
          <Button 
            onClick={onApplyFilters}
            className="font-mono bg-zinc-900 hover:bg-zinc-800 text-zinc-100"
          >
            Apply Filters
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
} 