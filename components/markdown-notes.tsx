import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";

export default function MarkdownNotes({ text }: { text: string }) {
  return (
    <div className="markdown markdown-notes">
      <ReactMarkdown
        remarkPlugins={[remarkGfm]}
        skipHtml
        components={{
          a: ({ children, href }) => (
            <a href={href} target="_blank" rel="noopener noreferrer">
              {children}
            </a>
          ),
          img: () => null,
        }}
      >
        {text}
      </ReactMarkdown>
    </div>
  );
}
