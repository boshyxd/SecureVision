"use client";

import { useState, useRef } from "react";
import { Upload } from "lucide-react";
import { useToast } from "@/components/ui/use-toast";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";

interface UploadDialogProps {
  onUploadComplete?: () => void;
}

export function UploadDialog({ onUploadComplete }: UploadDialogProps) {
  const { toast } = useToast();
  const [isUploading, setIsUploading] = useState(false);
  const [isOpen, setIsOpen] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileUpload = async (file: File) => {
    if (!file.name.endsWith('.txt')) {
      toast({
        title: "Invalid file type",
        description: "Please upload a .txt file",
        variant: "destructive"
      });
      return;
    }

    setIsUploading(true);
    // Close dialog immediately when upload starts
    setIsOpen(false);

    const formData = new FormData();
    formData.append('file', file);

    try {
      const response = await fetch('http://localhost:8000/api/v1/upload/upload', {
        method: 'POST',
        body: formData,
      });

      if (!response.ok) {
        throw new Error(`Upload failed: ${response.statusText}`);
      }

      const result = await response.json();
      
      // Show success toast
      toast({
        title: "Upload successful",
        description: `${file.name} was successfully uploaded and is now being processed.`,
        variant: "default"
      });

      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }

      // Trigger the callback to start showing parsed entries
      if (onUploadComplete) {
        onUploadComplete();
      }

    } catch (error) {
      console.error('Upload error:', error);
      toast({
        title: "Upload failed",
        description: error instanceof Error ? error.message : "An error occurred during upload",
        variant: "destructive"
      });
    } finally {
      setIsUploading(false);
    }
  };

  const handleFileSelect = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      handleFileUpload(file);
    }
  };

  const handleDrop = (event: React.DragEvent<HTMLDivElement>) => {
    event.preventDefault();
    const file = event.dataTransfer.files[0];
    if (file) {
      handleFileUpload(file);
    }
  };

  const handleDragOver = (event: React.DragEvent<HTMLDivElement>) => {
    event.preventDefault();
  };

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogTrigger asChild>
        <Button
          variant="outline"
          size="sm"
          className="font-mono border-zinc-800 bg-black/40 hover:bg-black/60 hover:text-zinc-100 text-zinc-400"
        >
          <Upload className="mr-2 h-4 w-4" />
          Upload Data
        </Button>
      </DialogTrigger>
      <DialogContent className="bg-zinc-950/95 border-zinc-800">
        <DialogHeader>
          <DialogTitle className="font-mono">Upload Breach Data</DialogTitle>
          <DialogDescription className="font-mono text-zinc-400">
            Upload a text file containing breach data in the format: url:username:password
          </DialogDescription>
        </DialogHeader>

        <div
          onDrop={handleDrop}
          onDragOver={handleDragOver}
          className="flex flex-col items-center justify-center p-8 gap-4 border-2 border-dashed border-zinc-800 rounded-lg hover:border-zinc-700 transition-colors"
        >
          <input
            ref={fileInputRef}
            type="file"
            accept=".txt"
            onChange={handleFileSelect}
            className="hidden"
            disabled={isUploading}
          />
          
          {isUploading ? (
            <p className="text-sm text-center font-mono text-zinc-400">
              Uploading...
            </p>
          ) : (
            <>
              <p className="text-sm text-center font-mono text-zinc-400">
                Drag and drop your file here, or click to select
              </p>
              <Button
                variant="outline"
                onClick={() => fileInputRef.current?.click()}
                className="font-mono border-zinc-800 bg-black/40 hover:bg-black/60"
              >
                Select File
              </Button>
            </>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
} 