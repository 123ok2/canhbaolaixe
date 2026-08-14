# DriveGuard AI – Hệ Thống Phát Hiện & Cảnh Báo Tài Xế Buồn Ngủ Realtime

**DriveGuard AI** là ứng dụng web hoàn chỉnh hỗ trợ phát hiện sớm dấu hiệu mệt mỏi và buồn ngủ của tài xế thông qua camera trước của thiết bị theo thời gian thực.

![DriveGuard AI Banner](https://img.shields.io/badge/Status-Live-emerald?style=for-the-badge) ![Tech](https://img.shields.io/badge/Tech-React_19_%7C_TypeScript_%7C_MediaPipe_%7C_Gemini_AI-cyan?style=for-the-badge)

---

## 🌟 Tính Năng Nổi Bật

1. **Xử Lý Camera Local 100% (Privacy-First)**:
   - Dữ liệu video từ camera được phân tích hoàn toàn trên thiết bị của người dùng thông qua MediaPipe Vision Task.
   - Tuyệt đối không gửi luồng video/hình ảnh khuôn mặt lên server.

2. **Thuật Toán Phân Tích Sinh Trắc Học Realtime**:
   - **EAR (Eye Aspect Ratio)**: Theo dõi độ mở mắt trái/phải với cơ chế tự động cân chỉnh ngưỡng theo khuôn mặt người dùng (Dynamic Calibration).
   - **MAR (Mouth Aspect Ratio)**: Phân tích khoảng cách môi & tỷ lệ mở miệng để nhận diện ngáp thật.
   - **Head Pose Estimation**: Theo dõi góc cúi/gục đầu (Pitch), xoay (Yaw), và nghiêng (Roll).

3. **Bộ Lọc Anti-False-Positive & Dynamic Drowsiness Score (0 - 100)**:
   - Rolling Window (30-60 frames) tính trung bình xu hướng.
   - Hysteresis chống chập chờn trạng thái.
   - Mức độ cảnh báo phân cấp rõ ràng:
     - 🟢 **0–30: Tỉnh táo**
     - 🟡 **31–60: Có dấu hiệu mệt mỏi**
     - 🟠 **61–80: Nguy cơ buồn ngủ cao**
     - 🔴 **81–100: Nguy hiểm**

4. **Hệ Thống Cảnh Báo Âm Thanh Web Audio API 3 Cấp Độ**:
   - Cấp 1 (Nhẹ): Bíp âm đôi dịu nhẹ.
   - Cấp 2 (Trung bình): Âm thanh cảnh báo rõ ràng.
   - Cấp 3 (Nguy hiểm): Còi báo động khẩn cấp.
   - Nút **"TÔI ĐÃ TỈNH"**: Chuyển hệ thống sang **Chế độ Theo dõi Tăng cường**.

5. **Báo Cáo Phân Tích Thông Minh Bằng Gemini 3.7 Flash AI**:
   - Gửi báo cáo thống kê định dạng JSON tới server backend `/api/analyze-drowsiness`.
   - Nhận đánh giá mức độ nguy cơ, nhận xét xu hướng và khuyến nghị an toàn giao thông từ Gemini AI.

6. **Chế Độ Giả Lập (DEMO Mode)**:
   - Cho phép mô phỏng mắt nhắm, ngáp, gục đầu, nguy hiểm cao để trình diễn hệ thống mà không cần tài xế buồn ngủ thật.

7. **PWA Ready**:
   - Cài đặt như app di động native, hỗ trợ fullscreen responsive trên cả Mobile & Desktop.

---

## 🛠 Kiến Trúc Project

```
src/
├── components/
│   ├── Header.tsx text             # Thanh tiêu đề, badge trạng thái & phím điều khiển
│   ├── PrivacyHeader.tsx           # Banner bảo mật & miễn trừ trách nhiệm
│   ├── CameraFeed.tsx              # Frame video camera & overlay landmark canvas
│   ├── DrowsinessGauge.tsx         # Đồng hồ Gauge điểm mệt mỏi (0-100)
│   ├── DashboardStats.tsx          # Bảng thông số hành trình & biểu đồ Recharts realtime
│   ├── AlertModal.tsx              # Modal cảnh báo khẩn cấp + Nút "TÔI ĐÃ TỈNH"
│   ├── DemoControlPanel.tsx        # Bảng điều khiển giả lập DEMO
│   ├── GeminiAnalysisModal.tsx     # Báo cáo tổng hợp Gemini AI
│   └── CameraPermissionModal.tsx   # Modal yêu cầu & hướng dẫn bật camera
├── config/
│   └── constants.ts                # Cấu hình ngưỡng EAR/MAR, landmark, weights
├── engine/
│   ├── DrowsinessEngine.ts         # Master engine tính toán score, rolling window, hysteresis
│   ├── EyeAnalysis.ts              # Thuật toán EAR & nhắm mắt lâu
│   ├── YawnDetection.ts            # Thuật toán MAR & nhận diện ngáp
│   ├── HeadPoseDetection.ts        # Thuật toán Pitch/Yaw/Roll & gục đầu
│   └── SessionManager.ts           # Quản lý thời gian lái & thống kê hành trình
├── hooks/
│   ├── useAudioAlerts.ts           # Web Audio API tổng hợp âm thanh cảnh báo
│   └── useCamera.ts                # Quản lý stream camera & quyền truy cập
├── services/
│   ├── FaceLandmarkService.ts      # MediaPipe FaceLandmarker loader & inference
│   └── GeminiService.ts            # Client API caller cho backend Gemini
└── types/
    └── index.ts                    # Định nghĩa TypeScript interfaces
```

---

## 🚀 Hướng Dẫn Chạy Local

### 1. Khai báo biến môi trường `.env`
Tạo file `.env` tại thư mục gốc (tham khảo `.env.example`):
```env
GEMINI_API_KEY="your_gemini_api_key_here"
```

### 2. Cài đặt dependencies
```bash
npm install
```

### 3. Khởi chạy ở chế độ Development
```bash
npm run dev
```
Ứng dụng sẽ chạy tại địa chỉ: `http://localhost:3000`

---

## 📦 Build & Deploy (Vercel / Cloud Run / GitHub)

### Build sản phẩm production
```bash
npm run build
```
Lệnh này sẽ build giao diện React bằng Vite, đồng thời bundle `server.ts` thành `dist/server.cjs` sẵn sàng cho Node.js server.

### Chạy server Production
```bash
npm start
```

### Deploy Vercel
1. Push project lên GitHub repository.
2. Kết nối dự án trên Vercel Dashboard.
3. Cấu hình Environment Variable trên Vercel:
   - `GEMINI_API_KEY` = `<your_api_key>`
4. Build Command: `npm run build`
5. Output Directory: `dist`

---

## ⚠️ Tuyên Bố Miễn Trừ Trách Nhiệm (Disclaimer)

DriveGuard AI là hệ thống phần mềm hỗ trợ cảnh báo sớm. Đây KHÔNG phải là thiết bị y tế hay hệ thống tự lái tự động. Tài xế phải luôn duy trì sự tập trung tối đa và hoàn toàn chịu trách nhiệm khi vận hành phương tiện giao thông.
