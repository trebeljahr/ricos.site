varying vec3 vNormal;

uniform vec3 fogColor;
uniform float fogNear;
uniform float fogFar;
varying float v_fogDepth;

void main() {
  // if (gl_FragColor.a < 0.51) discard;

  vec3 green = vec3(0.55, 0.71, 0.3);
  float factor = smoothstep(fogNear, fogFar, v_fogDepth);

  vec3 normal = normalize(vNormal);
  float lighting = dot(normal, normalize(vec3(10))) * 0.1;

  gl_FragColor.rgb = mix(green, fogColor, factor) + lighting;
  gl_FragColor.a = 1.0;
}