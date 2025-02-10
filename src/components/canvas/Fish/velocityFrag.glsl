uniform float delta;
uniform float separationDistance;
uniform float alignmentDistance;
uniform float cohesionDistance;
uniform vec3 predator;

const float width = resolution.x;
const float height = resolution.y;
const float PI = 3.141592653589793;
const float PI_2 = PI * 2.0;
const float SPEED_LIMIT = 10.0;

void main() {
  float zoneRadius = separationDistance + alignmentDistance + cohesionDistance;
  float separationThresh = separationDistance / zoneRadius;
  float alignmentThresh = (separationDistance + alignmentDistance) / zoneRadius;
  float zoneRadiusSquared = zoneRadius * zoneRadius;

  vec2 uv = gl_FragCoord.xy / resolution.xy;
  vec3 fishPos, fishVel;

  vec3 selfPosition = texture2D(texturePosition, uv).xyz;
  vec3 selfVelocity = texture2D(textureVelocity, uv).xyz;

  float dist;
  vec3 dir;
  float distSquared;

  float f;
  float percent;

  vec3 velocity = selfVelocity;

  float limit = SPEED_LIMIT;

  dir = predator - selfPosition;
  dir.z = 0.;
  dist = length(dir);
  distSquared = dist * dist;

  // float preyRadius = 150.0;
  // float preyRadiusSq = preyRadius * preyRadius;

  // move birds away from predator
  // if (dist < preyRadius) {
  //   f = (distSquared / preyRadiusSq - 1.0) * delta * 100.;
  //   velocity += normalize(dir) * f;
  //   limit += 1.0;
  // }

  vec3 central = vec3(0., 0., 0.);
  dir = selfPosition - central;
  dist = length(dir);
  dir.y *= 2.5;
  velocity -= normalize(dir) * delta * 4.;

  for (float y = 0.0; y < height; y++) {
    for (float x = 0.0; x < width; x++) {

      vec2 ref = vec2(x + 0.5, y + 0.5) / resolution.xy;
      fishPos = texture2D(texturePosition, ref).xyz;

      dir = fishPos - selfPosition;
      dist = length(dir);

      if (dist < 0.0001)
        continue;

      distSquared = dist * dist;

      if (distSquared > zoneRadiusSquared)
        continue;

      percent = distSquared / zoneRadiusSquared;

      if (percent < separationThresh) {
        f = (separationThresh / percent - 1.0) * delta;
        velocity -= normalize(dir) * f;
      } else if (percent < alignmentThresh) {
        float threshDelta = alignmentThresh - separationThresh;
        float adjustedPercent = (percent - separationThresh) / threshDelta;

        fishVel = texture2D(textureVelocity, ref).xyz;

        f = (0.5 - cos(adjustedPercent * PI_2) * 0.5 + 0.5) * delta;
        velocity += normalize(fishVel) * f;

      } else {
        float threshDelta = 1.0 - alignmentThresh;
        float adjustedPercent;
        if (threshDelta == 0.) {
          adjustedPercent = 1.;
        } else {
          adjustedPercent = (percent - alignmentThresh) / threshDelta;
        }

        f = (0.5 - (cos(adjustedPercent * PI_2) * -0.5 + 0.5)) * delta;

        velocity += normalize(dir) * f * 5.;
      }
    }
  }

  if (length(velocity) > limit) {
    velocity = normalize(velocity) * limit;
  }

  gl_FragColor = vec4(velocity, 1.0);
}