# Admin · Nhiệm vụ hằng ngày — Đặc tả màn hình

> **Rev 2 · 2026-10-22 · Trạng thái: đã dựng, PO duyệt 2026-10-22.** Rev 2 cập nhật theo daily_mission.md PD-DM-02, PD-DM-07, PD-DM-12, PD-DM-13 (chọn 2 lượt, 12 mẫu seed, 3 điều kiện cấp, app cũ/app mới, trần 75 Coin) và xử lý TD-ADS-05, TD-ADS-09, TD-ADS-11.
> Nền tảng: [design.md](./design.md) rev 2. Nghiệp vụ: [daily_mission.md](../../../docs/decisions/daily_mission.md). Contract và luồng an toàn: [admin_missions_api_design.md](./admin_missions_api_design.md) (§1–6, §8–9 vẫn hiệu lực; phần hình thức ở §7 được thay bằng tài liệu này).

## 1. Mục tiêu

Người vận hành quản lý catalog mẫu nhiệm vụ. Từ catalog này, backend cấp **đúng 5 nhiệm vụ mỗi ngày** cho mỗi người học. Màn phải trả lời:

1. Hôm nay người học nhận được gì?
2. Catalog có đủ để cấp 5 slot không?
3. Một thay đổi ảnh hưởng thưởng mỗi ngày ra sao?

Phạm vi theo PD-DM: không có rương, bonus, nhiệm vụ tuần/tháng, lịch chạy hay thống kê hoàn thành.

## 2. Nguồn dữ liệu và quy tắc domain được phản chiếu

| Khối | Nguồn | Nhãn |
| :--- | :--- | :--- |
| Catalog | `GET /api/admin/mission-templates`: tải toàn bộ, không phân trang | REAL |
| Chi tiết, tạo, sửa | `GET/POST/PATCH /api/admin/mission-templates[/{id}]` (PATCH có `version`, nội dung tách khỏi `isActive`) | REAL |
| Vật phẩm thưởng | `GET /api/admin/shop/items?status=PUBLISHED` | REAL |
| Bộ 5 nhiệm vụ, thưởng/ngày | `dailyOutlook()`: tính ngay trên trình duyệt (cần cho bản nháp chưa lưu), cùng thuật toán với `MissionTracker.choose`. Hai bên chạy chung bộ vector `snap-vocab-backend/src/test/resources/mission/outlook-vectors.json` (`MissionOutlookVectorsTest` và `admin-missions.test.ts`), lệch nhau là test đỏ (TD-ADS-09) | Tính từ dữ liệu thật |
| Tỉ lệ hoàn thành, nhận thưởng | Chưa có API admin | CẦN BACKEND: không hiển thị |
| Nhật ký ai sửa gì | Nhật ký hoạt động Admin, đối tượng `MISSION_TEMPLATE` (5 thay đổi gần nhất trong 90 ngày) | REAL |

**Slot** (bản sao `MissionTracker.SLOTS`, daily_mission.md §2.2):

| Slot | Nhóm |
| :--- | :--- |
| 1 | Quét ảnh |
| 2 | Từ vựng |
| 3 | Flashcard / SRS |
| 4 | Quiz |
| 5 | Duy trì / Cửa hàng |

**Thuật toán** (giống backend, daily_mission.md §4.2):

1. Ứng viên = mẫu đang bật, có trigger mà app của người học hiển thị được (PD-DM-13: app cũ chỉ 5 trigger cũ), và người học đủ điều kiện cấp.
2. **Lượt 1:** slot nào có ứng viên thuộc nhóm của mình thì chọn trước.
3. **Lượt 2:** slot còn trống lấy **mẫu cốt lõi** (nhóm slot 1–4) chưa được chọn. Lấy bù chạy sau lượt 1 nên không lấy mất mẫu duy nhất của slot khác.
4. Nếu vẫn rỗng, slot không lấp được (`POOL_INSUFFICIENT`).
5. Chọn theo trọng số, ưu tiên mẫu không trùng hôm qua.

