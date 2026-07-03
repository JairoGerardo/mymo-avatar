import { defineComponent, h } from "vue"
import { useAvatar } from "./useAvatar.js"
import type { AvatarOptions } from "../index.js"

const avatarProps = [
  "model", "position", "size", "theme", "themeConfig", "framing", "framingConfig",
  "draggable", "shadows", "idle", "idleInterval", "blink", "blinkInterval",
  "lipSync", "followMouse", "autoHide", "zIndex",
] as const

export const AvatarWidget = defineComponent({
  name: "AvatarWidget",
  props: avatarProps as unknown as Record<string, null>,
  setup(props, { expose }) {
    const avatar = useAvatar(props as AvatarOptions)
    expose({ avatar })
    return () => h("span", { style: "display:none" })
  },
})
