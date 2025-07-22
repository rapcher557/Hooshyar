
const $ = (id) => document.getElementById(id);

const textInput = $('textInput');
const resultTitle = $('resultTitle');
const resultText = $('resultText');
const resultsSection = $('resultsSection');
const rewriteText = $('rewriteText');
const rewriteResult = $('rewriteResult');
const copyRewriteBtn = $('copyRewriteBtn');

let analysisChart = null;


// function createChart({ labels, data, colors }) {
//     const ctx = $('analysisChart').getContext('2d');
//     if (analysisChart) analysisChart.destroy();

//     analysisChart = new Chart(ctx, {
//         type: 'pie',
//         data: {
//             labels,
//             datasets: [{
//                 data,
//                 backgroundColor: colors
//             }]
//         },
//         options: {
//             responsive: true,
//             plugins: {
//                 legend: { position: 'bottom' }
//             }
//         }
//     });
// }

function displayFakeAnalysis(data) {
            document.getElementById('resultTitle').textContent = 'نتایج بررسی صحت متن';
            
            let fakeText = '';
            let fakeColor = '';
            
            if (data.is_fake) {
                fakeText = 'متن احتمالاً جعلی است';
                fakeColor = 'text-red-400';
            } else {
                fakeText = 'متن احتمالاً واقعی است';
                fakeColor = 'text-green-400';
            }
            
            const confidencePercent = Math.round(data.fake_confidence * 100);
            
            const resultHTML = `
                <div class="mb-4">
                    <span class="font-medium">نتیجه بررسی:</span>
                    <span class="${fakeColor} font-bold mr-2">${fakeText}</span>
                    <span class="text-gray-400">(میزان اطمینان: ${confidencePercent}%)</span>
                </div>
                <div class="bg-gray-700 p-4 rounded-lg">
                    <p class="text-gray-300">${data.fake_explanation}</p>
                </div>
            `;
            
            document.getElementById('resultText').innerHTML = resultHTML;
            
            createFakeDetectionChart(data);
        }
        
        // Create fake detection chart
        // function createFakeDetectionChart(data) {
        //     const ctx = document.getElementById('analysisChart').getContext('2d');
            
        //     const fakeValue = data.is_fake ? data.fake_confidence : 0;
        //     const realValue = data.is_fake ? 0 : data.fake_confidence;
            
        //     analysisChart = new Chart(ctx, {
        //         type: 'doughnut',
        //         data: {
        //             labels: ['جعلی', 'واقعی'],
        //             datasets: [{
        //                 data: [fakeValue, realValue],
        //                 backgroundColor: [
        //                     'rgba(248, 113, 113, 0.7)',
        //                     'rgba(74, 222, 128, 0.7)'
        //                 ],
        //                 borderColor: [
        //                     'rgba(248, 113, 113, 1)',
        //                     'rgba(74, 222, 128, 1)'
        //                 ],
        //                 borderWidth: 1
        //             }]
        //         },
        //         options: {
        //             responsive: true,
        //             maintainAspectRatio: false,
        //             plugins: {
        //                 legend: {
        //                     position: 'bottom',
        //                     rtl: true,
        //                     labels: {
        //                         font: {
        //                             family: 'Vazirmatn'
        //                         },
        //                         padding: 20
        //                     }
        //                 }
        //             }
        //         }
        //     });
        // }

function displayProfanityAnalysis(data) {
    console.log("📊 Profanity data received:", data);
    resultTitle.textContent = 'تشخیص توهین';

    if (data.error) {
        resultText.innerHTML = `<div class="text-red-400">❌ خطا: ${data.error}</div>`;
        return;
    }

    const hasProfanity = data.has_profanity || false;
    const confidence = data.profanity_confidence ? (data.profanity_confidence * 100).toFixed(1) : 0;
    const explanation = data.profanity_explanation || 'توضیحی ارائه نشد';
    const badWords = data.bad_words || [];

    const resultHTML = `
        <div class="mb-4">
            <span class="font-medium">نتیجه:</span>
            <span class="${hasProfanity ? 'text-red-400' : 'text-green-400'} font-bold mr-2">
                ${hasProfanity ? 'محتوای توهین‌آمیز شناسایی شد' : 'محتوای توهین‌آمیز شناسایی نشد'}
            </span>
            <span class="text-gray-400">(اطمینان: ${confidence}٪)</span>
        </div>
        <div class="bg-gray-700 p-4 rounded-lg mb-4">
            <p class="text-gray-300">${explanation}</p>
        </div>
        ${badWords.length > 0 ? `
            <div>
                <h4 class="text-sm text-pink-300 mb-2">کلمات توهین‌آمیز:</h4>
                <div class="flex flex-wrap gap-2">
                    ${badWords.map(word => `
                        <span class="bg-pink-800 text-white px-2 py-1 rounded-full text-sm">${word}</span>
                    `).join('')}
                </div>
            </div>
        ` : ''}
    `;

    resultText.innerHTML = resultHTML;

    document.querySelector('#mainResult .lg\\:w-1\\/3')?.classList.add('hidden');
    document.querySelector('#mainResult .lg\\:w-2\\/3')?.classList.remove('lg:w-2/3');
    document.querySelector('#mainResult .lg\\:w-2\\/3')?.classList.add('w-full');
}

