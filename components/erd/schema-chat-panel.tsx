'use client'

import { useState, useRef, useEffect, useCallback } from 'react'
import { X, Bot, Plus, History, Trash2 } from 'lucide-react'
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

interface ConversationSummary {
  id: string
  title: string
  createdAt: string
  updatedAt: string
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
  const [conversationId, setConversationId] = useState<string | null>(null)
  const [showHistory, setShowHistory] = useState(false)
  const [conversations, setConversations] = useState<ConversationSummary[]>([])
  const [loadingHistory, setLoadingHistory] = useState(false)
  const abortControllerRef = useRef<AbortController | null>(null)
  const messagesEndRef = useRef<HTMLDivElement>(null)
  const messagesRef = useRef(messages)
  messagesRef.current = messages

  const scrollToBottom = useCallback(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [])

  useEffect(() => {
    scrollToBottom()
  }, [messages, scrollToBottom])

  // Auto-create a conversation on first send
  async function ensureConversation(): Promise<string> {
    if (conversationId) return conversationId
    const res = await fetch('/api/schema-chat/conversations', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ schemaId }),
    })
    if (!res.ok) throw new Error('Failed to create conversation')
    const conv = await res.json()
    setConversationId(conv.id)
    return conv.id
  }

  // Auto-save messages to DB
  async function saveMessages() {
    const cid = conversationId
    if (!cid) return
    const msgs = messagesRef.current
    // Derive title from first user message
    const firstUserMsg = msgs.find((m) => m.role === 'user')
    const title = firstUserMsg
      ? firstUserMsg.content.length > 60
        ? firstUserMsg.content.slice(0, 60) + '…'
        : firstUserMsg.content
      : 'New Chat'

    await fetch(`/api/schema-chat/conversations/${cid}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ messages: msgs, title }),
    })
  }

  // Load conversation from history
  async function loadConversation(id: string) {
    abortControllerRef.current?.abort()
    setIsStreaming(false)
    setShowHistory(false)
    setConversationId(id)
    setMessages([])

    const res = await fetch(`/api/schema-chat/conversations/${id}`, { method: 'GET' })
    if (!res.ok) return
    const data = await res.json()

    setConversationId(data.id)
    setMessages(
      data.messages.map((m: any) => ({
        role: m.role,
        content: m.content || '',
        toolCalls: m.toolCalls || [],
        reasoning: m.reasoning || '',
        resultTable: m.resultTable || undefined,
      })),
    )
  }

  // New conversation
  async function newConversation() {
    abortControllerRef.current?.abort()
    setIsStreaming(false)
    setConversationId(null)
    setMessages([])
    setInput('')
    setShowHistory(false)
  }

  // Delete conversation
  async function deleteConversation(id: string, e: React.MouseEvent) {
    e.stopPropagation()
    await fetch(`/api/schema-chat/conversations/${id}`, { method: 'DELETE' })
    setConversations((prev) => prev.filter((c) => c.id !== id))
    if (conversationId === id) {
      setConversationId(null)
      setMessages([])
    }
  }

  // Load history list
  async function toggleHistory() {
    const next = !showHistory
    setShowHistory(next)
    if (next) {
      setLoadingHistory(true)
      try {
        const res = await fetch(`/api/schema-chat/conversations?schemaId=${schemaId}`, { method: 'GET' })
        if (res.ok) setConversations(await res.json())
      } finally {
        setLoadingHistory(false)
      }
    }
  }

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
    const msg = input.trim()
    setInput('')
    setIsStreaming(true)

    const abortController = new AbortController()
    abortControllerRef.current = abortController

    try {
      // Create conversation on first send
      let cid = conversationId
      if (!cid) {
        cid = await ensureConversation()
      }

      const currentMessages = messagesRef.current
      const history = [...currentMessages, userMessage].map((m) => ({
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
          message: msg,
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

      // Auto-save after streaming completes
      saveMessages()
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
          <Bot className="w-4 h-4 text-muted-foreground shrink-0" />
          <span className="text-sm font-semibold text-foreground">Schema Chat</span>
        </div>
        <div className="flex items-center gap-1">
          <button
            onClick={newConversation}
            disabled={isStreaming}
            title="New chat"
            className="p-1.5 rounded text-muted-foreground hover:text-foreground hover:bg-secondary transition-colors disabled:opacity-40"
          >
            <Plus className="w-4 h-4" />
          </button>
          <button
            onClick={toggleHistory}
            title="Conversation history"
            className={`p-1.5 rounded transition-colors ${
              showHistory
                ? 'text-primary bg-primary/10'
                : 'text-muted-foreground hover:text-foreground hover:bg-secondary'
            }`}
          >
            <History className="w-4 h-4" />
          </button>
          <button
            onClick={onClose}
            className="p-1 rounded text-muted-foreground hover:text-foreground hover:bg-secondary transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      </div>

      {showHistory && (
        <div className="border-b border-border max-h-48 overflow-y-auto">
          {loadingHistory ? (
            <div className="px-4 py-3 text-xs text-muted-foreground">Loading...</div>
          ) : conversations.length === 0 ? (
            <div className="px-4 py-3 text-xs text-muted-foreground">No previous conversations</div>
          ) : (
            conversations.map((c) => (
              <div
                key={c.id}
                onClick={() => loadConversation(c.id)}
                className={`flex items-center gap-2 px-4 py-2 cursor-pointer text-xs hover:bg-secondary/50 transition-colors group ${
                  conversationId === c.id ? 'bg-primary/5 border-l-2 border-primary' : 'border-l-2 border-transparent'
                }`}
              >
                <Bot className="w-3.5 h-3.5 text-muted-foreground shrink-0" />
                <span className="flex-1 truncate text-foreground">{c.title}</span>
                <button
                  onClick={(e) => deleteConversation(c.id, e)}
                  className="p-0.5 rounded text-muted-foreground/40 hover:text-red-400 hover:bg-red-500/10 opacity-0 group-hover:opacity-100 transition-all"
                  title="Delete"
                >
                  <Trash2 className="w-3 h-3" />
                </button>
              </div>
            ))
          )}
        </div>
      )}

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
      {messages.length === 0 && !showHistory && (
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
