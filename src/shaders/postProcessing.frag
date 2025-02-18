precision highp float;
// uniform sampler2D uScene;
uniform vec2 uResolution;

void main() {
  vec2 uv = gl_FragCoord.xy / uResolution.xy;

  vec3 color = vec3(uv, 1.0);

  float depth = texture(depthTexture, vUv).x;
  gl_FragColor = vec4(depth, 1.0);

  //   color = texture2D(uScene, uv).rgb;
  //   color.r += sin(uv.x * 50.0);

  gl_FragColor = vec4(color, 1.0);
}