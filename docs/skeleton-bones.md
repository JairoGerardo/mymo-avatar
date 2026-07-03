# Composición de Huesos — VRM Humanoid

Los modelos `.vrm` (Maya.vrm, Mark.vrm, girl.vrm) siguen el estándar **VRM 1.0 Humanoid** de `@pixiv/three-vrm`.
Todos los huesos se acceden a través de `vrm.humanoid.getNormalizedBoneNode(VRMHumanBoneName.X)`.

---

## Sistema de coordenadas (Three.js / VRM normalizado)

```
       +Y (arriba)
        │
        │
        └──── +X (derecha del avatar = izquierda del espectador)
       /
      /
    +Z (hacia el espectador)
```

| Eje | Rotación positiva produce... |
|-----|------------------------------|
| **X** | Flexión hacia adelante (pitch — inclinar cabeza hacia abajo, doblar rodilla) |
| **Y** | Rotación lateral (yaw — girar cabeza a la derecha, girar cadera) |
| **Z** | Inclinación lateral (roll — inclinar cabeza al hombro, levantar brazo) |

> En VRM normalizado los valores están en **radianes** y se aplican sobre la pose T-pose como origen.

---

## Jerarquía completa de huesos

```
Hips                        ← raíz de la cadena de cuerpo
├── Spine                   ← columna baja
│   └── Chest               ← torso/pecho
│       └── UpperChest      ← torso superior (opcional en algunos modelos)
│           ├── Neck         ← cuello
│           │   └── Head     ← cabeza
│           │       ├── LeftEye
│           │       └── RightEye
│           ├── LeftShoulder
│           │   └── LeftUpperArm
│           │       └── LeftLowerArm
│           │           └── LeftHand
│           │               ├── LeftThumbProximal → LeftThumbIntermediate → LeftThumbDistal
│           │               ├── LeftIndexProximal → LeftIndexIntermediate → LeftIndexDistal
│           │               ├── LeftMiddleProximal → LeftMiddleIntermediate → LeftMiddleDistal
│           │               ├── LeftRingProximal   → LeftRingIntermediate   → LeftRingDistal
│           │               └── LeftLittleProximal → LeftLittleIntermediate → LeftLittleDistal
│           └── RightShoulder
│               └── RightUpperArm
│                   └── RightLowerArm
│                       └── RightHand
│                           ├── RightThumbProximal → RightThumbIntermediate → RightThumbDistal
│                           ├── RightIndexProximal → RightIndexIntermediate → RightIndexDistal
│                           ├── RightMiddleProximal → RightMiddleIntermediate → RightMiddleDistal
│                           ├── RightRingProximal   → RightRingIntermediate   → RightRingDistal
│                           └── RightLittleProximal → RightLittleIntermediate → RightLittleDistal
├── LeftUpperLeg
│   └── LeftLowerLeg
│       └── LeftFoot
│           └── LeftToes
└── RightUpperLeg
    └── RightLowerLeg
        └── RightFoot
            └── RightToes
```

---

## Tabla de huesos — nombre, rol y ejes de rotación

### Torso y columna

| Hueso VRM | Descripción | X (pitch) | Y (yaw) | Z (roll) |
|-----------|-------------|-----------|---------|----------|
| `Hips` | Pelvis — raíz de todo el cuerpo | Inclinar cuerpo adelante/atrás | Girar cadera | Inclinación lateral |
| `Spine` | Columna lumbar | Curvar hacia adelante | Torcer | Inclinación lateral |
| `Chest` | Torso / caja torácica | Expansión pecho (respiración) | Torcer | Inclinación lateral |
| `UpperChest` | Torso superior (opcional) | Expansión | Torcer | Inclinación |

**Valores usados en idle:**
```ts
spine.rotation.z = sway * 0.008     // balanceo suave lateral
chest.rotation.x = breathe * 0.015  // respiración
```

---

### Cabeza y cuello

| Hueso VRM | Descripción | X (pitch) | Y (yaw) | Z (roll) |
|-----------|-------------|-----------|---------|----------|
| `Neck` | Cuello | Nod (asentir/negar con cabeza hacia abajo) | Shake (negar de lado) | Inclinar al hombro |
| `Head` | Cabeza completa | Pitch fino (nod secundario) | Yaw fino (shake secundario) | Roll fino |
| `LeftEye` | Ojo izquierdo | Mirar arriba/abajo | Mirar derecha/izquierda | — |
| `RightEye` | Ojo derecho | Mirar arriba/abajo | Mirar derecha/izquierda | — |

