// قاعدة بيانات الأدوية التوضيحية في صيدليتك
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

// دالة توليد صوت بيب الكاشير
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
    } catch (e) { console.error("صوت التنبيه غير مدعوم حالياً", e); }
}

// دالة النطق الصوتي لاسم الدواء بالعربية
function speakMedicineName(text) {
    if ('speechSynthesis' in window) {
        window.speechSynthesis.cancel();
        const utterance = new SpeechSynthesisUtterance(text);
        utterance.lang = 'ar-EG';
        window.speechSynthesis.speak(utterance);
    }
}

// تشغيل وإيقاف الكاميرا الحية بالمتصفح
btnCamera.addEventListener("click", async () => {
    if (stream) { stopCamera(); } else { await startCamera(); }
});

async function startCamera() {
    statusText.innerText = "جاري فتح الكاميرا الحية...";
    try {
        // أبعاد قياسية خفيفة متوافقة مع كل كاميرات الموبايل لمنع التجمد والتعليق
        stream = await navigator.mediaDevices.getUserMedia({
            video: { facingMode: "environment" }
        });
        video.srcObject = stream;
        video.setAttribute("playsinline", true);
        video.play();
        
        videoContainer.style.display = "block";
        btnCapture.style.display = "block"; 
        btnCamera.innerText = "🛑 إيقاف الكاميرا";
        btnCamera.style.backgroundColor = "#d32f2f";
        statusText.innerText = "🎯 اضبط الكود داخل المستطيل واضغط على الزر الأحمر للَّقط وحفظ الدواء.";
    } catch (err) {
        console.error(err);
        statusText.innerText = "❌ يرجى تفعيل منح إذن الكاميرا للمتصفح.";
        alert("برجاء الموافقة على صلاحية الكاميرا لكي تفتح معك بنجاح.");
    }
}

function stopCamera() {
    if (stream) { stream.getTracks().forEach(track => track.stop()); stream = null; }
    video.srcObject = null;
    videoContainer.style.display = "none";
    btnCapture.style.display = "none"; 
    btnCamera.innerText = "📸 فتح الكاميرا";
    btnCamera.style.backgroundColor = "#008080";
    statusText.innerText = "تم إيقاف الكاميرا.";
}

// هندسة الزر الفورية: قراءة وتفكيك الصورة اللحظية حتماً
btnCapture.addEventListener("click", () => {
    if (!stream || video.readyState !== video.HAVE_ENOUGH_DATA) {
        statusText.innerText = "❌ الكاميرا ليست جاهزة بعد، يرجى الانتظار ثانية.";
        return;
    }

    statusText.innerText = "⏳ جاري الفحص الفوري لعلبة الدواء...";

    // تطابق كامل الأبعاد الحقيقية للبث لضمان لقط دقيق
    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;
    ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
    
    // التقاط مصفوفة البكسلات وتحليلها بمحرك القراءة المضمون المباشر
    const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
    
    try {
        const code = jsQR(imageData.data, imageData.width, imageData.height, {
            inversionAttempts: "dontInvert"
        });

        if (code && code.data) {
            // نجحت القراءة؛ نقوم بحفظ وعرض النتيجة فوراً
            processCapturedQR(code.data);
        } else {
            statusText.innerText = "❌ لم يتم لقط الكود! قرب أو ابعد العلبة قليلاً ليظهر بوضوح واضغط مجدداً.";
            if (navigator.vibrate) navigator.vibrate(80);
        }
    } catch (error) {
        console.error(error);
        statusText.innerText = "❌ حدث خطأ أثناء المعالجة، يرجى إعادة لقط الصورة.";
    }
});

function processCapturedQR(qrContent) {
    playBeepSound(); 

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
        medName = `كود جديد: (${qrContent.substring(0, 15)})`;
    }

    speakMedicineName(`تم تسجيل ${medName}`);

    const timeStr = new Date().toLocaleTimeString('ar-EG');
    salesData.push({
        "م": salesData.length + 1,
        "الوقت": timeStr,
        "اسم الدواء": medName,
        "السعر": medPrice,
        "بيانات الكود الكاملة": qrContent
    });

    const row = document.createElement("tr");
    row.innerHTML = `
        <td><b>${salesData.length}</b></td>
        <td>${timeStr}</td>
        <td style="color:#008080; font-weight:bold;">${medName}</td>
        <td style="color:#1f7246; font-weight:bold;">${medPrice}</td>
    `;
    tbody.insertBefore(row, tbody.firstChild);
    
    statusText.innerHTML = `✅ <b>تم التسجيل بنجاح:</b> ${medName} (${medPrice})`;
}

// تصدير ملف الإكسيل التلقائي الموجه للعربية
document.getElementById('btn-download').addEventListener('click', () => {
    if (salesData.length === 0) { alert("لا توجد مبيعات مسجلة حتى الآن!"); return; }
    const wb = XLSX.utils.book_new();
    const ws = XLSX.utils.json_to_sheet(salesData);
    ws['!dir'] = "rtl";
    XLSX.utils.book_append_sheet(wb, ws, "المبيعات اليومية");
    XLSX.writeFile(wb, `مبيعات_الصيدلية_${new Date().toISOString().slice(0, 10)}.xlsx`);
});
