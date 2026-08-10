// ─────────────────────────────────────────────────────────────────────────────
// GLSL ES 3.0 shader sources.
//
// Two programs do all the work:
//   • LAYER  — draws one source into a destination rect with fit, opacity,
//              colour correction and rounded corners.
//   • BLEND  — composites two fully-rendered scene textures using a transition.
//
// Rendering transitions as a blend of two offscreen scene textures (rather than
// interpolating layer-by-layer) means every transition works with every scene,
// no matter how many layers it has.
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Shared vertex shader. The quad is a unit square (0..1); the vertex stage maps
 * it into the destination rect and flips Y so texture space matches the way
 * video frames and canvases arrive (origin top-left).
 */
export const QUAD_VERT = /* glsl */ `#version 300 es
precision highp float;

in vec2 a_pos;              // unit quad, 0..1

uniform vec4 u_rect;        // x, y, w, h in normalised frame space
uniform vec4 u_texRect;     // sub-rect of the source texture to sample (fit)
uniform bool u_flipH;

out vec2 v_uv;              // texture coordinate
out vec2 v_local;           // 0..1 position within the destination rect

void main() {
  v_local = a_pos;

  vec2 uv = a_pos;
  if (u_flipH) uv.x = 1.0 - uv.x;
  v_uv = u_texRect.xy + uv * u_texRect.zw;

  // Map unit quad into the destination rect, then into clip space.
  vec2 frame = u_rect.xy + a_pos * u_rect.zw;
  gl_Position = vec4(frame.x * 2.0 - 1.0, 1.0 - frame.y * 2.0, 0.0, 1.0);
}
`

export const LAYER_FRAG = /* glsl */ `#version 300 es
precision highp float;

in vec2 v_uv;
in vec2 v_local;

uniform sampler2D u_tex;
uniform float u_opacity;
uniform float u_brightness;
uniform float u_contrast;
uniform float u_saturation;
uniform float u_cornerRadius;   // normalised to rect height
uniform vec2  u_rectAspect;     // rect size in pixels, for correct corner rounding

out vec4 outColor;

// Rec.709 luma — the broadcast standard weighting.
const vec3 LUMA = vec3(0.2126, 0.7152, 0.0722);

/** Signed distance to a rounded box centred at the origin. */
float roundedBoxSDF(vec2 p, vec2 halfSize, float r) {
  vec2 q = abs(p) - halfSize + r;
  return length(max(q, 0.0)) + min(max(q.x, q.y), 0.0) - r;
}

void main() {
  // Sampling outside the fitted sub-rect means letterbox area: emit nothing so
  // whatever is beneath this layer shows through.
  if (v_uv.x < 0.0 || v_uv.x > 1.0 || v_uv.y < 0.0 || v_uv.y > 1.0) {
    discard;
  }

  vec4 texel = texture(u_tex, v_uv);
  vec3 c = texel.rgb;

  // Colour pipeline: brightness -> contrast -> saturation.
  c += u_brightness;
  c = (c - 0.5) * u_contrast + 0.5;
  float luma = dot(c, LUMA);
  c = mix(vec3(luma), c, u_saturation);
  c = clamp(c, 0.0, 1.0);

  float alpha = texel.a * u_opacity;

  // Rounded corners, antialiased against the rect's pixel dimensions.
  if (u_cornerRadius > 0.0) {
    vec2 halfSize = u_rectAspect * 0.5;
    float r = u_cornerRadius * u_rectAspect.y;
    float d = roundedBoxSDF((v_local - 0.5) * u_rectAspect, halfSize, r);
    alpha *= 1.0 - smoothstep(-1.0, 1.0, d);
  }

  outColor = vec4(c * alpha, alpha);   // premultiplied
}
`

/**
 * Transition blend. `u_mode` selects the effect so a single program covers all
 * of them — avoids a shader swap mid-transition.
 *   0 = fade, 1 = dip, 2 = wipe, 3 = slide
 */
export const BLEND_FRAG = /* glsl */ `#version 300 es
precision highp float;

in vec2 v_uv;
in vec2 v_local;

uniform sampler2D u_from;
uniform sampler2D u_to;
uniform float u_progress;      // 0..1
uniform int   u_mode;
uniform int   u_direction;     // 0 left, 1 right, 2 up, 3 down
uniform float u_softness;
uniform vec3  u_dipColor;

out vec4 outColor;

/** Position along the wipe axis, 0 at the wipe's origin edge. */
float axis(vec2 uv, int dir) {
  if (dir == 0) return 1.0 - uv.x;   // wiping toward the left
  if (dir == 1) return uv.x;         // toward the right
  if (dir == 2) return 1.0 - uv.y;   // upward
  return uv.y;                       // downward
}

void main() {
  vec4 from = texture(u_from, v_uv);
  vec4 to   = texture(u_to,   v_uv);

  if (u_mode == 0) {
    outColor = mix(from, to, u_progress);

  } else if (u_mode == 1) {
    // Dip: fade out to the dip colour over the first half, in from it after.
    vec4 dip = vec4(u_dipColor, 1.0);
    outColor = u_progress < 0.5
      ? mix(from, dip, u_progress * 2.0)
      : mix(dip, to, (u_progress - 0.5) * 2.0);

  } else if (u_mode == 2) {
    // Wipe: soft-edged travelling boundary.
    float a = axis(v_uv, u_direction);
    // Expand the travel range so the edge fully clears the frame at 0 and 1.
    float edge = u_progress * (1.0 + u_softness * 2.0) - u_softness;
    float m = smoothstep(edge - u_softness, edge + u_softness, a);
    outColor = mix(to, from, m);

  } else {
    // Slide: the incoming scene translates in over the outgoing one.
    vec2 offset = vec2(0.0);
    float d = 1.0 - u_progress;
    if (u_direction == 0)      offset = vec2(-d, 0.0);
    else if (u_direction == 1) offset = vec2( d, 0.0);
    else if (u_direction == 2) offset = vec2(0.0, -d);
    else                       offset = vec2(0.0,  d);

    vec2 uv = v_uv - offset;
    if (uv.x < 0.0 || uv.x > 1.0 || uv.y < 0.0 || uv.y > 1.0) {
      outColor = from;
    } else {
      outColor = texture(u_to, uv);
    }
  }
}
`

/** Straight texture copy — used to present a scene with no transition running. */
export const COPY_FRAG = /* glsl */ `#version 300 es
precision highp float;

in vec2 v_uv;
in vec2 v_local;

uniform sampler2D u_tex;

out vec4 outColor;

void main() {
  outColor = texture(u_tex, v_uv);
}
`
