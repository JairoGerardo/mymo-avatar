import dynamic from "next/dynamic"

// Avatar uses WebGL + document.body — must be client-only, no SSR
const AvatarDemo = dynamic(() => import("./components/AvatarDemo"), { ssr: false })

export default function Page() {
  return <AvatarDemo />
}
