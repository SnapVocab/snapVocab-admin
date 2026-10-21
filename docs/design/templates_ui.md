# Admin · Mẫu thẻ — Đặc tả màn hình

> **Rev 1 · 2026-10-21 · Scope: NOW (đọc) + MOCK (ghi). Đã dựng, chờ PO duyệt.**
> Đọc dùng API thật: schema, mẫu, cây chủ đề, mục từ. Ghi (sửa mẫu, đặt mặc định) chưa có API nên chạy trên bản nháp trong trình duyệt, sau cờ `VITE_ADMIN_TEMPLATES_FIXTURES`; contract đề xuất ở §8.
> Nền tảng: [design.md](./design.md) rev 4 (§3.7 ngôn ngữ giao diện, §5.2 dải số liệu, §5.5 editor, §6 preview). Đánh giá sản phẩm: [admin_product_review_2026-10-19.md](../../../docs/reviews/admin_product_review_2026-10-19.md) §3.5.
> Thay bản mock cũ "Card Templates Studio" (`features/templates`, `domains/templates`). Route đã chuyển sang màn mới; file cũ còn trên đĩa, chờ đồng ý xóa (TD-TPL-05).

## 1. Mục tiêu và ranh giới

Màn trả lời ba câu hỏi:

1. **Mẫu nào đang vẽ thẻ học, mẫu nào Quiz đang dùng, cho bao nhiêu chủ đề?**
2. **Mẫu có hiện đúng trên dữ liệu thật không?** Trường trống, thẻ in "—", dữ liệu nằm sai nhóm, mặt trước lộ đáp án.
3. **Sửa hoặc đổi mặc định thì ai bị ảnh hưởng?**

Sự thật trong code quyết định cách màn nói (kiểm 2026-10-21):

| Sự thật | Nguồn |
| :--- | :--- |
| App vẽ thẻ học bằng mẫu **mặc định** của schema, bỏ qua mẫu mà chủ đề chọn | `SnapVocab/src/features/learn/use-collection-detail.ts` (activeTemplate = `templates.find(t => t.isDefault)`), `features/study/study-session-screen.tsx` |
| Mẫu chủ đề chọn (`topics.active_template_id`) chỉ quyết định trường nào Quiz lấy làm từ, nghĩa, ví dụ, và từ nào được tính cho nhiệm vụ lưu từ | `QuizContentResolver.resolve`, `resolveQuizReady` |
| Không có API ghi mẫu thẻ | `CreateSchemaDTO` không có mẫu; `SchemaMapper` bỏ qua `templates`; `TopicService.createTopicTemplate()` trả `null` |
| Admin **không** gọi `PUT /api/schemas/{id}`: lệnh này dựng lại nhóm thuộc tính (orphanRemoval), có thể xóa giá trị của mục từ | `SchemaService.updateSchema`, `SchemaMapper.updateEntityFromDto` |
| Máy chủ nhận mẫu hệ thống theo **mã** (`STANDARD`, `LISTENING`, `REVERSE`): khởi động thì tạo lại mẫu thiếu mã, migration gắn vai trò theo mã | `DataInitializer.hasTemplate`, `SemanticBindingMigration.SYSTEM_TEMPLATE_CODES` |
| Người học "Lưu cấu hình" ở Template Builder của app thì tách (fork) schema của chủ đề, kèm bản sao các mẫu; bản tách không nhận sửa từ admin | `template-builder-screen.tsx` `handleSave`, `TopicService.forkTopicSchema` |

**Ranh giới:**

- Chỉ mẫu của schema hệ thống. Bản riêng của người học chỉ được đếm (riêng tư; đánh giá §3.5 bỏ kiểm duyệt mẫu tùy chỉnh).
- Không tạo, nhân bản hay xóa mẫu (FUTURE): app chỉ vẽ mẫu mặc định nên mẫu mới chỉ có ích cho Quiz.
- Không đổi mã mẫu. Không đổi thuộc tính của một trường đã có (xóa trường rồi thêm trường mới).
- Không giả lập lịch sử sửa: "Vòng đời" chỉ có mốc thật (design.md §8).

