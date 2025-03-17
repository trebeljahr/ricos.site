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
uniform mat4 modelMatrix;
uniform int shape; // 0 = Circle, 1.0 = Box, 2 = Rhombus

varying vec2 vUv;
varying vec3 vPosition;

float Lerp(float start, float end, float t) {
  return (1.0 - t) * start + t * end;
}

float InverseLerp(float start, float end, float value) {
  return (value - start) / (end - start);
}

float Remap(float inValue, vec2 inRange, vec2 outRange) {
  float t = InverseLerp(inRange.x, inRange.y, inValue);
  return Lerp(outRange.x, outRange.y, t);
}

float GetSmoothMask(float SDF) {
  float pd = length(vec2(dFdx(SDF), dFdy(SDF)));
  return 1.0 - clamp(SDF / pd, 0., 1.);
}

vec3 GetObjectScale() {
  return vec3(length(vec3(modelMatrix[0].xyz)), length(vec3(modelMatrix[1].xyz)), length(vec3(modelMatrix[2].xyz)));
}

float EllipseSDF( in vec2 p, in vec2 ab )
{
    p = abs(p); if( p.x > p.y ) {p=p.yx;ab=ab.yx;}
    float l = ab.y*ab.y - ab.x*ab.x;
    float m = ab.x*p.x/l;      float m2 = m*m; 
    float n = ab.y*p.y/l;      float n2 = n*n; 
    float c = (m2+n2-1.0)/3.0; float c3 = c*c*c;
    float q = c3 + m2*n2*2.0;
    float d = c3 + m2*n2;
    float g = m + m*n2;
    float co;
    if( d<0.0 )
    {
        float h = acos(q/c3)/3.0;
        float s = cos(h);
        float t = sin(h)*sqrt(3.0);
        float rx = sqrt( -c*(s + t + 2.0) + m2 );
        float ry = sqrt( -c*(s - t + 2.0) + m2 );
        co = (ry+sign(l)*rx+abs(g)/(rx*ry)- m)/2.0;
    }
    else
    {
        float h = 2.0*m*n*sqrt( d );
        float s = sign(q+h)*pow(abs(q+h), 1.0/3.0);
        float u = sign(q-h)*pow(abs(q-h), 1.0/3.0);
        float rx = -s - u - c*4.0 + 2.0*m2;
        float ry = (s - u)*sqrt(3.0);
        float rm = sqrt( rx*rx + ry*ry );
        co = (ry/sqrt(rm-rx)+2.0*g/rm-m)/2.0;
    }
    vec2 r = ab * vec2(co, sqrt(1.0-co*co));
    return length(r-p) * sign(p.y-r.y);
}

float CircleSDF(vec2 p, float radius) {
  return length(p) - radius;
}

float BoxSDF(vec2 p, vec2 halfSize) {
  vec2 d = abs(p) - halfSize;
  return length(max(d, 0.0)) + min(max(d.x, d.y), 0.0);
}

float ndot(vec2 a, vec2 b) {
  return a.x * b.x - a.y * b.y;
}

float RhombusSDF(vec2 p, vec2 b) {
  p = abs(p);
  float h = clamp(ndot(b - 2.0 * p, b) / dot(b, b), -1.0, 1.0);
  float d = length(p - 0.5 * b * vec2(1.0 - h, 1.0 + h));
  return d * sign(p.x * b.y + p.y * b.x - b.x * b.y);
}

vec3 Elongate(vec3 p, vec3 elongation) {
  return p - clamp(p, -elongation, elongation);
}

void main() {
  vec3 objectScale = GetObjectScale();

  // leave some margin space
  float minScale = min(objectScale.x, objectScale.z);
  float margin = minScale * 0.1;

  // we 'elongate' instead of 'scaling' SDF to keep euclidean distance (so we can apply antialias easily)
  vec3 shapeElongation = (objectScale.xzy - minScale) / 2.0;

  // Apply elongation operation to fragment position
  vec3 p = (vPosition) * objectScale;
  vec3 p2 = vec3(p.x, p.z, p.y);
  vec3 q = Elongate(p2, shapeElongation);
  vec2 q2 = vec2(q.x, q.z);

  // CONTAINER
  float halfSize = minScale / 2.0 - margin;

  float healthBarSDF;
  if(shape == 0) {
    if (size.x == size.y) {
      healthBarSDF = CircleSDF(q2, halfSize);
    } else {
      healthBarSDF = EllipseSDF(q2, size / 2. - margin);
    }
  } else if(shape == 1) {
    healthBarSDF = BoxSDF(q2, size / 2. - margin);
  } else {
    healthBarSDF = RhombusSDF(q2, size / 2. - margin);
  }

  float healthBarMask = GetSmoothMask(healthBarSDF);

  // LIQUID/FILLER
  // min(sin) term is used to decrease effect of wave near 0 and 1.0 healthNormalized.
  float waveOffset = waveAmp * cos(waveFreq * (vUv.x + time * waveSpeed)) * min(1.3 * sin(PI * health), 1.0);
  float marginNormalizedY = margin / objectScale.z;
  float borderNormalizedY = borderWidth;
  float fillOffset = marginNormalizedY + borderNormalizedY;

  float healthMapped = Lerp(fillOffset - 0.01, 1.0 - fillOffset, health);
  float fillSDF = vUv.y - healthMapped + waveOffset;
  float fillMask = GetSmoothMask(fillSDF);

  // BORDER 
  float borderSDF = healthBarSDF + borderWidth * objectScale.z;
  float borderMask = 1.0 - GetSmoothMask(borderSDF);

  // Get final color by combining masks
  vec4 outColor = healthBarMask * (fillMask * (1. - borderMask) * fillColor + (1.0 - fillMask) * (1.0 - borderMask) * backgroundColor + borderMask * borderColor);

  // Highlight center
  float val = 2. - healthBarSDF / (minScale / 2.0);
  outColor *= vec4(val, val, val, 1);

  // Add flash effect on low life
  // if(health < lowHealthThreshold) {
  //   float flash = cos(6.0 * time) - 0.5;
  //   outColor.xyz += flash;
  // }

  // gl_FragColor = vec4(fillColor.rgb, 1.0);

  gl_FragColor = outColor;
  // gl_FragColor = vec4(healthBarMask, healthBarMask, healthBarMask, 1.0);
  // gl_FragColor = vec4(fillMask, fillMask, fillMask, 1.0);
  // gl_FragColor = vec4(borderMask, borderMask, borderMask, 1.0);
  // gl_FragColor = vec4(vUv.x, vUv.x, vUv.x, 1.0);
  // gl_FragColor = vec4(vUv.xy, 1.0, 1.);
  // gl_FragColor = vec4(vUv.y, vUv.y, vUv.y, 1.0);
  // gl_FragColor = vec4(vPosition, 1.0);
  // gl_FragColor = vec4(vPosition.yyy, 1.0);
  // gl_FragColor = vec4(gl_FragCoord.xxx / size.x, 1.0);

  // gl_FragColor = vec4(size.x, size.x, size.x, 1.0);
}