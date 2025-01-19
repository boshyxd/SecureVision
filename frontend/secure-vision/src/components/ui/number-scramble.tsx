"use client";

import { useEffect, useState } from "react";
import { motion, useAnimationControls } from "framer-motion";

interface NumberScrambleProps {
  value: number;
  duration?: number;
  className?: string;
  formatFn?: (value: number) => string;
}

export function NumberScramble({ 
  value, 
  duration = 1.5, 
  className = "",
  formatFn = (val) => val.toLocaleString()
}: NumberScrambleProps) {
  const [displayValue, setDisplayValue] = useState(0);
  const controls = useAnimationControls();

  useEffect(() => {
    let startTime = Date.now();
    let frame: number;

    const animate = () => {
      const now = Date.now();
      const progress = Math.min((now - startTime) / (duration * 1000), 1);
      
      const eased = 1 - Math.pow(1 - progress, 3);
      
      const current = Math.round(value * eased);
      setDisplayValue(current);

      if (progress < 1) {
        frame = requestAnimationFrame(animate);
      }
    };

    frame = requestAnimationFrame(animate);
    return () => cancelAnimationFrame(frame);
  }, [value, duration]);

  return (
    <motion.span
      className={className}
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.3 }}
    >
      {formatFn(displayValue)}
    </motion.span>
  );
} 