Trọng số ≥ 1 và quy tắc "không trùng hôm qua" chỉ đổi xác suất, nên **mọi nhánh đều có thể xảy ra**. `dailyOutlook` duyệt hết các nhánh, qua **2 loại app** (hiện tại, cũ) × **8 tổ hợp** của 3 điều kiện cấp (`HAS_IDLE_XP_BOOSTER`, `HAS_PURCHASABLE_ITEM`, `HAS_STUDY_CARDS_FOR_TARGET`). `HAS_STUDY_CARDS_FOR_TARGET` so số thẻ trong phiên học hôm nay với mục tiêu của chính mẫu; mô phỏng coi người học hoặc đạt cho mọi mẫu, hoặc không đạt cho mẫu nào (các trường hợp ở giữa cho ra tập con của hai trường hợp này).

**Invariant** (`catalogSummary`, như `MissionTracker.satisfiesInvariant`): chỉ đếm mẫu NONE có trigger cũ, để người dùng app cũ luôn đủ 5 nhiệm vụ. Mẫu Scan/SRS vẫn nằm ở nhóm CORE trong bảng nhưng không được tính vào invariant.

**Nhóm kết quả** (`missionGroup`):

| Nhóm | Định nghĩa |
| :--- | :--- |
| CORE · Cốt lõi slot 1–4 | Đang bật, không có điều kiện cấp (NONE), nhóm học cốt lõi |
| SLOT5 · Slot 5 | Đang bật, NONE, nhóm Duy trì/Cửa hàng |
| GATED · Có điều kiện cấp | Đang bật, điều kiện cấp khác NONE |
| OFF · Đang tắt | `isActive = false` |

## 3. Màn danh sách

```text
GAMIFICATION → (P0: LIVEOPS)
◎ Nhiệm vụ hằng ngày                                                        [+ Tạo nhiệm vụ]
Mỗi ngày mỗi người học nhận 5 nhiệm vụ: slot 1–4 từ nhóm học cốt lõi, slot 5 từ Duy trì / Cửa hàng.

┌ 7 Mẫu nhiệm vụ │ 4 ● Cốt lõi · slot 1–4 │ 1 ● Slot 5 │ 2 ● Có điều kiện cấp │ 0 ● Đang tắt │ Invariant catalog [Đạt] │ Thưởng mỗi người/ngày 🪙 80–85 · XP 150–160 ┐

MỘT NGÀY CỦA NGƯỜI HỌC ─────────  Ví dụ cho người học không có booster hay vật phẩm mua được; bộ thật chọn theo trọng số.
SLOT 1 · QUÉT ẢNH   4 mẫu │ SLOT 2 · TỪ VỰNG   4 mẫu │ SLOT 3 · FLASHCARD/SRS 3 mẫu │ SLOT 4 · QUIZ 3 mẫu │ SLOT 5 … 3 mẫu
[thẻ mobile]               │ [thẻ mobile]             │ [thẻ mobile]                 │ [thẻ mobile]      │ [thẻ mobile]
Không có mẫu nhóm này đang bật: lấy mẫu cốt lõi.

[🔍 Tìm tên hoặc mã…] [Tất cả nhóm ▾] [↻]
● CỐT LÕI · SLOT 1–4  4   4 mẫu cho 4 slot: người học nhận đủ cả 4 mẫu mỗi ngày, không xoay vòng.
  (hàng mẫu…)
● SLOT 5  1   Người học không có điều kiện cấp nào luôn nhận mẫu này ở slot 5.
● CÓ ĐIỀU KIỆN CẤP  2   Chỉ được chọn khi người học đủ điều kiện cấp; khi đó xoay cùng các mẫu cùng slot.
```

### 3.1. Dải số liệu

| Ô | Định nghĩa |
| :--- | :--- |
| Mẫu nhiệm vụ | Tổng số mẫu. Bấm để bỏ lọc nhóm |
| Cốt lõi · Slot 5 · Có điều kiện cấp · Đang tắt | Đếm theo `missionGroup`. Mỗi ô là bộ lọc của bảng |
| Invariant catalog | Badge `Đạt` (success), `Không đạt` (danger) hoặc `Chưa kích hoạt` (neutral, khi không còn mẫu nào bật). Tooltip là `invariantHint` |
| Thưởng mỗi người/ngày | Min–max Coin và XP trên mọi bộ 5 có thể cấp (`dailyOutlook`). Coin tối đa cộng cả `rewardItemFallbackCoin` của nhiệm vụ thưởng vật phẩm, vì người đã đủ vật phẩm sẽ nhận Coin đó (2026-10-21). Ghi "—" khi không lấp đủ 5 slot |