### 1.1. Đối chiếu với bản mock cũ

Mật độ giữ nguyên ([design.md](./design.md) §3.7); phần đổi là dữ liệu ngoài scope và cách trình bày.

| Bản cũ | Bản mới | Lý do |
| :--- | :--- | :--- |
| Ribbon 5 thẻ: số mẫu hệ thống/custom, Deck áp dụng, kiểu tương tác FLIP/TYPE_IN/TAP, tỉ lệ nhớ FSRS theo mẫu, độ phủ media | Dải số liệu kiêm bộ lọc: Mẫu hệ thống, Vẽ thẻ học, Quiz đang dùng, Chưa dùng ở đâu, Cần rà; ô ngữ cảnh Chủ đề hệ thống, Bản riêng của người học | Không có Deck, kiểu tương tác hay tỉ lệ nhớ theo mẫu. Độ phủ thay bằng số thật trên chủ đề xem thử (§4.1, §4.2) |
| Tab "Mẫu hệ thống": lưới card, chip trường, Decks, học viên, retention | Mỗi mẫu một hàng: hai mặt thẻ vẽ bằng renderer của app trên một từ thật; Thẻ học, Quiz (số chủ đề), Kiểu Quiz chạy được, trường của từng mặt, vấn đề | Trả lời câu hỏi 1 và 2 ngay trên danh sách |
| Tab "Kiểm duyệt Custom": gắn cờ, Promote, xóa mềm | Bỏ. Ô "Bản riêng của người học" | Mẫu cá nhân riêng tư (đánh giá §3.5) |
| Tab "Studio": wizard 4 bước, layout, tương tác, quy tắc TYPE_IN | Editor `/templates/:id` theo §5.5: Cơ bản, Mặt trước, Mặt sau là đúng danh sách phần tử máy chủ lưu (phần, ngắt cột, trường), thiết lập trường; Kiểm tra trực tiếp | Đúng model `TemplateElement`/`TemplateField`/`SemanticRole` |
| Tab "Ma trận Deck": CEFR, số thẻ, học viên, hoàn thành, nút Đổi template | Bảng "Trường dữ liệu trên thẻ" (thuộc tính × mẫu, kèm số mục có dữ liệu) và khối "Tác động" trong editor (chủ đề Quiz đang dùng, link màn Chủ đề) | Không có Deck, CEFR. Đổi mẫu cho chủ đề đã có ở màn Chủ đề |
| Simulator điện thoại (🦊, "🔥 7 days", Web Speech, từ mẫu cố định) | Thẻ của app (khung, mặt, phần, trường) ở mỗi hàng và cột phải editor; chọn chủ đề và từ thật; nút phát âm phát đúng URL TTS của app | design.md §6. Không ngữ cảnh mẫu ngoài thẻ |
| Drawer JSON + tải file | "Dữ liệu kỹ thuật: thân yêu cầu lưu (JSON)" cuối editor | Đủ cho dev đối chiếu contract |
| Modal gán mẫu cho nhiều Deck; xóa mềm mẫu | Bỏ | Không có Deck; xóa mẫu là FUTURE |

## 2. Contract

### 2.1. Đang dùng (API thật)

| Việc | Endpoint |
| :--- | :--- |
| Schema, nhóm thuộc tính, mẫu và phần tử | `GET /api/schemas` (ROLE_ADMIN nhận mọi schema, gồm bản tách của người học) |
| Chủ đề và mẫu Quiz của chủ đề | `GET /api/collections/system`, `GET /api/collections/{id}/topics?parentId=` (gốc, rồi con của từng gốc; cùng cache key với màn Chủ đề) |
| Dữ liệu xem thử | `GET /api/topics/{id}?page=0&size=500`, `GET /api/topics/{id}/schema` |

