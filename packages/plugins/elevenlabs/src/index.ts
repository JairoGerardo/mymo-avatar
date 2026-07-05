import type { AvatarApi, TTSPlugin } from "@mymosdk/avatar"

const ELEVENLABS_API = "https://api.elevenlabs.io/v1"

export interface ElevenLabsOptions {
  /** Your ElevenLabs API key. Safe in Node.js/Electron. NEVER use in browser — use proxyUrl instead. */
  apiKey?: string
  /**
   * URL of your backend endpoint that proxies the request to ElevenLabs.
   * Expected: POST { text, voiceId, modelId, stability, similarityBoost } → returns audio/mpeg stream.
   * Use this in browser environments to keep your API key on the server.
   */
  proxyUrl?: string
  /** ElevenLabs voice ID. Default: Rachel (21m00Tcm4TlvDq8ikWAM) */
  voiceId?: string
  modelId?: string
  stability?: number
  similarityBoost?: number
}

export class ElevenLabsTTSPlugin implements TTSPlugin {
  readonly name = "elevenlabs-tts"
  private avatar!: AvatarApi
  private opts: Required<Omit<ElevenLabsOptions, "apiKey" | "proxyUrl">> &
    Pick<ElevenLabsOptions, "apiKey" | "proxyUrl">

  constructor(options: ElevenLabsOptions = {}) {
    this.opts = {
      voiceId: "21m00Tcm4TlvDq8ikWAM",
      modelId: "eleven_multilingual_v2",
      stability: 0.5,
      similarityBoost: 0.75,
      ...options,
    }

    if (typeof window !== "undefined" && options.apiKey) {
      console.warn(
        "[mymo-avatar] ElevenLabsTTSPlugin: \"apiKey\" is visible to anyone who opens DevTools.\n" +
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
        body: JSON.stringify({
          text,
          voiceId: this.opts.voiceId,
          modelId: this.opts.modelId,
          stability: this.opts.stability,
          similarityBoost: this.opts.similarityBoost,
        }),
      })
      if (!res.ok) throw new Error(`[mymo-avatar] ElevenLabsTTSPlugin: proxy responded ${res.status}`)
      return res.arrayBuffer()
    }

    if (this.opts.apiKey) {
      const res = await fetch(`${ELEVENLABS_API}/text-to-speech/${this.opts.voiceId}`, {
        method: "POST",
        headers: {
          "xi-api-key": this.opts.apiKey,
          "Content-Type": "application/json",
          Accept: "audio/mpeg",
        },
        body: JSON.stringify({
          text,
          model_id: this.opts.modelId,
          voice_settings: {
            stability: this.opts.stability,
            similarity_boost: this.opts.similarityBoost,
          },
        }),
      })
      if (!res.ok) throw new Error(`[mymo-avatar] ElevenLabsTTSPlugin: API responded ${res.status}`)
      return res.arrayBuffer()
    }

    throw new Error('[mymo-avatar] ElevenLabsTTSPlugin: provide either "apiKey" or "proxyUrl"')
  }
}
