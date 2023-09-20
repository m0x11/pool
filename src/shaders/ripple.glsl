#define PI 3.141592653589793
#define TAU 6.283185307179586
#define pow2(x) (x * x)

struct Skeleton {
  vec2 origin;
  vec2 end;
  float proportion;
  int index;
};

varying vec2 v_Uvs;

uniform float u_time;
uniform sampler2D u_buffer;
uniform vec2 u_resolution;
uniform vec3 u_mouse;
uniform int u_frame;
uniform sampler2D u_environment;
uniform bool u_simulate;
uniform Skeleton u_skeleton;

//fresnel
const float bias = .2;
const float scale = 10.;
const float power = 10.1;

//blur
const float blurMultiplier = 0.95;
const float blurStrength = 2.98;
const int samples = 8;
const float sigma = float(samples) * 0.25;

// UKFABT


float gaussian(vec2 i) {
    return 1.0 / (2.0 * PI * pow2(sigma)) * exp(-((pow2(i.x) + pow2(i.y)) / (2.0 * pow2(sigma))));
}
vec3 blur(sampler2D sp, vec2 uv, vec2 scale) {
    vec3 col = vec3(0.0);
    float accum = 0.0;
    float weight;
    vec2 offset;
    for (int x = -samples / 2; x < samples / 2; ++x) {
        for (int y = -samples / 2; y < samples / 2; ++y) {
            offset = vec2(x, y);
            weight = gaussian(offset);
            col += texture2D(sp, uv + scale * offset).rgb * weight;
            accum += weight;
        }
    }
    return col / accum;
}



vec3 envMap(vec3 rd, vec3 sn, float scale){
    vec3 col = texture2D(u_environment, rd.xy - .5).rgb*5.;
    col *= normalize(col);
    return col;
}

float bumpMap(vec2 uv, float height, inout vec3 colourmap) {
    vec3 shade;
    vec2 sampleX = gl_FragCoord.xy / u_resolution.xy;
    sampleX += uv;
    vec2 ps = vec2(1.0) / u_resolution.xy;
    shade = vec3(blur(u_buffer, sampleX, ps*blurStrength));
    return 1. - shade.x * height;
}
float bumpMap(vec2 uv, float height) {
    vec3 colourmap;
    return bumpMap(uv, height, colourmap);
}

vec4 renderPass(vec2 uv, inout float distortion) {
    vec3 surfacePos = vec3(uv, 0.0);
    vec3 ray = normalize(vec3(uv, 1.));
    vec3 lightPos = vec3(cos(u_time * .5 + 2.) * 2., 1. + sin(u_time * .5 + 2.) * 2., -3.);
    vec3 normal = vec3(0., 0., -1);
    vec2 sampleDistance = vec2(.005, 0.);
    vec3 colourmap;
    float fx = bumpMap(sampleDistance.xy, .2);
    float fy = bumpMap(sampleDistance.yx, .2);
    float f = bumpMap(vec2(0.), .2, colourmap);

    distortion = f;

    fx = (fx-f)/sampleDistance.x;
    fy = (fy-f)/sampleDistance.x;
    normal = normalize( normal + vec3(fx, fy, 0) * 0.2 );

    float shade = bias + (scale * pow(1.0 + dot(normalize(surfacePos-vec3(uv, -3.0)), normal), power));

    vec3 lightV = lightPos - surfacePos;
    float lightDist = max(length(lightV), 0.001);
    lightV /= lightDist;

    vec3 lightColour = vec3(.8, .8, 1.);

    float shininess = .9;
    float brightness = 1.;

    float falloff = 0.05;
    float attenuation = 1./(1.0 + lightDist*lightDist*falloff);

    float diffuse = max(dot(normal, lightV), 0.);
    float specular = pow(max(dot( reflect(-lightV, normal), -ray), 0.), 52.) * shininess;

    vec3 reflect_ray = reflect(vec3(uv, 1.), normal * 1.);
    vec3 tex = envMap(reflect_ray, normal, 1.5) * (shade + .5); // Fake environment mapping.

    vec3 texCol = (vec3(.9, .9, .9) + tex * brightness) * .5;

    float metalness = (1. - colourmap.x);
    metalness *= metalness;

    vec3 colour = (texCol * (diffuse*vec3(.3, .3, .3)*2. + 0.1) + lightColour*specular * f * 2. * metalness)*attenuation*1.5;

    return vec4(colour, 1.);
}

// MO
vec4 ripple (vec2 uv) {
    vec3 e = vec3(vec2(3.6)/u_resolution.xy,0.);
    vec2 s = gl_FragCoord.xy / u_resolution.xy;
    float ratio = u_resolution.x / u_resolution.y;
    vec2 mouse = u_mouse.xy - uv;
    vec4 fragcolour = texture2D(u_buffer, s);
    float shade = 0.;
    shade = smoothstep(.02 + abs(sin(u_time*10.) * .006), .0, length(mouse)); 
    vec4 texcol = fragcolour;
    float d = shade * 2.;
    float t = texture2D(u_buffer, s-e.zy, 1.).x;
    float r = texture2D(u_buffer, s-e.xz, 1.).x;
    float b = texture2D(u_buffer, s+e.xz, 1.).x;
    float l = texture2D(u_buffer, s+e.zy, 1.).x;
    d += -(texcol.y-.5)*2. + (t + r + b + l - 2.);
    d *= .99;
    //wtf does this do
    d *= float(u_frame > 5);
    d = d*.5+.5;
    fragcolour = vec4(d, texcol.x, 0, 0);
    return fragcolour;
}

void main() {
    vec2 uv = (gl_FragCoord.xy - 0.5 * u_resolution.xy) / min(u_resolution.y, u_resolution.x);
    vec4 color = vec4(0.0);
    
    if (u_simulate) {
        color = ripple(uv);
    } else {
      vec2 sampleX = gl_FragCoord.xy / u_resolution.xy;

      float distortion;
      vec4 reflections = renderPass(uv, distortion);
      
      vec4 c = texture2D(u_environment, uv/1.5+distortion).rgba;
      color = c * c * c * .4;
      color *= color; 
      color += (texture2D(u_buffer, sampleX+.03).x)*.1 - .1;
      color += reflections *.01;
    }
    gl_FragColor = color;
}