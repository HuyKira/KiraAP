# KiraAP – Nền tảng AI tích hợp Agent Platform API

Xây dựng một web application fullstack sử dụng **Node.js (Express) + MongoDB + EJS** cho phần backend/admin, và **Vanilla JS SPA** cho giao diện người dùng kiểu ChatGPT. Tích hợp đầy đủ 4 loại AI của Google Agent Platform: **Chat (Text), Tạo ảnh, Tạo video, TTS (Giọng nói)**.

## Các quyết định đã xác nhận

| Hạng mục | Quyết định |
|---|---|
| Xác thực | JWT (token-based) |
| Lưu media | File `/public/uploads/`, DB lưu metadata đầy đủ |
| Ngôn ngữ | Tiếng Việt |
| Deploy | Local → sau này cloud server riêng |
| Font chữ | **Be Vietnam Pro** (Google Fonts) |
| Màu chủ đạo | **Nâu cafe + Cam** |
| User UI | **Light mode** (nền kem/trắng ấm) |
| Admin UI | **Dark mode** (nền nâu tối) |
| Layout | **Full chiều dài** (100vh) cả admin và user |
| Đính kèm file | Tất cả các phần AI đều hỗ trợ upload file |

---

## Design System – Mô tả chi tiết

### Phong cách tổng thể
**Warm & Elegant** — Giao diện ấm áp, hiện đại với tone nâu cafe và cam làm chủ đạo. User dùng light mode sáng sủa tạo cảm giác thân thiện, Admin dùng dark mode chuyên nghiệp. Cả hai đều full viewport height (100vh), không cuộn trang chính.

### Color palette

#### User (Light mode)

| Token | Giá trị | Mục đích |
|---|---|---|
| `--bg-primary` | `#FEFCF9` | Nền chính (off-white ấm) |
| `--bg-secondary` | `#FAF6F1` | Nền sidebar (cream) |
| `--bg-tertiary` | `#F5EDE4` | Nền input, hover states |
| `--surface-card` | `#FFFFFF` | Card, message AI |
| `--border-light` | `#E8DDD0` | Viền nhẹ |
| `--border-medium` | `#D4C4B0` | Viền input focus |
| `--accent-primary` | `#E8740C` | Cam chính (nút, active) |
| `--accent-secondary` | `#D4590B` | Cam đậm (hover) |
| `--accent-gradient` | `#E8740C → #F5A623` | Gradient cam (buttons) |
| `--brown-dark` | `#4A2C2A` | Text chính (nâu cafe đậm) |
| `--brown-medium` | `#6B4226` | Text phụ (nâu) |
| `--brown-light` | `#8B6914` | Text mờ |
| `--user-bubble` | `#E8740C → #F5A623` | Bubble message user (gradient cam) |
| `--ai-bubble` | `#FFFFFF` | Bubble message AI (trắng, viền nâu nhẹ) |
| `--success` | `#16A34A` | Thành công |
| `--warning` | `#D97706` | Cảnh báo |
| `--error` | `#DC2626` | Lỗi |

#### Admin (Dark mode)

| Token | Giá trị | Mục đích |
|---|---|---|
| `--admin-bg-primary` | `#0F0A07` | Nền chính (nâu rất tối) |
| `--admin-bg-secondary` | `#1A110D` | Nền sidebar |
| `--admin-bg-tertiary` | `#2A1A12` | Nền cards |
| `--admin-surface` | `rgba(232,116,12,0.08)` | Surface card warm |
| `--admin-border` | `rgba(232,116,12,0.15)` | Viền warm glow |
| `--admin-accent` | `#E8740C` | Cam chính |
| `--admin-accent-glow` | `#F5A623` | Cam sáng (hover, glow) |
| `--admin-text` | `#F0E6D8` | Text sáng ấm |
| `--admin-text-secondary` | `#B8A08C` | Text phụ |

