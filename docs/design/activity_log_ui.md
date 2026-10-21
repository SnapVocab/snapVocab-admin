# Admin · Nhật ký hoạt động — Đặc tả màn hình

> **Rev 1 · 2026-10-20 · Scope: MOCK. Đã dựng trên dữ liệu mẫu, chờ PO duyệt.** Backend `admin_audit_logs` chưa có.
> Nền tảng: [design.md](./design.md) rev 4 (§3.7 ngôn ngữ giao diện, §8 Audit, PD-ADS-10).
> Đánh giá: [admin_product_review_2026-10-19.md](../../../docs/reviews/admin_product_review_2026-10-19.md) §3.14 (thành phần giữ/bỏ), §4.2 (cột bảng).
> Thay bản mock cũ `features/audit` + `domains/audit`. Hai thư mục này đã xóa ngày 2026-10-21.

## 1. Mục tiêu và ranh giới

Khi giá hay thưởng sai, câu hỏi đầu tiên là **ai đổi, đổi gì, lúc nào, vì sao**. Màn này cho người vận hành:

1. tìm một thay đổi (theo kỳ, ngày, câu hỏi, khu vực, người làm, chữ);
2. xem đủ thay đổi (mọi trường, trước → sau) và lý do;
3. mở đối tượng để xử lý, hoặc xem toàn bộ lịch sử của đối tượng đó.

**Ranh giới:**

- Chỉ đọc. Không hoàn tác từ nhật ký. Muốn quay lại thì mở đối tượng và sửa; lần sửa đó cũng được ghi.
- Không ghi đăng nhập hay địa chỉ IP (FUTURE, khi đội vận hành > 3 người, review §3.14).
- Không có "toàn vẹn bất biến", chuỗi hash, block height hay tỉ lệ tuân thủ (REMOVE, review §3.14).

### 1.1. Đối chiếu với bản mock cũ

Mật độ giữ nguyên ([design.md](./design.md) §3.7). Phần đổi là nguồn dữ liệu và cách trình bày.

| Bản cũ | Bản mới | Lý do |
| :--- | :--- | :--- |
| Ribbon 5 thẻ: Sự kiện 24 giờ, Guardrail & Critical, Tuân thủ lý do, Nhân sự vận hành, Toàn vẹn SHA-256 | Dải số liệu kiêm bộ lọc: Thay đổi trong N ngày · Giá và phần thưởng · Vòng đời · Tài khoản người học · Vượt mức gợi ý | "Tuân thủ lý do" luôn là 100% vì backend bắt buộc lý do. SHA-256 là REMOVE |
| 5 tab theo phân hệ | Hai cột "Theo khu vực" và "Người làm" trong dải phân bố, bấm để lọc | Review §3.14: tab → bộ lọc |
| Toolbar: Ticket ID, mức độ INFO…CRITICAL, operator, Hôm nay/24h/7 ngày | Tìm kiếm không dấu; kỳ 7/30/90 ngày ở header; chọn một ngày bằng cột biểu đồ | Không có hệ thống ticket. Mức độ thay bằng câu hỏi ở dải số liệu |
| (không có) | Biểu đồ số thay đổi theo ngày | Thấy ngay ngày dồn việc (06/10: lên kệ khung avatar) |
| Bảng sổ cái 7 cột | Bảng nhóm theo ngày: Giờ · Người làm · Khu vực · Hành động · Đối tượng · Thay đổi · Lý do | Cột theo review §4.2 |
| Drawer: diff, operator + IP, hash, rollback | Drawer: cảnh báo vượt mức gợi ý · Trường / Trước / Sau · Lý do · Đối tượng + link mở · Lịch sử của đối tượng · Mã kỹ thuật | Bỏ IP, hash, rollback. Thêm link "mở đối tượng" (review §3.14) |
| Modal xuất CSV/JSON + tab Compliance | Nút "Xuất CSV": mọi dòng của bộ lọc hiện tại | Review §4.1.4: chỉ xuất khi có người nhận, theo khoảng |
| (không có) | Lịch sử một đối tượng `/activity-log/:loại/:id`, link từ "Vòng đời" | design.md §8.4 |

