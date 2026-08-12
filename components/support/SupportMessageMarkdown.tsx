"use client";

import { useEffect, useLayoutEffect, useRef, type ReactNode } from "react";
import ReactMarkdown from "react-markdown";
import rehypeSanitize from "rehype-sanitize";
import styled from "styled-components";

const MarkdownBody = styled.div`
  white-space: normal;
  overflow-wrap: break-word;

  p {
    margin: 0 0 0.6rem;

    &:last-child {
      margin-bottom: 0;
    }
  }

  ul,
  ol {
    margin: 0 0 0.6rem;
    padding-left: 1.25rem;
  }

  li {
    margin: 0.15rem 0;
  }

  a {
    color: inherit;
    text-decoration: underline;
    font-weight: 600;
  }

  code {
    font-size: 0.85em;
    background: rgba(0, 0, 0, 0.25);
    padding: 0.1em 0.35em;
    border-radius: 4px;
  }

  pre {
    margin: 0 0 0.6rem;
    padding: 0.6rem 0.75rem;
    overflow-x: auto;
    background: rgba(0, 0, 0, 0.3);
    border-radius: 6px;

    code {
      background: none;
      padding: 0;
    }
  }

  strong {
    font-weight: 700;
  }

  h1,
  h2,
  h3,
  h4 {
    margin: 0.75rem 0 0.4rem;
    font-size: 1em;
    font-weight: 700;

    &:first-child {
      margin-top: 0;
    }
  }

  blockquote {
    margin: 0 0 0.6rem;
    padding-left: 0.75rem;
    border-left: 3px solid rgba(255, 255, 255, 0.35);
  }
`;

const markdownComponents = {
  a: ({ href, children: linkChildren }: { href?: string; children?: ReactNode }) => (
    <a href={href} target="_blank" rel="noopener noreferrer">
      {linkChildren}
    </a>
  ),
};

const EditorRoot = styled(MarkdownBody)<{ $disabled?: boolean }>`
  min-height: 160px;
  max-height: 360px;
  overflow-y: auto;
  padding: 0.75rem;
  background-color: rgba(255, 255, 255, 0.05);
  border: 1px solid rgba(255, 255, 255, 0.1);
  border-radius: 8px;
  color: var(--text);
  font-size: 0.95rem;
  cursor: ${(props) => (props.$disabled ? "not-allowed" : "text")};
  opacity: ${(props) => (props.$disabled ? 0.6 : 1)};
  outline: none;

  &:focus {
    border-color: var(--primary);
  }

  &[data-empty="true"]:before {
    content: attr(data-placeholder);
    color: var(--text-secondary);
    pointer-events: none;
  }
`;

const HiddenMarkdown = styled.div`
  position: absolute;
  left: -9999px;
  width: 0;
  height: 0;
  overflow: hidden;
  pointer-events: none;
`;

/**
 * @brief Wraps serialized text in markdown emphasis without stacking markers.
 * @param inner Already-serialized inner markdown.
 * @param marker `**` for bold or `*` for italic.
 */
function wrapEmphasis(inner: string, marker: string): string {
  const stripped = inner.split(marker).join("");
  if (!stripped.trim()) {
    return inner;
  }
  return `${marker}${stripped}${marker}`;
}

/**
 * @brief Converts contentEditable HTML back to markdown for ticket replies.
 * @param root Editable element whose children should be serialized.
 */
