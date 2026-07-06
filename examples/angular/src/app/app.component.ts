import { Component, OnInit, OnDestroy, ViewChild, ElementRef } from "@angular/core"
import { CommonModule } from "@angular/common"
import { Avatar } from "@mymosdk/avatar"
import type { AvatarPosition, AvatarFraming, AvatarTheme } from "@mymosdk/avatar"

const MODEL = "/Maya.vrm"
const INITIAL_FRAMING: AvatarFraming = "full"
const INITIAL_THEME: AvatarTheme = "dark"

const FRAMING_CONFIG = {
  full: { from: 0.00, lookBias: 0.50 },
  half: { from: 0.48, lookBias: 0.60 },
  bust: { from: 0.60, lookBias: 0.70 },
  face: { from: 0.76, lookBias: 0.58 },
}
const THEME_CONFIG = {
  dark:  { background: "radial-gradient(circle at 40% 35%, #2a2a4a 0%, #0d0d1a 100%)", boxShadow: "0 8px 32px rgba(0,0,0,0.5), 0 0 0 2px rgba(255,255,255,0.08)" },
  light: { background: "radial-gradient(circle at 40% 35%, #f8f8ff 0%, #e0e0f0 100%)", boxShadow: "0 8px 32px rgba(0,0,0,0.15), 0 0 0 2px rgba(0,0,0,0.06)" },
}

@Component({
  selector: "app-root",
  standalone: true,
  imports: [CommonModule],
  templateUrl: "./app.component.html",
  styleUrls: ["./app.component.css"],
})
export class AppComponent implements OnInit, OnDestroy {
  private avatar!: Avatar
  private ampRAF = 0
  private logTimer: ReturnType<typeof setTimeout> | undefined

  logMsg    = "Initializing avatar..."
  logActive = false
  talkingVisible = false
  debugOverlay = false
  debugBones   = false
  debugAxes    = false
  sizeValue = 400
  activeFraming: string = INITIAL_FRAMING
  activeTheme: string   = INITIAL_THEME
  showTcPanel = true
  currentThemeMode: "dark" | "light" = INITIAL_THEME as "dark" | "light"

  framingSlices: Record<string, { from: number; lookBias: number }> = {
    full: { ...FRAMING_CONFIG.full },
    half: { ...FRAMING_CONFIG.half },
    bust: { ...FRAMING_CONFIG.bust },
    face: { ...FRAMING_CONFIG.face },
  }
  themeSlices: Record<string, { color1: string; color2: string; shadowOpacity: number }> = {
    dark:  { color1: "#2a2a4a", color2: "#0d0d1a", shadowOpacity: 0.5  },
    light: { color1: "#f8f8ff", color2: "#e0e0f0", shadowOpacity: 0.15 },
  }

  get fcCurrent() { return this.framingSlices[this.activeFraming] }
  get tcCurrent() { return this.themeSlices[this.currentThemeMode] }

  ttsProvider      = "openai"
  ttsApiKey        = ""
  ttsVoice         = "nova"
  ttsText          = "Hello! I'm your Mymo avatar. How can I help you today?"
  ttsBusy          = false
  ttsStatus        = ""
  ttsStatusColor   = "#555"
  readonly ttsOpenAIVoices = ["alloy","echo","fable","nova","onyx","shimmer"]

  // ── Chat Demo ──────────────────────────────────────────────────────────────
  chatHistory: Array<{ role: "user" | "assistant"; content: string }> = []
  chatApiKey        = ""
  chatModel         = "claude-sonnet-4-6"
  chatSystem        = "You are a helpful assistant."
  chatTts           = false
  chatInput         = ""
  chatBusy          = false
  chatStatus        = ""
  chatStatusColor   = "#555"
  @ViewChild("chatMessagesRef") chatMessagesRef?: ElementRef<HTMLElement>
  readonly chatModels = ["claude-sonnet-4-6", "claude-haiku-4-5-20251001", "claude-opus-4-7"]

  readonly expressions = ["smile","happy","sad","angry","surprised","thinking","confused","sleep","idle"]
  readonly gestures    = ["wave","nod","yes","no","shakeHead","clap","jump","dance","thumbsUp"]
  readonly states      = ["loading","success","error","warning","listening","typing","processing","complete","clearState"]
  readonly positions   = ["bottom-right","bottom-left","top-right","top-left"] as AvatarPosition[]
  readonly framings    = ["full","half","bust","face"] as AvatarFraming[]
  readonly themes      = ["light","dark","transparent"] as AvatarTheme[]

