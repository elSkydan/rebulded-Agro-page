/** Server limit for `comment` in POST /api/leads (server/routes/leads.js). */
export const MAX_LEAD_COMMENT_LENGTH = 1000;

/** Prepended to the lead comment when the client ticks «Ділянка заросла високою травою». */
export const TALL_GRASS_NOTE = 'Ділянка заросла високою травою.';

/** Room left for the client's own text when the tall-grass note is added. */
export function commentMaxLength(tallGrass: boolean): number {
  return tallGrass ? MAX_LEAD_COMMENT_LENGTH - TALL_GRASS_NOTE.length - 1 : MAX_LEAD_COMMENT_LENGTH;
}

/**
 * Build the comment sent with the lead. The tall-grass flag has no API field,
 * so it travels as the first sentence of the comment, which the Telegram
 * message already shows. Never exceeds the server limit.
 */
export function buildLeadComment(comment: string, tallGrass: boolean): string | undefined {
  const text = comment.trim();
  if (!tallGrass) return text ? text.slice(0, MAX_LEAD_COMMENT_LENGTH) : undefined;
  if (!text) return TALL_GRASS_NOTE;
  return `${TALL_GRASS_NOTE} ${text.slice(0, commentMaxLength(true))}`;
}
