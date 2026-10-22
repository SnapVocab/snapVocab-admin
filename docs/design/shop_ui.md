# Admin · Cửa hàng & Vật phẩm — Đặc tả màn hình

> **Rev 1 · 2026-10-19 · Trạng thái: đã dựng 2026-10-18, PO duyệt 2026-10-22.**
> Nền tảng: [design.md](./design.md) rev 2. Nghiệp vụ: [shop.md](../../../docs/decisions/shop.md). Khi mâu thuẫn, shop.md đứng trên tài liệu này.

## 1. Mục tiêu

Người vận hành quản lý danh mục vật phẩm (Giao diện cửa hàng, Khung avatar, XP Booster) theo vòng đời `DRAFT → PUBLISHED → ARCHIVED`. Màn phải trả lời nhanh ba câu hỏi:

1. Lúc này người học mua được gì?
2. Có gì sắp thay đổi?
3. Giá này có hợp lý so với nền kinh tế không?

Trục thời gian của người vận hành: Find → Inspect → Edit → Validate → Publish → Audit.

## 2. Nguồn dữ liệu

| Khối | Nguồn | Nhãn |
| :--- | :--- | :--- |
| Danh mục | `GET /api/admin/shop/items?page=0&size=100`: toàn bộ catalog trong một trang (`useShopCatalog`) | REAL |
| Chi tiết, tạo, sửa | `GET/POST/PATCH /api/admin/shop/items[/{id}]` (PATCH có `version`) | REAL |
| Vòng đời | `POST …/{id}/publish`, `POST …/{id}/archive`, `DELETE …/{id}` (chỉ DRAFT) | REAL |
| Siêu dữ liệu form | `GET /api/admin/shop/item-types`: trường, giới hạn, theme còn trống, quy tắc khóa | REAL |
| Upload ảnh | `POST /api/admin/shop/assets/upload-url` → PUT presigned (MinIO) | REAL |
| "Ngày đủ" | giá ÷ `MAX_COIN_PER_DAY` (85, mức kinh tế Daily Mission đã duyệt) | Tính từ hằng số |
| Doanh số, lượt mua, luồng Coin | Chưa có API admin | CẦN BACKEND: không hiển thị |
| Nhật ký ai sửa gì | Chưa có audit | CẦN BACKEND ([design.md](./design.md) §8) |

## 3. Màn danh sách

```text
LIVEOPS & ECONOMY
🛍 Cửa hàng & Vật phẩm                                              [+ Tạo vật phẩm mới]
Quản lý danh mục… Giá quy ra ngày: số ngày làm đủ 5 nhiệm vụ (tối đa 85 Coin/ngày).

┌ 19 Vật phẩm │ 13 ● Đang mở bán │ 0 ● Chờ mở bán │ 1 ● Chỉ làm quà │ 2 ● Bản nháp │ 2 ● Hết hạn │ 1 ● Đã lưu trữ │ Giá đang bán … ┐
[Tất cả 19 | ◎ Khung avatar 10 | ⚡ XP Boosters 6 | ✦ Giao diện 3]           [🔍 Tìm theo mã, tên…] [▦|☰] [↻]

◎ KHUNG AVATAR 10   Giá đang bán 🪙 350–1.500 · trung vị 850 · ≈ 4,1–17,6 ngày
┌──────────┐ ┌──────────┐ ┌──────────┐ …
│[Đang bán]#10│ ảnh khung trên avatar │ tên · mã │ 🪙 350  ≈ 4,1 ngày │ dòng thông số │
```

### 3.1. Dải số liệu

| Ô | Định nghĩa (`deriveSaleState`, giờ hiện tại) |
| :--- | :--- |
| Vật phẩm | Tổng số item của tab loại đang chọn. Bấm để bỏ lọc trạng thái |
| Đang mở bán | `PUBLISHED`, `purchasable`, đang trong khung giờ bán |
| Chờ mở bán | `PUBLISHED`, `purchasable`, `availableFrom` ở tương lai |
| Chỉ làm quà | `PUBLISHED`, không `purchasable` |
| Bản nháp | `DRAFT` |
| Hết hạn | `PUBLISHED`, `purchasable`, đã qua `availableUntil` |
| Đã lưu trữ | `ARCHIVED` |
| Ô ngữ cảnh (phải) | Tab "Tất cả": nhắc chọn một loại. Tab có loại: `priceBand` (min–max, trung vị, số item, ≈ ngày) của item **đang mở bán** cùng loại |

### 3.2. Toolbar và kiểu hiển thị

- **Tab loại** theo thứ tự kệ: Khung avatar → XP Boosters → Giao diện. Mỗi tab có icon brand (`FrameIcon`, `BoosterIcon`, `ThemeIcon`) và số đếm.
- **Tìm kiếm** chạy trên client, không phân biệt hoa thường, theo `code` và `name`.
- **Lưới** (mặc định):
  - Tab "Tất cả" chia **kệ** theo loại. Đầu kệ ghi tên loại, số item và dải giá đang bán. Kệ rỗng sau khi lọc thì ẩn.
  - Trong kệ, xếp theo `sortOrder` rồi `id`, đúng thứ tự người học thấy (`ShopItemRepository.findCatalog`).
