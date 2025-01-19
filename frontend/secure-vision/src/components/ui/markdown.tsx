"use client";

import * as React from "react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { cn } from "@/lib/utils";

interface MarkdownProps {
  content: string;
  className?: string;
}

export function Markdown({ content, className }: MarkdownProps) {
  return (
    <ReactMarkdown
      remarkPlugins={[remarkGfm]}
      className={cn(
        "prose prose-invert max-w-none",
        "prose-pre:bg-zinc-800 prose-pre:border prose-pre:border-zinc-700",
        "prose-code:bg-zinc-800 prose-code:px-1 prose-code:py-0.5 prose-code:rounded-md prose-code:border prose-code:border-zinc-700",
        "prose-a:text-emerald-400 prose-a:no-underline hover:prose-a:underline",
        "prose-headings:text-zinc-100 prose-headings:font-semibold",
        "prose-strong:text-zinc-200 prose-strong:font-semibold",
        "prose-em:text-zinc-300",
        "prose-ul:text-zinc-300 prose-ol:text-zinc-300 prose-li:text-zinc-300",
        "prose-blockquote:text-zinc-300 prose-blockquote:border-l-zinc-700",
        className
      )}
    >
      {content}
    </ReactMarkdown>
  );
} 