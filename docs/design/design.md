# SnapVocab Admin — Master Design & Architecture Specification

> **Source of Truth** cho Thiết kế Giao diện (UI/UX), Hệ thống Nhận diện, Kiến trúc Vận hành (LiveOps), và Bản hợp đồng Dữ liệu (Domain Contracts) của dự án **SnapVocab Web Admin (`snapAdmin`)**.

---

## 1. Vị trí & Triết lý Dự án (Project Positioning & Philosophy)

Dự án **`snapAdmin`** là ứng dụng web quản trị và vận hành độc lập, đặt tại:
* **Thư mục dự án:** `c:\Users\MSII\Downloads\snapAdmin` (nằm cùng cấp với `snapVocab` Mobile App).
* **Mục tiêu cốt lõi:** Chuyển hóa toàn bộ quy trình vận hành từ mô hình "CRUD nhập liệu thủ công" sang **Operational System / Content & AI Studio kiêm LiveOps Console**.

```text
┌───────────────────────────────────────────────────────────┐
│                      SNAPVOCAB SYSTEM                     │
├─────────────────────────────┬─────────────────────────────┤
│  snapVocab (Mobile App)     │  snapAdmin (Web Console)    │
├─────────────────────────────┼─────────────────────────────┤
│  Vị trí: ../snapVocab       │  Vị trí: ../snapAdmin       │
│  Stack: React Native (Expo) │  Stack: React + Vite        │
│  Mục tiêu: ENGAGEMENT       │  Mục tiêu: OPERATIONS       │
│  Scan ➔ Learn ➔ Reward      │  Find ➔ Inspect ➔ Validate  │
│                             │  Edit ➔ Publish ➔ Audit     │
└─────────────────────────────┴─────────────────────────────┘
```

---

## 2. Kiến trúc Nghiệp vụ Tam giác (Business Architecture Triangle)

Hệ thống `snapAdmin` được phân bổ nguồn lực và cấu trúc theo tỷ lệ tam giác vàng:

```text
                    SNAPVOCAB ADMIN
                           │
          ┌────────────────┼────────────────┐
          │                │                │
          ▼                ▼                ▼
     DATA / SaaS      CONTENT / AI       LIVEOPS
        40%               35%               25%
   (Learners, Table, (Studio, TTS,    (Shop, Missions,
    Audit Trail)      AI Scan Queue)    Badges, Economy)
```

### Nguyên tắc 1: Data-Dense chứ không phải Card-Dense
* **Thông tin trước, trang trí sau:** Không nhồi nhét các khối card thống kê khổng lồ chỉ chứa 1 icon to và 1 con số.
* **Bảng dữ liệu mạnh mẽ (TanStack Table):** Mật độ thông tin cao, hỗ trợ bộ lọc đa tầng (CEFR, trạng thái, nguồn tạo), tìm kiếm tức thì, sắp xếp đa cột và bulk action (thao tác hàng loạt).
* **Dashboard là tầng cuối cùng:** Dashboard tổng quan chỉ là hình chiếu tổng hợp (projection) từ các luồng công việc thật, không bao giờ là nơi tự bịa ra KPI rồi vẽ card trang trí.

---

## 3. Bảng màu Nhận diện & Quy tắc Ngữ nghĩa (Semantic Color System)

`snapAdmin` sử dụng nền tảng Tailwind CSS với bộ token màu chuẩn hóa, đảm bảo tính kỷ luật cao:

```text
Background       #F8F9F7  (Off-white sạch sẽ, chống mỏi mắt cho operator)
Surface          #FFFFFF  (Bề mặt form, thẻ dữ liệu, simulator)
Border           #E5E7EB  (Đường viền mảnh, phân tách khu vực làm việc)
Text Primary     #171717  (Tương phản chuẩn, dễ đọc)
Text Muted       #6B7280  (Nhãn phụ, ghi chú, placeholder)

Primary Green    #58CC02  ➔ Hành động duyệt (Approve/Publish), CTA chính, Trạng thái hoạt động
Snapy Orange     #FF8A00  ➔ Nhận diện Snapy, Chuỗi Streak, Hàng đợi AI Scan
Reward Gold      #FFC42E  ➔ Hệ thống Tiền tệ (Coins, Gems), Giá Shop, Quà tặng
Info Blue        #1CB0F6  ➔ Trạng thái Chờ duyệt (In Review), Cấp độ, Gợi ý ngữ nghĩa
Danger Red       #EF4444  ➔ Lưu trữ (Archive), Xóa, Lỗi hệ thống, Cảnh báo vi phạm
```

