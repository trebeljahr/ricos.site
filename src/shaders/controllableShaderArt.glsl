precision mediump float;

uniform vec2 u_resolution;
uniform float u_time;
uniform float u_pixelRatio;

uniform float chosenShape;
uniform float chosenPalette;
uniform float speedFactor;
uniform float scaleFactor;
uniform float repetitions;
uniform float space;
uniform float depth;
uniform vec3 rgbStrength;
uniform float contrast;
uniform float strength;

// float chosenShape = 5.;
// float chosenPalette = 3.;
// float repetitions = 1.5;
// float speedFactor = 0.5;
// float scaleFactor = 4.0;
// float space = 8.0;
// const float depth = 8.0;
// vec3 rgbStrength = vec3(1., 1., 1.);

vec3 pal(in float t, in vec3 a, in vec3 b, in vec3 c, in vec3 d) {
    return a + b * cos(6.28318 * (c * t + d));
}

vec3 pal1(float p) {
    return pal(p, vec3(0.5, 0.5, 0.5), vec3(0.5, 0.5, 0.5), vec3(1.0, 1.0, 1.0), vec3(0.3, 0.20, 0.20));
}
vec3 pal2(float p) {
    return pal(p, vec3(0.5, 0.5, 0.5), vec3(0.5, 0.5, 0.5), vec3(1.0, 1.0, 0.5), vec3(0.8, 0.90, 0.30));
}
vec3 pal3(float p) {
    return pal(p, vec3(0.5, 0.5, 0.5), vec3(0.5, 0.5, 0.5), vec3(1.0, 0.7, 0.4), vec3(0.0, 0.15, 0.20));
}
vec3 pal4(float p) {
    return pal(p, vec3(0.5, 0.5, 0.5), vec3(0.5, 0.5, 0.5), vec3(2.0, 1.0, 0.0), vec3(0.5, 0.20, 0.25));
}
vec3 pal5(float p) {
    return pal(p, vec3(0.8, 0.5, 0.4), vec3(0.2, 0.4, 0.2), vec3(2.0, 1.0, 1.0), vec3(0.0, 0.25, 0.25));
}

vec3 pal6(float p) {
    return pal(p, vec3(0.5, 0.5, 0.5), vec3(0.5, 0.5, 0.5), vec3(1.0, 1.0, 1.0), vec3(0.0, 0.33, 0.67));
}

vec3 pal7(float p) {
    return pal(p, vec3(0.5, 0.5, 0.5), vec3(0.5, 0.5, 0.5), vec3(1.0, 1.0, 1.0), vec3(0.0, 0.10, 0.20));
}


vec3 customPal(float p) {
    if (chosenPalette == 0.) {
        return pal1(p);
    } else if (chosenPalette == 1.) {
        return pal2(p);
    } else if (chosenPalette == 2.) {
        return pal3(p);
    } else if (chosenPalette == 3.) {
        return pal4(p);
    } else if (chosenPalette == 4.) {
        return pal5(p);
    } else if (chosenPalette == 5.) {
        return pal6(p);
    } else if (chosenPalette == 6.) {
        return pal7(p);
    } else {
        return pal1(p);
    }
}

float dot2(vec2 a) { return dot(a, a); }

float ndot(vec2 a, vec2 b ) { return a.x*b.x - a.y*b.y; }

float sdfHexagon(in vec2 p, in float r) {
    const vec3 k = vec3(-0.866025404, 0.5, 0.577350269);
    p = abs(p);
    p -= 2.0 * min(dot(k.xy, p), 0.0) * k.xy;
    p -= vec2(clamp(p.x, -k.z * r, k.z * r), r);
    return length(p) * sign(p.y);
}

float sdPentagon( in vec2 p, in float r )
{
    const vec3 k = vec3(0.809016994,0.587785252,0.726542528);
    p.x = abs(p.x);
    p -= 2.0*min(dot(vec2(-k.x,k.y),p),0.0)*vec2(-k.x,k.y);
    p -= 2.0*min(dot(vec2( k.x,k.y),p),0.0)*vec2( k.x,k.y);
    p -= vec2(clamp(p.x,-r*k.z,r*k.z),r);    
    return length(p)*sign(p.y);
}

