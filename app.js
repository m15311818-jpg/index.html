// 1. قاعدة بيانات الأدوية في صيدليتك (يمكنك تعديل الأكواد والأسعار والأسماء كما تحب)
const pharmacyInventory = {
    // مثال 1: إذا كان الـ QR يحتوي على رابط أو نص معين
    "https://panadol.com": {
        name: "بنادول إكسترا (Panadol Extra)",
        price: "35 EGP",
        category: "مسكن آلام"
    },
    // مثال 2: كود رقمي تجريبي لعلبة دواء ثانية
    "1234567890": {
        name: "أوميز 20 مجم (Omez 20mg)",
        price: "70 EGP",
        category: "حموضة ومعدة"
    },
    // مثال 3: كود تجريبي ثالث
    "628100012345": {
        name: "فولتارين جل 50 جم (Voltaren Gel)",
        price: "110 EGP",
        category: "مضاد للالتهابات"
    }
};

let salesData = [];
const statusText = document.getElementById("status-text");
const cameraInput = document.getElementById("qr-camera-input");
const tbody = document.getElementById("table-body");

const barcodeDetectorSupported = ('BarcodeDetector' in window);

cameraInput.addEventListener("change", async (event) => {
    event.preventDefault(); 
    
    const file = event.target.files[0];
    if (!file) return;

    statusText.innerText = "⏳ جاري فحص علبة الدواء والبحث في المخزن...";

    try {
        const bitmap = await createImageBitmap(file);
        let decodedText = "";

        if (barcodeDetectorSupported) {
            const detector = new BarcodeDetector({ formats: ['qr_code', 'ean_13', 'code_128'] });
            const barcodes = await detector.detect(bitmap);
            if (barcodes.length > 0) {
                decodedText = barcodes[0].rawValue; 
            }
        } 

        // إذا لم يتم القراءة بالمعالج الافتراضي، نبه المستخدم
        if (!decodedText) {
            statusText.innerText = "❌ لم يتم لقط الـ QR بشكل واضح. يرجى التصوير عن قرب وبثبات.";
            return;
        }

        // تشغيل نظام المطابقة الذكي لإظهار الاسم والسعر
        lookupAndSaveMedicine(decodedText);

    } catch (err) {
        console.error(err);
        statusText.innerText = "❌ حدث خطأ، يرجى إعادة المحاولة بإضاءة أفضل للعلبة.";
    } finally {
        cameraInput.value = ""; 
    }
});

// دالة البحث عن الدواء وعرض بياناته وحفظه
function lookupAndSaveMedicine(qrContent) {
    const timeStr = new Date().toLocaleTimeString('ar-EG');
    let medicineName = "دواء غير مسجل بالمنظومة";
    let medicinePrice = "غير محدد";
    let medicineCategory = "عام";

    // البحث داخل قاعدة بيانات الصيدلية (تطابق كلي أو جزئي)
    for (const key in pharmacyInventory) {
        if (qrContent.includes(key) || key.includes(qrContent)) {
            medicineName = pharmacyInventory[key].name;
            medicinePrice = pharmacyInventory[key].price;
            medicineCategory = pharmacyInventory[key].category;
            break;
        }
    }

    // إذا لم يجد الدواء، نعتبر محتوى الـ QR هو اسم مؤقت له
    if (medicineName === "دواء غير مسجل بالمنظومة") {
        medicineName = `دواء جديد (${qrContent.substring(0, 20)}...)`;
    }

    // تجهيز السجل المنظم لملف الإكسيل
    const saleRecord = {
        "م": salesData.length + 1,
        "الوقت": timeStr,
        "اسم الدواء": medicineName,
        "السعر": medicinePrice,
        "التصنيف": medicineCategory,
        "كود الـ QR الأصلي": qrContent
    };

    salesData.push(saleRecord);

    // عرض النتيجة الفورية للموظف على الشاشة بشكل منسق جداً
    const row = document.createElement("tr");
    row.innerHTML = `
        <td><b>${saleRecord["م"]}</b></td>
        <td>${saleRecord["الوقت"]}</td>
        <td style="color:#008080; font-weight:bold;">${saleRecord["اسم الدواء"]}</td>
        <td style="color:#1f7246; font-weight:bold;">${saleRecord["السعر"]}</td>
    `;
    tbody.insertBefore(row, tbody.firstChild);

    if (navigator.vibrate) navigator.vibrate(150); 
    
    // إظهار بنر نجاح الفحص مع السعر والاسم في الأعلى
    statusText.innerHTML = `✨ <b>تم الفحص:</b> ${medicineName} | <span style="color:#1f7246;">السعر: ${medicinePrice}</span> (تم الحفظ)`;
}

// تصدير وتحميل شيت الاكسيل المجمع بأعمدة منفصلة ونظيفة
document.getElementById('btn-download').addEventListener('click', () => {
    if (salesData.length === 0) {
        alert("لا توجد مبيعات مسجلة لتصديرها!");
        return;
    }
    const wb = XLSX.utils.book_new();
    const ws = XLSX.utils.json_to_sheet(salesData);
    ws['!dir'] = "rtl"; 
    XLSX.utils.book_append_sheet(wb, ws, "مبيعات الصيدلية");
    XLSX.writeFile(wb, `مبيعات_الصيدلية_${new Date().toISOString().slice(0, 10)}.xlsx`);
});
