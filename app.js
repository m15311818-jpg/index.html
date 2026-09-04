// مصفوفة لتخزين المبيعات الممسوحة
let salesData = [];
let lastScannedCode = "";
let lastScannedTime = 0;

// بدء تشغيل قارئ الـ QR المطور
function docReady(fn) {
    if (document.readyState === "complete" || document.readyState === "interactive") {
        setTimeout(fn, 1);
    } else {
        document.addEventListener("DOMContentLoaded", fn);
    }
}

docReady(function () {
    const html5QrcodeScanner = new Html5QrcodeScanner(
        "reader", 
        { 
            fps: 15, 
            qrbox: { width: 250, height: 250 },
            rememberLastUsedCamera: true,
            supportedScanTypes: [Html5QrcodeScanType.SCAN_TYPE_CAMERA]
        }
    );
    html5QrcodeScanner.render(onScanSuccess);
});

// دالة تُنفذ فور قراءة الـ QR بنجاح
function onScanSuccess(decodedText, decodedResult) {
    const currentTime = Date.now();
    
    // حماية تمنع تكرار قراءة نفس العلبة في أقل من 3 ثواني (بسبب اهتزاز اليد)
    if (decodedText === lastScannedCode && (currentTime - lastScannedTime < 3000)) {
        return; 
    }

    lastScannedCode = decodedText;
    lastScannedTime = currentTime;

    // الحصول على الوقت الحالي للصيدلية
    const now = new Date();
    const dateTimeStr = now.toLocaleDateString('ar-EG') + " " + now.toLocaleTimeString('ar-EG');

    // تشغيل صوت "بيب" خفيف لتنبيه الصيدلي بنجاح المسح (اختياري عبر اهتزاز أو صوت)
    if (navigator.vibrate) navigator.vibrate(100);

    // إضافة البيانات للمصفوفة
    salesData.push({
        "م": salesData.length + 1,
        "تاريخ ووقت البيع": dateTimeStr,
        "بيانات الدواء (QR Code)": decodedText
    });

    // تحديث الجدول والواجهة للموظف
    updateSalesTable();
}

// دالة تحديث جدول المبيعات على الشاشة
function updateSalesTable() {
    const tbody = document.getElementById('sales-table-body');
    const salesCountBadge = document.getElementById('sales-count');
    
    tbody.innerHTML = "";
    salesCountBadge.innerText = `إجمالي المبيعات الحالية: ${salesData.length} علب`;

    // عرض المبيعات بحيث يظهر أحدث دواء تم مسحه في الأعلى لسهولة المراجعة
    for (let i = salesData.length - 1; i >= 0; i--) {
        const row = document.createElement('tr');
        row.innerHTML = `
            <td><strong>${salesData[i]["م"]}</strong></td>
            <td>${salesData[i]["تاريخ ووقت البيع"]}</td>
            <td style="color: #008080; font-weight: 500;">${salesData[i]["بيانات الدواء (QR Code)"]}</td>
        `;
        tbody.appendChild(row);
    }
}

// دالة تحويل البيانات وتوليد ملف Excel وتحميله فوراً
document.getElementById('btn-download').addEventListener('click', () => {
    if (salesData.length === 0) {
        alert("لا توجد مبيعات مسجلة حتى الآن لتصديرها لملف إكسيل!");
        return;
    }

    // 1. إنشاء كتاب عمل جديد (Workbook)
    const wb = XLSX.utils.book_new();
    
    // 2. تحويل مصفوفة المبيعات إلى شيت إكسيل (Worksheet)
    const ws = XLSX.utils.json_to_sheet(salesData);

    // ضبط اتجاه الشيت ليكون من اليمين لليسار ليناسب اللغة العربية في الاكسيل
    ws['!dir'] = "rtl";

    // 3. دمج الشيت داخل ملف الإكسيل باسم "مبيعات الصيدلية"
    XLSX.utils.book_append_sheet(wb, ws, "المبيعات اليومية");

    // توليد اسم ملف يحتوي على تاريخ اليوم لحسن التنظيم
    const today = new Date().toISOString().slice(0, 10);
    const fileName = `مبيعات_الصيدلية_${today}.xlsx`;

    // 4. تحميل الملف فوراً على جهاز الموظف
    XLSX.writeFile(wb, fileName);
});