**Ejemplos de gestos:**
```ts
// Nod (asentir)
neck.rotation.x = 0.32 * Math.sin(t * Math.PI * 2)   // flexión adelante

// ShakeHead / No
neck.rotation.y = 0.38 * Math.sin(t * Math.PI * 6)   // rotación lateral

// Yes
neck.rotation.x = 0.30 * Math.max(0, Math.sin(t * Math.PI * 6))
head.rotation.x = 0.12 * ...  // movimiento secundario más sutil
```

---

### Brazo derecho

| Hueso VRM | Descripción | X (pitch) | Y (yaw) | Z (roll) |
|-----------|-------------|-----------|---------|----------|
| `RightShoulder` | Hombro derecho | — | Adelante/atrás | Subir/bajar hombro |
| `RightUpperArm` | Húmero derecho | Brazo adelante/atrás | — | **Subir/bajar brazo** (principal) |
| `RightLowerArm` | Cúbito/Radio derecho | Doblar codo adelante | — | Supinación/pronación |
| `RightHand` | Muñeca derecha | Flexión muñeca (arriba/abajo) | Desviación lateral | Rotación |

**Valores clave:**
```ts
// T-pose → rest pose
rArm.rotation.z =  Math.PI / 3.2   // ~56° — brazo junto al cuerpo
rForearm.rotation.z = -0.10        // leve caída natural del antebrazo
rHand.rotation.x = -0.15           // muñeca ligeramente alzada

// Wave — levantar brazo
rArm.rotation.z = -Math.PI / 6     // ~-30° — brazo arriba
rForearm.rotation.z = -1.35        // codo doblado ~77°
rHand.rotation.y = wavePhase * 0.4 // mano oscila lateralmente
```

> **Nota Z en brazos:** En VRM el eje Z positivo **baja** el brazo derecho (lo separa del cuerpo hacia abajo), Z negativo lo **sube**. Para el brazo izquierdo la convención es inversa.

---

### Brazo izquierdo

| Hueso VRM | Descripción | X (pitch) | Y (yaw) | Z (roll) |
|-----------|-------------|-----------|---------|----------|
| `LeftShoulder` | Hombro izquierdo | — | Adelante/atrás | Subir/bajar hombro |
| `LeftUpperArm` | Húmero izquierdo | Brazo adelante/atrás | — | **Bajar/subir brazo** (invertido) |
| `LeftLowerArm` | Cúbito/Radio izquierdo | Doblar codo | — | Supinación |
| `LeftHand` | Muñeca izquierda | Flexión muñeca | Desviación lateral | Rotación |

```ts
// Rest pose (simétrico, eje Z invertido respecto al derecho)
lArm.rotation.z = -Math.PI / 3.2   // ~-56° — espejo del derecho
lForearm.rotation.z =  0.10
lHand.rotation.x = -0.15
```

---

### Dedos (mano derecha — misma lógica espejada en izquierda)

Cada dedo tiene 3 falanges: **Proximal → Intermediate → Distal**

| Dedo | Huesos |
|------|--------|
| Pulgar | `RightThumbProximal` → `RightThumbIntermediate` → `RightThumbDistal` |
| Índice | `RightIndexProximal` → `RightIndexIntermediate` → `RightIndexDistal` |
| Medio | `RightMiddleProximal` → `RightMiddleIntermediate` → `RightMiddleDistal` |
| Anular | `RightRingProximal` → `RightRingIntermediate` → `RightRingDistal` |
| Meñique | `RightLittleProximal` → `RightLittleIntermediate` → `RightLittleDistal` |

**Eje de curvatura de dedos:** `Z` (positivo = cerrar en mano derecha, negativo = cerrar en mano izquierda)

```ts
// Curl relajado (mano derecha)
proximal.rotation.z    =  0.28   // ~16° — falange base
intermediate.rotation.z =  0.22  // un poco menos (0.28 * 0.8)
distal.rotation.z      =  0.14   // mínimo (0.28 * 0.5)

// Curl relajado (mano izquierda — Z negativo)
proximal.rotation.z    = -0.28
```

**Pulgar** usa X además de Z:
```ts
rThumb.rotation.z = -0.3  // separar del índice
rThumb.rotation.x =  0.2  // rotación de oposición
```

---

