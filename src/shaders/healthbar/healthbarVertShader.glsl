// HealthBar.glsl
// Vertex Shader
varying vec2 vUv;
varying vec4 vPosition;

void main() {
  vUv = uv;
  vPosition = vec4(position, 1.0);
  gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
}
