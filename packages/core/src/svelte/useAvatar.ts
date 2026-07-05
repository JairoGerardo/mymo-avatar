import { onMount, onDestroy } from "svelte"
import { writable, type Writable } from "svelte/store"
import { Avatar } from "../index.js"
import type { AvatarOptions } from "../index.js"

/**
 * Svelte composable that manages an Avatar instance lifecycle.
 * Returns a Svelte writable store — subscribe to access the Avatar instance.
 *
 * Must be called synchronously during component initialization.
 *
 * @example
 * ```svelte
 * <script>
 *   import { useAvatar } from "@mymosdk/avatar/svelte"
 *   const avatar = useAvatar({ model: "maya", position: "bottom-right" })
 *   $: $avatar?.smile()
 * </script>
 * ```
 */
export function useAvatar(options: AvatarOptions): Writable<Avatar | null> {
  const avatar = writable<Avatar | null>(null)

  onMount(() => {
    const instance = new Avatar(options)
    avatar.set(instance)
    return () => {
      instance.destroy()
      avatar.set(null)
    }
  })

  return avatar
}