JSON có cờ Lombok ở hai tên (`isDefault`/`default`, `isSystem`/`system`); `normalizeSchema` đọc cả hai.

### 2.2. Đề xuất (MOCK tới khi có)

`PUT /api/admin/templates/{id}` và `POST /api/admin/templates/{id}/default` (§8). Cờ `VITE_ADMIN_TEMPLATES_FIXTURES` mặc định bật ở dev: lưu và đặt mặc định ghi vào một lớp trong bộ nhớ (`domains/admin-templates/fixtures.ts`, tải động) đè lên dữ liệu thật, mất khi tải lại. Bản release (cờ tắt) chỉ xem: không có nút Sửa, Lưu, Đặt làm mặc định.

## 3. Phát hiện từ dữ liệu thật (DB clone 2026-10-21)

Dữ liệu: 1 schema hệ thống (`DEFAULT_ENGLISH`, 14 thuộc tính trong 3 nhóm), 3 mẫu, 201 chủ đề hệ thống, 15.663 mục của collection hệ thống. Số dưới đây tính bằng chính hàm của màn (`fieldCoverage`) trên toàn bộ mục.

| Phát hiện | Con số | Màn xử lý |
| :--- | :--- | :--- |
| App luôn vẽ mẫu mặc định | 204/204 chủ đề chọn STANDARD; LISTENING, REVERSE không được vẽ ở đâu | Dòng "Thẻ học" mỗi mẫu, câu mô tả trang. Mô tả hộp "Mẫu thẻ của chủ đề" ở màn Chủ đề đã sửa: trước đó hứa "đổi cách người học thấy thẻ" |
| LISTENING: trường "Nghe phát âm" gắn `main.word` với vai trò Âm thanh, nên app in chữ của từ thay cho nút nghe: mặt trước lộ luôn đáp án | 1 mẫu | "Cần rà", cảnh báo trên hàng và trong editor, thẻ xem trước cho thấy đúng như vậy (OQ-TPL-02) |
| "Định nghĩa tiếng Anh" gắn `meaning.meaning`, nhưng dữ liệu nằm ở `main.meaning` (ngoài schema); app vẫn hiện nhờ dò sang nhóm khác | 15.663/15.663 mục | Cột "Có trên thẻ" ghi "lệch nhóm"; bảng thuộc tính có dòng "Ngoài schema" (TD-ADS-17) |
| Hình ảnh (`meaning.image`) | 0/15.663 mục có ảnh | "không mục nào có dữ liệu, trường không hiện trên thẻ nào" |
| Câu ví dụ không ẩn khi trống | 7 mục không có ví dụ, thẻ in "—" | Ghi chú dữ liệu |
| Dịch câu ví dụ | 187 mục thiếu, trường bị ẩn | Ghi chú dữ liệu |
| Phần đầu STANDARD tên "Thông tin chung" trùng tên mặc định của app, nên app in tên nhóm "Thông tin chính" | STANDARD | Ghi chú dưới dòng phần trong editor |
| Theo `config/clone-remote-db.sh`, DB remote gắn vai trò Bản dịch / Nghĩa cho cả `examples.translation`: Quiz Trắc nghiệm và Ghép đôi báo `SEMANTIC_ROLE_AMBIGUOUS` (422). Script gỡ ở local | 3 mẫu trên remote | Kiểm tra Quiz bắt đúng lỗi này (test TP5). Cần kiểm lại và migrate trên remote (OQ-TPL-03) |
| Thuộc tính không mẫu nào dùng: `main.audio`, `main.base_word`, `main.head`, `main.definition`, `meaning.example` | 0–1 mục có dữ liệu | Bảng thuộc tính hiện "—" ở mọi mẫu |
| Bản riêng của người học | 0 schema | Ô dải số liệu |

