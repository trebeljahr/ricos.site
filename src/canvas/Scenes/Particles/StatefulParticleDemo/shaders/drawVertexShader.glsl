precision highp float;
precision highp sampler2DArray;


uniform sampler2D dataTexture;
uniform float time;
uniform vec2 resolution;

uniform mat4 modelViewMatrix;
uniform mat4 projectionMatrix;

in float position;

out vec4 vColour;

vec2 unpackUV(float position, vec2 resolution) {
  int index = int(position);
  ivec2 pixelIndex = ivec2(
      index % int(resolution.x), index / int(resolution.x));
  return vec2(pixelIndex) / resolution + 0.5 / resolution;
}

void main() {

  vec2 uv = unpackUV(position, resolution);

  vec4 packedCoordinate1 = texture(dataTexture, uv);
  vec3 localPosition = packedCoordinate1.xyz; // + sin(time) * 2.0;

  vec3 mvPosition = (modelViewMatrix * vec4(localPosition, 1.0)).xyz;

  gl_Position = projectionMatrix * modelViewMatrix * vec4(localPosition, 1.0);
  gl_PointSize = 10.0 / -mvPosition.z;
  vColour = mix(
      vec4(1.0),
      vec4(1.0, 0.0, 0.0, 1.0),
      smoothstep(2.0, 1.0, packedCoordinate1.w));
}