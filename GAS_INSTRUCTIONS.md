# Hướng dẫn Thiết lập Google Apps Script (GAS) & Google Sheets

Hệ thống **V-Banker Pro** có thể được triển khai trực tiếp trên Google Apps Script để sử dụng Google Sheets làm cơ sở dữ liệu.

## 1. Chuẩn bị Google Sheet
Tạo một Google Sheet mới và tạo các tab (Sheet) sau:

- **KPI**: Cột A: `ID_NV`, B: `Loai_Chi_Tieu`, C: `Muc_Tieu`, D: `Thuc_Hien`.
- **HO_SO**: Cột A: `ID_HS`, B: `Ten_KH`, C: `Loai_HS`, D: `Trang_Thai`, E: `So_Tien`, F: `Ngay_Cap_Nhat`.
- **KHACH_HANG**: Cột A: `ID_KH`, B: `Ten_KH`, C: `SDT`, D: `Loai_TN`, E: `Ghi_Chu`.
- **CONG_VIEC**: Cột A: `ID_Log`, B: `Ngay`, C: `Noi_Dung`, D: `Ket_Qua`.

## 2. Mã nguồn Backend (`Code.gs`)
Copy đoạn mã sau vào file `Code.gs` trong trình soạn thảo Apps Script:

```javascript
/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

const SPREADSHEET_ID = "YOUR_SPREADSHEET_ID_HERE"; // Thay ID của bạn vào đây

function doGet() {
  return HtmlService.createTemplateFromFile('Index')
      .evaluate()
      .setTitle('V-Banker Pro')
      .setXFrameOptionsMode(HtmlService.XFrameOptionsMode.ALLOWALL)
      .addMetaTag('viewport', 'width=device-width, initial-scale=1');
}

function getData(sheetName) {
  const ss = SpreadsheetApp.openById(SPREADSHEET_ID);
  const sheet = ss.getSheetByName(sheetName);
  const data = sheet.getDataRange().getValues();
  const headers = data.shift();
  
  return data.map(row => {
    const obj = {};
    headers.forEach((header, i) => obj[header] = row[i]);
    return obj;
  });
}

function saveLog(logData) {
  const ss = SpreadsheetApp.openById(SPREADSHEET_ID);
  const sheet = ss.getSheetByName("CONG_VIEC");
  sheet.appendRow([
    "L" + new Date().getTime(),
    new Date(),
    logData.description,
    logData.result
  ]);
  return { success: true };
}

// Thêm các hàm CRUD khác nếu cần...
```

## 3. Mã nguồn Frontend (`Index.html`)
Mã nguồn React bạn thấy ở bản preview đã được tối ưu hóa. Trong môi trường GAS, bạn sẽ nhúng các Script từ CDN. 

> **Lưu ý:** Để chạy bản React hoàn chỉnh trên GAS, bạn nên build project này và lấy file output nhúng vào file `Index.html`. Hoặc sử dụng bản HTML/JS đơn giản hơn (google.script.run) để giao tiếp với các hàm ở trên.

## 4. Cách lấy Spreadsheet ID
Spreadsheet ID nằm trong URL của Google Sheet:
`https://docs.google.com/spreadsheets/d/YOUR_SPREADSHEET_ID_HERE/edit`

## 5. Triển khai (Deploy)
1. Trong trình soạn thảo GAS, nhấn **Deploy** > **New Deployment**.
2. Chọn loại **Web App**.
3. Tại phần "Who has access", chọn **Anyone**.
4. Copy URL của Web App để sử dụng.

## 7. Tích hợp dữ liệu thật vào bản Preview (OAuth 2.0)
Để bản preview này có thể đọc dữ liệu từ Sheet của bạn, bạn cần cấu hình OAuth:

### Bước 1: Tạo Credentials trên Google Cloud
1. Mở [Google Cloud Console](https://console.cloud.google.com/).
2. Kích hoạt **Google Sheets API**.
3. Tại mục **Credentials**, tạo **OAuth 2.0 Client ID** loại "Web application".
4. Thêm Redirect URI: `https://ais-dev-bgqimeftd53iqhsoiliypb-172801324071.asia-southeast1.run.app/auth/callback`

### Bước 2: Điền Secrets trong AI Studio
Nhấn vào nút **Settings > Secrets** và thêm:
- `GOOGLE_CLIENT_ID`: Lấy từ Google Cloud.
- `GOOGLE_CLIENT_SECRET`: Lấy từ Google Cloud.
- `VITE_GOOGLE_SHEET_ID`: ID của bảng tính Google Sheet.

### Bước 3: Đăng nhập
Sau khi cấu hình, nhấn nút **"Connect Google Sheets"** trên thanh header của ứng dụng để bắt đầu đồng bộ dữ liệu thật.

> **Lưu ý:** Nếu bạn chỉ muốn chạy trên môi trường Google Apps Script thuần túy, bạn chỉ cần làm theo các bước 1-5 ở trên là đủ. Bản Preview này hỗ trợ OAuth để bạn kiểm tra giao diện với dữ liệu thật ngay tại đây.
