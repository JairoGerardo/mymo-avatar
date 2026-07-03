import { forwardRef, useImperativeHandle } from "react"
import { useAvatar } from "./useAvatar.js"
import type { Avatar, AvatarOptions } from "../index.js"

export type AvatarWidgetProps = AvatarOptions

export const AvatarWidget = forwardRef<Avatar | null, AvatarWidgetProps>(
  function AvatarWidget(props, ref) {
    const avatarRef = useAvatar(props)

    useImperativeHandle(ref, () => avatarRef.current!)

    return null
  },
)
