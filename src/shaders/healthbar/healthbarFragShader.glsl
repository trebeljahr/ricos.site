#define PI 3.14159265359

uniform float health;
uniform float lowHealthThreshold;
uniform vec4 fillColor;
uniform vec4 backgroundColor;
uniform vec4 borderColor;
uniform float borderWidth;
uniform float waveAmp;
uniform float waveFreq;
uniform float waveSpeed;
uniform float time;
uniform vec3 size;
uniform int shape; // 0 = Circle, 1 = Box, 2 = Rhombus

varying vec2 vUv;
varying vec3 vPosition;

// SDF Functions
float CircleSDF(vec2 p, float r) {
  return length(p) - r;
}

float BoxSDF(vec2 p, vec2 b) {
  vec2 d = abs(p) - b;
  return length(max(d, 0.0)) + min(max(d.x, d.y), 0.0);
}

float RhombusSDF(vec2 p, float size) {
  return max(abs(p.x) + abs(p.y) * 0.5, abs(p.y)) - size;
}

float GetSmoothMask(float dist) {
  return 1.0 - smoothstep(-0.005, 0.005, dist);
}

void main() {
  vec2 centeredUV = vUv - 0.5;

  float aspect = size.x / size.y;
  vec2 normalizedUV = vec2(centeredUV.x * aspect, centeredUV.y);

  float sdf;
  if(shape == 0) {
    sdf = CircleSDF(normalizedUV, 0.5);
  } else if(shape == 1) {
    sdf = BoxSDF(normalizedUV, vec2(0.5));
  } else {
    sdf = RhombusSDF(normalizedUV, 0.35);
  }

  float shapeMask = GetSmoothMask(sdf);

  float borderSdf = sdf + borderWidth;
  float borderMask = GetSmoothMask(borderSdf) - shapeMask;

  float waveEffect = waveAmp * sin(waveFreq * vUv.x + time * waveSpeed) * sin(PI * health);

  float isFilled = 1.0 - step(health, vUv.y);

  vec4 finalColor = vec4(0.0, 0.0, 0.0, 0.0);
  finalColor += fillColor * isFilled * shapeMask;
  finalColor += backgroundColor * (1.0 - isFilled) * shapeMask;
  finalColor += borderColor * borderMask;

  // Add flash effect for low health
  if(health < lowHealthThreshold) {
    float flash = 0.1 * sin(6.0 * time) + 0.1;
    finalColor.rgb += flash * shapeMask * isFilled;
  }

  // Add subtle highlight
  float highlight = 0.2 * (1.0 - length(normalizedUV * 2.0));
  finalColor.rgb += highlight * shapeMask;

  // gl_FragColor = vec4(vUv.yyy, 1.0);
  // gl_FragColor = vec4(health, health, health, 1.0);
  // float fracTime = fract(time);
  // gl_FragColor = vec4(fracTime, fracTime, fracTime, 1.0);
  // gl_FragColor = vec4(health, health, health, 1.0);

  gl_FragColor = finalColor;

  if(finalColor.a < 0.01)
    discard;
}