/**
 * DriveGuard AI Configuration and Constants
 */

export const CONFIG = {
  // Processing FPS limit for MediaPipe inference to optimize performance
  MAX_INFERENCE_FPS: 25,
  
  // Rolling Window Size for smoothing noise and anti-false-positive filtering
  ROLLING_WINDOW_SIZE: 30, // ~1-1.2 seconds of frames
  
  // Default thresholds (before user calibration)
  DEFAULT_EAR_CLOSED_THRESHOLD: 0.18, // EAR below this is considered eye closed (tuned for phone vertical camera)
  EAR_CALIBRATION_RATIO: 0.58,        // Closed threshold is 58% of open-eye baseline
  MIN_EYE_CLOSE_ALERT_MS: 900,        // Eyes closed >= 900ms triggers drowsiness accumulation
  SEVERE_EYE_CLOSE_ALERT_MS: 1800,    // Eyes closed >= 1.8s triggers immediate severe alert
  
  // Yawn Detection Thresholds
  DEFAULT_MAR_YAWN_THRESHOLD: 0.65,   // Mouth Aspect Ratio above this is mouth open (avoids talking/smiling triggers)
  MIN_YAWN_DURATION_MS: 2200,         // Mouth open >= 2.2s counts as a genuine yawn
  
  // Head Drop / Pitch / Tilt Detection
  HEAD_DROP_PITCH_THRESHOLD: -18,     // Pitch angle (degrees) down threshold (tăng từ -10 lên -18 độ tránh góc nhìn từ dưới lên của điện thoại)
  HEAD_TILT_ROLL_THRESHOLD: 24,       // Roll angle (degrees) side tilt threshold
  HEAD_TURN_YAW_THRESHOLD: 32,        // Yaw angle (degrees) turn threshold
  MIN_HEAD_DROP_DURATION_MS: 700,     // Head down/tilted >= 0.70s counts as head drop event (tăng từ 0.3s)
  
  // Scoring Weights (0 - 100)
  SCORE_DECAY_RATE: 0.90,            // Score naturally decays faster when alert
  SCORE_EYE_CLOSED_WEIGHT: 30,       // Added per second of eye closure
  SCORE_YAWN_WEIGHT: 20,             // Added per detected yawn
  SCORE_HEAD_DROP_WEIGHT: 25,        // Added per head drop/tilt event
  
  // Score State Boundaries
  SCORE_STATE_TIRED: 30,              // 30+: Early warning state (tăng từ 20 để tránh báo ảo)
  SCORE_STATE_WARNING: 60,            // 60+: Nguy cơ buồn ngủ cao
  SCORE_STATE_DANGER: 82,             // 82+: Cực kỳ nguy hiểm
  HYSTERESIS_MARGIN: 6,               // Score must drop 6 points below threshold to downgrade state
  
  // Calibration duration in frames
  CALIBRATION_FRAMES_REQUIRED: 45,    // ~1.5 to 2 seconds of looking at camera
  
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
  FACEMESH_MOUTH: [
    { p1: 13, p2: 14 },   // vertical inner lip
    { p1: 0,  p2: 17 },   // vertical outer lip
    { p1: 61, p2: 291 }   // horizontal lip width (outer corners)
  ],

  // Full continuous contour loops for drawing overlays on Canvas
  FACEMESH_LEFT_EYE_CONTOUR: [33, 7, 163, 144, 145, 153, 154, 155, 133, 173, 157, 158, 159, 160, 161, 246],
  FACEMESH_RIGHT_EYE_CONTOUR: [362, 382, 381, 380, 374, 373, 390, 249, 263, 466, 388, 387, 386, 385, 384, 398],
  FACEMESH_MOUTH_OUTER: [61, 185, 40, 39, 37, 0, 267, 269, 270, 409, 291, 375, 321, 405, 314, 17, 84, 181, 91, 146],
  FACEMESH_MOUTH_INNER: [78, 191, 80, 81, 82, 13, 312, 311, 310, 415, 308, 324, 318, 402, 317, 14, 87, 178, 88, 95],
  FACEMESH_FACE_OVAL: [10, 338, 297, 332, 284, 251, 389, 356, 454, 323, 361, 288, 397, 365, 379, 378, 400, 377, 152, 148, 176, 149, 150, 136, 172, 58, 132, 93, 234, 127, 162, 21, 54, 103, 67, 109],
  FACEMESH_NOSE_BRIDGE: [168, 6, 197, 195, 5, 4],
  
  // Key points for pose and drawing anchor dots
  FACEMESH_KEY_FACE: [1, 152, 33, 263, 61, 291, 10, 152],
  
  // MediaPipe FaceLandmarker Model CDN Asset
  MEDIAPIPE_WASMS: 'https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@latest/wasm',
  MEDIAPIPE_MODEL_URL: 'https://storage.googleapis.com/mediapipe-models/face_landmarker/face_landmarker/float16/1/face_landmarker.task'
};
