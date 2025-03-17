// Fragment Shader
#define PI 3.14159265359

uniform float healthNormalized;
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
uniform int shape;

varying vec2 vUv;
varying vec4 vPosition;

// SDF Functions
float CircleSDF(vec3 p, float radius) {
  return length(p) - radius;
}

float BoxSDF(vec3 p, float size) {
  vec3 d = abs(p) - size;
  return min(max(d.x, max(d.y, d.z)), 0.0) + length(max(d, 0.0));
}

float RhombusSDF(vec3 p, vec2 size) {
  vec2 q = abs(p.xy);
  return max(q.x + q.y * 0.5, q.y) - size.x;
}

// Elongate function to maintain proper distance scaling
vec3 Elongate(vec3 p, vec3 elongation) {
  return p - clamp(p, -elongation, elongation);
}

// Smooth mask from SDF
float GetSmoothMask(float dist) {
  return 1.0 - smoothstep(-0.01, 0.01, dist);
}

void main() {
  // Get object scale from uniform
  vec3 objectScale = size;
  
  // Leave some margin space
  float minScale = min(objectScale.x, objectScale.y);
  float margin = minScale * 0.1;
  
  // We 'elongate' instead of 'scaling' SDF to keep euclidean distance
  vec3 shapeElongation = (objectScale - minScale) / 2.0;
  
  // Apply elongation operation to fragment position
  vec3 p = vPosition.xyz * objectScale;
  vec3 q = Elongate(p, shapeElongation);
  
  // CONTAINER
  float halfSize = minScale / 2.0 - margin;
  
  float healthBarSDF;
  if (shape == 0) {
    // Circle
    healthBarSDF = CircleSDF(q, halfSize);
  } else if (shape == 1) {
    // Box
    healthBarSDF = BoxSDF(q, halfSize);
  } else {
    // Rhombus
    healthBarSDF = RhombusSDF(q, vec2(halfSize, halfSize));
  }
  
  float healthBarMask = GetSmoothMask(healthBarSDF);
  
  // LIQUID/FILLER
  // min(sin) term is used to decrease effect of wave near 0 and 1 healthNormalized
  float waveOffset = waveAmp * cos(waveFreq * (vUv.x + time * waveSpeed)) * 
                     min(1.3 * sin(PI * healthNormalized), 1.0);
  float marginNormalizedY = margin / objectScale.y;
  float borderNormalizedY = borderWidth;
  float fillOffset = marginNormalizedY + borderNormalizedY;
  
  float healthMapped = mix(fillOffset - 0.01, 1.0 - fillOffset, healthNormalized);
  float fillSDF = vUv.y - healthMapped + waveOffset;
  float fillMask = GetSmoothMask(fillSDF);
  
  // BORDER
  float borderSDF = healthBarSDF + borderWidth * objectScale.y;
  float borderMask = 1.0 - GetSmoothMask(borderSDF);
  
  // Get final color by combining masks
  vec4 outColor = healthBarMask * (
    fillMask * (1.0 - borderMask) * fillColor + 
    (1.0 - fillMask) * (1.0 - borderMask) * backgroundColor + 
    borderMask * borderColor
  );
  
  // Highlight center
  outColor *= vec4(2.0 - healthBarSDF / (minScale / 2.0), 2.0 - healthBarSDF / (minScale / 2.0), 2.0 - healthBarSDF / (minScale / 2.0), 1.0);
  
  // // Add flash effect on low life
  // if (healthNormalized < lowHealthThreshold) {
  //   float flash = 0.1 * cos(6.0 * time) + 0.1;
  //   outColor.rgb += flash;
  // }
  
  gl_FragColor = outColor;
}