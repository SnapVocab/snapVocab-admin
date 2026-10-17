# Admin Missions — triển khai giao diện 2026-10-05

## Phạm vi

Đã triển khai UI/API client theo [thiết kế](./admin_missions_api_design.md): danh sách catalog, lọc/tìm kiếm local, summary invariant, tạo/sửa toàn trang, preview nội dung, item picker dùng API Shop và xác nhận bật/tắt. Không dùng mock Missions cũ. Backend Admin API §8.3 đã được bổ sung sau đó (xem mục Backend).

Code mới đặt tại `src/domains/admin-missions` và `src/features/admin-missions` để tách contract thật khỏi prototype `src/domains/missions` đang được lưu tham khảo. Không xóa prototype hoặc các test cũ; bundle màn mới không import chúng.

## Truy cập

- Chạy `npm run dev`, đăng nhập Admin, vào **LIVEOPS & ECONOMY → Nhiệm vụ hằng ngày**.
- Development hiển thị menu mới. Cần chạy backend bản có `AdminMissionTemplateController`; backend cũ trả 404 và màn hiển thị lỗi + Thử lại, không sinh catalog giả.
- Bản build release mặc định ẩn menu/route Missions. Chỉ bật bằng `VITE_ADMIN_MISSIONS_ENABLED=true` tại build sau khi backend đạt nghiệm thu; đây là cờ hiển thị, không thay thế ROLE_ADMIN trên backend. Không tự triển khai hoặc bật production trong thay đổi này.
- Item picker dùng API Shop PUBLISHED có tìm kiếm và phân trang. Mã item đang chọn được giữ riêng ngoài kết quả tìm kiếm hiện tại.

## Các bảo vệ

- Mapper whitelist nội dung và mapper activation độc lập; activation chỉ gửi `{version,isActive}`; không optimistic bật/tắt.
- Mã chỉ nhập lúc tạo; POST không gửi active/version; PATCH chỉ gửi thay đổi và version. Thay đổi item/fallback luôn gửi cặp, kể cả xóa bằng null.
- Bảy preset theo catalog canonical; tổ hợp chưa hỗ trợ không được bật trong UI. NONE dùng nhãn “Không có điều kiện cấp”, không chứng minh khả năng hoàn thành.
- Tính invariant trên toàn catalog chưa lọc. Kết quả frontend chỉ giúp giải thích; backend vẫn phải serialize mọi writer cấp catalog trong transaction.
- Double submit bị chặn; conflict giữ bản nháp. Mất response khóa retry cho đến khi kiểm tra trạng thái server. Activation không tự đảo trạng thái lần nữa sau lỗi mạng.
- Điều hướng/rời trang cảnh báo khi có nội dung chưa lưu. Refresh catalog không remount editor và không bỏ bản nháp.
- Bổ sung theo thiết kế: mã khóa có nút sao chép; khối “Điều kiện cấp” riêng có giải thích; preview dùng icon theo nhóm; item thưởng hiển thị tên/icon Shop ở bảng, preview và modal; modal bật/tắt hiện trạng thái trước → sau; tooltip trọng số.
- Lỗi: `MISSION_TEMPLATE_NOT_FOUND` đưa về danh sách kèm thông báo; `REWARD_ITEM_NOT_ELIGIBLE` tải lại dữ liệu Shop; `MISSION_POOL_INSUFFICIENT` giải thích số mẫu NONE dự kiến còn thiếu (tính trên catalog đã tải, backend vẫn quyết định).

## Backend

`AdminMissionTemplateController` + `AdminMissionTemplateService` (gói `mission`): GET danh sách (`active`, `category`), GET chi tiết, POST (luôn Tắt), PATCH (version bắt buộc, `code` ⇒ `FIELD_LOCKED`, field lạ ⇒ `VALIDATION_ERROR`). Mọi ghi khóa toàn catalog (`SELECT … FOR UPDATE`) trước khi đọc, áp thay đổi rồi kiểm tra invariant §4.2 trong cùng transaction; vi phạm ⇒ 409 `MISSION_POOL_INSUFFICIENT`. Lỗi trả `data.errors[{field,code,message}]` như Shop.

- Item thưởng chỉ kiểm tra PUBLISHED khi tạo, khi đổi item hoặc khi bật template; tắt template hay sửa field khác không bị chặn bởi item đã archive.
- Catalog không có template active (trạng thái “chưa kích hoạt” §7.7) được chấp nhận. Hệ quả: từ catalog trống không thể bật từng template một (1 template active đã vi phạm invariant); khởi tạo catalog đầu tiên qua seed lúc khởi động backend hoặc script `migration_daily_mission_catalog_template.sql`.
- Giới hạn: khi bảng trống, InnoDB chỉ khóa gap nên hai POST đầu tiên đồng thời có thể deadlock (một request 500, không ghi gì).
- `AdminMissionTemplateHttpTest` (MySQL local): phân quyền, tạo/sửa/xóa nullable, các mã lỗi, invariant khi tắt hoặc đổi eligibility, và race C=5/S=1 hai admin cùng tắt hai template cốt lõi ⇒ đúng một 200, một 409, DB cuối vẫn đạt invariant. Bỏ khóa catalog thì test race fail 3/3.

## Kiểm tra và giới hạn

Test mới kiểm tra invariant/gated/unsupported template, numeric validation, payload nullable và metadata, mapping preset, transport/envelope, render danh sách và form tạo. Chạy chung bộ test Admin và build TypeScript/Vite.

Render test dùng React server renderer và fixture test, không thay cho kiểm thử thao tác trên browser hoặc nghiệm thu API thật. Chưa thao tác end-to-end trên browser với backend thật. Fairness của quiz/unsupported producer và quyết định PD-DM-06 vẫn là điều kiện riêng trước release.
