# Admin · Phân tích — Đặc tả màn hình

> **Rev 2 · 2026-10-20 · Scope: MOCK** (tên chủ đề, vật phẩm, giá, trạng thái bán và mẫu nhiệm vụ là **NOW**; giữ chân theo % là **FUTURE**).
> Rev 2 áp ngôn ngữ giao diện [design.md](./design.md) §3.7 (PD-ADS-20), đang chờ PO duyệt. Rev 1 (2026-10-19) có "kết luận + nút" ở cuối mọi biểu đồ.
> Yêu cầu sản phẩm: FR-13.06. Đánh giá: [admin_product_review_2026-10-19.md](../../../docs/reviews/admin_product_review_2026-10-19.md) §3.2, §6.

## 1. Mục tiêu

Dashboard trả lời "hôm nay có gì hỏng". Phân tích trả lời **"sản phẩm có đi đúng hướng không"**, đọc theo tuần hoặc tháng. Kết luận tính từ dữ liệu (§2.4) vẫn giữ đủ, nhưng **được vẽ vào chính dữ liệu**, không thêm một hộp 💡 cùng một nút ở cuối mỗi khối:

| Kết luận (rev 1: dòng 💡 + nút) | Rev 2: hiện ở đâu |
| :--- | :--- |
| Thẻ chưa ôn > 30% | Dòng "Mới" trong bảng Trạng thái thẻ tô vàng, ghi "trên ngưỡng 30%" |
| Nhóm chủ đề / chủ đề / từ đúng thấp nhất | Bảng đã xếp thấp nhất trước, dòng dưới 60% chữ đỏ; tên nhóm, chủ đề, từ là link mở đúng màn |
| Bước rơi lớn nhất của chuỗi | Vạch đánh dấu trên biểu đồ ("rơi N người") và một câu ngay dưới biểu đồ |
| Tiêu/phát so với vùng 50–90% | Con số, nhãn Dư Coin / Cân bằng / Thiếu Coin, thang có vùng tham chiếu |
| Phát trung bình / ngày tiêu nhiều nhất | Dòng số liệu dưới biểu đồ, vạch đánh dấu ngày tiêu nhiều nhất |
| Vật phẩm chưa ai mua | Badge "Chưa ai mua" trên dòng, số lượng ở cuối bảng và trên tab |
| Bước phễu mất nhiều nhất | Dòng của bước đó tô vàng, ghi "mất nhiều nhất", kèm câu nêu số lượt mất |
| Ngưỡng hiển thị nhãn (minReliability) | Câu trạng thái dưới bảng Độ tin cậy nhãn |

Đã bỏ (không có căn cứ dữ liệu, hoặc nút dẫn tới tính năng chưa có): các câu khuyên như "Rà nhiệm vụ để kéo người học ôn thẻ" hay "Thêm vật phẩm đáng mua", hai hộp "Chẩn đoán" và "Nên làm", nút "Gán nhãn → từ" và "Gán từ" (ánh xạ nhãn F-DICT-06 chưa xây, nên AI Scan chỉ còn là link điều hướng), và ghi chú "API A8 đã có".

| Tab (`/analytics/:tab`) | Câu hỏi | Khối | Hành động dẫn tới |
| :--- | :--- | :--- | :--- |
| Học tập (`learning`) | Người học có nhớ từ không, chủ đề nào khó? | Dải KPI · Trạng thái thẻ (FSRS) · Độ chính xác quiz theo nhóm chủ đề · Chủ đề khó · Từ hay sai và hay quên | `/topics/:c/:root/:child`, `/dictionary/:word`, `/missions` |
| Giữ chân (`retention`) | Người học có quay lại không? | Dải KPI · Cohort theo tuần đăng ký · Chuỗi học đi được bao xa · Nhóm cần chú ý | `/learners`, `/missions/:id` (Giữ Lửa Mỗi Ngày) |
| Kinh tế (`economy`) | Coin có cân, vật phẩm nào bán được? | Dải KPI · Cân bằng Coin · Coin phát/tiêu theo ngày · Nguồn Coin vào · Coin tiêu theo loại · Hiệu quả vật phẩm | `/shop/:id`, `/missions/:id` |
| Scan (`scan`) | Scan có ra từ học được không? | Dải KPI · Phễu scan → có nhãn → có từ → lưu · Độ tin cậy nhãn · Thời gian xử lý và lỗi · Nhãn chưa có từ | `/ai-scan` |

