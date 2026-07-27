# Kira Agent Platform (KiraAP)

> Nền tảng mã nguồn mở quản lý và tích hợp toàn diện các dịch vụ AI thế hệ mới (Trò chuyện, Tạo ảnh, Tạo video, Chuyển văn bản thành giọng nói TTS) trực tiếp từ Google Agent Flatform / Vertex AI.

![Node.js](https://img.shields.io/badge/Node.js-v18%2B-brightgreen?logo=node.js)
![Express](https://img.shields.io/badge/Express-v4.18-blue?logo=express)
![MongoDB](https://img.shields.io/badge/MongoDB-v6%2B-green?logo=mongodb)
![Google AI](https://img.shields.io/badge/Google-Agent%20Flatform-orange?logo=google)
![License](https://img.shields.io/badge/License-MIT-yellow.svg)

---

## Demo giao diện

### 💬 Trò chuyện AI (AI Chat)

![Trò chuyện AI](docs/screenshots/chat.jpg)

### 🎨 Tạo hình ảnh AI (Image Generation)

![Tạo hình ảnh AI](docs/screenshots/image-gen.jpg)

### 📊 Trang quản trị - Tổng quan (Admin Dashboard)

![Admin Dashboard](docs/screenshots/admin-dashboard.jpg)

### ⚙️ Quản lý mô hình AI (AI Models Management)

![Quản lý mô hình AI](docs/screenshots/admin-models.jpg)

---

## Giới thiệu tổng quan

**Kira Agent Platform (KiraAP)** là giải pháp Web Application mạnh mẽ, giúp cá nhân và doanh nghiệp dễ dàng triển khai hệ sinh thái AI riêng cho người dùng end-user mà không cần phụ thuộc vào dịch vụ bên thứ ba. Dự án tích hợp các mô hình AI tiên tiến nhất của Google như **Gemini 3.6 Flash**, **Gemini 3.1 Pro**, **Gemini 3.1 Flash Image**, **Google Veo 3.1 Lite (Video)** và **Gemini 3.1 Flash TTS (Giọng nói)**.

Nền tảng hỗ trợ xoay vòng API Key thông minh (API Key Load Balancing & Auto Fallback), quản lý người dùng, hạn mức sử dụng (Quota / Rate Limit), cùng trang Admin Panel trực quan.

---

## Tính năng nổi bật

### 1. Trò chuyện AI đa mô hình (AI Chat System)
- Hỗ trợ các model hàng đầu: **Gemini 3.6 Flash**, **Gemini 3.5 Flash**, **Gemini 3.1 Pro**, **Gemini 3 Flash Preview**...
- Quản lý cuộc hội thoại, lưu vết tin nhắn, sao chép mã nguồn dạng Markdown.
- Tự động đếm và quản lý số lượng Token sử dụng.

### 2. Tạo ảnh nghệ thuật AI (Image Generation)
- Hỗ trợ các mô hình tạo ảnh thế hệ mới: **Gemini 3.1 Flash Image**, **Gemini 3.1 Flash Lite Image**, **Gemini 3 Pro Image**...
- Tự chọn tỷ lệ khung hình (`1:1`, `16:9`, `9:16`, `4:3`, `3:4`).
- Bộ sưu tập ảnh cá nhân, hỗ trợ xem ảnh chất lượng cao và tải về máy.

### 3. Tạo và chỉnh sửa video AI (Video Generation)
- Tích hợp các model video hiện đại: **Veo 3.1 Lite**, **Veo 3.0**, **Veo 2.0** và **Gemini Omni Flash Preview**.
- Hỗ trợ tạo video từ văn bản (Text-to-Video) và tạo video từ ảnh tham chiếu (Image-to-Video).
- Hỗ trợ **Video Edit** (Chỉnh sửa video) độc quyền cho model `Gemini Omni Flash Preview`.
- Lựa chọn linh hoạt tỷ lệ khung hình và thời lượng video (4s, 5s, 6s, 8s).

### 4. Chuyển văn bản thành giọng nói (Text-to-Speech - TTS)
- Tích hợp model mới nhất **Gemini 3.1 Flash TTS**.
- Cung cấp **11 giọng đọc chất lượng cao** (chia rõ giọng Nam / Nữ, vùng miền Bắc / Nam).
- Nghe thử giọng mẫu trước khi khởi tạo.
- Hỗ trợ tải tệp âm thanh định dạng WAV chuẩn 24kHz.

### 5. Quản trị hệ thống (Admin Panel)
- **Quản lý kho API Key**: Thêm bớt API Key, cấu hình Project Number Google Cloud. Hệ thống tự động chuyển sang API Key dự phòng nếu gặp lỗi hoặc hết quota.
- **Quản lý người dùng**: Cấu hình quyền truy cập (Admin / User), theo dõi mức độ sử dụng.
- **Quản lý mô hình**: Bật/tắt mô hình, thiết lập mô hình mặc định cho từng danh mục.
- **Nhật ký AI & Thống kê**: Theo dõi chi tiết lưu lượng sử dụng API thực tế.

---

## Công nghệ sử dụng

| Thành phần | Công nghệ |
|---|---|
| Backend | Node.js, Express.js |
| Database | MongoDB (Mongoose ORM) |
| Authentication | JWT, bcryptjs |
| Frontend | HTML5, Vanilla CSS3 (Dark Mode, Responsive), JavaScript ES6+ |
| Template Engine | EJS |
| AI Infrastructure | REST / Interactions HTTP APIs - Google Agent Flatform & Vertex AI |

---

## Cấu trúc thư mục dự án

```text
KiraAP/
├── server/
│   ├── config/          # Cấu hình MongoDB
│   ├── middleware/      # Middleware xác thực (auth), phân quyền và rate limit
│   ├── models/          # Schema MongoDB (User, ApiKey, ModelConfig, Media, Message...)
│   ├── routes/          # Các tuyến đường API và View (Admin, User, AI APIs)
│   ├── services/        # Dịch vụ gọi API Google Agent Flatform, Token Counter, Key Manager
│   ├── views/           # Giao diện EJS (User Dashboard, Admin Panel, Media Gen...)
│   ├── app.js           # Server chính Express.js
│   └── seed.js          # Script nạp dữ liệu ban đầu (Admin, Models, Sample Voices)
├── public/
│   ├── assets/          # Logo, icon, các file audio sample nghe thử giọng đọc
│   ├── css/             # Stylesheet (CSS Variables, Base, Components, Sidebar...)
│   ├── js/              # Logic frontend (App, Auth, Chat, ImageGen, VideoGen, TTS...)
│   └── uploads/         # Thư mục lưu trữ media phát sinh (Images, Videos, Audios)
├── docs/
│   └── screenshots/     # Ảnh demo giao diện
├── .env.example         # Template cấu hình biến môi trường
├── package.json         # Danh sách thư viện và script npm
├── README.md            # Hướng dẫn dự án
└── LICENSE              # Giấy phép mã nguồn mở MIT
```

---

## Hướng dẫn cài đặt và khởi chạy

### 1. Yêu cầu hệ thống
- **Node.js**: Phiên bản `v18.0.0` trở lên.
- **MongoDB**: Đã cài đặt MongoDB Community Server chạy tại cổng mặc định `27017` hoặc kết nối MongoDB Atlas.

### 2. Tải mã nguồn về máy
```bash
git clone https://github.com/HuyKira/KiraAP.git
cd KiraAP
```

### 3. Cài đặt các thư viện phụ thuộc
```bash
npm install
```

### 4. Cấu hình biến môi trường
Tạo file `.env` từ file mẫu `.env.example`:
```bash
cp .env.example .env
```

Mở file `.env` và chỉnh sửa các tham số tương ứng:
```env
PORT=3001
NODE_ENV=development

MONGODB_URI=mongodb://localhost:27017/kiraapDB
JWT_SECRET=thay_doi_chuoi_bao_mat_jwt_tai_day
JWT_EXPIRES_IN=7d

ADMIN_EMAIL=admin@kiraap.com
ADMIN_PASSWORD=Admin@123
ADMIN_USERNAME=admin
```

### 5. Nạp dữ liệu khởi tạo (Seed Database)
Chạy lệnh seed để tạo tài khoản Admin mặc định và khởi tạo danh mục các mô hình AI:
```bash
npm run seed
```

### 6. Khởi chạy ứng dụng
Chế độ phát triển (Development mode với nodemon):
```bash
npm run dev
```

Hoặc chế độ chạy chính thức (Production mode):
```bash
npm start
```

Sau khi khởi chạy thành công:
- **Giao diện Người dùng**: [http://localhost:3001](http://localhost:3001)
- **Trang Quản trị Admin**: [http://localhost:3001/admin](http://localhost:3001/admin)
  - **Tài khoản mặc định**: `admin@kiraap.com`
  - **Mật khẩu mặc định**: `Admin@123`

---

## Hướng dẫn cấu hình API Key Google Agent Flatform

Đăng nhập vào trang Quản trị Admin ([http://localhost:3001/admin/api-keys](http://localhost:3001/admin/api-keys)) để cập nhật API Key:

1. **Khóa API (API Key)**: Lấy khóa API Google Gemini / Vertex AI từ Google Cloud Console hoặc Google AI Studio.
2. **Số dự án (Project Number)**: Lấy số ID định danh dự án Google Cloud (Project Number dạng chuỗi số, ví dụ `95796309409`) từ Google Cloud Console. Trường này là bắt buộc để sử dụng các mô hình Video Veo và Gemini Omni.
3. **Hướng dẫn chi tiết lấy API Key**: Xem chi tiết tại bài viết [Hướng dẫn sử dụng $300 API Gemini miễn phí qua Agent Platform của Google](https://kiraai.vn/tin-tuc/su-dung-300-usd-api-gemini-mien-phi-qua-agent-platform-cua-google/).

---

## Hướng dẫn đóng góp (Contributing)

Dự án **Kira Agent Platform** hoan nghênh mọi sự đóng góp từ cộng đồng! Bạn có thể tham gia phát triển dự án theo các bước sau:

1. Fork kho lưu trữ này về tài khoản GitHub của bạn.
2. Tạo một nhánh (branch) tính năng mới:
   ```bash
   git checkout -b feature/tinh-nang-moi
   ```
3. Commit các thay đổi của bạn:
   ```bash
   git commit -m "Thêm tính năng tuyệt vời mới"
   ```
4. Push nhánh của bạn lên GitHub:
   ```bash
   git push origin feature/tinh-nang-moi
   ```
5. Mở một **Pull Request (PR)** trên kho lưu trữ chính và mô tả chi tiết các thay đổi.

---

## Giấy phép (License)

Dự án được phân phối theo giấy phép mã nguồn mở **MIT License**. Chi tiết xem tại file [LICENSE](LICENSE).

---

<p align="center">
  Được phát triển với ❤️ bởi <a href="https://github.com/HuyKira"><b>Huy Kira</b></a> và cộng đồng mã nguồn mở.
</p>
