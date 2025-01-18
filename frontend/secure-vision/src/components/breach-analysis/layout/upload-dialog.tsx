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
import { Progress } from "@/components/ui/progress";
import { Upload } from "lucide-react";

interface UploadDialogProps {
  isUploading?: boolean;
  progress?: number;
}

export function UploadDialog({ isUploading = false, progress = 0 }: UploadDialogProps) {
  return (
    <Dialog>
      <DialogTrigger asChild>
        <Button variant="outline" size="icon" className="border-zinc-800 bg-black/40 hover:bg-black/60 hover:text-zinc-100 text-zinc-400">
          <Upload className="h-4 w-4 text-zinc-400" />
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-[425px] bg-zinc-950 border-zinc-800">
        <DialogHeader>
          <DialogTitle className="font-mono text-zinc-100">Upload Breach Data</DialogTitle>
          <DialogDescription className="font-mono text-zinc-400">
            Upload a text file containing breach data for analysis.
          </DialogDescription>
        </DialogHeader>
        <div className="grid gap-4 py-4">
          <div className="rounded-lg border-2 border-dashed border-zinc-800 p-6 text-center bg-black/40">
            <div className="mx-auto flex max-w-[420px] flex-col items-center justify-center">
              <Upload className="h-10 w-10 text-zinc-400 mb-4" />
              <h3 className="font-mono text-zinc-100 mt-2">Drag and drop your file</h3>
              <p className="text-sm font-mono text-zinc-400 mt-1">
                Or click to select a file to upload
              </p>
              <Button variant="outline" className="mt-4 font-mono border-zinc-800 bg-black/40 hover:bg-black/60 hover:text-zinc-100 text-zinc-400">
                Select File
              </Button>
            </div>
          </div>
          {isUploading && (
            <div className="space-y-2">
              <div className="flex justify-between text-sm font-mono">
                <span className="text-zinc-400">Processing entries...</span>
                <span className="text-zinc-100">{progress}%</span>
              </div>
              <Progress value={progress} className="h-1.5 bg-zinc-800">
                <div className="h-1.5 bg-blue-500/90 transition-all" style={{ width: `${progress}%` }} />
              </Progress>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
} 