import { GoogleGenAI, Type } from "@google/genai";

export default async function handler(req: any, res: any) {
  // Set CORS headers for Vercel deployment
  res.setHeader("Access-Control-Allow-Credentials", "true");
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "GET,OPTIONS,PATCH,DELETE,POST,PUT");
  res.setHeader(
    "Access-Control-Allow-Headers",
    "X-CSRF-Token, X-Requested-With, Accept, Accept-Version, Content-Length, Content-MD5, Content-Type, Date, X-Api-Version"
  );

  if (req.method === "OPTIONS") {
    return res.status(200).end();
  }

  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method Not Allowed" });
  }

  try {
    const stats = req.body || {};
    const apiKey = process.env.GEMINI_API_KEY;

    if (!apiKey) {
      return res.status(400).json({
        error: "Chưa cấu hình GEMINI_API_KEY trong môi trường/secrets server."
      });
    }

    const ai = new GoogleGenAI({
      apiKey,
      httpOptions: {
        headers: {
          "User-Agent": "aistudio-build",
        },
      },
    });

    const prompt = `Bạn là chuyên gia an toàn giao thông AI của hệ thống DriveGuard AI.
Hãy phân tích dữ liệu thống kê hành trình lái xe thực tế dưới đây của tài xế và đưa ra đánh giá an toàn bằng Tiếng Việt:

Thống kê hành trình:
- Thời gian lái xe: ${stats.driveDuration || 0} giây (${Math.round((stats.driveDuration || 0) / 60)} phút)
- Số lần nhắm mắt kéo dài (>0.8 giây): ${stats.longEyeClosures || 0} lần
- Số lần ngáp: ${stats.yawns || 0} lần
- Số lần gục/nghiêng đầu: ${stats.headDropEvents || 0} lần
- Điểm mệt mỏi trung bình (Drowsiness Score 0-100): ${stats.averageDrowsinessScore || 0}
- Cảnh báo Cấp 1 (Nhẹ): ${stats.alertLevel1Count || 0}
- Cảnh báo Cấp 2 (Trung bình): ${stats.alertLevel2Count || 0}
- Cảnh báo Cấp 3 (Nguy hiểm): ${stats.alertLevel3Count || 0}
- Tổng thời gian ở mức nguy hiểm: ${stats.totalDangerDurationSeconds || 0} giây

Hãy trả về kết quả theo cấu trúc JSON gồm:
1. "riskLevel": một trong các từ ["THẤP", "TRUNG BÌNH", "CAO", "CỰC KỲ NGUY HIỂM"]
2. "summary": Tóm tắt ngắn gọn tình trạng (1-2 câu)
3. "probableCauses": Danh sách các nguyên nhân/biểu hiện nhận diện được (ví dụ: nhắm mắt liên tục, ngáp tần suất cao)
4. "observations": Đánh giá chi tiết xu hướng mệt mỏi
5. "recommendations": Danh sách các lời khuyên an toàn cụ thể (ví dụ: dừng xe nghỉ 15 phút, uống nước, rửa mặt)`;

    const response = await ai.models.generateContent({
      model: "gemini-3.7-flash",
      contents: prompt,
      config: {
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            riskLevel: {
              type: Type.STRING,
              description: "Mức nguy cơ: THẤP, TRUNG BÌNH, CAO, hoặc CỰC KỲ NGUY HIỂM"
            },
            summary: {
              type: Type.STRING,
              description: "Tóm tắt ngắn gọn trạng thái tài xế"
            },
            probableCauses: {
              type: Type.ARRAY,
              items: { type: Type.STRING },
              description: "Các nguyên nhân/dấu hiệu buồn ngủ"
            },
            observations: {
              type: Type.ARRAY,
              items: { type: Type.STRING },
              description: "Quan sát xu hướng hành vi"
            },
            recommendations: {
              type: Type.ARRAY,
              items: { type: Type.STRING },
              description: "Các khuyến nghị an toàn giao thông"
            }
          },
          required: ["riskLevel", "summary", "probableCauses", "observations", "recommendations"]
        }
      }
    });

    const text = response.text || "{}";
    const resultJson = JSON.parse(text);
    return res.status(200).json(resultJson);
  } catch (error: unknown) {
    console.error("Gemini API Error (Vercel Serverless):", error);
    const message = error instanceof Error ? error.message : "Đã xảy ra lỗi khi phân tích dữ liệu AI.";
    return res.status(500).json({ error: message });
  }
}
