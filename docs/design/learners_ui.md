# Admin · Người học — Đặc tả màn hình

> **Rev 2 · 2026-10-20**: áp ngôn ngữ giao diện [design.md](./design.md) §3.7 cho bảng, header và hồ sơ; giao diện không còn mã spec hay mã lỗi thô. Hành vi, contract và tiêu chí nghiệm thu giữ nguyên.
> **Rev 1 · 2026-10-19 · Scope: MOCK.** Đã dựng trên dữ liệu mẫu; backend chưa có.
> Nền tảng: [design.md](./design.md) rev 3.
> Yêu cầu sản phẩm: F-ADM-01…03 (Must), FR-13.01, BF-14.
> Đánh giá: [admin_product_review_2026-10-19.md](../../../docs/reviews/admin_product_review_2026-10-19.md) §3.12.

## 1. Mục tiêu và ranh giới

Người vận hành **tìm** một người học, **hiểu** tình trạng tài khoản và việc học, rồi **xử lý hỗ trợ**: khóa/mở khóa, gửi link đặt lại mật khẩu.

**Ranh giới sản phẩm (specs §3, BF-14 BR4):** admin **không** sửa tiến độ học, FSRS hay streak, và không xem hay đặt mật khẩu thay người học.

| Hạng mục | Scope |
| :--- | :--- |
| Điều chỉnh Coin (`ADMIN_ADJUSTMENT`) | FUTURE (OQ-ADS-07: được phép, kèm lý do và audit) |
| Khôi phục streak, FSRS theo người học, League, CEFR | REMOVE |

## 2. Contract đề xuất

Định nghĩa ở `src/domains/admin-learners/types.ts`:

| Endpoint | Trả về | Ghi chú |
| :--- | :--- | :--- |
| `GET /api/admin/users?q=&status=&activity=&sort=&page=&size=` | `{ data, meta, summary }` | `summary` đếm trên **toàn bộ** người học, không theo bộ lọc |
| `GET /api/admin/users/{id}` | `AdminLearnerDetail` | Tài khoản, tiến độ (phân loại từ FSRS, chỉ đọc), hoạt động 30 ngày, nhiệm vụ 7 ngày, huy hiệu, ví và giao dịch gần đây, vật phẩm, scan, dòng thời gian |
| `POST …/{id}/ban { reason }` | Chi tiết mới | Lý do 10–500 ký tự. Thu hồi phiên |
| `POST …/{id}/unban { reason? }` | Chi tiết mới | — |
| `POST …/{id}/password-reset` | 204 | Gửi email theo luồng quên mật khẩu F-AUTH-05 |

| Cần thêm ở backend | Ghi chú |
| :--- | :--- |
| Trạng thái `BANNED` (`users` hiện chỉ có `activated`) | Chặn đăng nhập và thu hồi refresh token |
| Ghi audit | Theo PD-ADS-10 |

Cờ: `VITE_ADMIN_LEARNERS_FIXTURES`. Mặc định bật ở dev; đặt `false` để gọi API thật.

## 3. Danh bạ (`/learners`)

| Khối | Nội dung |
| :--- | :--- |
| Header | Tiêu đề "Người học" (rev 2: không eyebrow, không câu mô tả; ranh giới "chỉ xem tiến độ" nằm ở khối Học tập của hồ sơ). Không có nút tạo (người học tự đăng ký) |
| `SampleDataNotice` | Nêu contract đang chờ và việc các thao tác chỉ đổi dữ liệu mẫu |
| Dải số liệu (kiêm bộ lọc) | Người học · Học trong 7 ngày · Ngừng học > 30 ngày · Chưa học lần nào · Chờ kích hoạt · Đã khóa |
| Toolbar | Tìm theo tên hoặc email (**không dấu cũng tìm được**, "dang" khớp "Đặng"), sắp xếp (Học gần nhất / Mới tham gia / Streak / Nhiều từ), làm mới |
| Bảng | Người học (avatar chữ cái một tông, tên, email) · Trạng thái (rev 2: "Hoạt động" là chữ thường; chỉ Chờ kích hoạt và Đã khóa là badge) · **Học gần nhất** (chỉ "ngừng > 30 ngày" có màu cảnh báo) · Streak · Kỷ lục · Từ đã lưu · Coin · Tham gia. Số canh phải, không icon trên từng dòng |
| Phân trang | Phân trang server, 20 người/trang; trang cũ giữ trên màn khi trang mới đang tải |

