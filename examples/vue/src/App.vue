<script setup lang="ts">
import { ref } from "vue"
import { AvatarWidget } from "@mymo/vue"
import type { Avatar } from "@mymo/avatar"

const ROBOT_GLB =
  "https://cdn.jsdelivr.net/gh/mrdoob/three.js@r165/examples/models/gltf/RobotExpressive/RobotExpressive.glb"

const widgetRef = ref<InstanceType<typeof AvatarWidget> | null>(null)
const log = ref("Initializing…")

function act(label: string, fn: (a: Avatar) => void) {
  log.value = label
  const a = widgetRef.value?.avatar.value
  if (a) fn(a)
}
</script>

<template>
  <AvatarWidget
    ref="widgetRef"
    :model="ROBOT_GLB"
    position="bottom-right"
    :size="200"
    theme="dark"
    :idle="true"
    :blink="true"
    :draggable="true"
  />
  <div style="text-align:center; display:flex; flex-direction:column; gap:1rem; align-items:center">
    <h1 style="font-size:2rem; background:linear-gradient(135deg,#a78bfa,#60a5fa); -webkit-background-clip:text; -webkit-text-fill-color:transparent">
      Mymo Avatar — Vue
    </h1>
    <div style="display:flex; gap:0.5rem; flex-wrap:wrap; justify-content:center; max-width:480px">
      <button @click="act('smile',      a => a.smile())">smile</button>
      <button @click="act('sad',        a => a.sad())">sad</button>
      <button @click="act('wave',       a => a.wave())">wave</button>
      <button @click="act('nod',        a => a.nod())">nod</button>
      <button @click="act('loading',    a => a.loading())">loading</button>
      <button @click="act('success',    a => a.success())">success</button>
      <button @click="act('error',      a => a.error())">error</button>
      <button @click="act('listening',  a => a.listening())">listening</button>
      <button @click="act('clearState', a => a.clearState())">clearState</button>
      <button @click="act('lookAtMouse',a => a.lookAtMouse())">lookAtMouse</button>
      <button @click="act('lookForward',a => a.lookForward())">lookForward</button>
    </div>
    <p style="font-size:0.8rem; color:#a78bfa; font-family:monospace">{{ log }}</p>
  </div>
</template>