function htmlToMarkdown(root: HTMLElement): string {
  const serialize = (node: Node): string => {
    if (node.nodeType === Node.TEXT_NODE) {
      return node.textContent ?? "";
    }
    if (node.nodeType !== Node.ELEMENT_NODE) {
      return "";
    }

    const el = node as HTMLElement;
    const tag = el.tagName.toLowerCase();
    const inner = Array.from(el.childNodes).map(serialize).join("");

    switch (tag) {
      case "strong":
      case "b":
        return wrapEmphasis(inner, "**");
      case "em":
      case "i":
        return wrapEmphasis(inner, "*");
      case "code":
        if (el.parentElement?.tagName.toLowerCase() === "pre") {
          return inner;
        }
        return `\`${inner}\``;
      case "pre":
        return `\n\`\`\`\n${(el.textContent ?? "").trim()}\n\`\`\`\n`;
      case "a": {
        const href = el.getAttribute("href") || "";
        return href ? `[${inner}](${href})` : inner;
      }
      case "br":
        return "\n";
      case "p":
        return `${inner}\n\n`;
      case "div":
        return `${inner}\n`;
      case "li": {
        const parent = el.parentElement?.tagName.toLowerCase();
        return `${parent === "ol" ? "1. " : "- "}${inner.trim()}\n`;
      }
      case "ul":
      case "ol":
        return `${inner}\n`;
      case "h1":
        return `# ${inner}\n\n`;
      case "h2":
        return `## ${inner}\n\n`;
      case "h3":
        return `### ${inner}\n\n`;
      case "h4":
        return `#### ${inner}\n\n`;
      case "blockquote":
        return `${inner
          .split("\n")
          .map((line) => line.trim())
          .filter(Boolean)
          .map((line) => `> ${line}`)
          .join("\n")}\n\n`;
      default:
        return inner;
    }
  };

  return Array.from(root.childNodes).map(serialize).join("").trim();
}

/**
 * @brief Renders a support-ticket message body as sanitized markdown.
 * @param children Markdown source from the ticket message.
 */
export function SupportMessageMarkdown({ children }: { children: string }) {
  return (
    <MarkdownBody>
      <ReactMarkdown rehypePlugins={[rehypeSanitize]} components={markdownComponents}>
        {children}
      </ReactMarkdown>
    </MarkdownBody>
  );
}

type SupportMessageMarkdownEditorProps = {
  value: string;
  onChange: (markdown: string) => void;
  disabled?: boolean;
  placeholder?: string;
};

/**
 * @brief Editable markdown surface that looks like the rendered ticket reply.
 * @param value Markdown source.
 * @param onChange Called with markdown after the user edits the rendered view.
 * @param disabled When true, the surface is read-only.
 * @param placeholder Shown when the editor is empty.
 */
export function SupportMessageMarkdownEditor({
  value,
  onChange,
  disabled = false,
  placeholder,
}: SupportMessageMarkdownEditorProps) {
  const editorRef = useRef<HTMLDivElement>(null);
  const hiddenRef = useRef<HTMLDivElement>(null);
  const skipSyncRef = useRef(false);

  useLayoutEffect(() => {
    if (skipSyncRef.current) {
      skipSyncRef.current = false;
      return;
    }
    if (!editorRef.current || !hiddenRef.current) {
      return;
    }
    editorRef.current.innerHTML = hiddenRef.current.innerHTML;
  }, [value]);

  useEffect(() => {
    if (!disabled) {
      return;
    }
    skipSyncRef.current = false;
  }, [disabled]);

  return (
    <>
      <HiddenMarkdown ref={hiddenRef} aria-hidden="true">
        <ReactMarkdown rehypePlugins={[rehypeSanitize]} components={markdownComponents}>
          {value}
        </ReactMarkdown>
      </HiddenMarkdown>
      <EditorRoot
        ref={editorRef}
        contentEditable={!disabled}
        suppressContentEditableWarning
        $disabled={disabled}
        data-empty={!value.trim() ? "true" : "false"}
        data-placeholder={placeholder}
        role="textbox"
        aria-multiline="true"
        aria-label={placeholder || "Generated response"}
        onFocus={() => {
          document.execCommand("defaultParagraphSeparator", false, "p");
        }}
        onInput={() => {
          if (!editorRef.current) {
            return;
          }
          skipSyncRef.current = true;
          onChange(htmlToMarkdown(editorRef.current));
        }}
      />
    </>
  );
}
