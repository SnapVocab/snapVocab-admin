# SnapVocab Admin — Đặc tả Thiết kế & Kiến trúc Giao diện

> **Rev 4 · 2026-10-20 · Trạng thái: đã áp dụng vào code, chờ PO duyệt ảnh trước/sau** (PD-ADS-15…22, §13).
> Rev 4 thêm **§3.7 Ngôn ngữ giao diện** sau đánh giá "giao diện vẫn mang đậm chất AI" của PO. Mật độ thông tin giữ nguyên; thứ thay đổi là cách trình bày. Các điều khoản cũ sinh ra khuôn lặp đã được sửa: §2 P5, §3.3, §3.4, §3.5, §4.1, §4.2, §5.1, §5.2.
>
> **Rev 3 · 2026-10-19 · PO đã duyệt** (§13). Rev 3 áp [đánh giá sản phẩm 2026-10-19](../../../docs/reviews/admin_product_review_2026-10-19.md):
> - Scope xét theo nhu cầu sản phẩm, không theo backend: **NOW / MOCK / FUTURE / REMOVE**.
> - Mock được khuyến khích nếu gắn nhãn (P5 mới).
> - IA mới (§4).
> - Shell P0 đã dựng.
>
> Rev 2 thay toàn bộ rev 1 (bản prototype có CEFR, workflow Review, `CardViewModel` tự đặt, Gemini fine-tuning).
>
> Đặc tả màn đã áp dụng hướng này: [Cửa hàng](./shop_ui.md) · [Nhiệm vụ hằng ngày](./missions_ui.md).
> Nghiệp vụ: [shop.md](../../../docs/decisions/shop.md), [daily_mission.md](../../../docs/decisions/daily_mission.md), [badges.md](../../../docs/decisions/badges.md). Khi mâu thuẫn, quyết định nghiệp vụ của PO đứng trên tài liệu này; tài liệu này đứng trên code prototype.

---

## 0. Phạm vi

| Tài liệu này quy định | Không quy định |
| :--- | :--- |
| Định vị, nguyên tắc, hệ thống thị giác, IA, mẫu bố cục, quy tắc dữ liệu thật, preview, guardrail, audit, stack, lộ trình | Nghiệp vụ (thuộc `docs/decisions/*`), contract API (thuộc `shop.md` §10.2, [admin_missions_api_design.md](./admin_missions_api_design.md)) |

Đường dẫn dự án: `snapAdmin/` trong repo `snap-vocab` (React + Vite), cùng cấp `SnapVocab/` (mobile, Expo) và `snap-vocab-backend/` (Spring Boot, MySQL, MinIO).

---

## 1. Định vị

```text
┌───────────────────────────────┬───────────────────────────────┐
│ SnapVocab (Mobile)            │ snapAdmin (Web Console)       │
│ Mục tiêu: ENGAGEMENT          │ Mục tiêu: OPERATIONS          │
│ Scan → Learn → Practice →     │ Find → Inspect → Edit →       │
│ Reward                        │ Validate → Publish → Audit    │
└───────────────────────────────┴───────────────────────────────┘
```

Phân bổ trọng tâm:

```text
                    SNAPVOCAB ADMIN
                           │
          ┌────────────────┼────────────────┐
          ▼                ▼                ▼
     DATA / SaaS      CONTENT / AI       LIVEOPS
        40%               35%               25%
  (Learners, bảng,   (Từ vựng, Mẫu thẻ,  (Cửa hàng, Nhiệm vụ,
   Activity Log)      AI Scan)            Huy hiệu, Kinh tế)
```

**shadcn/ui là hạ tầng, không phải bản sắc.** Admin lấy kỷ luật, mật độ và khả năng dùng của shadcn/Vercel/Supabase, workflow nội dung của Sanity/Strapi, tư duy LiveOps của game dashboard, rồi phủ brand SnapVocab lên trên. Kết quả phải trông như sản phẩm thật, không như template dashboard.

---

## 2. Nguyên tắc bắt buộc

| ID | Nguyên tắc | Hệ quả kiểm tra được |
| :--- | :--- | :--- |
| **P1** | Admin UI ≠ Mobile UI | Bố cục tối ưu cho tác nghiệp: bảng dày, lọc, so sánh. Không sao chép màn mobile làm màn admin; mobile chỉ xuất hiện trong khung preview. |
| **P2** | CRUD là tầng thấp nhất | Mỗi bề mặt đi theo vòng đời thật của domain (Shop: `DRAFT → PUBLISHED → ARCHIVED`; Missions: Tắt/Bật + `version`). Không bịa trạng thái domain không có (CEFR, "In Review"): xem OQ-ADS-01. |
| **P3** | Mọi thao tác nhạy cảm phải audit được | Danh sách và thiết kế ở §8. Chưa có audit thì UI không giả lập lịch sử. |
| **P4** | Preview dùng cùng domain model với mobile | Preview dựng từ cùng dữ liệu, quy tắc và copy mà app dùng. Không dựng một "FlashcardPreview" HTML tùy ý. Hợp đồng chi tiết ở §6. |
| **P5** | **Không hiển thị dữ liệu giả như dữ liệu thật** · *Backend readiness ≠ Product requirement* | Mỗi màn mang một nhãn scope **NOW / MOCK / FUTURE / REMOVE** (§4). **Mock được khuyến khích** để kiểm chứng UX trước khi đầu tư backend, với bốn điều kiện: (1) đúng scope sản phẩm; (2) có **một** `SampleDataNotice` ở đầu trang, gắn với cờ fixture, nói rõ phần nào là mẫu, phần nào là thật và đang chờ API nào; (3) cảnh báo trong "Cần xử lý" dựng từ số liệu mẫu ghi "dữ liệu mẫu" ngay trên dòng (người vận hành có thể hành động theo nó); không gắn nhãn mẫu lên từng khối hay từng con số; (4) chạy sau cờ `VITE_*_FIXTURES` và không có trong bản release. |
| **P6** | Thông tin trước, trang trí sau | Data-dense, không card-dense: số liệu là chữ và số trong dải hoặc bảng, không phải card khổng lồ một icon một con số. Asset 3D và thẻ preview chỉ dùng ở bề mặt LiveOps và preview. |
| **P7** | Cảnh báo UI ≠ quy tắc nghiệp vụ | Guardrail trên UI chỉ là gợi ý ("không chặn lưu"). Quy tắc thật phải nằm ở backend (§7). |

---

## 3. Hệ thống thị giác

### 3.1. Token màu (`tailwind.config.js`)

| Token | Hex | Dùng cho |
| :--- | :--- | :--- |
| `background` | `#F8F9F7` | Nền trang |
| `surface` / `surface-subtle` | `#FFFFFF` / `#F3F4F6` | Card, bảng, form / hàng nhóm, ô đang chọn |
| `border` / `border-strong` | `#E5E7EB` / `#D1D5DB` | Viền mảnh / viền nút secondary, tile nháp |
| `text` / `text-muted` / `text-light` | `#171717` / `#6B7280` / `#9CA3AF` | Chữ chính / phụ / số 0, chú thích mờ |
| `primary` / `primary-solid` / `primary-dark` | `#58CC02` / `#3A8200` / `#2F6E00` | Màu brand / nền nút có chữ trắng (≥ 4.5:1) / chữ trạng thái xanh |
| `snapy` | `#FF8A00` | Snapy, streak, AI Scan |
| `reward` / `reward-dark` | `#FFC42E` / `#8A6100` | Kinh tế: Coin, giá, phần thưởng |
| `info` / `info-dark` | `#1CB0F6` / `#0B6E99` | Thông tin, lịch hẹn, ghi chú hệ thống |
| `warning` / `warning-dark` | `#F59E0B` / `#8A4B00` | Cần chú ý, guardrail UI |
| `danger` / `danger-solid` / `danger-dark` | `#EF4444` / `#DC2626` / `#B91C1C` | Lỗi, phá hủy, vi phạm invariant |

