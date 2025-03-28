precision highp float;

in vec3 position;
in vec2 uv;

out vec2 vUvs;

uniform mat4 modelViewMatrix;
uniform mat4 projectionMatrix;

void main() {
  gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
  vUvs = uv;
}
