import type { AvatarApi, AvatarPlugin } from "@mymo/avatar"

export interface ElevenLabsOptions {
  apiKey: string
  voiceId?: string
  modelId?: string
}

export interface ElevenLabsController {
  speak(text: string, overrides?: Partial<ElevenLabsOptions>): Promise<void>
}

const ELEVENLABS_API = "https://api.elevenlabs.io/v1"
const DEFAULT_VOICE = "21m00Tcm4TlvDq8ikWAM" // Rachel

export function createElevenLabsPlugin(options: ElevenLabsOptions): {
  plugin: AvatarPlugin
  controller: ElevenLabsController
} {
  let _avatar: AvatarApi | null = null

  const controller: ElevenLabsController = {
    async speak(text, overrides = {}) {
      if (!_avatar) throw new Error("[plugin-elevenlabs] Plugin not installed on an avatar")

      const apiKey  = overrides.apiKey  ?? options.apiKey
      const voiceId = overrides.voiceId ?? options.voiceId ?? DEFAULT_VOICE
      const modelId = overrides.modelId ?? options.modelId ?? "eleven_multilingual_v2"

      _avatar.setState("loading")

      const res = await fetch(`${ELEVENLABS_API}/text-to-speech/${voiceId}`, {
        method: "POST",
        headers: {
          "xi-api-key": apiKey,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ text, model_id: modelId }),
      })

      if (!res.ok) {
        _avatar.setState("error")
        throw new Error(`[plugin-elevenlabs] API error ${res.status}: ${await res.text()}`)
      }

      const arrayBuffer = await res.arrayBuffer()
      _avatar.clearState()
      await _avatar.talk(arrayBuffer)
    },
  }

  const plugin: AvatarPlugin = {
    name: "elevenlabs",
    install(avatar) {
      _avatar = avatar
    },
  }

  return { plugin, controller }
}
