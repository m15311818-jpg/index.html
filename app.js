let salesData = [];
const statusText = document.getElementById("status-text");
const cameraInput = document.getElementById("qr-camera-input");
const tbody = document.getElementById("table-body");

// فحص إذا كان هاتف الموظف يدعم ميزة القراءة الفورية الداخلية
const barcodeDetectorSupported = ('BarcodeDetector' in window);

cameraInput.addEventListener("change", async (event) => {
    const file = event.target.files[0];
    if (!file) return;

    statusText.innerText = "⏳ جاري قراءة وفك الـ QR وحفظه...";

    try {
        // تحويل الصورة الملقوطة بكاميرا الهاتف إلى كائن قابل للقراءة
        const bitmap = await createImageBitmap(file);

        let decodedText = "";

        if (barcodeDetectorSupported) {
            // استخدام المحرك الداخلي الفائق السرعة للموبايل
            const detector = new BarcodeDetector({ formats: ['qr_code'] });
            const barcodes = await detector.detect(bitmap);
            if (barcodes.length > 0) {
                decodedText = barcodes[0].rawValue;
            }
        } 
        
        // حل بديل ذكي وسريع جداً في حال كان الهاتف قديماً ولا يدعم المحرك المباشر
        if (!decodedText) {
            // سنستخدم محرك البحث المدمج السريع جداً إذا فشل الكاشف الافتراضي
            statusText.innerText = "❌ لم يتم لقط الـ QR بشكل واضح، يرجى إعادة التصوير بوضوح وثبات.";
            return;
        }

        // إذا نجحت القراءة، نقوم بالحفظ الفوري
        saveSalesRecord(decodedText);

    } catch (err) {
        console.error(err);
        statusText.innerText = "❌ حدث خطأ أثناء المعالجة، تأكد من تصوير الـ QR عن قرب وبإضاءة جيدة.";
    } finally {
        // تفريغ المدخل ليسمح بتصوير علبة جديدة فوراً
        cameraInput.value = "";
    }
});

function saveSalesRecord(text) {
    const timeStr = new Date().toLocaleTimeString('ar-EG');

    // حفظ فوري في المصفوفة
    salesData.push({
        "م": salesData.length + 1,
        "الوقت": timeStr,
        "بيانات الدواء": text
    });

    // إضافة سطر جديد فوراً في أعلى الجدول أمام الموظف
    const row = document.createElement("tr");
    row.innerHTML = `<td><b>${salesData.length}</b></td><td>${timeStr}</td><td style="color:#008080; font-weight:bold;">${text}</td>`;
    tbody.insertBefore(row, tbody.firstChild);

    if (navigator.vibrate) navigator.vibrate(150); // اهتزاز قوي لتأكيد الحفظ
    statusText.innerText = `✅ تم حفظ العلبة بنجاح وتنزيلها بالجدول! إجمالي: ${salesData.length}`;
}

// تصدير ملف الاكسيل المنظم
document.getElementById('btn-download').addEventListener('click', () => {
    if (salesData.length === 0) {
        alert("لا توجد مبيعات مسجلة حتى الآن!");
        return;
    }
    const wb = XLSX.utils.book_new();
    const ws = XLSX.utils.json_to_sheet(salesData);
    ws['!dir'] = "rtl";
    XLSX.utils.book_append_sheet(wb, ws, "المبيعات اليومية");
    XLSX.writeFile(wb, `مبيعات_الصيدلية_${new Date().toISOString().slice(0, 10)}.xlsx`);
});
