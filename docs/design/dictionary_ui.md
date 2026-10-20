# Admin · Từ điển — Đặc tả màn hình

> **Rev 1 · 2026-10-19 · Scope:** NOW (tra cứu) · MOCK (sửa) · FUTURE (ảnh hưởng, xóa mềm).
> Nền tảng: [design.md](./design.md) rev 3.
> Yêu cầu sản phẩm: F-ADM-04 (Must), F-DICT-01/03/04, F-DICT-06.
> Đánh giá: [admin_product_review_2026-10-19.md](../../../docs/reviews/admin_product_review_2026-10-19.md) §3.3.

## 1. Mục tiêu

Từ điển gốc (383.100 từ) là nguồn cho tra cứu, ánh xạ nhãn scan và điền sẵn mục từ. Người vận hành cần:

- **tìm** một từ;
- **thấy** từ đó có đủ dữ liệu để thành thẻ tốt không;
- **sửa** khi sai, sau khi biết phạm vi ảnh hưởng.

## 2. Dữ liệu thật

Từ DB clone, 2026-10-19:

| Sự thật | Hệ quả cho màn |
| :--- | :--- |
| Từ điển **Anh–Việt**: 443k định nghĩa `vi`, 51k định nghĩa `en`. Bảng `translations` chủ yếu là ngôn ngữ khác (chỉ 303 bản dịch `vi`) | "Nghĩa tiếng Việt" = bản dịch `vi`, nếu không có thì định nghĩa `vi`. Mỗi định nghĩa có tag ngôn ngữ |
| API đổi mã từ loại thành nhãn (`PosLabel`: N → "Danh từ") | Bảng hiện nhãn tiếng Việt |
| `GET /api/words/suggest` bắt buộc có tiền tố (`LIKE q%`, xếp theo chữ cái) | Duyệt bằng **thanh A–Z** (mặc định "a"), ô tìm thu hẹp theo tiền tố |
| Từ điển không có cấp độ (CEFR) | Cấp độ chỉ có ở mục từ của Chủ đề (`main.level`) |

## 3. Endpoint

| Việc | Endpoint | Scope |
| :--- | :--- | :--- |
| Một trang từ (30 từ) | `GET /api/words/suggest?q=&page=&size=30` | NOW |
| Chi tiết cả trang | `POST /api/words/lookup { words }`, một lần cho cả trang (≤ 100 từ) | NOW |
| Chi tiết một từ | `GET /api/words/lookup?q=` | NOW |
| Sửa từ | Đề xuất `PUT /api/admin/words/{id}`: phát âm, bản dịch vi, định nghĩa (từ loại, ngôn ngữ, ví dụ) | MOCK |
| Xóa mềm, khôi phục | Đề xuất `DELETE /api/admin/words/{id}` (xóa mềm), không làm gãy mục từ đang tham chiếu | FUTURE |
| Mức dùng của từ (số mục từ, số người học đã lưu, nhãn scan ánh xạ) | Đề xuất `GET /api/admin/words/{id}/usage` | FUTURE |
| Hàng "cần chú ý" trên toàn bộ từ điển | Đề xuất truy vấn server theo loại thiếu | FUTURE |

## 4. Bố cục

### 4.1. Danh sách (`/dictionary`)

| Khối | Nội dung |
| :--- | :--- |
| Header | Eyebrow "Learning", tiêu đề "Từ điển"; mô tả nói rõ phần thật và phần mẫu |
| Ghi chú (thông tin, không phải mẫu) | Từ điển Anh–Việt; cách lấy nghĩa Việt |
| Toolbar | Ô tìm tiền tố · làm mới · thanh A–Z |
| Dải số liệu (của **trang hiện tại**, kiêm bộ lọc) | Từ trong trang · Thiếu nghĩa Việt · Thiếu IPA · Thiếu định nghĩa · Thiếu ví dụ · ô bên phải "Khớp 'a': 8.692 từ" (tổng của server) |
| Bảng | Từ · IPA · Từ loại · Nghĩa tiếng Việt · Định nghĩa tiếng Anh (từ xl) · Độ phủ |
| Phân trang | Server, 30 từ/trang, xếp theo chữ cái |

### 4.2. Chi tiết (`/dictionary/{word}`, drawer)

| Chế độ | Nội dung |
| :--- | :--- |
| Xem | Các loại thiếu · Phát âm (IPA + vùng) · Nghĩa tiếng Việt (ghi nguồn khi lấy từ định nghĩa) · Định nghĩa theo từ loại (tag `vi`/`en`, ví dụ) · Quan hệ · Bản dịch ngôn ngữ khác · khung **"Ảnh hưởng khi sửa"** (FUTURE: mô tả sẽ hiện gì) · [Xóa mềm] vô hiệu · [Sửa từ] |
| Sửa (MOCK) | `SampleDataNotice` nêu endpoint đề xuất. Danh sách sửa được: IPA, bản dịch vi, định nghĩa (từ loại, ngôn ngữ, định nghĩa, ví dụ). "Lưu bản sửa (mẫu)" chỉ giữ trong phiên; khi xem lại có banner "Đang xem bản sửa mẫu…" và nút [Bỏ bản sửa] |

## 5. Tiêu chí nghiệm thu

| ID | Tiêu chí | Kiểm bằng |
| :--- | :--- | :--- |
| AC-DIC-01 | Mặc định gọi suggest với `q=a`; một lần lookup hàng loạt cho cả trang; bấm chữ "b" thì gọi `q=b` | `admin-content.dom.test.ts` D1 |
| AC-DIC-02 | Nghĩa Việt lấy từ bản dịch `vi`, nếu không có thì từ định nghĩa `vi`; "Thiếu nghĩa Việt" chỉ khi cả hai đều không có | `admin-content.test.ts` C4, C6 |
| AC-DIC-03 | Bản sửa mẫu không bao giờ hiện như dữ liệu máy chủ (banner, nút bỏ) | Kiểm tay |
| AC-DIC-04 | F5 tại `/dictionary/{word}` mở lại đúng từ | Kiểm tay |
