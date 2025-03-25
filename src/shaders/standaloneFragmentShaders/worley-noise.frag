precision mediump float;

uniform float u_time;
uniform vec2 u_resolution;

vec2 noise2x2(vec2 p) {
  float x = dot(p, vec2(123.4, 234.5));
  float y = dot(p, vec2(345.6, 456.7));
  vec2 noise = vec2(x, y);
  noise = sin(noise);
  noise = noise * 43758.5453;
  noise = fract(noise);
  return noise;
}

void main() {
  vec2 uv = gl_FragCoord.xy / u_resolution;
  uv = gl_FragCoord.xy / u_resolution.y;

  vec3 color = vec3(0.0);

  uv = uv * 8.0;
  vec2 currentGridId = floor(uv);
  vec2 currentGridCoord = fract(uv);
  color = vec3(currentGridCoord, 0.0);
  currentGridCoord = currentGridCoord - 0.5;
  color = vec3(currentGridCoord, 0.0);

  vec2 redGridUv = currentGridCoord;
  redGridUv = abs(redGridUv);
  float distToEdgeOfGridCell = 2.0 * max(redGridUv.x, redGridUv.y);

  color = vec3(distToEdgeOfGridCell);
  color = vec3(smoothstep(0.5, 1.0, distToEdgeOfGridCell));
  color = vec3(smoothstep(0.9, 1.0, distToEdgeOfGridCell), 0.0, 0.0);

  vec3 redGridColor = vec3(smoothstep(0.9, 1.0, distToEdgeOfGridCell), 0.0, 0.0);

  float pointsOnGrid = 0.0;
  float minDistFromPixel = 100.0;

  for(float i = -1.0; i <= 1.0; i++) {
    for(float j = -1.0; j <= 1.0; j++) {
      vec2 adjGridCoords = vec2(i, j);
      vec2 pointOnAdjGrid = adjGridCoords;

      vec2 noise = noise2x2(currentGridId + adjGridCoords);
      pointOnAdjGrid = adjGridCoords + sin(u_time * noise) * 0.5;

      float dist = length(currentGridCoord - pointOnAdjGrid);
      minDistFromPixel = min(dist, minDistFromPixel);

      pointsOnGrid += smoothstep(0.95, 0.96, 1.0 - dist);
    }
  }

  vec3 pointsOnGridColor = vec3(pointsOnGrid);
  color = redGridColor + pointsOnGridColor;
  color = redGridColor + pointsOnGridColor + minDistFromPixel;
  color = redGridColor + minDistFromPixel;

  color = vec3(minDistFromPixel);
  color = vec3(smoothstep(0.0, 1.0, minDistFromPixel));

  color = vec3(smoothstep(0.25, 1.0, 1.0 - minDistFromPixel));

  color = vec3(smoothstep(0.2, 1.0, 1.0 - minDistFromPixel)) - pointsOnGridColor;

  gl_FragColor = vec4(color, 1.0);
}