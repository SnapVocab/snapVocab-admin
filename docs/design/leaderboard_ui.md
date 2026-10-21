# Admin · Bảng xếp hạng — Đặc tả màn hình

> **Rev 1 · 2026-10-21 · Scope: MOCK. Đã dựng trên dữ liệu mẫu, chờ PO duyệt.** Backend đã có đặc tả nhưng chưa build: [leaderboard_backend.md](../../../docs/sa/leaderboard_backend.md) (rev 1.1 thêm `rankChange` cho API admin, §2 dưới đây).
> Nền tảng: [design.md](./design.md) rev 4 (§3.7 ngôn ngữ giao diện, §5.2 dải số liệu). Nghiệp vụ: leaderboard_backend.md §1.3 (LB-01…LB-12), §3.5 (tín hiệu cho admin), §7 (API admin), OQ-LB-06 (ngưỡng "bất thường" do client admin quyết).
> Thay bản mock cũ "Leaderboard Seasons" (`features/seasons`, `domains/seasons`; REMOVE theo PD-ADS-14, đã gỡ route nhưng còn trên đĩa) và bản P1 chỉ xem đã xóa ngày 2026-10-18.

## 1. Mục tiêu và ranh giới

Màn trả lời ba câu hỏi của người vận hành:

1. **Người học đang thấy bảng gì?** Cùng một snapshot với app (LB-06), cùng thứ tự, cùng khoảng cách và xu hướng.
2. **Có ai lên hạng bất thường không?** Tín hiệu thô của backend (§3.5) cộng ngưỡng ở client (§4).
3. **Bảng có sống không?** Bao nhiêu người tham gia, XP đến từ đâu, người ta học mấy ngày trong tuần.

**Ranh giới:**

- Chỉ xem (LB-12). Không sửa điểm, không loại ai khỏi bảng, không trừ XP. Muốn chặn một tài khoản thì khóa trong hồ sơ người học; theo mặc định OQ-LB-07, người bị khóa rời bảng ở lần cập nhật kế tiếp.
- Không league, mùa giải, phòng đấu, thưởng theo hạng (scope: không community; daily_mission.md: không thưởng tuần).
- Không xem XP từng ngày của một người và không có lịch sử cũ hơn tuần trước (leaderboard_backend.md §1.2).

### 1.1. Đối chiếu với bản mock cũ

Mật độ giữ nguyên ([design.md](./design.md) §3.7); phần đổi là dữ liệu ngoài scope và cách trình bày.

| Bản cũ (Seasons) | Bản mới | Lý do |
| :--- | :--- | :--- |
| Ribbon 4 thẻ: mùa giải + đếm ngược, học viên + phòng đấu, tranh đua thăng hạng + dự phóng payout Coin/Gems, kiểm soát gian lận | Dải số liệu kiêm bộ lọc: Người có mặt, Cần xem, Đồng hạng, Có XP Booster; ba ô ngữ cảnh Tham gia, Tổng XP tuần, Tuần + thời gian còn lại | Không có mùa, phòng, thăng hạng, payout, Gems. Đếm ngược tới 00:00 Thứ Hai giữ lại |
| 4 tab: Lịch mùa, Hạng đấu, Thưởng mùa, Bảng & chống gian lận | Một màn; "Tuần này / Tuần trước" ở header | Ba tab đầu là REMOVE; phần còn lại là bảng và tín hiệu |
| Banner "Velocity spike" với nút Trừ 2.000 XP, Truất quyền, Bỏ qua | Ô "Cần xem", badge trên dòng, lý do trong drawer; hành động duy nhất là "Mở hồ sơ người học" | LB-12. Nút chỉ hứa điều nó làm được (G6) |
| Toolbar: tìm, hạng đấu, phòng đấu, vùng thăng/rớt hạng | Tìm theo tên, email, ID; lọc bằng ô của dải số liệu | Không có hạng đấu, phòng, vùng (§5.3: lọc nằm ở dải số liệu) |
| Bảng: hạng + mũi tên, học viên (CEFR, danh hiệu), Weekly XP, streak, hoạt động, phòng, trạng thái mùa, thao tác | Bảng: Hạng + xu hướng, Người học, XP tuần + vạch, Để vượt hạng trên, Ôn thẻ, Quiz, Booster, Ngày học, Cao nhất 1 giờ, Đạt mức lúc | Cột lấy từ snapshot (§3.5 backend); bỏ CEFR, danh hiệu, streak, phòng, mùa |
| Simulator điện thoại cố định (league, phần thưởng mùa) | "Người học thấy trên ứng dụng" trong drawer của từng người: top 3, hàng ngay trên, hàng của mình, khoảng cách | Mobile design.md §10.4; chỉ dữ liệu công khai (LB-10) |
| (không có) | Dải phân bố: Phân bố XP tuần, Nguồn XP, Số ngày học | Câu hỏi 2 và 3 |

