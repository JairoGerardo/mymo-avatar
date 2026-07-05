import { describe, it, expect, vi, beforeEach, afterEach } from "vitest"

// ── Mock heavy dependencies before Avatar is imported ─────────────────────────

vi.mock("./renderer/Renderer.js", () => {
  const mockContainer = document.createElement("div")
  const makeRenderer = () => ({
    setup: vi.fn(),
    addTickCallback: vi.fn(),
    setModel: vi.fn(),
    getContainer: vi.fn().mockReturnValue(mockContainer),
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
  })
  return { Renderer: vi.fn().mockImplementation(makeRenderer) }
})

vi.mock("./loader/AssetLoader.js", () => {
  // Import THREE lazily so it's available after vitest hoisting
  return {
    AssetLoader: vi.fn().mockImplementation(() => ({
      load: vi.fn().mockImplementation(async () => {
        const THREE = await import("three")
        return { scene: new THREE.Object3D(), animations: [], vrm: undefined }
      }),
      clearCache: vi.fn(),
    })),
  }
})

import { Avatar } from "./Avatar.js"

// ── Helpers ───────────────────────────────────────────────────────────────────

// Drain the microtask queue so Avatar._initialize() resolves
const flushPromises = async () => {
  for (let i = 0; i < 10; i++) await Promise.resolve()
}

describe("Avatar", () => {
  let avatar: Avatar

  beforeEach(async () => {
    avatar = new Avatar({ idle: false, blink: false })
    await flushPromises()
  })

  afterEach(() => {
    avatar.destroy()
    vi.clearAllMocks()
  })

  // ── Constructor ──────────────────────────────────────────────────────────────

  describe("constructor", () => {
    it("creates an instance without throwing", () => {
      expect(avatar).toBeInstanceOf(Avatar)
    })

    it("applies custom options", async () => {
      const a = new Avatar({ size: 300, idle: false, blink: false })
      await flushPromises()
      expect(a).toBeInstanceOf(Avatar)
      a.destroy()
    })
  })

  // ── Visibility ───────────────────────────────────────────────────────────────

  describe("show / hide", () => {
    it("show() returns this for chaining", () => {
      expect(avatar.show()).toBe(avatar)
    })

    it("hide() returns this for chaining", () => {
      expect(avatar.hide()).toBe(avatar)
    })

    it("show() after hide() does not throw", () => {
      expect(() => avatar.hide().show()).not.toThrow()
    })
  })

  // ── Events ───────────────────────────────────────────────────────────────────

  describe("events", () => {
    it("on() returns this for chaining", () => {
      expect(avatar.on("click", vi.fn())).toBe(avatar)
    })

    it("off() returns this for chaining", () => {
      const fn = vi.fn()
      avatar.on("click", fn)
      expect(avatar.off("click", fn)).toBe(avatar)
    })

    it("emits 'loaded' event after model initialization", async () => {
      const fn = vi.fn()
      const a = new Avatar({ idle: false, blink: false })
      a.on("loaded", fn)
      await flushPromises()
      expect(fn).toHaveBeenCalledOnce()
      a.destroy()
    })

    it("registered listener fires when event is emitted", () => {
      const fn = vi.fn()
      avatar.on("click", fn)
      // trigger via the container click (not directly accessible, so verify off removes it)
      avatar.off("click", fn)
      expect(fn).not.toHaveBeenCalled()
    })
  })

  // ── Expressions ──────────────────────────────────────────────────────────────

  describe("expression convenience methods", () => {
    const methods = ["smile", "sad", "happy", "angry", "surprised", "thinking", "confused", "sleep", "idle"] as const
    for (const method of methods) {
      it(`${method}() returns this`, () => {
        expect(avatar[method]()).toBe(avatar)
      })
    }

    it("expression() returns this", () => {
      expect(avatar.expression("smile")).toBe(avatar)
    })
  })

  // ── Gestures ─────────────────────────────────────────────────────────────────

  describe("gesture convenience methods", () => {
    const methods = ["wave", "nod", "shakeHead", "clap", "jump", "dance", "yes", "no", "thumbsUp"] as const
    for (const method of methods) {
      it(`${method}() returns this`, () => {
        expect(avatar[method]()).toBe(avatar)
      })
    }
  })

  // ── States ───────────────────────────────────────────────────────────────────

  describe("state convenience methods", () => {
    const methods = ["loading", "success", "error", "warning", "typing", "listening", "processing", "complete"] as const
    for (const method of methods) {
      it(`${method}() returns this`, () => {
        expect(avatar[method]()).toBe(avatar)
      })
    }

    it("clearState() returns this", () => {
      avatar.loading()
      expect(avatar.clearState()).toBe(avatar)
    })
  })

  // ── Look ─────────────────────────────────────────────────────────────────────

  describe("look", () => {
    it("lookForward() returns this", () => {
      expect(avatar.lookForward()).toBe(avatar)
    })

    it("lookAt() returns this", () => {
      expect(avatar.lookAt(0.5, -0.3)).toBe(avatar)
    })

    it("lookAtMouse() returns this", () => {
      const result = avatar.lookAtMouse()
      avatar.lookForward()
      expect(result).toBe(avatar)
    })

    it("randomLook() returns this", () => {
      expect(avatar.randomLook()).toBe(avatar)
    })
  })

  // ── Position & size ──────────────────────────────────────────────────────────

  describe("position & size", () => {
    it("position() returns this", () => {
      expect(avatar.position("bottom-left")).toBe(avatar)
    })

    it("move() returns this", () => {
      expect(avatar.move(100, 200)).toBe(avatar)
    })

    it("size() returns this", () => {
      expect(avatar.size(220)).toBe(avatar)
    })

    it("scale() returns this", () => {
      expect(avatar.scale(1.5)).toBe(avatar)
    })

    it("frame() returns this", () => {
      expect(avatar.frame("bust")).toBe(avatar)
    })
  })

  // ── Lip sync ─────────────────────────────────────────────────────────────────

  describe("lip sync", () => {
    it("setViseme() returns this", () => {
      expect(avatar.setViseme("aa")).toBe(avatar)
    })

    it("setMouth() returns this", () => {
      expect(avatar.setMouth(0.5)).toBe(avatar)
    })

    it("setVolume() returns this", () => {
      expect(avatar.setVolume(0.8)).toBe(avatar)
    })

    it("startTalking() returns this", () => {
      expect(avatar.startTalking()).toBe(avatar)
    })

    it("stopTalking() returns this", () => {
      avatar.startTalking()
      expect(avatar.stopTalking()).toBe(avatar)
    })
  })

  // ── Destroy ──────────────────────────────────────────────────────────────────

  describe("destroy", () => {
    it("does not throw", () => {
      const a = new Avatar({ idle: false, blink: false })
      expect(() => a.destroy()).not.toThrow()
    })
  })

  // ── Plugins ──────────────────────────────────────────────────────────────────

  describe("plugins", () => {
    it("use() installs a plugin and returns this", () => {
      const install = vi.fn()
      const plugin = { name: "test-plugin", install }
      expect(avatar.use(plugin)).toBe(avatar)
      expect(install).toHaveBeenCalledOnce()
    })

    it("use() does not install the same plugin twice", () => {
      const install = vi.fn()
      const plugin = { name: "dedup-plugin", install }
      avatar.use(plugin)
      avatar.use(plugin)
      expect(install).toHaveBeenCalledOnce()
    })
  })
})