- **Bảng:** xếp theo `updatedAt` giảm dần (thứ tự API).
  - Cột: Vật phẩm, Loại, Thứ tự, Giá (+ ≈ ngày), Trạng thái bán (+ lý do), Cập nhật, Thao tác.
  - Thao tác: Phát hành / Xóa (DRAFT), Ngừng bán (PUBLISHED), Sửa (luôn ở cuối).

### 3.3. Tile storefront (`ShopItemCard`)

| Vùng | Nội dung |
| :--- | :--- |
| Khung hình (nền theo loại, `ARTWORK_BG`) | Badge trạng thái bán (trái trên), `#sortOrder` (phải trên). Khung avatar: ảnh khung phủ lên avatar mẫu theo tỉ lệ 58%. Loại khác: icon đã upload; nếu chưa có thì dùng icon brand. Giao diện: thêm chấm màu theme (viền sáng, viền tối, nền tối) |
| Thông tin | Nhãn loại, tên (1 dòng), mã (mono) |
| Kinh tế | `CoinIcon` + giá + "≈ N ngày". Không bán: `RewardGiftIcon` + "Chỉ dùng làm quà" |
| Thông số | Booster: "×2 XP · N phút · Tối đa M". Giao diện: "Bộ {theme}". Khung: "Khung Avatar hồ sơ" |
| Trạng thái tile | DRAFT: viền đứt. ARCHIVED: hình xám, mờ 50%. Hover: nhấc 2px kèm bóng. Bấm để mở editor |

### 3.4. Trạng thái màn

| Trạng thái | Hiển thị |
| :--- | :--- |
| Đang tải | 8 tile skeleton |
| Lỗi | Banner kèm "Thử lại" |
| Catalog > 100 item | Banner cảnh báo cần chuyển sang phân trang server (TD-ADS-10) |
| Trống | "Tạo vật phẩm đầu tiên" |
| Lọc không có kết quả | "Xóa bộ lọc" |

## 4. Editor (builder)

### 4.1. Header dính

| Thành phần | Chi tiết |
| :--- | :--- |
| Bên trái | Breadcrumb "Cửa hàng / tên"; nút ←; tiêu đề; badge vòng đời; `vN`; "Có thay đổi chưa lưu" hoặc "Đã lưu" |
| Nút | DRAFT: [🗑 Xóa bản nháp] (`danger-outline`) · [Phát hành / Lưu và phát hành]. PUBLISHED: [Ngừng bán vĩnh viễn] (`danger-outline`). Primary duy nhất: [Lưu bản nháp / Lưu thay đổi] |

### 4.2. Các section (theo thứ tự tạo)

| Section | Trường | Quy tắc |
| :--- | :--- | :--- |
| **CƠ BẢN** | Mã, Tên, Mô tả | Mã: chữ HOA, 3–64 ký tự `[A-Z][A-Z0-9_]`, khóa sau phát hành. Tên ≤ 100. Mô tả ≤ 500 |
| **LOẠI & CẤU HÌNH** | Loại (4 thẻ chọn có icon brand) và cấu hình riêng | Đổi loại phải xác nhận. Bộ màu: chọn `themeKey` từ danh sách theme còn trống (mỗi theme chỉ một item). Khung: ảnh PNG/WebP 512×512 có alpha, ≤ 300 KB. Booster: ×2 cố định, thời lượng 5–180 phút (mặc định 30), giữ tối đa 1–10 thẻ (mặc định 5). Đóng băng chuỗi (2026-10-22, [streak_freeze.md](../../../docs/decisions/streak_freeze.md)): chỉ giữ tối đa 1–5 (mặc định 2), một dòng giải thích cách tự dùng; chỉ một item loại này được phát hành (backend từ chối item thứ hai) |
| **HÌNH ẢNH** | Icon vật phẩm | PNG/WebP vuông ≥ 256×256, ≤ 200 KB. Kiểm header ảnh ngay trên client |
| **BÁN TRONG CỬA HÀNG** | Kết luận trạng thái bán trực tiếp, Cho phép mua, Giá, Thứ tự, Thời gian bán | Bản nháp hiện "Sau khi phát hành: …". Giá 1–100.000 khi bán, kèm guardrail (§4.3). Thời gian bán: Không giới hạn hoặc Theo thời gian, nhập theo UTC+7 |

Khóa theo trạng thái lấy từ siêu dữ liệu. Mặc định chỉ sửa được khi ở DRAFT. Item đã lưu trữ chỉ còn sửa được tên, mô tả, icon và thứ tự. Mỗi trường bị khóa có nhãn và lý do khi hover.

### 4.3. Guardrail giá (`PriceGuard`)

Hiện dưới ô giá khi "Cho phép mua" đang bật:

