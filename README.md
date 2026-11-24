# GWG Discord Game Bot

Bot game Discord GWG được phát triển độc lập với prefix mặc định `gwg`, PostgreSQL, Dashboard Express và deploy Render. Mọi số dư, cược, thưởng, giá vật phẩm đều dùng đơn vị **GWG**. Icon tiền tệ do dự án cung cấp tại `assets/gwg-currency.svg`, được đính kèm trong các embed và dùng ở dashboard.

## Yêu cầu và cài đặt local

- Node.js 20+; PostgreSQL 14+.
- Tạo Discord Application/Bot tại Developer Portal, bật **Message Content Intent** (Privileged Gateway Intents), mời bot với quyền View Channels, Send Messages, Embed Links, Attach Files, Read Message History.
- Sao chép `.env.example` sang `.env`, đặt `DATABASE_URL`, `DISCORD_TOKEN`, và `ADMIN_API_TOKEN` mạnh. Không commit `.env`.
- Tạo database PostgreSQL, sau đó chạy:

```bash
npm install
npm run migrate
npm test
npm run check
npm run start:bot
# terminal riêng
npm run start:web
```

Bot sử dụng Discord `messageCreate`, bỏ qua bot accounts; prefix trong `COMMAND_PREFIX`. Nếu thay prefix, gõ `<prefix> help`. Bot không đăng ký slash commands. Mỗi message hợp lệ bị giới hạn tốc độ cơ bản.

## Lệnh hoạt động

- `gwg gcash` — số dư GWG; `gwg gcash history` — 10 giao dịch gần nhất.
- `gwg gcash pay @user amount` — chuyển GWG, trừ/cộng trong cùng transaction, khóa player rows.
- `gwg daily`, `gwg weekly` — nhận lần lượt 500/2.500 GWG, cooldown PostgreSQL 24 giờ/7 ngày.
- `gwg leaderboard` — top 10 số dư.
- `gwg mines amount 1` hoặc `gwg mines amount 3` — cược Mines (min 10), 3×3, vị trí bom được random và lưu lúc tạo; tối đa một game active/player; ô chọn không lặp; Cash Out button; game persistent qua restart.
- `gwg slots amount` — ba biểu tượng; 3 loại giống nhau trả 5×, 2 giống nhau 2×, không trúng mất cược.
- `gwg coinflip amount heads|tails` — đúng mặt trả 2×.
- `gwg dice amount 1-6` — đoán đúng số xúc xắc trả 5×.
- `gwg hunt` — xác suất 25% nhận Field Ration vào inventory.
- `gwg zoo` — liệt kê animal/pet collectibles (chưa có nguồn animals trong catalog ban đầu).
- `gwg inventory`, `gwg shop`, `gwg sell item_id [quantity]`.
- `gwg trade @user item_id quantity` tạo đề nghị; người nhận chấp nhận bằng `gwg trade accept offer_id`. Item được kiểm tra và chuyển atomically khi accept.
- `gwg battle` hiện trả lời rõ chưa triển khai, không cấp thưởng giả.

Shop seed: `field_ration`, `rusty_sword`, `small_crate`. Hunt hiện trao Field Ration (vật phẩm shop/consumable), không khẳng định bắt animal. Đây là starter stage, không phải toàn bộ RPG feature set.

## Dashboard/API

- Dashboard `/`, health `/health`; public `GET /api/public/leaderboard`.
- Admin dùng `Authorization: Bearer <ADMIN_API_TOKEN>`: `GET /api/admin/stats`, `/api/admin/players?q=...`, `/api/admin/players/:id/transactions`, `/api/admin/games`.
- Dashboard HTML hiện có xem thống kê/người chơi/game stats. Admin API token không lưu trong source; chỉ giữ trong form của trình duyệt khi sử dụng. Dùng HTTPS và secret mạnh.

## Database

SQL migration `src/db/migrations/001_core.sql` tạo players, wallet ledger, cooldown, mines game, game stats, catalog/inventory, trade offers, audit log cùng foreign keys, checks, unique constraints và query indexes. Migration runner chạy tự động khi bot/web khởi động, hoặc chạy `npm run migrate`. Tài khoản wallet dùng BIGINT; giới hạn đầu vào để tránh vượt phạm vi số an toàn JavaScript. Các lệnh cược và rewards ghi transaction ledger; Mines state là DB-authoritative.

## Render

1. Push branch `copilot/gwg-bot-foundation`, tạo Blueprint từ `render.yaml`.
2. Render cấu hình PostgreSQL, Worker và Web Service. Set secret `DISCORD_TOKEN`, `ADMIN_API_TOKEN`; lấy token bot trong Discord Developer Portal. `COMMAND_PREFIX` mặc định `gwg`.
3. Bật Message Content Intent trong Discord Developer Portal, deploy và kiểm tra worker logs, web `/health`.
4. Internal database URL thường không yêu cầu TLS (`DATABASE_SSL=false`). Với kết nối external, xác nhận TLS với nhà cung cấp trước khi bật.

## Kiểm thử và phạm vi chưa hoàn thành

`npm test`/`npm run check` gồm unit tests cho Mines math (nếu test được cài đặt). Chưa thể chạy tích hợp Discord/Postgres trong môi trường không có credentials/dịch vụ. Cần xác nhận Render Blueprint schema/plan theo region hiện hành.

Chưa triển khai: battle PvE; animal/pet capture và nội dung zoo; dùng consumable, equipment stats, crates mở thưởng; đăng nhập OAuth dashboard, điều chỉnh player admin UI; game modules Lottery/Fishing/Trivia/Guess/Hangman/Wordle/Race/Treasure, quests/XP/clan. Lệnh battle báo chưa có, các hệ thống còn lại chưa được đăng ký như tính năng hoạt động. Icon được viết thành SVG dựa trên sắc thái thẻ GWG trong ảnh tham chiếu; chưa thể nhúng lại tệp ảnh raster đính kèm trực tiếp qua công cụ ghi file.