## 2. Contract

Kiểu: `src/domains/admin-leaderboard/types.ts` = Phụ lục B của đặc tả backend, cộng `rankChange`. Cờ: `VITE_ADMIN_LEADERBOARD_FIXTURES` (mặc định bật ở dev; đặt `false` để gọi API thật). Fixture chỉ được tải khi cờ bật (import động), nên bản release không chứa dữ liệu mẫu.

| Endpoint | Trả về |
| :--- | :--- |
| `GET /api/admin/leaderboards?week=CURRENT\|PREVIOUS` | `AdminLeaderboard`: toàn bộ bảng của **một** snapshot, theo thứ tự LB-04 (KT-07). Màn tự tìm và lọc |

- React Query `staleTime` 60 giây: backend chụp lại mỗi phút, hỏi sớm hơn vẫn nhận cùng `asOf`.
- **Đề xuất đổi contract (đã ghi vào leaderboard_backend.md rev 1.1):** thêm `entries[].rankChange` cho API admin, cùng định nghĩa §6.2 (hạng lúc 00:00 hôm nay − hạng hiện tại; `null` với tuần trước, vào Thứ Hai và người chưa có trên bảng lúc 00:00). Cần cho cột xu hướng và cho mô phỏng app, vì người học thấy mũi tên này. Backend đã tính baseline cho API người học nên chỉ tốn một lần đọc Redis.

## 3. Màn (`/leaderboard`)

Nhóm LiveOps, sau Huy hiệu. Scope MOCK: chỉ hiện ở dev/demo (design.md §4.2).

| Khối | Nội dung |
| :--- | :--- |
| Header | Tiêu đề; mô tả là **quy tắc tính điểm, dựng từ `countedSources`** ("XP tuần là XP ôn thẻ và quiz, gồm cả phần Booster; không tính XP nhiệm vụ…"): PO đổi OQ-LB-01 thì chữ tự đổi. Bên phải: "Tuần này / Tuần trước", "Cập nhật hh:mm" (= `asOf`; tuần trước: "Chốt hh:mm dd/mm" hoặc "Đang chốt"), Làm mới |
| `SampleDataNotice` | Endpoint đang chờ; người học là người học mẫu của màn Người học; XP sinh theo luật cộng XP thật, tính tới 14:20 Thứ Tư 21/10 |
| Dải số liệu | §3.1 |
| Dải phân bố | §3.2. Ẩn khi bảng trống |
| Tìm | Tên và email không phân biệt dấu; số (có hoặc không `#`) khớp đúng ID. Khi đang lọc: "Xóa bộ lọc" và "n/N người, hạng vẫn tính trên cả bảng" |
| Bảng | §3.3. Hiện 100 dòng, "Hiện thêm 100" khi còn |
| Drawer | §3.4. Bấm cả dòng hoặc tên |

### 3.1. Dải số liệu

