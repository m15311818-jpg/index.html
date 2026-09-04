// مصفوفة لتخزين المبيعات الممسوحة
let salesData = [];
let lastScannedCode = "";
let lastScannedTime = 0;
let html5QrCode; // كائن القارئ المطور

// انتظر تحميل الصفحة ثم قم بتهيئة القارئ
document.addEventListener("DOMContentLoaded", () => {
    // إنشاء كائن القارئ داخل الحاوية 'reader'
    html5QrCode = new Html5QrCode("reader");
    
    // إضافة زر "تشغيل الكاميرا" ديناميكياً داخل قسم الكاميرا لضمان تفاعل المستخدم
    const scannerSection = document.querySelector('.scanner-section');
    const startButton = document.createElement('button');
    startButton.id = "btn-start-camera";
    startButton.innerText = "📸 اضغط هنا لتشغيل الكاميرا";
    startButton.style.marginBottom = "15px";
    startButton.style.backgroundColor = "#20b2aa";
    
    // إدخال الزر في أعلى قسم القارئ
    scannerSection.insertBefore(startButton, document.getElementById('reader'));

    // عند الضغط على الزر، نطلب إذن الكاميرا ونشغلها فوراً
    startButton.addEventListener('click', () => {
        startPharmacyCamera(startButton);
    });
});

// دالة تشغيل الكاميرا الخلفية بشكل موثوق
function startPharmacyCamera(buttonElement) {
    const statusText = document.getElementById('scan-status');
    statusText.innerText = "جاري الاتصال بالكاميرا الخلفية...";

    // إعدادات لتجبر المتصفح على فتح الكاميرا الخلفية بدقة مناسبة للفحص
    const config = {
        fps: 15,
        qrbox: { width: 250, height: 250 }
    };

    // طلب تشغيل الكاميرا الخلفية (environment)
    html5QrCode.start(
        { facingMode: "environment" }, 
        config,
        onScanSuccess
    ).then(() => {
        // إذا اشتغلت الكاميرا بنجاح، نقوم بإخفاء زر التشغيل
        buttonElement.style.display = "none";
        statusText.innerText = "✅ الكاميرا تعمل الآن بنجاح. وجهها نحو الـ QR.";
        statusText.style.color = "#008080";
    }).catch((err) => {
        // في حال حدوث خطأ أو رفض الصلاحية
        console.error("خطأ في تشغيل الكاميرا:", err);
        statusText.innerText = "❌ فشل فتح الكاميرا. يرجى إعادة تحديث الصفحة والموافقة على إذن الكاميرا (Allow Camera).";
        statusText.style.color = "red";
        alert("تنبيه: المتصفح يحتاج إلى إذن الكاميرا لكي تتمكن من مسح الأدوية.");
    });
}

// دالة تُنفذ فور قراءة الـ QR بنجاح
function onScanSuccess(decodedText, decodedResult) {
    const currentTime = Date.now();
    
    // حماية تمنع تكرار قراءة نفس العلبة في أقل من 3 ثواني
    if (decodedText === lastScannedCode && (currentTime - lastScannedTime < 3000)) {
        return; 
    }

    lastScannedCode = decodedText;
    lastScannedTime = currentTime;

    // الحصول على الوقت الحالي للصيدلية
    const now = new Date();
    const dateTimeStr = now.toLocaleDateString('ar-EG') + " " + now.toLocaleTimeString('ar-EG');

    // اهتزاز خفيف للهاتف عند نجاح المسح
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

    const wb = XLSX.utils.book_new();
    const ws = XLSX.utils.json_to_sheet(salesData);
    ws['!dir'] = "rtl"; // جعل شيت الإكسيل يبدأ من اليمين لليسار للعربية

    XLSX.utils.book_append_sheet(wb, ws, "المبيعات اليومية");

    const today = new Date().toISOString().slice(0, 10);
    const fileName = `مبيعات_الصيدلية_${today}.xlsx`;

    XLSX.writeFile(wb, fileName);
});