### Pierna derecha

| Hueso VRM | Descripción | X (pitch) | Y (yaw) | Z (roll) |
|-----------|-------------|-----------|---------|----------|
| `RightUpperLeg` | Fémur derecho | **Flexión de cadera** (principal) | Abducción | Rotación |
| `RightLowerLeg` | Tibia derecha | **Flexión de rodilla** (solo flexiona hacia atrás) | — | — |
| `RightFoot` | Pie/tobillo derecho | **Flexión plantar** (puntillas/talón) | — | — |
| `RightToes` | Dedos del pie | Extensión/flexión dedos | — | — |

```ts
// Jump — agacharse
rThigh.rotation.x = -0.35  // X negativo = muslo hacia adelante (agacharse)
rShin.rotation.x  =  1.20  // X positivo = rodilla dobla hacia atrás
rFoot.rotation.x  = -0.85  // X negativo = pie se eleva (puntillas)

// Jump — en el aire
rFoot.rotation.x  =  0.60  // X positivo = pie extendido (puntillas hacia abajo)
```

---

### Pierna izquierda

Simétrica a la derecha. Los mismos ejes y signos (la simetría en piernas es X, a diferencia de brazos que usa Z).

| Hueso VRM | Descripción |
|-----------|-------------|
| `LeftUpperLeg` | Fémur izquierdo |
| `LeftLowerLeg` | Tibia izquierda |
| `LeftFoot` | Tobillo izquierdo |
| `LeftToes` | Dedos del pie izquierdo |

---

## Resumen rápido: eje principal por zona

| Zona | Movimiento principal | Eje |
|------|---------------------|-----|
| Cabeza | Nod (asentir) | **X** positivo |
| Cabeza | Shake (negar) | **Y** positivo/negativo |
| Brazo derecho | Levantar brazo | **Z** negativo |
| Brazo izquierdo | Levantar brazo | **Z** positivo |
| Codo | Doblar | **Z** (der.) / **Z** (izq.) con signo opuesto |
| Muñeca | Flexión arriba/abajo | **X** |
| Dedo (derecho) | Cerrar/curl | **Z** positivo |
| Dedo (izquierdo) | Cerrar/curl | **Z** negativo |
| Pierna | Flexión cadera | **X** negativo |
| Rodilla | Doblar | **X** positivo |
| Tobillo/pie | Puntillas | **X** positivo |
| Columna/torso | Inclinación lateral | **Z** |
| Columna/torso | Torsión | **Y** |
| Cadera (Hips) | Sway de baile | **Z** |

---

## Cómo acceder a un hueso en código

```ts
import { VRMHumanBoneName, type VRM } from "@pixiv/three-vrm"

function rotateBone(vrm: VRM) {
  const h = vrm.humanoid

  // Obtener nodo del hueso (normalizado — origen en T-pose)
  const neck = h.getNormalizedBoneNode(VRMHumanBoneName.Neck)

  if (neck) {
    neck.rotation.x =  0.3   // nod
    neck.rotation.y =  0.0
    neck.rotation.z =  0.0
  }
}
```

> `getNormalizedBoneNode()` devuelve el hueso en el espacio normalizado de VRM (T-pose = identidad).
> Para leer la pose actual del modelo en espacio mundo usa `getRawBoneNode()`.

---

## Gestos implementados y huesos que usan

| Gesto | Huesos involucrados |
|-------|---------------------|
| `wave` | RightUpperArm, RightLowerArm, RightHand, LeftUpperArm |
| `nod` | Neck, RightUpperArm, LeftUpperArm |
| `shakeHead` | Neck, RightUpperArm, LeftUpperArm |
| `no` | Neck, Head, RightUpperArm, LeftUpperArm |
| `yes` | Neck, Head, RightUpperArm, LeftUpperArm |
| `point` | RightUpperArm, RightLowerArm, LeftUpperArm |
| `clap` | RightUpperArm, LeftUpperArm, RightLowerArm, LeftLowerArm, RightHand, LeftHand |
| `jump` | Hips, Spine, Chest, RightUpperArm, LeftUpperArm, RightUpperLeg, LeftUpperLeg, RightLowerLeg, LeftLowerLeg, RightFoot, LeftFoot |
| `dance` | Hips, Spine, Chest, Neck, RightUpperArm, LeftUpperArm, RightUpperLeg, LeftUpperLeg, RightFoot, LeftFoot |
