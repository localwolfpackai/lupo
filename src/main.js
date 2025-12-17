/**
 * WebGL Playground - Main Entry
 * ================================
 * Morphing shapes with live color control
 */

import Phenomenon from 'phenomenon';

// ============================================
// Configuration
// ============================================

let config = {
  grid: 10,
  duration: 0.6,
  cubeSize: 0.07,
  speed: 0.003,
  morphSpeed: 0.002,
  letterCycleSpeed: 8000, // ms between letter changes
  clearColor: [0, 0, 0, 1], // Jet black for immersion
  // Color settings (HSL)
  hue: 0.55,
  saturation: 0.65,
  lightness: 0.55,
  hueSpread: 0.15
};

// Global references
let renderer = null;
let currentInstance = null;

// ============================================
// Color Utilities
// ============================================

function h2r(p, q, t) {
  if (t < 0) t += 1;
  if (t > 1) t -= 1;
  if (t < 1 / 6) return p + (q - p) * 6 * t;
  if (t < 1 / 2) return q;
  if (t < 2 / 3) return p + (q - p) * 6 * (2 / 3 - t);
  return p;
}

function getHSL(h, s, l) {
  h = (h % 1 + 1) % 1;
  s = Math.max(0, Math.min(1, s));
  l = Math.max(0, Math.min(1, l));
  if (s === 0) return [l, l, l];
  const p = l <= 0.5 ? l * (1 + s) : l + s - l * s;
  const q = 2 * l - p;
  return [h2r(q, p, h + 1 / 3), h2r(q, p, h), h2r(q, p, h - 1 / 3)];
}

function getRandom(value) {
  const floor = -value;
  return floor + Math.random() * value * 2;
}

// ============================================
// Geometry Generators
// ============================================

// Cube vertices
function cubeGeometry(size) {
  return [
    { x: size, y: size, z: size }, { x: size, y: -size, z: size }, { x: size, y: size, z: -size },
    { x: size, y: -size, z: size }, { x: size, y: -size, z: -size }, { x: size, y: size, z: -size },
    { x: -size, y: size, z: -size }, { x: -size, y: -size, z: -size }, { x: -size, y: size, z: size },
    { x: -size, y: -size, z: -size }, { x: -size, y: -size, z: size }, { x: -size, y: size, z: size },
    { x: -size, y: size, z: -size }, { x: -size, y: size, z: size }, { x: size, y: size, z: -size },
    { x: -size, y: size, z: size }, { x: size, y: size, z: size }, { x: size, y: size, z: -size },
    { x: -size, y: -size, z: size }, { x: -size, y: -size, z: -size }, { x: size, y: -size, z: size },
    { x: -size, y: -size, z: -size }, { x: size, y: -size, z: -size }, { x: size, y: -size, z: size },
    { x: -size, y: size, z: size }, { x: -size, y: -size, z: size }, { x: size, y: size, z: size },
    { x: -size, y: -size, z: size }, { x: size, y: -size, z: size }, { x: size, y: size, z: size },
    { x: size, y: size, z: -size }, { x: size, y: -size, z: -size }, { x: -size, y: size, z: -size },
    { x: size, y: -size, z: -size }, { x: -size, y: -size, z: -size }, { x: -size, y: size, z: -size }
  ];
}

// Sphere vertices (approximation using cube vertices morphed to sphere)
function sphereGeometry(size) {
  const cube = cubeGeometry(size);
  return cube.map(v => {
    const len = Math.sqrt(v.x * v.x + v.y * v.y + v.z * v.z);
    return {
      x: (v.x / len) * size,
      y: (v.y / len) * size,
      z: (v.z / len) * size
    };
  });
}