| Ô | Đếm (trên cả bảng, không đổi khi lọc) | Bấm |
| :--- | :--- | :--- |
| Người có mặt | `participants` | Bỏ lọc |
| Cần xem (chấm vàng) | Số dòng có ít nhất một cờ §4 | Lọc |
| Đồng hạng | Số dòng `tied` | Lọc |
| Có XP Booster | Số dòng `bonusXp > 0` | Lọc |
| Tham gia | `participants / eligibleLearners` (%), kèm "34/42 người học" | — |
| Tổng XP tuần | `totalXp` | — |
| Tuần dd/mm – dd/mm | "Còn N ngày N giờ" tính tới `endsAt` **tại thời điểm `asOf`**; tuần trước: "Đã chốt" (`isFinal`) hoặc "Đang chốt" | — |

### 3.2. Dải phân bố

Một khối viền, ba cột chia bằng đường kẻ (như Nhật ký hoạt động):

| Cột | Nội dung | Kết luận vẽ vào dữ liệu (G6) |
| :--- | :--- | :--- |
| Phân bố XP tuần | Số người theo dải XP có bề rộng tròn (100, 200, 250, 500…, khoảng 8 cột); số trên mỗi cột; meta "mỗi cột 500 XP, cao nhất 3.742" | Cột có người "Cần xem" tô vàng, chú thích "Cột vàng: có người cần xem". Đuôi phải tách khỏi khối chính nên thấy ngay người vượt xa |
| Nguồn XP | Ôn thẻ, Quiz (tỉ lệ trên tổng XP), Booster (phần nhân đôi đã nằm trong hai dòng trên) | Dòng "XP nhiệm vụ không tính vào bảng" khi `countedSources` không có `MISSION_REWARD` |
| Số ngày học | Số người học đúng 1, 2, … ngày trong các ngày đã qua của tuần (Thứ Tư: 1–3; tuần trước: 1–7) | — |

### 3.3. Bảng

| Cột | Hiển thị | Ẩn dưới |
| :--- | :--- | :--- |
| Hạng | Số hạng; "đồng hạng" dòng dưới khi `tied`. Tuần này: xu hướng ▲n (xanh), ▼n (xám, không đỏ: mobile §10.4), "—" khi 0 hoặc `null` (tooltip nói vì sao) | — |
| Người học | Tên (nút mở drawer), badge **Cần xem** khi có cờ (badge duy nhất của bảng, §3.5 design.md); dòng dưới: email, `#id` | — |
| XP tuần | Số, vạch so với người dẫn đầu (vạch vàng khi có cờ) | — |
| Để vượt hạng trên | `+n` = điểm dòng thấp nhất của nhóm điểm liền trên − điểm của mình + 1 (LB-07); "—" ở hạng 1 | — |
| Ôn thẻ, Quiz, Booster | XP theo nguồn; Booster "—" khi 0. Ôn thẻ chữ vàng khi dính cờ "Ôn thẻ dồn dập" | 1280px |
| Ngày học | `activeDays` / số ngày đã qua | — |
| Cao nhất 1 giờ | `peakHourXp`; chữ vàng khi dính cờ "Nhiều XP trong một giờ" | — |
| Đạt mức lúc | "Hôm nay 08:42" hoặc "Thứ 3 21:17" (giờ Việt Nam); tooltip đủ ngày giờ. Giải thích thứ tự trong nhóm bằng điểm | 1536px |

Thứ tự dòng là thứ tự API (LB-04), không cho sắp xếp lại: bảng phải giống bảng người học thấy.

### 3.4. Drawer một người học

