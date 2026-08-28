// app.js - التحكم الشامل، مؤشرات الخطر الديناميكية، وإصدار الشهادات الأكاديمية

let currentLevelIndex = 0;
let isTyping = false;
let failedAttempts = 0;

document.addEventListener("DOMContentLoaded", () => {
    renderLevels();
    setupChat();
    
    document.getElementById("reset-btn").onclick = () => {
        if (confirm("هل أنت متأكد من رغبتك في تصفير التقدم بالكامل؟")) {
            GameState.resetProgress();
            currentLevelIndex = 0;
            failedAttempts = 0;
            updateWafMeter(0);
            renderLevels();
            selectLevel(0);
        }
    };
});

function renderLevels() {
    const list = document.getElementById("levels-list");
    if (!list) return;
    
    list.innerHTML = "";
    const completedLevels = GameState.getCompletedLevels();
    let completedCount = completedLevels.length;

    levelsData.forEach((lvl, idx) => {
        const isUnlocked = GameState.isUnlocked(lvl.id);
        const isCompleted = completedLevels.includes(lvl.id);

        const li = document.createElement("li");
        li.className = `${idx === currentLevelIndex ? "active" : ""} ${!isUnlocked ? "locked" : ""}`;
        
        let iconClass = 'fa-lock';
        let iconStyle = '';
        if (isCompleted) {
            iconClass = 'fa-circle-check';
            iconStyle = 'color: #28a745;';
        } else if (isUnlocked) {
            iconClass = 'fa-lock-open';
        }

        li.innerHTML = `
            <div>
                <strong>${lvl.title}</strong>
                <small style="display:block; color: var(--text-muted); font-size:0.75rem;">${lvl.category}</small>
            </div>
            <i class="fa-solid ${iconClass}" style="${iconStyle}"></i>
        `;

        if (isUnlocked) {
            li.onclick = () => selectLevel(idx);
        }
        list.appendChild(li);
    });

    const countElem = document.getElementById("completed-count");
    if (countElem) countElem.innerText = completedCount;

    const certBtn = document.getElementById("cert-btn");
    if (certBtn) {
        certBtn.disabled = completedCount < levelsData.length;
    }
}

function selectLevel(index) {
    if (isTyping) return;
    currentLevelIndex = index;
    renderLevels();
    const lvl = levelsData[index];
    
    document.getElementById("current-level-title").innerText = lvl.title;
    document.getElementById("current-level-desc").innerText = `${lvl.desc} (${lvl.category})`;
    
    const messages = document.getElementById("chat-messages");
    messages.innerHTML = `
        <div class="message system">
            <i class="fa-solid fa-dragon"></i>
            <div class="content">بدأت التحدي: <b>${lvl.title}</b>. أدخل أوامرك لاستخراج الـ Flag.</div>
        </div>
    `;
    updateWafMeter(0);
}

/**
 * تحديث واجهة الـ WAF Meter بناءً على نتيجة calculateWafRisk أو عدد المحاولات
 */
function updateWafMeter(score) {
    const wafScoreElem = document.getElementById("waf-score");
    const wafBarFill = document.getElementById("waf-bar-fill");

    if (!wafScoreElem || !wafBarFill) return;

    wafScoreElem.innerText = `${score}%`;
    wafBarFill.style.width = `${score}%`;

    if (score < 35) {
        wafBarFill.style.backgroundColor = "var(--success-green, #28a745)";
        wafBarFill.style.boxShadow = "0 0 8px rgba(40, 167, 69, 0.5)";
    } else if (score < 65) {
        wafBarFill.style.backgroundColor = "var(--accent-gold, #ffc107)";
        wafBarFill.style.boxShadow = "0 0 10px rgba(255, 193, 7, 0.6)";
    } else {
        wafBarFill.style.backgroundColor = "var(--primary-red, #e61932)";
        wafBarFill.style.boxShadow = "0 0 12px rgba(230, 25, 50, 0.8)";
    }
}

function showHint() {
    const lvl = levelsData[currentLevelIndex];
    const messages = document.getElementById("chat-messages");
    messages.innerHTML += `
        <div class="message hint-msg">
            <i class="fa-solid fa-lightbulb" style="font-size: 1.2rem; color: #ffc107;"></i>
            <div class="content">💡 <b>تلميح المستوى:</b> ${lvl.hint}</div>
        </div>
    `;
    messages.scrollTop = messages.scrollHeight;
}