## 2. Contract đề xuất

Định nghĩa ở `src/domains/admin-audit/types.ts`. Cờ: `VITE_ADMIN_AUDIT_FIXTURES` (mặc định bật ở dev; đặt `false` để gọi API thật).

**Đặc tả triển khai backend: [docs/sa/admin_audit_log_backend.md](../../../docs/sa/admin_audit_log_backend.md)** (bảng, ghi audit trong từng service, guardrail, API, test, nghiệm thu). Mục này chỉ tóm tắt phần màn hình dùng.

| Endpoint | Trả về |
| :--- | :--- |
| `GET /api/admin/audit-log?days=&day=&area=&actor=&kind=&targetType=&targetId=&q=&page=&size=` | `{ data: AuditEntry[], meta, summary }`, mới nhất trước |

Không có endpoint xuất file: màn tự gom các trang của endpoint trên rồi dựng CSV (§6).

| Tham số | Ý nghĩa |
| :--- | :--- |
| `days` | 7, 30 hoặc 90 ngày lịch tính tới hôm nay (UTC+7) |
| `day` | Một ngày `YYYY-MM-DD` (UTC+7) trong kỳ |
| `area` | `SHOP`, `MISSIONS`, `DICTIONARY`, `TOPICS`, `AI_SCAN`, `LEARNERS`, `NOTIFICATIONS` |
| `actor` | id admin, hoặc `SYSTEM` cho thao tác không có admin (seed, migration, import) |
| `kind` | Câu hỏi của dải số liệu (§3.1) |
| `targetType` + `targetId` | Lịch sử một đối tượng |
| `q` | Tìm trong tên, mã, id đối tượng, email người làm, lý do; không phân biệt hoa thường và dấu |

**`AuditEntry`**: `id`, `at`, `actor` (`{ id, email }` hoặc `null` = hệ thống), `area`, `action`, `target` (`type`, `id`, `name` tại thời điểm ghi, `code`, `parents` cho chủ đề), `changes[]` (`field`, `before`, `after` giữ nguyên kiểu đã ghi), `reason`, `guardrail`, `version` (phiên bản của đối tượng sau thao tác).

**`summary`** tính trên cả kỳ (và đối tượng, nếu có), **bỏ qua các bộ lọc còn lại**. Nhờ vậy số ở dải số liệu và dải phân bố không nhảy khi người vận hành bấm lọc. Gồm: `total`, `byKind`, `daily` (mọi ngày trong kỳ), `areas`, `actors` (nhiều nhất trước).

**Ở backend (PD-ADS-10, chi tiết trong đặc tả backend):** bảng mới `admin_audit_logs` (không dùng lại `mission_admin_audits`); ghi trong cùng transaction với thay đổi, audit lỗi thì thay đổi lỗi theo; không có API sửa hay xóa bản ghi; lý do bắt buộc khi ngừng bán vĩnh viễn, khóa tài khoản và lưu giá hoặc thưởng vượt guardrail; guardrail tính lại ở backend theo cùng quy tắc với gợi ý trên UI.

### 2.1. Thao tác được ghi

| Khu vực | Hành động | API ghi hiện có |
| :--- | :--- | :--- |
| Cửa hàng | Tạo bản nháp · Sửa · Phát hành · Ngừng bán vĩnh viễn · Xóa bản nháp | Có (`/api/admin/shop`) |
| Nhiệm vụ | Tạo mẫu · Sửa · Bật · Tắt | Có (`/api/admin/mission-templates`) |
| Chủ đề | Tạo/sửa/xóa collection · Tạo chủ đề · Thêm mục từ (mỗi mục một dòng) · Đổi mẫu thẻ · Đổi schema. Chỉ nội dung hệ thống, hoặc admin sửa collection của người khác | Có (`/api/collections`, `/api/topics`) |
| Thông báo | Gửi thông báo hệ thống | Có (A8) |
| Từ điển | Sửa từ | Chưa (MOCK) |
| AI Scan | Gán từ cho nhãn | Chưa (F-DICT-06) |
| Người học | Khóa · Mở khóa · Gửi link đặt lại mật khẩu | Chưa (`/api/admin/users`) |

