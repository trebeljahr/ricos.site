import { useFBX } from '@react-three/drei'
import { useFrame } from '@react-three/fiber'
import { useEffect, useRef } from 'react'
import { AnimationAction, AnimationMixer, Mesh } from 'three'

interface Animations {
  [name: string]: {
    clip: AnimationAction
  }
}

export default function Character() {
  const characterMeshRef = useRef<Mesh>(null!)
  const characterModel = useFBX('/fbx/character/in/Michelle.fbx')

  const animations: Animations = {}
  const mixer = new AnimationMixer(characterModel)

  const running = useFBX('/fbx/animations/in/running.fbx')

  animations.running = {
    clip: mixer.clipAction(running.animations[0]),
  }

  const idle = useFBX('/fbx/animations/in/idle.fbx')
  animations.idle = {
    clip: mixer.clipAction(idle.animations[0]),
  }

  useEffect(() => {
    animations.idle.clip.play()
    return () => {
      mixer.stopAllAction()
    }
  }, [])

  useFrame((_, delta) => {
    mixer.update(delta)
  })

  return <primitive object={characterModel} ref={characterMeshRef} />
}