| Phần | Nội dung |
| :--- | :--- |
| Tiêu đề | Tên; dưới là email và `#id` |
| Cần xem | Hộp vàng (chỉ khi có cờ): từng cờ với con số và ngưỡng; câu "Bảng không tự loại ai hay trừ điểm. Nếu xác minh là gian lận, khóa tài khoản trong hồ sơ người học…" |
| Tuần dd/mm – dd/mm | Ba dải số nhỏ: Hạng, XP tuần, Để vượt hạng N, So với 00:00 · XP ôn thẻ, XP quiz, Phần Booster, Lượt cộng XP · Ngày học, Cao nhất 1 giờ, Đạt mức lúc |
| Người học thấy trên ứng dụng | Khung điện thoại theo mobile design.md §10.4 và §6.11: hạng 1–3 màu thưởng, ảnh đại diện thay bằng chữ cái đầu, XP màu `reward-700`, xu hướng ▲▼—; hàng của mình nền `primary-50`, viền trái 3px. Hiện top 3, rồi "⋯", hàng ngay trên và hàng của mình (hàng của mình dính đáy trên app). Dòng cuối: "Cần thêm N XP để vượt hạng M". Chú thích: mô phỏng, app chưa có màn; người khác chỉ thấy tên, ảnh, khung, XP tuần, xu hướng (LB-10) |
| Chân | "Mở hồ sơ người học" → `/learners/:id` |

## 4. "Cần xem" (OQ-LB-06)

Ngưỡng nằm ở client (KT-08), một chỗ: `ANOMALY` trong `domains/admin-leaderboard/mappers.ts`. Một cờ là lời mời xem lại, **không phải kết luận gian lận** và không kéo theo hành động tự động (design.md P7).

| Cờ | Điều kiện | Vì sao ngưỡng này |
| :--- | :--- | :--- |
| Nhiều XP trong một giờ | `peakHourXp ≥ 1.500` | Quiz trả 10 XP mỗi câu đúng, tối đa 200 XP cho quiz 20 câu, ×2 khi có Booster. 1.500 XP/giờ ≈ 8 quiz 20 câu đúng hết trong một giờ (4 quiz nếu có Booster): nhịp của script gửi kết quả quiz hơn là của người học |
| Ôn thẻ dồn dập | `reviewXp / activeDays ≥ 1.000` | Ôn thẻ trả 2 XP cho lần ôn đầu của mỗi thẻ trong ngày. 1.000 XP mỗi ngày học ≈ 500 thẻ khác nhau mỗi ngày (250 nếu có Booster): dấu hiệu "nuôi" thẻ để lấy XP |

Không gắn cờ cho Booster: XP Booster mua bằng Coin kiếm từ học và được tính theo FR-09; tỉ lệ Booster hiện ở cột và ở "Nguồn XP" để người vận hành tự đánh giá.

## 5. Dữ liệu mẫu (`domains/admin-leaderboard/fixtures.ts`)

- **Người học thật của màn Người học**: cùng id, tên, email, trạng thái; chỉ tài khoản `ACTIVE` (đã kích hoạt, không bị khóa) được xếp hạng, nên "Tham gia" có mẫu số 42 = 48 − 4 chờ kích hoạt − 2 đã khóa. "Mở hồ sơ" mở đúng hồ sơ mẫu.
- **XP theo luật thật**: lần ôn đầu của thẻ 2 XP, quiz 10 XP mỗi câu đúng (5/10/20 câu), Booster ×2 trong 30 phút. Xác suất học mỗi ngày theo độ chăm của người đó trong fixture Người học (đang có streak, học trong 7 ngày, trong 30 ngày).
- **Đồng hồ mẫu Thứ Tư 21/10 14:20**, giữa tuần: xu hướng so với 00:00 hôm nay có nghĩa, còn 4 ngày 9 giờ. Tuần trước (12/10–18/10) đã chốt lúc 00:02 Thứ Hai.
- **Ca có chủ đích:** #126 làm 11 quiz 20 câu trong chưa đầy một giờ tối Thứ Ba, nửa đầu có Booster (3.590 XP/giờ → "Nhiều XP trong một giờ", hạng 1); #143 ôn 650 và 720 thẻ trong hai tối (1.370 XP ôn thẻ/ngày học → "Ôn thẻ dồn dập", hạng 2); #117 và #130 cùng 410 XP, #117 đạt trước nên đứng trước. Hai người này có XP cao trong hồ sơ mẫu nhưng rất ít từ, khớp với vai.
- Tuần trước không có ai dính cờ: thấy ngay hai mẫu hình trên là mới trong tuần.

