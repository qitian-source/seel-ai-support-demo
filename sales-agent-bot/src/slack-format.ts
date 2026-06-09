/**
 * Convert the model's Markdown into Slack mrkdwn.
 * Slack uses *bold*, _italic_, and <url|text> links.
 */
export function toSlackMrkdwn(md: string): string {
  let s = md;

  // Markdown links [text](url) -> <url|text>
  s = s.replace(/\[([^\]]+)\]\((https?:\/\/[^)\s]+)\)/g, "<$2|$1>");

  // Bold **text** -> *text*  (do before single-asterisk handling)
  s = s.replace(/\*\*([^*]+)\*\*/g, "*$1*");

  // Headings (#, ##, ###) -> bold line
  s = s.replace(/^#{1,6}\s+(.*)$/gm, "*$1*");

  return s.trim();
}
