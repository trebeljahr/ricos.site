// fragment.glsl
precision highp float;

varying vec2 vUv;

uniform vec2 uResolution;   // screen resolution in pixels
uniform float uTime;        // seconds
uniform vec2 uMouse;        // optional
uniform vec3 uLightDir;     // normalized light direction
uniform vec3 uBaseColor;    // water base color

// parameters (tweak in host app)
const int MAX_SOURCES = 4;
uniform int uNumSources;                        // number of point sources (<= MAX_SOURCES)
uniform vec2 uSourcePos[MAX_SOURCES];           // positions in normalized UV coords (0..1)
uniform float uSourceFreq[MAX_SOURCES];         // spatial frequency (k) for each source
uniform float uSourceAmp[MAX_SOURCES];          // amplitude multiplier for each source
uniform float uGlobalScale;                     // overall scaling of pattern
uniform float uDamping;                         // radial damping coefficient
uniform float uRidgeWidth;                      // width of the bright ridge lines
uniform float uContourContrast;                 // contrast of contours

// helpers
float rand(vec2 p){
    return fract(sin(dot(p, vec2(127.1,311.7))) * 43758.5453123);
}
float noise(vec2 p){
    vec2 i = floor(p);
    vec2 f = fract(p);
    // quintic fade
    vec2 u = f*f*(3.0-2.0*f);
    float a = rand(i + vec2(0.0,0.0));
    float b = rand(i + vec2(1.0,0.0));
    float c = rand(i + vec2(0.0,1.0));
    float d = rand(i + vec2(1.0,1.0));
    return mix(mix(a,b,u.x), mix(c,d,u.x), u.y);
}

// sum of radial standing waves from multiple sources
float computeHeight(vec2 uv){
    // center coordinates in [-1,1] to get isotropic wavelengths independent of resolution
    vec2 p = (uv - 0.5) * uGlobalScale;
    float h = 0.0;

    for(int i=0;i<MAX_SOURCES;i++){
        if(i >= uNumSources) break;
        // source position scaled like above
        vec2 sp = (uSourcePos[i] - 0.5) * uGlobalScale;
        float dx = p.x - sp.x;
        float dy = p.y - sp.y;
        float r = length(vec2(dx,dy));
        float k = max(0.0001, uSourceFreq[i]);  // spatial freq (k)
        float omega = k * 2.0;                  // temporal freq (tweak relationship for different results)
        // standing radial mode: cos(k*r) * cos(omega * t)
        float local = cos(k * r) * cos(omega * uTime);
        // optional small phase noise/irregularity
        float ph = noise(vec2(r*4.0 + float(i), uTime*0.1));
        local *= mix(0.95, 1.05, ph - 0.5);
        // radial damping to keep outer area calm
        float damp = exp(-uDamping * r * r);
        h += uSourceAmp[i] * local * damp;
    }
    // add a low-frequency noise to mimic tiny turbulence
    h += 0.03 * noise(uv * 2.0 + uTime * 0.15);
    return h;
}

// create "ridge" (cymatic visible lines) from height by extracting contours of height
float ridgeFromHeight(float h){
    // Map height to contour bands: emphasize nodes where vertical displacement crosses certain thresholds.
    // We use a sinusoidal mapping + abs to create rings.
    float bands = 6.0; // number of contour bands per unit height (use uniform if desired)
    float v = abs(sin(h * 3.14159 * bands));
    // sharpen
    v = smoothstep(0.5 - uRidgeWidth, 0.5 + uRidgeWidth, v);
    // apply contrast
    v = pow(v, uContourContrast);
    return v;
}

// estimate normal from height using finite differences
vec3 computeNormal(vec2 uv){
    float eps = 1.0 / min(uResolution.x, uResolution.y) * 4.0; // small step scaled to resolution
    float h = computeHeight(uv);
    float hx = computeHeight(uv + vec2(eps, 0.0));
    float hy = computeHeight(uv + vec2(0.0, eps));
    vec3 n = normalize(vec3(hx - h, hy - h, 1.0));
    return n;
}

void main(){
    // UV and aspect correction
    vec2 uv = vUv;
    vec2 aspect = vec2(uResolution.x / uResolution.y, 1.0);
    vec2 uvCorrected = (uv - 0.5) * aspect + 0.5;

    // compute height and ridges
    float height = computeHeight(uvCorrected);
    float ridge = ridgeFromHeight(height);

    // compute normals for lighting
    vec3 n = computeNormal(uvCorrected);
    vec3 lightDir = normalize(uLightDir);
    float diff = clamp(dot(n, lightDir), 0.0, 1.0);

    // simple specular
    vec3 viewDir = vec3(0.0, 0.0, 1.0);
    vec3 halfV = normalize(lightDir + viewDir);
    float spec = pow(max(dot(n, halfV), 0.0), 32.0);

    // base water color (slightly bluish) and rim lighting for ridges
    vec3 base = uBaseColor;
    vec3 ridgeColor = vec3(1.0); // bright lines
    // mix base color by height to get some depth
    base *= (0.6 + 0.4 * (0.5 + 0.5 * height));

    // final color: light+spec plus ridge overlay
    vec3 color = base * (0.2 + 0.8 * diff) + 0.4 * spec;
    // add ridge overlay (additive)
    color = mix(color, color + ridgeColor * ridge * 1.2, ridge);

    // optional subtle vignette
    float dist = distance(uv, vec2(0.5));
    color *= smoothstep(0.9, 0.2, dist);

    gl_FragColor = vec4(clamp(color, 0.0, 1.0), 1.0);
}