function showOwaspInfo() {
    const lvl = levelsData[currentLevelIndex];
    document.getElementById("modal-owasp-title").innerText = lvl.category;
    document.getElementById("modal-owasp-body").innerHTML = lvl.owaspInfo;
    document.getElementById("owasp-modal").style.display = "block";
}

function closeOwaspInfo() {
    document.getElementById("owasp-modal").style.display = "none";
}

function setupChat() {
    const form = document.getElementById("chat-form");
    const input = document.getElementById("user-input");
    const messages = document.getElementById("chat-messages");

    if (!form || !input || !messages) return;

    form.onsubmit = (e) => {
        e.preventDefault();
        if (isTyping) return;

        const text = input.value.trim();
        if (!text) return;

        // 1. حساب وتحريك شريط الـ WAF فكراً وديناميكياً حسب النص المدخل
        if (typeof calculateWafRisk === "function") {
            const riskScore = calculateWafRisk(text);
            updateWafMeter(riskScore);
        } else {
            failedAttempts++;
            updateWafMeter(Math.min(failedAttempts * 20, 100));
        }

        // 2. عرض رسالة المستخدم
        messages.innerHTML += `<div class="message user"><div class="content">${escapeHtml(text)}</div></div>`;
        input.value = "";
        messages.scrollTop = messages.scrollHeight;

        // 3. تقييم الإجابة
        const currentLvl = levelsData[currentLevelIndex];
        const reply = currentLvl.evaluate(text);

        const sysMsgDiv = document.createElement("div");
        sysMsgDiv.className = "message system";
        sysMsgDiv.innerHTML = `<i class="fa-solid fa-dragon"></i><div class="content"></div>`;
        messages.appendChild(sysMsgDiv);
        
        const contentDiv = sysMsgDiv.querySelector(".content");
        typeWriter(contentDiv, reply, () => {
            const flagMatch = reply.match(/FLAG\{([^}]+)\}/);
            if (flagMatch) {
                const extractedFlag = flagMatch[1];
                const isCorrect = GameState.submitFlag(currentLvl.id, extractedFlag);
                
                if (isCorrect) {
                    failedAttempts = 0;
                    updateWafMeter(0);
                    triggerConfetti();
                    messages.innerHTML += `
                        <div class="message system success-msg">
                            <i class="fa-solid fa-circle-check" style="font-size: 1.2rem;"></i>
                            <div class="content">
                                تهانينا! تم استخراج الـ Flag بنجاح وفتح المستوى التالي! 🎉
                            </div>
                        </div>
                    `;
                    renderLevels();
                }
            }
            messages.scrollTop = messages.scrollHeight;
        });
    };
}

function typeWriter(element, text, callback) {
    isTyping = true;
    let i = 0;
    element.innerHTML = "";
    
    function type() {
        if (i < text.length) {
            element.innerHTML += text.charAt(i);
            i++;
            setTimeout(type, 12);
        } else {
            isTyping = false;
            if (callback) callback();
        }
    }
    type();
}

function escapeHtml(str) {
    return str.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
}

function triggerConfetti() {
    const canvas = document.getElementById("confetti-canvas");
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    canvas.width = window.innerWidth;
    canvas.height = window.innerHeight;

    let particles = Array.from({ length: 70 }, () => ({
        x: Math.random() * canvas.width,
        y: -20,
        r: Math.random() * 6 + 4,
        d: Math.random() * 10 + 5,
        color: `hsl(${Math.random() * 360}, 100%, 50%)`,
        tilt: Math.random() * 10 - 10
    }));

    function draw() {
        ctx.clearRect(0, 0, canvas.width, canvas.height);
        particles.forEach((p) => {
            ctx.beginPath();
            ctx.lineWidth = p.r;
            ctx.strokeStyle = p.color;
            ctx.moveTo(p.x + p.tilt + p.r / 2, p.y);
            ctx.lineTo(p.x + p.tilt, p.y + p.tilt + p.r / 2);
            ctx.stroke();

            p.y += p.d * 0.4;
            p.tilt += 0.1;
        });

        particles = particles.filter(p => p.y < canvas.height);
        if (particles.length > 0) {
            requestAnimationFrame(draw);
        }
    }
    draw();
}