### Quy tắc sử dụng màu:
1. Không sử dụng đồng thời 5 màu sắc trên cùng một cụm thông tin.
2. Nút hành động chính (Publish/Save) luôn dùng **Primary Green (`#58CC02`)**.
3. Màu **Snapy Orange (`#FF8A00`)** chỉ đại diện cho tính năng AI Camera Scan và chuỗi Streak.
4. Màu **Reward Gold (`#FFC42E`)** bảo lưu riêng cho hệ thống kinh tế ảo và phần thưởng nhiệm vụ.


### Bộ UI chung: Button & Badge (`src/components/ui`, 2026-10-06)

Màu **hành động** tách khỏi màu **trạng thái**: "Phát hành" (nút) và "Đã phát hành" (badge) cùng nhóm xanh nhưng khác độ nổi bật.

| Button | Dùng cho |
| :--- | :--- |
| `primary` | Hành động chính của khu vực — **mỗi khu vực một nút**. Nền `primary-solid #3A8200` (chữ trắng ≥ 4.5:1; `#58CC02` chỉ đạt 2.2:1). |
| `secondary` | Hủy, quay lại, xem trước; hành động đứng cạnh primary (VD "Phát hành" cạnh "Lưu thay đổi"). |
| `ghost` | Thao tác trong bảng, mở menu. |
| `danger` | **Xác nhận** hành động không hoàn tác (Xóa, Ngừng bán vĩnh viễn). Nền `danger-solid #DC2626`. |
| `danger-outline` | Nút **mở** bước xác nhận nguy hiểm. |

- Kích thước: `sm` 32px/12px (toolbar, bảng) · `md` 36px/13px (mặc định, form, modal) · `lg` 40px/14px. Bo 8px, icon 14–16px.
- `loading` giữ nguyên chiều rộng, spinner + `loadingText`; disabled không hover; focus bàn phím có vòng viền `info`.
- Nút chỉ icon bắt buộc `label` (tên truy cập + tooltip).

| Badge tone | Ý nghĩa |
| :--- | :--- |
| `neutral` | Chưa hoạt động / đã kết thúc (Bản nháp, Đã lưu trữ, không mở bán) |
| `info` | Thông tin / đã lên lịch (Chờ mở bán) |
| `success` | Hoạt động (Đã phát hành, Đang mở bán) |
| `warning` | Cần chú ý (Có thay đổi chưa lưu) |
| `danger` | Lỗi / bị chặn — **không** dùng cho trạng thái đã kết thúc |

- Mỗi module ánh xạ trạng thái nghiệp vụ sang tone trong một component riêng (VD `features/shop/components/ShopItemStatusBadge.tsx`).
- Tương phản của mọi tone được kiểm bằng `tests/ui-tokens.test.ts`. Xem mọi biến thể ở trang **UI Kit (dev)** (chỉ có ở bản dev).
- Áp dụng dần: chuyển một module sang bộ UI chung khi chỉnh sửa module đó; không thay toàn admin một lượt. Đã chuyển: Shop.

---

## 4. Cấu trúc Điều hướng Sidebar (Information Architecture)

Sidebar được tổ chức theo đúng trình tự tư duy nghiệp vụ của người quản trị:

```text
┌────────────────────────┐
│ 🦊 SnapVocab           │
│ ADMIN · Studio Console │
├────────────────────────┤
│                        │
│ OVERVIEW               │
│   Dashboard            │
│   Analytics            │
│                        │
│ LEARNING               │
│   Content Studio [●]   │ ➔ Trọng tâm biên tập & preview
│   Topics & Decks       │
│   Templates            │
│                        │
│ AI STUDIO              │
│   AI Scan Monitor      │
│   Review Queue [18]    │ ➔ Hàng đợi ưu tiên xử lý ảnh lỗi
│                        │
│ LIVEOPS                │
│   Shop & Economy       │
│   Missions             │
│   Badges & Titles      │
│   Leaderboard (view)   │
│                        │
│ PEOPLE                 │
│   Learners             │
│   Issue Reports [3]    │
│                        │
│ SYSTEM                 │
│   Audit Activity Log   │
│   Settings             │
└────────────────────────┘
```

