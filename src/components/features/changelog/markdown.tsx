/**
 * renderChangelogMarkdown
 *
 * Converts a safe subset of GitHub-Flavored Markdown to React elements.
 * SECURITY: never uses dangerouslySetInnerHTML. Every text node is treated as
 * plain text and escaped by React's default JSX rendering. This function is the
 * sole rendering boundary for untrusted remote content (release bodies from
 * the GitHub API). Flagged for Lawliet Agent review per Blueprint ADR-05.
 *
 * Supported patterns (in order of precedence):
 *   - ATX headings: # H1 / ## H2 / ### H3
 *   - Bullet lists: lines starting with "- " or "* "
 *   - Numbered lists: lines starting with "N. "
 *   - Bold: **text**
 *   - Italic: *text* (single asterisk, not part of a bold pair)
 *   - Inline code: `code`
 *   - Links: [text](url) — renders as underlined plain text; no <a> in v1
 *     (href-allowlisting deferred to Lawliet review, Phase E).
 *   - Blank lines: produce paragraph breaks.
 *   - Everything else: plain text paragraph.
 *
 * Not supported: tables, images, blockquotes, HTML passthrough, nested lists.
 */

import React from "react";

// ─── Inline renderer ──────────────────────────────────────────────────────────

type InlineSegment =
  | { kind: "text"; content: string }
  | { kind: "bold"; content: string }
  | { kind: "italic"; content: string }
  | { kind: "code"; content: string }
  | { kind: "link"; text: string; href: string };

/**
 * Parses inline markdown tokens within a single line of text.
 * Each segment is later mapped to a React element with a stable key.
 */
function parseInline(raw: string): InlineSegment[] {
  const segments: InlineSegment[] = [];
  // Pattern order matters: bold before italic so "**" is not misread as two "*".
  const INLINE_PATTERN = /(\*\*(.+?)\*\*|\*(.+?)\*|`(.+?)`|\[([^\]]+)\]\(([^)]+)\))/g;

  let lastIndex = 0;
  let match: RegExpExecArray | null;

  while ((match = INLINE_PATTERN.exec(raw)) !== null) {
    const [fullMatch, , boldContent, italicContent, codeContent, linkText, linkHref] = match;

    // Plain text preceding this token.
    if (match.index > lastIndex) {
      segments.push({ kind: "text", content: raw.slice(lastIndex, match.index) });
    }

    if (boldContent !== undefined) {
      segments.push({ kind: "bold", content: boldContent });
    } else if (italicContent !== undefined) {
      segments.push({ kind: "italic", content: italicContent });
    } else if (codeContent !== undefined) {
      segments.push({ kind: "code", content: codeContent });
    } else if (linkText !== undefined && linkHref !== undefined) {
      segments.push({ kind: "link", text: linkText, href: linkHref });
    }

    lastIndex = match.index + fullMatch.length;
  }

  // Trailing plain text.
  if (lastIndex < raw.length) {
    segments.push({ kind: "text", content: raw.slice(lastIndex) });
  }

  return segments.length > 0 ? segments : [{ kind: "text", content: raw }];
}

function renderInlineSegments(segments: InlineSegment[], keyPrefix: string): React.ReactNode[] {
  return segments.map((seg, idx) => {
    const key = `${keyPrefix}-${idx}`;
    switch (seg.kind) {
      case "bold":
        return <strong key={key}>{seg.content}</strong>;
      case "italic":
        return <em key={key}>{seg.content}</em>;
      case "code":
        return (
          <code key={key} className="rounded bg-slate-800 px-1 py-0.5 font-mono text-[0.85em] text-amber-300">
            {seg.content}
          </code>
        );
      case "link":
        // v1: render link text as underlined span (no <a> until Lawliet review, Phase E).
        return (
          <span key={key} className="underline underline-offset-2 text-slate-300">
            {seg.text}
          </span>
        );
      case "text":
      default:
        return <React.Fragment key={key}>{seg.content}</React.Fragment>;
    }
  });
}

function renderInline(raw: string, keyPrefix: string): React.ReactNode {
  const segments = parseInline(raw);
  const nodes = renderInlineSegments(segments, keyPrefix);
  return nodes.length === 1 ? nodes[0] : nodes;
}

