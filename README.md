# GWG BOT

Bot trò chơi Discord bằng **Node.js 20**, **discord.js v14** và **SQLite**. Toàn bộ lệnh và phản hồi trong game bằng tiếng Việt. Bot chỉ dùng prefix chữ `g` (ví dụ `ghelp`, `ghunt`, `gbattle`); không có slash command và không cần dấu `!`.

## Cài đặt

1. Cài Node.js 20 trở lên.
2. Tạo ứng dụng/bot trong Discord Developer Portal, mời bot vào máy chủ với quyền đọc/gửi tin nhắn và bật **Message Content Intent** trong mục Bot.
3. Sao chép `.env.example` thành `.env`, điền token bot:

   ```env
   DISCORD_TOKEN=token_cua_bot
   DATABASE_PATH=./data/gwg.sqlite
   ```

4. Cài dependency và chạy:

   ```bash
   npm install
   npm run check
   npm start
   ```

`better-sqlite3` có thể cần công cụ build C/C++ phù hợp hệ điều hành nếu không có binary cài sẵn. Cơ sở dữ liệu được tạo tự động; không commit `.env` hoặc file SQLite.

## Lệnh

- `ghelp`, `gprofile`, `gbalance`, `gleaderboard`
- `gdaily`, `gwork`
- `ghunt`, `gfishing` (hoặc `gfish`), `gadventure [1-3]`
- `gbattle` đấu quái; `gbattle @người_chơi` đấu PvP
- `gzoo`, `gpet adopt [1-3]`, `gpet active <id>`
- `ginventory`, `gshop`, `gbuy <id> [số_lượng]`, `gsell <id> [số_lượng]`, `guse potion`
- `gquest`, `gquest claim <hunt|fish|battle>`

## Gameplay

- Hồ sơ, xu, cấp độ, XP, điểm danh liên tiếp và bảng xếp hạng được lưu theo máy chủ trong SQLite.
- Săn bắt, câu cá, chiến đấu, thám hiểm, cửa hàng, mua/bán, túi đồ và nhiệm vụ ngày.
- Thu thập tối đa 10 thú cưng; chọn thú đồng hành để tăng sức mạnh, tích lũy XP và lên cấp.
- Cooldown được lưu bền vững qua lần khởi động lại. PvP thưởng xu và có mức cược giới hạn.

Đây là nền tảng gameplay độc lập lấy cảm hứng từ dòng bot nuôi thú/phiêu lưu; không dùng thương hiệu, nội dung độc quyền hay tài sản của OwO.
