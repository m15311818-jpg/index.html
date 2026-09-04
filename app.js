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

// تشغيل وإيقاف الكاميرا بضغطة واحدة وبشكل مباشر فوراً
btnCamera.addEventListener("click", async () => {
    if (stream) {
        stopCamera();
    } else {
        await startCamera();
    }
});

async function startCamera() {
    statusText.innerText = "جاري فتح الكاميرا الخلفية...";
    try {
        // الاتصال المباشر بكاميرا الهاتف الخلفية الأساسية دون أي وسائط لإلغاء البطء
        stream = await navigator.mediaDevices.getUserMedia({
            video: { facingMode: "environment", width: { ideal: 640 }, height: { ideal: 480 } }
        });
        video.srcObject = stream;
        video.setAttribute("playsinline", true);
        video.play();
        
        videoContainer.style.display = "block";
        btnCamera.innerText = "🛑 إيقاف الكاميرا";
        btnCamera.style.backgroundColor = "#d32f2f";
        statusText.innerText = "✅ الكاميرا تعمل الآن، وجهها نحو علبة الدواء.";
        
        // بدء عملية الفحص الفوري لكل فريم
        requestAnimationFrame(tick);
    } catch (err) {
        console.error(err);
        statusText.innerText = "❌ تأكد من منح إذن الكاميرا للموقع في المتصفح.";
        alert("يرجى تفعيل صلاحية الكاميرا في إعدادات متصفح الهاتف.");
    }
}

function stopCamera() {
    if (stream) {
        stream.getTracks().forEach(track => track.stop());
        stream = null;
    }
    video.srcObject = null;
    videoContainer.style.display = "none";
    btnCamera.innerText = "📸 تشغيل الكاميرا الخلفية";
    btnCamera.style.backgroundColor = "#008080";
    statusText.innerText = "تم إيقاف الكاميرا.";
}

// دالة الفحص اللحظي الفائقة السرعة
function tick() {
    if (video.readyState === video.HAVE_ENOUGH_DATA && stream) {
        canvas.height = video.videoHeight;
        canvas.width = video.videoWidth;
        ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
        
        const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
        // قراءة الـ QR الفورية من الصورة المعروضة
        const code = jsQR(imageData.data, imageData.width, imageData.height, {
            inversionAttempts: "dontInvert",
        });

        if (code && code.data) {
            processQR(code.data);
        }
    }
    if (stream) {
        requestAnimationFrame(tick);
    }
}

function processQR(decodedText) {
    const now = Date.now();
    // منع التكرار الخطأ لمدة 3 ثوانٍ أثناء المسح
    if (decodedText === lastCode && (now - lastTime < 3000)) return;

    lastCode = decodedText;
    lastTime = now;

    if (navigator.vibrate) navigator.vibrate(100); // اهتزاز للتنبيه

    const timeStr = new Date().toLocaleTimeString('ar-EG');

    // تسجيل البيانات
    salesData.push({
        "م": salesData.length + 1,
        "الوقت": timeStr,
        "بيانات الدواء": decodedText
    });

    // تحديث الجدول فوراً
    const tbody = document.getElementById("table-body");
    const row = document.createElement("tr");
    row.innerHTML = `<td><b>${salesData.length}</b></td><td>${timeStr}</td><td style="color:#008080;">${decodedText}</td>`;
    tbody.insertBefore(row, tbody.firstChild); // إضافة الأحدث في الأعلى
    
    statusText.innerText = `✅ تم تسجيل علبة جديدة بنجاح! إجمالي: ${salesData.length}`;
}

// تصدير ملف الاكسيل التلقائي
document.getElementById('btn-download').addEventListener('click', () => {
    if (salesData.length === 0) {
        alert("لا توجد مبيعات مسجلة حتى الآن!");
        return;
    }
    const wb = XLSX.utils.book_new();
    const ws = XLSX.utils.json_to_sheet(salesData);
    ws['!dir'] = "rtl";
    XLSX.utils.book_append_sheet(wb, ws, "المبيعات");
    XLSX.writeFile(wb, `مبيعات_${new Date().toISOString().slice(0, 10)}.xlsx`);
});
