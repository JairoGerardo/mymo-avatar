import type { AvatarApi, TTSPlugin } from "@mymosdk/avatar"

export type OpenAIVoice = "alloy" | "echo" | "fable" | "onyx" | "nova" | "shimmer"

export interface OpenAITTSOptions {
  /** Your OpenAI API key. Safe in Node.js/Electron. NEVER use in browser — use proxyUrl instead. */
  apiKey?: string
  /**
   * URL of your backend endpoint that proxies the request to OpenAI.
   * Expected: POST { text, voice, speed } → returns audio/mpeg stream.
   * Use this in browser environments to keep your API key on the server.
   */
  proxyUrl?: string
  voice?: OpenAIVoice
  model?: string
  speed?: number
}

export class OpenAITTSPlugin implements TTSPlugin {
  readonly name = "openai-tts"
  private avatar!: AvatarApi
  private opts: Required<Omit<OpenAITTSOptions, "apiKey" | "proxyUrl">> &
    Pick<OpenAITTSOptions, "apiKey" | "proxyUrl">

  constructor(options: OpenAITTSOptions = {}) {
    this.opts = {
      voice: "alloy",
      model: "tts-1",
      speed: 1.0,
      ...options,
    }

    if (typeof window !== "undefined" && options.apiKey) {
      console.warn(
        "[mymo-avatar] OpenAITTSPlugin: \"apiKey\" is visible to anyone who opens DevTools.\n" +
        "Set proxyUrl to your backend endpoint to keep the key on the server.\n" +
        "See https://github.com/JairoGerardo/mymo-avatar#-security-api-keys"
      )
    }
  }

  install(avatar: AvatarApi): void {
    this.avatar = avatar
  }

  async speak(text: string): Promise<void> {
    const audio = await this._fetchAudio(text)
    await this.avatar.talk(audio)
  }

  stop(): void {
    this.avatar.stopTalking()
  }

  private async _fetchAudio(text: string): Promise<ArrayBuffer> {
    if (this.opts.proxyUrl) {
      const res = await fetch(this.opts.proxyUrl, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ text, voice: this.opts.voice, speed: this.opts.speed }),
      })
      if (!res.ok) throw new Error(`[mymo-avatar] OpenAITTSPlugin: proxy responded ${res.status}`)
      return res.arrayBuffer()
    }

    if (this.opts.apiKey) {
      const { default: OpenAI } = await import("openai")
      const client = new OpenAI({ apiKey: this.opts.apiKey, dangerouslyAllowBrowser: true })
      const res = await client.audio.speech.create({
        model: this.opts.model,
        voice: this.opts.voice,
        input: text,
        speed: this.opts.speed,
      })
      return res.arrayBuffer()
    }

    throw new Error('[mymo-avatar] OpenAITTSPlugin: provide either "apiKey" or "proxyUrl"')
  }
}
