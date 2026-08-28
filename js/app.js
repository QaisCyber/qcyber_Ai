// app.js - إدارة واجهة المستخدم والتفاعل والتحقق الآلي من الـ Flags

let currentLevelIndex = 0;

document.addEventListener("DOMContentLoaded", () => {
    renderLevels();
    setupChat();
});

// 1. بناء وقائمة المستويات وتحديث حالة القفل/النجاح
function renderLevels() {
    const list = document.getElementById("levels-list");
    if (!list) return;
    
    list.innerHTML = "";
    let completedCount = 0;

    levelsData.forEach((lvl, idx) => {
        const isUnlocked = GameState.isUnlocked(lvl.id);
        const isCompleted = GameState.completedLevels.includes(lvl.id);
        if (isCompleted) completedCount++;

        const li = document.createElement("li");
        li.className = `${idx === currentLevelIndex ? "active" : ""} ${!isUnlocked ? "locked" : ""}`;
        
        // أوان وأيقونات الحالة
        let iconClass = 'fa-lock';
        if (isCompleted) {
            iconClass = 'fa-circle-check';
        } else if (isUnlocked) {
            iconClass = 'fa-lock-open';
        }

        li.innerHTML = `
            <div>
                <strong>${lvl.title}</strong>
                <small style="display:block; color: var(--text-muted); font-size:0.75rem;">${lvl.category}</small>
            </div>
            <i class="fa-solid ${iconClass}" style="${isCompleted ? 'color: #28a745;' : ''}"></i>
        `;

        // إمكانية النقل للمستوى فقط إذا كان مفتوحاً
        if (isUnlocked) {
            li.onclick = () => selectLevel(idx);
        }
        list.appendChild(li);
    });

    const countElem = document.getElementById("completed-count");
    if (countElem) countElem.innerText = completedCount;
}

// 2. اختيار وتحديد المستوى الحالي
function selectLevel(index) {
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
}

// 3. إدارة نظام الشات والتحقق الآلي عند إخراج الـ Flag
function setupChat() {
    const form = document.getElementById("chat-form");
    const input = document.getElementById("user-input");
    const messages = document.getElementById("chat-messages");

    if (!form || !input || !messages) return;

    form.onsubmit = async (e) => {
        e.preventDefault();
        const text = input.value.trim();
        if (!text) return;

        // طباعة رسالة المستخدم في الشات
        messages.innerHTML += `<div class="message user"><div class="content">${escapeHtml(text)}</div></div>`;
        input.value = "";
        messages.scrollTop = messages.scrollHeight;

        // محاكاة معالجة QCyber AI
        setTimeout(async () => {
            const currentLvl = levelsData[currentLevelIndex];
            const reply = currentLvl.evaluate(text);
            
            // طباعة رد النموذج
            messages.innerHTML += `
                <div class="message system">
                    <i class="fa-solid fa-dragon"></i>
                    <div class="content">${reply}</div>
                </div>
            `;
            
            // فحص رد النموذج: هل نجح المستخدم في استخراج صيغة FLAG{...} ؟
            const flagMatch = reply.match(/FLAG\{([^}]+)\}/);
            if (flagMatch) {
                const extractedFlag = flagMatch[1];
                const isCorrect = await GameState.submitFlag(currentLvl.id, extractedFlag);
                
                if (isCorrect) {
                    // إظهار رسالة النجاح في الشات وفتح المستوى التالي
                    setTimeout(() => {
                        messages.innerHTML += `
                            <div class="message system success-msg" style="border: 1px solid #28a745; background: rgba(40, 167, 69, 0.15); border-radius: 8px; padding: 12px 15px; margin-top: 5px;">
                                <i class="fa-solid fa-circle-check" style="color: #28a745; font-size: 1.2rem;"></i>
                                <div class="content" style="color: #28a745; font-weight: bold; background: transparent; border: none; padding: 0;">
                                    تهانينا! تم استخراج الـ Flag وتجاوز المستوى ${currentLvl.id} بنجاح! 🎉
                                </div>
                            </div>
                        `;
                        messages.scrollTop = messages.scrollHeight;
                        
                        // إعادة بناء القائمة لفتح المستوى القادم
                        renderLevels();
                    }, 500);
                }
            }

            messages.scrollTop = messages.scrollHeight;
        }, 400);
    };
}

// دالة حماية لتجنب ثغرات XSS داخل شاشة الشات
function escapeHtml(str) {
    return str
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;")
        .replace(/"/g, "&quot;")
        .replace(/'/g, "&#039;");
}