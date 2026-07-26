# Quy tắc frontend

## Không dùng dialog native của trình duyệt

**KHÔNG BAO GIỜ** sử dụng các hàm dialog native của JavaScript:
- ❌ `alert()` — Dùng popup/toast tự code
- ❌ `confirm()` — Dùng modal confirm tự code (trả về Promise)
- ❌ `prompt()` — Dùng modal input tự code (trả về Promise)

Tất cả thông báo, xác nhận, và nhập liệu phải dùng **popup/modal tự thiết kế** phù hợp với design system của dự án.
