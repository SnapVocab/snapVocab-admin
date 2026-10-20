# Admin · Chủ đề — Đặc tả màn hình

> **Rev 1 · 2026-10-19 · Scope: NOW** (API thật), có phần cần API mới.
> Nền tảng: [design.md](./design.md) rev 3.
> Yêu cầu sản phẩm: F-ADM-05, FR-14.05/06 (Must), F-FLASH-04.
> Đánh giá: [admin_product_review_2026-10-19.md](../../../docs/reviews/admin_product_review_2026-10-19.md) §3.4.

## 1. Mục tiêu

Người vận hành dựng và duy trì **nội dung hệ thống** mà người học duyệt, học và lưu: Collection → Chủ đề (2 cấp) → Mục từ (EAV theo schema). Màn phải trả lời:

1. Chủ đề này có gì?
2. Dữ liệu có đủ để thành thẻ tốt không?
3. Thêm hoặc đổi gì thì người học thấy ra sao?

## 2. Endpoint

### 2.1. Đang dùng (API thật, quyền `ROLE_ADMIN` trên endpoint chung)

| Việc | Endpoint |
| :--- | :--- |
| Danh sách collection hệ thống | `GET /api/collections/system` |
| Tạo / đổi tên / xóa collection | `POST /api/collections` (type SYSTEM) · `PUT /api/collections/{id}` · `DELETE /api/collections/{id}` (chỉ khi rỗng, §4.4) |
| Cây chủ đề | `GET /api/collections/{id}/topics?parentId=&page=&size=100` (cây tải lười theo nhánh) |
| Tạo chủ đề | `POST /api/collections/{id}/topics` (dùng schema DEFAULT_ENGLISH và mẫu thẻ mặc định) |
| Mục từ của chủ đề | `GET /api/topics/{id}?page=0&size=500` (nhiều nhất hiện có là 500, trung bình 83) |
| Schema của chủ đề | `GET /api/topics/{id}/schema` |
| Danh sách mẫu thẻ | `GET /api/schemas/{schemaId}` |
| Thêm mục từ | `POST /api/topics/{id}/items`, body đúng hình dạng nhóm: object cho nhóm đơn, mảng cho nhóm lặp |
| Đổi mẫu thẻ | `PUT /api/topics/{id}/active-template/{templateId}` |
| Điền sẵn từ từ điển | `GET /api/words/lookup?q=` |

### 2.2. Còn thiếu (UI hiện nút bị vô hiệu kèm "Cần API…")

| ID | Thiếu | Ghi chú |
| :--- | :--- | :--- |
| TD-ADS-15 | `PUT`/`DELETE /api/topics/{id}`; `PUT`/`DELETE /api/topics/{id}/items/{itemId}` | Service cũng chưa có phương thức |
| TD-ADS-16 | Xóa collection đang là **xóa cứng có cascade** (`CascadeType.ALL`, orphanRemoval) xuống chủ đề và mục từ | Spec yêu cầu xóa mềm. UI chỉ cho xóa collection **rỗng** |
| OQ-ADS-08 | Trường trạng thái Nháp/Phát hành cho Collection/Topic | Badge hiện "Đang hiển thị với người học" là đúng sự thật: mọi chủ đề đều hiện ngay |
| — | Số mục từ của mỗi chủ đề trong cây | Hiện phải mở chủ đề mới biết |

## 3. Phát hiện từ dữ liệu thật (DB clone, 2026-10-19)

| Phát hiện | Con số | Màn xử lý ra sao |
| :--- | :--- | :--- |
| Giải nghĩa lưu ở `main.meaning`, **không có trong schema** DEFAULT_ENGLISH; nhóm `meaning` (thuộc tính bắt buộc) gần như trống | 15.663 / 15.664 mục | Tóm tắt đọc `meaning.meaning`, nếu không có thì đọc `main.meaning`. Ô **"Lệch schema"** kèm ghi chú cần migrate. Inspector hiện thuộc tính "(ngoài schema)" (TD-ADS-17) |
| Từ trùng trong cùng chủ đề | 2.075 cặp (chủ đề, từ) | Ô **"Trùng"** và badge trên dòng. Form thêm mục từ cảnh báo trùng (TD-ADS-18: dọn dữ liệu) |
| Có thuộc tính cấp độ `main.level` (A1–C2) | Mọi mục | Lọc và hiện phân bố cấp độ bằng dữ liệu thật. Từ điển gốc thì không có cấp độ (OQ-ADS-01) |
| Collection "3000 Essential Words" rỗng | 0 chủ đề | Đây là collection duy nhất xóa được |

## 4. Bố cục

### 4.1. Đầu trang

- Eyebrow "Learning", tiêu đề "Chủ đề", nút [+ Tạo collection].
- Tab collection hệ thống (tên + tên Việt) kèm [Đổi tên] [Xóa].
- Route: `/topics/{collectionId}/{rootId}/{childId}`. F5 và link chia sẻ mở lại đúng chủ đề.

### 4.2. Cây (300px, dính khi cuộn)