## 4. Màn

### 4.1. Thư viện (`/templates`)

| Khối | Nội dung |
| :--- | :--- |
| Header | "Mẫu thẻ". Mô tả là quy tắc cần để đọc đúng: "Ứng dụng vẽ thẻ học bằng mẫu mặc định của schema. Mẫu mà từng chủ đề chọn chỉ quyết định trường nào Quiz lấy làm từ, nghĩa và ví dụ." Bên phải: "Cập nhật HH:MM", Làm mới |
| Notice (cờ bật) | Một `SampleDataNotice`: ghi chạy trên bản nháp, chờ API; đọc là dữ liệu thật |
| Dải số liệu | Mẫu hệ thống · Vẽ thẻ học (mẫu mặc định) · Quiz đang dùng (≥ 1 chủ đề chọn) · Chưa dùng ở đâu · Cần rà (Quiz lỗi hoặc có vấn đề hiển thị). Ô là bộ lọc. Ngữ cảnh: Chủ đề hệ thống, Bản riêng của người học |
| Xem thử với | Chọn chủ đề (nhóm theo chủ đề gốc) và từ, nút trước/sau, "N mục". Mặc định: con đầu tiên của chủ đề gốc đầu tiên. Dùng chung cho thẻ ở mọi hàng, cột "Có dữ liệu" và editor |
| Hàng mỗi mẫu | Mặc định đứng đầu. Trái: tên, badge "Mặc định" (ngoại lệ duy nhất), mã; Thẻ học; Quiz (số chủ đề); Kiểu Quiz ✓/✕; trường mặt trước, mặt sau (phần lặp ghi "lặp theo dòng"); vấn đề (chữ vàng). Phải: hai mặt thẻ ở đúng khổ app (340px) thu nhỏ 0,62 |
| Trường dữ liệu trên thẻ | Bảng thuộc tính × mẫu, nhóm theo nhóm của schema ("nhiều dòng mỗi mục" cho nhóm lặp). Cột: Thuộc tính (nhãn, \* bắt buộc, mã), Kiểu, Có dữ liệu (mục có giá trị **đúng nhóm** trên chủ đề xem thử), mỗi mẫu một cột: mặt + vai trò, đỏ khi vai trò Quiz bị trùng. Dòng "Ngoài schema" cho khóa có trong dữ liệu mà schema không có |

### 4.2. Editor (`/templates/:id`)

Bố cục §5.5. Header dính: quay lại, tên, badge "Mặc định", mã, schema, "Có thay đổi chưa lưu"; Làm mới, **Đặt làm mặc định** (phụ, ẩn với mẫu mặc định, vô hiệu khi có thay đổi chưa lưu), **Lưu thay đổi** (primary).

| Khối | Nội dung |
| :--- | :--- |
| Cơ bản | Tên mẫu (1–255). Mã: khóa kèm lý do. Schema. Mặc định: có/không, tên mẫu mặc định hiện tại |
| Mặt trước, Mặt sau | Bảng đúng thứ tự máy chủ lưu. Dòng Phần (tên, "lặp theo dòng"; ghi chú khi app in tên khác hoặc bỏ phần không có trường), dòng Ngắt cột, dòng Trường thụt vào trong phần. Cột: Phần tử, Thuộc tính (`nhóm.thuộc tính`), Vai trò ("· Quiz" cho ba vai trò Quiz đọc), Hiển thị (màu, cỡ S/M/L/XL và px của app, căn lề, ẩn khi trống, nút phát âm), Có trên thẻ (x/N trên chủ đề xem thử, "“—” trên n", "lệch nhóm n"). Thao tác: Lên, Xuống, Xóa. Cuối bảng: Thêm trường (chọn thuộc tính), Phần, Ngắt cột |
| Thiết lập dòng đang chọn | Trường: nhãn, vai trò, cỡ chữ, căn lề, màu (8 màu của Template Builder trong app, cộng màu đang dùng nếu khác), ẩn khi trống, nút phát âm; thuộc tính bị khóa. Phần: tên (≤ 100), lặp theo dòng. Ngắt cột: giải thích |
| Dữ liệu kỹ thuật | Thân yêu cầu `PUT` đang soạn (JSON) |
| Cột phải | **Xem trước trên ứng dụng** (chuyển mặt như app, bấm thẻ để lật, chọn chủ đề và từ; ghi chú khi mẫu không phải mặc định) → **Kiểm tra** (§5) → **Tác động** (§6) → **Vòng đời** (Tạo, Sửa gần nhất, ID; "Chưa có nhật ký ai sửa gì") |

