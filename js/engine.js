// engine.js - محرك التحقق وتقييم الثغرات

// دالة لتشفير النصوص بقيمة SHA-256 للتحقق من الـ Flag بدون كشفه في الكود
async function hashFlag(text) {
    const msgUint8 = new TextEncoder().encode(text.trim().toLowerCase());
    const hashBuffer = await crypto.subtle.digest('SHA-256', msgUint8);
    const hashArray = Array.from(new Uint8Array(hashBuffer));
    return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
}

// كائن إدارة حالة اللعب والتقدم
const GameState = {
    completedLevels: JSON.parse(localStorage.getItem('qcyber_completed') || '[]'),
    
    isUnlocked(levelId) {
        if (levelId === 1) return true;
        return this.completedLevels.includes(levelId - 1);
    },

    async submitFlag(levelId, submittedFlag) {
        const level = levelsData.find(l => l.id === levelId);
        if (!level) return false;

        const hashedInput = await hashFlag(submittedFlag);
        if (hashedInput === level.flagHash) {
            if (!this.completedLevels.includes(levelId)) {
                this.completedLevels.push(levelId);
                localStorage.setItem('qcyber_completed', JSON.stringify(this.completedLevels));
            }
            return true;
        }
        return false;
    }
};