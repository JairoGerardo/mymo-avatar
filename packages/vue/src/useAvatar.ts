import { ref, onMounted, onUnmounted } from "vue"
import { Avatar } from "@mymo/avatar"
import type { AvatarOptions } from "@mymo/avatar"

export function useAvatar(options: AvatarOptions) {
  const avatar = ref<Avatar | null>(null)

  onMounted(() => {
    avatar.value = new Avatar(options)
  })

  onUnmounted(() => {
    avatar.value?.destroy()
    avatar.value = null
  })

  return avatar
}
