precision highp float;

uniform sampler2D diffuseTexture;

out vec4 out_FragColour;

in vec4 vColour;

void main() {
  vec4 diffuseSample = texture(diffuseTexture, gl_PointCoord);

  out_FragColour = diffuseSample * vColour;
  out_FragColour.w *= 0.1;
}