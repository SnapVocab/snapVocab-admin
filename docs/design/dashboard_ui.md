# Admin · Dashboard — Đặc tả màn hình

> **Rev 2 · 2026-10-20 · Scope: MOCK** (khối "Cần xử lý" của Cửa hàng/Nhiệm vụ, trạng thái catalog và "Thay đổi gần đây" là **NOW**).
> Hướng: **C · Bảng điều phối vận hành** (OQ-ADS-03). Nền tảng: [design.md](./design.md) rev 4 §3.7. Rev 2 (PD-ADS-21, chờ PO duyệt) giữ đủ mọi tầng, số liệu và 11 quy tắc; chỉ đổi cách trình bày:
> - "Cần xử lý" là danh sách việc theo mức độ: mỗi dòng có dấu mức độ, khu vực, "dữ liệu mẫu" nếu quy tắc đọc số mẫu, tiêu đề, chi tiết và nút mở đúng màn. Không còn lưới thẻ viền trái.
> - Tầng 2–4 gộp thành ba dải. Mỗi dải là một khung chia cột bằng đường kẻ: Vận hành scan \| Nhãn chưa có từ · Nhịp học \| Nhiệm vụ hằng ngày · Kinh tế Coin \| Cửa hàng.
> - Không còn nhãn "Mẫu"/"Dữ liệu thật" trên từng khối: notice đầu trang (gắn với cờ fixture) nói rõ phần nào là mẫu.
> - Mã lỗi scan hiện bằng nhãn (`domains/scan/labels.ts`), mã gốc nằm trong tooltip. Nút cảnh báo "nhãn chưa có từ" là "Mở AI Scan", vì ánh xạ nhãn chưa xây.
> Yêu cầu sản phẩm: F-ADM-10 (S), FR-13.06. Đánh giá: [admin_product_review_2026-10-19.md](../../../docs/reviews/admin_product_review_2026-10-19.md) §3.1, §6.

## 1. Mục tiêu

Mỗi sáng người vận hành mở Dashboard để biết **cần làm gì**, không phải để ngắm KPI. Thứ tự trang theo đúng thứ tự trả lời:

| Tầng | Câu hỏi | Khối | Scope |
| :--- | :--- | :--- | :--- |
| 0 | Có quy tắc vận hành nào đang vỡ không? | **Cần xử lý** + danh sách "Quy tắc đã kiểm" | NOW (Cửa hàng, Nhiệm vụ) · MOCK (Scan, hiệu quả nhiệm vụ) |
| 1 | Toàn cảnh hôm nay? | Dải KPI chữ + sparkline: học hôm nay, học 7 ngày, scan hôm nay, Coin phát/tiêu 7 ngày, số collection hệ thống | MOCK · NOW (collection) |
| 2 | Scan có chạy đúng không? | **Vận hành scan** (lượt, thành công, p50/p95, hàng đợi đầy, hết quota, 14 ngày, mã lỗi 7 ngày, cấu hình) · **Nhãn chưa có từ** | MOCK |
| 3 | Người học có học không? Nhiệm vụ nào bị bỏ qua? | **Nhịp học** (có mẫu số) · **Nhiệm vụ hằng ngày** (catalog thật + tỉ lệ hoàn thành mẫu) | MOCK · NOW |
| 4 | Kinh tế có cân không? | **Kinh tế Coin** (vào/ra 14 ngày, tiêu/phát, số dư TB) · **Cửa hàng** (trạng thái bán thật + bán chạy / chưa ai mua mẫu) | MOCK · NOW |
| 5 | Vừa có gì thay đổi? | **Thay đổi gần đây**: mốc tạo/phát hành/sửa của vật phẩm và mẫu nhiệm vụ | NOW |

**Không đưa lên Dashboard** (review §6): cohort/giữ chân dài kỳ (Phân tích), hạ tầng/storage, CEFR, SLA, Gems, League, "Snapshot mô phỏng".

## 2. Quy tắc "Cần xử lý"

Hàm thuần `runChecks` (`src/domains/admin-overview/mappers.ts`). Mỗi quy tắc luôn hiện trong cột "Quy tắc đã kiểm", đạt hay không. Nguồn chưa tải được thì quy tắc của nguồn đó **không** được tính là đạt: hiện banner lỗi kèm "Thử lại".

