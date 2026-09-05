// "Sarah Chen" becomes SC. A single name becomes its first letter.
//
// Lives here rather than in Avatar.tsx because it is a plain function, not a
// component — keeping components/ files exporting only components is what lets
// Vite reload a changed component without reloading the whole page.
export function initialsOf(name: string): string {
  const words = name.trim().split(/\s+/).filter(Boolean);

  if (words.length === 0) return "?";
  if (words.length === 1) return words[0]!.charAt(0).toUpperCase();

  return (words[0]!.charAt(0) + words.at(-1)!.charAt(0)).toUpperCase();
}