Hộp "Đặt làm mặc định": nêu ai sẽ thấy (mọi thẻ học của schema, số chủ đề hệ thống), mẫu nào thôi là mặc định, Quiz không đổi; liệt kê vấn đề của mẫu nếu có. Rời trang khi chưa lưu: hộp xác nhận, chặn cả F5 và điều hướng trong app.

### 4.3. Xem trước (design.md §6, P4)

`domains/admin-templates/render.ts` port hành vi của app, không tự đặt view model:

| Hành vi | Nguồn trong app |
| :--- | :--- |
| Phần tử → phần: `SECTION_BREAK` mở phần, `COLUMN_BREAK` chuyển các trường sau sang cột 2, phần chứa trường của nhóm lặp tự thành phần lặp, phần trùng tên mặc định lấy tên nhóm, phần không có trường bị bỏ | `template-builder/mappers/backend-to-client.ts`, `helpers.ts` |
| Tìm giá trị: đúng nhóm, rồi nhóm khác cùng kiểu, rồi gốc, rồi theo vai trò; bảng tên đồng nghĩa | `card-renderer/utils/data-resolver.ts` |
| Vẽ một trường: ảnh, nút "Nghe phát âm" (chỉ khi không phải thuộc tính từ hoặc phiên âm), chữ; phiên âm bọc `/…/`; "—" khi trống và không ẩn; cỡ S 13, M 16, L 20, XL 26 | `card-renderer/components/card-field-renderer.tsx` |
| Phát âm | URL Google Translate TTS như `lib/hooks/use-tts.tsx` |

Khác biệt đã biết (TD-TPL-06): chữ Inter thay Nunito; mặt thẻ dài ra thay vì cuộn trong khung 420px; không có giao diện tối; trình duyệt có thể chặn phát TTS.

## 5. Quy tắc kiểm tra

### 5.1. Quiz (chặn lưu)

Mirror `QuizContentResolver.bindings`, xét mọi trường có vai trò ở cả hai mặt:

| Kiểu Quiz (tên trong app) | Vai trò cần |
| :--- | :--- |
| Trắc nghiệm phản xạ (`MCQ`) | Từ vựng chính + Bản dịch / Nghĩa |
| Ghép đôi từ vựng (`MATCHING`) | Từ vựng chính + Bản dịch / Nghĩa |
| Điền từ vào chỗ trống (`FILL_BLANK`) | Từ vựng chính + Câu ví dụ |

Thiếu vai trò: "Chưa trường nào mang vai trò …" (`SEMANTIC_ROLE_NOT_BOUND`). Từ vựng chính, Bản dịch / Nghĩa, Giải nghĩa gắn cho hơn một thuộc tính: "… gán cho N thuộc tính, Quiz không biết lấy cái nào" (`SEMANTIC_ROLE_AMBIGUOUS`). Mã lỗi nằm trong tooltip.

### 5.2. Hiển thị (cảnh báo; riêng mặt trống thì chặn)