  ngOnInit(): void {
    this.avatar = new Avatar({
      model: MODEL,
      framing: INITIAL_FRAMING,
      position: "bottom-right",
      size: 400,
      theme: INITIAL_THEME,
      idle: true,
      idleInterval: 6000,
      blink: true,
      blinkInterval: 3000,
      lipSync: true,
      draggable: true,
      zIndex: 9999,
      framingConfig: FRAMING_CONFIG,
      themeConfig: THEME_CONFIG,
    })

    this.avatar
      .on("loaded",         ()        => this.setLog("Avatar loaded ✓", true))
      .on("modelLoaded",    ()        => this.setLog("Model ready ✓", true))
      .on("click",          ()        => { this.avatar.wave(); this.setLog("avatar.wave()", true) })
      .on("animationStart", (_, data) => this.setLog(`animationStart: ${JSON.stringify(data)}`, true))
      .on("speechStart",    ()        => { this.setLog("speechStart — talking…"); this.talkingVisible = true;  this.startAmpViz() })
      .on("speechEnd",      ()        => { this.setLog("speechEnd ✓", true);       this.talkingVisible = false; this.stopAmpViz()  })
  }

  ngOnDestroy(): void {
    this.avatar?.destroy()
    cancelAnimationFrame(this.ampRAF)
    clearTimeout(this.logTimer)
  }

  private setLog(msg: string, active = false): void {
    this.logMsg    = msg
    this.logActive = active
    if (active) {
      clearTimeout(this.logTimer)
      this.logTimer = setTimeout(() => { this.logActive = false }, 2000)
    }
  }

  private buildThemeConfig(mode: "dark" | "light") {
    const { color1, color2, shadowOpacity } = this.themeSlices[mode]
    const ringOpacity = mode === "dark" ? 0.08 : 0.06
    const ringColor   = mode === "dark" ? "255,255,255" : "0,0,0"
    return {
      background: `radial-gradient(circle at 40% 35%, ${color1} 0%, ${color2} 100%)`,
      boxShadow:  `0 8px 32px rgba(0,0,0,${shadowOpacity}), 0 0 0 2px rgba(${ringColor},${ringOpacity})`,
    }
  }

  private startAmpViz(): void {
    const tick = () => { this.ampRAF = requestAnimationFrame(tick) }
    tick()
  }
  private stopAmpViz(): void { cancelAnimationFrame(this.ampRAF) }

  private async loadDemoAudio(): Promise<AudioBuffer> {
    const ctx = new AudioContext()
    const res = await fetch("/demo_voice_example.mp3")
    return ctx.decodeAudioData(await res.arrayBuffer())
  }

  doAction(action: string): void {
    this.setLog(`avatar.${action}()`, true)
    const a = this.avatar
    const map: Record<string, () => void> = {
      smile:     () => a.smile(),
      happy:     () => a.happy(),
      sad:       () => a.sad(),
      angry:     () => a.angry(),
      surprised: () => a.surprised(),
      thinking:  () => a.thinking(),
      confused:  () => a.confused(),
      sleep:     () => a.sleep(),
      idle:      () => a.idle(),
      wave:      () => a.wave(),
      nod:       () => a.nod(),
      yes:       () => a.yes(),
      no:        () => a.no(),
      shakeHead: () => a.shakeHead(),
      clap:      () => a.clap(),
      jump:      () => a.jump(),
      dance:     () => a.dance(),
      thumbsUp:  () => a.thumbsUp(),
      loading:    () => a.loading(),
      success:    () => a.success(),
      error:      () => a.error(),
      warning:    () => a.warning(),
      listening:  () => a.listening(),
      typing:     () => a.typing(),
      processing: () => a.processing(),
      complete:   () => a.complete(),
      clearState: () => a.clearState(),
      lookAtMouse:  () => a.lookAtMouse(),
      lookForward:  () => a.lookForward(),
      randomLook:   () => a.randomLook(),
      talk:         () => this.loadDemoAudio().then(b => a.talk(b)).catch(console.error),
      stopTalking:  () => a.stopTalking(),
    }
    map[action]?.()
  }

  doPosition(pos: AvatarPosition): void {
    this.avatar.position(pos)
    this.setLog(`avatar.position("${pos}")`, true)
  }

  doFrame(framing: AvatarFraming): void {
    this.activeFraming = framing
    this.avatar.frame(framing)
    this.setLog(`avatar.frame("${framing}")`, true)
  }

  doTheme(theme: AvatarTheme): void {
    this.activeTheme = theme
    this.avatar.setTheme(theme)
    if (theme === "transparent") {
      this.showTcPanel = false
    } else {
      this.currentThemeMode = theme as "dark" | "light"
      this.showTcPanel = true
    }
    this.setLog(`avatar.setTheme("${theme}")`, true)
  }

