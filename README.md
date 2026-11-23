# GWG MINI

Bot game Discord tiếng Việt, chạy bằng **Node.js 20+**, **discord.js v14** và **SQLite**. Dùng duy nhất prefix chữ `g`: không dùng dấu `!`, không có Slash Commands.

## Cài đặt và khởi chạy

1. Cài Node.js 20 trở lên từ trang chính thức của Node.js.
2. Tạo bot trong Discord Developer Portal, mời bot vào máy chủ với quyền xem/gửi tin nhắn.
3. Trong Developer Portal, vào **Bot → Privileged Gateway Intents** và bật **Message Content Intent**. Đây là quyền cần thiết để bot đọc lệnh dạng tin nhắn như `ghelp`.
4. Trong thư mục dự án, sao chép `.env.example` thành `.env` (Windows: `copy .env.example .env`; macOS/Linux: `cp .env.example .env`), mở `.env` và dán token vào `DISCORD_TOKEN=`. Để `PREFIX=g`. File `.env` đã được `.gitignore` loại trừ; không commit token.
5. Cài và chạy:

   ```bash
   npm install
   npm run check
   npm test
   npm start
   ```

`better-sqlite3` tự tạo thư mục `data` và file SQLite ở lần chạy đầu. Nếu thiếu token, bot in hướng dẫn tiếng Việt. Không cần nhập token trong code.

## Lệnh

- `ghelp` — hướng dẫn; `gstart` — bắt đầu và nhận 100 GWG Coin.
- `gbalance` — số dư, cấp độ, XP; `gdaily` — thưởng ngày và chuỗi điểm danh.
- `ghunt` — săn thú; `gzoo` — bộ sưu tập (tối đa 30 con hiển thị).
- `gbattle` — chiến đấu quái vật; sức mạnh tăng theo cấp và thú đã bắt.
- `gfish` — câu cá; có thể bán cá ở `gsell`.
- `gwork` — làm việc kiếm tiền; `gshop` — xem hàng; `gbuy bait [số lượng]` / `gbuy potion [số lượng]` — mua vật phẩm.
- `ginventory` — túi đồ; `gsell <fish|salmon|tuna|pearl|bait> [số lượng]` — bán vật phẩm.
- `gquest` — xem nhiệm vụ hằng ngày; `gquest claim <hunt|fish|battle|work>` — nhận thưởng.
- `gleaderboard` — bảng xếp hạng GWG Coin trong máy chủ.

Săn thú có bốn độ hiếm: **Thường, Hiếm, Sử thi, Huyền thoại**. Thú được lưu riêng theo người chơi và máy chủ. Câu cá, thú, vật phẩm, xu, cấp độ, nhiệm vụ và hồi chiêu được lưu bền vững qua khởi động lại. Mọi giao dịch mua/bán kiểm tra số dư/tồn kho trong SQLite transaction; số dư không thể âm.

## Kiểm tra nhanh

`npm run check` kiểm tra cú pháp JavaScript. `npm test` chạy bộ kiểm thử tự động. Khi khởi động, log xác nhận đăng nhập Discord; nếu token sai/thiếu quyền, thông báo nêu hướng khắc phục. Hãy thử `gstart`, `gbalance`, `ghunt`, `gzoo`, `gfish`, `gshop` trong máy chủ.