- Đầu cây: "Chủ đề · N gốc" và nút [+] thêm chủ đề gốc; ô lọc tên (không dấu cũng tìm được).
- Mỗi nút gốc có thể mở ra (chủ đề con tải khi mở) và có nút [+] thêm chủ đề con khi hover.
- Chủ đề con **không** có nút thêm con, vì nội dung thật chỉ có 2 cấp (từ loại → chủ đề).

### 4.3. Chi tiết chủ đề

| Khối | Nội dung |
| :--- | :--- |
| Header | Breadcrumb · tên + tên Việt · mô tả · badge "Đang hiển thị với người học" · nút mẫu thẻ "Mẫu thẻ: … · Đổi" · schema (dùng chung N chủ đề). Nút: [Sửa] [Xóa] (vô hiệu, cần API) · [Thêm chủ đề con] (chỉ ở gốc) · **[Thêm mục từ]** (primary) |
| Chủ đề con | Với gốc: lưới các chủ đề con (tên, tên Việt, mẫu thẻ) |
| Dải độ phủ (kiêm bộ lọc) | Mục từ · Đủ dữ liệu · Thiếu nghĩa · Thiếu dịch · Thiếu IPA · Thiếu ví dụ · Trùng · Lệch schema |
| Ghi chú lệch schema | Khi có: nêu số mục, thuộc tính lệch và việc cần backend làm |
| Toolbar | Tìm (từ hoặc bản dịch, không dấu) · lọc cấp độ · "x/y mục" · phân bố cấp độ |
| Bảng | Từ (+ badge Trùng) · Phiên âm · Bản dịch · Giải nghĩa (từ 2xl) · Cấp độ · Ví dụ · Độ phủ (chấm theo loại thiếu) |
| Inspector (drawer) | Mọi giá trị theo nhóm và nhãn của schema, kèm giá trị ngoài schema. [Sửa mục] [Xóa mục] vô hiệu (cần API) |

### 4.4. Hộp thoại và form

| Thành phần | Quy tắc |
| :--- | :--- |
| Collection | Tên 2–100 ký tự (theo `CreateCollectionDTO`), tên Việt tùy chọn |
| Xóa collection | Danger. Còn chủ đề thì nút xác nhận bị vô hiệu, kèm giải thích "xóa cứng" |
| Chủ đề | Tên 2–100; tên Việt, mô tả, mô tả Việt tùy chọn. `parentId` = gốc đang chọn hoặc null |
| Mẫu thẻ | Radio các mẫu của schema; "Đang dùng"; chỉ áp dụng khi đổi sang mẫu khác |
| **Thêm mục từ** (drawer) | Form sinh từ schema: nhóm đơn là lưới trường, nhóm lặp là các khối có [+]/[xóa]. Trường bắt buộc có \*. Kiểm tra theo kiểu dữ liệu (NUMBER/BOOLEAN/DATE). [Điền từ từ điển] chỉ điền ô **trống** (bảng dưới). Cảnh báo nếu từ đã có trong chủ đề. Payload bỏ ô trống và dòng lặp rỗng |

Mapping khi điền từ từ điển:

| Từ điển | → Mục từ |
| :--- | :--- |
| IPA (ưu tiên vùng US, bọc trong `/…/`) | `main.phonetic` |
| Bản dịch vi, nếu không có thì định nghĩa vi | `main.translation` |
| Định nghĩa `en` đầu tiên | `meaning.meaning` |
| Định nghĩa `vi` đầu tiên | `main.definition_translation` |
| Tối đa 2 ví dụ | `examples[].content` |

## 5. Tiêu chí nghiệm thu

| ID | Tiêu chí | Kiểm bằng |
| :--- | :--- | :--- |
| AC-TOP-01 | Deep link `/topics/1/70/71` tải collection, gốc, con, mục từ (size 500) và schema; header hiện mẫu thẻ thật | `admin-content.dom.test.ts` T1 |
| AC-TOP-02 | Thêm mục từ: điền từ từ điển rồi `POST /api/topics/{id}/items` với đúng body theo schema; danh sách tải lại | T2 |
| AC-TOP-03 | Trường bắt buộc chặn gửi; từ trùng được cảnh báo | T3 |
| AC-TOP-04 | Tạo chủ đề gốc gửi đúng body; xóa collection còn chủ đề bị chặn | T4 |
| AC-TOP-05 | Độ phủ, trùng, lệch schema tính đúng trên dữ liệu thật (`main.meaning`) | `admin-content.test.ts` C1, C5 |
| AC-TOP-06 | Điền từ điển không ghi đè ô người vận hành đã nhập; nghĩa Việt đi vào `definition_translation` | C3, C6 |
| AC-TOP-07 | Mọi hành động chưa có API đều vô hiệu và nêu endpoint cần có | Kiểm tay |

## 6. Chưa làm

| Hạng mục | Trạng thái |
| :--- | :--- |
| Import CSV dry-run | MOCK, bước sau |
| Preview thẻ theo mẫu (dùng `data-resolver` của mobile, design.md §6) | Bước sau |
| Kéo thả sắp xếp | FUTURE |
| Bulk xóa/chuyển mục từ | Cần API |