### 3.2. Panel "Một ngày của người học" (PD-ADS-12)

- Hiện khi catalog đã kích hoạt.
- Gồm 5 cột slot. Mỗi cột có:
  - Tiêu đề "SLOT N · nhóm" và số mẫu có thể rơi vào slot đó (tooltip liệt kê tên).
  - **Thẻ nhiệm vụ giống mobile** (`MissionCard` dạng gọn) của bộ ví dụ.
  - Ghi chú "Không có mẫu nhóm này đang bật: lấy mẫu cốt lõi" nếu nhóm của slot không có mẫu nào đang bật.
- Bộ ví dụ là nhánh đầu tiên (id nhỏ nhất mỗi slot) của người học **dùng app hiện tại, không đạt điều kiện cấp nào**.
- Số mẫu mỗi slot và khoảng thưởng tính cho **mọi** người học, gồm cả người dùng app cũ (họ vẫn có thể nhận tới 85 Coin cho tới khi app cũ hết).
- Nếu người học đó không nhận đủ 5 nhiệm vụ, panel hiện banner lỗi thay cho các thẻ.
- Đây là mô phỏng từ catalog, **không** phải bộ của một người học cụ thể và không phải mock.

### 3.3. Bảng nhóm theo kết quả

- Thứ tự nhóm: CORE → SLOT5 → GATED → OFF. Nhóm rỗng sau khi lọc thì ẩn.
- Đầu nhóm gồm chấm màu, tên nhóm, số mẫu và **câu kết luận**:

| Nhóm | Điều kiện | Câu kết luận |
| :--- | :--- | :--- |
| CORE | `core < 4` | "Thiếu N mẫu: slot 1–4 không đủ, người học không có điều kiện cấp sẽ không nhận được bộ nhiệm vụ." (**đỏ**) |
| CORE | `core = 4` | "4 mẫu cho 4 slot: người học nhận đủ cả 4 mẫu mỗi ngày, không xoay vòng." |
| CORE | `core > 4` | "N mẫu cho 4 slot: mỗi ngày chọn 4 theo trọng số, ưu tiên mẫu không trùng hôm qua." |
| SLOT5 | `slotFive = 0`, `core ≥ 5` | "Chưa có mẫu slot 5: slot 5 lấy thêm 1 mẫu cốt lõi." |
| SLOT5 | `slotFive = 0`, `core < 5` | "Chưa có mẫu slot 5 và không dư mẫu cốt lõi để bù." (**đỏ**) |
| SLOT5 | `slotFive = 1` | "Người học không có điều kiện cấp nào luôn nhận mẫu này ở slot 5." |
| SLOT5 | `slotFive > 1` | "Slot 5 xoay giữa N mẫu này, cộng các mẫu có điều kiện khi người học đủ điều kiện." |
| GATED | — | "Chỉ được chọn khi người học đủ điều kiện cấp; khi đó xoay cùng các mẫu cùng slot." |
| OFF | — | "Không được cấp cho người học." |

**Cột của bảng:**

| Cột | Nội dung |
| :--- | :--- |
| Nhiệm vụ | Ô icon nhóm, tên (mở editor), mã mono, "Mapping chưa hỗ trợ" nếu không khớp preset |
| Nhóm | Badge |
| Mục tiêu | `objective()`, ví dụ "Hoàn thành quiz: 1 · chính xác ≥ 80%" |
| Phần thưởng | `CoinIcon` + Coin, `XpIcon` + XP, vật phẩm thưởng nếu có |
| Điều kiện cấp | — |
| Trọng số | Tooltip: trọng số tương đối, không phải xác suất |
| Trạng thái | — |
| Thao tác | [Bật/Tắt] mở hộp xác nhận · [Sửa] |

- Màn hẹp ẩn các cột phụ.
- Không có công tắc bật/tắt ngay tại bảng: tắt có thể làm pool thiếu.

### 3.4. Hộp xác nhận Bật/Tắt

