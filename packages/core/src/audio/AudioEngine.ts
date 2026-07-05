export class AudioEngine {
  private context: AudioContext | null = null
  private source: AudioBufferSourceNode | null = null
  private analyser: AnalyserNode | null = null
  private gainNode: GainNode | null = null
  private dataArray: Float32Array<ArrayBuffer> = new Float32Array(0)
  private _endedCallback: (() => void) | null = null

  private _ctx(): AudioContext {
    if (!this.context || this.context.state === "closed") {
      this.context = new AudioContext()
    }
    return this.context
  }

  async play(audio: AudioBuffer | ArrayBuffer | string): Promise<void> {
    if (typeof AudioContext === "undefined") return
    const ctx = this._ctx()

    // Resume if browser suspended the context (autoplay policy)
    if (ctx.state === "suspended") await ctx.resume()

    // Stop any current playback
    this._stopSource()

    const buffer = await this._toBuffer(ctx, audio)

    this.analyser = ctx.createAnalyser()
    this.analyser.fftSize = 512
    this.analyser.smoothingTimeConstant = 0.6
    this.dataArray = new Float32Array(this.analyser.frequencyBinCount)

    this.gainNode = ctx.createGain()

    this.source = ctx.createBufferSource()
    this.source.buffer = buffer
    this.source.connect(this.analyser)
    this.analyser.connect(this.gainNode)
    this.gainNode.connect(ctx.destination)

    return new Promise((resolve) => {
      this.source!.onended = () => {
        this._endedCallback?.()
        resolve()
      }
      this.source!.start(0)
    })
  }

  pause(): void {
    this.context?.suspend()
  }

  async resume(): Promise<void> {
    await this.context?.resume()
  }

  stop(): void {
    this._stopSource()
  }

  // RMS amplitude in 0–1 range — used by LipSync each frame
  getAmplitude(): number {
    if (!this.analyser || this.dataArray.length === 0) return 0
    this.analyser.getFloatTimeDomainData(this.dataArray)
    let sum = 0
    for (const v of this.dataArray) sum += v * v
    return Math.sqrt(sum / this.dataArray.length)
  }

  set onEnded(cb: () => void) {
    this._endedCallback = cb
  }

  private async _toBuffer(ctx: AudioContext, audio: AudioBuffer | ArrayBuffer | string): Promise<AudioBuffer> {
    if (audio instanceof AudioBuffer) return audio
    if (typeof audio === "string") {
      const resp = await fetch(audio)
      const bytes = await resp.arrayBuffer()
      return ctx.decodeAudioData(bytes)
    }
    // ArrayBuffer — clone before decode (decodeAudioData detaches the buffer)
    return ctx.decodeAudioData(audio.slice(0))
  }

  private _stopSource(): void {
    try { this.source?.stop() } catch { /* already stopped */ }
    this.source?.disconnect()
    this.source = null
  }

  dispose(): void {
    this._stopSource()
    this.context?.close()
    this.context = null
    this.analyser = null
    this.gainNode = null
  }
}