function displayRewriteResult(data) {
    console.log("📝 Rewrite data received:", data);
    resultTitle.textContent = "نتایج بازنویسی متن";
    
    const resultHTML = `
        <div class="mb-6">
            <div class="flex items-center mb-2">
                <span class="w-2 h-2 bg-blue-500 rounded-full mr-2"></span>
                <span class="font-medium">متن اصلی (${data.original_length} کاراکتر):</span>
            </div>
            <div class="bg-gray-700 p-4 rounded-lg mb-4 text-gray-300">
                ${textInput.value.trim() || '—'}
            </div>
        </div>
    `;

    resultText.innerHTML = resultHTML;
    
    rewriteText.textContent = data.rewritten_text || '—';
    rewriteResult.classList.remove('hidden');
    
    const statsHTML = `
        <div class="mt-4 flex flex-wrap gap-4 text-sm">
            <div class="flex items-center">
                <span class="text-gray-400 ml-2">تعداد کاراکترهای متن اصلی:</span>
                <span class="font-medium">${data.original_length}</span>
            </div>
            <div class="flex items-center">
                <span class="text-gray-400 ml-2">تعداد کاراکترهای متن جدید:</span>
                <span class="font-medium">${data.rewritten_length}</span>
            </div>
            <div class="flex items-center">
                <span class="text-gray-400 ml-2">تفاوت:</span>
                <span class="font-medium ${data.rewritten_length > data.original_length ? 'text-red-400' : 'text-green-400'}">
                    ${Math.abs(data.rewritten_length - data.original_length)} کاراکتر
                    ${data.rewritten_length > data.original_length ? 'افزایش' : 'کاهش'}
                </span>
            </div>
        </div>
    `;
    
    resultText.insertAdjacentHTML('beforeend', statsHTML);
    
    document.querySelector('#mainResult .lg\\:w-1\\/3')?.classList.add('hidden');
    document.querySelector('#mainResult .lg\\:w-2\\/3')?.classList.remove('lg:w-2/3');
    document.querySelector('#mainResult .lg\\:w-2\\/3')?.classList.add('w-full');
}

