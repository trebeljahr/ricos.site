precision highp float;

uniform sampler2D diffuseTexture;

out vec4 out_Colour;

void main() {
  vec4 diffuseSample = texture(diffuseTexture, gl_PointCoord);
  out_Colour = diffuseSample;
}