---

## 5. Màn hình Cốt lõi: Split-Screen Content Studio

Content Studio là trung tâm vận hành nội dung từ vựng, áp dụng **bố cục 3 cột tỷ lệ vàng** làm việc thời gian thực:

```text
┌──────────────────┬─────────────────────────────────┬─────────────────────────┐
│ CỘT 1: WORD LIST │ CỘT 2: WORD EDITOR             │ CỘT 3: MOBILE SIMULATOR │
│ (280px - Sticky) │ (Flex-1 - Engine & Form)        │ (380px - Realtime Sync) │
├──────────────────┼─────────────────────────────────┼─────────────────────────┤
│ [Tìm kiếm từ...] │ Từ vựng: [ resilient         ]  │   ┌─────────────────┐   │
│ [Bộ lọc CEFR/St] │ Từ loại: [ adjective        ▾]  │   │ 09:41    🦊 🔥7 │   │
│                  │ Trình độ:[ C1               ▾]  │   ├─────────────────┤   │
│ 🔘 apple     A1  │ IPA:     [ /rɪˈzɪl.jənt/     ]  │   │ [C1] adjective  │   │
│ 🔵 resilient C1  │ Audio:   [▶ TTS] [Voice US ▾]   │   │   [ẢNH MINH HỌA]│   │
│ 🔵 thermos   B1  │ Định nghĩa tiếng Việt:          │   │   resilient 🔊  │   │
│ ⚪ curious   A2  │ [kiên cường, có thể phục hồi..] │   │   /rɪˈzɪl.jənt/ │   │
│                  │ Ví dụ ngữ cảnh EN - VI:         │   ├─────────────────┤   │
│ [+ Thêm từ mới]  │ [EN: ...] [VI: ...]             │   │ [ 🔄 Lật thẻ ]  │   │
│                  │ ─────────────────────────────── │   └─────────────────┘   │
│                  │ [Về Nháp] [Duyệt & Xuất bản]    │ [Chuẩn CardViewModel]   │
└──────────────────┴─────────────────────────────────┴─────────────────────────┘
```

### Các thành phần đặc biệt trong Content Studio:
1. **Audio Pronunciation Tester:** Tích hợp Web Speech Synthesis API cho phép nghe thử giọng đọc chuẩn US/UK, điều chỉnh tốc độ (0.8x, 1.0x, 1.2x), hoặc chuyển đổi sang tải file audio `.mp3` chất lượng cao.
2. **Interactive Mobile Simulator:** Giả lập khung iPhone hoàn chỉnh (status bar 09:41, Dynamic Island, streak 7 days). Hỗ trợ nút **Lật thẻ (Flip card)** xem đồng bộ 2 mặt thẻ theo thời gian thực.
3. **Audit Trail Modal:** Bắt buộc nhập lý do mỗi khi chuyển đổi trạng thái của thẻ từ vựng.

---

## 6. Bản hợp đồng Dữ liệu Chung (`CardViewModel`)

`snapAdmin` và `snapVocab` Mobile App liên kết chặt chẽ qua chung một schema dữ liệu:

```typescript
// src/domains/flashcard/types.ts
export type CEFRLevel = 'A1' | 'A2' | 'B1' | 'B2' | 'C1' | 'C2';
export type VocabStatus = 'draft' | 'review' | 'published' | 'archived';
export type CardSource = 'DICT' | 'SCAN' | 'TOPIC' | 'AI';

export interface CardViewModel {
  id: string;
  word: string;
  phonetic: string;              // Phiên âm IPA
  partOfSpeech: string;          // noun, verb, adjective...
  meanings: {
    id: string;
    partOfSpeech: string;
    definitionVi: string;        // Định nghĩa tiếng Việt
    definitionEn?: string;       // Định nghĩa tiếng Anh
    examples: {
      id: string;
      en: string;                // Ví dụ tiếng Anh
      vi: string;                // Dịch nghĩa tiếng Việt
    }[];
  }[];
  audio: {
    sourceType: 'tts' | 'custom';
    voice: 'en-US' | 'en-GB';
    speed: number;
    pitch: number;
    url?: string;
  };
  media?: {
    imageUrl?: string;
    aiConfidence?: number;       // Độ tin cậy nhận diện AI
  };
  cefr: CEFRLevel;
  tags: string[];
  status: VocabStatus;
  source: CardSource;
  topicName?: string;
  lastUpdated: string;
  auditHistory: {
    id: string;
    timestamp: string;
    action: string;
    changedBy: string;
    reason: string;
  }[];
}
```

