'use client'

import { useState, useRef, useEffect, useCallback } from 'react'
import { X, Bot } from 'lucide-react'
import { ChatMessage } from './chat-message'
import { ChatInput } from './chat-input'
import { ChatSuggestedQuestions } from './chat-suggested-questions'
import type { ParsedSchema } from '@/lib/types'
import type { AgentEvent, ToolCall, ExecuteSqlOutput } from '@/lib/schema-chat/types'

interface PanelMessage {
  role: 'user' | 'assistant'
  content: string
  toolCalls?: ToolCall[]
  reasoning?: string
  resultTable?: ExecuteSqlOutput
}

interface SchemaChatPanelProps {
  schemaId: string
  schema: ParsedSchema
  onClose: () => void
}

export function SchemaChatPanel({ schemaId, schema, onClose }: SchemaChatPanelProps) {
  const [messages, setMessages] = useState<PanelMessage[]>([])
  const [input, setInput] = useState('')
  const [isStreaming, setIsStreaming] = useState(false)
  const abortControllerRef = useRef<AbortController | null>(null)
  const messagesEndRef = useRef<HTMLDivElement>(null)

  const scrollToBottom = useCallback(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [])

  useEffect(() => {
    scrollToBottom()
  }, [messages, scrollToBottom])

  async function handleSend() {
    if (!input.trim() || isStreaming) return

    const userMessage: PanelMessage = { role: 'user', content: input.trim() }
    const assistantMessage: PanelMessage = {
      role: 'assistant',
      content: '',
      toolCalls: [],
      reasoning: '',
    }

    setMessages((prev) => [...prev, userMessage, assistantMessage])
    setInput('')
    setIsStreaming(true)

    const abortController = new AbortController()
    abortControllerRef.current = abortController

    try {
      const history = [...messages, userMessage].map((m) => ({
        role: m.role,
        content: m.content,
        toolCalls: m.toolCalls?.map((tc) => ({
          id: tc.id,
          tool: tc.tool,
          input: tc.input,
          output: tc.output,
          error: tc.error,
        })),
      }))

      const res = await fetch('/api/schema-chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          schemaId,
          message: input.trim(),
          history,
        }),
        signal: abortController.signal,
      })

      if (!res.ok) {
        const body = await res.json().catch(() => ({}))
        throw new Error(body.error || `Request failed (${res.status})`)
      }

      const reader = res.body?.getReader()
      if (!reader) throw new Error('No response body')

      const decoder = new TextDecoder()
      let buffer = ''

      while (true) {
        const { done, value } = await reader.read()
        if (done) break

        buffer += decoder.decode(value, { stream: true })
        const lines = buffer.split('\n')
        buffer = lines.pop() || ''

        for (const line of lines) {
          const trimmed = line.trim()
          if (!trimmed || !trimmed.startsWith('data: ')) continue

          try {
            const event: AgentEvent = JSON.parse(trimmed.slice(6))

            switch (event.type) {
              case 'reasoning': {
                const chunk = event.content || ''
                setMessages((prev) => {
                  const updated = [...prev]
                  const last = updated[updated.length - 1]
                  if (last && last.role === 'assistant') {
                    updated[updated.length - 1] = {
                      ...last,
                      reasoning: (last.reasoning || '') + chunk,
                    }
                  }
                  return updated
                })
                break
              }

              case 'tool_call': {
                const toolCall: ToolCall = {
                  id: event.tool || Math.random().toString(36).slice(2),
                  tool: event.tool || '',
                  input: event.input || {},
                }
                setMessages((prev) => {
                  const updated = [...prev]
                  const last = updated[updated.length - 1]
                  if (last && last.role === 'assistant') {
                    updated[updated.length - 1] = {
                      ...last,
                      toolCalls: [...(last.toolCalls || []), toolCall],
                    }
                  }
                  return updated
                })
                break
              }

              case 'tool_result': {
                setMessages((prev) => {
                  const updated = [...prev]
                  const last = updated[updated.length - 1]
                  if (last && last.role === 'assistant' && last.toolCalls) {
                    const tc = last.toolCalls[last.toolCalls.length - 1]
                    if (tc && !tc.output) {
                      tc.output = event.output
                    }
                    if (event.output && 'columns' in event.output) {
                      updated[updated.length - 1] = {
                        ...last,
                        resultTable: event.output as unknown as ExecuteSqlOutput,
                      }
                    } else {
                      updated[updated.length - 1] = { ...last }
                    }
                  }
                  return updated
                })
                break
              }

              case 'tool_error': {
                setMessages((prev) => {
                  const updated = [...prev]
                  const last = updated[updated.length - 1]
                  if (last && last.role === 'assistant' && last.toolCalls) {
                    const tc = last.toolCalls[last.toolCalls.length - 1]
                    if (tc && !tc.error) {
                      tc.error = event.error
                    }
                    updated[updated.length - 1] = { ...last }
                  }
                  return updated
                })
                break
              }

              case 'retry': {
                setMessages((prev) => {
                  const updated = [...prev]
                  const last = updated[updated.length - 1]
                  if (last && last.role === 'assistant') {
                    updated[updated.length - 1] = {
                      ...last,
                      reasoning: (last.reasoning || '') + `\n[Retry: ${event.reason || ''}]`,
                    }
                  }
                  return updated
                })
                break
              }

              case 'answer': {
                const answerText = event.content || ''
                setMessages((prev) => {
                  const updated = [...prev]
                  const last = updated[updated.length - 1]
                  if (last && last.role === 'assistant') {
                    updated[updated.length - 1] = {
                      ...last,
                      content: answerText,
                    }
                  }
                  return updated
                })
                break
              }

              case 'error': {
                setMessages((prev) => {
                  const updated = [...prev]
                  const last = updated[updated.length - 1]
                  if (last && last.role === 'assistant') {
                    updated[updated.length - 1] = {
                      ...last,
                      content: event.error || 'An error occurred',
                    }
                  }
                  return updated
                })
                break
              }
            }
          } catch {
            // Skip malformed events
          }
        }
      }
    } catch (err: any) {
      if (err.name === 'AbortError') return
      setMessages((prev) => {
        const updated = [...prev]
        const last = updated[updated.length - 1]
        if (last && last.role === 'assistant') {
          updated[updated.length - 1] = {
            ...last,
            content: err.message || 'Failed to send message',
          }
        }
        return updated
      })
    } finally {
      setIsStreaming(false)
      abortControllerRef.current = null
    }
  }

  function handleSelectQuestion(text: string) {
    setInput(text)
  }

  return (
    <div className="w-[520px] h-full bg-card border-l border-border flex flex-col overflow-hidden">
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-border shrink-0">
        <div className="flex items-center gap-2 min-w-0">
          <Bot className="w-4 h-4 text-muted-foreground" />
          <span className="text-sm font-semibold text-foreground">Schema Chat</span>
        </div>
        <button
          onClick={onClose}
          className="p-1 rounded text-muted-foreground hover:text-foreground hover:bg-secondary transition-colors"
        >
          <X className="w-4 h-4" />
        </button>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto py-3 space-y-3">
        {messages.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full text-center px-6">
            <div className="w-12 h-12 rounded-xl bg-primary/10 border border-primary/20 flex items-center justify-center mb-3">
              <Bot className="w-6 h-6 text-primary" />
            </div>
            <p className="text-sm font-medium text-foreground mb-1">
              Ask about your schema
            </p>
            <p className="text-xs text-muted-foreground leading-relaxed">
              Ask questions about your database schema, write SQL queries, or get insights about your data model.
            </p>
          </div>
        ) : (
          <>
            {messages.map((msg, i) => (
              <ChatMessage
                key={i}
                role={msg.role}
                content={msg.content}
                toolCalls={msg.toolCalls}
                reasoning={msg.reasoning}
                resultTable={msg.resultTable}
                isStreaming={isStreaming && i === messages.length - 1}
              />
            ))}
          </>
        )}
        <div ref={messagesEndRef} />
      </div>

      {/* Suggested questions */}
      {messages.length === 0 && (
        <ChatSuggestedQuestions
          onSelect={handleSelectQuestion}
          schemaTables={schema.tables}
        />
      )}

      {/* Input */}
      <ChatInput
        value={input}
        onChange={setInput}
        onSend={handleSend}
        disabled={isStreaming}
      />
    </div>
  )
}
