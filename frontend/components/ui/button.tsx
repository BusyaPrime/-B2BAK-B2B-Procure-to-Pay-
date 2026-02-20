"use client";

import * as React from "react";

import { cn } from "@/lib/utils";

type ButtonProps = React.ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: "default" | "outline" | "ghost" | "danger";
};

export function Button({ className, variant = "default", ...props }: ButtonProps) {
  return (
    <button
      className={cn(
        "inline-flex items-center justify-center rounded-xl px-4 py-2 text-sm font-medium transition-colors duration-150 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary disabled:pointer-events-none disabled:opacity-50",
        variant === "default" && "bg-primary text-white hover:brightness-110",
        variant === "outline" && "border border-border bg-transparent hover:bg-muted/40",
        variant === "ghost" && "hover:bg-muted/50",
        variant === "danger" && "bg-red-600 text-white hover:bg-red-500",
        className
      )}
      {...props}
    />
  );
}