| ID | Quy tắc (trạng thái lành) | Nguồn | Mức khi vỡ | Mở tới |
| :--- | :--- | :--- | :--- | :--- |
| `mission-invariant` | Catalog đủ cấp 5 nhiệm vụ/ngày | Missions (NOW) | Nghiêm trọng; "Chưa kích hoạt" = Cảnh báo | `/missions` |
| `mission-reward-item` | Vật phẩm thưởng của nhiệm vụ đang bật còn Đã phát hành | Missions + Shop (NOW) | Không tồn tại = Nghiêm trọng (nhận thưởng lỗi); Nháp = Cảnh báo (nhận Coin dự phòng); Lưu trữ = Lưu ý | `/missions/:id` |
| `mission-budget` | Thưởng tối đa/người/ngày ≤ 85 Coin | Missions (NOW) | Cảnh báo | `/missions` |
| `shop-ending` | Không có vật phẩm đang bán hết hạn trong 7 ngày | Shop (NOW) | < 2 ngày = Cảnh báo, còn lại Lưu ý | `/shop/:id` |
| `shop-price` | Giá đang bán nằm trong dải cùng loại (×1,5; ≥ 3 mẫu) | Shop (NOW) | Cảnh báo | `/shop/:id` |
| `shop-stale-draft` | Không có bản nháp bỏ dở > 14 ngày | Shop (NOW) | Lưu ý | `/shop/:id` |
| `scan-errors` | Tỉ lệ scan lỗi hôm nay ≤ 5% | Overview (MOCK) | > 15% = Nghiêm trọng | `/ai-scan` |
| `scan-p95` | p95 xử lý scan ≤ 10 giây | Overview (MOCK) | Cảnh báo | `/ai-scan` |
| `scan-queue` | Không có AI_QUEUE_FULL hôm nay | Overview (MOCK) | Cảnh báo | `/ai-scan` |
| `scan-unmapped` | Nhãn gặp ≥ 10 lượt/7 ngày đều có từ | Overview (MOCK) | Lưu ý | `/ai-scan` |
| `mission-completion` | Nhiệm vụ giao ≥ 20 lần có tỉ lệ hoàn thành ≥ 25% (7 ngày) | Overview (MOCK) + Missions | Lưu ý | `/missions/:id` |

- Sắp xếp: Nghiêm trọng → Cảnh báo → Lưu ý; cùng mức thì NOW trước MOCK.
- Có một đối tượng thì mở thẳng đối tượng đó, nhiều đối tượng thì mở danh sách.
- Ngưỡng là **gợi ý UI** (P7), hằng số `THRESHOLDS`. PO chốt ngưỡng thật rồi chuyển vào API (OQ-DASH-01).

## 3. Contract đề xuất

`GET /api/admin/overview` → `AdminOverview` (`src/domains/admin-overview/types.ts`): người học (đã kích hoạt, 7 ngày, hôm nay, 14 ngày, hoạt động hôm nay), scan (cấu hình, hôm nay, 14 ngày, mã lỗi 7 ngày), nhãn chưa có từ, Coin vào/ra 14 ngày, hiệu quả nhiệm vụ theo `code`, lượt mua 30 ngày theo `code`. Mọi chuỗi ngày theo `Asia/Ho_Chi_Minh`.

Đặc tả backend (nguồn và công thức từng trường, dữ liệu phải ghi thêm, migration, test): [admin_overview_backend.md](../../../docs/sa/admin_overview_backend.md).

Chạy dữ liệu mẫu sau cờ `VITE_ADMIN_OVERVIEW_FIXTURES` (mặc định bật ở dev). Fixture khớp màn Người học (cùng 48 người, 44 đã kích hoạt), mã nhiệm vụ của `MissionCatalogSeeder`, mã lỗi `ScanErrorCode`, cấu hình `application.yaml`.

## 4. Câu hỏi mở

| ID | Câu hỏi |
| :--- | :--- |
| OQ-DASH-01 | Chốt ngưỡng §2 (5% lỗi, p95 10 giây, 10 lượt nhãn, 25% hoàn thành, 7/14 ngày) |
| OQ-DASH-02 | "Thay đổi gần đây" chỉ có mốc thời gian; ai sửa gì cần `admin_audit_logs` (PD-ADS-10) |

## 5. Truy vết

| Nội dung | Code | Test |
| :--- | :--- | :--- |
| Quy tắc, sắp xếp, thay đổi gần đây | `domains/admin-overview/mappers.ts` | `tests/admin-overview.test.ts` (O1–O3, O5, O6) |
| Contract, fixture | `domains/admin-overview/{types,fixtures,api,queries}.ts` | O4 |
| Màn hình | `features/dashboard/{DashboardPage,blocks}.tsx` | O7 (render đủ tầng; cảnh báo từ số mẫu có nhãn; không lộ mã, không "invariant", không khái niệm ngoài scope) |
