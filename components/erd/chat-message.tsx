'use client'

import { ChatReasoningBlock } from './chat-reasoning-block'
import { ChatToolCallCard } from './chat-tool-call'
import { ChatResultTable } from './chat-result-table'
import ReactMarkdown from 'react-markdown'
import remarkGfm from 'remark-gfm'

interface ToolCallData {
  id: string
  tool: string
  input: Record<string, unknown>
  output?: unknown
  error?: string
}

interface ResultTableData {
  columns: { name: string; type: string }[]
  rows: unknown[][]
  rowCount: number
  truncated: boolean
}

interface ChatMessageProps {
  role: 'user' | 'assistant'
  content: string
  toolCalls?: ToolCallData[]
  reasoning?: string
  resultTable?: ResultTableData
  isStreaming?: boolean
}

export function ChatMessage({
  role,
  content,
  toolCalls,
  reasoning,
  resultTable,
  isStreaming,
}: ChatMessageProps) {
  if (role === 'user') {
    return (
      <div className="flex justify-end px-3">
        <div className="max-w-[80%] bg-primary/10 border border-primary/20 rounded-2xl rounded-tr-md px-3 py-2">
          <p className="text-xs text-foreground whitespace-pre-wrap">{content}</p>
        </div>
      </div>
    )
  }

  return (
    <div className="flex justify-start px-3">
      <div className="max-w-[90%] flex flex-col gap-2">
        {reasoning && (
          <ChatReasoningBlock content={reasoning} isLatest={isStreaming} />
        )}

        {toolCalls && toolCalls.length > 0 && (
          <div className="flex flex-col gap-1.5">
            {toolCalls.map((tc, i) => (
              <ChatToolCallCard
                key={tc.id || i}
                tool={tc.tool}
                input={tc.input}
                output={
                  tc.output && typeof tc.output === 'object' && !Array.isArray(tc.output)
                    ? (tc.output as Record<string, unknown>)
                    : undefined
                }
                error={tc.error}
                status={
                  tc.error
                    ? 'error'
                    : tc.output
                      ? 'success'
                      : 'running'
                }
              />
            ))}
          </div>
        )}

        {resultTable && (
          <ChatResultTable
            columns={resultTable.columns}
            rows={resultTable.rows}
            rowCount={resultTable.rowCount}
            truncated={resultTable.truncated}
          />
        )}

        {content && (
          <div className="bg-secondary/40 border border-border rounded-2xl rounded-tl-md px-3 py-2">
            <div className="text-xs text-foreground [&>p:empty]:hidden [&>p]:mb-1.5 [&>p:last-child]:mb-0 [&>ul]:mb-1.5 [&>ol]:mb-1.5 [&>h1]:text-sm [&>h1]:font-bold [&>h1]:mb-1 [&>h2]:text-sm [&>h2]:font-semibold [&>h2]:mb-1 [&>h3]:text-xs [&>h3]:font-semibold [&>h3]:mb-0.5 [&>*+*]:mt-1">
              <ReactMarkdown
                remarkPlugins={[remarkGfm]}
                components={{
                  code({ className, children, ...props }) {
                    const isInline = !className
                    return isInline ? (
                      <code className="bg-secondary/60 rounded px-1 py-0.5 text-xs font-mono text-foreground" {...props}>
                        {children}
                      </code>
                    ) : (
                      <pre className="bg-secondary/60 rounded-lg p-3 overflow-x-auto text-xs font-mono text-foreground border border-border/50 my-2">
                        <code className={className} {...props}>
                          {children}
                        </code>
                      </pre>
                    )
                  },
                  pre({ children }) {
                    return <>{children}</>
                  },
                  table({ children }) {
                    return (
                      <div className="overflow-x-auto my-2">
                        <table className="min-w-full text-xs border-collapse border border-border/50">
                          {children}
                        </table>
                      </div>
                    )
                  },
                  th({ children }) {
                    return <th className="border border-border/50 px-2 py-1 bg-secondary/40 text-left font-medium text-xs">{children}</th>
                  },
                  td({ children }) {
                    return <td className="border border-border/50 px-2 py-1 text-xs">{children}</td>
                  },
                  a({ href, children }) {
                    return <a href={href} target="_blank" rel="noopener noreferrer" className="text-primary underline hover:text-primary/80">{children}</a>
                  },
                  ul({ children }) {
                    return <ul className="list-disc pl-4 my-1 space-y-0.5 text-xs">{children}</ul>
                  },
                  ol({ children }) {
                    return <ol className="list-decimal pl-4 my-1 space-y-0.5 text-xs">{children}</ol>
                  },
                  p({ children }) {
                    return <p className="text-xs">{children}</p>
                  },
                }}
              >
                {content}
              </ReactMarkdown>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
