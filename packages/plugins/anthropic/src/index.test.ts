import { describe, it, expect, vi, beforeEach, afterEach } from "vitest"
import { AnthropicPlugin } from "./index"

describe("AnthropicPlugin — security guard", () => {
  let warnSpy: ReturnType<typeof vi.spyOn>

  beforeEach(() => {
    warnSpy = vi.spyOn(console, "warn").mockImplementation(() => {})
  })

  afterEach(() => {
    vi.unstubAllGlobals()
    warnSpy.mockRestore()
  })

  it("warns when apiKey is used in a browser context (window is defined)", () => {
    new AnthropicPlugin({ apiKey: "sk-ant-test" })
    expect(warnSpy).toHaveBeenCalledOnce()
    expect(warnSpy.mock.calls[0][0]).toContain("proxyUrl")
  })

  it("warning message mentions the security docs link", () => {
    new AnthropicPlugin({ apiKey: "sk-ant-test" })
    expect(warnSpy.mock.calls[0][0]).toContain("github.com/JairoGerardo/mymo-avatar")
  })

  it("does not warn when only proxyUrl is provided", () => {
    new AnthropicPlugin({ proxyUrl: "https://api.example.com/chat" })
    expect(warnSpy).not.toHaveBeenCalled()
  })

  it("does not warn when no credentials are provided", () => {
    new AnthropicPlugin()
    expect(warnSpy).not.toHaveBeenCalled()
  })

  it("does not warn when window is undefined (Node.js / Electron context)", () => {
    vi.stubGlobal("window", undefined)
    new AnthropicPlugin({ apiKey: "sk-ant-test" })
    expect(warnSpy).not.toHaveBeenCalled()
  })
})

describe("AnthropicPlugin — missing credentials", () => {
  it("throws when chat() is called without apiKey or proxyUrl", async () => {
    const plugin = new AnthropicPlugin()
    const mockAvatar = { setState: vi.fn(), clearState: vi.fn() }
    plugin.install(mockAvatar as any)
    await expect(plugin.chat("hello")).rejects.toThrow('provide either "apiKey" or "proxyUrl"')
  })

  it("calls avatar.clearState() in finally even when an error is thrown", async () => {
    const plugin = new AnthropicPlugin()
    const mockAvatar = { setState: vi.fn(), clearState: vi.fn() }
    plugin.install(mockAvatar as any)
    await expect(plugin.chat("hello")).rejects.toThrow()
    expect(mockAvatar.clearState).toHaveBeenCalledOnce()
  })
})
