import type { AudioEngine } from "./AudioEngine.js";
export type Viseme = "sil" | "PP" | "FF" | "TH" | "DD" | "kk" | "CH" | "SS" | "nn" | "RR" | "aa" | "E" | "ih" | "oh" | "ou";
export declare class LipSync {
    private readonly audioEngine;
    private readonly onMouth;
    private rafId;
    constructor(audioEngine: AudioEngine, onMouth: (shape: number) => void);
    setViseme(viseme: Viseme): void;
    setMouth(shape: number): void;
    setVolume(volume: number): void;
    startAutoSync(): void;
    stopAutoSync(): void;
}
//# sourceMappingURL=LipSync.d.ts.map