### 3.2. Ngữ nghĩa màu

> **Xanh lá = hành động/đang hoạt động · Cam = Snapy/streak/scan · Vàng = kinh tế/phần thưởng · Xanh dương = thông tin · Đỏ = phá hủy/lỗi.**

- Không dùng đồng thời cả 5 màu trong cùng một cụm thông tin.
- Nút có chữ trắng luôn dùng `primary-solid`: `#58CC02` chỉ đạt 2.2:1 với chữ trắng.
- Trạng thái đã kết thúc (Đã lưu trữ, Hết hạn) dùng tone trung tính, không dùng đỏ.

### 3.3. Chữ và mật độ (rev 4)

Thang chữ là token trong `tailwind.config.js` (`fontSize`), không dùng cỡ lẻ `text-[11px]`, `text-[13px]`:

| Cấp | Token | Cỡ / độ đậm | Dùng cho |
| :--- | :--- | :--- | :--- |
| Tiêu đề trang | `text-xl` | 20px / 600 | `PageHeader`, tiêu đề editor, tên hồ sơ |
| Tiêu đề khối | `text-sm` | 14px / 600 | `Panel`, kệ Cửa hàng, nhóm |
| Chữ chạy, control | `text-body` | 13px / 400–500 | mô tả, nút md, ô tìm, tên trong bảng |
| Bảng, meta | `text-xs` | 12px | ô bảng, nhãn số liệu, chú thích, tiêu đề cột |
| Mã, trục biểu đồ | `text-2xs` | 11px | mã (`font-mono`), nhãn trục |
| Con số dẫn | `text-figure` | 20px / 600, tabular | ô của dải số liệu |

- Font Inter, bật `cv05` + `cv08` để l / I / 1 không lẫn trong mã và email.
- **800 (extrabold) không dùng** trong admin; độ nhấn đến từ cấp chữ và màu, không từ việc in đậm mọi thứ.
- **Không viết hoa giãn chữ** cho tiêu đề cột, nhãn nhóm hay `SectionLabel`; viết hoa chỉ còn trong khung mô phỏng điện thoại.
- Sàn cỡ chữ 11px, chỉ cho mã và trục biểu đồ. Chữ nhỏ hơn chỉ ở trong khung mô phỏng điện thoại.
- Số trong bảng canh phải, `tabular-nums`.
- `cn()` (`lib/utils.ts`) đã khai báo các cỡ tùy biến cho `tailwind-merge`; thêm cỡ mới thì khai báo ở cả hai chỗ (`tests/ui-tokens.test.ts` kiểm).

### 3.4. Hình khối và khoảng cách (rev 4)

- **Bo góc:** control, khối, bảng, dải số liệu, tile, modal đều `rounded-lg`; phần tử nhỏ trong khối `rounded-md` / `rounded`. Không dùng `rounded-2xl` ngoài khung mô phỏng điện thoại.
- **Khoảng cách:** trang `p-4 sm:p-6`; khoảng giữa các khối `gap-4`.
- **Bóng và lớp phủ:** không đổ bóng mặc định; `shadow-modal` cho modal, `shadow-elevated` cho tooltip/toast. Lớp phủ modal `bg-black/40`, không làm mờ nền (blur).
- **Không gradient** trang trí. Ô chưa có ảnh dùng khung đứt nét "Chưa có ảnh", không tô gradient để che chỗ thiếu.

### 3.5. Button và Badge (`src/components/ui`)

Tách màu **hành động** khỏi màu **trạng thái**: nút "Phát hành" và badge "Đã phát hành" cùng nhóm xanh nhưng khác độ nổi bật.

| Button | Dùng cho |
| :--- | :--- |
| `primary` | Hành động chính của khu vực, **mỗi khu vực một nút**. Nền `primary-solid`. |
| `secondary` | Hủy, quay lại, xem trước, hành động đứng cạnh primary |
| `ghost` | Thao tác trong bảng, mở menu |
| `danger` | **Xác nhận** thao tác không hoàn tác. Nền `danger-solid`. |
| `danger-outline` | Nút **mở** bước xác nhận nguy hiểm |

- Kích thước: `sm` 32px/12px · `md` 36px/13px (mặc định) · `lg` 40px/14px.
- Khi `loading`, nút giữ nguyên bề rộng.
- Nút chỉ có icon bắt buộc có `label`.

**Badge chỉ dành cho trạng thái là điểm chính của dòng** (rev 4): ngoại lệ (Đã khóa, Chờ kích hoạt, Hết thời gian bán, Chưa ai mua, Trùng) hoặc bước vòng đời khác nhau giữa các dòng. Trạng thái mà gần như mọi dòng đều có (Hoạt động, Đang bật, Đang mở bán) là chữ thường màu `text-muted`. Badge là ô vuông nhỏ (`h-5 rounded`), không phải viên thuốc.

| Badge tone | Ý nghĩa |
| :--- | :--- |
| `neutral` | Chưa hoạt động hoặc đã kết thúc |
| `info` | Thông tin, đã lên lịch |
| `success` | Đang hoạt động |
| `warning` | Cần chú ý (có thay đổi chưa lưu) |
| `danger` | Lỗi hoặc bị chặn |
| `reward` | Trạng thái kinh tế (chỉ dùng làm quà) |

Độ tương phản của mọi tone được kiểm bằng `tests/ui-tokens.test.ts`.

### 3.6. Icon

| Loại | Nguồn | Danh sách |
| :--- | :--- | :--- |
| **Chức năng** | `lucide-react` | Search, Filter, Chevron, Arrow, Edit, Delete, Settings, Download, Upload, Calendar, Sort, More, Refresh, Lock, Copy, LayoutGrid/List |
| **Brand / ngữ nghĩa** | `src/components/brand/BrandIcons.tsx` | `CoinIcon` (coin 3D), `XpIcon` (orb XP 3D), `BoosterIcon`, `ThemeIcon`, `FrameIcon`, `StreakFlameIcon`, `SnapyIcon`, `RewardGiftIcon`, `BadgeMedalIcon`, `ScanLensIcon` |

Quy tắc:

1. Icon brand chỉ dùng cho khái niệm kinh tế, LiveOps hoặc brand (Coin, XP, Booster, Khung, Giao diện, Streak, Snapy, Quà, Huy hiệu, Scan). Không dùng cho thao tác chức năng.
2. Icon brand **port từ mobile** (`SnapVocab/src/components/ui/icons`, `ui/rewards`) để hai sản phẩm cùng một hệ sinh thái. Đổi hình ở mobile thì đồng bộ sang admin.
3. Màu ô icon nhóm nhiệm vụ lấy đúng bảng màu của mobile (xem [missions_ui.md](./missions_ui.md) §4.3).
4. SVG có gradient phải dùng id riêng cho từng instance (`useId`), vì một trang có thể vẽ nhiều icon cùng lúc.
5. (rev 4) Icon chức năng đứng **trước hành động hoặc mục điều hướng**, không đứng trước tiêu đề trang hay tiêu đề khối. Icon brand không lặp trên mỗi dòng bảng (đồng xu, lửa, XP); đơn vị viết bằng chữ ("15 Coin").

