import ReactMarkdown, { type Components } from "react-markdown";
import remarkGfm from "remark-gfm";
import { cn } from "@/lib/utils";

const components: Components = {
  h1: ({ children }) => (
    <h1 className="text-[16px] font-bold tracking-tight mt-4 mb-2 text-foreground">
      {children}
    </h1>
  ),
  h2: ({ children }) => (
    <h2 className="text-[15px] font-semibold tracking-tight mt-4 mb-2 text-foreground">
      {children}
    </h2>
  ),
  h3: ({ children }) => (
    <h3 className="text-[14px] font-semibold mt-3 mb-1.5 text-foreground">
      {children}
    </h3>
  ),
  p: ({ children }) => (
    <p className="text-[14px] leading-relaxed my-2 text-foreground/90">{children}</p>
  ),
  ul: ({ children }) => (
    <ul className="list-disc pl-5 my-2 space-y-1 text-[14px] leading-relaxed text-foreground/90 marker:text-muted-foreground">
      {children}
    </ul>
  ),
  ol: ({ children }) => (
    <ol className="list-decimal pl-5 my-2 space-y-1 text-[14px] leading-relaxed text-foreground/90 marker:text-muted-foreground">
      {children}
    </ol>
  ),
  li: ({ children }) => <li className="pl-0.5">{children}</li>,
  strong: ({ children }) => (
    <strong className="font-semibold text-foreground">{children}</strong>
  ),
  em: ({ children }) => <em className="italic">{children}</em>,
  a: ({ children, href }) => (
    <a
      href={href}
      target="_blank"
      rel="noreferrer"
      className="font-medium underline underline-offset-2 text-foreground hover:opacity-80"
    >
      {children}
    </a>
  ),
  blockquote: ({ children }) => (
    <blockquote className="border-l-2 border-border pl-3 my-2 italic text-muted-foreground">
      {children}
    </blockquote>
  ),
  code: ({ className, children }) => {
    const isBlock = (className ?? "").includes("language-");
    if (isBlock) {
      return (
        <code className="block font-mono text-[12.5px] leading-relaxed">
          {children}
        </code>
      );
    }
    return (
      <code className="font-mono text-[12.5px] px-1 py-0.5 rounded bg-foreground/[0.08]">
        {children}
      </code>
    );
  },
  pre: ({ children }) => (
    <pre className="my-2 p-3 rounded-lg overflow-x-auto bg-foreground/[0.05] border border-border">
      {children}
    </pre>
  ),
  hr: () => <hr className="my-3 border-border" />,
  table: ({ children }) => (
    <div className="my-2 overflow-x-auto">
      <table className="w-full text-[13px] border-collapse">{children}</table>
    </div>
  ),
  th: ({ children }) => (
    <th className="text-left font-semibold px-2.5 py-1.5 border border-border bg-foreground/[0.03]">
      {children}
    </th>
  ),
  td: ({ children }) => (
    <td className="px-2.5 py-1.5 border border-border align-top">{children}</td>
  ),
};

function Markdown({ children, className }: { children: string; className?: string }) {
  return (
    <div className={cn("[&>*:first-child]:mt-0 [&>*:last-child]:mb-0", className)}>
      <ReactMarkdown remarkPlugins={[remarkGfm]} components={components}>
        {children}
      </ReactMarkdown>
    </div>
  );
}

export { Markdown };
