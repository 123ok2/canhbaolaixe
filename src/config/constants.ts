/**
 * DriveGuard AI Configuration and Constants
 */

export const CONFIG = {
  // Processing FPS limit for MediaPipe inference to optimize performance
  MAX_INFERENCE_FPS: 25,
  
  // Rolling Window Size for smoothing noise and anti-false-positive filtering
  ROLLING_WINDOW_SIZE: 30, // ~1-1.2 seconds of frames
  
  // Default thresholds (before user calibration) - Tuned for real-world webcam accuracy & sensitivity
  DEFAULT_EAR_CLOSED_THRESHOLD: 0.215, // EAR below this is considered eye closed (sensitive & accurate)
  EAR_CALIBRATION_RATIO: 0.68,        // Closed threshold is 68% of open-eye baseline
  MIN_EYE_CLOSE_ALERT_MS: 480,        // Eyes closed >= 480ms counts as a drowsy long eye closure & triggers warning
  SEVERE_EYE_CLOSE_ALERT_MS: 1200,    // Eyes closed >= 1.2s triggers immediate severe DANGER alert
  
  // Yawn Detection Thresholds
  DEFAULT_MAR_YAWN_THRESHOLD: 0.48,   // Mouth Aspect Ratio above this is mouth open for yawning
  MIN_YAWN_DURATION_MS: 1000,         // Mouth open >= 1.0s counts as a genuine yawn
  
  // Head Drop / Pitch / Tilt Detection
  HEAD_DROP_PITCH_THRESHOLD: -10,     // Pitch angle (degrees) down threshold (gục đầu xuống)
  HEAD_TILT_ROLL_THRESHOLD: 17,       // Roll angle (degrees) side tilt threshold (nghiêng đầu)
  HEAD_TURN_YAW_THRESHOLD: 26,        // Yaw angle (degrees) turn threshold (quay mặt đi)
  MIN_HEAD_DROP_DURATION_MS: 350,     // Head down/tilted >= 0.35s triggers head drop event
  
  // Lost Face / Distraction Detection
  FACE_LOST_WARNING_MS: 800,          // No face detected for >= 800ms triggers immediate warning
  FACE_LOST_DANGER_MS: 2000,          // No face detected for >= 2.0s triggers severe danger alert
  
  // Scoring Weights (0 - 100)
  SCORE_DECAY_RATE: 0.88,            // Score naturally decays when alert
  SCORE_EYE_CLOSED_WEIGHT: 45,       // Added per second of eye closure
  SCORE_YAWN_WEIGHT: 25,             // Added per detected yawn
  SCORE_HEAD_DROP_WEIGHT: 35,        // Added per head drop/tilt event
  
  // Score State Boundaries
  SCORE_STATE_TIRED: 28,              // 28+: Early warning state
  SCORE_STATE_WARNING: 55,            // 55+: Nguy cơ buồn ngủ cao
  SCORE_STATE_DANGER: 80,             // 80+: Cực kỳ nguy hiểm
  HYSTERESIS_MARGIN: 5,               // Score must drop 5 points below threshold to downgrade state
  
  // Calibration duration in frames
  CALIBRATION_FRAMES_REQUIRED: 40,    // ~1.5 seconds of looking at camera
  
  // Sensitivity presets mapping (Levels 1 to 5)
  SENSITIVITY_PRESETS: {
    1: {
      level: 1,
      name: 'Rất thấp',
      badge: 'Thư thái (0.65x)',
      description: 'Dung sai lớn nhất, giảm tối đa báo động giả khi đi đường xóc, nói chuyện nhiều.',
      recommendedFor: 'Đường nội đô gồ ghề, lúc nói chuyện, dừng đỗ nhiều',
      minEyeCloseMs: 800,
      minHeadDropMs: 550,
      pitchThreshold: -15,
      faceLostMs: 1400,
      yawnDurationMs: 1600,
      scoreMultiplier: 0.65
    },
    2: {
      level: 2,
      name: 'Thấp',
      badge: 'Êm dịu (0.85x)',
      description: 'Giảm độ nhạy âm thanh, cảnh báo khi mắt nhắm rõ rệt hoặc gục đầu lâu.',
      recommendedFor: 'Lái xe ban ngày đường thông thoáng, tài xế tỉnh táo',
      minEyeCloseMs: 600,
      minHeadDropMs: 420,
      pitchThreshold: -12,
      faceLostMs: 1000,
      yawnDurationMs: 1200,
      scoreMultiplier: 0.85
    },
    3: {
      level: 3,
      name: 'Tiêu chuẩn',
      badge: 'Khuyên dùng (1.0x)',
      description: 'Cân bằng hoàn hảo giữa độ chính xác và tốc độ phản ứng cảnh báo.',
      recommendedFor: 'Tất cả các điều kiện lái xe thông thường (Đô thị & Cao tốc)',
      minEyeCloseMs: 450,
      minHeadDropMs: 300,
      pitchThreshold: -10,
      faceLostMs: 750,
      yawnDurationMs: 900,
      scoreMultiplier: 1.0
    },
    4: {
      level: 4,
      name: 'Nhạy cao',
      badge: 'Cảnh giác (1.45x)',
      description: 'Phát hiện sớm chỉ sau chớp mắt dài hoặc cúi nhẹ đầu. Báo động cực nhanh.',
      recommendedFor: 'Lái xe ban đêm, trời mưa sương mù, cao tốc liên tỉnh đường dài',
      minEyeCloseMs: 280,
      minHeadDropMs: 200,
      pitchThreshold: -7,
      faceLostMs: 450,
      yawnDurationMs: 700,
      scoreMultiplier: 1.45
    },
    5: {
      level: 5,
      name: 'Cực nhạy (Khẩn cấp)',
      badge: 'Tức thì (2.0x)',
      description: 'Báo động tức thì ngay khi mắt nhắm (>0.18s), gục đầu hoặc rời mắt. Phản ứng 0 độ trễ.',
      recommendedFor: 'Tài xế buồn ngủ nặng, chạy đêm mệt mỏi, chống ngủ gật khẩn cấp',
      minEyeCloseMs: 180,
      minHeadDropMs: 130,
      pitchThreshold: -4,
      faceLostMs: 280,
      yawnDurationMs: 450,
      scoreMultiplier: 2.0
    }
  } as Record<number, import('../types').SensitivityConfig>,
  
  // Landmark Indices for EAR / MAR Calculation
  FACEMESH_LEFT_EYE: [
    { p1: 159, p2: 145 }, // vertical 1
    { p1: 158, p2: 153 }, // vertical 2
    { p1: 33,  p2: 133 }  // horizontal
  ],
  FACEMESH_RIGHT_EYE: [
    { p1: 386, p2: 374 }, // vertical 1
    { p1: 387, p2: 373 }, // vertical 2
    { p1: 362, p2: 263 }  // horizontal
  ],
  // Iris Landmarker Indices for 478-point 3D Face Mesh
  FACEMESH_LEFT_IRIS: [468, 469, 470, 471, 472],   // 468 is center of left iris
  FACEMESH_RIGHT_IRIS: [473, 474, 475, 476, 477], // 473 is center of right iris
  FACEMESH_MOUTH: [
    { p1: 13, p2: 14 },   // vertical inner lip
    { p1: 0,  p2: 17 },   // vertical outer lip
    { p1: 61, p2: 291 }   // horizontal lip width (outer corners)
  ],

  // 1€ Filter (One Euro Filter) & Signal Filtering Configuration
  FILTER: {
    ONE_EURO_MIN_CUTOFF: 1.0, // Minimum cutoff freq (Hz) for static jitter suppression
    ONE_EURO_BETA: 0.05,      // Speed coefficient for zero-lag dynamic motion
    ONE_EURO_D_CUTOFF: 1.0,   // Cutoff freq for derivative calculation
    EMA_ALPHA_EAR: 0.40,      // Exponential moving average alpha for EAR
    EMA_ALPHA_MAR: 0.35,      // Exponential moving average alpha for MAR
    EMA_ALPHA_POSE: 0.30      // Exponential moving average alpha for Head Pose
  },

  // Full continuous contour loops for drawing overlays on Canvas
  FACEMESH_LEFT_EYE_CONTOUR: [33, 7, 163, 144, 145, 153, 154, 155, 133, 173, 157, 158, 159, 160, 161, 246],
  FACEMESH_RIGHT_EYE_CONTOUR: [362, 382, 381, 380, 374, 373, 390, 249, 263, 466, 388, 387, 386, 385, 384, 398],
  FACEMESH_LEFT_EYEBROW: [70, 63, 105, 66, 107, 55, 65, 52, 53, 46],
  FACEMESH_RIGHT_EYEBROW: [300, 293, 334, 296, 336, 285, 295, 282, 283, 276],
  FACEMESH_MOUTH_OUTER: [61, 185, 40, 39, 37, 0, 267, 269, 270, 409, 291, 375, 321, 405, 314, 17, 84, 181, 91, 146],
  FACEMESH_MOUTH_INNER: [78, 191, 80, 81, 82, 13, 312, 311, 310, 415, 308, 324, 318, 402, 317, 14, 87, 178, 88, 95],
  FACEMESH_FACE_OVAL: [10, 338, 297, 332, 284, 251, 389, 356, 454, 323, 361, 288, 397, 365, 379, 378, 400, 377, 152, 148, 176, 149, 150, 136, 172, 58, 132, 93, 234, 127, 162, 21, 54, 103, 67, 109],
  FACEMESH_NOSE_BRIDGE: [168, 6, 197, 195, 5, 4, 1],
  FACEMESH_NOSE_TIP_CONTOUR: [98, 97, 2, 326, 327],
  
  // Wireframe Triangulation Connectors for High-Tech Cyber Biometric Mesh
  FACEMESH_CYBER_EDGES: [
    // Forehead to Eyebrows
    [10, 67], [10, 297], [10, 168], [67, 109], [297, 338],
    [109, 10], [338, 10], [109, 67], [338, 297],
    // Eyebrow to Nose bridge
    [107, 168], [336, 168], [66, 107], [296, 336],
    // Eye outer to Temple / Cheek
    [33, 127], [263, 356], [130, 234], [359, 454],
    // Cheeks to Nose
    [116, 4], [345, 4], [123, 1], [352, 1], [213, 2], [433, 2],
    // Mouth corners to Jaw & Chin
    [61, 172], [291, 397], [61, 58], [291, 288], [17, 152], [0, 1],
    // Jaw connectors
    [152, 377], [152, 148], [148, 176], [377, 400]
  ],
  
  // Key points for pose and drawing glowing anchor nodes
  FACEMESH_KEY_FACE: [1, 10, 152, 33, 263, 61, 291, 168, 4, 234, 454],
  
  // MediaPipe FaceLandmarker Model CDN Asset
  MEDIAPIPE_WASMS: 'https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@latest/wasm',
  MEDIAPIPE_MODEL_URL: 'https://storage.googleapis.com/mediapipe-models/face_landmarker/face_landmarker/float16/1/face_landmarker.task'
};
