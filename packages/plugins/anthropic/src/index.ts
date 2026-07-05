import type { AvatarApi, AvatarPlugin, TTSPlugin } from "@mymosdk/avatar"

export interface ChatMessage {
  role: "user" | "assistant"
  content: string
}

export interface AnthropicPluginOptions {
  /** Your Anthropic API key. Safe in Node.js/Electron. NEVER use in browser — use proxyUrl instead. */
  apiKey?: string
  /**
   * URL of your backend endpoint that proxies the request to Anthropic.
   * Expected: POST { messages, system, model, max_tokens, stream: true } → SSE stream.
   * Use this in browser environments to keep your API key on the server.
   */
  proxyUrl?: string
  model?: string
  maxTokens?: number
  systemPrompt?: string
  /** Optional TTS plugin to speak the assistant response after streaming completes. */
  tts?: TTSPlugin
}

export class AnthropicPlugin implements AvatarPlugin {
  readonly name = "anthropic"
  private avatar!: AvatarApi
  private opts: AnthropicPluginOptions

  constructor(options: AnthropicPluginOptions = {}) {
    this.opts = { model: "claude-sonnet-4-6", maxTokens: 1024, ...options }

    if (typeof window !== "undefined" && options.apiKey) {
      console.warn(
        "[mymo-avatar] AnthropicPlugin: \"apiKey\" is visible to anyone who opens DevTools.\n" +
        "Set proxyUrl to your backend endpoint to keep the key on the server.\n" +
        "See https://github.com/JairoGerardo/mymo-avatar#-security-api-keys"
      )
    }
  }

  install(avatar: AvatarApi): void {
    this.avatar = avatar
  }

  /**
   * Send a message to Claude and animate the avatar while it responds.
   * Shows "typing" state during streaming, then optionally speaks via the tts plugin.
   * Returns the full assistant response text.
   */
  async chat(userMessage: string, history: ChatMessage[] = []): Promise<string> {
    this.avatar.setState("typing")

    const messages: ChatMessage[] = [...history, { role: "user", content: userMessage }]

    let fullText: string

    try {
      if (this.opts.proxyUrl) {
        fullText = await this._streamFromProxy(messages)
      } else if (this.opts.apiKey) {
        fullText = await this._streamFromAPI(messages)
      } else {
        throw new Error('[mymo-avatar] AnthropicPlugin: provide either "apiKey" or "proxyUrl"')
      }
    } finally {
      this.avatar.clearState()
    }

    if (this.opts.tts && fullText) {
      this.avatar.setState("processing")
      await this.opts.tts.speak(fullText)
      this.avatar.clearState()
    }

    return fullText
  }

  private async _streamFromProxy(messages: ChatMessage[]): Promise<string> {
    const res = await fetch(this.opts.proxyUrl!, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        messages,
        system: this.opts.systemPrompt,
        model: this.opts.model,
        max_tokens: this.opts.maxTokens,
        stream: true,
      }),
    })
    if (!res.ok) throw new Error(`[mymo-avatar] AnthropicPlugin: proxy responded ${res.status}`)
    return this._readSSEStream(res)
  }

  private async _streamFromAPI(messages: ChatMessage[]): Promise<string> {
    const { default: Anthropic } = await import("@anthropic-ai/sdk")
    const client = new Anthropic({ apiKey: this.opts.apiKey, dangerouslyAllowBrowser: true })

    const stream = client.messages.stream({
      model: this.opts.model!,
      max_tokens: this.opts.maxTokens!,
      system: this.opts.systemPrompt,
      messages,
    })

    let fullText = ""
    for await (const chunk of stream) {
      if (
        chunk.type === "content_block_delta" &&
        chunk.delta.type === "text_delta"
      ) {
        fullText += chunk.delta.text
      }
    }
    return fullText
  }

  private async _readSSEStream(res: Response): Promise<string> {
    const reader = res.body!.getReader()
    const decoder = new TextDecoder()
    let fullText = ""

    while (true) {
      const { done, value } = await reader.read()
      if (done) break
      const lines = decoder.decode(value).split("\n").filter((l) => l.startsWith("data: "))
      for (const line of lines) {
        try {
          const json = JSON.parse(line.slice(6)) as {
            type?: string
            delta?: { type?: string; text?: string }
          }
          if (json.type === "content_block_delta" && json.delta?.type === "text_delta") {
            fullText += json.delta.text ?? ""
          }
        } catch {
          // skip malformed SSE lines
        }
      }
    }

    return fullText
  }
}