Hộp xác nhận dùng `components/ui/ConfirmModal` chung (TD-ADS-05; tắt mẫu: nút đỏ, bật mẫu: nút chính). Nội dung gồm:

- Tên, mã, phiên bản; trạng thái hiện tại → trạng thái mới; phần thưởng.
- Câu "Áp dụng cho các bộ nhiệm vụ được cấp sau thao tác…".
- **Dự kiến sau thao tác:** số mẫu cốt lõi, số mẫu slot 5 và invariant đạt/không đạt; hộp chuyển đỏ khi không đạt.

Mất phản hồi: không gửi lại mù. Hộp hiện nút "Kiểm tra trạng thái server", đóng lại theo trạng thái thật và báo bằng toast.

## 4. Editor (builder)

### 4.1. Header dính

| Thành phần | Chi tiết |
| :--- | :--- |
| Bên trái | Nút ←; "Nhiệm vụ hằng ngày / Sửa" hoặc "/ Tạo mới"; tên kèm badge Đang bật/Đang tắt; "Phiên bản N" hoặc "Tạo mới luôn ở trạng thái Tắt"; "Có thay đổi chưa lưu" |
| Nút | [Bật/Tắt nhiệm vụ] (chỉ khi đã lưu sạch) · Primary duy nhất [Lưu thay đổi / Tạo nhiệm vụ] |

### 4.2. Các section

| Section | Trường | Quy tắc |
| :--- | :--- | :--- |
| **CƠ BẢN** | Mã nhiệm vụ, Tên hiển thị, Mô tả | Mã ≤ 64, bất biến sau khi tạo, có nút sao chép. Tên ≤ 100. Mô tả ≤ 255. Có bộ đếm ký tự |
| **MỤC TIÊU** | Mẫu hành động (10 preset: thêm 5 từ, quiz × 3, giữ chuỗi, booster, mua vật phẩm, lưu từ đã quét, học thẻ, học 10 thẻ có điều kiện), Mục tiêu (đơn vị theo preset), dòng "Nhóm X · vào slot N", bộ lọc quiz (số câu 5/10/20, độ chính xác 1–100%) | Đổi preset sẽ đặt lại mục tiêu và bộ lọc, có báo trường nào bị đặt lại. Có ghi chú riêng theo trigger (tín dụng từ khi thêm từ, booster, hoạt động học, quiz, học thẻ, lưu từ đã quét; hai trigger cuối ghi rõ người dùng app cũ không nhận mẫu) |
| **PHẦN THƯỞNG** | Coin (`CoinIcon`), XP (`XpIcon`), Vật phẩm thưởng (chọn item PUBLISHED), Coin dự phòng | Cần ít nhất một trong Coin > 0, XP > 0 hoặc có item. XP thưởng không được booster nhân |
| **ĐIỀU KIỆN CẤP** | Chỉ đọc, lấy theo preset | "Điều kiện cấp ảnh hưởng việc nhiệm vụ được chọn, không bảo đảm điều kiện hoàn thành." |
| **CẤU HÌNH NÂNG CAO** (thu gọn) | Trọng số; chuỗi `category / trigger / eligibility` | Trọng số ≥ 1 |

### 4.3. Cột phải

| Panel | Nội dung |
| :--- | :--- |
| **Xem trước trên ứng dụng** | `MissionCard` bản đầy đủ: ô icon và màu theo mobile, tên, mô tả, gợi ý thêm từ, thanh tiến độ 0/N, Coin, XP (ô bằng 0 thì ẩn, như app), CTA ("Thêm từ", "Làm quiz", "Học ngay", "Tới cửa hàng", "Kích hoạt booster", "Quét ảnh") và "Vật phẩm: {tên vật phẩm}" (app đọc `reward.itemName`; chưa tìm thấy item thì hiện mã). Bên dưới: "Hoàn thành khi: {objective}" |
| **Tác động lên bộ 5 nhiệm vụ** | **Vị trí**: "Slot N · nhóm"; nếu là nhóm cốt lõi thì thêm "còn lấp slot …" cho các slot đang không có mẫu riêng. **Cấp cho**: "Mọi người học" hoặc "Chỉ người học {điều kiện}". **Thưởng/ngày**: trước → sau, ghi "Sau khi lưu" (mẫu đang bật) hoặc "Nếu bật nhiệm vụ này" (mẫu tắt hoặc mới). Không đổi thì ghi "không đổi" |
| Cảnh báo | Trần Coin/ngày **của app hiện tại** sau thay đổi > 75 (`MAX_COIN_PER_DAY`, PD-DM-02): hộp `warning`, ghi là gợi ý, không chặn lưu. Thay đổi làm một số người học không đủ 5 nhiệm vụ: hộp `danger`, báo backend sẽ từ chối |
| **Vòng đời** (mẫu đã lưu) | Tạo, Sửa gần nhất · vN, ID. "Nhật ký gần đây" (`TargetHistory`) và liên kết xem cả lịch sử |

