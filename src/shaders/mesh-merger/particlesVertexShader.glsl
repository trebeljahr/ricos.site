precision highp float;
precision highp sampler2DArray;


uniform sampler2DArray dataTexture;
uniform float dataTextureIndex;
uniform float dataTextureLength;
uniform float time;
uniform vec2 resolution;

uniform mat4 modelViewMatrix;
uniform mat4 projectionMatrix;

in float position;


vec2 unpackUV(float position, vec2 resolution) {
  int index = int(position);
  ivec2 pixelIndex = ivec2(
      index % int(resolution.x), index / int(resolution.x));
  return vec2(pixelIndex) / resolution + 0.5 / resolution;
}

void main() {

  vec2 uv = unpackUV(position, resolution);
  int i0 = int(dataTextureIndex);
  int i1 = (i0 + 1) % int(dataTextureLength);
  float t = smoothstep(0.25, 0.75, fract(dataTextureIndex));

  vec3 packedCoordinate1 = texture(dataTexture, vec3(uv, float(i0))).xyz;
  vec3 packedCoordinate2 = texture(dataTexture, vec3(uv, float(i1))).xyz;

  vec3 localPosition = mix(packedCoordinate1, packedCoordinate2, t);

  vec3 mvPosition = (modelViewMatrix * vec4(localPosition, 1.0)).xyz;

  gl_Position = projectionMatrix * modelViewMatrix * vec4(localPosition, 1.0);
  gl_PointSize = 10.0 / -mvPosition.z;
}