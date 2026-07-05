import { describe, it, expect, vi, beforeEach, afterEach } from "vitest"
import { AudioEngine } from "./AudioEngine.js"

// ── Web Audio API mock ────────────────────────────────────────────────────────

function createAudioContextMock() {
  // Single shared source — createBufferSource always returns this same object
  const source = {
    buffer: null as unknown,
    onended: null as (() => void) | null,
    connect: vi.fn(),
    disconnect: vi.fn(),
    start: vi.fn(),
    stop: vi.fn(),
  }

  const analyser = {
    fftSize: 0,
    smoothingTimeConstant: 0,
    frequencyBinCount: 4,
    getFloatTimeDomainData: vi.fn((arr: Float32Array) => arr.fill(0)),
    connect: vi.fn(),
  }

  const gain = { connect: vi.fn() }

  const ctx = {
    state: "running" as AudioContextState,
    destination: {} as AudioDestinationNode,
    createAnalyser: vi.fn(() => analyser),
    createGain: vi.fn(() => gain),
    createBufferSource: vi.fn(() => source),
    // async mock — needs multiple microtask ticks to resolve through the chain
    decodeAudioData: vi.fn(async (_buf: ArrayBuffer) => ({}) as AudioBuffer),
    resume: vi.fn(),
    suspend: vi.fn(),
    close: vi.fn(),
  }

  return { ctx, source, analyser, gain }
}

// Drain enough microtask ticks for the async play() chain to complete its setup.
// The chain is: play() → await _toBuffer() → await decodeAudioData() → set source.onended
// Each `async` level + thenable unwrapping takes 1-2 microtask ticks → use 8 to be safe.
async function drainMicrotasks(n = 8) {
  for (let i = 0; i < n; i++) await Promise.resolve()
}

describe("AudioEngine", () => {
  let engine: AudioEngine
  let ctxMock: ReturnType<typeof createAudioContextMock>["ctx"]
  let sourceMock: ReturnType<typeof createAudioContextMock>["source"]
  let analyserMock: ReturnType<typeof createAudioContextMock>["analyser"]
  let gainMock: ReturnType<typeof createAudioContextMock>["gain"]

  beforeEach(() => {
    const mocks = createAudioContextMock()
    ctxMock = mocks.ctx
    sourceMock = mocks.source
    analyserMock = mocks.analyser
    gainMock = mocks.gain

    // jsdom does not implement Web Audio API — stub the globals we need
    vi.stubGlobal("AudioContext", vi.fn(() => ctxMock))
    vi.stubGlobal("AudioBuffer", class AudioBuffer {})

    engine = new AudioEngine()
  })

  afterEach(() => {
    vi.unstubAllGlobals()
    vi.restoreAllMocks()
  })

  // Start a play, wait for source to be wired up, then fire onended → resolves play()
  async function playAndEnd(audio: ArrayBuffer = new ArrayBuffer(8)) {
    const promise = engine.play(audio)
    await drainMicrotasks()
    sourceMock.onended?.()
    await promise
  }

  describe("getAmplitude", () => {
    it("returns 0 when no analyser is set up", () => {
      expect(engine.getAmplitude()).toBe(0)
    })

    it("returns RMS of the time-domain data after play", async () => {
      // Constant 0.5 in every sample → RMS = 0.5
      analyserMock.getFloatTimeDomainData.mockImplementation((arr: Float32Array) => arr.fill(0.5))
      await playAndEnd()
      expect(engine.getAmplitude()).toBeCloseTo(0.5, 2)
    })
  })

  describe("stop", () => {
    it("does not throw when nothing is playing", () => {
      expect(() => engine.stop()).not.toThrow()
    })

    it("calls source.stop() when stopping active playback", async () => {
      const promise = engine.play(new ArrayBuffer(8))
      await drainMicrotasks()
      engine.stop()
      sourceMock.onended?.()
      await promise
      expect(sourceMock.stop).toHaveBeenCalled()
    })
  })

  describe("pause / resume", () => {
    it("pause() calls context.suspend()", async () => {
      await playAndEnd()
      engine.pause()
      expect(ctxMock.suspend).toHaveBeenCalled()
    })

    it("resume() calls context.resume()", async () => {
      await playAndEnd()
      await engine.resume()
      expect(ctxMock.resume).toHaveBeenCalled()
    })
  })

  describe("onEnded", () => {
    it("fires the onEnded callback when playback finishes", async () => {
      const onEnded = vi.fn()
      engine.onEnded = onEnded
      await playAndEnd()
      expect(onEnded).toHaveBeenCalledOnce()
    })
  })

  describe("dispose", () => {
    it("does not throw when called without prior play", () => {
      expect(() => engine.dispose()).not.toThrow()
    })

    it("calls context.close() after play", async () => {
      await playAndEnd()
      engine.dispose()
      expect(ctxMock.close).toHaveBeenCalled()
    })

    it("getAmplitude() returns 0 after dispose", async () => {
      await playAndEnd()
      engine.dispose()
      expect(engine.getAmplitude()).toBe(0)
    })
  })

  describe("play", () => {
    it("wires audio graph: source → analyser → gain", async () => {
      await playAndEnd()
      expect(sourceMock.connect).toHaveBeenCalledWith(analyserMock)
      expect(analyserMock.connect).toHaveBeenCalledWith(gainMock)
    })

    it("accepts an AudioBuffer directly (skips decodeAudioData)", async () => {
      const AudioBufferClass = globalThis.AudioBuffer as new () => AudioBuffer
      const buf = new AudioBufferClass()
      const promise = engine.play(buf)
      await drainMicrotasks()
      sourceMock.onended?.()
      await promise
      expect(ctxMock.decodeAudioData).not.toHaveBeenCalled()
      expect(sourceMock.start).toHaveBeenCalled()
    })

    it("stops previous source before starting a new one", async () => {
      // Start first play and let decodeAudioData resolve + source be wired up
      engine.play(new ArrayBuffer(8))
      await drainMicrotasks()
      // Now source is set up. Start second play — _stopSource() should call stop()
      engine.play(new ArrayBuffer(8))
      expect(sourceMock.stop).toHaveBeenCalled()
    })
  })
})