// ─── Block renderer ───────────────────────────────────────────────────────────

type Block =
  | { kind: "h1" | "h2" | "h3"; text: string }
  | { kind: "bullet"; items: string[] }
  | { kind: "ordered"; items: string[] }
  | { kind: "paragraph"; text: string };

function parseBlocks(markdown: string): Block[] {
  const lines = markdown.split(/\r?\n/);
  const blocks: Block[] = [];

  let currentList: { kind: "bullet" | "ordered"; items: string[] } | null = null;

  function flushList() {
    if (currentList) {
      blocks.push({ ...currentList });
      currentList = null;
    }
  }

  for (const line of lines) {
    // Heading
    const headingMatch = /^(#{1,3})\s+(.+)/.exec(line);
    if (headingMatch) {
      flushList();
      const level = headingMatch[1].length as 1 | 2 | 3;
      const kindMap: Record<number, "h1" | "h2" | "h3"> = { 1: "h1", 2: "h2", 3: "h3" };
      blocks.push({ kind: kindMap[level], text: headingMatch[2] });
      continue;
    }

    // Bullet list item
    const bulletMatch = /^[-*]\s+(.+)/.exec(line);
    if (bulletMatch) {
      if (currentList?.kind !== "bullet") {
        flushList();
        currentList = { kind: "bullet", items: [] };
      }
      currentList.items.push(bulletMatch[1]);
      continue;
    }

    // Ordered list item
    const orderedMatch = /^\d+\.\s+(.+)/.exec(line);
    if (orderedMatch) {
      if (currentList?.kind !== "ordered") {
        flushList();
        currentList = { kind: "ordered", items: [] };
      }
      currentList.items.push(orderedMatch[1]);
      continue;
    }

    // Blank line — flush active list, emit no paragraph.
    if (line.trim() === "") {
      flushList();
      continue;
    }

    // Paragraph
    flushList();
    blocks.push({ kind: "paragraph", text: line });
  }

  flushList();
  return blocks;
}

// ─── Public API ───────────────────────────────────────────────────────────────

/**
 * Converts a safe subset of GFM markdown to React nodes.
 * Safe to call with untrusted content: no dangerouslySetInnerHTML is used;
 * all user-supplied text is passed as React children (escaped by default).
 */
export function renderChangelogMarkdown(body: string): React.ReactNode {
  if (!body.trim()) return null;

  const blocks = parseBlocks(body);

  return (
    <div className="space-y-2 text-xs text-slate-300 leading-relaxed">
      {blocks.map((block, blockIdx) => {
        const blockKey = `block-${blockIdx}`;

        switch (block.kind) {
          case "h1":
            return (
              <h2 key={blockKey} className="text-base font-bold text-slate-100 font-display">
                {renderInline(block.text, blockKey)}
              </h2>
            );
          case "h2":
            return (
              <h3 key={blockKey} className="text-sm font-semibold text-slate-200">
                {renderInline(block.text, blockKey)}
              </h3>
            );
          case "h3":
            return (
              <h4 key={blockKey} className="text-xs font-semibold text-slate-300 uppercase tracking-wide">
                {renderInline(block.text, blockKey)}
              </h4>
            );
          case "bullet":
            return (
              <ul key={blockKey} className="list-disc list-inside space-y-0.5 pl-2">
                {block.items.map((item, itemIdx) => (
                  <li key={`${blockKey}-li-${itemIdx}`}>{renderInline(item, `${blockKey}-li-${itemIdx}`)}</li>
                ))}
              </ul>
            );
          case "ordered":
            return (
              <ol key={blockKey} className="list-decimal list-inside space-y-0.5 pl-2">
                {block.items.map((item, itemIdx) => (
                  <li key={`${blockKey}-li-${itemIdx}`}>{renderInline(item, `${blockKey}-li-${itemIdx}`)}</li>
                ))}
              </ol>
            );
          case "paragraph":
          default:
            return (
              <p key={blockKey}>{renderInline(block.text, blockKey)}</p>
            );
        }
      })}
    </div>
  );
}
