// قاعدة بيانات الأدوية في صيدليتك
const pharmacyInventory = {
    "https://panadol.com": { name: "بنادول إكسترا", price: "35 جنيه" },
    "1234567890": { name: "أوميز عشرين مجم", price: "70 جنيه" },
    "628100012345": { name: "فولتارين جل", price: "110 جنيه" }
};

let salesData = [];
let stream = null;

const video = document.getElementById("video");
const canvas = document.getElementById("canvas");
const ctx = canvas.getContext("2d", { willReadFrequently: true });
const statusText = document.getElementById("status-text");
const videoContainer = document.getElementById("video-container");
const btnCamera = document.getElementById("btn-toggle-camera");
const btnCapture = document.getElementById("btn-capture-now");
const tbody = document.getElementById("table-body");

const hasNativeDetector = ('BarcodeDetector' in window);
let nativeDetector = null;

if (hasNativeDetector) {
    nativeDetector = new BarcodeDetector({ 
        formats: ['qr_code', 'data_matrix', 'ean_13', 'code_128', 'ean_8'] 
    });
}

// صوت بيب الكاشير الشهير
function playBeepSound() {
    try {
        const audioCtx = new (window.AudioContext || window.webkitAudioContext)();
        const oscillator = audioCtx.createOscillator();
        const gainNode = audioCtx.createGain();
        oscillator.connect(gainNode);
        gainNode.connect(audioCtx.destination);
        oscillator.type = 'sine';
        oscillator.frequency.setValueAtTime(1400, audioCtx.currentTime); 
        gainNode.gain.setValueAtTime(0.4, audioCtx.currentTime);
        oscillator.start();
        oscillator.stop(audioCtx.currentTime + 0.08); 
    } catch (e) { console.error(e); }
}

// نطق اسم الدواء تلقائياً باللغة العربية
function speakMedicineName(text) {
    if ('speechSynthesis' in window) {
        window.speechSynthesis.cancel();
        const utterance = new SpeechSynthesisUtterance(text);
        utterance.lang = 'ar-EG';
        window.speechSynthesis.speak(utterance);
    }
}

// تشغيل وإيقاف الكاميرا الحية
btnCamera.addEventListener("click", async () => {
    if (stream) { stopCamera(); } else { await startCamera(); }
});

async function startCamera() {
    statusText.innerText = "جاري فتح الكاميرا الحية...";
    try {
        stream = await navigator.mediaDevices.getUserMedia({
            video: { facingMode: "environment", width: { ideal: 1280 }, height: { ideal: 720 } }
        });
        video.srcObject = stream;
        video.setAttribute("playsinline", true);
        video.play();
        
        videoContainer.style.display = "block";
        btnCapture.style.display = "block"; // إظهار زر اللقط
        btnCamera.innerText = "🛑 إيقاف الكاميرا";
        btnCamera.style.backgroundColor = "#d32f2f";
        statusText.innerText = "🎯 اضبط الكود داخل المستطيل واضغط على الزر الأحمر الكبير للَّقط فوراً.";
    } catch (err) {
        statusText.innerText = "❌ يرجى تفعيل إذن الكاميرا للمتصفح.";
    }
}

function stopCamera() {
    if (stream) { stream.getTracks().forEach(track => track.stop()); stream = null; }
    video.srcObject = null;
    videoContainer.style.display = "none";
    btnCapture.style.display = "none"; // إخفاء زر اللقط
    btnCamera.innerText = "📸 فتح الكاميرا";
    btnCamera.style.backgroundColor = "#008080";
    statusText.innerText = "تم إيقاف الكاميرا.";
}

// تفعيل حدث الضغط على زر اللقط الفوري الخاطف
btnCapture.addEventListener("click", async () => {
    if (!stream || video.readyState !== video.HAVE_ENOUGH_DATA) return;

    statusText.innerText = "⏳ جاري اللقط والتحليل الفوري...";

    // رسم اللقطة الحالية فوراً على الكانفاس المخفي للمعالجة بسرعة البرق
    canvas.height = video.videoHeight;
    canvas.width = video.videoWidth;
    ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
    
    let foundCode = "";

    // 1. المحاولة بالمعالج الداخلي السريع للموبايل
    if (hasNativeDetector && nativeDetector) {
        try {
            const barcodes = await nativeDetector.detect(canvas);
            if (barcodes.length > 0) { foundCode = barcodes.rawValue; }
        } catch (err) {}
    }

    // 2. المحاولة بالمحرك البرمجي الاحتياطي
    if (!foundCode) {
        const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
        const code = jsQR(imageData.data, imageData.width, imageData.height, { inversionAttempts: "dontInvert" });
        if (code && code.data) { foundCode = code.data; }
    }

    // النتيجة
    if (foundCode) {
        processCapturedQR(foundCode);
    } else {
        statusText.innerText = "❌ فشل لقط الكود! تأكد أنه واضح داخل المستطيل الفسفوري وحاول مجدداً.";
        if (navigator.vibrate) navigator.vibrate([50, 50]); // اهتزاز خفيف للخطأ
    }
});

function processCapturedQR(qrContent) {
    playBeepSound(); // تشغيل الصوت فوراً

    let medName = "دواء جديد غير مسجل";
    let medPrice = "غير محدد";

    for (const key in pharmacyInventory) {
        if (qrContent.includes(key) || key.includes(qrContent)) {
            medName = pharmacyInventory[key].name;
            medPrice = pharmacyInventory[key].price;
            break;
        }
    }

    if (medName === "دواء جديد غير مسجل") {
        medName = `كود: (${qrContent.substring(0, 15)})`;
    }

    // نطق اسم الدواء تلقائياً
    speakMedicineName(`تم تسجيل ${medName}`);

    const timeStr = new Date().toLocaleTimeString('ar-EG');
    salesData.push({
        "م": salesData.length + 1,
        "الوقت": timeStr,
        "اسم الدواء": medName,
        "السعر": medPrice,
        "بيانات الكود الكاملة": qrContent
    });

    // تنزيل فوري في الجدول
    const row = document.createElement("tr");
    row.innerHTML = `
        <td><b>${salesData.length}</b></td>
        <td>${timeStr}</td>
        <td style="color:#008080; font-weight:bold;">${medName}</td>
        <td style="color:#1f7246; font-weight:bold;">${medPrice}</td>
    `;
    tbody.insertBefore(row, tbody.firstChild);
    
    statusText.innerHTML = `✅ <b>تم الحفظ واللقط بنجاح:</b> ${medName}`;
}

// تصدير ملف الإكسيل
document.getElementById('btn-download').addEventListener('click', () => {
    if (salesData.length === 0) { alert("لا توجد مبيعات مسجلة حتى الآن!"); return; }
    const wb = XLSX.utils.book_new();
    const ws = XLSX.utils.json_to_sheet(salesData);
    ws['!dir'] = "rtl";
    XLSX.utils.book_append_sheet(wb, ws, "المبيعات اليومية");
    XLSX.writeFile(wb, `مبيعات_الصيدلية_${new Date().toISOString().slice(0, 10)}.xlsx`);
});
