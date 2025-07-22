let sentimentChart; // برای مدیریت نمودار احساس
// 🔥 اضافه شده: محدودیت‌ها
let dailyLimit = 100; // حداکثر درخواست در روز
let cooldownTime = 5000; // ۵ ثانیه

function getTodayKey() {
    const today = new Date().toISOString().slice(0, 10);
    return `clicks_${today}`;
}

function incrementClickCount() {
    const key = getTodayKey();
    let count = parseInt(localStorage.getItem(key)) || 0;
    localStorage.setItem(key, count + 1);
    return count + 1;
}

function isLimitExceeded() {
    const key = getTodayKey();
    let count = parseInt(localStorage.getItem(key)) || 0;
    return count >= dailyLimit;
}

async function runModule(module) {
    if (isLimitExceeded()) {
        alert("❗ شما به سقف مجاز درخواست‌های امروز رسیدید.");
        return;
    }
    if (!turnstileToken) {
        alert("❗ لطفاً تایید امنیت را انجام دهید.");
        return;
    }

    const text = document.getElementById("inputText").value.trim();
    const resultBox = document.getElementById("result");
    const chartCanvas = document.getElementById('sentimentChart');
    const buttons = document.querySelectorAll("button"); // 🔥 اضافه شده: غیرفعال‌سازی دکمه‌ها

    if (!text) {
        resultBox.innerText = "❗ لطفاً ابتدا متنی وارد کنید.";
        chartCanvas.style.display = 'none';
        return;
    }

    buttons.forEach(btn => btn.disabled = true); // 🔥 اضافه شده: غیرفعال کردن دکمه‌ها
    incrementClickCount(); // 🔥 اضافه شده: افزایش شمارش کلیک

    try {
        const res = await fetch(`../api/${module}.php`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ text })
        });

        const data = await res.json();

        if (data.error) {
            resultBox.innerText = `❌ خطا: ${data.error}`;
            chartCanvas.style.display = 'none';
            if (sentimentChart) sentimentChart.destroy();
            return;
        }

        if (module === 'analyze') {
            resultBox.innerText = `
🧠 احساس متن: ${data.sentiment}
📊 اطمینان احساس: ${(data.confidence * 100).toFixed(1)}٪
💬 توضیح احساس: ${data.explanation}

⚠️ جعلی بودن خبر: ${data.is_fake ? "بله (مشکوک)" : "خیر (معتبر)"}
🔎 اطمینان جعلی بودن: ${(data.fake_confidence * 100).toFixed(1)}٪
📄 توضیح جعلی بودن: ${data.fake_explanation}
            `;

            chartCanvas.style.display = 'block';

            const sentimentData = {
                labels: ["مثبت", "منفی", "خنثی"],
                datasets: [{
                    data: [
                        data.sentiment === "مثبت" ? data.confidence : 0,
                        data.sentiment === "منفی" ? data.confidence : 0,
                        data.sentiment === "خنثی" ? data.confidence : 0
                    ],
                    backgroundColor: ["#4caf50", "#f44336", "#ff9800"]
                }]
            };

            const ctx = chartCanvas.getContext('2d');
            if (sentimentChart) sentimentChart.destroy();

            sentimentChart = new Chart(ctx, {
                type: 'pie',
                data: sentimentData,
                options: {
                    responsive: true,
                    plugins: {
                        legend: { position: 'bottom' }
                    }
                }
            });

        } else if (module === 'profanity') {
            chartCanvas.style.display = 'none';
            let highlightedText = text;
            if (data.bad_words && data.bad_words.length > 0) {
                data.bad_words.forEach(word => {
                    const regex = new RegExp(`(${escapeRegExp(word)})`, 'gi');
                    highlightedText = highlightedText.replace(regex, '<span style="color:red; font-weight:bold;">$1</span>');
                });
            }

            resultBox.innerHTML = `
🚨 وجود توهین: ${data.has_profanity ? "بله" : "خیر"}<br>
📊 اطمینان: ${(data.profanity_confidence * 100).toFixed(1)}٪<br>
💬 توضیح: ${data.profanity_explanation}<br><br>
📝 متن با هایلایت:<br>
${highlightedText}
            `;

        } else if (module === 'rewrite') {
            chartCanvas.style.display = 'none';
            resultBox.innerText = `✏️ متن بازنویسی‌شده:\n${data.rewritten_text}`;

        } else if (module === 'grammar') {
            chartCanvas.style.display = 'none';
            resultBox.innerText = `✅ متن اصلاح‌شده:\n${data.corrected_text}`;

        } else {
            chartCanvas.style.display = 'none';
            resultBox.innerText = JSON.stringify(data, null, 2);
        }

    } catch (err) {
        resultBox.innerText = `❌ خطای شبکه یا پردازش: ${err.message}`;
        chartCanvas.style.display = 'none';
        if (sentimentChart) sentimentChart.destroy();
    } finally {
        setTimeout(() => {
            buttons.forEach(btn => btn.disabled = false); // 🔥 اضافه شده: فعال‌سازی مجدد دکمه‌ها
        }, cooldownTime);
    }
}

// کمک‌کننده برای فرار دادن regex
function escapeRegExp(string) {
    return string.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}
