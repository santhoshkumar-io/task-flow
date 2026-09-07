// A regular expression is a small program, not a piece of text. Dropping what
// somebody typed straight into one changes its meaning: a search for "a.*b"
// stops looking for those four characters and starts matching anything between
// an a and a b. Worse, a pattern like (a+)+$ can be made to take an
// exponentially long time on a short input, which stalls the server.
//
// This turns every character that means something into a plain character.
export function escapeRegex(input: string): string {
  return input.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}