| Quy tắc | Câu hiển thị |
| :--- | :--- |
| Mặt không có trường | "Mặt trước chưa có trường nào: thẻ trống." |
| Vai trò Âm thanh trên thuộc tính từ hoặc phiên âm | "“Nghe phát âm” mang vai trò Âm thanh nhưng gắn vào main.word, nên ứng dụng in chữ thay cho nút nghe" |
| Thuộc tính của Từ vựng chính ở mặt sau cũng được in ở mặt trước | "…: mặt trước lộ luôn đáp án" (gộp vào câu trên khi cùng nguyên nhân) |
| Trường nhóm đơn trong phần lặp | "“X” nằm trong phần lặp “Y”, nên lặp lại theo từng dòng Ví dụ câu." |

### 5.3. Dữ liệu trên chủ đề xem thử (thông tin)

"n/N thẻ hiện “—”", "ẩn trên n/N thẻ vì trống", "không mục nào có dữ liệu, trường không hiện trên thẻ nào", "n mục có dữ liệu nằm ngoài nhóm.thuộc tính; ứng dụng vẫn hiện nhờ dò nhóm khác".

### 5.4. Lưu

Tên 1–255 ký tự; tên phần ≤ 100; nhãn trường ≤ 255 (độ dài cột DB); mỗi mặt ≥ 1 trường; §5.1 đạt. Vị trí đánh lại 0…n, mặt trước trước (khóa duy nhất `template_id + position`).

## 6. Tác động (cột phải editor)

| Dòng | Nội dung |
| :--- | :--- |
| Thẻ học | Mẫu mặc định: mọi thẻ học của schema, số chủ đề hệ thống, khi app tải lại. Mẫu khác: "Không: ứng dụng chỉ vẽ mẫu mặc định." |
| Quiz | Số chủ đề chọn mẫu và 6 tên đầu; link "Đổi mẫu ở màn Chủ đề" |
| Nhiệm vụ | (khi có chủ đề) Từ người học lưu chỉ được tính khi mục có đủ Từ vựng chính và Bản dịch / Nghĩa theo mẫu của chủ đề (`resolveQuizReady`, daily_mission.md §5.5) |
| Bản riêng | Số schema người học đã tách: giữ bản cũ của mẫu |

## 7. Tiêu chí nghiệm thu

| ID | Tiêu chí | Kiểm bằng |
| :--- | :--- | :--- |
| AC-TPL-01 | Thư viện chỉ gọi GET thật; ba mẫu thật, mặc định đứng đầu; số chủ đề Quiz theo `activeTemplateId`; dải số liệu lọc được | `admin-templates.dom.test.ts` DT1, `admin-templates.test.ts` TP7 |
| AC-TPL-02 | Phần tử → phần và giá trị khớp app trên mục thật: ngắt cột, tên phần trùng mặc định, giá trị lệch nhóm, phiên âm, ảnh ẩn, dòng ví dụ lặp | TP2, TP3 |
| AC-TPL-03 | LISTENING bị đánh dấu lộ đáp án; STANDARD, REVERSE không có cảnh báo | TP4, DT1 |
| AC-TPL-04 | Kiểm tra Quiz khớp `QuizContentResolver` (thiếu, trùng; ca remote) | TP5 |
| AC-TPL-05 | Số "Có trên thẻ" đúng: hiện, "—", ẩn, lệch nhóm | TP6, DT2 |
| AC-TPL-06 | Deep link `/templates/:id` mở editor; bản release chỉ xem | DT2 |
| AC-TPL-07 | Lưu gửi `PUT` với toàn bộ phần tử đánh số lại và `version`; bản nháp Quiz không đọc được thì không gửi | DT3, TP8 |
| AC-TPL-08 | Đặt mặc định nêu phạm vi ảnh hưởng, cảnh báo vấn đề, gửi `POST …/default` với `version` | DT4 |
| AC-TPL-09 | Không gọi `PUT /api/schemas/{id}` ở bất kỳ đâu | Review code |

## 8. API đề xuất cho backend

### 8.1. Đọc cho admin

