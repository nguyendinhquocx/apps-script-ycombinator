# HN Posts Filter - Google Apps Script

Ứng dụng Google Apps Script để lọc và hiển thị các bài viết từ Hacker News dựa trên số điểm và số bình luận.

## Tính năng

- Lọc bài viết theo số bình luận tối thiểu
- Lọc bài viết theo số điểm tối thiểu  
- Hiển thị kết quả trong dialog với khả năng mở nhiều link cùng lúc
- Tự động phân tích cấu trúc dữ liệu HN
- Hỗ trợ cả định dạng dữ liệu đơn hàng và đôi hàng

## Cài đặt

1. Tạo Google Sheet mới với tên sheet là `ycombinator`
2. Import dữ liệu HN vào sheet với các cột:
   - `rank`: Thứ hạng bài viết
   - `titleline`: Tiêu đề bài viết
   - `titleline href`: Link bài viết
   - `sitestr`: Tên domain
   - `score`: Số điểm
   - `subline (3)`: Số bình luận
   - `age`: Thời gian đăng
   - `hnuser`: Tên người đăng

3. Mở Apps Script (Extensions → Apps Script)
4. Copy code từ `Code.js` vào editor
5. Tạo file HTML mới tên `FilterDialog.html` và copy nội dung
6. Save và deploy

## Sử dụng

### Thêm nút Filter
1. Chạy function `addFilterButton()` một lần để được hướng dẫn
2. Hoặc tự tạo button và gán function `showFilterDialog`

### Lọc dữ liệu
1. Nhấn nút "Filter"
2. Nhập số bình luận tối thiểu (mặc định: 100)
3. Nhập số điểm tối thiểu (để trống = bất kỳ)
4. Nhấn "Filter"
5. Chọn các bài viết muốn mở và nhấn "OK"

### Debug
Nếu gặp lỗi, chạy function `debugDataParsing()` để kiểm tra cấu trúc dữ liệu.

## Cấu trúc dữ liệu hỗ trợ

Ứng dụng tự động phát hiện và xử lý:
- Dữ liệu đơn hàng: Mỗi bài viết trên 1 hàng
- Dữ liệu đôi hàng: Tiêu đề và metadata trên 2 hàng riêng biệt
- Trích xuất số từ text (ví dụ: "153 points", "69 comments")

## Lỗi thường gặp

1. **Sheet không tìm thấy**: Đảm bảo sheet tên `ycombinator` tồn tại
2. **Không tìm thấy header**: Kiểm tra hàng đầu có chứa tên cột
3. **Không có dữ liệu**: Kiểm tra sheet có dữ liệu và đúng format
4. **"HtmlService.createHtml is not a function"**: Đã sửa - phải dùng `createHtmlOutput` thay vì `createHtml`

## Cập nhật

- **v1.1**: Sửa lỗi JavaScript syntax trong FilterDialog.html
- **v1.2**: Cải thiện xử lý cấu trúc dữ liệu HN đa dạng
- **v1.3**: Thêm hỗ trợ trích xuất số từ subline text
- **v1.4**: Sửa lỗi HtmlService.createHtml → createHtmlOutput