### Typography
- **Font family**: Google Font **Be Vietnam Pro** (400, 500, 600, 700)
- **Code blocks**: **JetBrains Mono** (monospace)
- **Logo "KiraAP"**: Be Vietnam Pro 700, color nâu cafe đậm (user) / trắng ấm (admin)
- **Scale**: 12px / 13px / 14px / 16px (base) / 18px / 20px / 24px / 32px

---

### Thiết kế chi tiết các trang

#### 1. Trang đăng nhập / đăng ký

![Trang đăng nhập](/Users/huykira/.gemini/antigravity-ide/brain/e64aca72-76b2-4445-a7a2-d3d9c84e80a0/login_page_warm_1784700921665.png)

- **Layout split**: Trái = gradient nâu cafe → cam với logo KiraAP lớn + tagline; Phải = form trắng kem
- **Full viewport height** (100vh)
- **Form inputs**: Nền trắng, viền nâu nhẹ, focus border cam
- **Button đăng nhập**: Gradient cam, bo tròn, hover đậm hơn
- **Toggle đăng nhập ↔ đăng ký**: Slide transition mượt

---

#### 2. Giao diện chat (User – Light mode)

![Giao diện chat](/Users/huykira/.gemini/antigravity-ide/brain/e64aca72-76b2-4445-a7a2-d3d9c84e80a0/chat_vertical_menu_1784701298570.png)

**Full height layout (100vh), 2 cột:**

**Sidebar trái (280px):**
- Nền cream `#FAF6F1`
- **Logo "KiraAP"** ở trên cùng (nâu cafe)
- **Nút "Cuộc trò chuyện mới"**: Viền dashed cam, icon "+"
- **4 menu xếp DỌC** (mỗi item là 1 hàng: icon trái + text phải):
  - 💬 Trò chuyện
  - 🖼️ Tạo hình ảnh
  - 🎬 Tạo video
  - 🎤 Tạo giọng nói
  - Menu active: pill cam `#E8740C` + text trắng
  - Menu inactive: icon + text nâu, hover background nhẹ
- **Divider line**
- **Phần "Lịch sử"**: Grouped theo ngày (Hôm nay, Hôm qua...)
  - Mỗi item: title + nút "..." (xoá/đổi tên)
  - Item active: left border cam + background nhạt hơn
- **Footer**: Avatar user + tên

**Main chat area:**
- Nền `#FEFCF9` (off-white ấm)
- **User bubbles**: Gradient cam, text trắng, bo tròn, align phải
- **AI bubbles**: Card trắng, viền nâu nhẹ, align trái
  - Render Markdown (bold, list, heading, code)
  - Code blocks: nền `#2A1A12` (dark) với syntax highlight
- **Typing indicator**: 3 dots nâu bouncing
- **Input bar** (bottom, sticky):
  - Bo tròn, viền nâu nhẹ
  - 📎 **Nút đính kèm file** (paperclip) bên trái — hỗ trợ ảnh, PDF, văn bản
  - Textarea auto-resize ở giữa
  - Nút gửi hình tròn cam bên phải
  - Khi có file đính kèm: hiển thị preview nhỏ phía trên input bar (thumbnail ảnh hoặc icon file + tên)

> [!IMPORTANT]
> **Đính kèm file trong Chat**: Nút 📎 cho phép chọn file (ảnh JPG/PNG/WEBP, PDF, TXT...). File được upload lên server, chuyển thành base64 và gửi kèm trong `inlineData` của API request. Hiển thị preview thumbnail ngay trên input bar trước khi gửi.

---

#### 3. Giao diện tạo ảnh (User – Light mode)

![Giao diện tạo ảnh](/Users/huykira/.gemini/antigravity-ide/brain/e64aca72-76b2-4445-a7a2-d3d9c84e80a0/image_gen_light_1784700911963.png)

- **Textarea prompt**: Nền trắng, viền nâu, placeholder "Mô tả hình ảnh bạn muốn tạo..."
- **Khu vực upload ảnh tham chiếu**: Dashed border nâu, drag & drop + click
  - Label "Tải ảnh tham chiếu (Tuỳ chọn)"
  - Hỗ trợ JPG, PNG, WEBP
  - Preview ảnh đã chọn bên trong vùng upload