- Toolbar: kỳ **7 / 30 / 90 ngày** và **Xuất CSV** (một bảng mỗi tab). Tab Giữ chân không theo kỳ.
- Tab "Tổng quan điều hành" của bản cũ đã gộp vào Dashboard (review §3.2).
- Bố cục giữ mật độ bản mock cũ (dải số liệu, lưới nhiều tầng, biểu đồ, bảng dày); chỉ thay dữ liệu ngoài scope.

**Đã bỏ khỏi bản cũ** (không có trong domain): CEFR, hộp Leitner, Gems, Streak Freeze, "doanh thu" Shop, % độ tin cậy AI, cặp nhầm lẫn từ báo cáo người học (OQ-ADS-02 FUTURE), GPU auto-scale, Gemini, Cloudflare R2, "khả năng cứu vãn %".

## 2. Quy tắc dữ liệu

### 2.1. Định nghĩa

| Khái niệm | Định nghĩa (nguồn thật khi có API) |
| :--- | :--- |
| Trạng thái thẻ | `fsrs_records.state`: NEW · LEARNING · RELEARNING · REVIEW; **Thành thạo** = REVIEW và `stability ≥ 21` (`ProgressService.MASTERED_STABILITY`); SUSPENDED tính vào tổng, không có cột. **Mới** gồm cả từ người học tự lưu mà chưa ôn lần nào (chưa có `fsrs_records`) |
| Độ chính xác quiz | `quiz_questions.outcome` CORRECT / (CORRECT + INCORRECT), theo `topic_item_id` → chủ đề con → nhóm gốc |
| Chủ đề khó | Đúng < 60% khi có ≥ 20 câu trả lời. Dưới 20 câu: nhãn "mẫu nhỏ", xếp cuối, không bao giờ là "khó" |
| Quên | Tổng `fsrs_records.lapses` hiện tại của mục từ, cộng trên mọi người học (từ trước tới nay, không theo kỳ: backend không lưu lịch sử ôn) |
| Cohort | Tuần đăng ký (`users.created_at`, tuần bắt đầu thứ Hai, giờ VN); ô tuần N = số người của cohort có học trong tuần N sau đăng ký |
| Chuỗi | `longest_streak_days` (kỷ lục của mỗi người); mốc 7 và 30 ngày là huy hiệu STREAK_7, STREAK_30 |
| Coin vào / ra | `coin_transactions`: MISSION_REWARD (gồm Coin dự phòng của quà vật phẩm) / SHOP_PURCHASE. ADMIN_ADJUSTMENT hiện 0, FUTURE (OQ-ADS-07) |
| Phễu scan | Gửi = `scan_requests`; Có nhãn = DONE và `detection_count > 0`; Có từ = ≥ 1 nhãn có mục từ điển; Lưu = người học lưu ≥ 1 từ từ lượt đó |
| Độ tin cậy nhãn | `reliability` theo nguồn (ai-service `reliability_by_source`): HIGH = od, od_tile · MEDIUM = self, dense · LOW = base. Không hiện %: `score` là hằng số xếp hạng |

### 2.2. Nhóm cần chú ý

| ID | Quy tắc | Gợi ý |
| :--- | :--- | :--- |
| `STREAK_AT_RISK` | Chuỗi ≥ 3 ngày, hôm nay chưa học | Nhắc ôn trước khi hết ngày |
| `IDLE_8_30` | Lần học cuối cách 8–30 ngày (khớp bộ lọc của màn Người học) | Mời quay lại; xem nhiệm vụ có quá khó không |
| `NEVER_STUDIED` | Đã kích hoạt, chưa học lần nào | Xem lại hướng dẫn lần đầu |
| `PENDING_EMAIL` | Chưa xác minh email | Kiểm tra email xác minh |

Gửi tin hệ thống: API A8 đã có, màn Thông báo chưa dựng.

### 2.3. Mẫu nhỏ