Không ghi: điều chỉnh Coin `ADMIN_ADJUSTMENT` (FUTURE), khôi phục streak (REMOVE), đổi cấu hình hệ thống (không có màn). Huy hiệu được thêm khi có P2 (sửa, bật/tắt).

## 3. Màn (`/activity-log`)

| Khối | Nội dung |
| :--- | :--- |
| Header | Tiêu đề; kỳ **7 / 30 / 90 ngày** (mặc định 30); "Cập nhật hh:mm"; Làm mới; **Xuất CSV** (vô hiệu khi không có dòng nào) |
| `SampleDataNotice` | Contract đang chờ. Mọi dòng là mẫu nhưng trỏ tới đối tượng có thật. Cửa hàng và Nhiệm vụ khớp mốc thật (§7) |
| Dải số liệu (kiêm bộ lọc) | §3.1. Bấm ô để lọc, bấm lại để bỏ. Ô 0 nhạt và bị vô hiệu |
| Dải phân bố | Ba cột chia bằng đường kẻ: **Theo ngày** (cột mỗi ngày, meta "N ngày có thay đổi, nhiều nhất dd/mm: n"; bấm cột để xem một ngày) · **Theo khu vực** · **Người làm** (thanh tỉ lệ một tông xám; bấm dòng để lọc; dòng đang chọn nền xám) |
| Tìm | Một ô tìm và nút "Xóa bộ lọc" khi đang lọc |
| Bảng | Nhóm theo ngày, mới nhất trước. Đầu nhóm: "Hôm nay / Hôm qua / Thứ…, dd/mm/yyyy" và số thay đổi trong ngày; số này ẩn khi đang lọc, vì lúc đó nó không còn đúng với các dòng hiện ra |
| Phân trang | Server, 50 dòng/trang; "Mới hơn" và "Cũ hơn"; trang cũ giữ trên màn khi trang mới đang tải |

### 3.1. Câu hỏi của dải số liệu

| Ô | Đếm |
| :--- | :--- |
| Thay đổi trong N ngày | Mọi bản ghi của kỳ |
| Giá và phần thưởng | Lần **sửa** có đổi `price`, `purchasable`, `rewardCoin`, `rewardXp`, `rewardItemCode`, `rewardItemFallbackCoin` |
| Vòng đời | Tạo, phát hành, ngừng bán, xóa bản nháp, bật/tắt nhiệm vụ, tạo/xóa collection, tạo chủ đề |
| Tài khoản người học | Khóa, mở khóa, gửi link đặt lại |
| Vượt mức gợi ý (chấm vàng) | Lần lưu vượt guardrail §7 |

### 3.2. Dòng của bảng

| Cột | Hiển thị |
| :--- | :--- |
| Giờ | hh:mm (UTC+7); di chuột thấy đủ ngày giờ, giây |
| Người làm | Email; "Hệ thống" màu nhạt khi không có admin |
| Khu vực | Chữ thường (ẩn dưới 1024px) |
| Hành động | Động từ: "Sửa", "Phát hành", "Khóa tài khoản"… Không mã enum |
| Đối tượng | Tên (nút mở drawer) và mã (`FRAME_GOLDEN_WORDSMITH`, `#108` với người học) |
| Thay đổi | Tối đa 2 trường dạng "Giá: 900 Coin → **950 Coin**", rồi "+N trường khác". Tạo mới chỉ ghi giá trị ("Giá: 1.500 Coin"), không ghi tên vì cột Đối tượng đã có. Ảnh ghi "Tải ảnh lên / Thay ảnh khác / Gỡ ảnh"; mã file chỉ có trong drawer. Badge **Vượt mức gợi ý** là badge duy nhất của bảng (§3.5 design.md) |
| Lý do | Tối đa 2 dòng (ẩn dưới 1280px) |

## 4. Lịch sử một đối tượng (`/activity-log/:loại/:id`)