- **Tỷ lệ khung hình**: Pill toggle buttons (1:1, 16:9, 9:16, 4:3), active = cam
- **Nút "Tạo ảnh"**: Gradient cam, icon sparkle ✨
- **Grid kết quả**: 3 cột, mỗi ảnh trong card với shadow ấm
  - Hover: overlay với nút tải xuống + xem full
  - Caption: prompt đã dùng + ngày tạo

---

#### 4. Giao diện tạo video (User – Light mode)
- Tương tự trang ảnh nhưng thêm:
  - **Upload ảnh/video tham chiếu** (tuỳ chọn) — gửi kèm prompt
  - Chọn thời lượng (6s, 8s)
  - Chọn aspect ratio
  - **Progress indicator**: Circular progress cam với % khi đang tạo (LRO polling)
  - Video player embed khi hoàn thành
  - Trạng thái visual: ⏳ Đang chờ → 🔄 Đang xử lý → ✅ Hoàn thành

---

#### 5. Giao diện TTS (User – Light mode)
- Textarea nhập văn bản dài
- **Upload file văn bản** (tuỳ chọn) — đọc nội dung file text/PDF và điền vào textarea
- **Voice selector**: Card grid chọn giọng (Puck, Charon, Kore, Fenrir, Aoede)
  - Mỗi giọng: icon/avatar + tên, active = viền cam
- **Nút "Tạo giọng nói"**: Gradient cam
- **Audio player**: Custom waveform player (sóng gradient cam) thay vì player mặc định
- Nút tải về MP3/WAV

---

#### 6. Admin Dashboard (Dark mode)

![Admin Dashboard](/Users/huykira/.gemini/antigravity-ide/brain/e64aca72-76b2-4445-a7a2-d3d9c84e80a0/admin_dashboard_dark_1784700899902.png)

**Full height layout (100vh), sidebar + topbar + content:**

**Admin Sidebar (240px):**
- Nền `#1A110D` (nâu tối)
- Logo KiraAP + icon
- Menu items:
  - 📊 Tổng quan (Dashboard)
  - 🔑 Khoá API
  - 🤖 Mô hình AI
  - 👥 Người dùng
  - 🖼️ Thư viện (Media)
  - 📋 Nhật ký AI
- Active item: Pill gradient cam

**Dashboard Content:**
- **4 Stat cards**: Gradient backgrounds (cam, nâu, amber, burnt sienna)
  - Tổng mô hình, Số lượng API Key, Yêu cầu API, Thời gian hoạt động
- **Biểu đồ line**: API usage theo thời gian (đường cam, Chart.js)
- **Biểu đồ bar ngang**: Top mô hình phổ biến (bars gradient cam-vàng)
- **Real-time activity**: Feed log gần đây

**Admin pages khác:**
- Data tables: Dark theme, row hover nâu nhạt, pagination
- Forms: Input dark, toggle switches cam
- Modal: Dark card + backdrop blur

---

### Tính năng đính kèm file (tất cả các phần)

| Trang | Loại file hỗ trợ | Cách sử dụng |
|---|---|---|
| **Chat** | Ảnh (JPG/PNG/WEBP), PDF, TXT, DOCX | Gửi kèm message, AI phân tích nội dung file |
| **Tạo ảnh** | Ảnh (JPG/PNG/WEBP) | Ảnh tham chiếu cho Image-to-Image |
| **Tạo video** | Ảnh (JPG/PNG/WEBP) | Ảnh tham chiếu / first frame cho video |
| **TTS** | TXT, PDF | Đọc nội dung file text để chuyển thành giọng nói |