### 3.7. Ngôn ngữ giao diện (rev 4)

Mục tiêu: admin trông như công cụ một đội vận hành dùng hằng ngày, không như template dashboard. **Giữ mật độ thông tin** (PO đã từ chối bản tối giản hai lần); thứ thay đổi là cách trình bày.

| ID | Quy tắc | Kiểm bằng |
| :--- | :--- | :--- |
| **G1** Thứ bậc | Mỗi trang có một tiêu đề và một nhóm hành động. Khối quan trọng nhất đứng đầu và rộng nhất (Dashboard: "Cần xử lý"). | Ảnh chụp trước/sau |
| **G2** Khối | `Panel` gồm tiêu đề, meta ngắn (kỳ, số lượng) và tối đa một link ra ngoài. Không ô icon màu, không dòng mô tả tự giới thiệu, không nhãn scope cho từng khối. Các khối trả lời cùng một câu hỏi gộp thành một dải, chia cột bằng đường kẻ thay vì nhiều card. | Code review |
| **G3** Màu | Trung tính là mặc định. Màu chỉ dành cho trạng thái (đỏ lỗi, vàng cảnh báo, xanh dương thông tin), chuỗi dữ liệu trong biểu đồ và nút primary. Không gán màu cho khối chỉ để phân biệt khối. Mục đang chọn (sidebar, cây, dòng) dùng nền xám, không dùng xanh brand. | §3.2 |
| **G4** Trạng thái | Badge cho ngoại lệ; trạng thái mà dòng nào cũng có là chữ thường (§3.5). | Test render |
| **G5** Lời | Tiếng Việt viết cho người vận hành. Không mã spec (F-…, PD-…, OQ-…, "design.md") trên giao diện. Enum và mã kỹ thuật đổi thành nhãn qua module dùng chung (`domains/scan/labels.ts`, `formatShopItemStatusLabel`…); mã gốc nằm trong tooltip hoặc dòng "Mã kỹ thuật". Thuật ngữ nghề giữ nguyên có chủ đích: LiveOps, Dashboard, Coin, XP, Streak, Booster, Slot, AI Scan. Không nối nhiều mệnh đề bằng chuỗi "·"; tách bằng cột, khoảng cách hoặc dấu phẩy. | `admin-analytics.test.ts` A8, `admin-overview.test.ts` O7 |
| **G6** Kết luận | Kết luận tính từ dữ liệu được **vẽ vào dữ liệu**: thứ tự sắp xếp, dòng tô màu, dấu trên biểu đồ, meta của khối. Không có hộp 💡, "Chẩn đoán" hay "Nên làm" cuối khối. Lời khuyên hành động chỉ nằm ở "Cần xử lý". Nút chỉ hứa điều nó làm được: tính năng chưa có thì dùng link điều hướng ("Mở AI Scan"), không ghi "Gán nhãn → từ". | A8, O7 |
| **G7** Biểu đồ | Nối các điểm theo ngày bằng đường thẳng (không bezier), nền phẳng, không chấm ở mọi điểm. Nhãn trục bằng HTML nên không bị kéo giãn. Tooltip ghi số chính xác. | `components/charts` |
| **G8** Mỗi màn một dạng | Dashboard: danh sách việc, rồi các dải theo câu hỏi vận hành. Phân tích: so sánh và xu hướng. Người học: danh bạ và hồ sơ. Cửa hàng: kệ như trong app. Nhiệm vụ: bảng nhóm theo kết quả và mô phỏng một ngày. Từ điển, Chủ đề: bảng dữ liệu và cây. Không áp một bố cục cho mọi màn. | Ảnh chụp |

**Dấu hiệu "template AI" cần tránh** (đã gỡ ở rev 4):

- Ô icon tô màu trước tiêu đề khối.
- Eyebrow lặp lại breadcrumb và tiêu đề.
- Câu mô tả tự thuyết minh dưới mọi tiêu đề.
- 💡, lời khuyên và nút ở cuối mọi khối.
- Nhãn "Mẫu"/"Dữ liệu thật" trên từng khối và icon bình thí nghiệm cạnh từng con số.
- Viên thuốc màu cho trạng thái ở mọi dòng.
- Đường cong bezier kèm gradient.
- Chữ in hoa giãn khắp nơi, độ đậm 800 cho mọi con số.
- Emoji làm logo, favicon mặc định của Vite.

---

## 4. Kiến trúc thông tin (IA)

### 4.1. Sidebar và scope (rev 3)

- Sidebar thu gọn được nhưng mặc định không phải dạng chỉ-icon.
- Nhóm (rev 4, tiếng Việt): **Tổng quan → Nội dung → LiveOps → Người dùng → Hệ thống**.
- (rev 4) Không có thanh header trên cùng và không có eyebrow: sidebar đã cho biết trang thuộc nhóm nào, tiêu đề trang đã nêu tên màn. Ô chuyển nhanh (Ctrl/⌘K) nằm đầu sidebar. Logo là Snapy (`public/brand/snapy.png`, chép từ tài sản mascot của app mobile); favicon cũng là Snapy.
- Nguồn route duy nhất: `src/components/layout/nav.ts`. Sidebar và Command Palette đều đọc từ đây.

| Section | Mục (route) | Scope | Trạng thái 2026-10-19 |
| :--- | :--- | :--- | :--- |
| OVERVIEW | Dashboard (`/`) | MOCK · **NOW** ("Cần xử lý" của Shop/Missions, trạng thái catalog, thay đổi gần đây) | **Đã làm lại 2026-10-19** theo hướng **C · Bảng điều phối vận hành** ([dashboard_ui.md](./dashboard_ui.md)) |
| | Phân tích (`/analytics/:tab`) | MOCK · **NOW** (tên chủ đề, vật phẩm, giá, trạng thái bán, mẫu nhiệm vụ) · FUTURE (giữ chân theo % khi < 200 người học) | **Đã làm lại 2026-10-19**: 4 tab Học tập · Giữ chân · Kinh tế · Scan, mỗi biểu đồ có kết luận + hành động ([analytics_ui.md](./analytics_ui.md)) |
| LEARNING | Từ điển (`/dictionary`, `/dictionary/:word`) | **NOW** (tra cứu) · MOCK (sửa) · FUTURE (ảnh hưởng, xóa mềm) | **Đã làm lại 2026-10-19** ([dictionary_ui.md](./dictionary_ui.md)) |
| | Chủ đề (`/topics/:collectionId/:rootId/:childId`) | **NOW** (collection CRUD; tạo chủ đề; thêm mục từ; đổi mẫu thẻ) · cần API (sửa/xóa chủ đề và mục từ, Nháp/Phát hành) | **Đã làm lại 2026-10-19** ([topics_ui.md](./topics_ui.md)) |
| | Mẫu thẻ (`/templates`) | **NOW** (sửa mẫu hệ thống qua schema) + MOCK | Bản mock cũ |
| | AI Scan (`/ai-scan`) | MOCK (Vận hành · Nhãn chưa có từ · Lịch sử) | Bản mock cũ. Gộp Scan Monitor |
| LIVEOPS | Nhiệm vụ hằng ngày (`/missions`, `/missions/:id`) | **NOW** | Đã làm lại (rev 2). Thêm panel Hiệu quả: MOCK |
| | Cửa hàng & Vật phẩm (`/shop`, `/shop/:id`) | **NOW** | Đã làm lại (rev 2). Thêm panel Hiệu quả: MOCK |
| | Huy hiệu (`/badges`) | **NOW** P1 · MOCK P2 | Sau cờ `VITE_ADMIN_BADGES_ENABLED` |
| | Thông báo | **NOW** (composer, A8) · MOCK (lịch sử) | Chưa có màn |
| | Bảng xếp hạng (xem) | FUTURE | Chờ phía người học phát hành |
| PEOPLE | Người học (`/learners`, `/learners/:id`) | **MOCK** | **Đã dựng 2026-10-19** ([learners_ui.md](./learners_ui.md)) |
| | Phản hồi (bản gọn) | FUTURE | Chờ OQ-ADS-02. Tab "Thiếu từ" nằm trong AI Scan |
| SYSTEM | Activity Log (`/activity-log`) | MOCK | Bản mock cũ. Rút gọn thành luồng sự kiện + diff |
| — | Seasons/Leagues, Decks, Settings, Admins & Roles, Báo cáo kiểu SLA | **REMOVE** | Đã gỡ khỏi route và sidebar (file prototype còn trên đĩa, chờ xóa) |