  onSizeInput(e: Event): void {
    const px = parseInt((e.target as HTMLInputElement).value, 10)
    this.sizeValue = px
    this.avatar.size(px)
    this.setLog(`avatar.size(${px})`, true)
  }

  onFcFromInput(e: Event): void {
    const v = parseFloat((e.target as HTMLInputElement).value)
    this.framingSlices[this.activeFraming].from = v
    this.framingSlices = { ...this.framingSlices }
    this.avatar.setFramingConfig({ [this.activeFraming]: this.framingSlices[this.activeFraming] })
    this.setLog(`framingConfig.${this.activeFraming}.from = ${v.toFixed(2)}`, true)
  }

  onFcBiasInput(e: Event): void {
    const v = parseFloat((e.target as HTMLInputElement).value)
    this.framingSlices[this.activeFraming].lookBias = v
    this.framingSlices = { ...this.framingSlices }
    this.avatar.setFramingConfig({ [this.activeFraming]: this.framingSlices[this.activeFraming] })
    this.setLog(`framingConfig.${this.activeFraming}.lookBias = ${v.toFixed(2)}`, true)
  }

  onTcColor1Input(e: Event): void {
    const v = (e.target as HTMLInputElement).value
    this.themeSlices[this.currentThemeMode].color1 = v
    this.themeSlices = { ...this.themeSlices }
    this.avatar.setThemeConfig({ [this.currentThemeMode]: this.buildThemeConfig(this.currentThemeMode) })
    this.setLog(`themeConfig.${this.currentThemeMode}.center = ${v}`, true)
  }

  onTcColor2Input(e: Event): void {
    const v = (e.target as HTMLInputElement).value
    this.themeSlices[this.currentThemeMode].color2 = v
    this.themeSlices = { ...this.themeSlices }
    this.avatar.setThemeConfig({ [this.currentThemeMode]: this.buildThemeConfig(this.currentThemeMode) })
    this.setLog(`themeConfig.${this.currentThemeMode}.edge = ${v}`, true)
  }

  onTcShadowInput(e: Event): void {
    const v = parseFloat((e.target as HTMLInputElement).value)
    this.themeSlices[this.currentThemeMode].shadowOpacity = v
    this.themeSlices = { ...this.themeSlices }
    this.avatar.setThemeConfig({ [this.currentThemeMode]: this.buildThemeConfig(this.currentThemeMode) })
    this.setLog(`themeConfig.${this.currentThemeMode}.shadow = ${v.toFixed(2)}`, true)
  }

  onTtsProviderChange(e: Event): void {
    this.ttsProvider = (e.target as HTMLSelectElement).value
    this.ttsVoice = this.ttsProvider === "openai" ? "nova" : ""
  }

  async ttsSpeak(): Promise<void> {
    const text = this.ttsText.trim()
    if (!text) return
    this.ttsBusy = true
    this.ttsStatus = "Generating audio…"
    this.ttsStatusColor = "#60a5fa"
    try {
      const audio = await this.fetchTTSAudio(this.ttsProvider, this.ttsApiKey, this.ttsVoice, text)
      this.ttsStatus = "Playing…"
      await this.avatar.talk(audio)
      this.ttsStatus = "Done ✓"
      this.ttsStatusColor = "#a78bfa"
      setTimeout(() => { this.ttsStatus = "" }, 2000)
    } catch (err) {
      this.ttsStatus = `Error: ${err instanceof Error ? err.message : String(err)}`
      this.ttsStatusColor = "#f87171"
    } finally {
      this.ttsBusy = false
    }
  }