// Diamond/Octahedron vertices
function diamondGeometry(size) {
  const s = size * 1.2;
  return [
    // Top pyramid
    { x: 0, y: s, z: 0 }, { x: s, y: 0, z: 0 }, { x: 0, y: 0, z: s },
    { x: 0, y: s, z: 0 }, { x: 0, y: 0, z: s }, { x: -s, y: 0, z: 0 },
    { x: 0, y: s, z: 0 }, { x: -s, y: 0, z: 0 }, { x: 0, y: 0, z: -s },
    { x: 0, y: s, z: 0 }, { x: 0, y: 0, z: -s }, { x: s, y: 0, z: 0 },
    // Bottom pyramid
    { x: 0, y: -s, z: 0 }, { x: 0, y: 0, z: s }, { x: s, y: 0, z: 0 },
    { x: 0, y: -s, z: 0 }, { x: -s, y: 0, z: 0 }, { x: 0, y: 0, z: s },
    { x: 0, y: -s, z: 0 }, { x: 0, y: 0, z: -s }, { x: -s, y: 0, z: 0 },
    { x: 0, y: -s, z: 0 }, { x: s, y: 0, z: 0 }, { x: 0, y: 0, z: -s },
    // Fill remaining vertices with center to match cube count
    { x: 0, y: 0, z: 0 }, { x: 0, y: 0, z: 0 }, { x: 0, y: 0, z: 0 },
    { x: 0, y: 0, z: 0 }, { x: 0, y: 0, z: 0 }, { x: 0, y: 0, z: 0 },
    { x: 0, y: 0, z: 0 }, { x: 0, y: 0, z: 0 }, { x: 0, y: 0, z: 0 },
    { x: 0, y: 0, z: 0 }, { x: 0, y: 0, z: 0 }, { x: 0, y: 0, z: 0 }
  ];
}

// ============================================
// Shaders - Enhanced with morphing
// ============================================

const vertex = `
  attribute vec3 aPositionStart;
  attribute vec3 aControlPointOne;  
  attribute vec3 aControlPointTwo;  
  attribute vec3 aPositionEnd;  
  attribute vec3 aPosition;  
  attribute vec3 aPositionMorph; // Target morph position
  attribute vec3 aColor;  
  attribute float aOffset;  

  uniform float uProgress;
  uniform float uMorph;
  uniform float uRotation;
  uniform vec3 uColorShift;
  uniform mat4 uProjectionMatrix;
  uniform mat4 uModelMatrix;
  uniform mat4 uViewMatrix;

  varying vec3 vColor;
  varying float vDepth;

  vec3 bezier4(vec3 a, vec3 b, vec3 c, vec3 d, float t) {
    return mix(mix(mix(a, b, t), mix(b, c, t), t), mix(mix(b, c, t), mix(c, d, t), t), t);
  }

  float easeInOutCubic(float t) {
    return t < 0.5 ? 4.0 * t * t * t : 1.0 - pow(-2.0 * t + 2.0, 3.0) / 2.0;
  }

  mat3 rotateY(float angle) {
    float c = cos(angle);
    float s = sin(angle);
    return mat3(c, 0.0, s, 0.0, 1.0, 0.0, -s, 0.0, c);
  }

  mat3 rotateX(float angle) {
    float c = cos(angle);
    float s = sin(angle);
    return mat3(1.0, 0.0, 0.0, 0.0, c, -s, 0.0, s, c);
  }

  void main() {
    float tProgress = easeInOutCubic(min(1.0, max(0.0, (uProgress - aOffset)) / ${config.duration}));
    vec3 pathPosition = bezier4(aPositionStart, aControlPointOne, aControlPointTwo, aPositionEnd, tProgress);
    
    // Morph between geometries
    float morphT = easeInOutCubic(uMorph);
    vec3 morphedVertex = mix(aPosition, aPositionMorph, morphT);
    
    // Gentle rotation
    mat3 rot = rotateY(uRotation * 0.3) * rotateX(uRotation * 0.15);
    vec3 rotatedVertex = rot * morphedVertex;
    
    vec3 finalPosition = pathPosition + rotatedVertex;
    
    gl_Position = uProjectionMatrix * uModelMatrix * uViewMatrix * vec4(finalPosition, 1.0);
    
    // Depth-based color variation
    vDepth = (finalPosition.z + 1.0) * 0.5;
    
    // Apply color shift from uniforms
    vColor = aColor + uColorShift * 0.3;
  }
`;