### 4.2. Quy tắc hiển thị theo bản build

| Bản build | Hiển thị |
| :--- | :--- |
| **Dev / demo** (`DEV` hoặc `VITE_ADMIN_DEMO=true`) | Mục NOW, MOCK và mock cũ. Mục MOCK có chữ nhỏ màu nhạt "mẫu" trên sidebar và một `SampleDataNotice` ở đầu trang. Mock cũ có chữ "cũ" và banner "Bản mock cũ, chưa thiết kế lại theo đặc tả rev 3" |
| **Release** | Chỉ mục NOW. Đường dẫn lạ về màn NOW đầu tiên |

Điều hướng dùng History API (`src/lib/router.ts`), không thêm thư viện. Mỗi editor có deep link riêng; F5 mở lại đúng màn. Khi hosting bản release cần SPA fallback (trả về `index.html` cho mọi đường dẫn).

---

## 5. Mẫu bố cục (UI grammar)

Mỗi mẫu dưới đây đã có bản dựng tham chiếu. Màn mới phải chọn một trong các mẫu này trước khi đặt bố cục riêng.

### 5.1. Page header (`PageHeader`, rev 4)

- Gồm: tiêu đề (`text-xl` 600); mô tả **chỉ khi** trang có quy tắc hoặc đơn vị mà người vận hành cần để đọc đúng (ví dụ Cửa hàng: "Giá quy ra ngày…", Nhiệm vụ: "Mỗi ngày… 5 nhiệm vụ"); bên phải là trạng thái trang ("Cập nhật 14:21") và tối đa một nút primary.
- Không eyebrow, không icon cạnh tiêu đề, không câu tóm tắt trang thấy gì.
- Màn editor không dùng `PageHeader`. Editor có header dính riêng (§5.5): nút quay lại, tiêu đề, badge vòng đời, "phiên bản N".

### 5.1b. Khối (`Panel`, rev 4)

`components/ui/Panel.tsx` là khung chung của Dashboard, Phân tích và hồ sơ người học: tiêu đề `text-sm` 600, `meta` (kỳ, số lượng, ngưỡng) ngay sau tiêu đề, một `action` (`TextLink`) ở góc phải. Cùng file có `Mini`/`MiniStrip` (số nhỏ trong khối), `Bar`, `PanelSkeleton`, `SourceError`. Dải nhiều cột (Dashboard) dùng `bodyClassName="p-0"` và chia cột bằng `divide-x`.

### 5.2. Dải số liệu (Summary strip)

Thay cho hàng card KPI. Đây là một dải viền duy nhất, các ô ngăn bằng vạch dọc:

```text
┌──────────┬───────────┬───────────┬─────────┬──────────┬─────────────────────┐
│ 19       │ 13        │ 0         │ 1       │ 2        │ Giá đang bán · 9 vp │
│ Vật phẩm │ ● Đang bán│ ● Chờ bán │ ● Quà   │ ● Nháp   │ 🪙 350–1.500 · ≈4–18 ngày │
└──────────┴───────────┴───────────┴─────────┴──────────┴─────────────────────┘
```

| Quy tắc | Chi tiết |
| :--- | :--- |
| Nguồn số | Tính trên **toàn bộ** tập dữ liệu, không phải trang hiện tại |
| Ô = bộ lọc | Bấm một ô để lọc theo nhóm đó, bấm lại để bỏ lọc. Ô đang chọn có nền xám, vạch dưới màu chữ và `aria-pressed` |
| Số 0 | Hiện chữ `text-light`, nút bị vô hiệu (trừ khi đang chọn) |
| Ô ngữ cảnh bên phải | Một kết luận kinh tế hoặc vận hành: dải giá, "Đủ 5 nhiệm vụ mỗi ngày", thưởng/ngày |
| KPI có sparkline (`KpiCell`) | Số `text-figure`, ngữ cảnh ("/ 44", "lỗi 9,7%"), nhãn; sparkline một tông xám, cột hôm nay đậm hơn. Không icon, không màu riêng cho từng ô |
| Hiện thực | `components/ui/SummaryStrip.tsx` (StripCell, StripNote, StatCell, KpiCell, Spark) |

### 5.3. Toolbar

- Gồm: tab phân loại dạng segmented (có số đếm và icon brand nếu là khái niệm brand), ô tìm kiếm, nút đổi kiểu hiển thị, nút làm mới chỉ có icon.
- Lọc trạng thái nằm trên dải số liệu, không lặp lại ở toolbar.

### 5.4. Kiểu hiển thị dữ liệu

| Kiểu | Dùng khi | Tham chiếu |
| :--- | :--- | :--- |
| **Bảng dày** | Màn Data/SaaS, so sánh và thao tác nhanh. Thao tác trên hàng căn phải, "Sửa" luôn ở cuối | Shop (dạng bảng), Missions |
| **Lưới storefront** | Danh mục vật phẩm LiveOps có hình ảnh. Có nút chuyển qua bảng. Chia kệ theo loại, đúng thứ tự người học thấy | Shop |
| **Bảng nhóm theo kết quả** | Cấu hình mà vị trí trong nhóm quyết định kết quả cho người học. Đầu nhóm có câu kết luận **tính từ dữ liệu**, chuyển đỏ khi nhóm làm hỏng kết quả | Missions |
| **Bảng TanStack** (mục tiêu) | Phân trang phía server, chọn nhiều, bulk action (Từ vựng) | P2 |

### 5.5. Editor dạng builder (Form + Preview)

Editor là trang riêng, không đặt form dài trong modal:

```text
┌ Header dính: ← · breadcrumb · Tiêu đề [Badge trạng thái] vN · "Có thay đổi chưa lưu" ── [phụ] [Primary] ┐
├──────────────────────────────────────────────┬──────────────────────────────┤
│ CƠ BẢN ───────────────────────────           │ XEM TRƯỚC TRÊN ỨNG DỤNG ───  │
│ …                                            │ (bản mô phỏng mobile thật)   │
│ <MỤC TIÊU / LOẠI & CẤU HÌNH> ─────           ├──────────────────────────────┤
│ …                                            │ TÁC ĐỘNG / GUARDRAIL ──────  │
│ PHẦN THƯỞNG / BÁN TRONG CỬA HÀNG ─           ├──────────────────────────────┤
│ …                                            │ VÒNG ĐỜI ───────────────────  │
└──────────────────────────────────────────────┴──────────────────────────────┘
```