- Đoạn đường dẫn theo loại: `vat-pham`, `nhiem-vu`, `tu`, `collection`, `chu-de`, `nhan-scan`, `nguoi-hoc`, `thong-bao`. F5 mở lại đúng đối tượng.
- Mặc định 90 ngày. Thanh đầu trang: "Lịch sử của {loại} **{tên}** {mã}", link "Mở {loại}" và "Xem toàn bộ nhật ký".
- Ẩn cột "Theo khu vực", vì một đối tượng chỉ thuộc một khu vực.
- Link vào màn này từ: panel "Vòng đời" của editor Cửa hàng và Nhiệm vụ, khối "Tài khoản" của hồ sơ người học. Ở bản dev/demo link ghi "Xem nhật ký mẫu" và chỉ hiện khi cờ fixture bật.
- Khi backend có: panel "Vòng đời" đọc 5 bản ghi gần nhất của đối tượng (design.md §8.4) và câu "Chưa có nhật ký ai sửa gì" được gỡ.

## 5. Drawer một bản ghi

| Phần | Nội dung |
| :--- | :--- |
| Tiêu đề | "{Hành động}: {tên đối tượng}"; dưới tiêu đề là ngày giờ có giây và người làm |
| Cảnh báo | Hộp vàng "Lưu khi vượt mức gợi ý." kèm câu guardrail đã ghi (chỉ khi có) |
| Thay đổi | Bảng Trường / Trước / Sau, đủ mọi trường. Giá trị đã định dạng: Coin, XP, phút, ngày giờ UTC+7, nhãn trạng thái, "Có/Không"; trống là "—" |
| Lý do | Khi có |
| Đối tượng | Khu vực, loại, tên, mã, ID, "Phiên bản N sau thao tác này"; link "Mở {loại}" (không có khi đối tượng đã bị xóa) |
| Lịch sử của {loại} này | 5 bản ghi gần nhất trong 90 ngày, bản đang xem được tô nền. Bấm một dòng để chuyển. "Xem cả N thay đổi trong 90 ngày" khi còn bản ghi khác |
| Mã kỹ thuật | Thu gọn sẵn: id bản ghi, mã hành động, loại + id đối tượng, JSON `changes` (G5: mã gốc chỉ ở đây) |
| Chân | "Mới hơn" và "Cũ hơn" để đi qua các dòng của trang mà không đóng drawer |

## 6. Xuất CSV

- Cột: Thời điểm (giờ Việt Nam) · Người làm · Khu vực · Hành động · Loại đối tượng · Đối tượng · Mã · ID · Thay đổi · Lý do · Vượt mức gợi ý · Phiên bản · Mã hành động.
- Mọi dòng của bộ lọc hiện tại, không chỉ trang đang xem: màn gọi lần lượt các trang `size=100` của `GET /api/admin/audit-log`, bỏ dòng trùng theo `id` (một lần ghi mới chen vào giữa chỉ đẩy dòng xuống trang sau, không làm mất dòng), rồi dựng CSV bằng cùng bộ nhãn của màn. File UTF-8 có BOM để Excel đọc được tiếng Việt.
- Tên file: `snapvocab-nhat-ky-30-ngay.csv`; khi đang xem một ngày thì là `snapvocab-nhat-ky-2026-10-06.csv`.
- Xuất lỗi: banner "Không tải được file CSV" kèm "Thử lại".

## 7. Dữ liệu mẫu (`domains/admin-audit/fixtures.ts`)

