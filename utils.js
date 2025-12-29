/**
 * FUNÇÕES UTILITÁRIAS GLOBAIS
 * ===========================
 * Este arquivo DEVE ser carregado ANTES de todos os outros scripts
 */

// Variável global para projetos
window.allProjects = [];

// Configurações atuais
window.currentSettings = null;

// =====================================================
// FUNÇÕES DE LOADING
// =====================================================

function showLoading() {
    const overlay = document.getElementById('loading-overlay');
    if (overlay) overlay.classList.remove('hidden');
}

function hideLoading() {
    const overlay = document.getElementById('loading-overlay');
    if (overlay) overlay.classList.add('hidden');
}

// =====================================================
// FUNÇÕES DE TOAST (NOTIFICAÇÕES)
// =====================================================

function showToast(message, type = 'info') {
    const toast = document.getElementById('toast');
    if (!toast) {
        console.log(`[${type.toUpperCase()}] ${message}`);
        return;
    }
    
    const icons = {
        success: 'fas fa-check-circle',
        error: 'fas fa-exclamation-circle',
        warning: 'fas fa-exclamation-triangle',
        info: 'fas fa-info-circle'
    };
    
    toast.className = `toast ${type}`;
    const iconEl = toast.querySelector('.toast-icon');
    const msgEl = toast.querySelector('.toast-message');
    if (iconEl) iconEl.className = `toast-icon ${icons[type]}`;
    if (msgEl) msgEl.textContent = message;
    toast.classList.add('show');
    
    setTimeout(() => {
        toast.classList.remove('show');
    }, 4000);
}

// =====================================================
// FUNÇÕES DE MODAL
// =====================================================

function openModal(modal) {
    if (!modal) {
        console.warn('openModal: modal não encontrado');
        return;
    }
    modal.classList.add('active');
    document.body.style.overflow = 'hidden';
}

function closeModal(modal) {
    if (!modal) {
        console.warn('closeModal: modal não encontrado');
        return;
    }
    modal.classList.remove('active');
    document.body.style.overflow = '';
}

// =====================================================
// FUNÇÕES DE DATA
// =====================================================

function parseDate(dateString) {
    if (!dateString || typeof dateString !== 'string') return null;
    
    // Tenta formato dd/mm/yyyy
    const parts = dateString.split('/');
    if (parts.length === 3) {
        return new Date(parts[2], parts[1] - 1, parts[0]);
    }
    
    // Tenta formato yyyy-mm-dd
    const isoDate = new Date(dateString);
    if (!isNaN(isoDate.getTime())) {
        return isoDate;
    }
    
    return null;
}

function formatDateBR(dateString) {
    const date = parseDate(dateString);
    if (!date) return dateString || '-';
    return date.toLocaleDateString('pt-BR');
}

function formatDateISO(dateString) {
    const date = parseDate(dateString);
    if (!date) return '';
    return date.toISOString().split('T')[0];
}

// =====================================================
// EXPORTAR PARA WINDOW (GARANTIR ACESSO GLOBAL)
// =====================================================

window.showLoading = showLoading;
window.hideLoading = hideLoading;
window.showToast = showToast;
window.openModal = openModal;
window.closeModal = closeModal;
window.parseDate = parseDate;
window.formatDateBR = formatDateBR;
window.formatDateISO = formatDateISO;

console.log('✓ Utils carregado com sucesso');