| Quy tắc | Chi tiết |
| :--- | :--- |
| Thứ tự section | Theo thứ tự người vận hành tạo ra đối tượng. Tiêu đề section dùng `SectionLabel` (chữ hoa 11px + vạch kẻ) |
| Cột phải | Rộng 340–360px, dính khi màn ≥ xl. Thứ tự cố định: Preview → Tác động/Guardrail → Vòng đời |
| Nút primary | Duy nhất là Lưu hoặc Tạo. "Phát hành" và "Bật" là nút phụ. Nút mở bước phá hủy dùng `danger-outline` |
| Trường bị khóa | Có nhãn khóa kèm lý do khi hover |

### 5.6. Content Studio (mục tiêu P2)

Dùng cho Từ vựng và Mẫu thẻ. Chia ba cột: danh sách (280px) · editor · preview mobile (≤ 380px). Preview tuân §6. Màn này chưa được dựng, chờ API.

### 5.7. Console hàng đợi AI Scan (mục tiêu P3)

- Thứ tự tab ưu tiên việc cần xử lý: 🔴 Báo cáo (nếu OQ-ADS-02 duyệt) → 🟡 Độ tin cậy thấp (`reliability = LOW`, `detection_count = 0`, `FAILED`) → 🟢 Gần đây → Gán nhãn (Label mapping) → Phân tích/Sức khỏe.
- Không hiển thị "% confidence": `DetectionDTO.score` là hằng số xếp hạng theo nguồn, không phải độ tin cậy.
- Màn chi tiết gồm ảnh, kết quả AI và gợi ý từ, với hai nút [Duyệt] [Sửa nhãn → gán từ vựng].

### 5.8. Trạng thái màn

| Trạng thái | Hiển thị |
| :--- | :--- |
| Đang tải | Skeleton đúng hình dạng view (tile hoặc hàng bảng) |
| Lỗi | Banner `danger` kèm "Thử lại" |
| Dữ liệu cũ sau lỗi làm mới | Báo rõ "đang hiển thị bản đã tải trước đó" |
| Trống | Lời giải thích kèm CTA tạo |
| Lọc không có kết quả | Nút "Xóa bộ lọc" |

### 5.8b. Màn đăng nhập (rev 4, 2026-10-20)

- **Từ 1024px chia hai cột.**
  - Bên trái nền `snapy-light`, gồm: logo chữ, câu tiêu đề của chính app mobile ("Học tiếng Anh từ thế giới xung quanh bạn", `welcome.title` trong vi.json), và cảnh một lượt quét.
  - Cảnh quét: Snapy với khung nhận diện, nhãn và thẻ kết quả, chép đúng màn kết quả scan của app (`SnapVocab/src/features/scan`: viền 2px bo 6px, màu `BOX_COLORS`, thẻ có dải màu 6px).
  - Từ "fox" (/fɑks/, "Con cáo.") lấy từ từ điển SnapVocab.
  - Màn hẹp hơn 1024px chỉ giữ dải thương hiệu phía trên form.
- **Bên phải là form**, dùng `Field` và `Button` chung:
  - Nút "Hiện/Ẩn" mật khẩu bằng chữ, có báo Caps Lock.
  - Lỗi kiểm tra hiện theo từng trường, rồi focus vào ô lỗi đầu tiên. Lỗi máy chủ hiện trong một banner.
- **Không dùng:** placeholder để lộ email admin mặc định, số phiên bản tự đặt, khẩu hiệu "Console", nền chấm bi, icon trong ô nhập.
- Bản dev ghi đúng một dòng về các màn dữ liệu mẫu.
- Kiểm tra form là hàm thuần `validateLogin` (`domains/auth/auth-service.ts`), có test trong `tests/auth.test.ts` (17).

### 5.9. An toàn thao tác

- Thao tác không hoàn tác hoặc ảnh hưởng người học phải qua hộp xác nhận nêu hậu quả.
- Optimistic lock theo `version`. Khi xung đột: giữ bản đang nhập và cho so sánh từng trường với bản trên server trước khi bỏ.
- Có thay đổi chưa lưu: chặn rời trang (`beforeunload` và khi điều hướng trong app).
- Chống gửi đôi.
- Mất phản hồi (lỗi mạng hoặc 5xx): không gửi lại mù. Kiểm tra trạng thái trên server trước, rồi mới cho gửi lại.

---

## 6. Hợp đồng Preview (P4)

| Bề mặt | Nguồn mobile được phản chiếu | Thành phần admin | Mức trung thực |
| :--- | :--- | :--- | :--- |
| Card vật phẩm Shop, theme | `SnapVocab/src/features/shop/theme/theme-context.tsx` (bề mặt sáng/tối), card Cửa hàng/Kho đồ | `ShopItemPreview` (`ShopMobileSimulator`), `artwork.ts` | Bề mặt theme mirror tay (TD-ADS-08); khung avatar theo tỉ lệ 58% |
| Thẻ nhiệm vụ | `SnapVocab/src/features/missions/missions-screen.tsx` (màu ô, copy CTA, "Vật phẩm: CODE") | `MissionCard`, `MissionTile` | Copy và màu giống app; tiến độ luôn 0/N (ngày mới) |
| Bộ 5 nhiệm vụ | Backend `MissionTracker.SLOTS` / `choose` | `dailyOutlook()` | Mô phỏng cùng thuật toán (TD-ADS-09) |
| Thẻ học (mục tiêu P2) | `SnapVocab/src/features/card-renderer/utils/data-resolver.ts` | Chưa có | Phải dùng lại logic resolver, không tự đặt `CardViewModel` |
| Âm thanh (mục tiêu P2) | `SnapVocab/src/lib/hooks/use-tts.ts` (URL Google Translate TTS) | Chưa có | Phát đúng URL mà mobile phát. Không cho chỉnh giọng, tốc độ, cao độ khi mobile chưa hỗ trợ |

Quy tắc về **ngữ cảnh mẫu** trong preview (người học mẫu, ví mẫu, vật phẩm đứng cạnh):

1. Gắn nhãn là mẫu.
2. Chỉ dùng tính năng có thật trong scope. Không có Streak Freeze, League, Gems.
3. Ưu tiên lấy từ dữ liệu thật. Ví dụ: vật phẩm đứng cạnh là item kế tiếp trong catalog, không phải item bịa.

Sai lệch hiện có: TD-ADS-06, TD-ADS-07.

---

## 7. Guardrail LiveOps

| Guardrail | Loại | Ngưỡng | Trạng thái |
| :--- | :--- | :--- | :--- |
| Giá Shop 1–100.000 Coin khi mở bán | Quy tắc backend | `INVALID_PRICE` | Đã có |
| Giá lệch xa dải giá cùng loại đang bán | Gợi ý UI | > ×1,5 giá cao nhất hoặc < giá thấp nhất ÷ 1,5; cần ≥ 3 vật phẩm để so | Đã có (Shop). Ngưỡng: OQ-ADS-04 |
| Giá quy ra "ngày đủ" | Thông tin UI | giá ÷ 85 Coin/ngày | Đã có (Shop) |
| Invariant catalog nhiệm vụ | Quy tắc backend + dự báo UI | ≥ 4 mẫu cốt lõi NONE và (≥ 1 mẫu slot 5 NONE hoặc ≥ 5 mẫu cốt lõi) | Đã có (`MISSION_POOL_INSUFFICIENT`) |
| Thưởng nhiệm vụ/ngày vượt mức kinh tế | Gợi ý UI | trần thưởng/ngày > 85 Coin | Đã có (Missions). Mức trần ở backend: PD-DM-02 chưa chốt |
| Thưởng hoặc giá bất thường → **cần duyệt** | Quy tắc backend + luồng duyệt | Chưa có | CẦN BACKEND + PD (OQ-ADS-04) |