---

## 7. Quy trình Vận hành Nâng cao & Active Learning Loop

### 7.1. Máy Trạng thái Nội dung (Finite State Machine)
Thay vì dùng cờ `isPublished: boolean`, mọi từ vựng đều được kiểm soát vòng đời nghiêm ngặt:

```text
[ DRAFT ] ──────────(Submit Review)──────────► [ IN_REVIEW ]
    ▲                                                │
    │                                                │ (Lead Admin Approve
    │ (Reject / Edit)                                │  bắt buộc nhập lý do)
    │                                                ▼
[ REVISE ] ◄───────(Phát hiện lỗi từ User)──── [ PUBLISHED ]
                                                     │
                                                     ▼ (Lỗi thời / Loại bỏ)
                                               [ ARCHIVED ]
```

### 7.2. Active Learning Feedback Loop trong AI Scan
Khi người học trên mobile bấm nút *"Báo cáo kết quả scan sai"*:
1. Sự cố tự động nhảy vào đầu hàng đợi **`Reported Issues (P1)`** trên AI Scan Console.
2. Operator kiểm tra ảnh gốc và gán lại nhãn đúng (1-Click Correction).
3. Hệ thống đồng thời:
   * Cập nhật từ điển và gợi ý từ vựng cho ứng dụng mobile.
   * Ghi nhận lịch sử kiểm toán của người thao tác.
   * Đưa ảnh và nhãn đúng vào tập dữ liệu tinh chỉnh (fine-tuning dataset) cho Gemini Vision API.

### 7.3. Hàng rào An toàn LiveOps (LiveOps Guardrails)
* **Domain-level Validation:** Validation Mission Pool theo [daily_mission.md](../../../docs/decisions/daily_mission.md) §8.3. Giới hạn tổng reward/ngày chưa được chốt (PD-DM-02) — không tự đặt ngưỡng trong UI.
* **Streak Recovery Tool:** Hỗ trợ phục hồi chuỗi học cho người dùng bị mất streak do lỗi kỹ thuật, bắt buộc đính kèm mã ticket hỗ trợ vào nhật ký Audit Log.

---

## 8. Cấu trúc Thư mục Domain-Driven Design (`snapAdmin/src/`)

```text
c:\Users\MSII\Downloads\snapAdmin\
├── src/
│   ├── domains/             # Tầng nghiệp vụ cốt lõi (Contracts, Rules, Types)
│   │   ├── flashcard/       # CardViewModel, CEFR, VocabStatus
│   │   ├── vocabulary/      # Mock data, validation rules
│   │   ├── ai-scan/         # AI scan contracts & label mapping
│   │   └── economy/         # Shop items, reward caps, guardrails
│   │
│   ├── features/            # Các màn hình theo Sidebar
│   │   ├── content-studio/  # Split-screen Word List, Editor, TTS Tester, Audit
│   │   ├── ai-scan/         # Console duyệt lỗi nhận diện camera
│   │   ├── liveops/         # Quản lý Shop, Quest builder, Seasons
│   │   └── people/          # Learner 360 profile, Streak recovery
│   │
│   ├── components/
│   │   ├── layout/          # Sidebar, Header, AdminLayout
│   │   ├── preview/         # MobileSimulator, FlashcardPreview
│   │   └── ui/              # Nút bấm, modal, input chuẩn Tailwind
│   │
│   └── lib/                 # Tiện ích, Speech API, formatters
```

---

## 9. Hướng dẫn Khởi chạy Dự án

```powershell
# Chuyển vào thư mục snapAdmin
cd c:\Users\MSII\Downloads\snapAdmin

# Chạy server phát triển (Development Server)
npm run dev

# Mở trình duyệt tại
http://localhost:5173/
```
