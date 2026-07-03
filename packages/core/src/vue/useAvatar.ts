import { shallowRef, onMounted, onUnmounted, type ShallowRef } from "vue"
import { Avatar } from "../index.js"
import type { AvatarOptions } from "../index.js"

export function useAvatar(options: AvatarOptions): ShallowRef<Avatar | null> {
  const avatar = shallowRef<Avatar | null>(null)

  onMounted(() => {
    avatar.value = new Avatar(options)
  })

  onUnmounted(() => {
    avatar.value?.destroy()
    avatar.value = null
  })

  return avatar
}
