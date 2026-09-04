const pharmacyInventory = {
    "https://panadol.com": { name: "بنادول إكسترا", price: "35 جنيه" },
    "1234567890": { name: "أوميز عشرين مجم", price: "70 جنيه" },
    "628100012345": { name: "فولتارين جل", price: "110 جنيه" }
};

let salesData = [];
let lastCode = "";
let lastTime = 0;
let stream = null;
let scanningActive = false;

const video = document.getElementById("video");
const canvas = document.getElementById("canvas");
const ctx = canvas.getContext("2d", { willReadFrequently: true });
const statusText = document.getElementById("status-text");
const videoContainer = document.getElementById("video-container");
const btnCamera = document.getElementById("btn-toggle-camera");
const tbody = document.getElementById("table-body");

const hasNativeDetector = ('BarcodeDetector' in window);
let nativeDetector = null;

if (hasNativeDetector) {
    nativeDetector = new BarcodeDetector({ 
        formats: ['qr_code', 'data_matrix', 'ean_13', 'code_128', 'ean_8'] 
    });
}

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

function speakMedicineName(text) {
    if ('speechSynthesis' in window) {
        window.speechSynthesis.cancel();
        const utterance = new SpeechSynthesisUtterance(text);
        utterance.lang = 'ar-EG';
        window.speechSynthesis.speak(utterance);
    }
}

btnCamera.addEventListener("click", async () => {
    if (stream) { stopCamera(); } else { await startCamera(); }
});

async function startCamera() {
    statusText.innerText = "جاري تهيئة الكاميرا ومستطيل المحاذاة...";
    try {
        const constraints = {
            video: {
                facingMode: "environment",
                width: { ideal: 1280 },
                height: { ideal: 720 }
            }
        };

        stream = await navigator.mediaDevices.getUserMedia(constraints);
        video.srcObject = stream;
        video.setAttribute("playsinline", true);
        video.play();
        
        videoContainer.style.display = "block";
        btnCamera.innerText = "🛑 إيقاف الكاميرا";
        btnCamera.style.backgroundColor = "#d32f2f";
        statusText.innerText = "🎯 اضبط كود الـ QR داخل المستطيل الأخضر تماماً للفحص التلقائي.";
        
        scanningActive = true;
        requestAnimationFrame(tick);
    } catch (err) {
        statusText.innerText = "❌ فشل تشغيل الكاميرا، يرجى تفعيل الصلاحية.";
    }
}

function stopCamera() {
    scanningActive = false;
    if (stream) { stream.getTracks().forEach(track => track.stop()); stream = null; }
    video.srcObject = null;
    videoContainer.style.display = "none";
    btnCamera.innerText = "📸 فتح الكاميرا التلقائية";
    btnCamera.style.backgroundColor = "#008080";
    statusText.innerText = "تم إيقاف الكاميرا.";
}

async function tick() {
    if (!scanningActive) return;

    if (video.readyState === video.HAVE_ENOUGH_DATA) {
        canvas.height = video.videoHeight;
        canvas.width = video.videoWidth;
        ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
        
        const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
        let foundCode = "";

        if (hasNativeDetector && nativeDetector) {
            try {
                const barcodes = await nativeDetector.detect(canvas);
                if (barcodes.length > 0) { foundCode = barcodes.rawValue; }
            } catch (err) {}
        }

        if (!foundCode) {
            const code = jsQR(imageData.data, imageData.width, imageData.height, { inversionAttempts: "dontInvert" });
            if (code && code.data) { foundCode = code.data; }
        }

        if (foundCode) { processAutomaticQR(foundCode); }
    }
    
    if (scanningActive) { requestAnimationFrame(tick); }
}

function processAutomaticQR(qrContent) {
    const now = Date.now();
    if (qrContent === lastCode && (now - lastTime < 4000)) return;

    lastCode = qrContent;
    lastTime = now;

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
        medName = `كود: (${qrContent.substring(0, 15)})`;
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
    
    statusText.innerHTML = `✅ <b>تم الحفظ تلقائياً:</b> ${medName}`;
}

document.getElementById('btn-download').addEventListener('click', () => {
    if (salesData.length === 0) { alert("لا توجد مبيعات مسجلة حتى الآن!"); return; }
    const wb = XLSX.utils.book_new();
    const ws = XLSX.utils.json_to_sheet(salesData);
    ws['!dir'] = "rtl";
    XLSX.utils.book_append_sheet(wb, ws, "المبيعات");
    XLSX.writeFile(wb, `مبيعات_الصيدلية_${new Date().toISOString().slice(0, 10)}.xlsx`);
});