function analyzeText(type) {
    const text = textInput.value.trim();
    if (!text) return alert("لطفاً متن خود را وارد کنید.");

    if (type === 'rewrite' && text.length > 1000) {
        return alert("حداکثر طول متن برای بازنویسی 1000 کاراکتر است.");
    }

    const endpointMap = {
        sentiment: 'analyze.php',
        fake: 'analyze.php',
        rewrite: 'rewrite.php',
        grammar: 'grammar.php',
        profanity: 'profanity.php'
    };

    const endpoint = endpointMap[type];
    if (!endpoint) return alert("ماژول نامعتبر است.");

    resultText.textContent = "در حال پردازش متن...";
    resultText.classList.add('animate-pulse');
    resultsSection.classList.remove('hidden');
    rewriteResult.classList.add('hidden');

    const loadingMessages = {
        rewrite: "در حال بازنویسی متن... (این فرآیند ممکن است چند لحظه طول بکشد)"
    };
    
    if (loadingMessages[type]) {
        resultText.textContent = loadingMessages[type];
    }

    fetch(`../api/${endpoint}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ text })
    })
    .then(async res => {
        if (!res.ok) {
            const errorData = await res.json().catch(() => ({}));
            throw new Error(errorData.error || `خطای سرور: ${res.status}`);
        }
        return res.json();
    })
    .then(data => {
        resultText.classList.remove('animate-pulse');

        if (data.error) {
            resultText.innerHTML = `❌ خطا: ${data.error}`;
            return;
        }

        switch (type) {
            case 'rewrite':
                displayRewriteResult(data);
                break;
            // ... سایر caseها بدون تغییر
        }
    })
    .catch(err => {
        resultText.classList.remove('animate-pulse');
        resultText.innerHTML = `❌ خطا در پردازش:<br><code>${err.message}</code>`;
    });
}
if (copyRewriteBtn) {
    copyRewriteBtn.addEventListener('click', () => {
        const text = rewriteText.textContent;
        if (!text || text === '—') {
            copyRewriteBtn.innerHTML = '<i class="fas fa-exclamation-circle ml-2"></i> متنی برای کپی وجود ندارد';
            setTimeout(() => {
                copyRewriteBtn.innerHTML = '<i class="fas fa-copy ml-2"></i> کپی متن';
            }, 2000);
            return;
        }

        navigator.clipboard.writeText(text).then(() => {
            copyRewriteBtn.innerHTML = '<i class="fas fa-check ml-2"></i> کپی شد!';
            copyRewriteBtn.classList.replace('bg-purple-600', 'bg-green-600');
            copyRewriteBtn.classList.replace('hover:bg-purple-700', 'hover:bg-green-700');
        }).catch(() => {
            copyRewriteBtn.innerHTML = '<i class="fas fa-times ml-2"></i> خطا در کپی!';
            copyRewriteBtn.classList.replace('bg-purple-600', 'bg-red-600');
            copyRewriteBtn.classList.replace('hover:bg-purple-700', 'hover:bg-red-700');
        }).finally(() => {
            setTimeout(() => {
                copyRewriteBtn.innerHTML = '<i class="fas fa-copy ml-2"></i> کپی متن';
                copyRewriteBtn.classList.replace('bg-green-600', 'bg-purple-600');
                copyRewriteBtn.classList.replace('bg-red-600', 'bg-purple-600');
                copyRewriteBtn.classList.replace('hover:bg-green-700', 'hover:bg-purple-700');
                copyRewriteBtn.classList.replace('hover:bg-red-700', 'hover:bg-purple-700');
            }, 2000);
        });
    });
}

function analyzeText(type) {
    const text = textInput.value.trim();
    if (!text) return alert("لطفاً متن خود را وارد کنید.");

    const endpointMap = {
        sentiment: 'analyze.php',
        fake: 'analyze.php',
        rewrite: 'rewrite.php',
        grammar: 'grammar.php',
        profanity: 'profanity.php'
    };

    const endpoint = endpointMap[type];
    if (!endpoint) return alert("ماژول نامعتبر است.");

    resultText.textContent = "در حال پردازش متن...";
    resultText.classList.add('animate-pulse');
    resultsSection.classList.remove('hidden');
    rewriteResult.classList.add('hidden');

    fetch(`../api/${endpoint}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ text })
    })
    .then(async res => {
        if (!res.ok) throw new Error(`خطای سرور: ${res.status}`);
        return res.json();
    })
    .then(data => {
        resultText.classList.remove('animate-pulse');

        if (data.error) {
            resultText.innerHTML = `❌ خطا: ${data.error}<br><pre style="direction:ltr; font-size:12px">${data.raw_response || ''}</pre>`;
            return;
        }

        switch (type) {
            case 'rewrite':
                // resultTitle.textContent = "بازنویسی متن";
                // rewriteText.textContent = data.rewritten_text || '—';
                // rewriteResult.classList.remove('hidden');
                displayRewriteResult(data);
                break;
            
            case 'fake':
                displayFakeAnalysis(data);
                break;

            case 'grammar':
                resultTitle.textContent = "اصلاح نگارشی";
                resultText.textContent = data.corrected_text || '—';
                break;

            case 'profanity':
                displayProfanityAnalysis(data);
                break;
            default: // sentiment یا fake
                resultTitle.textContent = "تحلیل احساسات + جعلی بودن";
                resultText.innerHTML = `
                    🧠 احساس: ${data.sentiment}<br>
                    📊 اطمینان: ${(Number(data.confidence || 0) * 100).toFixed(1)}٪<br>
                    💬 توضیح: ${data.explanation || '—'}<br><br>
                    ⚠️ جعلی بودن: ${data.is_fake ? "جعلی است" : "جعلی نیست"}<br>
                    🔎 اطمینان: ${(Number(data.fake_confidence || 0) * 100).toFixed(1)}٪<br>
                    📄 توضیح: ${data.fake_explanation || '—'}
                `;

                createChart({
                    labels: ["مثبت", "منفی", "خنثی"],
                    data: [
                        data.sentiment === 'مثبت' ? data.confidence : 0,
                        data.sentiment === 'منفی' ? data.confidence : 0,
                        data.sentiment === 'خنثی' ? data.confidence : 0
                    ],
                    colors: ['#10B981', '#EF4444', '#6B7280']
                });
        }
    })
    .catch(err => {
        resultText.classList.remove('animate-pulse');
        resultText.innerHTML = `❌ خطا در ارتباط با سرور:<br><code>${err.message}</code>`;
    });
}

if (copyRewriteBtn) {
    copyRewriteBtn.addEventListener('click', () => {
        const text = rewriteText.textContent;
        navigator.clipboard.writeText(text).then(() => {
            copyRewriteBtn.textContent = "✅ کپی شد!";
        }).catch(() => {
            copyRewriteBtn.textContent = "❌ خطا در کپی!";
        }).finally(() => {
            setTimeout(() => {
                copyRewriteBtn.innerHTML = '<i class="fas fa-copy ml-2"></i> کپی متن';
            }, 2000);
        });
    });
}