Dùng tiếp `GET /api/schemas`, hoặc thêm `GET /api/admin/templates?schemaId=` trả thêm: trường ẩn (`hidden: true`, binding chỉ phía máy chủ mà DTO công khai đang bỏ), `version`, `topicCount` (số chủ đề có `active_template_id` = mẫu). `topicCount` thay cho 1 + số chủ đề gốc request hiện nay (TD-TPL-02).

### 8.2. `PUT /api/admin/templates/{id}`

```json
{ "version": 3, "name": "Thẻ Chuẩn (Chữ -> Nghĩa)",
  "elements": [ { "id": 96, "position": 0, "type": "SECTION_BREAK", "side": "FRONT", "sectionLabel": "Thông tin chung", "repeatable": false, "field": null },
                { "id": null, "position": 1, "type": "FIELD", "side": "FRONT", "sectionLabel": null, "repeatable": null,
                  "field": { "id": null, "schemaAttributeId": 1562, "semanticRole": "TARGET_WORD", "fieldLabel": "Từ vựng", "hideIfEmpty": false,
                             "audioAction": true, "fontSize": 26, "alignment": "CENTER", "color": "#0F172A" } } ] }
```

- Thay toàn bộ phần tử trong một transaction; phần tử có `id` giữ id, phần tử mới tạo mới. `code`, `schemaId`, `isDefault` không đổi qua lệnh này.
- Kiểm tra phía máy chủ (§5.4): thuộc tính thuộc đúng schema; vị trí 0…n liên tục; mỗi mặt ≥ 1 trường; độ dài; **binding Quiz** dùng chung hàm với `QuizContentResolver.bindings`.
- Trường ẩn (`hidden`) mà body không gửi thì giữ nguyên, để không xóa binding phía máy chủ.
- Ghi audit `CARD_TEMPLATE_UPDATED` cùng transaction. [admin_audit_log_backend.md](../../../docs/sa/admin_audit_log_backend.md) §3.3 chưa có loại này: cần thêm `AuditTargetType.CARD_TEMPLATE`, hai action `CARD_TEMPLATE_UPDATED(TOPICS, CARD_TEMPLATE, false)` và `CARD_TEMPLATE_DEFAULT_CHANGED(TOPICS, CARD_TEMPLATE, true)`, và giá trị tương ứng trong CHECK của migration (khác `TOPIC_TEMPLATE_CHANGED`, là chủ đề đổi mẫu).
- Trả về mẫu sau khi lưu (cùng hình dạng phần tử như GET).

### 8.3. `POST /api/admin/templates/{id}/default`

Body `{ "version": 3 }`. Trong một transaction: bỏ cờ mặc định của mẫu cũ cùng schema, đặt cho mẫu này, tăng `version` của cả hai. Audit `CARD_TEMPLATE_DEFAULT_CHANGED` (trước/sau là id mẫu mặc định).

### 8.4. Lỗi

| HTTP | `error` | Khi |
| :--- | :--- | :--- |
| 409 | `VERSION_CONFLICT` | `version` cũ; `details.currentVersion` |
| 422 | `TEMPLATE_BINDING_INVALID` | Quiz không đọc được; `details` = `{ mode, role, kind: MISSING \| AMBIGUOUS }` |
| 400 | `VALIDATION_ERROR` | Độ dài, vị trí, thuộc tính khác schema; `errors[].field` dạng `elements[3].field.fieldLabel` |
| 404 | `TEMPLATE_NOT_FOUND` | Không có mẫu |

### 8.5. Migration

`templates.version BIGINT NOT NULL DEFAULT 0`. Màn đọc `version` nếu có và không bao giờ tự đặt số phiên bản (hiện `null`).

## 9. Câu hỏi mở cho PO

