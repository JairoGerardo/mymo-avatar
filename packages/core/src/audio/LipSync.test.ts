import { describe, it, expect, vi, beforeEach, afterEach } from "vitest"
import { LipSync } from "./LipSync.js"
import type { AudioEngine } from "./AudioEngine.js"

function makeMockAudio(amplitude = 0): AudioEngine {
  return { getAmplitude: vi.fn().mockReturnValue(amplitude) } as unknown as AudioEngine
}

describe("LipSync", () => {
  let onMouth: ReturnType<typeof vi.fn>
  let audio: AudioEngine
  let lipSync: LipSync

  beforeEach(() => {
    onMouth = vi.fn()
    audio = makeMockAudio(0)
    lipSync = new LipSync(audio, onMouth)
  })

  afterEach(() => {
    lipSync.stopAutoSync()
    vi.unstubAllGlobals()
    vi.restoreAllMocks()
  })

  describe("setViseme", () => {
    it("maps silence (sil) to 0", () => {
      lipSync.setViseme("sil")
      expect(onMouth).toHaveBeenCalledWith(0)
    })

    it("maps open vowel (aa) to 1.0", () => {
      lipSync.setViseme("aa")
      expect(onMouth).toHaveBeenCalledWith(1.0)
    })

    it("maps oh to 0.85", () => {
      lipSync.setViseme("oh")
      expect(onMouth).toHaveBeenCalledWith(0.85)
    })

    it("maps PP (closed stop) to 0.05", () => {
      lipSync.setViseme("PP")
      expect(onMouth).toHaveBeenCalledWith(0.05)
    })

    it("maps ih to 0.5", () => {
      lipSync.setViseme("ih")
      expect(onMouth).toHaveBeenCalledWith(0.5)
    })
  })

  describe("setMouth", () => {
    it("passes value in [0,1] directly", () => {
      lipSync.setMouth(0.6)
      expect(onMouth).toHaveBeenCalledWith(0.6)
    })

    it("clamps negative values to 0", () => {
      lipSync.setMouth(-1)
      expect(onMouth).toHaveBeenCalledWith(0)
    })

    it("clamps values above 1 to 1", () => {
      lipSync.setMouth(5)
      expect(onMouth).toHaveBeenCalledWith(1)
    })
  })

  describe("setVolume", () => {
    it("passes value in [0,1] directly", () => {
      lipSync.setVolume(0.4)
      expect(onMouth).toHaveBeenCalledWith(0.4)
    })

    it("clamps negative to 0", () => {
      lipSync.setVolume(-0.5)
      expect(onMouth).toHaveBeenCalledWith(0)
    })

    it("clamps above 1 to 1", () => {
      lipSync.setVolume(2)
      expect(onMouth).toHaveBeenCalledWith(1)
    })
  })

  describe("stopAutoSync", () => {
    it("calls onMouth(0) to close the mouth", () => {
      lipSync.stopAutoSync()
      expect(onMouth).toHaveBeenCalledWith(0)
    })

    it("is idempotent — calling twice does not throw", () => {
      expect(() => {
        lipSync.stopAutoSync()
        lipSync.stopAutoSync()
      }).not.toThrow()
    })
  })

  describe("startAutoSync", () => {
    it("reads amplitude from AudioEngine and drives the mouth callback", () => {
      let capturedCb: FrameRequestCallback | null = null
      vi.stubGlobal("requestAnimationFrame", vi.fn((cb: FrameRequestCallback) => {
        capturedCb = cb
        return 1
      }))
      vi.stubGlobal("cancelAnimationFrame", vi.fn())

      const highAudio = makeMockAudio(0.1)
      const ls = new LipSync(highAudio, onMouth)
      ls.startAutoSync()

      // Manually fire one RAF frame — avoids the recursive loop
      capturedCb!(performance.now())

      expect(onMouth).toHaveBeenCalledWith(expect.any(Number))
      const lastValue = onMouth.mock.calls[onMouth.mock.calls.length - 1][0] as number
      expect(lastValue).toBeGreaterThan(0)
      expect(lastValue).toBeLessThanOrEqual(1)

      ls.stopAutoSync()
    })

    it("amplifies amplitude ×10 and clamps the result to 1", () => {
      let capturedCb: FrameRequestCallback | null = null
      vi.stubGlobal("requestAnimationFrame", vi.fn((cb: FrameRequestCallback) => {
        capturedCb = cb
        return 1
      }))
      vi.stubGlobal("cancelAnimationFrame", vi.fn())

      // amplitude 0.2 × 10 = 2.0 → clamped to 1
      const loudAudio = makeMockAudio(0.2)
      const ls = new LipSync(loudAudio, onMouth)
      ls.startAutoSync()
      capturedCb!(performance.now())

      const lastValue = onMouth.mock.calls[onMouth.mock.calls.length - 1][0] as number
      expect(lastValue).toBe(1)

      ls.stopAutoSync()
    })

    it("cancelAnimationFrame is called on stopAutoSync", () => {
      const cancelMock = vi.fn()
      vi.stubGlobal("requestAnimationFrame", vi.fn(() => 42))
      vi.stubGlobal("cancelAnimationFrame", cancelMock)

      const ls = new LipSync(audio, onMouth)
      ls.startAutoSync()
      ls.stopAutoSync()

      expect(cancelMock).toHaveBeenCalledWith(42)
    })
  })
})
