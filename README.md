# DriveGuard AI – Hệ thống phát hiện & cảnh báo tài xế buồn ngủ theo thời gian thực

Hệ thống AI nhận diện trạng thái mệt mỏi, ngủ gật và mất tập trung của tài xế xe hơi theo thời gian thực trực tiếp trên trình duyệt bằng mô hình MediaPipe Face Mesh 478 điểm kết hợp Iris Tracking (theo dõi con ngươi nhãn cầu) và thuật toán phân tích đa tín hiệu 3 tầng (EAR, MAR, Head Pose Pitch/Yaw/Roll).

---

## Tính năng nổi bật
- **Báo động tức thì cấp độ cao (Level 5)**: Phản ứng cực nhanh với độ trễ 0ms ngay khi phát hiện nhắm mắt (>0.18s), gục đầu hoặc mất tập trung.
- **Tương thích hoàn hảo Mobile**:
  - Hỗ trợ **Screen Wake Lock API** (tự động giữ màn hình điện thoại luôn sáng khi lái xe, không bị tắt/dim).
  - Tích hợp **Web Vibration API** (rung phản hồi xúc giác mạnh khi có cảnh báo khẩn cấp).
  - Giao diện cảm ứng tối ưu hóa theo chuẩn Responsive cho mọi điện thoại (iOS Safari, Android Chrome).
  - PWA Ready (cài đặt trực tiếp lên màn hình chính điện thoại như App Native).
- **Âm thanh giọng nói tiếng Việt chuẩn Studio**: Tích hợp sẵn dữ liệu Base64 không lo lỗi 404 mạng.
- **Phân tích hành trình chuyên sâu bằng Google Gemini AI**: Báo cáo xu hướng lái xe an toàn.

---

## Hướng dẫn Triển khai lên Vercel từ GitHub

### Bước 1: Đẩy mã nguồn lên GitHub
```bash
git init
git add .
git commit -m "feat: DriveGuard AI - Driver Drowsiness Detection System"
git branch -M main
git remote add origin https://github.com/<tai-khoan-cua-ban>/<ten-repo>.git
git push -u origin main
```

### Bước 2: Import dự án vào Vercel
1. Truy cập [Vercel Dashboard](https://vercel.com/dashboard) và bấm **Add New... > Project**.
2. Chọn kho lưu trữ GitHub của bạn và bấm **Import**.
3. Cấu hình tự động đã được định nghĩa sẵn trong `vercel.json`:
   - **Framework Preset**: `Vite`
   - **Build Command**: `npm run build`
   - **Output Directory**: `dist`
4. Thêm Biến môi trường (Environment Variables) trong phần **Environment Variables**:
   - `GEMINI_API_KEY`: Điền API Key Gemini của bạn (lấy tại [Google AI Studio](https://aistudio.google.com/)).
5. Bấm **Deploy**. Sau ~1 phút, website sẽ hoạt động hoàn hảo trên tên miền Vercel (kèm HTTPS an toàn để cấp quyền Camera trên Mobile).

---

## Chạy Local Development
```bash
# Cài đặt dependencies
npm install

# Khởi chạy server phát triển
npm run dev
```
Truy cập `http://localhost:3000` trên trình duyệt.
