import { shallowRef, onMounted, onUnmounted, type ShallowRef } from "vue"
import { Avatar } from "@mymo/avatar"
import type { AvatarOptions } from "@mymo/avatar"

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