1. "1 đến 100,000 Coin. **≈ N ngày** làm đủ nhiệm vụ (tối đa 85 Coin/ngày)."
2. Dải giá của các vật phẩm **khác** cùng loại đang mở bán (loại trừ chính item này): min–max, trung vị, số vật phẩm. Nếu chỉ có 1 thì ghi "N Coin (1 vật phẩm)". Nếu chưa có thì ghi "Chưa có … nào khác đang bán để so giá."
3. Hộp cảnh báo khi **có ≥ 3 vật phẩm để so** và giá > ×1,5 giá cao nhất hoặc < giá thấp nhất ÷ 1,5. Câu cảnh báo kết thúc bằng "Gợi ý để rà lại, không chặn lưu." Ngưỡng: OQ-ADS-04.
4. Bậc giá PO duyệt 2026-10-21 (PD-SHX-01, [shop.md](../../../docs/decisions/shop.md) §8.6; `PRICE_TIERS`, `priceTier`): dòng "Bậc giá: {bậc} (min–max Coin)". Giá nằm ngoài cả 3 bậc (60–250, 300–700, 800–1.500) thì hiện hộp cảnh báo liệt kê 3 bậc. Không chặn lưu.

Thời gian bán "Theo thời gian" có giờ kết thúc: hộp cảnh báo "App người học không hiện hạn bán…" (PD-SHX-05 = Không bán theo mùa). Không chặn lưu.

### 4.4. Cột phải

| Panel | Nội dung |
| :--- | :--- |
| **Xem trước trên ứng dụng** (`ShopMobileSimulator`) | Khung điện thoại với 3 tab: Cửa hàng (card mua), Kho đồ (card sở hữu: Áp dụng / Trang bị / Kích hoạt), Hồ sơ (khung trên avatar). Giao diện có công tắc Sáng/Tối theo bề mặt theme của mobile. Ngữ cảnh mẫu theo [design.md](./design.md) §6 |
| **Vòng đời** | Tạo, Phát hành, Sửa gần nhất · vN, ID (UTC+7). Dòng "Chưa có nhật ký ai sửa gì: cần audit log phía máy chủ." |

### 4.5. An toàn thao tác

- Bấm Phát hành hoặc Ngừng bán khi còn thay đổi chưa lưu: lưu trước, rồi mới mở hộp xác nhận.
- Xung đột phiên bản: banner "Tải bản mới nhất". Thay đổi đang nhập được cất riêng và có nút "Áp dụng lại thay đổi của tôi". Thay đổi ở trường vừa bị khóa thì bỏ, có báo tên trường.
- PATCH chỉ gửi trường đã đổi, để khung giờ bán (lưu tới giây) không bị ghi đè bởi input tới phút.
- Chặn rời trang khi có thay đổi chưa lưu hoặc đang upload. Có thao tác ghi đang chạy thì các nút chờ.

## 5. Tiêu chí nghiệm thu

| ID | Tiêu chí | Kiểm bằng |
| :--- | :--- | :--- |
| AC-SHOP-01 | Mỗi ô trạng thái đếm đúng theo `deriveSaleState` trên toàn catalog của tab loại; tổng các ô trạng thái = ô "Vật phẩm" | Test 11–14 + kiểm tay |
| AC-SHOP-02 | Ô có giá trị 0 bị vô hiệu (trừ khi đang chọn); bấm ô đang chọn thì bỏ lọc | Kiểm tay |
| AC-SHOP-03 | Lưới xếp `sortOrder` tăng dần rồi `id`; tab "Tất cả" chia kệ theo thứ tự §3.2; kệ rỗng thì ẩn | Kiểm tay |
| AC-SHOP-04 | Dải giá chỉ tính item đang mở bán cùng loại; trung vị của số lượng chẵn = trung bình hai giá trị giữa | `admin-shop.test.ts` G1 |
| AC-SHOP-05 | Cảnh báo giá chỉ xuất hiện khi so được với ≥ 3 vật phẩm và vượt ×1,5; không bao giờ chặn Lưu | G1 + kiểm tay |
| AC-SHOP-06 | "≈ N ngày" = giá ÷ 85, một chữ số thập phân, định dạng vi-VN (850 → "≈ 10 ngày", 350 → "≈ 4,1 ngày") | G1 |
| AC-SHOP-06b | Bậc giá: 60, 250 → Khởi đầu; 400 → Phổ thông; 1.500 → Cao cấp; 59, 251, 299, 701, 799, 1.501 → ngoài bậc (cảnh báo, không chặn lưu) | `admin-shop.test.ts` "PD-SHX-01 price tiers" |
| AC-SHOP-07 | Panel Vòng đời chỉ hiển thị mốc có trong DTO; không có lịch sử giả | Kiểm tay |
| AC-SHOP-08 | Preview không chứa tính năng ngoài scope và mọi ngữ cảnh mẫu đều có nhãn | **Chưa đạt**: TD-ADS-06, TD-ADS-07 |
| AC-SHOP-09 | Các luồng an toàn §4.5 giữ nguyên hành vi trước khi làm lại giao diện | `admin-shop.test.ts` (R1–R5, 15–24) |

## 6. Ngoài phạm vi

- Doanh số và lượt mua theo item, phân tích kinh tế (cần API `coin_transactions` cho admin).
- Bulk action.
- Lịch thay đổi giá.
- Loại item mới (theo kế hoạch mở rộng Shop PD-SHX, chờ PO).
