(() => {
  "use strict";

  const canvas = document.getElementById("game");
  const ctx = canvas.getContext("2d", { alpha: true });
  const skyCanvas = document.getElementById("sky");
  const aspectButtons = document.querySelectorAll("[data-aspect]");
  const holePrevButton = document.querySelector("[data-hole-prev]");
  const holeNextButton = document.querySelector("[data-hole-next]");
  const holeCounter = document.querySelector("[data-hole-counter]");
  const BALL_SPRITE_SRC = `golfball`;
  const TERRAIN_OVERLAY_SRC = `overlay`;
  const SKY_QUALITY = window.TEE_SKY_QUALITY || "auto";

  const BALL = {
    radius: 0.62,
    mass: 0.045,
    maxSpeed: 62,
    minSpeed: 4.5,
    dragArea: 0.00143,
    airDensity: 1.18,
    dragCoefficient: 0.22,
    liftCoefficient: 0.085,
    spinDecay: 0.54,
    inertiaFactor: 0.4,
    groundGrip: 18,
    landingGrip: 8,
    bounceFriction: 0.33,
    greenRollingResistance: 0.052,
    fairwayRollingResistance: 0.074,
    stopSpeed: 0.045
  };

  const GRAVITY = 9.81;
  const FIXED_DT = 1 / 180;
  const MAX_GUIDE_STEPS = 720;
  const MIN_LAUNCH_ANGLE = -0.05;
  const MAX_LAUNCH_ANGLE = 0.84;
  const PUTT_DISTANCE = 34;
  const PUTT_FLAT_SLOPE = 0.055;
  const STRIKE_CYCLES_PER_SECOND = 1.85;
  const STRIKE_TARGET = 0.84;
  const FINISH_SETTLE_SPEED = 0.16;
  const FINISH_SETTLE_SLOPE = 0.58;
  const FINISH_SETTLE_SECONDS = 0.025;
  const FORCE_SETTLE_SPEED = 0.42;
  const FORCE_SETTLE_SECONDS = 0.78;
  const COURSE_PAR = 3;
  const HOLE_SPINNER_DELAY = 2.85;
  const pts = (rows) => rows.map(([x, y]) => ({ x, y }));
  const HOLES = [
    {
      name: "Dawn Sweep",
      startX: 15,
      holeX: 156,
      endX: 320,
      greenStart: 145,
      greenEnd: 166,
      holeRadius: 0.18,
      colors: {
        skyTop: "#102e57",
        skyMid: "#5369bd",
        skyGlow: "#fb6f87",
        skyHorizon: "#ffc36f",
        fairway: "#1f7864",
        fairwayMid: "#0a5a4d",
        soil: "#062d28",
        rim: "rgb(255 219 121 / 0.45)",
        flag: "#2a3f35"
      },
      atmosphere: "none",
      terrainKnots: pts([
        [-140, -1.2],
        [-96, 1.5],
        [-42, -1.4],
        [0, 1.0],
        [15, 2.1],
        [36, -1.1],
        [66, -7.4],
        [100, -6.0],
        [130, -2.9],
        [145, -1.35],
        [156, -1.18],
        [166, -1.34],
        [194, -4.6],
        [238, -6.2],
        [284, -4.2],
        [328, -0.9],
        [382, -2.7],
        [448, -5.8],
        [520, -2.1]
      ])
    },
    {
      name: "Bright Day",
      startX: 15,
      holeX: 166,
      endX: 338,
      greenStart: 154,
      greenEnd: 176,
      holeRadius: 0.18,
      colors: {
        skyTop: "#1f82d7",
        skyMid: "#58b9f5",
        skyGlow: "#9fe2ff",
        skyHorizon: "#d7f6ff",
        fairway: "#0f5a33",
        fairwayMid: "#3fa044",
        soil: "#113a24",
        rim: "rgb(255 238 145 / 0.75)",
        flag: "#245a36"
      },
      atmosphere: "haze",
      terrainKnots: pts([
        [-140, -0.8],
        [-100, 1.9],
        [-54, -0.2],
        [-18, 3.1],
        [20, 1.2],
        [55, -5.6],
        [92, -4.9],
        [126, -1.7],
        [150, -1.0],
        [166, -0.9],
        [176, -1.05],
        [204, -2.2],
        [250, -3.8],
        [304, -2.0],
        [360, 0.6],
        [430, -1.9]
      ])
    },
    {
      name: "Golden Sunset",
      startX: 15,
      holeX: 176,
      endX: 360,
      greenStart: 163,
      greenEnd: 188,
      holeRadius: 0.18,
      colors: {
        skyTop: "#7a2639",
        skyMid: "#df5a3f",
        skyGlow: "#ff9a35",
        skyHorizon: "#ffd46b",
        fairway: "#2b1d18",
        fairwayMid: "#764128",
        soil: "#1d1411",
        rim: "rgb(255 191 91 / 0.75)",
        flag: "#573224"
      },
      atmosphere: "glow",
      terrainKnots: pts([
        [-140, 0.4],
        [-96, 3.6],
        [-54, -1.0],
        [-14, 2.2],
        [26, -2.4],
        [70, -8.0],
        [114, -6.1],
        [146, -2.0],
        [164, -1.2],
        [176, -1.1],
        [188, -1.25],
        [214, -2.8],
        [260, -5.2],
        [310, -3.8],
        [370, -1.0],
        [436, -4.5]
      ])
    },
    {
      name: "Moonlit Night",
      startX: 15,
      holeX: 188,
      endX: 376,
      greenStart: 176,
      greenEnd: 198,
      holeRadius: 0.18,
      colors: {
        skyTop: "#061022",
        skyMid: "#0b2c64",
        skyGlow: "#183f86",
        skyHorizon: "#234d95",
        fairway: "#021f2c",
        fairwayMid: "#0b3b4e",
        soil: "#02121b",
        rim: "rgb(145 205 255 / 0.55)",
        flag: "#5f7485"
      },
      atmosphere: "night",
      terrainKnots: pts([
        [-140, -1.0],
        [-106, 1.8],
        [-70, -2.2],
        [-22, 0.5],
        [18, -5.6],
        [56, -3.4],
        [94, -1.0],
        [130, -3.5],
        [162, -1.7],
        [176, -1.2],
        [188, -1.1],
        [198, -1.3],
        [228, -3.5],
        [268, -2.0],
        [318, -4.8],
        [386, -2.6],
        [460, -5.0]
      ])
    },
    {
      name: "Autumn Afternoon",
      startX: 15,
      holeX: 198,
      endX: 390,
      greenStart: 186,
      greenEnd: 208,
      holeRadius: 0.18,
      colors: {
        skyTop: "#b65a2f",
        skyMid: "#ed9c58",
        skyGlow: "#ffd88a",
        skyHorizon: "#ffe2a8",
        fairway: "#2a2715",
        fairwayMid: "#6b5a22",
        soil: "#1f180d",
        rim: "rgb(255 211 106 / 0.7)",
        flag: "#6a5b31"
      },
      atmosphere: "warm",
      terrainKnots: pts([
        [-140, 1.0],
        [-92, -1.5],
        [-48, 2.8],
        [-4, -2.0],
        [36, -4.4],
        [78, -1.1],
        [118, -5.8],
        [150, -3.0],
        [176, -1.5],
        [186, -1.3],
        [198, -1.22],
        [208, -1.28],
        [240, -2.5],
        [286, -1.0],
        [334, -4.2],
        [404, -2.0]
      ])
    },
    {
      name: "Winter Morning",
      startX: 15,
      holeX: 206,
      endX: 402,
      greenStart: 194,
      greenEnd: 218,
      holeRadius: 0.18,
      colors: {
        skyTop: "#5ba6df",
        skyMid: "#bfe8ff",
        skyGlow: "#ecf9ff",
        skyHorizon: "#f4fbff",
        fairway: "#173a52",
        fairwayMid: "#78b8dd",
        soil: "#113144",
        rim: "rgb(255 255 255 / 0.9)",
        flag: "#355464"
      },
      atmosphere: "snow",
      terrainKnots: pts([
        [-140, -0.6],
        [-96, 0.9],
        [-52, -1.4],
        [-12, 1.2],
        [26, -0.8],
        [68, -3.0],
        [110, -2.0],
        [150, -1.0],
        [188, -1.2],
        [194, -1.15],
        [206, -1.08],
        [218, -1.16],
        [248, -2.0],
        [296, -2.8],
        [348, -2.0],
        [420, -1.1]
      ])
    },
    {
      name: "Spring Blossom",
      startX: 15,
      holeX: 214,
      endX: 416,
      greenStart: 202,
      greenEnd: 226,
      holeRadius: 0.18,
      colors: {
        skyTop: "#ee9fbb",
        skyMid: "#ffc09b",
        skyGlow: "#ffe8b4",
        skyHorizon: "#fff2d0",
        fairway: "#1f5f35",
        fairwayMid: "#74bd4f",
        soil: "#11331a",
        rim: "rgb(255 240 166 / 0.76)",
        flag: "#3f6a34"
      },
      atmosphere: "soft",
      terrainKnots: pts([
        [-140, -1.2],
        [-96, 1.4],
        [-58, -2.5],
        [-20, 2.4],
        [20, -1.0],
        [62, -4.8],
        [102, -2.8],
        [138, -0.6],
        [178, -1.8],
        [202, -1.25],
        [214, -1.15],
        [226, -1.22],
        [256, -2.6],
        [304, -4.5],
        [352, -1.8],
        [428, -3.8]
      ])
    },
    {
      name: "Storm / Moody Night",
      startX: 15,
      holeX: 224,
      endX: 440,
      greenStart: 212,
      greenEnd: 236,
      holeRadius: 0.18,
      colors: {
        skyTop: "#07101a",
        skyMid: "#142638",
        skyGlow: "#253b52",
        skyHorizon: "#394a5c",
        fairway: "#03191d",
        fairwayMid: "#123743",
        soil: "#021014",
        rim: "rgb(150 220 255 / 0.35)",
        flag: "#4b6772"
      },
      atmosphere: "storm",
      terrainKnots: pts([
        [-140, -0.4],
        [-102, 2.2],
        [-62, -1.6],
        [-18, 1.0],
        [24, -4.3],
        [70, -2.4],
        [114, -6.5],
        [154, -4.0],
        [192, -1.8],
        [212, -1.3],
        [224, -1.2],
        [236, -1.32],
        [266, -3.8],
        [318, -2.0],
        [374, -5.2],
        [454, -3.4]
      ])
    },
    {
      name: "Coastal Dusk",
      startX: 15,
      holeX: 236,
      endX: 468,
      greenStart: 224,
      greenEnd: 248,
      holeRadius: 0.18,
      colors: {
        skyTop: "#18314f",
        skyMid: "#4d6aa0",
        skyGlow: "#ef8ca3",
        skyHorizon: "#ffd7ab",
        fairway: "#173a35",
        fairwayMid: "#3e7b6c",
        soil: "#10221d",
        rim: "rgb(255 246 206 / 0.55)",
        flag: "#33504b"
      },
      atmosphere: "haze",
      terrainKnots: pts([
        [-140, 0.2],
        [-96, 3.8],
        [-48, -0.6],
        [-4, 2.8],
        [44, -2.5],
        [90, -6.4],
        [136, -3.0],
        [182, -1.0],
        [220, -1.35],
        [236, -1.2],
        [248, -1.28],
        [280, -2.8],
        [334, -4.6],
        [392, -2.2],
        [468, -5.0],
        [532, -2.6]
      ])
    }
  ];

  const SKY_PRESETS = [
    makeSkyPreset({
      key: "dawn-sweep",
      mood: "sunset",
      gradient: [[0, "#102e57"], [0.32, "#5369bd"], [0.63, "#fb6f87"], [0.83, "#ffc36f"], [1, "#ffc36f"]],
      cloudDensity: 0.34,
      cloudSoftness: 0.34,
      cloudSpeed: 0.018,
      cloudBand: 0.34,
      sunDirection: { x: 0.54, y: 0.82 },
      haze: 0.2,
      horizonGlow: "rgb(255 202 126 / 0.28)",
      hazeColor: "rgb(255 210 174 / 0.1)",
      cloudLight: "rgb(255 236 218 / 0.78)",
      cloudMid: "rgb(255 188 178 / 0.34)",
      cloudShade: "rgb(126 73 118 / 0.12)"
    }),
    makeSkyPreset({
      key: "bright-day",
      mood: "morning",
      gradient: [[0, "#1f82d7"], [0.36, "#58b9f5"], [0.72, "#d7f6ff"], [1, "#d7f6ff"]],
      cloudDensity: 0.38,
      cloudSoftness: 0.4,
      cloudSpeed: 0.016,
      cloudBand: 0.28,
      sunDirection: { x: 0.72, y: 0.78 },
      haze: 0.18,
      horizonGlow: "rgb(255 255 255 / 0.22)",
      hazeColor: "rgb(225 248 255 / 0.12)",
      cloudLight: "rgb(255 255 255 / 0.74)",
      cloudMid: "rgb(221 246 255 / 0.3)",
      cloudShade: "rgb(113 176 218 / 0.08)"
    }),
    makeSkyPreset({
      key: "golden-sunset",
      mood: "golden-hour",
      gradient: [[0, "#7a2639"], [0.36, "#df5a3f"], [0.65, "#ff9a35"], [0.84, "#ffd46b"], [1, "#ffd46b"]],
      cloudDensity: 0.32,
      cloudSoftness: 0.36,
      cloudSpeed: 0.012,
      cloudBand: 0.38,
      sunDirection: { x: 0.5, y: 0.84 },
      haze: 0.24,
      horizonGlow: "rgb(255 220 129 / 0.38)",
      hazeColor: "rgb(255 177 111 / 0.12)",
      cloudLight: "rgb(255 220 150 / 0.68)",
      cloudMid: "rgb(255 136 115 / 0.28)",
      cloudShade: "rgb(120 45 50 / 0.12)"
    }),
    makeSkyPreset({
      key: "moonlit-night",
      mood: "night",
      gradient: [[0, "#061022"], [0.44, "#0b2c64"], [0.76, "#183f86"], [1, "#234d95"]],
      cloudDensity: 0.18,
      cloudSoftness: 0.34,
      cloudSpeed: 0.006,
      cloudBand: 0.3,
      sunDirection: { x: 0.46, y: 0.24 },
      haze: 0.12,
      horizonGlow: "rgb(120 160 255 / 0.14)",
      hazeColor: "rgb(120 160 255 / 0.08)",
      cloudLight: "rgb(161 196 255 / 0.28)",
      cloudMid: "rgb(98 136 208 / 0.16)",
      cloudShade: "rgb(4 12 26 / 0.22)"
    }),
    makeSkyPreset({
      key: "autumn-afternoon",
      mood: "golden-hour",
      gradient: [[0, "#b65a2f"], [0.48, "#ed9c58"], [0.78, "#ffd88a"], [1, "#ffe2a8"]],
      cloudDensity: 0.26,
      cloudSoftness: 0.35,
      cloudSpeed: 0.012,
      cloudBand: 0.34,
      sunDirection: { x: 0.62, y: 0.78 },
      haze: 0.22,
      horizonGlow: "rgb(255 211 106 / 0.28)",
      hazeColor: "rgb(255 225 172 / 0.12)",
      cloudLight: "rgb(255 231 185 / 0.58)",
      cloudMid: "rgb(219 139 82 / 0.22)",
      cloudShade: "rgb(84 50 25 / 0.12)"
    }),
    makeSkyPreset({
      key: "winter-morning",
      mood: "overcast",
      gradient: [[0, "#5ba6df"], [0.42, "#bfe8ff"], [0.76, "#ecf9ff"], [1, "#f4fbff"]],
      cloudDensity: 0.46,
      cloudSoftness: 0.5,
      cloudSpeed: 0.01,
      cloudBand: 0.26,
      sunDirection: { x: 0.66, y: 0.72 },
      haze: 0.34,
      horizonGlow: "rgb(255 255 255 / 0.34)",
      hazeColor: "rgb(235 250 255 / 0.2)",
      cloudLight: "rgb(255 255 255 / 0.62)",
      cloudMid: "rgb(218 241 255 / 0.28)",
      cloudShade: "rgb(112 160 190 / 0.08)"
    }),
    makeSkyPreset({
      key: "spring-blossom",
      mood: "spring",
      gradient: [[0, "#ee9fbb"], [0.44, "#ffc09b"], [0.78, "#ffe8b4"], [1, "#fff2d0"]],
      cloudDensity: 0.36,
      cloudSoftness: 0.42,
      cloudSpeed: 0.018,
      cloudBand: 0.3,
      sunDirection: { x: 0.58, y: 0.78 },
      haze: 0.24,
      horizonGlow: "rgb(255 240 166 / 0.28)",
      hazeColor: "rgb(255 238 210 / 0.14)",
      cloudLight: "rgb(255 251 238 / 0.62)",
      cloudMid: "rgb(255 214 203 / 0.26)",
      cloudShade: "rgb(168 112 137 / 0.08)"
    }),
    makeSkyPreset({
      key: "storm-moody-night",
      mood: "stormy",
      gradient: [[0, "#07101a"], [0.46, "#142638"], [0.76, "#253b52"], [1, "#394a5c"]],
      cloudDensity: 0.64,
      cloudSoftness: 0.44,
      cloudSpeed: 0.004,
      cloudBand: 0.24,
      sunDirection: { x: 0.74, y: 0.3 },
      haze: 0.2,
      horizonGlow: "rgb(120 150 180 / 0.11)",
      hazeColor: "rgb(94 116 136 / 0.1)",
      cloudLight: "rgb(90 116 136 / 0.24)",
      cloudMid: "rgb(38 55 72 / 0.34)",
      cloudShade: "rgb(2 8 12 / 0.34)"
    }),
    makeSkyPreset({
      key: "coastal-dusk",
      mood: "sunset",
      gradient: [[0, "#18314f"], [0.42, "#4d6aa0"], [0.68, "#ef8ca3"], [0.86, "#ffd7ab"], [1, "#ffd7ab"]],
      cloudDensity: 0.42,
      cloudSoftness: 0.4,
      cloudSpeed: 0.014,
      cloudBand: 0.32,
      sunDirection: { x: 0.48, y: 0.82 },
      haze: 0.26,
      horizonGlow: "rgb(255 215 171 / 0.28)",
      hazeColor: "rgb(255 218 201 / 0.12)",
      cloudLight: "rgb(255 237 223 / 0.58)",
      cloudMid: "rgb(222 151 176 / 0.24)",
      cloudShade: "rgb(70 78 126 / 0.1)"
    })
  ];

  let currentHoleIndex = 0;
  let currentCourse = HOLES[currentHoleIndex];
  let terrainKnots = currentCourse.terrainKnots;
  const COURSE = {};
  const COLORS = {};
  Object.defineProperties(COURSE, {
    startX: { get: () => currentCourse.startX },
    holeX: { get: () => currentCourse.holeX },
    endX: { get: () => currentCourse.endX },
    greenStart: { get: () => currentCourse.greenStart },
    greenEnd: { get: () => currentCourse.greenEnd },
    holeRadius: { get: () => currentCourse.holeRadius }
  });
  Object.defineProperties(COLORS, {
    skyTop: { get: () => currentCourse.colors.skyTop },
    skyMid: { get: () => currentCourse.colors.skyMid },
    skyGlow: { get: () => currentCourse.colors.skyGlow },
    skyHorizon: { get: () => currentCourse.colors.skyHorizon },
    fairway: { get: () => currentCourse.colors.fairway },
    fairwayMid: { get: () => currentCourse.colors.fairwayMid },
    soil: { get: () => currentCourse.colors.soil },
    ball: { get: () => "#fbfff9" },
    ballShade: { get: () => "#cad6cc" },
    guideLanding: { get: () => "#ffd66f" },
    rim: { get: () => currentCourse.colors.rim },
    flag: { get: () => currentCourse.colors.flag }
  });

  const guide = [];
  const shotCaptions = [];
  const wheelSegments = [
    { label: "BIRDIE", sub: "BOOST", colorA: "#ff9d45", colorB: "#f14d72" },
    { label: "PIN", sub: "SENSE", colorA: "#b96add", colorB: "#5d55d9" },
    { label: "PURE", sub: "ROLL", colorA: "#5fc9e5", colorB: "#2787e7" },
    { label: "LUCKY", sub: "LIE", colorA: "#86cf70", colorB: "#3a9d64" },
    { label: "SOFT", sub: "LAND", colorA: "#ffd46d", colorB: "#f1a451" },
    { label: "RETRY", sub: "TOKEN", colorA: "#636bf0", colorB: "#7560cf" },
    { label: "FOCUS", sub: "SHOT", colorA: "#ee7aad", colorB: "#d84c8c" },
    { label: "GOLD", sub: "LINE", colorA: "#ffb450", colorB: "#ff6c4f" }
  ];
  const assets = {
    ball: null,
    ballReady: false,
    terrainOverlay: null,
    terrainOverlayReady: false
  };
  assets.ball = loadImage(BALL_SPRITE_SRC);
  assets.terrainOverlay = loadImage(TERRAIN_OVERLAY_SRC, "terrainOverlayReady");
  const skySystem = window.SkySystem && skyCanvas ? new window.SkySystem(skyCanvas, { quality: SKY_QUALITY }) : null;
  window.teeSkySystem = skySystem;
  let world = createWorld();
  let view = {
    x: 0,
    y: 0,
    scale: 1,
    targetX: 0,
    targetY: 0,
    targetScale: 1
  };
  let pointer = null;
  let accumulator = 0;
  let lastTime = performance.now();
  let shotPreview = null;
  let resizeQueued = true;
  let strikeClock = 0;
  let wheel = createWheelState();

  function createWorld() {
    const x = COURSE.startX;
    const y = terrainHeight(x) + BALL.radius;
    return {
      holeIndex: currentHoleIndex,
      ball: {
        x,
        y,
        vx: 0,
        vy: 0,
        omega: 0,
        angle: 0,
        slipping: false,
        grounded: true,
        asleep: true
      },
      cameraMode: "address",
      strokes: 0,
      holed: false,
      messageTimer: 0,
      holeSinkTimer: 0,
      finishTimer: 0,
      slowTimer: 0,
      freezeTimer: 0,
      holeTransitionShown: false
    };
  }

  function createWheelState() {
    return {
      visible: false,
      spinning: false,
      done: false,
      elapsed: 0,
      duration: 4.6,
      rotation: 0,
      startRotation: 0,
      targetRotation: 0,
      resultIndex: 0,
      resultText: ""
    };
  }

  function terrainHeight(x) {
    const first = terrainKnots[0];
    const last = terrainKnots[terrainKnots.length - 1];
    if (x < first.x) {
      const dx = x - first.x;
      return first.y + Math.sin(dx * 0.045) * 1.8 + Math.sin(dx * 0.018) * 1.1;
    }
    if (x > last.x) {
      const dx = x - last.x;
      return last.y + Math.sin(dx * 0.04) * 2.0 + Math.sin(dx * 0.017) * 1.2;
    }

    let segment = 0;
    for (let i = 0; i < terrainKnots.length - 1; i += 1) {
      if (x >= terrainKnots[i].x && x <= terrainKnots[i + 1].x) {
        segment = i;
        break;
      }
    }
    const p0 = terrainKnots[Math.max(0, segment - 1)];
    const p1 = terrainKnots[segment];
    const p2 = terrainKnots[segment + 1];
    const p3 = terrainKnots[Math.min(terrainKnots.length - 1, segment + 2)];
    const t = clamp((x - p1.x) / (p2.x - p1.x), 0, 1);
    return catmullRom(p0.y, p1.y, p2.y, p3.y, t);
  }

  function terrainSlope(x) {
    const e = 0.08;
    return (terrainHeight(x + e) - terrainHeight(x - e)) / (e * 2);
  }

  function terrainFrame(x) {
    const slope = terrainSlope(x);
    const inv = 1 / Math.hypot(1, slope);
    return {
      tangentX: inv,
      tangentY: slope * inv,
      normalX: -slope * inv,
      normalY: inv,
      slope
    };
  }

  function clamp(value, min, max) {
    return Math.max(min, Math.min(max, value));
  }

  function lerp(a, b, t) {
    return a + (b - a) * t;
  }

  function rpmToRadPerSecond(rpm) {
    return rpm * Math.PI * 2 / 60;
  }

  function rollingOmega(tangentVelocity) {
    return -tangentVelocity / BALL.radius;
  }

  function spinRpm(ball) {
    return ball.omega * 60 / (Math.PI * 2);
  }

  function strikeState() {
    const phase = (strikeClock * STRIKE_CYCLES_PER_SECOND) % 1;
    const position = phase;
    const miss = position - STRIKE_TARGET;
    const quality = clamp(1 - Math.abs(miss) / 0.13, 0, 1);
    const sweet = quality > 0.72;
    return { phase, position, miss, quality, sweet };
  }

  function perfectStrikeState() {
    return { phase: STRIKE_TARGET, position: STRIKE_TARGET, miss: 0, quality: 1, sweet: true };
  }

  function catmullRom(p0, p1, p2, p3, t) {
    const t2 = t * t;
    const t3 = t2 * t;
    return 0.5 * (
      2 * p1 +
      (-p0 + p2) * t +
      (2 * p0 - 5 * p1 + 4 * p2 - p3) * t2 +
      (-p0 + 3 * p1 - 3 * p2 + p3) * t3
    );
  }

  function loadImage(src, readyKey = "ballReady") {
    const image = new Image();
    image.decoding = "async";
    image.onload = () => {
      assets[readyKey] = true;
    };
    image.src = src;
    return image;
  }

  function makeSkyPreset(preset) {
    const skyLightColor = preset.skyLightColor || brightestGradientColor(preset.gradient);
    const shaderColors = {
      top: colorToRgb(preset.gradient[0][1]),
      mid: colorToRgb(preset.gradient[Math.min(1, preset.gradient.length - 1)][1]),
      glow: colorToRgb(preset.gradient[Math.max(0, preset.gradient.length - 2)][1]),
      horizon: colorToRgb(preset.gradient[preset.gradient.length - 1][1]),
      cloudLight: colorToRgb(skyLightColor),
      cloudShade: colorToRgb(colorFromCssRgb(preset.cloudShade, "#6c7890"))
    };
    return {
      seed: preset.key.split("").reduce((sum, char) => sum + char.charCodeAt(0), 0) / 997,
      ...preset,
      skyLightColor,
      shaderColors
    };
  }

  function currentSkyPreset() {
    return SKY_PRESETS[currentHoleIndex] || SKY_PRESETS[0];
  }

  function colorToRgb(color) {
    if (window.SkySystem?.colorToRgb) return window.SkySystem.colorToRgb(color);
    const hex = color.replace("#", "");
    return [
      parseInt(hex.slice(0, 2), 16) / 255,
      parseInt(hex.slice(2, 4), 16) / 255,
      parseInt(hex.slice(4, 6), 16) / 255
    ];
  }

  function colorFromCssRgb(color, fallback) {
    if (!color.startsWith("rgb")) return color;
    const matches = color.match(/\d+(\.\d+)?/g);
    if (!matches || matches.length < 3) return fallback;
    const values = matches.slice(0, 3).map((value) => clamp(Math.round(Number(value)), 0, 255).toString(16).padStart(2, "0"));
    return `#${values.join("")}`;
  }

  function brightestGradientColor(gradient) {
    let best = gradient[0][1];
    let bestLuma = -1;
    gradient.forEach(([, color]) => {
      const [r, g, b] = colorToRgb(color);
      const luma = r * 0.2126 + g * 0.7152 + b * 0.0722;
      if (luma > bestLuma) {
        best = color;
        bestLuma = luma;
      }
    });
    return best;
  }

  function resize() {
    const rect = canvas.getBoundingClientRect();
    const dpr = Math.min(window.devicePixelRatio || 1, 2.5);
    canvas.width = Math.max(2, Math.floor(rect.width * dpr));
    canvas.height = Math.max(2, Math.floor(rect.height * dpr));
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    skySystem?.resize(rect.width, rect.height);
    resizeQueued = false;
    snapCamera();
  }

  function canvasSize() {
    const rect = canvas.getBoundingClientRect();
    return { width: rect.width, height: rect.height };
  }

  function snapCamera() {
    updateCameraTargets();
    view.x = view.targetX;
    view.y = view.targetY;
    view.scale = view.targetScale;
  }

  function updateCameraTargets() {
    const { width, height } = canvasSize();
    const b = world.ball;
    const terrainY = terrainHeight(b.x);
    const heightAboveGround = Math.max(0, b.y - terrainY);
    const verticalSpan = Math.max(24, Math.min(58, 27 + Math.abs(b.vy) * 0.18 + heightAboveGround * 1.08));
    const scaleByHeight = height / verticalSpan;
    const scaleByWidth = width / (verticalSpan * (width / height));
    const shotScale = Math.min(scaleByHeight, scaleByWidth) * (b.grounded ? 0.98 : 0.82);

    let ballScreenRatio = 0.38;
    let targetX = b.x - (width / shotScale) * ballScreenRatio;
    let targetY = terrainY - height / shotScale * 0.34;

    if (world.cameraMode === "address") {
      const holeDistance = COURSE.holeX - b.x;
      if (Math.abs(holeDistance) < width / shotScale * 0.55) {
        targetX = (b.x + COURSE.holeX) * 0.5 - width / shotScale * 0.5;
      }
    }

    if (world.cameraMode === "flight") {
      ballScreenRatio = 0.5;
      targetX = b.x - (width / shotScale) * ballScreenRatio;
      const ballScreenY = b.grounded ? 0.55 : b.vy > 0 ? 0.38 : 0.42;
      const ballTargetY = b.y - (height / shotScale) * (1 - ballScreenY);
      targetY = Math.max(targetY, ballTargetY);
    }

    if (world.cameraMode === "settled") {
      const ballPastHole = b.x > COURSE.holeX + 8;
      if (ballPastHole) {
        const scale = clamp(width / 36, height / 38, height / 21);
        view.targetScale = scale;
        view.targetX = b.x - width / scale * 0.5;
        view.targetY = terrainY - height / scale * 0.34;
        return;
      }

      const left = b.x;
      const right = Math.min(COURSE.holeX, b.x + 42);
      const desiredSpan = Math.max(32, (right - left) / 0.42);
      const scale = clamp(width / desiredSpan, height / 38, height / 21);
      view.targetScale = scale;
      view.targetX = b.x - width / scale * 0.38;
      view.targetY = terrainHeight((left + right) * 0.5) - height / scale * 0.34;
      return;
    }

    const cameraPadding = width / shotScale * 0.56;
    const minCameraX = Math.min(-8, b.x - cameraPadding);
    const maxCameraX = Math.max(COURSE.endX - width / shotScale + 8, b.x - width / shotScale * 0.5);
    view.targetX = clamp(targetX, minCameraX, maxCameraX);
    view.targetY = targetY;
    view.targetScale = clamp(shotScale, height / 48, height / 18);
  }

  function worldToScreen(x, y) {
    const { height } = canvasSize();
    return {
      x: (x - view.x) * view.scale,
      y: height - (y - view.y) * view.scale
    };
  }

  function update(dt) {
    updateCameraTargets();
    const responsiveness = 1 - Math.pow(world.cameraMode === "flight" ? 0.000001 : 0.001, dt);
    view.x = lerp(view.x, view.targetX, responsiveness);
    view.y = lerp(view.y, view.targetY, responsiveness);
    view.scale = lerp(view.scale, view.targetScale, responsiveness);

    if (!world.ball.asleep || !world.ball.grounded) {
      stepBall(world.ball, dt);
      world.cameraMode = world.ball.grounded && Math.abs(groundSpeed(world.ball)) < 0.25 ? "settled" : "flight";
      updateSlowSettle(dt);
    }

    if (world.messageTimer > 0) {
      world.messageTimer -= dt;
    }

    if (world.holed) {
      world.holeSinkTimer += dt;
      const sinkWorld = terrainHeight(COURSE.holeX);
      const t = clamp(world.holeSinkTimer / 0.28, 0, 1);
      world.ball.x = COURSE.holeX;
      world.ball.y = sinkWorld + BALL.radius * (0.32 - t * 1.55);
      if (!world.holeTransitionShown && world.holeSinkTimer > HOLE_SPINNER_DELAY) {
        world.holeTransitionShown = true;
        hideWheel();
        showWheel();
      }
    }

    updateWheel(dt);
    updateShotCaptions(dt);
    updateFreezeSettle(dt);
  }

  function updateSlowSettle(dt) {
    const ball = world.ball;
    if (!ball.grounded || ball.asleep) {
      world.finishTimer = 0;
      world.slowTimer = 0;
      return;
    }
    const speed = Math.abs(groundSpeed(ball));
    const slope = Math.abs(terrainSlope(ball.x));
    if (speed < FINISH_SETTLE_SPEED && slope < FINISH_SETTLE_SLOPE) {
      world.finishTimer += dt;
      if (world.finishTimer >= FINISH_SETTLE_SECONDS) {
        settleBall(ball, true);
        return;
      }
    } else {
      world.finishTimer = 0;
    }
    if (speed < FORCE_SETTLE_SPEED) {
      world.slowTimer += dt;
      if (world.slowTimer >= FORCE_SETTLE_SECONDS) {
        settleBall(ball, true);
      }
    } else {
      world.slowTimer = 0;
    }
  }

  function updateFreezeSettle(dt) {
    const ball = world.ball;
    if (ball.asleep || world.holed) {
      world.freezeTimer = 0;
      return;
    }

    const surfaceY = terrainHeight(ball.x) + BALL.radius;
    const closeToGround = ball.grounded || Math.abs(ball.y - surfaceY) < 0.12;
    const speed = Math.hypot(ball.vx, ball.vy);
    const ground = Math.abs(groundSpeed(ball));
    const slope = Math.abs(terrainSlope(ball.x));
    const slowAndFlat = speed < 0.28 && ground < 0.12 && Math.abs(ball.vy) < 0.6 && slope < 0.62;

    if (closeToGround && slowAndFlat) {
      world.freezeTimer += dt;
      if (world.freezeTimer >= 0.12) {
        settleBall(ball, true);
      }
    } else {
      world.freezeTimer = 0;
    }
  }

  function settleBall(ball, triggerWheel) {
    const wasMoving = !ball.asleep;
    ball.y = terrainHeight(ball.x) + BALL.radius;
    ball.vx = 0;
    ball.vy = 0;
    ball.omega = 0;
    ball.slipping = false;
    ball.grounded = true;
    ball.asleep = true;
    world.finishTimer = 0;
    world.slowTimer = 0;
    world.freezeTimer = 0;
    world.cameraMode = "settled";
    if (triggerWheel && wasMoving && !world.holed) {
      spawnLandingCaption();
    }
  }

  function showWheel() {
    const segmentAngle = (Math.PI * 2) / wheelSegments.length;
    const resultIndex = Math.floor(Math.random() * wheelSegments.length);
    const start = wheel.rotation;
    const align = -(resultIndex + 0.5) * segmentAngle;
    const normalizedStart = ((start % (Math.PI * 2)) + Math.PI * 2) % (Math.PI * 2);
    const delta = ((align - normalizedStart) % (Math.PI * 2) + Math.PI * 2) % (Math.PI * 2);
    wheel = {
      visible: true,
      spinning: true,
      done: false,
      elapsed: 0,
      duration: 4.6,
      rotation: start,
      startRotation: start,
      targetRotation: start + Math.PI * 2 * 4 + delta,
      resultIndex,
      resultText: `${wheelSegments[resultIndex].label} ${wheelSegments[resultIndex].sub}`
    };
  }

  function hideWheel() {
    wheel.visible = false;
    wheel.spinning = false;
    wheel.done = false;
  }

  function spawnStrikeCaption(strike, mode) {
    const quality = strike?.quality ?? 0;
    let text = "TIMED!";
    if (quality > 0.92) text = mode === "putt" ? "DRAIN IT!" : "PURE!";
    else if (quality > 0.72) text = "CLEAN!";
    else if (quality > 0.42) text = "NICE!";
    else text = "OFF BEAT!";
    pushCaption(text, mode === "putt" ? "POWER RELEASE" : "SHOT RELEASE", {
      tone: quality > 0.72 ? "gold" : "white",
      y: 0.31,
      duration: 1.05,
      impact: 1.0 + quality * 0.26
    });
  }

  function spawnLandingCaption() {
    const toPin = COURSE.holeX - world.ball.x;
    const distance = Math.abs(toPin);
    let text = "SETTLED";
    let sub = `${distance.toFixed(1)}M ${toPin < 0 ? "LONG" : "SHORT"}`;
    let tone = "white";
    if (distance < 1.4) {
      text = "TAP-IN!";
      sub = "RIGHT THERE";
      tone = "gold";
    } else if (distance < 4) {
      text = "CLOSE!";
      sub = `${distance.toFixed(1)}M TO PIN`;
      tone = "gold";
    } else if (Math.abs(toPin) < 9) {
      text = "PIN HIGH!";
      sub = `${distance.toFixed(1)}M AWAY`;
      tone = "mint";
    } else if (toPin < 0) {
      text = "SAILED!";
      tone = "coral";
    } else {
      text = "NEEDS LEGS!";
      tone = "coral";
    }
    pushCaption(text, sub, {
      tone,
      y: 0.34,
      duration: 1.3,
      impact: distance < 4 ? 1.28 : 1.05
    });
  }

  function spawnHoledCaption() {
    const score = world.strokes - COURSE_PAR;
    let text = "DROPPED!";
    if (world.strokes === 1) text = "ACE!";
    else if (score <= -2) text = "EAGLE!";
    else if (score === -1) text = "BIRDIE!";
    else if (score === 0) text = "PAR!";
    else if (score === 1) text = "BOGEY!";
    const relation = score === 0 ? "EVEN" : `${Math.abs(score)} ${score < 0 ? "UNDER" : "OVER"}`;
    pushCaption(text, `SHOT ${world.strokes} / PAR ${COURSE_PAR} • ${relation}`, {
      tone: score <= 0 ? "gold" : "mint",
      y: 0.28,
      duration: 2.0,
      impact: 1.55,
      celebrate: true
    });
  }

  function pushCaption(text, subtext, options = {}) {
    shotCaptions.push({
      text,
      subtext,
      age: 0,
      duration: options.duration || 1.2,
      x: options.x ?? 0.5,
      y: options.y ?? 0.33,
      tone: options.tone || "white",
      impact: options.impact || 1,
      celebrate: !!options.celebrate,
      wobble: Math.random() * Math.PI * 2
    });
    if (shotCaptions.length > 5) shotCaptions.splice(0, shotCaptions.length - 5);
  }

  function updateShotCaptions(dt) {
    for (let i = shotCaptions.length - 1; i >= 0; i -= 1) {
      shotCaptions[i].age += dt;
      if (shotCaptions[i].age >= shotCaptions[i].duration) {
        shotCaptions.splice(i, 1);
      }
    }
  }

  function captionPalette(tone) {
    if (tone === "gold") {
      return {
        fill: "rgb(255 249 224 / 0.98)",
        accent: "rgb(255 205 97 / 0.92)",
        shadow: "rgb(70 40 16 / 0.34)"
      };
    }
    if (tone === "mint") {
      return {
        fill: "rgb(235 255 246 / 0.96)",
        accent: "rgb(142 226 185 / 0.85)",
        shadow: "rgb(11 45 38 / 0.32)"
      };
    }
    if (tone === "coral") {
      return {
        fill: "rgb(255 239 232 / 0.96)",
        accent: "rgb(255 133 103 / 0.86)",
        shadow: "rgb(72 24 20 / 0.34)"
      };
    }
    return {
      fill: "rgb(255 255 255 / 0.95)",
      accent: "rgb(255 255 255 / 0.42)",
      shadow: "rgb(14 25 34 / 0.3)"
    };
  }

  function updateWheel(dt) {
    if (!wheel.visible || !wheel.spinning) return;
    wheel.elapsed += dt;
    const t = clamp(wheel.elapsed / wheel.duration, 0, 1);
    const eased = 1 - Math.pow(1 - t, 4.2);
    let wobble = 0;
    if (t > 0.76) {
      const local = (t - 0.76) / 0.24;
      wobble = Math.sin(local * Math.PI * 7.5) * (1 - local) * 0.12;
    }
    wheel.rotation = lerp(wheel.startRotation, wheel.targetRotation, eased) + wobble;
    if (t >= 1) {
      wheel.rotation = wheel.targetRotation;
      wheel.spinning = false;
      wheel.done = true;
    }
  }

  function stepBall(ball, dt) {
    if (ball.grounded) {
      stepGrounded(ball, dt);
    } else {
      stepAir(ball, dt);
      resolveTerrainCollision(ball);
    }

    const holeY = terrainHeight(COURSE.holeX);
    const nearCup = Math.abs(ball.x - COURSE.holeX) < COURSE.holeRadius * 2.6;
    const slowEnough = Math.hypot(ball.vx, ball.vy) < 2.5;
    if (!world.holed && nearCup && ball.y - BALL.radius < holeY + 0.12 && slowEnough) {
      world.holed = true;
      world.messageTimer = 2.0;
      ball.x = COURSE.holeX;
      ball.y = holeY + BALL.radius * 0.35;
      world.holeSinkTimer = 0;
      spawnHoledCaption();
      settleBall(ball, false);
    }

    if (ball.x < -70 || ball.x > COURSE.endX + 95 || ball.y < -40) {
      resetBallToPlayableLie();
    }
  }

  function stepAir(ball, dt) {
    const speed = Math.hypot(ball.vx, ball.vy);
    if (speed > 0.001) {
      const q = 0.5 * BALL.airDensity * speed * speed * BALL.dragCoefficient * BALL.dragArea / BALL.mass;
      ball.vx -= (ball.vx / speed) * q * dt;
      ball.vy -= (ball.vy / speed) * q * dt;

      const spinLift = BALL.liftCoefficient * clamp(spinRpm(ball) / 7200, -1, 1) * speed * 0.09;
      ball.vx += (-ball.vy / speed) * spinLift * dt;
      ball.vy += (ball.vx / speed) * spinLift * dt;
    }
    ball.vy -= GRAVITY * dt;
    ball.omega *= Math.exp(-BALL.spinDecay * dt);
    ball.angle += ball.omega * dt;
    ball.x += ball.vx * dt;
    ball.y += ball.vy * dt;
  }

  function resolveTerrainCollision(ball) {
    const h = terrainHeight(ball.x);
    const floorY = h + BALL.radius;
    if (ball.y > floorY) return;

    const frame = terrainFrame(ball.x);
    const normalVelocity = ball.vx * frame.normalX + ball.vy * frame.normalY;
    const tangentVelocity = ball.vx * frame.tangentX + ball.vy * frame.tangentY;
    ball.y = floorY;

    if (normalVelocity < 0) {
      const impact = Math.abs(normalVelocity);
      const green = isGreen(ball.x);
      const restitution = clamp((green ? 0.21 : 0.31) + impact * 0.012, 0.18, green ? 0.38 : 0.48);
      const tangentRetention = clamp(1 - BALL.bounceFriction + impact * 0.008, 0.58, 0.88);
      const newNormalVelocity = -normalVelocity * restitution;
      const retainedTangent = tangentVelocity * tangentRetention;
      const slip = retainedTangent + ball.omega * BALL.radius;
      const maxContactDelta = clamp(impact * 0.22 + 0.8, 0.9, 7.5);
      const tangentDelta = clamp(-slip / (1 + 1 / BALL.inertiaFactor), -maxContactDelta, maxContactDelta);
      const newTangentVelocity = retainedTangent + tangentDelta;

      ball.vx = frame.normalX * newNormalVelocity + frame.tangentX * newTangentVelocity;
      ball.vy = frame.normalY * newNormalVelocity + frame.tangentY * newTangentVelocity;
      ball.omega += tangentDelta / (BALL.inertiaFactor * BALL.radius);
      ball.slipping = Math.abs(newTangentVelocity + ball.omega * BALL.radius) > 0.35;

      if (newNormalVelocity < 0.85 && Math.abs(newTangentVelocity) < 10.5) {
        ball.grounded = true;
        ball.vx = frame.tangentX * newTangentVelocity;
        ball.vy = frame.tangentY * newTangentVelocity;
      }
    } else {
      ball.grounded = true;
      ball.slipping = true;
    }
  }

  function stepGrounded(ball, dt) {
    const frame = terrainFrame(ball.x);
    ball.y = terrainHeight(ball.x) + BALL.radius;
    let vt = ball.vx * frame.tangentX + ball.vy * frame.tangentY;
    const slopeAccel = -GRAVITY * frame.slope / Math.sqrt(1 + frame.slope * frame.slope);
    const normalG = GRAVITY / Math.sqrt(1 + frame.slope * frame.slope);
    const resistance = (isGreen(ball.x) ? BALL.greenRollingResistance : BALL.fairwayRollingResistance) * normalG;
    const friction = vt === 0 ? 0 : -Math.sign(vt) * resistance;
    const slip = vt + ball.omega * BALL.radius;
    const isPureRolling = !ball.slipping && Math.abs(slip) < 0.12;
    const rollingSlopeAccel = slopeAccel / (1 + BALL.inertiaFactor);
    let contactAccel = 0;

    if (!isPureRolling) {
      const grip = ball.slipping ? BALL.landingGrip : BALL.groundGrip;
      contactAccel = clamp(-slip * grip, -normalG * 0.82, normalG * 0.82);
    }

    const nextVt = vt + ((isPureRolling ? rollingSlopeAccel : slopeAccel) + friction + contactAccel) * dt;

    if (Math.sign(vt) !== Math.sign(nextVt) && Math.abs(slopeAccel) < resistance) {
      vt = 0;
    } else {
      vt = nextVt;
    }

    if (isPureRolling) {
      ball.omega = rollingOmega(vt);
    } else {
      ball.omega += contactAccel / (BALL.inertiaFactor * BALL.radius) * dt;
      const nextSlip = vt + ball.omega * BALL.radius;
      if (Math.abs(nextSlip) < 0.08 || Math.abs(vt) < 0.1) {
        ball.slipping = false;
        ball.omega = rollingOmega(vt);
      }
    }
    ball.angle += ball.omega * dt;
    ball.x += frame.tangentX * vt * dt;
    ball.y = terrainHeight(ball.x) + BALL.radius;
    const newFrame = terrainFrame(ball.x);
    ball.vx = newFrame.tangentX * vt;
    ball.vy = newFrame.tangentY * vt;

    if (Math.abs(vt) < BALL.stopSpeed && Math.abs(slopeAccel) < resistance * 0.9) {
      settleBall(ball, true);
    }
  }

  function groundSpeed(ball) {
    const frame = terrainFrame(ball.x);
    return ball.vx * frame.tangentX + ball.vy * frame.tangentY;
  }

  function isGreen(x) {
    return x > COURSE.greenStart - 3 && x < COURSE.greenEnd + 5;
  }

  function isPuttLie(ball) {
    const toPin = Math.abs(COURSE.holeX - ball.x);
    const slope = Math.abs(terrainSlope(ball.x));
    return ball.grounded && toPin <= PUTT_DISTANCE && slope <= PUTT_FLAT_SLOPE;
  }

  function resetBallToPlayableLie() {
    const b = world.ball;
    b.x = clamp(b.x, -4, COURSE.endX + 55);
    b.y = terrainHeight(b.x) + BALL.radius;
    b.vx = 0;
    b.vy = 0;
    b.omega = 0;
    b.slipping = false;
    b.grounded = true;
    b.asleep = true;
    world.holeSinkTimer = 0;
    world.finishTimer = 0;
    world.slowTimer = 0;
    world.freezeTimer = 0;
    world.holeTransitionShown = false;
    world.cameraMode = "settled";
  }

  function setHole(index) {
    currentHoleIndex = (index + HOLES.length) % HOLES.length;
    currentCourse = HOLES[currentHoleIndex];
    terrainKnots = currentCourse.terrainKnots;
    world = createWorld();
    pointer = null;
    shotPreview = null;
    guide.length = 0;
    strikeClock = 0;
    accumulator = 0;
    wheel = createWheelState();
    hideWheel();
    resizeQueued = true;
    skySystem?.setPreset(currentSkyPreset());
    snapCamera();
    syncHoleUi();
  }

  function syncHoleUi() {
    if (holeCounter) {
      holeCounter.textContent = `${currentHoleIndex + 1}/${HOLES.length}`;
    }
  }

  function launchFromPointer() {
    if (!pointer || !world.ball.asleep || world.holed) return;
    shotPreview = computeLaunchFromDrag({ useStrike: true });
    const b = world.ball;
    const launch = shotPreview.launch;
    b.vx = launch.vx;
    b.vy = launch.vy;
    b.omega = launch.omega;
    b.slipping = shotPreview.mode === "putt" ? false : true;
    b.grounded = shotPreview.mode === "putt";
    b.asleep = false;
    world.strokes += 1;
    spawnStrikeCaption(shotPreview.strike, shotPreview.mode);
    world.cameraMode = "flight";
    world.finishTimer = 0;
    world.slowTimer = 0;
    pointer = null;
    shotPreview = null;
  }

  function computeLaunchFromDrag(options = {}) {
    const b = world.ball;
    const ballScreen = worldToScreen(b.x, b.y);
    const rawX = pointer.startX - pointer.x;
    const rawY = pointer.y - pointer.startY;
    const pull = Math.hypot(rawX, rawY);
    const maxPull = Math.min(canvasSize().width, canvasSize().height) * 0.32;
    const power = clamp(pull / maxPull, 0, 1);
    const fallbackDirection = COURSE.holeX >= b.x ? 1 : -1;
    const direction = Math.abs(rawX) > 8 ? Math.sign(rawX) : fallbackDirection;
    const strike = options.useStrike ? strikeState() : perfectStrikeState();
    const powerStrike = lerp(0.72, 1.02, strike.quality);
    const faceMiss = strike.miss * (0.12 + power * 0.11);
    const toPin = Math.max(0, COURSE.holeX - b.x);
    const distanceRatio = clamp(toPin / 150, 0, 1);
    const sweetCenter = STRIKE_TARGET;
    const sweetWidth = lerp(0.16, 0.1, distanceRatio);
    if (isPuttLie(b)) {
      const frame = terrainFrame(b.x);
      const targetDistance = Math.max(1.5, Math.abs(COURSE.holeX - b.x));
      const idealFlatSpeed = Math.sqrt(targetDistance * 2 * GRAVITY * BALL.greenRollingResistance);
      const maxPuttSpeed = clamp(idealFlatSpeed * 1.85 + 1.2, 7.5, 18);
      const speed = (0.25 + Math.pow(power, 1.42) * maxPuttSpeed) * lerp(0.68, 1.03, strike.quality);
      const vt = direction * speed;
      return {
        mode: "putt",
        strike,
        launch: {
          vx: frame.tangentX * vt,
          vy: frame.tangentY * vt,
          omega: rollingOmega(vt)
        },
        pull,
        maxPull,
        power,
        ballScreen,
        sweetCenter,
        sweetWidth
      };
    }
    const horizontal = Math.max(Math.abs(rawX), pull * 0.18);
    const angle = Math.atan2(rawY, horizontal);
    const limitedAngle = clamp(angle + faceMiss, MIN_LAUNCH_ANGLE, MAX_LAUNCH_ANGLE);
    const speed = (BALL.minSpeed + Math.pow(power, 1.25) * (BALL.maxSpeed - BALL.minSpeed)) * powerStrike;
    const gearPenalty = clamp(1 - Math.abs(limitedAngle - angle) * 0.16, 0.72, 1);
    const vx = direction * Math.cos(limitedAngle) * speed * gearPenalty;
    const vy = Math.sin(limitedAngle) * speed * gearPenalty;
    const loftSpin = clamp((limitedAngle - 0.08) / (MAX_LAUNCH_ANGLE - 0.08), 0, 1);
    const backspinRpm = 1900 + loftSpin * 3600 + power * 900;
    const omega = direction * rpmToRadPerSecond(backspinRpm);
    return {
      mode: "flight",
      strike,
      launch: { vx, vy, omega },
      pull,
      maxPull,
      power,
      ballScreen,
      sweetCenter,
      sweetWidth
    };
  }

  function predictGuide() {
    guide.length = 0;
    if (!pointer || !world.ball.asleep || world.holed) return;
    const liveStrike = strikeState();
    shotPreview = computeLaunchFromDrag({ useStrike: false });
    shotPreview.strike = liveStrike;
    const ghost = {
      x: world.ball.x,
      y: world.ball.y,
      vx: shotPreview.launch.vx,
      vy: shotPreview.launch.vy,
      omega: shotPreview.launch.omega,
      angle: world.ball.angle,
      slipping: shotPreview.mode !== "putt",
      grounded: shotPreview.mode === "putt",
      asleep: false
    };
    let bounces = 0;
    for (let i = 0; i < MAX_GUIDE_STEPS; i += 1) {
      if (shotPreview.mode === "putt") {
        stepGroundedGhost(ghost, 1 / 60);
      } else if (!ghost.grounded) {
        stepAir(ghost, 1 / 60);
        const beforeVy = ghost.vy;
        resolveGhostCollision(ghost);
        if (ghost.grounded || beforeVy !== ghost.vy) bounces += 1;
      } else {
        stepGroundedGhost(ghost, 1 / 60);
      }
      if (i % 4 === 0) {
        guide.push({ x: ghost.x, y: ghost.y, grounded: ghost.grounded });
      }
      if (ghost.grounded && Math.abs(groundSpeed(ghost)) < 0.35) break;
      if (bounces > 2 && i > 180) break;
      if (ghost.x < -70 || ghost.x > COURSE.endX + 65 || ghost.y < -20) break;
    }
  }

  function resolveGhostCollision(ball) {
    const h = terrainHeight(ball.x);
    const floorY = h + BALL.radius;
    if (ball.y > floorY) return;
    const frame = terrainFrame(ball.x);
    const normalVelocity = ball.vx * frame.normalX + ball.vy * frame.normalY;
    const tangentVelocity = ball.vx * frame.tangentX + ball.vy * frame.tangentY;
    ball.y = floorY;
    if (normalVelocity < 0) {
      const impact = Math.abs(normalVelocity);
      const restitution = clamp((isGreen(ball.x) ? 0.2 : 0.29) + impact * 0.01, 0.16, 0.42);
      const newNormalVelocity = -normalVelocity * restitution;
      const tangentRetention = clamp(1 - BALL.bounceFriction + impact * 0.008, 0.58, 0.88);
      const retainedTangent = tangentVelocity * tangentRetention;
      const slip = retainedTangent + ball.omega * BALL.radius;
      const maxContactDelta = clamp(impact * 0.2 + 0.7, 0.8, 6.5);
      const tangentDelta = clamp(-slip / (1 + 1 / BALL.inertiaFactor), -maxContactDelta, maxContactDelta);
      const newTangentVelocity = retainedTangent + tangentDelta;
      ball.vx = frame.normalX * newNormalVelocity + frame.tangentX * newTangentVelocity;
      ball.vy = frame.normalY * newNormalVelocity + frame.tangentY * newTangentVelocity;
      ball.omega += tangentDelta / (BALL.inertiaFactor * BALL.radius);
      ball.slipping = Math.abs(newTangentVelocity + ball.omega * BALL.radius) > 0.35;
      if (newNormalVelocity < 0.8) {
        ball.grounded = true;
      }
    }
  }

  function stepGroundedGhost(ball, dt) {
    const frame = terrainFrame(ball.x);
    let vt = ball.vx * frame.tangentX + ball.vy * frame.tangentY;
    const slopeAccel = -GRAVITY * frame.slope / Math.sqrt(1 + frame.slope * frame.slope);
    const normalG = GRAVITY / Math.sqrt(1 + frame.slope * frame.slope);
    const resistance = (isGreen(ball.x) ? BALL.greenRollingResistance : BALL.fairwayRollingResistance) * normalG;
    const friction = vt === 0 ? 0 : -Math.sign(vt) * resistance;
    const slip = vt + ball.omega * BALL.radius;
    const isPureRolling = !ball.slipping && Math.abs(slip) < 0.12;
    let contactAccel = 0;
    if (!isPureRolling) {
      contactAccel = clamp(-slip * BALL.landingGrip, -normalG * 0.82, normalG * 0.82);
    }
    const rollingSlopeAccel = slopeAccel / (1 + BALL.inertiaFactor);
    const nextVt = vt + ((isPureRolling ? rollingSlopeAccel : slopeAccel) + friction + contactAccel) * dt;
    if (Math.sign(vt) !== Math.sign(nextVt) && Math.abs(slopeAccel) < resistance) {
      vt = 0;
    } else {
      vt = nextVt;
    }
    if (isPureRolling) {
      ball.omega = rollingOmega(vt);
    } else {
      ball.omega += contactAccel / (BALL.inertiaFactor * BALL.radius) * dt;
      if (Math.abs(vt + ball.omega * BALL.radius) < 0.08 || Math.abs(vt) < 0.1) {
        ball.slipping = false;
        ball.omega = rollingOmega(vt);
      }
    }
    ball.angle += ball.omega * dt;
    ball.x += frame.tangentX * vt * dt;
    ball.y = terrainHeight(ball.x) + BALL.radius;
    const newFrame = terrainFrame(ball.x);
    ball.vx = newFrame.tangentX * vt;
    ball.vy = newFrame.tangentY * vt;
  }

  function draw(nowSeconds = 0) {
    if (resizeQueued) resize();
    const { width, height } = canvasSize();
    ctx.clearRect(0, 0, width, height);
    const skyRendered = skySystem?.render(currentSkyPreset(), nowSeconds);
    if (!skyRendered) drawSky(width, height);
    drawTerrain(width, height);
    drawCupHint();
    drawGuide();
    drawBall();
    drawMinimap(width, height);
    drawTinyReadout(width, height);
    drawShotCaptions(width, height);
    drawWheelOverlay(width, height);
  }

  function drawSky(width, height) {
    const sky = ctx.createLinearGradient(0, 0, 0, height);
    sky.addColorStop(0, COLORS.skyTop);
    sky.addColorStop(0.28, COLORS.skyMid);
    sky.addColorStop(0.55, COLORS.skyGlow);
    sky.addColorStop(0.76, COLORS.skyHorizon);
    sky.addColorStop(1, COLORS.skyHorizon);
    ctx.fillStyle = sky;
    ctx.fillRect(0, 0, width, height);

    let glowStart = "rgb(255 220 129 / 0.55)";
    let glowMid = "rgb(255 116 116 / 0.22)";
    if (currentCourse.atmosphere === "haze" || currentCourse.atmosphere === "soft") {
      glowStart = "rgb(255 255 255 / 0.22)";
      glowMid = "rgb(208 240 255 / 0.12)";
    } else if (currentCourse.atmosphere === "night") {
      glowStart = "rgb(120 160 255 / 0.15)";
      glowMid = "rgb(80 120 220 / 0.08)";
    } else if (currentCourse.atmosphere === "storm") {
      glowStart = "rgb(120 150 180 / 0.12)";
      glowMid = "rgb(40 58 72 / 0.1)";
    } else if (currentCourse.atmosphere === "snow") {
      glowStart = "rgb(255 255 255 / 0.34)";
      glowMid = "rgb(230 248 255 / 0.16)";
    } else if (currentCourse.atmosphere === "glow" || currentCourse.atmosphere === "warm") {
      glowStart = "rgb(255 220 129 / 0.56)";
      glowMid = "rgb(255 116 116 / 0.2)";
    }
    const glow = ctx.createRadialGradient(width * 0.5, height * 0.82, 0, width * 0.5, height * 0.82, height * 0.72);
    glow.addColorStop(0, glowStart);
    glow.addColorStop(0.46, glowMid);
    glow.addColorStop(1, "rgb(255 116 116 / 0)");
    ctx.fillStyle = glow;
    ctx.fillRect(0, 0, width, height);

    drawAtmosphere(width, height);
  }

  function drawAtmosphere(width, height) {
    const mode = currentCourse.atmosphere;
    ctx.save();
    if (mode === "haze" || mode === "soft") {
      const haze = ctx.createRadialGradient(width * 0.24, height * 0.7, 0, width * 0.24, height * 0.7, height * 0.28);
      haze.addColorStop(0, "rgb(255 255 255 / 0.16)");
      haze.addColorStop(0.45, "rgb(255 255 255 / 0.08)");
      haze.addColorStop(1, "rgb(255 255 255 / 0)");
      ctx.fillStyle = haze;
      ctx.fillRect(0, 0, width, height);
      const haze2 = ctx.createRadialGradient(width * 0.76, height * 0.64, 0, width * 0.76, height * 0.64, height * 0.22);
      haze2.addColorStop(0, "rgb(255 255 255 / 0.11)");
      haze2.addColorStop(0.5, "rgb(255 255 255 / 0.04)");
      haze2.addColorStop(1, "rgb(255 255 255 / 0)");
      ctx.fillStyle = haze2;
      ctx.fillRect(0, 0, width, height);
    } else if (mode === "night") {
      ctx.fillStyle = "rgb(255 248 232 / 0.78)";
      const stars = [
        [0.22, 0.11, 1.1], [0.28, 0.18, 0.8], [0.34, 0.08, 0.7], [0.48, 0.21, 1.0],
        [0.57, 0.1, 0.75], [0.63, 0.17, 0.9], [0.7, 0.06, 0.8], [0.81, 0.13, 0.65],
        [0.88, 0.09, 0.85], [0.42, 0.28, 0.7]
      ];
      stars.forEach(([sx, sy, sr]) => {
        ctx.globalAlpha = 0.34 + sr * 0.2;
        ctx.beginPath();
        ctx.arc(width * sx, height * sy, sr, 0, Math.PI * 2);
        ctx.fill();
      });
      ctx.globalAlpha = 0.9;
      ctx.strokeStyle = "rgb(255 245 228 / 0.76)";
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.arc(width * 0.49, height * 0.23, Math.min(width, height) * 0.025, Math.PI * 0.12, Math.PI * 1.32);
      ctx.stroke();
      ctx.strokeStyle = "rgb(6 16 34 / 0.76)";
      ctx.lineWidth = 4;
      ctx.beginPath();
      ctx.arc(width * 0.495, height * 0.225, Math.min(width, height) * 0.024, Math.PI * 0.08, Math.PI * 1.28);
      ctx.stroke();
    } else if (mode === "snow") {
      ctx.fillStyle = "rgb(255 255 255 / 0.62)";
      for (let i = 0; i < 20; i += 1) {
        const xSeed = (i * 37) % 100;
        const ySeed = (i * 61) % 100;
        ctx.globalAlpha = 0.1 + ((i % 5) * 0.04);
        ctx.beginPath();
        ctx.arc(width * (xSeed / 100), height * (0.06 + ySeed / 160), 0.6 + (i % 3) * 0.25, 0, Math.PI * 2);
        ctx.fill();
      }
    } else if (mode === "storm") {
      const cloud = ctx.createRadialGradient(width * 0.44, height * 0.22, 0, width * 0.44, height * 0.22, height * 0.34);
      cloud.addColorStop(0, "rgb(20 31 45 / 0.74)");
      cloud.addColorStop(0.52, "rgb(16 24 34 / 0.42)");
      cloud.addColorStop(1, "rgb(16 24 34 / 0)");
      ctx.fillStyle = cloud;
      ctx.fillRect(0, 0, width, height);
      const cloud2 = ctx.createRadialGradient(width * 0.78, height * 0.28, 0, width * 0.78, height * 0.28, height * 0.28);
      cloud2.addColorStop(0, "rgb(10 17 24 / 0.52)");
      cloud2.addColorStop(1, "rgb(10 17 24 / 0)");
      ctx.fillStyle = cloud2;
      ctx.fillRect(0, 0, width, height);
      ctx.globalAlpha = 0.08;
      ctx.strokeStyle = "rgb(205 230 255 / 0.55)";
      ctx.lineWidth = 1.5;
      ctx.beginPath();
      ctx.moveTo(width * 0.84, height * 0.18);
      ctx.lineTo(width * 0.81, height * 0.25);
      ctx.lineTo(width * 0.86, height * 0.25);
      ctx.lineTo(width * 0.83, height * 0.32);
      ctx.stroke();
    } else if (mode === "glow") {
      const bloom = ctx.createRadialGradient(width * 0.54, height * 0.72, 0, width * 0.54, height * 0.72, height * 0.28);
      bloom.addColorStop(0, "rgb(255 236 162 / 0.2)");
      bloom.addColorStop(0.52, "rgb(255 187 92 / 0.12)");
      bloom.addColorStop(1, "rgb(255 187 92 / 0)");
      ctx.fillStyle = bloom;
      ctx.fillRect(0, 0, width, height);
    }
    ctx.restore();
  }

  function drawTerrain(width, height) {
    const start = view.x - 10;
    const end = view.x + width / view.scale + 10;
    const step = Math.max(0.7, 3.2 / view.scale);

    traceTerrainSurface(start, end, step);
    const last = worldToScreen(end, terrainHeight(end));
    const first = worldToScreen(start, terrainHeight(start));
    ctx.lineTo(last.x, height + 40);
    ctx.lineTo(first.x, height + 40);
    ctx.closePath();
    const land = ctx.createLinearGradient(0, height * 0.55, 0, height);
    land.addColorStop(0, COLORS.fairway);
    land.addColorStop(0.38, COLORS.fairwayMid);
    land.addColorStop(1, COLORS.soil);
    ctx.fillStyle = land;
    ctx.fill();
    drawTerrainOverlay(width, height, start, end, step);

    ctx.save();
    ctx.shadowColor = COLORS.rim;
    ctx.shadowBlur = Math.max(12, view.scale * 0.75);
    ctx.lineWidth = Math.max(3, view.scale * 0.12);
    ctx.strokeStyle = COLORS.rim;
    traceTerrainSurface(start, end, step);
    ctx.stroke();
    ctx.restore();

    ctx.lineWidth = Math.max(1.2, view.scale * 0.035);
    ctx.strokeStyle = "rgb(255 248 220 / 0.32)";
    traceTerrainSurface(start, end, step);
    ctx.stroke();
  }

  function drawTerrainOverlay(width, height, start, end, step) {
    if (!assets.terrainOverlayReady) return;
    const pattern = ctx.createPattern(assets.terrainOverlay, "repeat");
    if (!pattern) return;

    const tile = clamp(view.scale * 5.8, 86, 190);
    const scale = tile / assets.terrainOverlay.width;
    const offsetX = -((view.x * view.scale * 0.28) % tile);
    const offsetY = ((view.y * view.scale * 0.08) % tile);
    ctx.save();
    traceTerrainSurface(start, end, step);
    const last = worldToScreen(end, terrainHeight(end));
    const first = worldToScreen(start, terrainHeight(start));
    ctx.lineTo(last.x, height + 40);
    ctx.lineTo(first.x, height + 40);
    ctx.closePath();
    ctx.clip();

    if (pattern.setTransform && typeof DOMMatrix !== "undefined") {
      pattern.setTransform(new DOMMatrix([scale, 0, 0, scale, offsetX, offsetY]));
    }

    ctx.globalCompositeOperation = "overlay";
    ctx.globalAlpha = terrainOverlayAlpha();
    ctx.fillStyle = pattern;
    ctx.fillRect(0, 0, width, height);

    ctx.globalCompositeOperation = "source-over";
    ctx.globalAlpha = terrainOverlayAlpha() * 0.22;
    ctx.fillRect(0, 0, width, height);
    ctx.restore();
  }

  function terrainOverlayAlpha() {
    const mode = currentCourse.atmosphere;
    if (mode === "snow") return 0.442;
    if (mode === "night") return 0.745;
    if (mode === "storm") return 0.828;
    if (mode === "glow" || mode === "warm") return 0.635;
    return 0.773;
  }

  function traceTerrainSurface(start, end, step) {
    const points = [];
    for (let x = start; x <= end; x += step) {
      points.push(worldToScreen(x, terrainHeight(x)));
    }
    if (points.length < 2) return;
    ctx.beginPath();
    ctx.moveTo(points[0].x, points[0].y);
    for (let i = 1; i < points.length - 1; i += 1) {
      const midX = (points[i].x + points[i + 1].x) * 0.5;
      const midY = (points[i].y + points[i + 1].y) * 0.5;
      ctx.quadraticCurveTo(points[i].x, points[i].y, midX, midY);
    }
    const last = points[points.length - 1];
    ctx.lineTo(last.x, last.y);
  }

  function drawCupHint() {
    const ground = terrainHeight(COURSE.holeX);
    const cup = worldToScreen(COURSE.holeX, ground);
    const scale = view.scale;
    const sink = world.holed ? clamp(world.holeSinkTimer / 0.28, 0, 1) : 0;
    const cupWidth = scale * 0.62;
    const cupHeight = scale * 0.18;
    ctx.save();
    ctx.shadowColor = "rgb(6 10 14 / 0.4)";
    ctx.shadowBlur = Math.max(4, scale * 0.25);
    ctx.fillStyle = "rgb(7 11 13 / 0.92)";
    ctx.beginPath();
    ctx.ellipse(cup.x, cup.y + scale * 0.03, cupWidth, cupHeight, 0, 0, Math.PI * 2);
    ctx.fill();

    ctx.shadowBlur = 0;
    ctx.strokeStyle = "rgb(242 238 212 / 0.72)";
    ctx.lineWidth = Math.max(1, scale * 0.05);
    ctx.beginPath();
    ctx.moveTo(cup.x, cup.y - scale * 3.5);
    ctx.lineTo(cup.x, cup.y - scale * (1.15 + sink * 1.6));
    ctx.stroke();
    ctx.fillStyle = COLORS.flag;
    ctx.beginPath();
    ctx.moveTo(cup.x, cup.y - scale * 3.5);
    ctx.lineTo(cup.x + scale * 1.15, cup.y - scale * 3.08);
    ctx.lineTo(cup.x, cup.y - scale * 2.72);
    ctx.closePath();
    ctx.fill();

    if (sink > 0) {
      ctx.fillStyle = "rgb(7 11 13 / 0.92)";
      ctx.beginPath();
      ctx.ellipse(cup.x, cup.y + scale * (0.03 + sink * 0.1), cupWidth * (0.92 - sink * 0.06), cupHeight * (0.92 - sink * 0.08), 0, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.restore();
  }

  function drawGuide() {
    if (!pointer || guide.length < 2 || !shotPreview) return;
    ctx.save();
    ctx.lineCap = "round";
    ctx.lineJoin = "round";
    const putt = shotPreview.mode === "putt";
    ctx.strokeStyle = putt ? "rgb(255 238 137 / 0.82)" : "rgb(255 255 255 / 0.62)";
    ctx.lineWidth = putt ? 3 : 2;
    if (!putt) ctx.setLineDash([4, 8]);
    ctx.beginPath();
    guide.forEach((point, i) => {
      const p = worldToScreen(point.x, point.y);
      if (i === 0) ctx.moveTo(p.x, p.y);
      else ctx.lineTo(p.x, p.y);
    });
    ctx.stroke();
    ctx.setLineDash([]);

    const guideEnd = putt ? guide[guide.length - 1] : guide.find((point) => point.grounded) || guide[guide.length - 1];
    const lp = worldToScreen(guideEnd.x, terrainHeight(guideEnd.x) + 0.05);
    ctx.fillStyle = COLORS.guideLanding;
    ctx.beginPath();
    ctx.ellipse(lp.x, lp.y, putt ? 5 : 8, putt ? 5 : 3, 0, 0, Math.PI * 2);
    ctx.fill();

    const ball = shotPreview.ballScreen;
    const pull = clamp(shotPreview.pull / shotPreview.maxPull, 0, 1);
    ctx.strokeStyle = `rgb(255 255 255 / ${0.2 + pull * 0.45})`;
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.moveTo(ball.x, ball.y);
    ctx.lineTo(pointer.x, pointer.y);
    ctx.stroke();
    drawStrikeGauge(ball);
    ctx.restore();
  }

  function drawStrikeGauge(ballScreen) {
    if (!shotPreview?.strike) return;
    const { width, height } = canvasSize();
    const blocks = 34;
    const gaugeW = clamp(width * 0.38, 240, 420);
    const gaugeH = 22;
    const gap = 1;
    const blockW = (gaugeW - gap * (blocks - 1)) / blocks;
    const x = clamp(ballScreen.x - gaugeW * 0.5, 16, width - gaugeW - 16);
    const y = clamp(ballScreen.y + 50, 82, height - 84);
    const active = clamp(Math.floor(shotPreview.strike.position * blocks), 0, blocks - 1);
    const sweetCenter = clamp(shotPreview.sweetCenter ?? 0.16, 0, 1);
    const sweetWidth = clamp(shotPreview.sweetWidth ?? 0.14, 0.08, 0.24);
    const sweetStart = clamp(Math.floor((sweetCenter - sweetWidth * 0.5) * blocks), 0, blocks - 2);
    const sweetEnd = clamp(Math.ceil((sweetCenter + sweetWidth * 0.5) * blocks), sweetStart + 1, blocks - 1);
    const sweetX = x + sweetStart * (blockW + gap);
    const sweetW = (sweetEnd - sweetStart + 1) * blockW + (sweetEnd - sweetStart) * gap;

    ctx.save();
    const track = ctx.createLinearGradient(x, 0, x + gaugeW, 0);
    track.addColorStop(0, "rgb(9 20 18 / 0.88)");
    track.addColorStop(0.12, "rgb(18 52 43 / 0.92)");
    track.addColorStop(0.38, "rgb(77 157 95 / 0.96)");
    track.addColorStop(0.52, "rgb(225 212 90 / 0.98)");
    track.addColorStop(0.72, "rgb(244 176 70 / 0.96)");
    track.addColorStop(0.9, "rgb(240 94 96 / 0.95)");
    track.addColorStop(1, "rgb(238 72 114 / 0.94)");
    ctx.fillStyle = track;
    drawRoundedRect(x - 12, y - 10, gaugeW + 24, gaugeH + 22, 14);
    ctx.fill();

    const centerGlow = ctx.createLinearGradient(x, 0, x + gaugeW, 0);
    centerGlow.addColorStop(0, "rgb(255 255 255 / 0)");
    centerGlow.addColorStop(0.4, "rgb(255 255 255 / 0.06)");
    centerGlow.addColorStop(0.5, "rgb(255 255 255 / 0.15)");
    centerGlow.addColorStop(0.6, "rgb(255 255 255 / 0.06)");
    centerGlow.addColorStop(1, "rgb(255 255 255 / 0)");
    ctx.fillStyle = centerGlow;
    drawRoundedRect(x, y + 1, gaugeW, gaugeH, 10);
    ctx.fill();

    ctx.fillStyle = "rgb(255 255 255 / 0.08)";
    ctx.fillRect(x + 2, y + 3, gaugeW - 4, 1);

    for (let i = 0; i < blocks; i += 1) {
      const bx = x + i * (blockW + gap);
      const sweet = i >= sweetStart && i <= sweetEnd;
      const lit = i === active;
      const fill = sweet
        ? lit ? "rgb(255 255 250 / 0.98)" : "rgb(242 240 206 / 0.96)"
        : lit ? "rgb(255 232 157 / 0.92)" : "rgb(255 255 255 / 0.08)";
      ctx.fillStyle = fill;
      ctx.fillRect(bx, y, blockW, gaugeH);
      if (sweet) {
        ctx.fillStyle = "rgb(255 255 255 / 0.12)";
        ctx.fillRect(bx, y + 1, blockW, 1);
      } else {
        ctx.fillStyle = "rgb(255 255 255 / 0.035)";
        ctx.fillRect(bx, y + 1, blockW, 1);
      }
    }

    const cursorX = x + shotPreview.strike.position * gaugeW;
    ctx.fillStyle = shotPreview.strike.quality > 0.72 ? "rgb(255 248 215 / 0.98)" : "rgb(255 255 255 / 0.94)";
    ctx.fillRect(cursorX - 1, y - 10, 2, gaugeH + 22);
    ctx.strokeStyle = "rgb(255 255 255 / 0.14)";
    ctx.lineWidth = 1;
    ctx.strokeRect(x - 12, y - 10, gaugeW + 24, gaugeH + 22);
    ctx.fillStyle = "rgb(255 245 187 / 0.18)";
    drawRoundedRect(sweetX - 2, y + 1, sweetW + 4, gaugeH - 2, 8);
    ctx.fill();
    ctx.strokeStyle = "rgb(255 248 222 / 0.42)";
    ctx.lineWidth = 1.1;
    drawRoundedRect(sweetX - 2, y + 1, sweetW + 4, gaugeH - 2, 8);
    ctx.stroke();

    ctx.fillStyle = "rgb(255 255 255 / 0.9)";
    ctx.font = `700 ${Math.max(12, width * 0.02)}px ui-sans-serif, system-ui, sans-serif`;
    ctx.textAlign = "center";
    ctx.textBaseline = "bottom";
    ctx.fillText("POWER", x + gaugeW * 0.5, y - 18);
    ctx.textBaseline = "top";
    ctx.font = `700 ${Math.max(11, width * 0.016)}px ui-sans-serif, system-ui, sans-serif`;
    ctx.fillStyle = "rgb(255 255 255 / 0.78)";
    ctx.fillText("MIN", x + 4, y + gaugeH + 12);
    ctx.fillText("MAX", x + gaugeW - 4, y + gaugeH + 12);
    ctx.textAlign = "center";
    ctx.fillStyle = "rgb(255 255 255 / 0.88)";
    ctx.font = `800 ${Math.max(18, width * 0.04)}px ui-sans-serif, system-ui, sans-serif`;
    ctx.fillText(`${Math.round(shotPreview.power * 100)}%`, x + gaugeW * 0.5, y + gaugeH + 36);
    ctx.restore();
  }

  function drawBall() {
    const b = world.ball;
    if (world.holed && world.holeSinkTimer > 0.22) return;
    const p = worldToScreen(b.x, b.y);
    const sink = world.holed ? clamp(world.holeSinkTimer / 0.28, 0, 1) : 0;
    const r = Math.max(8, BALL.radius * view.scale * (world.holed ? 1 - sink * 0.78 : 1));
    if (!world.holed || sink < 0.28) {
      drawBallShadow(b, r);
    }
    ctx.save();
    ctx.translate(p.x, p.y);
    if (world.holed) {
      ctx.globalAlpha = 1 - sink * 0.92;
    }
    if (assets.ballReady) {
      ctx.rotate(-b.angle);
      ctx.drawImage(assets.ball, -r, -r, r * 2, r * 2);
      ctx.restore();
      return;
    }

    const ballGradient = ctx.createRadialGradient(-r * 0.35, -r * 0.45, r * 0.15, 0, 0, r);
    ballGradient.addColorStop(0, "#ffffff");
    ballGradient.addColorStop(0.68, COLORS.ball);
    ballGradient.addColorStop(1, COLORS.ballShade);
    ctx.fillStyle = ballGradient;
    ctx.beginPath();
    ctx.arc(0, 0, r, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = "rgb(30 42 38 / 0.22)";
    ctx.lineWidth = 1.5;
    ctx.stroke();

    const spin = -b.angle;
    ctx.strokeStyle = "rgb(70 90 82 / 0.20)";
    ctx.lineWidth = 1;
    for (let i = -1; i <= 1; i += 1) {
      ctx.beginPath();
      ctx.ellipse(Math.sin(spin + i) * r * 0.12, i * r * 0.24, r * 0.68, r * 0.15, spin * 0.22, 0, Math.PI * 2);
      ctx.stroke();
    }
    ctx.restore();
  }

  function drawBallShadow(ball, radius) {
    const ground = terrainHeight(ball.x);
    const drop = Math.max(0, ball.y - BALL.radius - ground);
    const p = worldToScreen(ball.x, ground + 0.04);
    const squash = clamp(1 - drop / 18, 0.14, 0.8);
    ctx.save();
    ctx.globalAlpha = 0.26 * squash;
    ctx.fillStyle = "#172018";
    ctx.beginPath();
    ctx.ellipse(p.x + radius * 0.18, p.y + radius * 0.14, radius * (0.92 + drop * 0.03), radius * 0.22, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
  }

  function drawMinimap(width, height) {
    const compact = width < 620;
    const mapW = Math.min(width * (compact ? 0.58 : 0.28), compact ? 220 : 310);
    const mapH = Math.max(22, Math.min(height * 0.05, 36));
    const x0 = width * 0.5 - mapW * 0.5;
    const y0 = Math.max(compact ? 48 : 62, height * 0.075);
    const mapStart = Math.min(0, world.ball.x - 8);
    const mapEnd = Math.max(COURSE.endX + 8, world.ball.x + 8);
    const xScale = mapW / (mapEnd - mapStart);
    const minY = -9;
    const maxY = 10;
    const yScale = mapH / (maxY - minY);

    ctx.save();
    ctx.globalAlpha = 0.88;
    ctx.strokeStyle = "rgb(244 244 236 / 0.58)";
    ctx.lineWidth = 1.6;
    ctx.beginPath();
    for (let x = mapStart; x <= mapEnd; x += 3) {
      const px = x0 + (x - mapStart) * xScale;
      const py = y0 + mapH - (terrainHeight(x) - minY) * yScale;
      if (x === mapStart) ctx.moveTo(px, py);
      else ctx.lineTo(px, py);
    }
    ctx.stroke();

    if (guide.length > 1) {
      ctx.strokeStyle = "rgb(255 232 137 / 0.72)";
      ctx.lineWidth = 1.4;
      ctx.setLineDash([2, 4]);
      ctx.beginPath();
      guide.forEach((g, i) => {
        const px = x0 + (g.x - mapStart) * xScale;
        const py = y0 + mapH - (clamp(g.y, minY, maxY + 16) - minY) * yScale * 0.65;
        if (i === 0) ctx.moveTo(px, py);
        else ctx.lineTo(px, py);
      });
      ctx.stroke();
      ctx.setLineDash([]);
    }

    const ballX = x0 + (world.ball.x - mapStart) * xScale;
    const ballY = y0 + mapH - (terrainHeight(world.ball.x) - minY) * yScale;
    ctx.fillStyle = "rgb(255 255 255 / 0.96)";
    ctx.beginPath();
    ctx.arc(ballX, ballY, 3.2, 0, Math.PI * 2);
    ctx.fill();

    const holeX = x0 + (COURSE.holeX - mapStart) * xScale;
    const holeY = y0 + mapH - (terrainHeight(COURSE.holeX) - minY) * yScale;
    ctx.fillStyle = "rgb(36 58 45 / 0.9)";
    ctx.beginPath();
    ctx.arc(holeX, holeY, 3, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
  }

  function drawTinyReadout(width, height) {
    ctx.save();
    ctx.font = "600 12px ui-sans-serif, system-ui, sans-serif";
    ctx.fillStyle = "rgb(20 31 29 / 0.62)";
    const toPin = COURSE.holeX - world.ball.x;
    const lie = world.holed ? "holed" : `${Math.abs(toPin).toFixed(1)}m ${toPin < -0.3 ? "long" : "to pin"}`;
    ctx.fillText(`hole ${currentHoleIndex + 1}/${HOLES.length} · strokes ${world.strokes} · ${lie}`, 14, height - 16);
    if (world.messageTimer > 0) {
      ctx.font = "700 18px ui-sans-serif, system-ui, sans-serif";
      ctx.fillStyle = "rgb(255 255 255 / 0.92)";
      ctx.textAlign = "center";
      ctx.fillText("Holed", width / 2, height * 0.24);
    }
    ctx.restore();
  }

  function drawShotCaptions(width, height) {
    if (!shotCaptions.length) return;
    ctx.save();
    shotCaptions.forEach((caption, index) => {
      const t = clamp(caption.age / caption.duration, 0, 1);
      const enter = 1 - Math.pow(1 - clamp(t / 0.28, 0, 1), 3);
      const exit = 1 - Math.pow(clamp((t - 0.72) / 0.28, 0, 1), 2);
      const alpha = clamp(enter * exit, 0, 1);
      const pop = 0.72 + easeOutBack(clamp(t / 0.42, 0, 1)) * 0.42 * caption.impact;
      const driftY = Math.sin(t * Math.PI) * height * 0.02 - t * height * 0.035;
      const x = width * caption.x;
      const y = height * caption.y + driftY + index * height * 0.035;
      const palette = captionPalette(caption.tone);
      const titleSize = Math.round(clamp(width * 0.072, 34, 86) * caption.impact);
      const subSize = Math.round(clamp(width * 0.017, 11, 18));

      ctx.save();
      ctx.translate(x, y);
      ctx.scale(pop, pop);
      ctx.globalAlpha = alpha;
      ctx.textAlign = "center";
      ctx.textBaseline = "middle";
      ctx.font = `900 ${titleSize}px ui-sans-serif, system-ui, sans-serif`;
      ctx.lineJoin = "round";
      ctx.miterLimit = 2;
      ctx.shadowColor = palette.shadow;
      ctx.shadowBlur = titleSize * 0.22;
      ctx.shadowOffsetY = titleSize * 0.06;
      ctx.strokeStyle = "rgb(5 13 18 / 0.28)";
      ctx.lineWidth = Math.max(3, titleSize * 0.08);
      ctx.strokeText(caption.text, 0, 0);
      ctx.fillStyle = palette.fill;
      ctx.fillText(caption.text, 0, 0);

      const measure = ctx.measureText(caption.text);
      const lineW = Math.min(width * 0.62, measure.width * 0.72);
      ctx.shadowBlur = titleSize * 0.12;
      ctx.strokeStyle = palette.accent;
      ctx.lineWidth = Math.max(2, titleSize * 0.035);
      ctx.beginPath();
      ctx.moveTo(-lineW * 0.5, titleSize * 0.58);
      ctx.lineTo(lineW * 0.5, titleSize * 0.58);
      ctx.stroke();

      if (caption.subtext) {
        ctx.shadowBlur = subSize * 0.45;
        ctx.font = `800 ${subSize}px ui-sans-serif, system-ui, sans-serif`;
        ctx.fillStyle = "rgb(255 255 255 / 0.78)";
        ctx.fillText(caption.subtext, 0, titleSize * 0.86);
      }

      if (caption.celebrate) {
        drawCaptionBurst(titleSize, t, palette);
      }
      ctx.restore();
    });
    ctx.restore();
  }

  function drawCaptionBurst(size, t, palette) {
    const burst = clamp((t - 0.04) / 0.52, 0, 1);
    if (burst <= 0 || burst >= 1) return;
    const alpha = (1 - burst) * 0.65;
    ctx.save();
    ctx.globalAlpha *= alpha;
    ctx.strokeStyle = palette.accent;
    ctx.lineWidth = Math.max(1.5, size * 0.018);
    for (let i = 0; i < 12; i += 1) {
      const a = (Math.PI * 2 * i) / 12;
      const inner = size * (0.82 + burst * 0.52);
      const outer = size * (1.0 + burst * 1.05);
      ctx.beginPath();
      ctx.moveTo(Math.cos(a) * inner, Math.sin(a) * inner);
      ctx.lineTo(Math.cos(a) * outer, Math.sin(a) * outer);
      ctx.stroke();
    }
    ctx.restore();
  }

  function easeOutBack(t) {
    const c1 = 1.70158;
    const c3 = c1 + 1;
    return 1 + c3 * Math.pow(t - 1, 3) + c1 * Math.pow(t - 1, 2);
  }

  function drawWheelOverlay(width, height) {
    if (!wheel.visible) return;
    const compact = width < 640;
    const radius = Math.min(width * (compact ? 0.42 : 0.28), height * (compact ? 0.25 : 0.30), 300);
    const cx = width * 0.5;
    const cy = height * (compact ? 0.51 : 0.53);
    const inner = radius * 0.22;
    const segmentAngle = (Math.PI * 2) / wheelSegments.length;

    ctx.save();
    const veil = ctx.createLinearGradient(0, 0, 0, height);
    veil.addColorStop(0, "rgb(9 35 76 / 0.92)");
    veil.addColorStop(0.42, "rgb(69 83 178 / 0.72)");
    veil.addColorStop(0.78, "rgb(251 104 125 / 0.70)");
    veil.addColorStop(1, "rgb(255 176 89 / 0.62)");
    ctx.fillStyle = veil;
    ctx.fillRect(0, 0, width, height);

    ctx.fillStyle = "rgb(255 255 255 / 0.92)";
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.font = `700 ${Math.max(22, Math.min(36, width * 0.035))}px ui-sans-serif, system-ui, sans-serif`;
    ctx.letterSpacing = "0px";
    ctx.fillText("SPIN THE WHEEL", cx, height * (compact ? 0.19 : 0.21));

    ctx.save();
    ctx.shadowColor = "rgb(20 34 74 / 0.52)";
    ctx.shadowBlur = radius * 0.12;
    ctx.shadowOffsetY = radius * 0.055;
    drawWheelRim(cx, cy, radius);
    ctx.restore();

    for (let i = 0; i < wheelSegments.length; i += 1) {
      const segment = wheelSegments[i];
      const a0 = wheel.rotation + i * segmentAngle - Math.PI / 2;
      const a1 = a0 + segmentAngle;
      const mid = (a0 + a1) * 0.5;
      const grad = ctx.createLinearGradient(
        cx + Math.cos(mid + Math.PI) * radius * 0.25,
        cy + Math.sin(mid + Math.PI) * radius * 0.25,
        cx + Math.cos(mid) * radius,
        cy + Math.sin(mid) * radius
      );
      grad.addColorStop(0, segment.colorA);
      grad.addColorStop(1, segment.colorB);
      ctx.beginPath();
      ctx.moveTo(cx, cy);
      ctx.arc(cx, cy, radius * 0.95, a0, a1);
      ctx.closePath();
      ctx.fillStyle = grad;
      ctx.fill();
      ctx.strokeStyle = "rgb(255 255 255 / 0.18)";
      ctx.lineWidth = 1;
      ctx.stroke();

      const tx = cx + Math.cos(mid) * radius * 0.58;
      const ty = cy + Math.sin(mid) * radius * 0.58;
      ctx.fillStyle = "rgb(255 255 255 / 0.94)";
      ctx.font = `800 ${Math.max(13, radius * 0.08)}px ui-sans-serif, system-ui, sans-serif`;
      ctx.fillText(segment.label, tx, ty - radius * 0.035);
      ctx.font = `700 ${Math.max(10, radius * 0.048)}px ui-sans-serif, system-ui, sans-serif`;
      ctx.fillText(segment.sub, tx, ty + radius * 0.055);
    }

    ctx.save();
    ctx.shadowColor = "rgb(255 248 205 / 0.85)";
    ctx.shadowBlur = radius * 0.055;
    ctx.fillStyle = "rgb(255 255 255 / 0.94)";
    ctx.beginPath();
    ctx.moveTo(cx, cy - radius * 1.03);
    ctx.lineTo(cx - radius * 0.12, cy - radius * 1.18);
    ctx.lineTo(cx + radius * 0.12, cy - radius * 1.18);
    ctx.closePath();
    ctx.fill();
    ctx.restore();

    const hub = ctx.createRadialGradient(cx - inner * 0.25, cy - inner * 0.35, inner * 0.1, cx, cy, inner);
    hub.addColorStop(0, "#284676");
    hub.addColorStop(0.55, "#0d2a55");
    hub.addColorStop(1, "#071b3a");
    ctx.fillStyle = hub;
    ctx.beginPath();
    ctx.arc(cx, cy, inner, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = "rgb(255 255 255 / 0.58)";
    ctx.lineWidth = 3;
    ctx.stroke();

    ctx.fillStyle = "rgb(255 255 255 / 0.96)";
    ctx.font = `800 ${Math.max(16, radius * 0.105)}px ui-sans-serif, system-ui, sans-serif`;
    ctx.fillText(wheel.done ? "WON" : "SPIN", cx, cy);

    const pillW = Math.min(width * 0.44, radius * 1.28);
    const pillH = Math.max(34, radius * 0.15);
    const pillY = cy + radius * 1.16;
    drawRoundedRect(cx - pillW * 0.5, pillY - pillH * 0.5, pillW, pillH, pillH * 0.5);
    ctx.fillStyle = "rgb(255 255 255 / 0.15)";
    ctx.fill();
    ctx.strokeStyle = "rgb(255 255 255 / 0.26)";
    ctx.stroke();
    ctx.fillStyle = "rgb(255 255 255 / 0.94)";
    ctx.font = `800 ${Math.max(13, radius * 0.058)}px ui-sans-serif, system-ui, sans-serif`;
    ctx.fillText(wheel.done ? wheel.resultText : "NEXT HOLE", cx, pillY);

    if (wheel.done) {
      ctx.fillStyle = "rgb(255 255 255 / 0.72)";
      ctx.font = `700 ${Math.max(11, radius * 0.043)}px ui-sans-serif, system-ui, sans-serif`;
      ctx.fillText("TAP TO CONTINUE", cx, Math.min(height - 34, pillY + pillH * 0.95));
    }
    ctx.restore();
  }

  function drawWheelRim(cx, cy, radius) {
    ctx.strokeStyle = "rgb(255 255 255 / 0.34)";
    ctx.lineWidth = Math.max(2, radius * 0.012);
    ctx.beginPath();
    ctx.arc(cx, cy, radius, 0, Math.PI * 2);
    ctx.stroke();
    ctx.strokeStyle = "rgb(255 255 255 / 0.18)";
    ctx.lineWidth = Math.max(4, radius * 0.024);
    ctx.beginPath();
    ctx.arc(cx, cy, radius * 1.04, 0, Math.PI * 2);
    ctx.stroke();
  }

  function drawRoundedRect(x, y, width, height, radius) {
    ctx.beginPath();
    ctx.moveTo(x + radius, y);
    ctx.arcTo(x + width, y, x + width, y + height, radius);
    ctx.arcTo(x + width, y + height, x, y + height, radius);
    ctx.arcTo(x, y + height, x, y, radius);
    ctx.arcTo(x, y, x + width, y, radius);
    ctx.closePath();
  }

  function tick(now) {
    const dt = Math.min(0.05, (now - lastTime) / 1000);
    lastTime = now;
    accumulator += dt;
    if (pointer) {
      strikeClock += dt;
      predictGuide();
    }
    while (accumulator >= FIXED_DT) {
      update(FIXED_DT);
      accumulator -= FIXED_DT;
    }
    draw(now / 1000);
    requestAnimationFrame(tick);
  }

  function pointerPosition(event) {
    const rect = canvas.getBoundingClientRect();
    const touch = event.touches ? event.touches[0] : event;
    return {
      x: touch.clientX - rect.left,
      y: touch.clientY - rect.top
    };
  }

  function beginAim(event) {
    if (wheel.visible) {
      if (wheel.done) setHole(currentHoleIndex + 1);
      event.preventDefault();
      return;
    }
    if (!world.ball.asleep || world.holed) return;
    const pos = pointerPosition(event);
    const ball = worldToScreen(world.ball.x, world.ball.y);
    const hitRadius = Math.max(42, BALL.radius * view.scale * 2.4);
    if (Math.hypot(pos.x - ball.x, pos.y - ball.y) > hitRadius) return;
    pointer = {
      id: event.pointerId,
      startX: ball.x,
      startY: ball.y,
      x: pos.x,
      y: pos.y
    };
    canvas.setPointerCapture?.(event.pointerId);
    event.preventDefault();
  }

  function moveAim(event) {
    if (!pointer) return;
    const pos = pointerPosition(event);
    pointer.x = pos.x;
    pointer.y = pos.y;
    event.preventDefault();
  }

  function endAim(event) {
    if (!pointer) return;
    shotPreview = computeLaunchFromDrag({ useStrike: false });
    const didPull = shotPreview && shotPreview.power > 0.035;
    if (didPull) launchFromPointer();
    else {
      pointer = null;
      shotPreview = null;
    }
    event.preventDefault();
  }

  canvas.addEventListener("pointerdown", beginAim);
  canvas.addEventListener("pointermove", moveAim);
  canvas.addEventListener("pointerup", endAim);
  canvas.addEventListener("pointercancel", endAim);

  window.addEventListener("resize", () => {
    resizeQueued = true;
  });

  window.addEventListener("keydown", (event) => {
    if (event.key.toLowerCase() === "r") {
      setHole(currentHoleIndex);
    }
    if ((event.key === "Enter" || event.key === " ") && wheel.visible && wheel.done) {
      setHole(currentHoleIndex + 1);
    }
  });

  aspectButtons.forEach((button) => {
    button.addEventListener("click", () => {
      aspectButtons.forEach((b) => b.classList.remove("active"));
      button.classList.add("active");
      document.body.classList.remove("phone", "four-five", "desktop");
      if (button.dataset.aspect !== "auto") {
        document.body.classList.add(button.dataset.aspect);
      }
      resizeQueued = true;
    });
  });

  holePrevButton?.addEventListener("click", () => {
    setHole(currentHoleIndex - 1);
  });

  holeNextButton?.addEventListener("click", () => {
    setHole(currentHoleIndex + 1);
  });

  resize();
  syncHoleUi();
  requestAnimationFrame(tick);
})();
