import { useEffect, useState } from "react";

/**
 * Returns `value`, but only after it has stopped changing for `delay` ms.
 *
 * Typing "login" into the search box fires five renders. Without this, that is
 * five requests — and the answers can come back out of order, so the screen
 * can end up showing results for "logi" while the box says "login".
 *
 * The cleanup is what makes it work: every new keystroke cancels the timer the
 * previous one set, so only the last one ever fires.
 */
export function useDebounce<T>(value: T, delay = 300): T {
  const [settled, setSettled] = useState(value);

  useEffect(() => {
    const timer = setTimeout(() => setSettled(value), delay);
    return () => clearTimeout(timer);
  }, [value, delay]);

  return settled;
}