function generateCertificate() {
    const existingCert = localStorage.getItem("issued_certificate_data");
    let certData = null;

    if (existingCert) {
        alert("تنبيه: لقد قمت بإصدار شهادتك الأكاديمية سابقاً. سيتم فتح الشهادة المسجلة باسمك ورقمك التسلسلي الخاص.");
        certData = JSON.parse(existingCert);
    } else {
        const name = prompt("أدخل اسمك الكامل كما تحب أن يظهر على الشهادة الأكاديمية:");
        if (!name || !name.trim()) {
            alert("يلزم كتابة الاسم لإصدار الشهادة الأكاديمية.");
            return;
        }

        const randomHex = () => Math.floor((1 + Math.random()) * 0x10000).toString(16).substring(1).toUpperCase();
        const uniqueCertID = `QCAI-2026-${randomHex()}-${randomHex()}`;
        const issueDate = new Date().toLocaleDateString('ar-EG', { year: 'numeric', month: 'long', day: 'numeric' });

        certData = {
            studentName: name.trim(),
            certID: uniqueCertID,
            date: issueDate
        };

        localStorage.setItem("issued_certificate_data", JSON.stringify(certData));
    }

    const certWindow = window.open("", "_blank");
    
    certWindow.document.write(`
        <!DOCTYPE html>
        <html lang="ar" dir="rtl">
        <head>
            <meta charset="UTF-8">
            <title>شهادة إتمام أكاديمية - QCyber AI</title>
            <style>
                @page { size: A4 landscape; margin: 0; }
                * { box-sizing: border-box; }
                body { 
                    background: #f4f5f7; 
                    color: #111111; 
                    font-family: Arial, sans-serif; 
                    display: flex; 
                    flex-direction: column;
                    justify-content: center; 
                    align-items: center; 
                    min-height: 100vh; 
                    margin: 0;
                    padding: 20px;
                    direction: rtl;
                }
                .actions-bar { margin-bottom: 25px; }
                .btn-action {
                    background: #e61932;
                    color: #fff;
                    border: none;
                    padding: 12px 30px;
                    font-size: 1rem;
                    font-weight: bold;
                    border-radius: 6px;
                    cursor: pointer;
                    box-shadow: 0 4px 15px rgba(230, 25, 50, 0.3);
                    transition: 0.3s;
                }
                .btn-action:hover { background: #c01328; }

                .cert-outer {
                    border: 3px solid #c59b27;
                    padding: 6px;
                    border-radius: 12px;
                    background: #ffffff;
                    width: 960px;
                    box-shadow: 0 10px 30px rgba(0,0,0,0.08);
                }
                .cert-inner {
                    border: 1px solid rgba(197, 155, 39, 0.4);
                    padding: 40px 45px;
                    border-radius: 8px;
                    background: #ffffff;
                }
                .header-table { width: 100%; margin-bottom: 15px; }
                .brand-title { 
                    color: #e61932; 
                    font-size: 2.2rem; 
                    font-weight: 900;
                    margin: 0;
                    text-align: right;
                }
                .brand-subtitle {
                    color: #947217;
                    font-size: 0.85rem;
                    margin-top: 3px;
                    text-align: right;
                    font-weight: 700;
                }
                .cert-meta {
                    text-align: left;
                    font-family: monospace;
                    color: #555555;
                    font-size: 0.85rem;
                    direction: ltr;
                }
                .cert-meta span { color: #947217; font-weight: bold; }
                .divider {
                    height: 2px;
                    background: linear-gradient(to left, transparent, #c59b27, #e61932, #c59b27, transparent);
                    margin: 20px 0 30px 0;
                }
                .cert-headline {
                    font-size: 1.9rem;
                    color: #111111;
                    margin-bottom: 10px;
                    font-weight: bold;
                    text-align: center;
                }
                .cert-recipient-text {
                    color: #555555;
                    font-size: 1.1rem;
                    margin-bottom: 10px;
                    text-align: center;
                }
                .name-wrapper { text-align: center; margin: 15px 0 25px 0; }
                .user-name { 
                    color: #947217; 
                    font-size: 2.6rem; 
                    font-weight: bold;
                    border-bottom: 2px solid #e61932;
                    display: inline-block;
                    padding: 0 35px 8px 35px;
                }
                .cert-body { 
                    color: #333333; 
                    line-height: 2; 
                    font-size: 1.05rem; 
                    max-width: 850px;
                    margin: 0 auto 30px auto;
                    text-align: center;
                }
                .footer-table { width: 100%; margin-top: 20px; }
                .footer-table td { vertical-align: bottom; width: 33.33%; }
                .sig-block { text-align: right; }
                .sig-title { color: #666666; font-size: 0.85rem; margin-bottom: 4px; }
                .sig-name {
                    color: #111111;
                    font-size: 1.15rem;
                    font-weight: bold;
                    border-top: 1px solid #c59b27;
                    padding-top: 5px;
                    display: inline-block;
                }
                .sig-role { color: #947217; font-size: 0.8rem; font-weight: bold; }
                .badge-block { text-align: center; }
                .gold-badge {
                    display: inline-block;
                    border: 2px solid #c59b27;
                    padding: 8px 18px;
                    border-radius: 50px;
                    color: #947217;
                    font-size: 0.85rem;
                    font-weight: bold;
                    direction: ltr;
                    background: rgba(197, 155, 39, 0.08);
                }
                .date-block { text-align: left; color: #666666; font-size: 0.85rem; direction: ltr; }
                .date-value { color: #111111; font-weight: bold; }

                @media print {
                    .actions-bar { display: none !important; }
                    body { background: #ffffff !important; -webkit-print-color-adjust: exact; }
                }
            </style>
        </head>
        <body>
            <div class="actions-bar">
                <button class="btn-action" onclick="window.print()">طباعة / حفظ كـ PDF 🖨️</button>
            </div>

            <div class="cert-outer">
                <div class="cert-inner">
                    <table class="header-table">
                        <tr>
                            <td style="text-align: right;">
                                <div class="brand-title">QCYBER AI</div>
                                <div class="brand-subtitle">ACADEMY OF CYBERSECURITY & AI RED TEAMING</div>
                            </td>
                            <td style="text-align: left;">
                                <div class="cert-meta">
                                    SERIAL: <span>${certData.certID}</span><br>
                                    STATUS: <span>VERIFIED / OFFICIAL</span>
                                </div>
                            </td>
                        </tr>
                    </table>

                    <div class="divider"></div>

                    <div class="cert-headline">شهادة إتمام واجتياز أكاديمي</div>
                    <div class="cert-recipient-text">تشهد إدارة المنصة ومختبرات QCyber للذكاء الاصطناعي بأن المهندس/ـة:</div>
                    
                    <div class="name-wrapper">
                        <div class="user-name">${escapeHtml(certData.studentName)}</div>
                    </div>

                    <div class="cert-body">
                        قد أتم بنجاح ومثالية كافة المتطلبات العملية والتطبيقية لبرنامج 
                        "اختراق وتقييم أمان نماذج الذكاء الاصطناعي (AI Red Teaming & LLM Exploitation)"، 
                        واجتاز جميع التحديات الـ 21 المصممة وفق معايير منظمة OWASP Top 10 for LLM، 
                        مما يثبت كفاءته واقتداره العالي في اكتشاف ثغرات نماذج اللغة وتأمينها.
                    </div>

                    <table class="footer-table">
                        <tr>
                            <td class="sig-block">
                                <div class="sig-title">المشرف العام ومدرب الدورة</div>
                                <div class="sig-name">م. قيس أبو شاهين</div>
                                <div class="sig-role">Full-Stack & Cybersecurity Engineer</div>
                            </td>
                            <td class="badge-block">
                                <div class="gold-badge">★ OFFICIAL CERTIFIED RED TEAMER ★</div>
                            </td>
                            <td class="date-block">
                                ISSUE DATE: <span class="date-value">${certData.date}</span><br>
                                AUTH: <span class="date-value">SHA256-VERIFIED</span>
                            </td>
                        </tr>
                    </table>
                </div>
            </div>

            <script>
                window.onload = function() {
                    setTimeout(() => {
                        window.print();
                    }, 500);
                };
            </script>
        </body>
        </html>
    `);
}