## 6. Tiêu chí nghiệm thu

| ID | Tiêu chí | Kiểm bằng |
| :--- | :--- | :--- |
| AC-LBA-01 | Bảng giữ đúng thứ tự LB-04, hạng chung (1, 2, 2, 4), `tied` đúng; `reviewXp + quizXp = score`; chỉ tài khoản đủ điều kiện | `admin-leaderboard.test.ts` LB1 |
| AC-LBA-02 | "Để vượt hạng trên" theo LB-07: dòng thấp nhất của nhóm liền trên; "—" ở hạng 1 | LB2 |
| AC-LBA-03 | Cờ "Cần xem" tính đúng ngưỡng (bao gồm biên), có câu giải thích kèm con số | LB3 |
| AC-LBA-04 | Ô dải số liệu đếm trên cả bảng, bấm để lọc; tìm không dấu theo tên, email, đúng ID | LB4, `admin-leaderboard.dom.test.ts` D1, D2 |
| AC-LBA-05 | Mô phỏng app: top 3, hàng ngay trên, hàng của mình, khoảng cách | LB6, D2 |
| AC-LBA-06 | Tuần trước là snapshot riêng (`week=PREVIOUS`), "Đã chốt", không xu hướng, không đếm ngược | D3 |
| AC-LBA-07 | Lỗi API nói rõ nguyên nhân (404 "chưa có API", 403, mất kết nối); bảng trống sáng Thứ Hai có lời giải thích | D4 |
| AC-LBA-08 | Không mã spec, không khái niệm ngoài scope (league, mùa, phòng, Gems, trừ XP) trên màn; không "Dữ liệu mẫu" khi gọi API thật | D1 |
| AC-LBA-09 | Khi backend xong: cùng `asOf`, hạng, điểm với app cho cùng một người (AC-LB-15 của đặc tả backend) | Staging |

## 7. Câu hỏi mở cho PO

| ID | Câu hỏi | Đề xuất |
| :--- | :--- | :--- |
| OQ-LBA-01 | Ngưỡng "Cần xem" (OQ-LB-06) | Giữ 1.500 XP/giờ và 1.000 XP ôn thẻ/ngày học tới khi có 4 tuần số liệu thật, rồi đặt lại theo phân vị 99 |
| OQ-LBA-02 | API admin thêm `rankChange` (§2) | Đồng ý; đã ghi vào đặc tả backend rev 1.1 |
| OQ-LBA-03 | Màn admin phát hành trước hay sau màn người học? | Sau (thứ tự phát hành của đặc tả backend §13): giữ MOCK tới khi app có MH-GAME-01 |

Các câu OQ-LB-01…07 của đặc tả backend vẫn mở; màn tự theo `countedSources` nên OQ-LB-01 đổi không cần sửa giao diện.

## 8. Nợ và giới hạn đã biết

| ID | Nội dung |
| :--- | :--- |
| TD-LBA-01 | ~~Mock cũ `features/seasons`, `domains/seasons`~~ Đã xóa 2026-10-21 theo đồng ý của PO |
| TD-LBA-02 | Hàng mô phỏng theo design.md §10.4 vì app chưa có màn; câu chữ app chờ COPY-LB-01. Khi app có màn thì đối chiếu lại (P4) |
| TD-LBA-03 | Đồng hồ mẫu (21/10 14:20) muộn hơn đồng hồ của fixture Người học (19/10 09:30), nên "Học gần nhất" trong hồ sơ mẫu có thể sớm hơn XP tuần này |
| TD-LBA-04 | Bảng hiện 100 dòng mỗi lần. Gần 5.000 người/tuần thì làm theo trần thiết kế §10.3 của đặc tả backend (phân trang API admin theo `asOf`) |