const fragment = `
  precision highp float;

  varying vec3 vColor;
  varying float vDepth;
  varying vec4 vScreenPos;

  uniform float uTime;

  // 4x4 Bayer dither matrix
  float bayerMatrix[16];
  
  float getBayer(vec2 coord) {
    int x = int(mod(coord.x, 4.0));
    int y = int(mod(coord.y, 4.0));
    int index = x + y * 4;
    
    // Bayer 4x4 pattern (normalized 0-1)
    if (index == 0) return 0.0 / 16.0;
    if (index == 1) return 8.0 / 16.0;
    if (index == 2) return 2.0 / 16.0;
    if (index == 3) return 10.0 / 16.0;
    if (index == 4) return 12.0 / 16.0;
    if (index == 5) return 4.0 / 16.0;
    if (index == 6) return 14.0 / 16.0;
    if (index == 7) return 6.0 / 16.0;
    if (index == 8) return 3.0 / 16.0;
    if (index == 9) return 11.0 / 16.0;
    if (index == 10) return 1.0 / 16.0;
    if (index == 11) return 9.0 / 16.0;
    if (index == 12) return 15.0 / 16.0;
    if (index == 13) return 7.0 / 16.0;
    if (index == 14) return 13.0 / 16.0;
    return 5.0 / 16.0;
  }

  // Simple noise for film grain
  float random(vec2 st) {
    return fract(sin(dot(st.xy, vec2(12.9898, 78.233))) * 43758.5453123);
  }

  void main() {
    // Convert to luminance (grayscale)
    float luma = dot(vColor, vec3(0.299, 0.587, 0.114));
    
    // Depth-based shading for 3D effect
    float depthShade = 0.4 + vDepth * 0.6;
    luma *= depthShade;
    
    // Get screen coordinates for dithering
    vec2 screenCoord = gl_FragCoord.xy;
    
    // Apply Bayer dithering
    float threshold = getBayer(screenCoord);
    float dithered = step(threshold, luma);
    
    // Add subtle film grain
    float grain = random(screenCoord + uTime * 0.01) * 0.08;
    dithered = clamp(dithered + grain - 0.04, 0.0, 1.0);
    
    // Output black or white
    gl_FragColor = vec4(vec3(dithered), 1.0);
  }
`;

// ============================================
// LUPO Letter Position Generators
// ============================================

const LETTER_SPACING = 0.11;
const LETTER_DEPTH = 2;

function generateLetter_L() {
  const positions = [];
  const s = LETTER_SPACING;
  const d = LETTER_DEPTH;

  // Vertical bar (7 high)
  for (let z = 0; z < d; z++) {
    for (let y = 0; y < 7; y++) {
      positions.push({ x: -0.25, y: 0.35 - y * s, z: (z - 0.5) * s * 0.7 });
    }
  }
  // Horizontal base (4 wide)
  for (let z = 0; z < d; z++) {
    for (let x = 1; x < 5; x++) {
      positions.push({ x: -0.25 + x * s, y: 0.35 - 6 * s, z: (z - 0.5) * s * 0.7 });
    }
  }
  return positions;
}

function generateLetter_U() {
  const positions = [];
  const s = LETTER_SPACING;
  const d = LETTER_DEPTH;

  // Left vertical (6 high)
  for (let z = 0; z < d; z++) {
    for (let y = 0; y < 6; y++) {
      positions.push({ x: -0.25, y: 0.35 - y * s, z: (z - 0.5) * s * 0.7 });
    }
  }
  // Right vertical (6 high)
  for (let z = 0; z < d; z++) {
    for (let y = 0; y < 6; y++) {
      positions.push({ x: 0.15, y: 0.35 - y * s, z: (z - 0.5) * s * 0.7 });
    }
  }
  // Bottom curve (3 wide)
  for (let z = 0; z < d; z++) {
    for (let x = 1; x < 4; x++) {
      positions.push({ x: -0.25 + x * s, y: 0.35 - 6 * s, z: (z - 0.5) * s * 0.7 });
    }
  }
  return positions;
}

function generateLetter_P() {
  const positions = [];
  const s = LETTER_SPACING;
  const d = LETTER_DEPTH;

  // Vertical bar (full height)
  for (let z = 0; z < d; z++) {
    for (let y = 0; y < 7; y++) {
      positions.push({ x: -0.25, y: 0.35 - y * s, z: (z - 0.5) * s * 0.7 });
    }
  }
  // Top horizontal
  for (let z = 0; z < d; z++) {
    for (let x = 1; x < 4; x++) {
      positions.push({ x: -0.25 + x * s, y: 0.35, z: (z - 0.5) * s * 0.7 });
    }
  }
  // Right side of bump (3 high)
  for (let z = 0; z < d; z++) {
    for (let y = 1; y < 3; y++) {
      positions.push({ x: 0.08, y: 0.35 - y * s, z: (z - 0.5) * s * 0.7 });
    }
  }
  // Middle horizontal
  for (let z = 0; z < d; z++) {
    for (let x = 1; x < 4; x++) {
      positions.push({ x: -0.25 + x * s, y: 0.35 - 3 * s, z: (z - 0.5) * s * 0.7 });
    }
  }
  return positions;
}