Hiển thị gợi ý: hộp `warning` có `AlertTriangle`, nêu con số so sánh và luôn kết thúc bằng "Gợi ý để rà lại, không chặn lưu." Không dùng toast cho guardrail.

---

## 8. Audit

**Thao tác bắt buộc audit (PO):**

- Sửa từ vựng
- Phát hành nội dung
- Sửa ánh xạ AI
- Đổi giá Shop
- Đổi phần thưởng
- Khôi phục streak
- Cấp vật phẩm hoặc Coin
- Đổi cấu hình hệ thống

**Hiện trạng:**

- Code chưa ghi audit. Backend chỉ có `SecurityAuditLogger`, ghi ra file log.
- DB clone có bảng `mission_admin_audits` (`actor_id, action, target_type ∈ {CONFIG, DELIVERY, TEMPLATE}, target_id, before_json, after_json, reason, version, created_at`) nhưng không có code nào dùng.

**Thiết kế mục tiêu (PD-ADS-10, đề xuất):**

1. Một bảng `admin_audit_log` dùng chung, cùng hình dạng như trên, với `target_type` mở rộng theo từng khu vực.
2. Ghi audit **trong cùng transaction** với thay đổi. Audit thất bại thì thay đổi thất bại theo.
3. Bắt buộc nhập `reason` khi: cấp Coin hoặc vật phẩm, khôi phục streak, ngừng bán vĩnh viễn, giá hoặc thưởng vượt guardrail.
4. UI:
   - Panel "Vòng đời" trong editor đọc 5 bản ghi gần nhất của đối tượng.
   - Màn Activity Log (SYSTEM) lọc theo người thực hiện, khu vực và thời gian.

Cho tới khi có audit, panel "Vòng đời" chỉ hiển thị mốc thời gian thật (tạo, phát hành, sửa gần nhất, version) kèm dòng "Chưa có nhật ký ai sửa gì: cần audit log phía máy chủ."

---

## 9. Đối chiếu domain thật

| Khái niệm trong đề xuất | Thực tế (đã kiểm code 2026-10-18) | Cách xử lý |
| :--- | :--- | :--- |
| Từ vựng có CEFR, Status, Source | `Word` chỉ có word, langCode, pronunciations (ipa, region), translations, definitions, relations | OQ-ADS-01: thêm vào domain hoặc bỏ khỏi UI |
| AI confidence 98% | `DetectionDTO.score` là hằng số xếp hạng, không phải độ tin cậy; chỉ có `reliability` HIGH/MEDIUM/LOW | Dùng `reliability`, không hiện % |
| Hàng đợi "Báo cáo" | Mobile chưa có nút báo scan sai, backend không có bảng | OQ-ADS-02 |
| Tập dữ liệu fine-tune | Model là Florence-2, chưa có pipeline huấn luyện | Ngoài phạm vi. Ưu tiên bảng gán nhãn → từ |
| Bộ thử TTS (giọng, tốc độ, cao độ) | Mobile phát qua URL Google Translate TTS, `Pronunciation` không lưu audio | Preview phát đúng URL đó (§6) |
| Hồ sơ người học: Pro, Retry Tokens | `User` không có gói Pro, không có retry token | Chỉ hiển thị trường có thật: exp, coin, streakDays, longestStreakDays, vật phẩm |
| Mission Builder "Schedule: Daily ▾" | Scope chốt đúng 5 nhiệm vụ mỗi ngày, không có tuần/tháng | Không có trường lịch |
| Cảnh báo thưởng "Normal 10–500, cap 1000" | PD-DM-02 chưa chốt. Mức kinh tế đã duyệt là 85 Coin / 160 XP mỗi ngày | Gợi ý dựa trên 85 (§7) |

---

## 10. Stack

| Lớp | Đề xuất PO | Hiện tại | Quyết định |
| :--- | :--- | :--- | :--- |
| Framework | React + Vite | React 19 + Vite | Giữ |
| Styling | Tailwind CSS | Tailwind 3 + token §3.1 | Giữ |
| UI | shadcn/ui | Bộ UI riêng (`Button`, `Badge`, `PageHeader`, `SectionLabel`) | Chép từng component shadcn vào **khi cần** (Dialog, DropdownMenu, Popover, Command). Không đổi cả admin một lượt (PD-ADS-11) |
| Bảng | TanStack Table | Bảng tự viết | Dùng khi có API phân trang server + bulk (Từ vựng, P2) |
| Form | React Hook Form + Zod | Form có kiểm soát + `validateForm` thuần | Hoãn. Backend là Java nên không dùng chung schema được. Thêm khi có form thật sự khó quản lý (OQ-ADS-05) |
| Biểu đồ | Recharts | Chart tự viết (`components/charts`) | Đề xuất giữ chart tự viết (OQ-ADS-05) |
| State | Zustand / React Query | React Query | React Query giữ dữ liệu server, URL giữ trạng thái UI. Chưa cần Zustand (OQ-ADS-05) |
| Icon | Lucide + custom | Lucide + `BrandIcons` | Giữ (§3.6) |
| Command palette | Có | `CommandPaletteModal` (Ctrl/Cmd+K) | Giữ, nối vào router ở P0 |
| Router | — | `useState` điều hướng, F5 mất trang | **P0**: dùng History API, không thêm thư viện (TD-ADS-01) |
| Theme | Light trước, Dark sau | Light | Giữ |

---

## 11. Cấu trúc mã

```text
snapAdmin/src/
├── components/
│   ├── ui/          Button, Badge, PageHeader (+toolbarControl), Panel (+TextLink, Mini, Bar), SummaryStrip (+KpiCell),
│   │                SectionLabel, SampleDataNotice, ConfirmModal, Drawer, Field, useDialogFocus
│   ├── brand/       BrandIcons (icon brand port từ mobile)
│   ├── layout/      AdminLayout, Sidebar (+ô chuyển nhanh), CommandPaletteModal, nav
│   ├── charts/      chart tự viết
│   └── preview/     (prototype cũ, chờ thay theo §6)
├── domains/<khu-vực>/   types · api · queries · mappers (logic thuần, có test)
└── features/<khu-vực>/  màn hình và component riêng của màn
```

Quy tắc:

- Logic nghiệp vụ và tính toán đặt ở `domains/*/mappers.ts`, dạng hàm thuần, có test trong `tests/`. Ví dụ: `deriveSaleState`, `priceBand`, `dailyOutlook`.
- Không import mock vào bundle release.
- Fixture chỉ chạy sau cờ `VITE_*_FIXTURES`.

---

## 12. Nợ kỹ thuật và sai lệch đã biết

