let salesData = [];
const statusText = document.getElementById("status-text");
const cameraInput = document.getElementById("medicine-camera");
const medNameInput = document.getElementById("med-name-input");
const medPriceInput = document.getElementById("med-price-input");
const tbody = document.getElementById("table-body");

// دالة نطق اسم الدواء صوتياً لتنبيه الموظف
function speakText(text) {
    if ('speechSynthesis' in window) {
        window.speechSynthesis.cancel();
        const utterance = new SpeechSynthesisUtterance(text);
        utterance.lang = 'ar-EG';
        window.speechSynthesis.speak(utterance);
    }
}

// دالة لتنظيف النص المستخرج من علبة الدواء وإزالة السطور الفارغة
function cleanExtractedText(rawText) {
    if (!rawText) return "";
    // تنظيف الحروف غير المرغوبة والتركيز على الكلمات الأساسية للدواء
    let lines = rawText.split('\n').map(line => line.trim()).filter(line => line.length > 2);
    return lines.slice(0, 2).join(" "); // أخذ أول سطرين غالباً يكون فيهما الاسم والجرعة
}

// عند التقاط صورة للعلبة بكاميرا الهاتف الأصلية والسريعة
cameraInput.addEventListener("change", async (event) => {
    const file = event.target.files[0];
    if (!file) return;

    statusText.innerText = "⏳ ذكاء اصطناعي: جاري معالجة الصورة واستخراج اسم الدواء...";
    medNameInput.value = "";

    try {
        // تشغيل محرك الذكاء الاصطناعي OCR لقراءة النصوص (يدعم الإنجليزية والعربية)
        const result = await Tesseract.recognize(file, 'eng+ara', {
            logger: m => console.log(m) // تتبع حالة المعالجة في الكونسول
        });

        const cleanedText = cleanExtractedText(result.data.text);

        if (cleanedText) {
            medNameInput.value = cleanedText;
            statusText.innerText = "✅ تم استخراج الاسم بنجاح! اكتب السعر واضغط حفظ.";
            speakText("تم قراءة الاسم");
        } else {
            statusText.innerText = "⚠️ لم نتمكن من قراءة الاسم بوضوح، يرجى كتابته يدوياً أو إعادة التصوير عن قرب.";
        }

    } catch (err) {
        console.error(err);
        statusText.innerText = "❌ حدث خطأ أثناء قراءة الصورة، يرجى كتابة الاسم يدوياً.";
    } finally {
        cameraInput.value = ""; // تفريغ المدخل لتجهيز الكاميرا للتصوير التالي
    }
});

// عند الضغط على زر حفظ الدواء الحالي في الجدول
document.getElementById("btn-add-record").addEventListener("click", () => {
    const name = medNameInput.value.trim();
    const price = medPriceInput.value.trim();

    if (!name) {
        alert("يرجى تصوير الدواء أو كتابة اسمه أولاً!");
        return;
    }
    if (!price) {
        alert("يرجى إدخال سعر الدواء لتسجيل البيع!");
        return;
    }

    const timeStr = new Date().toLocaleTimeString('ar-EG');
    
    // إضافة السجل في المصفوفة لشيت الاكسيل
    salesData.push({
        "م": salesData.length + 1,
        "الوقت": timeStr,
        "اسم الدواء": name,
        "السعر": price + " جنيه"
    });

    // تحديث الجدول اللحظي على شاشة الصيدلي
    const row = document.createElement("tr");
    row.innerHTML = `
        <td><b>${salesData.length}</b></td>
        <td>${timeStr}</td>
        <td style="color:#008080; font-weight:bold; text-align:right;">${name}</td>
        <td style="color:#1f7246; font-weight:bold;">${price} ج.م</td>
    `;
    tbody.insertBefore(row, tbody.firstChild); // وضع المبيعة الأحدث في الأعلى دائماً

    // نطق الحفظ التلقائي
    speakText("تم الحفظ");

    // إعادة تفريغ الخانات لتجهيز النظام للعلبة التالية
    medNameInput.value = "";
    medPriceInput.value = "";
    statusText.innerText = "✅ تم حفظ الدواء بنجاح في الجدول. جاهز لعلبة جديدة.";
});

// تصدير وتحميل شيت الاكسيل المجمع والمنظم
document.getElementById('btn-download').addEventListener('click', () => {
    if (salesData.length === 0) {
        alert("لا توجد مبيعات مسجلة في الجدول حتى الآن لتصديرها!");
        return;
    }
    const wb = XLSX.utils.book_new();
    const ws = XLSX.utils.json_to_sheet(salesData);
    ws['!dir'] = "rtl"; // جعل الشيت من اليمين لليسار ليناسب اللغة العربية
    XLSX.utils.book_append_sheet(wb, ws, "مبيعات الصيدلية اليومية");
    XLSX.writeFile(wb, `مبيعات_الصيدلية_${new Date().toISOString().slice(0, 10)}.xlsx`);
});
