import { useEffect, useRef } from "react"
import { Avatar } from "../index.js"
import type { AvatarOptions } from "../index.js"

export function useAvatar(options: AvatarOptions): React.RefObject<Avatar | null> {
  const ref = useRef<Avatar | null>(null)

  useEffect(() => {
    ref.current = new Avatar(options)
    return () => {
      ref.current?.destroy()
      ref.current = null
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  return ref
}