  private async streamAnthropicSSE(
    messages: Array<{ role: "user" | "assistant"; content: string }>
  ): Promise<string> {
    if (!this.chatApiKey.trim()) throw new Error("Paste your Anthropic API key first")
    const res = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: {
        "x-api-key": this.chatApiKey,
        "anthropic-version": "2023-06-01",
        "anthropic-dangerous-direct-browser-access": "true",
        "content-type": "application/json",
      },
      body: JSON.stringify({
        model: this.chatModel,
        max_tokens: 1024,
        system: this.chatSystem || "You are a helpful assistant.",
        stream: true,
        messages,
      }),
    })
    if (!res.ok) {
      const err = await res.json().catch(() => ({})) as { error?: { message?: string } }
      throw new Error(err.error?.message ?? `Anthropic error ${res.status}`)
    }
    const reader = res.body!.getReader()
    const decoder = new TextDecoder()
    let fullText = ""
    let buffer = ""
    while (true) {
      const { done, value } = await reader.read()
      if (done) break
      buffer += decoder.decode(value, { stream: true })
      const lines = buffer.split("\n")
      buffer = lines.pop() ?? ""
      for (const line of lines) {
        if (!line.startsWith("data: ")) continue
        const data = line.slice(6).trim()
        if (data === "[DONE]") break
        try {
          const evt = JSON.parse(data)
          if (evt.type === "content_block_delta" && evt.delta?.type === "text_delta") {
            fullText += evt.delta.text
          }
        } catch {}
      }
    }
    return fullText
  }

  async handleChatSend(): Promise<void> {
    const text = this.chatInput.trim()
    if (!text || this.chatBusy) return
    this.chatBusy = true
    this.chatHistory = [...this.chatHistory, { role: "user", content: text }]
    this.chatInput = ""
    this.chatStatus = "Thinking…"
    this.chatStatusColor = "#60a5fa"
    this.avatar.typing()
    if (this.chatMessagesRef) this.chatMessagesRef.nativeElement.scrollTop = this.chatMessagesRef.nativeElement.scrollHeight
    try {
      const reply = await this.streamAnthropicSSE(
        this.chatHistory.map(m => ({ role: m.role, content: m.content }))
      )
      this.chatHistory = [...this.chatHistory, { role: "assistant", content: reply }]
      this.chatStatus = ""
      this.avatar.clearState()
      if (this.chatMessagesRef) this.chatMessagesRef.nativeElement.scrollTop = this.chatMessagesRef.nativeElement.scrollHeight
      if (this.chatTts) {
        try {
          const audio = await this.fetchTTSAudio(this.ttsProvider, this.ttsApiKey, this.ttsVoice, reply)
          await this.avatar.talk(audio)
        } catch (e) {
          this.chatStatus = `TTS error: ${e instanceof Error ? e.message : String(e)}`
          this.chatStatusColor = "#f87171"
        }
      }
    } catch (err) {
      this.chatStatus = `Error: ${err instanceof Error ? err.message : String(err)}`
      this.chatStatusColor = "#f87171"
      this.avatar.clearState()
    } finally {
      this.chatBusy = false
    }
  }

  clearChat(): void {
    this.chatHistory = []
    this.chatStatus = ""
    this.chatStatusColor = "#555"
  }

  onChatKeydown(e: KeyboardEvent): void {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault()
      this.handleChatSend()
    }
  }

  toggleDebug(target: 'overlay' | 'bones' | 'axes'): void {
    const a = this.avatar
    if (target === 'overlay') {
      this.debugOverlay = !this.debugOverlay
      a.debug(this.debugOverlay)
      this.setLog(`avatar.debug(${this.debugOverlay})`, true)
    } else if (target === 'bones') {
      this.debugBones = !this.debugBones
      a.debugBones(this.debugBones)
      this.setLog(`avatar.debugBones(${this.debugBones})`, true)
    } else {
      this.debugAxes = !this.debugAxes
      a.debugAxes(this.debugAxes)
      this.setLog(`avatar.debugAxes(${this.debugAxes})`, true)
    }
  }

  private async fetchTTSAudio(provider: string, apiKey: string, voice: string, text: string): Promise<ArrayBuffer> {
    const ELEVENLABS_DEFAULT_VOICE = "21m00Tcm4TlvDq8ikWAM"
    if (!apiKey.trim()) throw new Error("Paste your API key first")
    if (provider === "openai") {
      const res = await fetch("https://api.openai.com/v1/audio/speech", {
        method: "POST",
        headers: { Authorization: `Bearer ${apiKey}`, "Content-Type": "application/json" },
        body: JSON.stringify({ model: "tts-1", voice, input: text }),
      })
      if (!res.ok) {
        const err = await res.json().catch(() => ({})) as { error?: { message?: string } }
        throw new Error(err.error?.message ?? `OpenAI error ${res.status}`)
      }
      return res.arrayBuffer()
    }
    const voiceId = voice.trim() || ELEVENLABS_DEFAULT_VOICE
    const res = await fetch(`https://api.elevenlabs.io/v1/text-to-speech/${voiceId}`, {
      method: "POST",
      headers: { "xi-api-key": apiKey, "Content-Type": "application/json", Accept: "audio/mpeg" },
      body: JSON.stringify({ text, model_id: "eleven_multilingual_v2", voice_settings: { stability: 0.5, similarity_boost: 0.75 } }),
    })
    if (!res.ok) throw new Error(`ElevenLabs error ${res.status}`)
    return res.arrayBuffer()
  }
}
