let salesData = [];
let currentImageBase64 = ""; // لتخزين الصورة الحالية

const statusText = document.getElementById("status-text");
const cameraInput = document.getElementById("medicine-camera");
const previewImg = document.getElementById("preview-img");
const medPriceInput = document.getElementById("med-price-input");
const tbody = document.getElementById("table-body");

function speakText(text) {
    if ('speechSynthesis' in window) {
        window.speechSynthesis.cancel();
        const utterance = new SpeechSynthesisUtterance(text);
        utterance.lang = 'ar-EG';
        window.speechSynthesis.speak(utterance);
    }
}

// تشغيل الكاميرا وتحويل الصورة الملقوطة فوراً لصيغة نصية لحفظها
cameraInput.addEventListener("change", (event) => {
    const file = event.target.files[0];
    if (!file) return;

    statusText.innerText = "⏳ جاري تجهيز الصورة...";

    const reader = new FileReader();
    reader.onload = function(e) {
        currentImageBase64 = e.target.result; // الصورة جاهزة للحفظ
        previewImg.src = currentImageBase64;
        previewImg.style.display = "block";   // عرض معاينة للصيدلي
        statusText.innerText = "✅ تم التقاط الصورة بنجاح! اضغط على زر الحفظ في الجدول.";
    };
    reader.readAsDataURL(file);
});

// حفظ السطر الحالي في الجدول التفاعلي
document.getElementById("btn-add-record").addEventListener("click", () => {
    const price = medPriceInput.value.trim();

    if (!price) {
        alert("يرجى كتابة سعر الدواء أولاً!");
        return;
    }
    if (!currentImageBase64) {
        alert("يرجى التقاط صورة لعلبة الدواء أولاً!");
        return;
    }

    const timeStr = new Date().toLocaleTimeString('ar-EG');
    
    // إضافة البيانات والمستند المصور للمصفوفة
    salesData.push({
        index: salesData.length + 1,
        time: timeStr,
        price: price + " جنيه",
        imageBase64: currentImageBase64
    });

    // إضافة سطر للجدول على شاشة الموظف
    const row = document.createElement("tr");
    row.innerHTML = `
        <td><b>${salesData.length}</b></td>
        <td>${timeStr}</td>
        <td style="color:#1f7246; font-weight:bold;">${price} ج.م</td>
        <td><img src="${currentImageBase64}" class="td-preview" /></td>
    `;
    tbody.insertBefore(row, tbody.firstChild);

    speakText("تم الحفظ");

    // تفريغ الخانات للعملية القادمة
    medPriceInput.value = "";
    previewImg.style.display = "none";
    currentImageBase64 = "";
    statusText.innerText = "✅ تم الحفظ في الجدول! جاهز لعلبة جديدة.";
});

// 📥 المحرك الذكي لتوليد ملف Excel يحتوي على الصور الحقيقية للأدوية
document.getElementById('btn-download').addEventListener('click', async () => {
    if (salesData.length === 0) {
        alert("لا توجد مبيعات مصورة في الجدول حتى الآن!");
        return;
    }

    statusText.innerText = "⏳ جاري إنشاء ملف Excel وإدراج الصور داخله...";

    // 1. إنشاء كتاب عمل جديد عبر مكتبة ExcelJS
    const workbook = new ExcelJS.Workbook();
    const worksheet = workbook.addWorksheet('المبيعات المصورة');
    worksheet.views = [{组件Direction: 'RTL', textDirection: 'RTL'}]; // توجيه عربي من اليمين لليسار
    worksheet.dir = "rtl";

    // 2. تحديد أسماء وترتيب الأعمدة
    worksheet.columns = [
        { header: 'م', key: 'index', width: 8 },
        { header: 'الوقت والزمن', key: 'time', width: 20 },
        { header: 'السعر المالي', key: 'price', width: 18 },
        { header: 'صورة علبة الدواء', key: 'image', width: 25 }
    ];

    // 3. إدخال البيانات والصور سطراً بسطر
    for (let i = 0; i < salesData.length; i++) {
        const item = salesData[i];
        const row = worksheet.addRow({ index: item.index, time: item.time, price: item.price });
        row.height = 70; // ضبط ارتفاع السطر ليتناسب مع حجم الصورة المدرجة

        // تفكيك وإضافة الصورة داخل خلية الإكسيل
        const base64Data = item.imageBase64.split(',')[1];
        const imageId = workbook.addImage({
            base64: base64Data,
            extension: 'jpeg',
        });

        // وضع الصورة في العمود رقم 4 (D) بجانب السعر والوقت
        worksheet.addImage(imageId, {
            tl: { col: 3, row: row.number - 1 },
            ext: { width: 120, height: 85 },
            editAs: 'undefined'
        });
    }

    // 4. تحميل وحفظ ملف الإكسيل النهائي على جهازك
    const buffer = await workbook.xlsx.writeBuffer();
    saveAs(new Blob([buffer]), `مبيعات_الصيدلية_المصورة_${new Date().toISOString().slice(0, 10)}.xlsx`);
    statusText.innerText = "📥 تم تحميل ملف Excel المطور بنجاح!";
});