| ID | Câu hỏi | Đề xuất |
| :--- | :--- | :--- |
| OQ-TPL-01 | Thẻ học có theo mẫu mà chủ đề chọn không? Hiện app luôn vẽ mẫu mặc định, nên "Đổi mẫu thẻ" ở màn Chủ đề chỉ đổi Quiz | **Có**: app dùng `activeTemplateId` của chủ đề (`TopicDTO` đã có), không có thì dùng mặc định. Khi đó "mặc định" là mẫu cho chủ đề mới và chủ đề chưa chọn |
| OQ-TPL-02 | LISTENING lộ đáp án ở mặt trước: sửa renderer hay sửa dữ liệu? | **Sửa renderer**: vai trò Âm thanh luôn vẽ nút "Nghe phát âm" và đọc từ chính bằng TTS. Gắn `main.audio` không giúp vì chỉ 1 mục có dữ liệu |
| OQ-TPL-03 | Binding trùng Bản dịch / Nghĩa trên DB remote | Kiểm lại trên remote; nếu còn thì migrate gỡ vai trò khỏi `examples.translation` (đúng như script clone làm ở local) |
| OQ-TPL-04 | Đặt mặc định có bắt buộc nhập lý do không? | Không bắt buộc; luôn ghi audit kèm trước/sau |

## 10. Nợ và giới hạn đã biết

| ID | Nội dung | Khi xử lý |
| :--- | :--- | :--- |
| TD-TPL-01 | `render.ts` mirror tay renderer của app; app đổi thì phải đồng bộ | Dùng chung test vector (đầu vào phần tử + mục, đầu ra trường hiện) |
| TD-TPL-02 | Số chủ đề Quiz đếm bằng 1 + số chủ đề gốc request (15 request, mỗi cấp một trang 100) | Khi có `topicCount` (§8.1) |
| TD-TPL-03 | DTO công khai bỏ trường ẩn: nếu một vai trò chỉ nằm ở trường ẩn, kiểm tra Quiz báo thiếu nhầm. Hiện có 0 trường ẩn | Khi API đọc cho admin trả trường ẩn |
| TD-TPL-04 | Chưa có `version` nên chưa có luồng xung đột (so sánh với bản máy chủ như Huy hiệu) | Khi `PUT` có `version` |
| TD-TPL-05 | Mock cũ `features/templates`, `domains/templates` (và `domains/flashcard` nếu không còn ai dùng) còn trên đĩa | Khi PO đồng ý xóa |
| TD-TPL-06 | Xem trước: chữ Inter thay Nunito, mặt thẻ không cuộn, không giao diện tối, TTS có thể bị trình duyệt chặn | Nhỏ |
| TD-TPL-07 | (App) "Lưu cấu hình" ở Template Builder chỉ tách schema, không lưu bố cục người học đã sửa | Ngoài màn admin; ghi nhận cho đội mobile |

## 11. Truy vết

| Nội dung | Code | Test |
| :--- | :--- | :--- |
| Contract, chuẩn hóa JSON | `domains/admin-templates/{types,api,queries}.ts`, `mappers.ts#normalizeSchema` | TP1 |
| Renderer port | `domains/admin-templates/render.ts`, `features/admin-templates/CardPreview.tsx` | TP2–TP4 |
| Kiểm tra Quiz, hiển thị, dữ liệu | `mappers.ts#quizChecks`, `renderIssues`, `fieldCoverage`, `coverageNotes` | TP4–TP6 |
| Thư viện | `features/admin-templates/TemplateLibrary.tsx` (`summarize`, `placements`, `attributeFill`) | TP7, DT1 |
| Editor, bản nháp, lưu | `features/admin-templates/TemplateEditor.tsx`, `mappers.ts` (draft ops, `validateDraft`, `toUpdate`) | TP8, DT2–DT4 |
| Ghi MOCK | `domains/admin-templates/{config,fixtures}.ts` | — |
| Dữ liệu test | `tests/data/templates-schemas.json`, `templates-items.json` (chụp DB clone 2026-10-21) | — |