float sdEquilateralTriangle( in vec2 p, in float r ) {
    const float k = sqrt(3.0);
    p.x = abs(p.x) - r;
    p.y = p.y + r/k;
    if( p.x+k*p.y>0.0 ) p = vec2(p.x-k*p.y,-k*p.x-p.y)/2.0;
    p.x -= clamp( p.x, -2.0*r, 0.0 );
    return -length(p)*sign(p.y);
}

float sdHexagram( in vec2 p, in float r )
{
    const vec4 k = vec4(-0.5,0.8660254038,0.5773502692,1.7320508076);
    p = abs(p);
    p -= 2.0*min(dot(k.xy,p),0.0)*k.xy;
    p -= 2.0*min(dot(k.yx,p),0.0)*k.yx;
    p -= vec2(clamp(p.x,r*k.z,r*k.w),r);
    return length(p)*sign(p.y);
}

float sdHeart( in vec2 p , float r)
{
    p.x = abs(p.x);

    if( p.y+p.x>r )
        return sqrt(dot2(p-vec2(0.25,0.75))) - sqrt(2.0)/4.0;
    return sqrt(min(dot2(p-vec2(0.00,1.00)),
                    dot2(p-0.5*max(p.x+p.y,0.0)))) * sign(p.x-p.y);
}

float sdBlobbyCross( in vec2 pos, float he )
{
    pos = abs(pos);
    pos = vec2(abs(pos.x-pos.y),1.0-pos.x-pos.y)/sqrt(2.0);

    float p = (he-pos.y-0.25/he)/(6.0*he);
    float q = pos.x/(he*he*16.0);
    float h = q*q - p*p*p;
    
    float x;
    if( h>0.0 ) { float r = sqrt(h); x = pow(q+r,1.0/3.0)-pow(abs(q-r),1.0/3.0)*sign(r-q); }
    else        { float r = sqrt(p); x = 2.0*r*cos(acos(q/(p*r))/3.0); }
    x = min(x,sqrt(2.0)/2.0);
    
    vec2 z = vec2(x,he*(1.0-2.0*x*x)) - pos;
    return length(z) * sign(z.y);
}

float sdCircle( vec2 p, float r )
{
    return length(p) - r;
}

float shape(vec2 uv, float r) { 
    if (chosenShape == 0.) {
        return sdfHexagon(uv, r);
    }else if (chosenShape == 1.) {
        return sdHexagram(uv, r);
    }else if (chosenShape == 2.) {
        return sdPentagon(uv, r);
    }else if (chosenShape == 3.) {
        return sdEquilateralTriangle(uv, r);
    }else if (chosenShape == 4.) {
        return sdHeart(uv, r);
    }else if (chosenShape == 5.) {
        return sdBlobbyCross(uv, r);
    }else if (chosenShape == 6.) {
        return sdCircle(uv, r);
    }else {
        return sdfHexagon(uv, r);
    }
}

void main() {
    vec2 uv = (gl_FragCoord.xy / u_pixelRatio * 2.0 - u_resolution.xy) / u_resolution.y;
    vec2 uv0 = uv;
    vec3 finalColor = vec3(0.0);
    for(float i = 0.0; i < depth; i++) {
        uv = fract(uv * repetitions) - 0.5;

        float d = shape(uv,scaleFactor) * exp(-length(uv0));
        // d *= exp(-length(uv0 * 0.5));

        float speed = u_time * speedFactor;
        vec3 col = customPal(-length(uv0) + i * 0.9 + speed);

        d = sin(d * space + u_time * speedFactor) / space;
        d = abs(d);
        d = pow(strength /  d, contrast);

        finalColor += col * d;
    }

    gl_FragColor = vec4(finalColor * rgbStrength, 1.0);
}