| ID | Nội dung | Ưu tiên |
| :--- | :--- | :--- |
| TD-ADS-01 | ~~Chưa có router~~ | **Xong** 2026-10-19 (`lib/router.ts`) |
| TD-ADS-02 | ~~Sidebar theo IA cũ~~ | **Xong** 2026-10-19 (`layout/nav.ts`). File prototype của mục REMOVE còn trên đĩa, chờ xóa |
| TD-ADS-03 | ~~Eyebrow lệch nhau~~ | **Xong**: Shop, Missions dùng "LiveOps"; Người học dùng "People" |
| TD-ADS-04 | ~~`StripCell` trùng~~ | **Xong**: `components/ui/SummaryStrip` (StripCell, StripNote, StatCell) |
| TD-ADS-05 | Toast và hộp xác nhận bị trùng. Người học dùng `components/ui/ConfirmModal`; Shop (`ShopModals`) và Missions (`ConfirmModal` riêng) chưa chuyển | P0 còn lại |
| TD-ADS-06 | Simulator Shop có ngữ cảnh mẫu ngoài scope: "Bảo hiểm Streak" (Streak Freeze), "Diamond League · Top 1" (League); số mẫu ví/streak/từ đã học không gắn nhãn mẫu | Trước nghiệm thu |
| TD-ADS-07 | `resolveFrameAsset` đoán ảnh khung theo mã khi item chưa upload, nên preview hiện ảnh không thuộc item | Trước nghiệm thu |
| TD-ADS-08 | `THEME_SURFACES` mirror tay từ mobile | Khi registry > vài theme |
| TD-ADS-09 | `SLOTS` và `dailyOutlook` mirror `MissionTracker` ở frontend nên có rủi ro lệch | P1: dùng chung test vector hoặc thêm endpoint outlook |
| TD-ADS-10 | Catalog Shop tải một trang 100 item; có cảnh báo khi vượt | Khi > 100 item |
| TD-ADS-11 | `MAX_COIN_PER_DAY = 85` là hằng số ở frontend | Khi PD-DM-02 đổi, hoặc lấy từ API |
| TD-ADS-12 | Shell chưa responsive (sidebar cố định 240px) | P0 |
| TD-ADS-13 | Tài liệu lệch: `docs/sa/techstack.md` (ghi Next.js), `docs/spec/phan_ra_man_hinh.md`, phần hình thức ở [admin_missions_api_design.md](./admin_missions_api_design.md) §7 | Sau khi chốt rev 2 |
| TD-ADS-14 | `ShopItemCard` có nhãn loại 10px, dưới sàn 11px (§3.3) | Nhỏ |
| TD-ADS-15 | Backend thiếu `PUT`/`DELETE` chủ đề và mục từ (cả service lẫn endpoint) | P1 backend |
| TD-ADS-16 | `DELETE /api/collections/{id}` xóa **cứng** có cascade xuống chủ đề và mục từ (spec: xóa mềm). UI tạm chỉ cho xóa collection rỗng | P1 backend |
| TD-ADS-17 | Dữ liệu lệch schema: 15.663/15.664 mục giữ giải nghĩa ở `main.meaning` (không có trong DEFAULT_ENGLISH), nhóm `meaning` bắt buộc thì trống | Migrate dữ liệu |
| TD-ADS-18 | 2.075 cặp (chủ đề, từ) bị trùng trong nội dung hệ thống | Dọn dữ liệu |
| TD-ADS-19 | Mục từ tải một trang 500 (đủ cho hiện tại: tối đa 500, trung bình 83) | Khi có chủ đề > 500 mục |
| TD-ADS-20 | Ba màn bản cũ (Mẫu thẻ, AI Scan, Nhật ký hoạt động) chưa theo §3.7; vẫn sau banner "Bản mock cũ" | Khi làm lại từng màn (PD-ADS-13) |
| TD-ADS-21 | Fixture người học #101: chưa học lần nào nhưng kỷ lục streak 43 và có huy hiệu streak (lệch AC-LRN-05) | Nhỏ, dữ liệu mẫu |
| TD-ADS-22 | Cảnh báo lint có sẵn: `set-state-in-effect` (CommandPaletteModal, ShopItemEditorPage), `immutability` (DonutChart, chỉ màn cũ dùng) | Nhỏ |

Cập nhật 2026-10-20: **TD-ADS-05** — hộp xác nhận riêng của Nhiệm vụ và `ShopModals` đã cùng hình thức với `ConfirmModal` chung (bo `rounded-lg`, không blur, không ô icon), nhưng vẫn là component riêng. **TD-ADS-06** — đã gỡ "Bảo hiểm Streak" (Streak Freeze), "Diamond League · Top 1" và tên "Jane Doe" khỏi mô phỏng Cửa hàng, và ghi nhãn số mẫu ngay dưới khung; số ví/streak mẫu vẫn chưa lấy từ dữ liệu thật. **TD-ADS-14** — xong (thẻ Cửa hàng không còn nhãn loại 10px).

---

## 13. Quyết định và câu hỏi mở

### 13.1. Quyết định

PO duyệt toàn bộ ngày **2026-10-19**: "đồng ý với các đề xuất cho PO".

| ID | Quyết định |
| :--- | :--- |
| PD-ADS-01 | Định vị Data/SaaS 40 · Content/AI 35 · LiveOps 25; shadcn là hạ tầng, không phải bản sắc (§1) |
| PD-ADS-02 | 4 nguyên tắc P1–P4 (§2) |
| PD-ADS-03 | P5 (rev 3: không giả như thật; mock có nhãn được khuyến khích), P6 (data-dense), P7 (cảnh báo UI ≠ quy tắc) |
| PD-ADS-04 | Bảng màu và ngữ nghĩa màu §3.1–3.2 |
| PD-ADS-05 | Chính sách icon §3.6 |
| PD-ADS-06 | Bộ mẫu bố cục §5 là chuẩn cho mọi màn |
| PD-ADS-07 | IA và scope §4 (rev 3) |
| PD-ADS-08 | Gộp Scan Monitor vào AI Scan |
| PD-ADS-09 | Hợp đồng preview §6 và quy tắc ngữ cảnh mẫu |
| PD-ADS-10 | `admin_audit_log` ghi trong cùng transaction; bắt buộc lý do cho thao tác §8 (backend FUTURE) |
| PD-ADS-11 | Stack §10 |
| PD-ADS-12 | Bộ 5 nhiệm vụ ví dụ và thưởng/ngày tính từ catalog thật |
| PD-ADS-13 | Thứ tự làm lại: Shell & IA → Người học → Từ điển + Chủ đề → AI Scan → Dashboard (C) → Activity Log |
| PD-ADS-14 | Gỡ Seasons/Leagues, Decks, Settings, Admins & Roles, Báo cáo kiểu SLA (REMOVE) |

Rev 4, ngày 2026-10-20. PO yêu cầu "loại bỏ cảm giác AI-generated" và giữ mật độ. Các quyết định dưới đây **đã áp dụng vào code, đang chờ PO duyệt** qua ảnh trước/sau:

| ID | Quyết định |
| :--- | :--- |
| PD-ADS-15 | Ngôn ngữ giao diện G1–G8 (§3.7) là chuẩn cho mọi màn đã làm lại |
| PD-ADS-16 | Thang chữ bằng token (§3.3); bỏ độ đậm 800 và chữ in hoa giãn |
| PD-ADS-17 | Bỏ thanh header và eyebrow; nhóm sidebar tiếng Việt; ô chuyển nhanh ở sidebar; logo và favicon là Snapy (§4.1) |
| PD-ADS-18 | Nhãn dữ liệu mẫu: một notice gắn cờ ở đầu trang, cộng nhãn tại dòng cho cảnh báo dựng từ số liệu mẫu (P5) |
| PD-ADS-19 | Badge chỉ cho ngoại lệ và bước vòng đời khác nhau (§3.5) |
| PD-ADS-20 | Phân tích: bỏ "kết luận + nút" ở cuối mỗi biểu đồ; kết luận vẽ vào dữ liệu (thay [analytics_ui.md](./analytics_ui.md) §1 rev 1) |
| PD-ADS-21 | Dashboard: "Cần xử lý" thành danh sách theo mức độ; 6 khối gộp thành 3 dải Scan · Nhịp học + Nhiệm vụ · Kinh tế + Cửa hàng ([dashboard_ui.md](./dashboard_ui.md) rev 2) |
| PD-ADS-22 | Nhãn enum dùng chung một nguồn: `domains/scan/labels.ts` (lỗi scan, độ tin cậy), `formatShopItemStatusLabel` |

