import type { AudioEngine } from "./AudioEngine.js"

export type Viseme =
  | "sil" | "PP" | "FF" | "TH" | "DD" | "kk"
  | "CH"  | "SS" | "nn" | "RR" | "aa" | "E"
  | "ih"  | "oh" | "ou"

// Approximate mouth openness per viseme (0 = closed, 1 = fully open)
const VISEME_MOUTH: Record<Viseme, number> = {
  sil: 0,   // silence
  PP:  0.05, // p, b, m
  FF:  0.2,  // f, v
  TH:  0.25, // th
  DD:  0.3,  // d, t
  kk:  0.35, // k, g
  CH:  0.5,  // ch, j
  SS:  0.2,  // s, z
  nn:  0.15, // n, l
  RR:  0.4,  // r
  aa:  1.0,  // a (open)
  E:   0.7,  // e
  ih:  0.5,  // i
  oh:  0.85, // o
  ou:  0.6,  // u
}

export class LipSync {
  private rafId = 0

  constructor(
    private readonly audioEngine: AudioEngine,
    private readonly onMouth: (shape: number) => void,
  ) {}

  // Manual viseme — maps phoneme to mouth openness
  setViseme(viseme: Viseme): void {
    this.onMouth(VISEME_MOUTH[viseme] ?? 0)
  }

  // Direct mouth shape override (0–1)
  setMouth(shape: number): void {
    this.onMouth(Math.max(0, Math.min(1, shape)))
  }

  // Drive mouth from a volume value (0–1), e.g. from external TTS
  setVolume(volume: number): void {
    this.onMouth(Math.max(0, Math.min(1, volume)))
  }

  // Auto lip sync: reads amplitude from AudioEngine every frame via RAF
  startAutoSync(): void {
    this.stopAutoSync()
    const loop = () => {
      const amp = this.audioEngine.getAmplitude()
      // Amplify RMS to a visible range and smooth it
      this.onMouth(Math.min(1, amp * 10))
      this.rafId = requestAnimationFrame(loop)
    }
    this.rafId = requestAnimationFrame(loop)
  }

  stopAutoSync(): void {
    cancelAnimationFrame(this.rafId)
    this.rafId = 0
    this.onMouth(0)
  }
}