Dưới **200 người học đã kích hoạt** (hằng số `ANALYTICS_THRESHOLDS.minRetentionN`), tab Giữ chân hiện ghi chú "Mẫu nhỏ", ô cohort hiện **số người tuyệt đối** thay vì %, và khối cohort mang nhãn **Tương lai**. Từ 200 người trở lên mới hiện %.

### 2.4. Câu kết luận

Hàm thuần trong `src/domains/admin-analytics/mappers.ts`. Ngưỡng chỉ là gợi ý đọc (P7):

| Khối | Kết luận | Ngưỡng |
| :--- | :--- | :--- |
| Trạng thái thẻ | Tỉ lệ thẻ chưa ôn + thẻ đến hạn | > 30% thẻ Mới → cảnh báo |
| Nhóm chủ đề, Chủ đề khó | Nhóm/chủ đề đúng thấp nhất | 60%, 20 câu |
| Chuỗi | Bước rơi lớn nhất giữa ngày d và d + 1 (`streakDrop`) | — |
| Cân bằng Coin | Tiêu / phát (`coinVerdict`, dùng chung với Dashboard) | < 50% dư · > 90% thiếu chỗ kiếm |
| Hiệu quả vật phẩm | Vật phẩm chiếm nhiều Coin tiêu nhất + số vật phẩm đang bán chưa ai mua (`itemPerformance`) | Xu hướng: ±15% so với kỳ liền trước |
| Phễu scan | Bước có tỉ lệ chuyển đổi thấp nhất (`funnelSteps`) | — |
| Nhãn chưa có từ | Nhãn gặp nhiều nhất | Đậm từ 10 lượt/7 ngày (quy theo kỳ) |

## 3. Contract đề xuất

`GET /api/admin/analytics?days=7|30|90` → `AdminAnalytics` (`src/domains/admin-analytics/types.ts`). Chuỗi ngày có đúng `days` điểm, kết thúc hôm nay (giờ VN). `retention` cố định, không theo `days`.

Đặc tả backend: [admin_analytics_backend.md](../../../docs/sa/admin_analytics_backend.md) (nền chung ở [admin_overview_backend.md](../../../docs/sa/admin_overview_backend.md) §2).

Chạy dữ liệu mẫu sau cờ `VITE_ADMIN_ANALYTICS_FIXTURES` (mặc định bật ở dev). Fixture khớp màn Người học (cùng 48 người, 44 đã kích hoạt), chủ đề thật của collection hệ thống "Vocabulary" (link mở đúng chủ đề trên DB local), mã nhiệm vụ `MissionCatalogSeeder`, mã và giá `shop_items`, mã lỗi `ScanErrorCode`, cấu hình `application.yaml`. Người học tiêu khoảng 40% số Coin nhận được, khớp Dashboard.

## 4. Câu hỏi mở

| ID | Câu hỏi |
| :--- | :--- |
| OQ-ANL-01 | Chốt ngưỡng §2.3–2.4: 200 người học cho giữ chân theo %, 60% và 20 câu cho chủ đề khó, ±15% xu hướng, vùng 50–90% tiêu/phát |
| OQ-ANL-02 | "Lưu" trong phễu scan cần nối lượt scan với mục từ được lưu; backend hiện chưa ghi nguồn của TopicItem. Hướng xử lý: `topic_items.source_scan_id` (đặc tả backend G3); tới lúc đó API trả `saved = null` và màn ghi "chưa đo được" |
| OQ-ANL-03 | Nút "Xem người học" của từng nhóm cần màn Người học nhận bộ lọc từ URL (hiện mở danh sách chung) |

## 5. Truy vết

| Nội dung | Code | Test |
| :--- | :--- | :--- |
| Contract, fixture | `domains/admin-analytics/{types,fixtures,api,queries}.ts` | `tests/admin-analytics.test.ts` (A1) |
| Phễu, Coin, vật phẩm, chủ đề, giữ chân, CSV | `domains/admin-analytics/mappers.ts` | A2–A7 |
| Màn hình | `features/analytics/{AnalyticsPage,tabs}.tsx`; khối dùng chung `components/ui/{Panel,SummaryStrip}.tsx` | A8 (đủ 4 tab; kết luận nằm trong dữ liệu; dòng có link; không hộp lời khuyên, không lộ mã, không khái niệm ngoài scope) |