### 13.2. Câu hỏi đã trả lời

Theo đề xuất trong đánh giá 2026-10-19:

| ID | Trả lời |
| :--- | :--- |
| OQ-ADS-01 | Chưa thêm CEFR và workflow duyệt cho từ điển. Từ điển sửa trực tiếp, kèm kiểm tra hợp lệ, xem ảnh hưởng, audit và xóa mềm. CEFR để FUTURE |
| OQ-ADS-02 | Báo scan sai từ mobile: FUTURE. "Thiếu từ" lấy từ nhãn scan chưa có từ (AI Scan) |
| OQ-ADS-03 | Dashboard theo hướng **C · Bảng điều phối vận hành** |
| OQ-ADS-04 | Giữ ngưỡng gợi ý ×1,5 và tối thiểu 3 mẫu làm mặc định. Luồng "cần duyệt" ở backend: FUTURE |
| OQ-ADS-05 | Giữ chart tự viết, hoãn RHF + Zod, không dùng Zustand (§10) |
| OQ-ADS-06 | Trả lời bằng bảng §4.1 |
| OQ-ADS-07 | Cho phép điều chỉnh Coin (`ADMIN_ADJUSTMENT`), bắt buộc lý do và audit. **FUTURE**, chưa xây |
| OQ-ADS-08 | Collection/Topic hệ thống có trạng thái **Nháp/Phát hành** (MOCK trước, cần thêm field ở backend) |

## 14. Lộ trình

| Giai đoạn | Nội dung | Trạng thái |
| :--- | :--- | :--- |
| Shop, Missions theo rev 2 | — | **Xong** 2026-10-18 |
| **P0 · Shell** | Router History API, deep link `/shop/:id`, `/missions/:id`, `/learners/:id`; sidebar theo §4.1 với nhãn scope; gỡ mục REMOVE; eyebrow "LiveOps"; `SummaryStrip` dùng chung; Command Palette chỉ còn trang và tác vụ thật | **Xong** 2026-10-19. Còn: TD-ADS-05, 06, 07, 12 |
| **Người học** (MOCK) | Danh bạ, hồ sơ một trang, khóa/mở khóa, gửi link đặt lại mật khẩu | **Xong** 2026-10-19. Chờ backend `GET/POST /api/admin/users…` |
| Từ điển + Chủ đề | Từ điển: tra cứu thật + sửa mẫu; Chủ đề: API thật (cây, tạo, thêm mục có điền từ điển, đổi mẫu thẻ) + tín hiệu chất lượng dữ liệu | **Xong** 2026-10-19. Còn: import dry-run, preview thẻ theo mẫu, TD-ADS-15…19 |
| AI Scan | Vận hành · Nhãn chưa có từ · Lịch sử | Sau |
| Dashboard C | 11 quy tắc "Cần xử lý" (6 NOW, 5 MOCK) + vận hành scan, nhịp học, nhiệm vụ, kinh tế, cửa hàng, thay đổi gần đây | **Xong** 2026-10-19. Chờ `GET /api/admin/overview`, OQ-DASH-01/02 |
| Phân tích | 4 tab Học tập · Giữ chân · Kinh tế · Scan; kết luận + hành động mỗi biểu đồ; giữ chân theo % chỉ hiện khi ≥ 200 người học | **Xong** 2026-10-19. Chờ `GET /api/admin/analytics`, OQ-ANL-01…03 |
| Activity Log | — | Sau |
| Backend (theo thứ tự) | Admin users → dictionary → đọc scan + thống kê → bảng ánh xạ nhãn → `admin_audit_log` → overview → thống kê LiveOps | Theo đánh giá §10F |

## 15. Truy vết

| Nội dung | Code | Test |
| :--- | :--- | :--- |
| Token màu, độ tương phản | `tailwind.config.js`, `components/ui/Badge.tsx`, `Button.tsx` | `tests/ui-tokens.test.ts` |
| Thang chữ, `cn()` giữ cỡ tùy biến | `tailwind.config.js` (`fontSize`), `lib/utils.ts` | `tests/ui-tokens.test.ts` (cn) |
| Khối, số trong khối, link ra ngoài | `components/ui/Panel.tsx`, `SummaryStrip.tsx` (KpiCell, Spark) | — |
| Biểu đồ đường | `components/charts/{LineChart,AreaChart,ChartTooltip,chart-utils}.tsx` | — |
| Nhãn enum dùng chung | `domains/scan/labels.ts`, `domains/shop/mappers.ts#formatShopItemStatusLabel` | O7, A8 (không lộ mã) |
| Khung, nhóm điều hướng, chuyển nhanh | `components/layout/{AdminLayout,Sidebar,CommandPaletteModal,nav}.ts(x)` | — |
| Icon brand | `components/brand/BrandIcons.tsx` | — |
| Dải số liệu, lưới, kệ | `features/shop/shop-list/ShopItemListPage.tsx`, `features/admin-missions/AdminMissionsPage.tsx` | `tests/admin-missions.test.ts` (render danh sách) |
| Trạng thái bán | `domains/shop/mappers.ts#deriveSaleState` | `tests/admin-shop.test.ts` (11–14) |
| Guardrail giá | `domains/shop/mappers.ts#priceBand`, `priceHint`, `formatFullDays` | `tests/admin-shop.test.ts` (G1) |
| Bộ 5 nhiệm vụ, thưởng/ngày | `domains/admin-missions/mappers.ts#dailyOutlook`, `SLOTS`, `missionGroup` | `tests/admin-missions.test.ts` (Daily outlook) |
| Editor builder | `features/shop/shop-editor/ShopItemEditorPage.tsx`, `features/admin-missions/MissionEditor.tsx`, `components/ui/SectionLabel.tsx` | `tests/admin-missions.dom.test.ts` |
| Preview mobile | `features/shop/components/ShopItemPreview.tsx`, `artwork.ts`, `features/admin-missions/MissionCard.tsx` | — |
| Router, IA, nhãn scope | `lib/router.ts`, `components/layout/nav.ts`, `Sidebar.tsx`, `App.tsx` | — |
| Người học (MOCK) | `domains/admin-learners/*`, `features/admin-learners/*` | `tests/admin-learners.test.ts` (L1–L6) |
| Từ điển, Chủ đề (NOW) | `domains/admin-content/*`, `features/admin-dictionary/*`, `features/admin-topics/*`, `components/ui/{Drawer,Field}.tsx` | `tests/admin-content.test.ts` (C1–C6), `tests/admin-content.dom.test.ts` (T1–T4, D1) |
| Dashboard C | `domains/admin-overview/*`, `features/dashboard/*` | `tests/admin-overview.test.ts` (O1–O7) |
| Phân tích | `domains/admin-analytics/*`, `features/analytics/*` | `tests/admin-analytics.test.ts` (A1–A8) |
