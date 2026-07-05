// @vitest-environment node
// Runs in a pure Node.js environment — no window, document, or browser globals.
// Verifies that the SDK does not crash when imported and used server-side.

import { describe, it, expect, vi, afterEach } from "vitest"

vi.mock("./renderer/Renderer.js", () => ({
  Renderer: vi.fn().mockImplementation(() => ({
    setup: vi.fn(),
    addTickCallback: vi.fn(),
    setModel: vi.fn(),
    getContainer: vi.fn().mockReturnValue(null),
    show: vi.fn(),
    hide: vi.fn(),
    dispose: vi.fn(),
    moveTo: vi.fn(),
    setPosition: vi.fn(),
    setSize: vi.fn(),
    setFraming: vi.fn(),
    setFramingConfig: vi.fn(),
    setTheme: vi.fn(),
    setThemeConfig: vi.fn(),
    debugBones: vi.fn(),
  })),
}))

vi.mock("./loader/AssetLoader.js", () => ({
  AssetLoader: vi.fn().mockImplementation(() => ({
    load: vi.fn().mockResolvedValue({
      scene: { traverse: vi.fn(), updateWorldMatrix: vi.fn(), userData: {} },
      animations: [],
      vrm: undefined,
    }),
    clearCache: vi.fn(),
  })),
}))

import { Avatar } from "./Avatar.js"

describe("SSR safety (Node.js — no browser globals)", () => {
  afterEach(() => vi.clearAllMocks())

  it("typeof window is undefined in this environment", () => {
    expect(typeof window).toBe("undefined")
  })

  it("Avatar can be instantiated without throwing", () => {
    expect(() => new Avatar({ idle: false, blink: false })).not.toThrow()
  })

  it("visibility methods do not throw", () => {
    const avatar = new Avatar({ idle: false, blink: false })
    expect(() => avatar.show()).not.toThrow()
    expect(() => avatar.hide()).not.toThrow()
  })

  it("lookAt / lookForward / lookAtMouse do not throw", () => {
    const avatar = new Avatar({ idle: false, blink: false })
    expect(() => avatar.lookAt(100, 200)).not.toThrow()
    expect(() => avatar.lookForward()).not.toThrow()
    expect(() => avatar.lookAtMouse()).not.toThrow()
  })

  it("expression and gesture methods do not throw", () => {
    const avatar = new Avatar({ idle: false, blink: false })
    expect(() => avatar.smile()).not.toThrow()
    expect(() => avatar.wave()).not.toThrow()
    expect(() => avatar.loading()).not.toThrow()
  })

  it("on / off event registration do not throw", () => {
    const avatar = new Avatar({ idle: false, blink: false })
    const fn = vi.fn()
    expect(() => avatar.on("click", fn)).not.toThrow()
    expect(() => avatar.off("click", fn)).not.toThrow()
  })

  it("destroy does not throw", () => {
    const avatar = new Avatar({ idle: false, blink: false })
    expect(() => avatar.destroy()).not.toThrow()
  })
})
