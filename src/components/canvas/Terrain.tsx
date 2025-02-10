import { useBeachMaterial } from '@models/useBeachMaterial'
import { Box } from '@react-three/drei'
import { useFrame, useThree } from '@react-three/fiber'
import { RigidBody } from '@react-three/rapier'
import { useState } from 'react'
import { Vector2, Vector3 } from 'three'
import { Fishs } from './Fish'
import { SingleKelpTile } from './Kelp'

export const Floor = () => {
  return (
    <RigidBody type='fixed' colliders='cuboid'>
      <Box position={[0, -5, 0]} scale={[200, 10, 200]} rotation={[0, 0, 0]} receiveShadow>
        <meshBasicMaterial color='#7EC850' />
      </Box>
    </RigidBody>
  )
}

export const viewDistance: number = 3
export const scale: number = 60

function computeChunkCoordinates(pos: Vector3) {
  return new Vector2(Math.floor(pos.x / scale) * scale, Math.floor(pos.z / scale) * scale)
}

const maxDistance = scale * (viewDistance !== 0 ? viewDistance : 1)

type Chunk = {
  id: number
  offset: Vector2
}

export function Terrain() {
  const [chunks, setChunks] = useState<Chunk[]>(() => {
    const tempPoints = [] as Chunk[]

    let i = 0
    for (let x = -viewDistance; x <= viewDistance; x++) {
      for (let y = -viewDistance; y <= viewDistance; y++) {
        tempPoints.push({ offset: new Vector2(x * scale, y * scale), id: i++ })
      }
    }

    return tempPoints
  })

  const { camera } = useThree()

  useFrame(() => {
    const camPos = computeChunkCoordinates(camera.position)
    const chunksNeeded = [] as Vector2[]
    for (let x = -viewDistance; x <= viewDistance; x++) {
      for (let y = -viewDistance; y <= viewDistance; y++) {
        const chunkPos = new Vector2(x * scale + camPos.x, y * scale + camPos.y)
        const exists = chunks.find(({ offset }) => {
          return offset.x === chunkPos.x && offset.y === chunkPos.y
        })
        if (!exists) {
          chunksNeeded.push(chunkPos)
        }
      }
    }

    let changed = false
    let i = 0
    const chunksCopy = chunks.map((chunk) => {
      if (Math.abs(camPos.x - chunk.offset.x) > maxDistance || Math.abs(camPos.y - chunk.offset.y) > maxDistance) {
        changed = true
        return { ...chunk, offset: chunksNeeded[i++] }
      }
      return chunk
    })

    if (changed) setChunks(chunksCopy)
  })

  return (
    <>
      {/* <Box args={[1, 1, 1]}>
        <meshPhysicalMaterial color='pink' />
      </Box> */}

      {Object.values(chunks).map((chunk) => {
        return (
          <group position={new Vector3(chunk.offset.x, 0, chunk.offset.y)} key={chunk.id}>
            <SingleKelpTile />
            <Plane />
          </group>
        )
      })}
    </>
  )
}

export function Plane({ position = new Vector3(0, 0, 0) }) {
  const {
    materials: { aerial_beach_01: beachMaterial },
  } = useBeachMaterial()

  return (
    <mesh position={position} material={beachMaterial} rotation={[Math.PI / 2, 0, 0]} scale={[scale, scale, scale]}>
      <planeGeometry />
    </mesh>
  )
}
