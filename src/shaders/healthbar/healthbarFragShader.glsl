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

// Smooth mask from SDF
float GetSmoothMask(float dist) {
  return 1.0 - smoothstep(-0.005, 0.005, dist);
}

void main() {
  // Scale UVs from [0,1] to [-0.5,0.5]
  vec2 centeredUV = vUv - 0.5;
  
  // Normalize aspect ratio to keep shapes consistent regardless of mesh dimensions
  float aspect = size.x / size.y;
  vec2 normalizedUV = vec2(centeredUV.x * aspect, centeredUV.y);
  
  // CONTAINER
  float sdf;
  if (shape == 0) {
    // Circle - use smaller radius to fit in the plane
    sdf = CircleSDF(normalizedUV, 0.4);
  } else if (shape == 1) {
    // Box
    sdf = BoxSDF(normalizedUV, vec2(0.4));
  } else {
    // Rhombus
    sdf = RhombusSDF(normalizedUV, 0.35);
  }
  
  // Create smooth mask from SDF
  float shapeMask = GetSmoothMask(sdf);
  
  // Calculate border
  float borderSdf = sdf + borderWidth;
  float borderMask = GetSmoothMask(borderSdf) - shapeMask;
  
  // Liquid fill level
  float fillHeight = 1.0 - healthNormalized;
  
  // Add wave effect to liquid
  float waveOffset = waveAmp * sin(waveFreq * centeredUV.x + time * waveSpeed);
  waveOffset *= sin(PI * healthNormalized); // Less effect when health is very low or very high
  
  // Create fill mask (use vUv directly for consistent vertical fill)
  float fillSdf = vUv.y - (fillHeight + waveOffset);
  float fillMask = step(0.0, fillSdf);
  
  // Combine masks to get the final result
  vec4 fillLayerColor = fillColor * (1.0 - fillMask) * shapeMask;
  vec4 bgLayerColor = backgroundColor * fillMask * shapeMask;
  vec4 borderLayerColor = borderColor * borderMask;
  
  // Combine all layers
  vec4 finalColor = fillLayerColor + bgLayerColor + borderLayerColor;
  
  // Add flash effect for low health
  if (healthNormalized < lowHealthThreshold) {
    float flash = 0.1 * sin(6.0 * time) + 0.1;
    finalColor.rgb += flash * shapeMask;
  }
  
  // Add subtle highlight
  float highlight = 0.2 * (1.0 - length(normalizedUV * 2.0));
  finalColor.rgb += highlight * shapeMask;
  
  gl_FragColor = finalColor;
  
  // Discard fragments outside the health bar to ensure proper transparency
  if (finalColor.a < 0.01) discard;
}