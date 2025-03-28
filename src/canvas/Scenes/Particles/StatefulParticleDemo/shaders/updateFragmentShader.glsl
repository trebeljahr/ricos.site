precision highp float;
precision highp sampler2D;

in vec2 vUvs;

out vec4 out_FragColour;

uniform sampler2D currentBuffer;
uniform sampler2D previousBuffer;
uniform sampler2D dataTexture;
uniform float timeElapsed;
uniform float time;


struct AttractorParams {
  vec3 position;
  float radius;
  float intensity;
  float decay;
};

vec3 CalculateAttractorForce(
    vec3 currentPosition, AttractorParams attractorParams) {
  float distToAttractor = distance(currentPosition, attractorParams.position);
  float attractorRadius = attractorParams.radius;
  float distOverRadius = distToAttractor / attractorRadius;

  // Soft attractor
  float decay = attractorParams.decay;
  float attractorIntensity = attractorParams.intensity;
  float attractorForce = attractorIntensity * (
      1.0 - exp(-distOverRadius * decay));

  vec3 dirToAttractor = attractorParams.position - currentPosition;

  return dirToAttractor * attractorForce;
}

void main() {
  vec3 currentPosition = texture(currentBuffer, vUvs).xyz;
  vec3 previousPosition = texture(previousBuffer, vUvs).xyz;
  vec3 deltaPosition = currentPosition - previousPosition;

  // Verlet integration
  vec3 forces = vec3(0.0, -9.8, 0.0);
  float drag = 0.25;

  // Apply forces

  // Apply an attractor force
  // AttractorParams attractorParams = AttractorParams(
  //     texture(dataTexture, vUvs).xyz, 1.0, 500.0, 1.0);
  // forces += CalculateAttractorForce(currentPosition, attractorParams);

  // // Create repulsor force
  // vec3 repulsor = vec3(sin(time * 0.25) * 8.0, 0.0, 0.0);
  // float distToRepulsor = distance(currentPosition, repulsor);
  // {
  //   float repulsorRadius = 3.0;
  //   float distOverRadius = distToRepulsor / repulsorRadius;

  //   // Soft repulsor
  //   float decay = 1.0;
  //   float repulsorIntensity = 1000.0;
  //   float repulsorForce = repulsorIntensity * (
  //       exp(-distOverRadius * decay));
  //   vec3 dirToRepulsor = -normalize(repulsor - currentPosition);
  //   forces += dirToRepulsor * repulsorForce;
  // }

  vec3 newPosition = currentPosition + deltaPosition * drag + (
      forces * timeElapsed * timeElapsed);

  // out_FragColour = vec4(newPosition, dirToRepulsor);
  out_FragColour = vec4(newPosition, 100.0);
}