function generateLetter_O() {
  const positions = [];
  const s = LETTER_SPACING;
  const d = LETTER_DEPTH;

  // Left vertical (5 inner)
  for (let z = 0; z < d; z++) {
    for (let y = 1; y < 6; y++) {
      positions.push({ x: -0.25, y: 0.35 - y * s, z: (z - 0.5) * s * 0.7 });
    }
  }
  // Right vertical (5 inner)
  for (let z = 0; z < d; z++) {
    for (let y = 1; y < 6; y++) {
      positions.push({ x: 0.15, y: 0.35 - y * s, z: (z - 0.5) * s * 0.7 });
    }
  }
  // Top horizontal
  for (let z = 0; z < d; z++) {
    for (let x = 0; x < 5; x++) {
      positions.push({ x: -0.25 + x * s, y: 0.35, z: (z - 0.5) * s * 0.7 });
    }
  }
  // Bottom horizontal
  for (let z = 0; z < d; z++) {
    for (let x = 0; x < 5; x++) {
      positions.push({ x: -0.25 + x * s, y: 0.35 - 6 * s, z: (z - 0.5) * s * 0.7 });
    }
  }
  return positions;
}

// Pre-generate all letters
const letters = {
  L: generateLetter_L(),
  U: generateLetter_U(),
  P: generateLetter_P(),
  O: generateLetter_O()
};
const letterOrder = ['L', 'U', 'P', 'O'];
let currentLetterIndex = 0;
let currentPositions = letters.L;

// Find the max count for consistent multiplier
const maxLetterCount = Math.max(
  letters.L.length,
  letters.U.length,
  letters.P.length,
  letters.O.length
);

function getLetterPosition(index, letterPositions) {
  if (index < letterPositions.length) {
    return letterPositions[index];
  }
  // For extra indices, cluster them at center (invisible mass)
  return { x: 0, y: 0, z: 0 };
}

// ============================================
// Letter Cycling (Scroll + Time Based)
// ============================================

let letterTransition = 0;
let nextLetterIndex = 1;
let scrollProgress = 0;
let targetScrollProgress = 0;

// Track scroll position
function initScrollTracking() {
  window.addEventListener('scroll', () => {
    const scrollY = window.scrollY;
    const docHeight = document.documentElement.scrollHeight - window.innerHeight;
    targetScrollProgress = Math.min(1, scrollY / Math.max(1, docHeight));
  }, { passive: true });
}

// Smoothly interpolate scroll progress
function updateScrollProgress() {
  scrollProgress += (targetScrollProgress - scrollProgress) * 0.05;
}

function updateLetterCycle(deltaTime) {
  // Blend time-based and scroll-based cycling
  // In hero section (scroll 0-0.25): use time-based cycling
  // As you scroll: letters follow scroll position

  const scrollInfluence = Math.min(1, scrollProgress * 4); // 0-1 over first 25% of scroll

  if (scrollInfluence < 0.1) {
    // Mostly time-based in hero
    letterTransition += deltaTime / config.letterCycleSpeed;
  } else {
    // Scroll-based: map scroll position to letter index
    const scrollLetterProgress = scrollProgress * letterOrder.length;
    const targetLetterIndex = Math.floor(scrollLetterProgress) % letterOrder.length;
    const targetTransition = scrollLetterProgress % 1;

    // Smooth transition to scroll-based position
    if (targetLetterIndex !== currentLetterIndex) {
      currentLetterIndex = targetLetterIndex;
      nextLetterIndex = (targetLetterIndex + 1) % letterOrder.length;
      currentPositions = letters[letterOrder[currentLetterIndex]];
    }

    letterTransition += (targetTransition - letterTransition) * 0.1;
  }

  if (letterTransition >= 1) {
    letterTransition = 0;
    currentLetterIndex = nextLetterIndex;
    nextLetterIndex = (nextLetterIndex + 1) % letterOrder.length;
    currentPositions = letters[letterOrder[currentLetterIndex]];
  }
}

function getCurrentPosition(index) {
  const currentLetter = letters[letterOrder[currentLetterIndex]];
  const nextLetter = letters[letterOrder[nextLetterIndex]];

  const currentPos = getLetterPosition(index, currentLetter);
  const nextPos = getLetterPosition(index, nextLetter);

  // Smooth interpolation between letters
  const t = smoothstep(letterTransition);
  return {
    x: currentPos.x + (nextPos.x - currentPos.x) * t,
    y: currentPos.y + (nextPos.y - currentPos.y) * t,
    z: currentPos.z + (nextPos.z - currentPos.z) * t
  };
}

