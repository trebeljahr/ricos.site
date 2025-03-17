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
uniform vec2 size;
uniform int shape; // 0 = Circle, 1 = Box, 2 = Rhombus

varying vec2 vUv;
varying vec3 vPosition;

// SDF Functions
float CircleSDF(vec2 p, float radius) {
  return length(p) - radius;
}

float BoxSDF( in vec2 p, in vec2 b )
{
    vec2 d = abs(p)-b;
    return length(max(d,0.0)) + min(max(d.x,d.y),0.0);
}

float RhombusSDF(vec2 p, vec2 size) {
  vec2 q = abs(p.xy);
  return max(q.x + q.y * 0.5, q.y) - size.x;
}

// Elongate function to maintain proper distance scaling
vec2 Elongate(vec2 p, vec2 elongation) {
  return p - clamp(p, -elongation, elongation);
}

// Smooth mask from SDF
float GetSmoothMask(float dist) {
  return 1.0 - smoothstep(-0.01, 0.01, dist);
}

void main() {
  // Get object scale from uniform
  vec2 objectScale = size;

  // Leave some margin space
  float minScale = min(objectScale.x, objectScale.y);
  float margin = minScale * 0.1;
  float halfSize = minScale / 2.0 - margin;

  // We 'elongate' instead of 'scaling' SDF to keep euclidean distance
  vec2 shapeElongation = (objectScale - minScale) / 2.0;

  // Apply elongation operation to fragment position
  vec2 p = vPosition.xy * objectScale;
  vec2 q = Elongate(p, shapeElongation);
  
  float healthBarSDF;
  vec2 topCorner = vec2(0.0 - margin, 0.0 - margin);
  vec2 bottomCorner = size + vec2(margin, margin);

  if(shape == 0) {
    // Circle
    healthBarSDF = CircleSDF(q, halfSize);
  } else if(shape == 1) {
    healthBarSDF = BoxSDF(topCorner , bottomCorner );
  } else {
    // Rhombus
    healthBarSDF = RhombusSDF(q, vec2(halfSize, halfSize));
  }

  float healthBarMask = GetSmoothMask(healthBarSDF);

  // LIQUID/FILLER
  // min(sin) term is used to decrease effect of wave near 0 and 1 healthNormalized
  float waveOffset = waveAmp * cos(waveFreq * (vUv.x + time * waveSpeed)) *
    min(1.3 * sin(PI * health), 1.0);
  float marginNormalizedY = margin / objectScale.y;
  float borderNormalizedY = borderWidth;
  float fillOffset = marginNormalizedY + borderNormalizedY;

  float healthMapped = mix(fillOffset - 0.01, 1.0 - fillOffset, health);
  float fillSDF = vUv.y - health + waveOffset;
  float fillMask = GetSmoothMask(fillSDF);

  // BORDER
  float borderSDF = healthBarSDF + borderWidth * objectScale.y;
  float borderMask = 1.0 - GetSmoothMask(borderSDF);

  // Get final color by combining masks
  vec4 outColor = healthBarMask * (fillMask * (1.0 - borderMask) * fillColor +
    (1.0 - fillMask) * (1.0 - borderMask) * backgroundColor +
    borderMask * borderColor);

  // Highlight center
  outColor *= vec4(2.0 - healthBarSDF / (minScale / 2.0), 2.0 - healthBarSDF / (minScale / 2.0), 2.0 - healthBarSDF / (minScale / 2.0), 1.0);

  // Add flash effect on low life
  // if(health < lowHealthThreshold) {
  //   float flash = 0.1 * cos(6.0 * time) + 0.1;
  //   outColor.rgb += flash;
  // }

  gl_FragColor = outColor;
  // gl_FragColor = vec4(healthBarMask, healthBarMask, healthBarMask, 1.0);
  // gl_FragColor = vec4(fillMask, fillMask, fillMask, 1.0);
  // gl_FragColor = vec4(borderMask, borderMask, borderMask, 1.0);
  // gl_FragColor = vec4(vUv.x, vUv.x, vUv.x, 1.0);
  // gl_FragColor = vec4(size.x, size.x, size.x, 1.0);
}