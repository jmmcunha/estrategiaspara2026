// =====================================================
// REVIEW.JS - Revisão Semanal, Aguardando Resposta, Passo Crítico
// =====================================================

(function() {
    'use strict';

    // =====================================================
    // VARIÁVEIS GLOBAIS
    // =====================================================
    
    let currentReviewIndex = 0;
    let projectsToReview = [];
    let reviewChanges = {};
    
    // Elementos DOM
    const weeklyReviewBtn = document.getElementById('weekly-review-btn');
    const weeklyReviewModal = document.getElementById('weekly-review-modal');
    const reviewContent = document.getElementById('review-content');
    const reviewProgressBar = document.getElementById('review-progress-bar');
    const reviewProgressText = document.getElementById('review-progress-text');
    const reviewPrevBtn = document.getElementById('review-prev');
    const reviewNextBtn = document.getElementById('review-next');
    const reviewSkipBtn = document.getElementById('review-skip');
    const reviewFinishBtn = document.getElementById('review-finish');
    
    const waitingPanel = document.getElementById('waiting-panel');
    const waitingPanelOverlay = document.getElementById('waiting-panel-overlay');
    const waitingList = document.getElementById('waiting-list');
    const closeWaitingPanelBtn = document.getElementById('close-waiting-panel');
    const waitingCountEl = document.getElementById('waiting-count');
    const kpiWaitingEl = document.getElementById('kpi-waiting');
    
    // =====================================================
    // INICIALIZAÇÃO
    // =====================================================
    
    document.addEventListener('DOMContentLoaded', function() {
        initReviewSystem();
        initWaitingSystem();
        initCriticalStepSystem();
        initStepAguardandoToggle();
    });
    
    function initReviewSystem() {
        if (!weeklyReviewBtn) return;
        
        weeklyReviewBtn.addEventListener('click', openWeeklyReview);
        
        if (reviewPrevBtn) reviewPrevBtn.addEventListener('click', goToPreviousProject);
        if (reviewNextBtn) reviewNextBtn.addEventListener('click', goToNextProject);
        if (reviewSkipBtn) reviewSkipBtn.addEventListener('click', skipProject);
        if (reviewFinishBtn) reviewFinishBtn.addEventListener('click', finishReview);
        
        // Fechar modal
        const closeBtn = weeklyReviewModal?.querySelector('.modal-close');
        if (closeBtn) {
            closeBtn.addEventListener('click', () => closeModal(weeklyReviewModal));
        }
        
        // Verificar se é segunda-feira e sugerir revisão
        checkWeeklyReviewReminder();
    }
    
    function initWaitingSystem() {
        if (!waitingCountEl) return;
        
        // Clique no KPI abre painel
        waitingCountEl.addEventListener('click', openWaitingPanel);
        
        if (closeWaitingPanelBtn) {
            closeWaitingPanelBtn.addEventListener('click', closeWaitingPanel);
        }
        if (waitingPanelOverlay) {
            waitingPanelOverlay.addEventListener('click', closeWaitingPanel);
        }
    }
    
    function initCriticalStepSystem() {
        // Nada especial a inicializar - o campo já existe no form
    }
    
    function initStepAguardandoToggle() {
        // Mostrar/esconder campo "Aguardando quem?" baseado no status
        document.addEventListener('change', function(e) {
            if (e.target.classList.contains('step-status')) {
                const stepItem = e.target.closest('.next-step-item');
                if (!stepItem) return;
                
                const aguardandoInput = stepItem.querySelector('.step-aguardando');
                if (aguardandoInput) {
                    if (e.target.value === 'aguardando') {
                        aguardandoInput.style.display = 'block';
                        aguardandoInput.focus();
                    } else {
                        aguardandoInput.style.display = 'none';
                        aguardandoInput.value = '';
                    }
                }
            }
        });
    }
    
    // =====================================================
    // REVISÃO SEMANAL
    // =====================================================
    
    function checkWeeklyReviewReminder() {
        const today = new Date();
        const isMonday = today.getDay() === 1;
        const lastReview = localStorage.getItem('lastWeeklyReview');
        const lastReviewDate = lastReview ? new Date(lastReview) : null;
        
        // Se é segunda e não fez revisão esta semana
        if (isMonday) {
            const startOfWeek = new Date(today);
            startOfWeek.setDate(today.getDate() - today.getDay() + 1);
            startOfWeek.setHours(0, 0, 0, 0);
            
            if (!lastReviewDate || lastReviewDate < startOfWeek) {
                setTimeout(() => {
                    if (typeof showToast === 'function') {
                        showToast('📋 Segunda-feira! Que tal fazer sua Revisão Semanal?', 'info', 10000);
                    }
                }, 3000);
            }
        }
    }
    
    function openWeeklyReview() {
        if (!window.allProjects || window.allProjects.length === 0) {
            if (typeof showToast === 'function') {
                showToast('Nenhum projeto para revisar.', 'warning');
            }
            return;
        }
        
        // Filtrar apenas projetos ativos (não concluídos, não suspensos)
        projectsToReview = window.allProjects.filter(p => {
            const status = p.status?.toLowerCase();
            return status !== 'concluído' && status !== 'suspenso';
        });
        
        if (projectsToReview.length === 0) {
            if (typeof showToast === 'function') {
                showToast('Todos os projetos estão concluídos ou suspensos!', 'success');
            }
            return;
        }
        
        currentReviewIndex = 0;
        reviewChanges = {};
        
        openModal(weeklyReviewModal);
        renderCurrentProject();
    }
    
    function renderCurrentProject() {
        const project = projectsToReview[currentReviewIndex];
        if (!project) return;
        
        // Atualizar progresso
        const progress = ((currentReviewIndex + 1) / projectsToReview.length) * 100;
        if (reviewProgressBar) reviewProgressBar.style.width = `${progress}%`;
        if (reviewProgressText) reviewProgressText.textContent = `Projeto ${currentReviewIndex + 1} de ${projectsToReview.length}`;
        
        // Calcular dias desde última atualização
        const lastUpdate = project.updatedAt?.toDate?.() || project.updatedAt || project.createdAt?.toDate?.() || project.createdAt;
        let daysSinceUpdate = '-';
        let updateClass = '';
        if (lastUpdate) {
            const days = Math.floor((new Date() - new Date(lastUpdate)) / (1000 * 60 * 60 * 24));
            daysSinceUpdate = days === 0 ? 'Hoje' : `${days} dias`;
            if (days >= 14) updateClass = 'review-stagnant';
            else if (days >= 7) updateClass = 'review-slow';
        }
        
        // Passos aguardando
        const waitingSteps = (project.proximos_passos || []).filter(s => {
            const step = typeof s === 'object' ? s : { texto: s };
            return step.status === 'aguardando';
        });
        
        // Passo crítico
        const criticalStep = project.passoCritico || '';
        
        // Construir HTML
        reviewContent.innerHTML = `
            <div class="review-project">
                <div class="review-header">
                    <h3>${project.nome || 'Sem nome'}</h3>
                    <div class="review-meta">
                        <span class="status-badge status-${project.status?.toLowerCase().replace(/ /g, '-') || ''}">${project.status || '-'}</span>
                        <span class="review-update ${updateClass}">Última atualização: ${daysSinceUpdate}</span>
                    </div>
                </div>
                
                ${criticalStep ? `
                <div class="review-critical">
                    <label><i class="fas fa-bullseye"></i> Passo Crítico Atual:</label>
                    <p>${criticalStep}</p>
                </div>
                ` : `
                <div class="review-critical review-critical-empty">
                    <label><i class="fas fa-bullseye"></i> Passo Crítico:</label>
                    <p class="empty-text">Nenhum definido. Qual é A coisa que desbloqueia este projeto?</p>
                </div>
                `}
                
                <div class="review-section">
                    <h4><i class="fas fa-tasks"></i> Próximos Passos (${(project.proximos_passos || []).length})</h4>
                    <ul class="review-steps">
                        ${(project.proximos_passos || []).slice(0, 5).map(s => {
                            const step = typeof s === 'object' ? s : { texto: s, status: 'pendente' };
                            const statusIcon = step.status === 'concluido' ? '✅' : 
                                              step.status === 'em_andamento' ? '🔄' : 
                                              step.status === 'aguardando' ? '⏸️' : '⏳';
                            const aguardandoInfo = step.status === 'aguardando' && step.aguardando ? 
                                `<span class="waiting-info">Aguardando: ${step.aguardando}</span>` : '';
                            return `<li>${statusIcon} ${step.texto || s} ${aguardandoInfo}</li>`;
                        }).join('')}
                        ${(project.proximos_passos || []).length > 5 ? `<li class="more-items">... e mais ${project.proximos_passos.length - 5}</li>` : ''}
                    </ul>
                </div>
                
                ${waitingSteps.length > 0 ? `
                <div class="review-section review-waiting-section">
                    <h4><i class="fas fa-clock"></i> Aguardando Resposta (${waitingSteps.length})</h4>
                    <ul class="review-waiting">
                        ${waitingSteps.map(s => {
                            const step = typeof s === 'object' ? s : { texto: s };
                            const waitingDays = step.aguardandoDesde ? 
                                Math.floor((new Date() - new Date(step.aguardandoDesde)) / (1000 * 60 * 60 * 24)) : null;
                            const daysText = waitingDays !== null ? `(${waitingDays} dias)` : '';
                            return `<li>⏸️ ${step.texto} - <strong>${step.aguardando || '?'}</strong> ${daysText}</li>`;
                        }).join('')}
                    </ul>
                </div>
                ` : ''}
                
                <div class="review-questions">
                    <h4><i class="fas fa-question-circle"></i> Perguntas da Revisão</h4>
                    
                    <div class="review-question">
                        <label>Este projeto avançou desde a última revisão?</label>
                        <div class="review-options">
                            <button class="review-option" data-question="advanced" data-value="yes">
                                <i class="fas fa-check"></i> Sim
                            </button>
                            <button class="review-option" data-question="advanced" data-value="no">
                                <i class="fas fa-times"></i> Não
                            </button>
                        </div>
                    </div>
                    
                    <div class="review-question">
                        <label>O passo crítico ainda é o correto?</label>
                        <div class="review-options">
                            <button class="review-option" data-question="critical" data-value="yes">
                                <i class="fas fa-check"></i> Sim
                            </button>
                            <button class="review-option" data-question="critical" data-value="change">
                                <i class="fas fa-edit"></i> Precisa mudar
                            </button>
                        </div>
                        <input type="text" class="review-new-critical" id="new-critical-step" 
                               placeholder="Novo passo crítico..." style="display: none;">
                    </div>
                    
                    <div class="review-question">
                        <label>Alguma cobrança necessária?</label>
                        <div class="review-options">
                            <button class="review-option" data-question="followup" data-value="no">
                                <i class="fas fa-check"></i> Não
                            </button>
                            <button class="review-option" data-question="followup" data-value="yes">
                                <i class="fas fa-paper-plane"></i> Sim, gerar cobrança
                            </button>
                        </div>
                    </div>
                </div>
            </div>
        `;
        
        // Event listeners para opções
        reviewContent.querySelectorAll('.review-option').forEach(btn => {
            btn.addEventListener('click', handleReviewOption);
        });
        
        // Atualizar botões de navegação
        updateNavigationButtons();
    }
    
    function handleReviewOption(e) {
        const btn = e.currentTarget;
        const question = btn.dataset.question;
        const value = btn.dataset.value;
        const project = projectsToReview[currentReviewIndex];
        
        // Desmarcar outras opções da mesma pergunta
        btn.parentElement.querySelectorAll('.review-option').forEach(b => b.classList.remove('selected'));
        btn.classList.add('selected');
        
        // Salvar resposta
        if (!reviewChanges[project.docId]) {
            reviewChanges[project.docId] = {};
        }
        reviewChanges[project.docId][question] = value;
        
        // Mostrar campo de novo passo crítico se necessário
        if (question === 'critical' && value === 'change') {
            const input = document.getElementById('new-critical-step');
            if (input) {
                input.style.display = 'block';
                input.focus();
            }
        } else if (question === 'critical') {
            const input = document.getElementById('new-critical-step');
            if (input) input.style.display = 'none';
        }
        
        // Se escolheu gerar cobrança
        if (question === 'followup' && value === 'yes') {
            generateFollowUpText(project);
        }
    }
    
    function generateFollowUpText(project) {
        const waitingSteps = (project.proximos_passos || []).filter(s => {
            const step = typeof s === 'object' ? s : { texto: s };
            return step.status === 'aguardando' && step.aguardando;
        });
        
        if (waitingSteps.length === 0) {
            showToast('Não há passos aguardando resposta neste projeto.', 'warning');
            return;
        }
        
        // Gerar texto de cobrança
        const step = typeof waitingSteps[0] === 'object' ? waitingSteps[0] : { texto: waitingSteps[0] };
        const waitingDays = step.aguardandoDesde ? 
            Math.floor((new Date() - new Date(step.aguardandoDesde)) / (1000 * 60 * 60 * 24)) : '?';
        
        const followUpText = `Prezado(a) ${step.aguardando || '[Nome]'},

Venho, respeitosamente, reiterar a solicitação referente ao projeto "${project.nome}".

Assunto pendente: ${step.texto}

Esta solicitação encontra-se aguardando resposta há aproximadamente ${waitingDays} dias.

Agradeço a atenção e coloco-me à disposição para quaisquer esclarecimentos.

Atenciosamente,
[Seu nome]`;
        
        // Copiar para clipboard
        navigator.clipboard.writeText(followUpText).then(() => {
            showToast('📋 Texto de cobrança copiado!', 'success');
        }).catch(() => {
            // Fallback - mostrar em alert
            alert('Texto de cobrança:\n\n' + followUpText);
        });
    }
    
    function updateNavigationButtons() {
        if (reviewPrevBtn) {
            reviewPrevBtn.disabled = currentReviewIndex === 0;
        }
        
        const isLast = currentReviewIndex === projectsToReview.length - 1;
        if (reviewNextBtn) reviewNextBtn.style.display = isLast ? 'none' : 'inline-flex';
        if (reviewFinishBtn) reviewFinishBtn.style.display = isLast ? 'inline-flex' : 'none';
    }
    
    function goToPreviousProject() {
        if (currentReviewIndex > 0) {
            saveCurrentProjectChanges();
            currentReviewIndex--;
            renderCurrentProject();
        }
    }
    
    function goToNextProject() {
        if (currentReviewIndex < projectsToReview.length - 1) {
            saveCurrentProjectChanges();
            currentReviewIndex++;
            renderCurrentProject();
        }
    }
    
    function skipProject() {
        goToNextProject();
    }
    
    function saveCurrentProjectChanges() {
        const project = projectsToReview[currentReviewIndex];
        const newCriticalInput = document.getElementById('new-critical-step');
        
        if (newCriticalInput && newCriticalInput.value.trim() && 
            reviewChanges[project.docId]?.critical === 'change') {
            reviewChanges[project.docId].newCriticalStep = newCriticalInput.value.trim();
        }
    }
    
    async function finishReview() {
        saveCurrentProjectChanges();
        
        // Aplicar mudanças nos projetos
        const db = firebase.firestore();
        let updatedCount = 0;
        
        for (const [docId, changes] of Object.entries(reviewChanges)) {
            if (changes.newCriticalStep) {
                try {
                    await db.collection('projects').doc(docId).update({
                        passoCritico: changes.newCriticalStep,
                        updatedAt: firebase.firestore.FieldValue.serverTimestamp()
                    });
                    updatedCount++;
                } catch (error) {
                    console.error('Erro ao atualizar projeto:', error);
                }
            }
        }
        
        // Salvar data da revisão
        localStorage.setItem('lastWeeklyReview', new Date().toISOString());
        
        closeModal(weeklyReviewModal);
        
        if (updatedCount > 0) {
            showToast(`✅ Revisão concluída! ${updatedCount} projeto(s) atualizado(s).`, 'success');
        } else {
            showToast('✅ Revisão semanal concluída!', 'success');
        }
    }
    
    // =====================================================
    // AGUARDANDO RESPOSTA
    // =====================================================
    
    function openWaitingPanel() {
        if (!waitingPanel) return;
        
        renderWaitingList();
        waitingPanel.classList.add('active');
        waitingPanelOverlay.classList.add('active');
    }
    
    function closeWaitingPanel() {
        if (!waitingPanel) return;
        waitingPanel.classList.remove('active');
        waitingPanelOverlay.classList.remove('active');
    }
    
    function renderWaitingList() {
        if (!waitingList || !window.allProjects) return;
        
        const waitingItems = [];
        
        window.allProjects.forEach(project => {
            (project.proximos_passos || []).forEach((s, index) => {
                const step = typeof s === 'object' ? s : { texto: s, status: 'pendente' };
                if (step.status === 'aguardando') {
                    const waitingDays = step.aguardandoDesde ? 
                        Math.floor((new Date() - new Date(step.aguardandoDesde)) / (1000 * 60 * 60 * 24)) : null;
                    
                    waitingItems.push({
                        projectName: project.nome,
                        projectDocId: project.docId,
                        stepIndex: index,
                        step: step,
                        days: waitingDays
                    });
                }
            });
        });
        
        // Ordenar por dias (mais antigos primeiro)
        waitingItems.sort((a, b) => (b.days || 0) - (a.days || 0));
        
        if (waitingItems.length === 0) {
            waitingList.innerHTML = `
                <div class="empty-state">
                    <i class="fas fa-check-circle"></i>
                    <p>Nenhuma pendência aguardando resposta!</p>
                </div>
            `;
            return;
        }
        
        waitingList.innerHTML = waitingItems.map(item => {
            let urgencyClass = '';
            let urgencyIcon = '🕐';
            if (item.days >= 21) {
                urgencyClass = 'waiting-critical';
                urgencyIcon = '🔴';
            } else if (item.days >= 14) {
                urgencyClass = 'waiting-urgent';
                urgencyIcon = '🟠';
            } else if (item.days >= 7) {
                urgencyClass = 'waiting-warning';
                urgencyIcon = '🟡';
            }
            
            const daysText = item.days !== null ? `${item.days} dias` : 'Data não registrada';
            
            return `
                <div class="waiting-item ${urgencyClass}">
                    <div class="waiting-item-header">
                        <span class="waiting-project">${item.projectName}</span>
                        <span class="waiting-days">${urgencyIcon} ${daysText}</span>
                    </div>
                    <p class="waiting-step">${item.step.texto}</p>
                    <div class="waiting-from">
                        <strong>Aguardando:</strong> ${item.step.aguardando || 'Não especificado'}
                    </div>
                    <div class="waiting-actions">
                        <button class="btn-small btn-copy-followup" 
                                data-project="${item.projectName}" 
                                data-step="${item.step.texto}"
                                data-aguardando="${item.step.aguardando || ''}"
                                data-days="${item.days || '?'}">
                            <i class="fas fa-copy"></i> Copiar Cobrança
                        </button>
                    </div>
                </div>
            `;
        }).join('');
        
        // Event listeners para botões de cobrança
        waitingList.querySelectorAll('.btn-copy-followup').forEach(btn => {
            btn.addEventListener('click', function() {
                const projectName = this.dataset.project;
                const stepText = this.dataset.step;
                const aguardando = this.dataset.aguardando;
                const days = this.dataset.days;
                
                const text = `Prezado(a) ${aguardando || '[Nome]'},

Venho, respeitosamente, reiterar a solicitação referente ao projeto "${projectName}".

Assunto pendente: ${stepText}

Esta solicitação encontra-se aguardando resposta há aproximadamente ${days} dias.

Agradeço a atenção e coloco-me à disposição para quaisquer esclarecimentos.

Atenciosamente,
[Seu nome]`;
                
                navigator.clipboard.writeText(text).then(() => {
                    showToast('📋 Texto de cobrança copiado!', 'success');
                }).catch(() => {
                    alert('Texto de cobrança:\n\n' + text);
                });
            });
        });
    }
    
    // =====================================================
    // ATUALIZAR DASHBOARD
    // =====================================================
    
    // Extender a função de update do dashboard
    const originalUpdateDashboard = window.updateDashboardExtended || function() {};
    
    window.updateDashboardExtended = function(projects) {
        originalUpdateDashboard(projects);
        updateWaitingCount(projects);
    };
    
    function updateWaitingCount(projects) {
        if (!waitingCountEl || !projects) return;
        
        let waitingCount = 0;
        let oldestWaiting = 0;
        
        projects.forEach(project => {
            (project.proximos_passos || []).forEach(s => {
                const step = typeof s === 'object' ? s : { texto: s, status: 'pendente' };
                if (step.status === 'aguardando') {
                    waitingCount++;
                    if (step.aguardandoDesde) {
                        const days = Math.floor((new Date() - new Date(step.aguardandoDesde)) / (1000 * 60 * 60 * 24));
                        if (days > oldestWaiting) oldestWaiting = days;
                    }
                }
            });
        });
        
        waitingCountEl.textContent = waitingCount;
        
        if (kpiWaitingEl) {
            if (waitingCount > 0) {
                kpiWaitingEl.classList.add('has-waiting');
                if (oldestWaiting >= 14) {
                    kpiWaitingEl.classList.add('waiting-urgent');
                } else {
                    kpiWaitingEl.classList.remove('waiting-urgent');
                }
            } else {
                kpiWaitingEl.classList.remove('has-waiting', 'waiting-urgent');
            }
        }
    }
    
    // =====================================================
    // HELPERS
    // =====================================================
    
    function openModal(modal) {
        if (modal) modal.classList.add('active');
    }
    
    function closeModal(modal) {
        if (modal) modal.classList.remove('active');
    }
    
    // Expor funções globalmente
    window.updateWaitingCount = updateWaitingCount;
    window.openWaitingPanel = openWaitingPanel;
    
})();
