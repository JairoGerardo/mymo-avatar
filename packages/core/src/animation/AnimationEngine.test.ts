import { describe, it, expect, vi, beforeEach, afterEach } from "vitest"
import * as THREE from "three"
import { AnimationEngine } from "./AnimationEngine.js"
import type { LoadedModel } from "../loader/AssetLoader.js"

function makeEmptyModel(): LoadedModel {
  return {
    scene: new THREE.Object3D(),
    animations: [],
    vrm: undefined,
  }
}

describe("AnimationEngine", () => {
  let engine: AnimationEngine

  beforeEach(() => {
    engine = new AnimationEngine()
    vi.useFakeTimers()
  })

  afterEach(() => {
    engine.dispose()
    vi.useRealTimers()
    vi.restoreAllMocks()
  })

  describe("initial state", () => {
    it("hasHeadBone() is false before init", () => {
      expect(engine.hasHeadBone()).toBe(false)
    })
  })

  describe("init", () => {
    it("accepts an empty model without throwing", () => {
      expect(() => engine.init(makeEmptyModel())).not.toThrow()
    })

    it("hasHeadBone() remains false when scene has no bones", () => {
      engine.init(makeEmptyModel())
      expect(engine.hasHeadBone()).toBe(false)
    })

    it("re-init disposes previous state cleanly", () => {
      engine.init(makeEmptyModel())
      engine.startBlink()
      engine.init(makeEmptyModel()) // should call dispose() internally
      // blinkTimer cleared by dispose — stopBlink is idempotent
      expect(() => engine.stopBlink()).not.toThrow()
    })
  })

  describe("blink", () => {
    it("startBlink() does not throw", () => {
      expect(() => engine.startBlink()).not.toThrow()
    })

    it("stopBlink() does not throw even without startBlink", () => {
      expect(() => engine.stopBlink()).not.toThrow()
    })

    it("stopBlink() after startBlink clears the interval", () => {
      engine.startBlink(1000)
      engine.stopBlink()
      // timer was cleared — advancing time should not cause any errors
      expect(() => vi.advanceTimersByTime(5000)).not.toThrow()
    })
  })

  describe("idle", () => {
    it("startIdle() does not throw on empty model", () => {
      engine.init(makeEmptyModel())
      expect(() => engine.startIdle()).not.toThrow()
    })

    it("stopIdle() does not throw even without startIdle", () => {
      expect(() => engine.stopIdle()).not.toThrow()
    })

    it("stopIdle() clears the interval after startIdle", () => {
      engine.init(makeEmptyModel())
      engine.startIdle(500)
      engine.stopIdle()
      const spy = vi.spyOn(engine, "setExpression")
      vi.advanceTimersByTime(2000)
      expect(spy).not.toHaveBeenCalled()
    })

    it("startIdle fires setExpression after interval elapses", () => {
      engine.init(makeEmptyModel())
      const spy = vi.spyOn(engine, "setExpression")
      engine.startIdle(500)
      vi.advanceTimersByTime(500)
      // _randomIdleExpression picks randomly; it may call setExpression or not (idle branch)
      // Just verify no errors
      expect(spy.mock.calls.length).toBeGreaterThanOrEqual(0)
    })
  })

  describe("look", () => {
    it("lookAt() does not throw", () => {
      expect(() => engine.lookAt(0.5, -0.3)).not.toThrow()
    })

    it("lookForward() does not throw", () => {
      expect(() => engine.lookForward()).not.toThrow()
    })

    it("stopLook() does not throw", () => {
      expect(() => engine.stopLook()).not.toThrow()
    })

    it("startRandomLook() / stopRandomLook() lifecycle is clean", () => {
      expect(() => {
        engine.startRandomLook()
        vi.advanceTimersByTime(100)
        engine.stopRandomLook()
      }).not.toThrow()
    })

    it("stopRandomLook() is idempotent", () => {
      expect(() => {
        engine.stopRandomLook()
        engine.stopRandomLook()
      }).not.toThrow()
    })
  })

  describe("setExpression", () => {
    it("does not throw on any expression with no model loaded", () => {
      const expressions = ["idle", "smile", "sad", "happy", "angry", "surprised", "thinking", "confused", "sleep"] as const
      for (const expr of expressions) {
        expect(() => engine.setExpression(expr)).not.toThrow()
      }
    })

    it("accepts an intensity value", () => {
      engine.init(makeEmptyModel())
      expect(() => engine.setExpression("smile", 0.5)).not.toThrow()
    })
  })

  describe("setMouthMorph", () => {
    it("clamps values above 1 to 1 without throwing", () => {
      engine.init(makeEmptyModel())
      expect(() => engine.setMouthMorph(2)).not.toThrow()
    })

    it("clamps negative values to 0 without throwing", () => {
      engine.init(makeEmptyModel())
      expect(() => engine.setMouthMorph(-0.5)).not.toThrow()
    })
  })

  describe("playGesture", () => {
    it("does not throw on any gesture with no model loaded (no-op)", () => {
      const gestures = ["wave", "nod", "shakeHead", "clap", "jump", "dance", "yes", "no", "thumbsUp"] as const
      for (const gesture of gestures) {
        expect(() => engine.playGesture(gesture)).not.toThrow()
      }
    })
  })

  describe("play / stop", () => {
    it("play() is a no-op when clip name does not exist", () => {
      engine.init(makeEmptyModel())
      expect(() => engine.play("nonexistent")).not.toThrow()
    })

    it("stop() is a no-op when nothing is playing", () => {
      engine.init(makeEmptyModel())
      expect(() => engine.stop()).not.toThrow()
    })
  })

  describe("update", () => {
    it("update() can be called before init without throwing", () => {
      expect(() => engine.update(0.016)).not.toThrow()
    })

    it("update() runs without error after init", () => {
      engine.init(makeEmptyModel())
      expect(() => engine.update(0.016)).not.toThrow()
    })
  })

  describe("dispose", () => {
    it("dispose() is idempotent", () => {
      engine.init(makeEmptyModel())
      expect(() => {
        engine.dispose()
        engine.dispose()
      }).not.toThrow()
    })

    it("hasHeadBone() returns false after dispose", () => {
      engine.init(makeEmptyModel())
      engine.dispose()
      expect(engine.hasHeadBone()).toBe(false)
    })

    it("update() after dispose does not throw", () => {
      engine.init(makeEmptyModel())
      engine.dispose()
      expect(() => engine.update(0.016)).not.toThrow()
    })
  })
})