**Luồng xử lý file:**
1. User chọn file qua nút 📎 hoặc drag & drop
2. Frontend hiển thị preview (thumbnail ảnh / icon + tên file)
3. Upload file lên server qua `multer` → lưu vào `/public/uploads/temp/`
4. Server đọc file → chuyển thành base64
5. Gửi kèm trong `inlineData` của API request (với `mimeType` tương ứng)
6. Sau khi xử lý xong, xoá file temp

---

### Animations & Micro-interactions

| Element | Animation |
|---|---|
| Page load | Fade-in + slide-up 300ms |
| Sidebar menu hover | Background warm glow + scale 1.02 |
| Button hover | Scale 1.05 + warm shadow |
| Button click | Scale 0.95 (press effect) |
| Chat message appear | Slide-in from bottom + fade |
| Typing indicator | 3 dots bouncing (nâu) |
| Image loading | Skeleton shimmer (gradient cam sweep) |
| Video progress | Circular progress spin (cam) |
| Tab switch | Slide + crossfade |
| Toast notification | Slide-in top-right + auto dismiss |
| Modal open | Scale 0.9→1 + backdrop blur |
| File preview appear | Scale-in + fade |
| Sidebar collapse | Slide left + overlay fade |

### Responsive breakpoints
- **Desktop**: ≥1024px — Full 2-column layout
- **Tablet**: 768px–1023px — Sidebar overlay (toggle)
- **Mobile**: <768px — Sidebar hidden (hamburger), full-width

---

## Proposed changes

### Kiến trúc tổng quan

```
KiraAP/
├── server/
│   ├── config/
│   │   └── database.js
│   ├── models/
│   │   ├── User.js
│   │   ├── ApiKey.js
│   │   ├── ModelConfig.js
│   │   ├── Conversation.js
│   │   ├── Message.js
│   │   ├── Media.js
│   │   └── AILog.js
│   ├── routes/
│   │   ├── auth.js
│   │   ├── admin/
│   │   │   ├── dashboard.js
│   │   │   ├── users.js
│   │   │   ├── apiKeys.js
│   │   │   ├── models.js
│   │   │   ├── media.js
│   │   │   └── logs.js
│   │   └── api/
│   │       ├── chat.js
│   │       ├── image.js
│   │       ├── video.js
│   │       ├── tts.js
│   │       ├── conversations.js
│   │       └── user.js
│   ├── services/
│   │   ├── agentPlatform.js
│   │   ├── apiKeyManager.js
│   │   └── tokenCounter.js
│   ├── middleware/
│   │   ├── auth.js
│   │   ├── adminOnly.js
│   │   └── rateLimiter.js
│   ├── views/                 # EJS (Admin dark mode)
│   │   ├── layouts/
│   │   │   └── admin.ejs
│   │   ├── admin/
│   │   │   ├── dashboard.ejs
│   │   │   ├── api-keys.ejs
│   │   │   ├── models.ejs
│   │   │   ├── users.ejs
│   │   │   ├── media.ejs
│   │   │   └── logs.ejs
│   │   └── auth/
│   │       └── login.ejs
│   └── app.js
├── public/
│   ├── css/
│   │   ├── variables.css      # Design tokens (light + dark)
│   │   ├── base.css           # Reset, typography Be Vietnam Pro
│   │   ├── components.css     # Buttons, modals, toast, file preview
│   │   ├── chat.css           # Chat + file attachment UI
│   │   ├── sidebar.css
│   │   ├── auth.css           # Login split layout
│   │   ├── media-gen.css      # Image/Video/TTS + file upload zones
│   │   └── admin.css          # Admin dark mode styles
│   ├── js/
│   │   ├── app.js
│   │   ├── chat.js            # + file attachment logic
│   │   ├── imageGen.js        # + reference image upload
│   │   ├── videoGen.js        # + reference image upload
│   │   ├── ttsGen.js          # + text file upload
│   │   ├── sidebar.js
│   │   ├── auth.js
│   │   ├── profile.js
│   │   ├── fileUpload.js      # Shared file upload module
│   │   └── utils.js
│   ├── uploads/
│   │   ├── images/
│   │   ├── videos/
│   │   ├── audios/
│   │   └── temp/              # File tạm khi đính kèm
│   ├── assets/
│   └── index.html             # User SPA (light mode)
├── .env
├── package.json
└── README.md
```

