import { describe, it, expect, vi, beforeEach, afterEach } from "vitest"
import { OpenAITTSPlugin } from "./index"

describe("OpenAITTSPlugin — security guard", () => {
  let warnSpy: ReturnType<typeof vi.spyOn>

  beforeEach(() => {
    warnSpy = vi.spyOn(console, "warn").mockImplementation(() => {})
  })

  afterEach(() => {
    vi.unstubAllGlobals()
    warnSpy.mockRestore()
  })

  it("warns when apiKey is used in a browser context (window is defined)", () => {
    new OpenAITTSPlugin({ apiKey: "sk-test-key" })
    expect(warnSpy).toHaveBeenCalledOnce()
    expect(warnSpy.mock.calls[0]![0]).toContain("proxyUrl")
  })

  it("warning message mentions the security docs link", () => {
    new OpenAITTSPlugin({ apiKey: "sk-test-key" })
    expect(warnSpy.mock.calls[0]![0]).toContain("github.com/JairoGerardo/mymo-avatar")
  })

  it("does not warn when only proxyUrl is provided", () => {
    new OpenAITTSPlugin({ proxyUrl: "https://api.example.com/tts" })
    expect(warnSpy).not.toHaveBeenCalled()
  })

  it("does not warn when no credentials are provided", () => {
    new OpenAITTSPlugin()
    expect(warnSpy).not.toHaveBeenCalled()
  })

  it("does not warn when window is undefined (Node.js / Electron context)", () => {
    vi.stubGlobal("window", undefined)
    new OpenAITTSPlugin({ apiKey: "sk-test-key" })
    expect(warnSpy).not.toHaveBeenCalled()
  })
})

describe("OpenAITTSPlugin — missing credentials", () => {
  it("throws when speak() is called without apiKey or proxyUrl", async () => {
    const plugin = new OpenAITTSPlugin()
    plugin.install({ talk: vi.fn(), stopTalking: vi.fn() } as any)
    await expect(plugin.speak("hello")).rejects.toThrow('provide either "apiKey" or "proxyUrl"')
  })
})
