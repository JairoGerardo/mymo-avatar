export declare class AudioEngine {
    private context;
    private source;
    private analyser;
    private gainNode;
    private dataArray;
    private _endedCallback;
    private _ctx;
    play(audio: AudioBuffer | ArrayBuffer | string): Promise<void>;
    pause(): void;
    resume(): Promise<void>;
    stop(): void;
    getAmplitude(): number;
    set onEnded(cb: () => void);
    private _toBuffer;
    private _stopSource;
    dispose(): void;
}
//# sourceMappingURL=AudioEngine.d.ts.map