---

### Component 1: MongoDB Models

#### [NEW] [User.js](file:///Users/huykira/HUYKIRA/KiraAP/server/models/User.js)
- username, email, password (bcrypt), displayName, avatar (path)
- role: `['admin', 'user']`, isActive, createdAt, updatedAt

#### [NEW] [ApiKey.js](file:///Users/huykira/HUYKIRA/KiraAP/server/models/ApiKey.js)
- name, key (encrypted), projectNumber, isActive, usageCount, lastUsedAt

#### [NEW] [ModelConfig.js](file:///Users/huykira/HUYKIRA/KiraAP/server/models/ModelConfig.js)
- category: `['text','image','video','tts']`, modelId, displayName
- isDefault, isActive, systemPrompt, parameters: `{ temperature, maxTokens, ... }`

#### [NEW] [Conversation.js](file:///Users/huykira/HUYKIRA/KiraAP/server/models/Conversation.js)
- userId, title, category, lastMessageAt, messageCount, createdAt

#### [NEW] [Message.js](file:///Users/huykira/HUYKIRA/KiraAP/server/models/Message.js)
- conversationId, role: `['user','assistant']`, content, mediaUrl, mediaType
- attachments: `[{ fileName, filePath, mimeType, fileSize }]` ← **file đính kèm**
- modelUsed, tokenInput, tokenOutput, createdAt

#### [NEW] [Media.js](file:///Users/huykira/HUYKIRA/KiraAP/server/models/Media.js)
- userId, type: `['image','video','audio']`, filePath, fileName, originalName
- fileSize, mimeType, prompt, modelUsed, width, height, duration, createdAt

#### [NEW] [AILog.js](file:///Users/huykira/HUYKIRA/KiraAP/server/models/AILog.js)
- userId, username, modelUsed, category, prompt (truncated)
- tokenInput, tokenOutput, tokenTotal, apiKeyName
- responseTime (ms), status: `['success','error']`, errorMessage, createdAt

---

### Component 2: Service layer

#### [NEW] [agentPlatform.js](file:///Users/huykira/HUYKIRA/KiraAP/server/services/agentPlatform.js)
- `generateText(prompt, options)` — hỗ trợ stream SSE + file attachments (inlineData)
- `generateImage(prompt, options)` — hỗ trợ refImage (base64)
- `initiateVideo(prompt, options)` — LRO + optional refImage
- `pollVideo(operationName)` — polling
- `generateTTS(text, options)` — voice selection

#### [NEW] [apiKeyManager.js](file:///Users/huykira/HUYKIRA/KiraAP/server/services/apiKeyManager.js)
- Sequential / random rotation, auto-skip 429

#### [NEW] [tokenCounter.js](file:///Users/huykira/HUYKIRA/KiraAP/server/services/tokenCounter.js)
- Estimate input, parse usageMetadata, write AILog

---

### Component 3: Auth & Middleware

#### [NEW] [auth.js (middleware)](file:///Users/huykira/HUYKIRA/KiraAP/server/middleware/auth.js)
- JWT verify + attach `req.user`

#### [NEW] [adminOnly.js](file:///Users/huykira/HUYKIRA/KiraAP/server/middleware/adminOnly.js)
- Check admin role

#### [NEW] [auth.js (routes)](file:///Users/huykira/HUYKIRA/KiraAP/server/routes/auth.js)
- Register, Login (JWT), Get profile, Update profile

---

### Component 4: Admin Panel (EJS – Dark mode)
- Dashboard + Chart.js
- CRUD API Keys + strategy config
- CRUD Models (4 tabs) + system prompt
- CRUD Users + role management
- Media gallery (grid, filter, delete)
- AI Log viewer (table, filter, CSV export)

---

