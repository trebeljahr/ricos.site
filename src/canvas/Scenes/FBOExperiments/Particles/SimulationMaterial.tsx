import { DataTexture, FloatType, RGBAFormat, ShaderMaterial } from 'three'
import { randFloatSpread } from 'three/src/math/MathUtils'

const getRandomData = (width: number, height: number) => {
  const length = width * height * 4
  const data = new Float32Array(length)

  for (let i = 0; i < length; i++) {
    const stride = i * 4

    const distance = Math.sqrt(Math.random() - 0.5) * 2.0
    const theta = randFloatSpread(360)
    const phi = randFloatSpread(360)

    data[stride] = distance * Math.sin(theta) * Math.cos(phi)
    data[stride + 1] = distance * Math.sin(theta) * Math.sin(phi)
    data[stride + 2] = distance * Math.cos(theta)
    data[stride + 3] = 1.0 // this value will not have any impact
  }

  return data
}

export class SimulationMaterial extends ShaderMaterial {
  constructor(size: number, vertexShader: string, fragmentShader: string) {
    const positionsTexture = new DataTexture(getRandomData(size, size), size, size, RGBAFormat, FloatType)
    positionsTexture.needsUpdate = true

    const simulationUniforms = {
      positions: { value: positionsTexture },
      uFrequency: { value: 0.25 },
      uTime: { value: 0 },
    }

    super({
      uniforms: simulationUniforms,
      vertexShader,
      fragmentShader,
    })
  }
}
