// engine.js - محرك التحكم وتشفير البيانات المستمرة

const GameState = {
    // تشفير وسك البيانات في localstorage لمنع القراءة المباشرة
    getCompletedLevels() {
        try {
            const raw = localStorage.getItem('qcyber_enc_prog');
            if (!raw) return [];
            return JSON.parse(atob(raw));
        } catch(e) {
            return [];
        }
    },

    isUnlocked(levelId) {
        if (levelId === 1) return true;
        const completed = this.getCompletedLevels();
        return completed.includes(levelId - 1);
    },

    submitFlag(levelId, submittedFlag) {
        const level = levelsData.find(l => l.id === levelId);
        if (!level) return false;

        const cleanInput = submittedFlag.trim().toLowerCase();
        const expectedFlag = level.rawFlag.trim().toLowerCase();

        if (cleanInput === expectedFlag) {
            let completed = this.getCompletedLevels();
            if (!completed.includes(levelId)) {
                completed.push(levelId);
                localStorage.setItem('qcyber_enc_prog', btoa(JSON.stringify(completed)));
            }
            return true;
        }
        return false;
    },

    resetProgress() {
        localStorage.removeItem('qcyber_enc_prog');
    }
};