- **Đối tượng thật**: id, mã, tên và giá trị hiện tại lấy từ DB clone ngày 2026-10-20, nên mọi link mở đúng màn.
- **Cửa hàng và Nhiệm vụ đi đúng vòng đời thật**: tạo, phát hành và lần sửa cuối nằm đúng mốc `created_at` / `published_at` / `updated_at`; số lần ghi khớp `version`; giá trị sau lần ghi cuối bằng giá trị hiện tại. Ví dụ: Bậc Thầy Hoàng Kim v4, 950 Coin; Hoa Anh Đào Mùa Xuân v3, chuyển thành quà; Góp Nhặt Từ Mới v2, quay lại 15 Coin. Nhật ký vì vậy khớp với "Thay đổi gần đây" của Dashboard và panel "Vòng đời" của editor.
- **Seed là "Hệ thống"**: 7 mẫu nhiệm vụ cùng tạo lúc 08:15:50 ngày 06/10, vật phẩm tạo lúc 11:16:12, collection Vocabulary nhập ngày 17/09.
- **Người học khớp màn Người học**: hai lần khóa lấy từ fixture Người học (cùng người, giờ, lý do, admin). Fixture đó được sửa để hai lần khóa cách nhau vài giờ và người khóa là `admin@snapvocab.com`, đúng tài khoản admin thật.
- Nhãn scan được gán từ tránh các nhãn mà Dashboard và Phân tích đang báo "chưa có từ".
- Hai người làm: `admin@snapvocab.com` (tài khoản admin thật duy nhất) và `bientap@snapvocab.com` (mẫu).

## 8. Tiêu chí nghiệm thu

| ID | Tiêu chí | Kiểm bằng |
| :--- | :--- | :--- |
| AC-LOG-01 | Dải số liệu và dải phân bố đếm trên cả kỳ, không đổi khi lọc; tổng theo ngày và tổng theo khu vực đều bằng tổng kỳ; bấm ô hay dòng thì lọc bảng và gửi đúng tham số | `admin-audit.test.ts` AU3, `admin-audit.dom.test.ts` D1, D3 |
| AC-LOG-02 | Ngày tính theo UTC+7 ("Hôm nay", "Hôm qua", thứ trong tuần) | AU5 |
| AC-LOG-03 | Thao tác nhạy cảm (§2 "Lý do bắt buộc") luôn có lý do ≥ 10 ký tự | AU2 |
| AC-LOG-04 | Không hiện mã enum, không có khái niệm đã gỡ (hash, ticket, IP, tuân thủ, hoàn tác) | D1 |
| AC-LOG-05 | Drawer: đủ mọi trường trước → sau, lý do, cảnh báo guardrail, link mở đối tượng đúng đường dẫn, lịch sử của đối tượng; "Mới hơn/Cũ hơn" đi qua các dòng | D1 |
| AC-LOG-06 | `/activity-log/:loại/:id` mở lịch sử 90 ngày của đúng đối tượng, có link mở đối tượng; F5 giữ nguyên | D2, AU4 |
| AC-LOG-07 | CSV chứa mọi dòng của bộ lọc (đi hết các trang, không trùng), nhãn tiếng Việt, thay đổi đọc được | AU6, D4 |
| AC-LOG-08 | Dữ liệu mẫu khớp vòng đời thật của Cửa hàng/Nhiệm vụ và lần khóa của màn Người học | AU1, AU2 |

## 9. Câu hỏi mở cho PO

| ID | Câu hỏi | Đề xuất |
| :--- | :--- | :--- |
| OQ-LOG-01 | Giữ nhật ký bao lâu? | Không xóa. Màn xem tối đa 90 ngày; cũ hơn thì xuất CSV theo khoảng (thêm chọn khoảng ngày khi có nhu cầu) |
| OQ-LOG-02 | Việc xuất CSV nhật ký (có email người học) có cần tự ghi vào nhật ký không? | Có: ghi một dòng "Xuất nhật ký" kèm bộ lọc |
| OQ-LOG-03 | Mọi `ROLE_ADMIN` đều xem được nhật ký? | Có, cho tới khi có phân quyền (đội ≤ 3 người) |

## 10. Nợ và giới hạn đã biết

| ID | Nội dung |
| :--- | :--- |
| TD-LOG-01 | ~~Mock cũ `features/audit`, `domains/audit`~~ Đã xóa 2026-10-21 theo đồng ý của PO |
| TD-LOG-02 | Dưới 1024px, khung admin vẫn cố định sidebar 240px (TD-ADS-12), nên màn này, như mọi màn khác, chưa dùng được trên điện thoại |
| TD-LOG-03 | Link "Xem nhật ký mẫu" chỉ hiện khi cờ fixture bật; khi có API thì đổi chữ và đọc 5 bản ghi ngay trong panel (§4) |
