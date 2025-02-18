import JoystickController from 'joystick-controller'
import { useEffect, useRef } from 'react'

export interface JoystickData {
  angle: string
  distance: string
  leveledX: number
  leveledY: number
  x: number
  y: number
}

export type JoystickCallback = (data: JoystickData) => void

const defaultParameters = {
  x: '15%',
  y: '15%',
  opacity: 0.5,
  maxRange: 80,
  radius: 70,
  joystickRadius: 40,
  joystickClass: 'joystick',
  containerClass: 'joystick-container',
  distortion: false,
  mouseClickButton: 'ALL',
  hideContextMenu: true,
}

export function useJoystick({ cb, params }: { cb?: JoystickCallback; params?: Partial<typeof defaultParameters> }) {
  const parameters = { ...defaultParameters, ...params }
  const joystickDataRef = useRef<JoystickData>(null!)

  useEffect(() => {
    if (typeof window === 'undefined') return

    const staticJoystick = new JoystickController(parameters, (data: JoystickData) => {
      joystickDataRef.current = data
      cb?.(data)
    })

    return () => {
      staticJoystick.destroy()
    }
  }, [])

  const getData = () => joystickDataRef.current

  return { getData }
}
