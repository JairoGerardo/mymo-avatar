import { forwardRef, useImperativeHandle } from "react"
import { useAvatar } from "./useAvatar.js"
import type { Avatar, AvatarOptions } from "../index.js"

export interface AvatarWidgetProps extends AvatarOptions {
  className?: string
}

export const AvatarWidget = forwardRef<Avatar | null, AvatarWidgetProps>(
  function AvatarWidget(props, ref) {
    const { className: _c, ...options } = props
    const avatarRef = useAvatar(options)

    useImperativeHandle(ref, () => avatarRef.current!)

    return null
  },
)