function smoothstep(t) {
  return t * t * (3 - 2 * t);
}

// ============================================
// Phenomenon Instance Creation
// ============================================

function createMorphingShapes(phenomenonRenderer) {
  const cube = cubeGeometry(config.cubeSize);
  const sphere = sphereGeometry(config.cubeSize);

  const multiplier = maxLetterCount;

  const attributes = [
    {
      name: "aPositionStart",
      data: (index) => {
        const pos = getLetterPosition(index, currentPositions);
        return [pos.x, pos.y + 0.2, pos.z];
      },
      size: 3
    },
    {
      name: "aControlPointOne",
      data: () => [getRandom(0.3), getRandom(0.2), getRandom(0.3)],
      size: 3
    },
    {
      name: "aControlPointTwo",
      data: () => [getRandom(0.3), getRandom(0.2), getRandom(0.3)],
      size: 3
    },
    {
      name: "aPositionEnd",
      data: (index) => {
        const pos = getLetterPosition(index, currentPositions);
        return [pos.x, pos.y - 0.2, pos.z];
      },
      size: 3
    },
    {
      name: "aColor",
      data: (index, total) => getHSL(
        config.hue + (index / total) * config.hueSpread,
        config.saturation,
        config.lightness
      ),
      size: 3
    },
    {
      name: "aOffset",
      data: i => [i * ((1 - config.duration) / (multiplier - 1))],
      size: 1
    }
  ];

  const uniforms = {
    uProgress: { type: "float", value: 0.0 },
    uMorph: { type: "float", value: 0.0 },
    uRotation: { type: "float", value: 0.0 },
    uColorShift: { type: "vec3", value: [0.0, 0.0, 0.0] },
    uLetterTransition: { type: "float", value: 0.0 },
    uTime: { type: "float", value: 0.0 }
  };

  let forward = true;
  let morphForward = true;
  let time = 0;
  let lastLetterIndex = currentLetterIndex;
  let lastTime = performance.now();

  phenomenonRenderer.add("morphingShapes", {
    attributes,
    multiplier,
    uniforms,
    vertex,
    fragment,
    mode: 4, // TRIANGLES
    geometry: {
      vertices: cube
    },
    modifiers: {
      "aColor": (data, k, l, { geometry }) => {
        const faceIndex = Math.floor(k / (geometry.vertices.length / 3));
        return data[l] + faceIndex * -0.02;
      },
      "aPositionMorph": (data, k, l, { geometry }) => {
        const vertex = sphere[k % sphere.length];
        if (l === 0) return vertex.x;
        if (l === 1) return vertex.y;
        return vertex.z;
      }
    },
    onRender: instance => {
      const now = performance.now();
      const deltaTime = now - lastTime;
      lastTime = now;
      time += 0.016;

      // Update scroll tracking
      updateScrollProgress();

      // Update letter cycling (responds to scroll)
      updateLetterCycle(deltaTime);
      instance.uniforms.uLetterTransition.value = letterTransition;

      // Check if we need to rebuild for new letter
      if (currentLetterIndex !== lastLetterIndex) {
        lastLetterIndex = currentLetterIndex;
        // Trigger rebuild on next frame
        setTimeout(() => {
          if (renderer) {
            renderer.remove("morphingShapes");
            createMorphingShapes(renderer);
          }
        }, 0);
      }

      // Bezier path animation (smoother)
      instance.uniforms.uProgress.value += forward ? config.speed * 0.8 : -config.speed * 0.8;
      if (instance.uniforms.uProgress.value >= 1) forward = false;
      if (instance.uniforms.uProgress.value <= 0) forward = true;

      // Morphing animation (slower, smoother)
      instance.uniforms.uMorph.value += morphForward ? config.morphSpeed * 0.7 : -config.morphSpeed * 0.7;
      if (instance.uniforms.uMorph.value >= 1) morphForward = false;
      if (instance.uniforms.uMorph.value <= 0) morphForward = true;

      // Gentle rotation (slower)
      instance.uniforms.uRotation.value = time * 0.7;

      // Update time for film grain
      instance.uniforms.uTime.value = time;

      // Subtle color shift (for luminance variation in B&W)
      instance.uniforms.uColorShift.value = [
        Math.sin(time * 0.3) * 0.15,
        Math.sin(time * 0.2) * 0.1,
        Math.sin(time * 0.4) * 0.15
      ];
    }
  });

  return phenomenonRenderer;
}

