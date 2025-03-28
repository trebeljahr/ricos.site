precision highp float;
precision highp sampler2D;

in vec2 vUvs;

uniform sampler2D dataTexture;

out vec4 out_FragColour;

void main() {
  vec4 packedCoordinate = texture(dataTexture, vUvs);

  out_FragColour = packedCoordinate;
}