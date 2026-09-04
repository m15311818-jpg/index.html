// قاعدة بيانات الأدوية التجريبية (تستطيع إضافة أي روابط أو أكواد أدوية حقيقية هنا)
const pharmacyInventory = {
    "https://panadol.com": { name: "بنادول إكسترا", price: "35 جنيه" },
    "1234567890": { name: "أوميز عشرين مجم", price: "70 جنيه" },
    "628100012345": { name: "فولتارين جل", price: "110 جنيه" }
};

let salesData = [];
let lastCode = "";
let lastTime = 0;
let stream = null;

const video = document.getElementById("video");
const canvas = document.getElementById("canvas");
const ctx = canvas.getContext("2d", { willReadFrequently: true });
const statusText = document.getElementById("status-text");
const videoContainer = document.getElementById("video-container");
const btnCamera = document.getElementById("btn-toggle-camera");
const tbody = document.getElementById("table-body");

// دالة توليد صوت الـ Beep الخاص بالكاشير برمجياً بدون ملفات صوتية خارجية لضمان السرعة اللحظية
function playBeepSound() {
    try {
        const audioCtx = new (window.AudioContext || window.webkitAudioContext)();
        const oscillator = audioCtx.createOscillator();
        const gainNode = audioCtx.createGain();
        oscillator.connect(gainNode);
        gainNode.connect(audioCtx.destination);
        oscillator.type = 'sine';
        oscillator.frequency.setValueAtTime(1200, audioCtx.currentTime); // تردد صوت الكاشير الشهير
        gainNode.gain.setValueAtTime(0.3, audioCtx.currentTime);
        oscillator.start();
        oscillator.stop(audioCtx.currentTime + 0.1); // مدة الصوت 100 مللي ثانية
    } catch (e) { console.error("فشل تشغيل صوت التنبيه", e); }
}

// دالة النطق الصوتي لاسم الدواء باللغة العربية
function speakMedicineName(text) {
    if ('speechSynthesis' in window) {
        // إلغاء أي نطق سابق معلق لكي لا يتأخر النظام
        window.speechSynthesis.cancel();
        
        const utterance = new SpeechSynthesisUtterance(text);
        utterance.lang = 'ar-EG'; // ضبط النطق بلهجة عربية صحيحة
        utterance.rate = 1.0;     // سرعة الكلمات طبيعية
        window.speechSynthesis.speak(utterance);
    }
}

// فتح وإيقاف الكاميرا التلقائية بضغطة زر واحدة
btnCamera.addEventListener("click", async () => {
    if (stream) { stopCamera(); } else { await startCamera(); }
});

async function startCamera() {
    statusText.innerText = "جاري تشغيل عدسة الكاميرا المستمرة...";
    try {
        stream = await navigator.mediaDevices.getUserMedia({
            video: { facingMode: "environment", width: { ideal: 640 }, height: { ideal: 480 } }
        });
        video.srcObject = stream;
        video.setAttribute("playsinline", true);
        video.play();
        
        videoContainer.style.display = "block";
        btnCamera.innerText = "🛑 إيقاف الكاميرا";
        btnCamera.style.backgroundColor = "#d32f2f";
        statusText.innerText = "🔍 الكاميرا تعمل تلقائياً الآن. مرر علبة الدواء أمامها مباشرة.";
        
        requestAnimationFrame(tick);
    } catch (err) {
        statusText.innerText = "❌ يرجى إعطاء صلاحية الكاميرا للمتصفح.";
        alert("تنبيه: اضغط على 'السماح بالوصول للكاميرا' لتتمكن من تشغيل الفحص التلقائي.");
    }
}

function stopCamera() {
    if (stream) { stream.getTracks().forEach(track => track.stop()); stream = null; }
    video.srcObject = null;
    videoContainer.style.display = "none";
    btnCamera.innerText = "📸 فتح الكاميرا التلقائية";
    btnCamera.style.backgroundColor = "#008080";
    statusText.innerText = "تم إيقاف الكاميرا.";
}

// دالة الفحص الذاتي اللحظي المستمر لكل إطار (Frame) من الكاميرا
function tick() {
    if (video.readyState === video.HAVE_ENOUGH_DATA && stream) {
        canvas.height = video.videoHeight;
        canvas.width = video.videoWidth;
        ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
        
        const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
        const code = jsQR(imageData.data, imageData.width, imageData.height, { inversionAttempts: "dontInvert" });

        if (code && code.data) {
            processAutomaticQR(code.data);
        }
    }
    if (stream) { requestAnimationFrame(tick); }
}

// دالة معالجة الـ QR وحفظه ونطقه تلقائياً دون تدخل بشري
function processAutomaticQR(qrContent) {
    const now = Date.now();
    // حماية ذكية: تمنع تكرار مسح نفس علبة الدواء إلا بعد مرور 4 ثوانٍ
    if (qrContent === lastCode && (now - lastTime < 4000)) return;

    lastCode = qrContent;
    lastTime = now;

    playBeepSound(); // 1. إطلاق صوت إشعار الكاشير فوراً

    let medName = "دواء جديد غير مسجل";
    let medPrice = "غير محدد";

    // 2. البحث والمطابقة في المخزن الخاص بالصيدلية
    for (const key in pharmacyInventory) {
        if (qrContent.includes(key) || key.includes(qrContent)) {
            medName = pharmacyInventory[key].name;
            medPrice = pharmacyInventory[key].price;
            break;
        }
    }

    if (medName === "دواء جديد غير مسجل") {
        medName = `كود جديد (${qrContent.substring(0, 15)})`;
    }

    // 3. النطق الصوتي الذكي باسم الدواء تلقائياً
    speakMedicineName(`تم تسجيل ${medName}`);

    // 4. الحفظ الفوري في المصفوفة لتجهيز شيت الإكسيل
    const timeStr = new Date().toLocaleTimeString('ar-EG');
    salesData.push({
        "م": salesData.length + 1,
        "الوقت": timeStr,
        "اسم الدواء": medName,
        "السعر": medPrice,
        "بيانات الكود الكاملة": qrContent
    });

    // 5. التحديث اللحظي للجدول أمام الموظف (الأحدث يظهر فوق)
    const row = document.createElement("tr");
    row.innerHTML = `
        <td><b>${salesData.length}</b></td>
        <td>${timeStr}</td>
        <td style="color:#008080; font-weight:bold;">${medName}</td>
        <td style="color:#1f7246; font-weight:bold;">${medPrice}</td>
    `;
    tbody.insertBefore(row, tbody.firstChild);
    
    statusText.innerHTML = `✨ <b>تم الحفظ تلقائياً:</b> ${medName} (${medPrice})`;
}

// تحميل وتصدير ملف الاكسيل التلقائي المنسق
document.getElementById('btn-download').addEventListener('click', () => {
    if (salesData.length === 0) { alert("لا توجد مبيعات مسجلة حتى الآن!"); return; }
    const wb = XLSX.utils.book_new();
    const ws = XLSX.utils.json_to_sheet(salesData);
    ws['!dir'] = "rtl";
    XLSX.utils.book_append_sheet(wb, ws, "مبيعات اليوم الصوتية");
    XLSX.writeFile(wb, `مبيعات_الصيدلية_الذكية_${new Date().toISOString().slice(0, 10)}.xlsx`);
});
