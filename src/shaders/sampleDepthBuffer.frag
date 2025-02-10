uniform vec3 cameraPos;
uniform float uTime;
uniform vec3 cameraLookAt;

#define CAM_DEPTH 30.0
#define surfaceLevel 45.0

const vec3 up = vec3(0., 1., 0.);

struct ray {
  vec3 o;
  vec3 d;
};

struct camera {
  vec3 left;
  vec3 up;

  vec3 center; // the center of the screen, in world coords
  vec3 i;      // where the current ray intersects the screen, in world coords
  ray ray;     // the current ray: from cam pos, through current uv projected on

  vec3 lookAt; // the lookat point
};

camera cam;

float remap(float value, float min1, float max1, float min2, float max2) {
  return min2 + (value - min1) * (max2 - min2) / (max1 - min1);
}

float clampedPos;
float distFromSurface;

void cameraSetup(vec2 uv, vec3 position, vec3 lookAt) {
  cam.lookAt = lookAt;
  vec3 forward = normalize(cam.lookAt - position);
  cam.left = cross(up, forward);
  cam.up = cross(forward, cam.left);

  cam.center = position + forward;
  cam.i = cam.center + cam.left * uv.x + cam.up * uv.y;

  cam.ray.o = position;
  cam.ray.d = normalize(cam.i - position);
  // cam.ray.d.y = -cam.ray.d.y
}

float waterSurface(vec3 r) {
  float t = uTime * 5.;

  vec2 p = r.xz * (CAM_DEPTH / r.y) * 3.;

  float bump = sin(p.x * 2. + t + sin(p.y * .73 + t));
  bump += sin(p.x * 1.43 + t) * .5;

  bump += sin(p.x * 1.21 - t + sin(p.y * .3 - t * .34));
  bump += sin(p.x * .43 - t) * .5;

  bump += sin(p.y * .81 - t + sin(p.x * .334 - t * .34));
  bump += sin(p.y * .63 - t) * .5;

  float u = dot(r, up);
  bump *= u * smoothstep(9., 1., u);
  bump *= smoothstep(.5, 1., u) * .05;

  // bump = mix(0.0, bump, distFromSurface);

  return bump;
}

vec4 background(vec3 r) {
  if (distFromSurface == 1.0) {
    return vec4(1., 1., 1., 1);
  }

  float x = atan(r.x, r.z);
  float y = PI * 0.5 - acos(r.y);

  vec3 upCol = vec3(.15, .25, .6);
  vec3 col = mix(upCol * 0.05, upCol, distFromSurface);

  float u = dot(r, up) * .5 + .5;

  // col = mix(col * 0.05, col, u * u);

  // col = mix(col * 0.05, col, distFromSurface);

  // add god rays
  float t = uTime * 4.;
  float a = sin(r.x);

  float beam = clamp(sin(10. * x + a * y * 5. + t), 0., 1.);
  beam *= clamp(sin(7. * x + a * y * 3.5 - t), 0., 1.);

  float beam2 = clamp(sin(42. * x + a * y * 21. - t), 0., 1.);
  beam2 *= clamp(sin(34. * x + a * y * 17. + t), 0., 1.);

  beam += beam2;

  // beam = mix(beam, 0.0, distFromSurface);

  col *= 1. + beam * mix(0.001, 0.1, distFromSurface);

  return vec4(col.xyz, 1);
}

vec3 BgCol(vec3 rd) {
  float t, gd, b;
  t = 4. * uTime;
  b = dot(vec2(atan(rd.x, rd.z), 0.5 * PI - acos(rd.y)), vec2(2., sin(rd.x)));
  gd = (clamp(sin(5. * b + t), 0., 1.) * clamp(sin(3.5 * b - t), 0., 1.) +
        clamp(sin(21. * b - t), 0., 1.) * clamp(sin(17. * b + t), 0., 1.)) *
       (1. - smoothstep(0.4, 0.6, rd.y));
  return 0.8 * vec3(0.2, 0.7, 1.) * (0.24 + 0.44 * (rd.y + 1.) * (rd.y + 1.)) *
         (1. + 0.06 * gd);
}

float WatShd(vec3 rd) {
  vec2 p;
  float t, h;
  p = 10. * rd.xz / rd.y;
  t = uTime * 2.;
  h = sin(p.x * 2. + t * 0.77 + sin(p.y * 0.73 - t)) +
      sin(p.y * 0.81 - t * 0.89 + sin(p.x * 0.33 + t * 0.34)) +
      (sin(p.x * 1.43 - t) + sin(p.y * 0.63 + t)) * 0.5;
  h *= smoothstep(0.5, 1., rd.y) * 1.;
  return h;
}

void mainImage(const in vec4 inputC, const in vec2 uv, out vec4 outputC) {
  clampedPos = clamp(cameraPos.y, 0.0, surfaceLevel);
  distFromSurface = remap(clampedPos, 0.0, surfaceLevel, 0.0, 1.0);

  // vec3 invertedCamera = vec3(-cameraLookAt.x, cameraLookAt.y,
  // cameraLookAt.z);
  cameraSetup(uv, cameraPos, cameraLookAt);

  float depth = texture(depthBuffer, uv).x;
  float clampedDepth = clamp(depth, 0.0, 1.0);

  // float waves;
  // if (clampedDepth == 1.0) {
  //   waves = waterSurface(cam.ray.d) * 1.2;
  // } else {
  //   waves = 0.0;
  // }

  // vec4 bg = vec4(BgCol(cam.ray.d), 1.);
  // vec4 bg = background(cam.ray.d);

  // if (clampedDepth == 1. && distFromSurface > 0.6) {
  //   outputC = outputC + waterSurface(cam.ray.d) * 1.2;
  // }

  vec4 bg = background(cam.ray.d); //  + waves;

  if (clampedDepth == 1.) {
    outputC = bg; // + WatShd(cam.ray.d);
  } else {
    float darkness = mix(0., mix(0.3, 0., clampedDepth), distFromSurface);
    outputC = mix(inputC - darkness, bg, clampedDepth);
  }

  if (distFromSurface >= 1.) {
    outputC = inputC;
  }

  // outputC = vec4(clampedDepth, clampedDepth, clampedDepth, 1);
}
