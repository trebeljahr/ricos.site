import {
  BufferAttribute,
  BufferGeometry,
  Camera,
  Mesh,
  OrthographicCamera,
  RawShaderMaterial,
  RGBFormat,
  Scene,
  Vector2,
  WebGLRenderer,
  WebGLRenderTarget,
} from 'three'

export default class PostFX {
  public renderer: WebGLRenderer
  public scene = new Scene()
  public dummyCamera = new OrthographicCamera()
  public geometry = new BufferGeometry()
  public resolution = new Vector2()
  public target: WebGLRenderTarget
  public material: RawShaderMaterial
  public triangle: Mesh

  constructor(renderer: WebGLRenderer, fragmentShader: string, vertexShader: string) {
    this.renderer = renderer

    // Triangle expressed in clip space coordinates
    const vertices = new Float32Array([-1.0, -1.0, 3.0, -1.0, -1.0, 3.0])

    this.geometry.setAttribute('position', new BufferAttribute(vertices, 2))

    this.renderer.getDrawingBufferSize(this.resolution)

    this.target = new WebGLRenderTarget(this.resolution.x, this.resolution.y, {
      format: RGBFormat,
      stencilBuffer: false,
      depthBuffer: true,
    })

    this.material = new RawShaderMaterial({
      fragmentShader,
      vertexShader,
      uniforms: {
        uScene: { value: this.target.texture },
        uResolution: { value: this.resolution },
      },
    })

    this.triangle = new Mesh(this.geometry, this.material)

    this.triangle.frustumCulled = false
    this.scene.add(this.triangle)
  }

  render(scene: Scene, camera: Camera) {
    this.renderer.setRenderTarget(this.target)
    this.renderer.render(scene, camera)
    this.renderer.setRenderTarget(null)
    this.renderer.render(this.scene, this.dummyCamera)
  }
}
