"use client";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Search, BarChart2 } from "lucide-react";
import Image from "next/image";
import Link from "next/link";

interface NavbarProps {
  searchQuery: string;
  activeSearchType: 'domain' | 'application' | 'port' | 'path';
  onSearchChange: (value: string) => void;
  onSearchTypeChange: (type: 'domain' | 'application' | 'port' | 'path') => void;
}

export function Navbar({ 
  searchQuery, 
  activeSearchType, 
  onSearchChange,
  onSearchTypeChange 
}: NavbarProps) {
  return (
    <nav className="border-b border-zinc-800/50 bg-black/20 backdrop-blur-sm">
      <div className="container mx-auto flex h-16 items-center px-4 gap-4">
        <div className="flex items-center gap-2">
          <Image
            src="/logo.png"
            alt="SecureVision Logo"
            width={32}
            height={32}
            className="object-contain"
          />
          <div className="flex flex-col">
            <h2 className="text-xl font-mono tracking-tight text-zinc-100">SecureVision</h2>
            <p className="text-xs font-mono text-zinc-400">Breach Analysis Platform</p>
          </div>
        </div>
        <div className="ml-auto flex items-center space-x-4">
          <div className="relative w-96">
            <Search className="absolute left-2 top-2.5 h-4 w-4 text-zinc-500" />
            <Input
              placeholder={
                activeSearchType === 'domain' ? "Search by domain or IP..." :
                activeSearchType === 'application' ? "Search by application type..." :
                activeSearchType === 'port' ? "Search by port number..." :
                "Search by URL path..."
              }
              className="pl-8 font-mono bg-black/40 border-zinc-800 text-zinc-100 placeholder:text-zinc-500"
              value={searchQuery}
              onChange={(e) => onSearchChange(e.target.value)}
            />
          </div>
          <Link href="/statistics">
            <Button variant="ghost" size="icon" className="text-zinc-400 hover:text-zinc-100">
              <BarChart2 className="h-5 w-5" />
            </Button>
          </Link>
          <div className="flex items-center space-x-2">
            <Button
              variant="ghost"
              size="sm"
              className={`font-mono hover:bg-black/60 ${
                activeSearchType === 'domain' ? 'bg-black/60 text-zinc-100' : 'text-zinc-400 hover:text-zinc-100'
              }`}
              onClick={() => onSearchTypeChange('domain')}
            >
              Domain
            </Button>
            <Button
              variant="ghost"
              size="sm"
              className={`font-mono hover:bg-black/60 ${
                activeSearchType === 'application' ? 'bg-black/60 text-zinc-100' : 'text-zinc-400 hover:text-zinc-100'
              }`}
              onClick={() => onSearchTypeChange('application')}
            >
              Application
            </Button>
            <Button
              variant="ghost"
              size="sm"
              className={`font-mono hover:bg-black/60 ${
                activeSearchType === 'port' ? 'bg-black/60 text-zinc-100' : 'text-zinc-400 hover:text-zinc-100'
              }`}
              onClick={() => onSearchTypeChange('port')}
            >
              Port
            </Button>
            <Button
              variant="ghost"
              size="sm"
              className={`font-mono hover:bg-black/60 ${
                activeSearchType === 'path' ? 'bg-black/60 text-zinc-100' : 'text-zinc-400 hover:text-zinc-100'
              }`}
              onClick={() => onSearchTypeChange('path')}
            >
              Path
            </Button>
          </div>
        </div>
      </div>
    </nav>
  );
} 