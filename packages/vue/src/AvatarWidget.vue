<script setup lang="ts">
import { useAvatar } from "./useAvatar.js"
import type { Avatar } from "@mymo/avatar"

// Inline props to avoid @vue/compiler-sfc cross-package type resolution
const props = defineProps<{
  model?: string
  position?: "bottom-right" | "bottom-left" | "top-right" | "top-left"
  size?: number
  theme?: "light" | "dark" | "transparent"
  draggable?: boolean
  shadows?: boolean
  idle?: boolean
  idleInterval?: number
  blink?: boolean
  blinkInterval?: number
  lipSync?: boolean
  followMouse?: boolean
  autoHide?: boolean
  zIndex?: number
}>()

const avatar = useAvatar(props)

defineExpose<{ avatar: ReturnType<typeof useAvatar> }>({ avatar })
</script>

<template><!-- Avatar mounts to document.body — no DOM output needed --></template>