### Component 5: User API Routes
- `POST /api/ai/chat` — stream SSE + **file attachment** (multer)
- `POST /api/ai/image` — tạo ảnh + **ref image** upload
- `POST /api/ai/video` — LRO + **ref image** upload
- `GET /api/ai/video/status/:id` — polling
- `POST /api/ai/tts` — tạo audio + **text file** upload
- CRUD conversations + messages

---

### Component 6: User Frontend (Light mode SPA)

#### [NEW] [fileUpload.js](file:///Users/huykira/HUYKIRA/KiraAP/public/js/fileUpload.js)
Module dùng chung cho tất cả trang:
- `createFileUploader(options)` — tạo UI upload (button hoặc dropzone)
- Hiển thị preview (thumbnail ảnh / icon file + tên + size)
- Nút xoá file đã chọn
- Validate file type + size
- Upload qua `FormData`

#### Các file JS khác — cập nhật thêm file attachment
- `chat.js` — thêm nút 📎, preview file, gửi kèm file
- `imageGen.js` — dropzone ảnh tham chiếu
- `videoGen.js` — dropzone ảnh tham chiếu
- `ttsGen.js` — upload file text, đọc nội dung

---

## Thứ tự triển khai (6 Phases)

### Phase 1: Foundation
1. Khởi tạo project (package.json, npm install)
2. Cấu hình Express + MongoDB + dotenv
3. Tạo tất cả 7 Mongoose Models
4. Middleware JWT auth + adminOnly
5. Routes đăng ký / đăng nhập
6. Seed admin account mặc định

### Phase 2: Service layer
7. `agentPlatform.js` — wrapper gọi API + file handling
8. `apiKeyManager.js` — xoay vòng key
9. `tokenCounter.js` — đếm token & ghi log

### Phase 3: Admin Panel (Dark mode)
10. EJS layout dark + admin routes
11. Dashboard thống kê + Chart.js
12. CRUD API Keys
13. CRUD Models + system prompt
14. CRUD Users
15. Media gallery
16. AI Log viewer

### Phase 4: User API
17. API Chat (stream SSE + file attachment)
18. API Image generation (+ ref image)
19. API Video generation (LRO + ref image)
20. API TTS (+ text file)
21. API Conversations

### Phase 5: User Frontend (Light mode)
22. Design System CSS (light + dark tokens)
23. Auth pages (Login/Register split layout)
24. Layout (Sidebar + Main, 100vh)
25. `fileUpload.js` — shared module
26. Chat interface + stream + file attach
27. Image generation UI + dropzone
28. Video generation UI + progress
29. TTS UI + voice selector
30. History + Profile

### Phase 6: Polish
31. Responsive mobile
32. Micro-animations
33. Error handling + popup/toast system
34. Testing & bug fixes

---

## Dependencies

```json
{
  "dependencies": {
    "express": "^4.21.x",
    "mongoose": "^8.x",
    "bcryptjs": "^2.4.x",
    "jsonwebtoken": "^9.x",
    "dotenv": "^16.x",
    "ejs": "^3.1.x",
    "express-ejs-layouts": "^2.5.x",
    "multer": "^1.4.x",
    "cors": "^2.8.x",
    "helmet": "^8.x",
    "express-rate-limit": "^7.x",
    "morgan": "^1.10.x",
    "uuid": "^11.x"
  },
  "devDependencies": {
    "nodemon": "^3.x"
  }
}
```

---

## Verification plan

### Automated tests
- `npm start` → server chạy, MongoDB connect OK
- Test auth flow: register → login → JWT → protected route
- Test file upload: attach file → gửi chat → AI nhận file

### Manual verification
- Admin (dark): cấu hình key → thêm model → dashboard OK
- User (light): đăng ký → chat + đính kèm ảnh → tạo ảnh + ref image → tạo video → TTS
- Kiểm tra log AI + media lưu đúng path + metadata đầy đủ
- Responsive mobile
- Popup thay alert()
- Full height layout (không scroll body)
