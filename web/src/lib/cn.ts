import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

// Joins class names, and makes a className passed in from outside WIN over the
// component's own classes.
//
// Without twMerge, <Button className="bg-white"> on a button whose own classes
// include bg-ink produces "bg-ink bg-white" and the winner depends on which
// rule Tailwind happened to write first in the stylesheet. twMerge knows the
// two conflict and keeps the last one.
export function cn(...inputs: ClassValue[]): string {
  return twMerge(clsx(inputs));
}