// ============================================
// Live Color Update
// ============================================

function updateColors() {
  if (!renderer) return;

  // Rebuild with new colors
  renderer.remove("morphingShapes");
  createMorphingShapes(renderer);
}

// ============================================
// FPS Counter
// ============================================

let frameCount = 0;
let lastTime = performance.now();

function updateFPS() {
  frameCount++;
  const now = performance.now();
  if (now - lastTime >= 1000) {
    const fps = Math.round(frameCount * 1000 / (now - lastTime));
    const fpsElement = document.querySelector('.fps');
    if (fpsElement) {
      fpsElement.textContent = `${fps} FPS`;
    }
    frameCount = 0;
    lastTime = now;
  }
  requestAnimationFrame(updateFPS);
}

// ============================================
// Color Picker Display
// ============================================

function updateColorPreview() {
  const preview = document.getElementById('color-preview');
  if (preview) {
    const [r, g, b] = getHSL(config.hue, config.saturation, config.lightness);
    preview.style.background = `linear-gradient(135deg, 
      rgb(${Math.round(r * 255)}, ${Math.round(g * 255)}, ${Math.round(b * 255)}),
      rgb(${Math.round(r * 200)}, ${Math.round(g * 200)}, ${Math.round(b * 200)}))`;
  }
}

// ============================================
// UI Controls
// ============================================

function setupControls() {
  // Animation Speed
  const speedSlider = document.getElementById('speed');
  if (speedSlider) {
    speedSlider.value = config.speed * 1000;
    speedSlider.addEventListener('input', (e) => {
      config.speed = parseInt(e.target.value) / 1000;
      e.target.parentElement.querySelector('.value').textContent = e.target.value;
    });
  }

  // Morph Speed
  const morphSlider = document.getElementById('morph-speed');
  if (morphSlider) {
    morphSlider.addEventListener('input', (e) => {
      config.morphSpeed = parseInt(e.target.value) / 2000;
      e.target.parentElement.querySelector('.value').textContent = e.target.value;
    });
  }

  // === Color Controls ===

  // Hue
  const hueSlider = document.getElementById('hue');
  if (hueSlider) {
    hueSlider.value = config.hue * 100;
    hueSlider.addEventListener('input', (e) => {
      config.hue = parseInt(e.target.value) / 100;
      e.target.parentElement.querySelector('.value').textContent =
        ['Red', 'Orange', 'Yellow', 'Green', 'Cyan', 'Blue', 'Purple', 'Pink'][Math.floor(config.hue * 8) % 8];
      updateColorPreview();
      updateColors();
    });
  }

  // Saturation
  const satSlider = document.getElementById('saturation');
  if (satSlider) {
    satSlider.value = config.saturation * 100;
    satSlider.addEventListener('input', (e) => {
      config.saturation = parseInt(e.target.value) / 100;
      e.target.parentElement.querySelector('.value').textContent = `${e.target.value}%`;
      updateColorPreview();
      updateColors();
    });
  }

  // Lightness
  const lightSlider = document.getElementById('lightness');
  if (lightSlider) {
    lightSlider.value = config.lightness * 100;
    lightSlider.addEventListener('input', (e) => {
      config.lightness = parseInt(e.target.value) / 100;
      e.target.parentElement.querySelector('.value').textContent = `${e.target.value}%`;
      updateColorPreview();
      updateColors();
    });
  }

  // Hue Spread
  const spreadSlider = document.getElementById('hue-spread');
  if (spreadSlider) {
    spreadSlider.value = config.hueSpread * 100;
    spreadSlider.addEventListener('input', (e) => {
      config.hueSpread = parseInt(e.target.value) / 100;
      e.target.parentElement.querySelector('.value').textContent = `${e.target.value}%`;
      updateColors();
    });
  }

  // Initialize color preview
  updateColorPreview();
}

// ============================================
// Initialize
// ============================================

function init() {
  const canvas = document.getElementById('canvas');

  renderer = new Phenomenon({
    canvas,
    settings: {
      clearColor: config.clearColor,
      position: { x: 0, y: 0, z: 2 },
      shouldRender: true
    }
  });

  createMorphingShapes(renderer);
  initScrollTracking();
  updateFPS();

  window.addEventListener('resize', () => renderer.resize());

  console.log('⚡ LUPO Creative Studio');
  console.log('🎭 Scroll-responsive hero animation');
  console.log('📜 Letters change as you scroll');
}

// Start!
init();
