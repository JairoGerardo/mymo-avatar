import { describe, it, expect, vi, beforeEach, afterEach } from "vitest"
import { ElevenLabsTTSPlugin } from "./index"

describe("ElevenLabsTTSPlugin — security guard", () => {
  let warnSpy: ReturnType<typeof vi.spyOn>

  beforeEach(() => {
    warnSpy = vi.spyOn(console, "warn").mockImplementation(() => {})
  })

  afterEach(() => {
    vi.unstubAllGlobals()
    warnSpy.mockRestore()
  })

  it("warns when apiKey is used in a browser context (window is defined)", () => {
    new ElevenLabsTTSPlugin({ apiKey: "el-test-key" })
    expect(warnSpy).toHaveBeenCalledOnce()
    expect(warnSpy.mock.calls[0][0]).toContain("proxyUrl")
  })

  it("warning message mentions the security docs link", () => {
    new ElevenLabsTTSPlugin({ apiKey: "el-test-key" })
    expect(warnSpy.mock.calls[0][0]).toContain("github.com/JairoGerardo/mymo-avatar")
  })

  it("does not warn when only proxyUrl is provided", () => {
    new ElevenLabsTTSPlugin({ proxyUrl: "https://api.example.com/tts" })
    expect(warnSpy).not.toHaveBeenCalled()
  })

  it("does not warn when no credentials are provided", () => {
    new ElevenLabsTTSPlugin()
    expect(warnSpy).not.toHaveBeenCalled()
  })

  it("does not warn when window is undefined (Node.js / Electron context)", () => {
    vi.stubGlobal("window", undefined)
    new ElevenLabsTTSPlugin({ apiKey: "el-test-key" })
    expect(warnSpy).not.toHaveBeenCalled()
  })
})

describe("ElevenLabsTTSPlugin — missing credentials", () => {
  it("throws when speak() is called without apiKey or proxyUrl", async () => {
    const plugin = new ElevenLabsTTSPlugin()
    plugin.install({ talk: vi.fn(), stopTalking: vi.fn() } as any)
    await expect(plugin.speak("hello")).rejects.toThrow('provide either "apiKey" or "proxyUrl"')
  })
})