- Bấm một hàng (hoặc tên, là link thật nên mở tab mới được) để vào hồ sơ.
- Danh bạ giữ nguyên bộ lọc và trang khi quay lại từ hồ sơ.

## 4. Hồ sơ một trang (`/learners/:id`)

Hồ sơ không chia tab: đọc là chính, hai hành động hỗ trợ đặt riêng.

| Khối | Nội dung |
| :--- | :--- |
| Header | ←, avatar, tên (badge trạng thái chỉ khi không phải Hoạt động), email, ID, ngày tham gia, học gần nhất. Nút **Gửi link đặt lại mật khẩu** (secondary; vô hiệu với tài khoản chưa kích hoạt) và **Khóa tài khoản** (`danger-outline`), hoặc **Mở khóa** nếu đang khóa |
| Banner khóa | Ngày, người khóa, lý do, hệ quả, nút Mở khóa |
| Dải số liệu (chỉ đọc, `StatCell`) | Từ đã lưu · Thành thạo · Đến hạn hôm nay · Streak (dài nhất) · Độ chính xác quiz · XP · Coin |
| Học tập | Câu "chỉ xem" · thanh phân bố Mới / Đang học / Đang ôn / Thành thạo · biểu đồ hoạt động 30 ngày |
| Hoạt động gần đây | Dòng thời gian (học, quiz, scan, nhiệm vụ, mua, huy hiệu, tài khoản) |
| Scan | Quota hôm nay x/20, 30 ngày (lượt, lỗi), 4 lượt gần nhất (nhãn hoặc mã lỗi thật, số từ đã lưu) |
| Cột phải | **Nhiệm vụ 7 ngày** (đã cấp / hoàn thành / nhận thưởng; cảnh báo nếu hoàn thành mà chưa nhận) · **Huy hiệu x/12** · **Kinh tế** (Coin, giao dịch gần đây, vật phẩm "Đang dùng") · **Tài khoản** (dòng nhắc audit log) |

## 5. Hộp xác nhận (`components/ui/ConfirmModal`)

| Hộp | Tone | Nội dung |
| :--- | :--- | :--- |
| Khóa tài khoản | `danger` | Hệ quả (không đăng nhập được; dữ liệu giữ nguyên; mở khóa được). **Lý do bắt buộc** 10–500 ký tự; nút xác nhận bị vô hiệu tới khi hợp lệ; lỗi hiện khi rời ô hoặc khi bấm |
| Mở khóa | `info` | Lý do khóa trước đó; ghi chú tùy chọn |
| Gửi link đặt lại | `info` | Email đích; nhắc rằng admin không xem hay đặt mật khẩu |

Mỗi hộp: khi thất bại thì báo lỗi ngay trong hộp và vẫn giữ hộp mở; khi thành công thì toast và cập nhật hồ sơ cùng danh bạ.

## 6. Tiêu chí nghiệm thu

| ID | Tiêu chí | Kiểm bằng |
| :--- | :--- | :--- |
| AC-LRN-01 | Ô của dải số liệu đếm trên toàn bộ người học và không đổi khi lọc; bấm ô thì lọc bảng | `admin-learners.test.ts` L4 |
| AC-LRN-02 | Tìm kiếm không phân biệt hoa thường và dấu tiếng Việt (đ → d), khớp cả email | L2 |
| AC-LRN-03 | "Học gần nhất" và nhóm hoạt động đúng với `last_studied_at` | L1 |
| AC-LRN-04 | Khóa bắt buộc lý do 10–500 ký tự; khóa rồi mở khóa trả lại đúng trạng thái và ghi vào dòng thời gian | L3, L6 |
| AC-LRN-05 | Dữ liệu mẫu nhất quán: tổng các trạng thái thẻ = từ đã lưu; huy hiệu khớp ngưỡng thật; người bị khóa không học sau ngày khóa | L5 |
| AC-LRN-06 | F5 tại `/learners/:id` mở lại đúng hồ sơ; quay lại thì danh bạ giữ bộ lọc | Kiểm tay |
| AC-LRN-07 | Không có hành động nào sửa tiến độ học | Kiểm tay |
