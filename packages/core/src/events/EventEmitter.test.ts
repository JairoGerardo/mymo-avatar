import { describe, it, expect, vi, beforeEach } from "vitest"
import { EventEmitter } from "./EventEmitter.js"

describe("EventEmitter", () => {
  let emitter: EventEmitter

  beforeEach(() => {
    emitter = new EventEmitter()
  })

  describe("on / emit", () => {
    it("calls registered listener with event name and undefined data", () => {
      const fn = vi.fn()
      emitter.on("click", fn)
      emitter.emit("click")
      expect(fn).toHaveBeenCalledOnce()
      expect(fn).toHaveBeenCalledWith("click", undefined)
    })

    it("passes arbitrary data to listener", () => {
      const fn = vi.fn()
      emitter.on("loaded", fn)
      emitter.emit("loaded", { model: "maya" })
      expect(fn).toHaveBeenCalledWith("loaded", { model: "maya" })
    })

    it("calls all listeners registered for the same event", () => {
      const fn1 = vi.fn()
      const fn2 = vi.fn()
      emitter.on("click", fn1)
      emitter.on("click", fn2)
      emitter.emit("click")
      expect(fn1).toHaveBeenCalledOnce()
      expect(fn2).toHaveBeenCalledOnce()
    })

    it("does not cross-fire between different events", () => {
      const clickFn = vi.fn()
      const loadedFn = vi.fn()
      emitter.on("click", clickFn)
      emitter.on("loaded", loadedFn)
      emitter.emit("click")
      expect(clickFn).toHaveBeenCalledOnce()
      expect(loadedFn).not.toHaveBeenCalled()
    })

    it("does not throw when emitting with no listeners", () => {
      expect(() => emitter.emit("click")).not.toThrow()
    })

    it("deduplicates the same listener reference (Set semantics)", () => {
      const fn = vi.fn()
      emitter.on("click", fn)
      emitter.on("click", fn)
      emitter.emit("click")
      expect(fn).toHaveBeenCalledOnce()
    })
  })

  describe("off", () => {
    it("stops calling a listener after off()", () => {
      const fn = vi.fn()
      emitter.on("click", fn)
      emitter.off("click", fn)
      emitter.emit("click")
      expect(fn).not.toHaveBeenCalled()
    })

    it("only removes the specified listener, leaving others intact", () => {
      const fn1 = vi.fn()
      const fn2 = vi.fn()
      emitter.on("click", fn1)
      emitter.on("click", fn2)
      emitter.off("click", fn1)
      emitter.emit("click")
      expect(fn1).not.toHaveBeenCalled()
      expect(fn2).toHaveBeenCalledOnce()
    })

    it("does not throw when removing a listener that was never registered", () => {
      expect(() => emitter.off("click", vi.fn())).not.toThrow()
    })
  })

  describe("removeAllListeners", () => {
    it("removes all listeners for a specific event", () => {
      const clickFn = vi.fn()
      const loadedFn = vi.fn()
      emitter.on("click", clickFn)
      emitter.on("loaded", loadedFn)
      emitter.removeAllListeners("click")
      emitter.emit("click")
      emitter.emit("loaded")
      expect(clickFn).not.toHaveBeenCalled()
      expect(loadedFn).toHaveBeenCalledOnce()
    })

    it("removes all listeners for all events when called without argument", () => {
      const fn = vi.fn()
      emitter.on("click", fn)
      emitter.on("loaded", fn)
      emitter.removeAllListeners()
      emitter.emit("click")
      emitter.emit("loaded")
      expect(fn).not.toHaveBeenCalled()
    })
  })

  describe("chaining", () => {
    it("on() returns this", () => {
      expect(emitter.on("click", vi.fn())).toBe(emitter)
    })

    it("off() returns this", () => {
      const fn = vi.fn()
      emitter.on("click", fn)
      expect(emitter.off("click", fn)).toBe(emitter)
    })
  })
})