Màu ô icon theo mobile (`missions-screen.tsx`):

| Nhóm | Nền | Glyph |
| :--- | :--- | :--- |
| Từ vựng | `#C7ECFC` | `#0B8FCE` |
| Quiz | `#EAE2FE` | `#8253EC` |
| Duy trì | `#FFF3E0` | `#E57C00` |
| Cửa hàng | `#FFEFB8` | `#B37F00` |
| Các nhóm còn lại (Quét ảnh, Flashcard, SRS) | `#F3F4F6` | `#565879` |

Preview dùng glyph của mobile. Bảng admin dùng glyph riêng theo từng nhóm, cùng bảng màu trên.

### 4.4. An toàn thao tác

Giữ nguyên hành vi theo [admin_missions_api_design.md](./admin_missions_api_design.md) §6:

- Lưu bị lỗi kiểm tra: focus vào trường lỗi đầu tiên.
- Xung đột: giữ bản đang nhập, mở bảng so sánh từng trường với bản server.
- Server có phiên bản mới hơn: form sạch thì nhận bản mới; form đang sửa thì cảnh báo.
- Mất phản hồi khi lưu: khóa nút gửi lại cho tới khi kiểm tra trên server.
- Chặn rời trang khi có thay đổi chưa lưu.

## 5. Tiêu chí nghiệm thu

| ID | Tiêu chí | Kiểm bằng |
| :--- | :--- | :--- |
| AC-MIS-01 | Bộ 5 nhiệm vụ và khoảng thưởng khớp backend trên mọi vector dùng chung (12 mẫu seed như khi phát hành: **60–85 Coin · 115–160 XP** cho mọi người học; bật hết, app hiện tại: **55–75 Coin · 105–160 XP**) | `admin-missions.test.ts` (shared backend vectors) và `MissionOutlookVectorsTest` |
| AC-MIS-02 | Tắt 1 trong 4 mẫu cốt lõi seed → `insufficient`, thưởng/ngày "—" | Như trên |
| AC-MIS-03 | Đếm ở dải số liệu khớp `missionGroup`; ô 0 bị vô hiệu; bấm ô để lọc bảng | Kiểm tay |
| AC-MIS-04 | Câu kết luận của nhóm đúng bảng §3.3 với mọi tổ hợp core/slotFive; câu thể hiện vi phạm có màu đỏ | Kiểm tay |
| AC-MIS-05 | Invariant hiển thị Đạt / Không đạt / Chưa kích hoạt đúng `catalogSummary` | `admin-missions.test.ts` (List renders…) |
| AC-MIS-06 | Preview dùng đúng copy mobile ("Vật phẩm: {tên}", ẩn ô Coin/XP bằng 0, CTA theo trigger) | `admin-missions.test.ts` (Edit editor…) |
| AC-MIS-07 | Panel tác động hiện trước → sau khi thưởng thay đổi; cảnh báo khi app hiện tại > 75 Coin/ngày; không chặn lưu | Kiểm tay |
| AC-MIS-08 | Các luồng an toàn §3.4 và §4.4 giữ nguyên hành vi | `admin-missions.dom.test.ts` |

## 6. Ngoài phạm vi

- Xem bộ nhiệm vụ của một người học cụ thể.
- Tỉ lệ hoàn thành và nhận thưởng.
- Lịch kích hoạt.
- Nhiệm vụ tuần/tháng, rương, bonus.
- Nhân bản mẫu hàng loạt.

Mỗi mục trên cần PD và API riêng.
