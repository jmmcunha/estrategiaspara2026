/**
 * PAINEL EXECUTIVO - APLICAÇÃO PRINCIPAL
 * ======================================
 * Gerenciamento de projetos com Firebase
 */

// =====================================================
// FUNÇÕES GLOBAIS (disponíveis para todos os arquivos)
// =====================================================

function showLoading() {
    const overlay = document.getElementById('loading-overlay');
    if (overlay) overlay.classList.remove('hidden');
}

function hideLoading() {
    const overlay = document.getElementById('loading-overlay');
    if (overlay) overlay.classList.add('hidden');
}

function showToast(message, type = 'info') {
    const toast = document.getElementById('toast');
    if (!toast) return;
    
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

function openModal(modal) {
    if (!modal) return;
    modal.classList.add('active');
    document.body.style.overflow = 'hidden';
}

function closeModal(modal) {
    if (!modal) return;
    modal.classList.remove('active');
    document.body.style.overflow = '';
}

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

// Variável global para projetos
window.allProjects = [];

// =====================================================
// INICIALIZAÇÃO DO APP
// =====================================================

document.addEventListener('DOMContentLoaded', () => {
    // =====================================================
    // ELEMENTOS DO DOM
    // =====================================================
    
    // Login
    const loginScreen = document.getElementById('login-screen');
    const loginForm = document.getElementById('login-form');
    const loginError = document.getElementById('login-error');
    const emailInput = document.getElementById('email');
    const passwordInput = document.getElementById('password');
    
    // Recuperação de senha
    const forgotPasswordBtn = document.getElementById('forgot-password-btn');
    const forgotModal = document.getElementById('forgot-modal');
    const forgotForm = document.getElementById('forgot-form');
    const forgotMessage = document.getElementById('forgot-message');
    
    // App Container
    const appContainer = document.getElementById('app-container');
    const userEmailEl = document.getElementById('user-email');
    const logoutBtn = document.getElementById('logout-btn');
    
    // Dashboard
    const totalProjectsEl = document.getElementById('total-projects');
    const ongoingProjectsEl = document.getElementById('ongoing-projects');
    const completedProjectsEl = document.getElementById('completed-projects');
    const plannedProjectsEl = document.getElementById('planned-projects');
    const avgProgressBar = document.getElementById('avg-progress-bar');
    const avgProgressText = document.getElementById('avg-progress-text');
    const overdueDeadlinesEl = document.getElementById('overdue-deadlines');
    const upcomingDeadlinesEl = document.getElementById('upcoming-deadlines');
    const statusChartCanvas = document.getElementById('status-chart');
    
    // Tabela e Filtros
    const projectsTableBody = document.getElementById('projects-table-body');
    const statusFilter = document.getElementById('status-filter');
    
    // Projeto Modal
    const addProjectBtn = document.getElementById('add-project-btn');
    const projectModal = document.getElementById('project-modal');
    const projectForm = document.getElementById('project-form');
    const modalTitle = document.getElementById('modal-title');
    const projectIdInput = document.getElementById('project-id');
    
    // Detalhes Modal
    const projectDetailsModal = document.getElementById('project-details-modal');
    const detailsTitle = document.getElementById('details-title');
    const projectDetailsContent = document.getElementById('project-details-content');
    
    // Delete Modal
    const deleteModal = document.getElementById('delete-modal');
    const deleteProjectName = document.getElementById('delete-project-name');
    const confirmDeleteBtn = document.getElementById('confirm-delete-btn');
    
    // Comentários
    const commentInput = document.getElementById('comment-input');
    const addCommentBtn = document.getElementById('add-comment-btn');
    const commentsList = document.getElementById('comments-list');
    
    // Loading e Toast
    const loadingOverlay = document.getElementById('loading-overlay');
    const toast = document.getElementById('toast');
    
    // Próximos passos e metas
    const nextStepsContainer = document.getElementById('next-steps-container');
    const addStepBtn = document.getElementById('add-step-btn');
    const goalsContainer = document.getElementById('goals-container');
    const addGoalBtn = document.getElementById('add-goal-btn');
    
    // =====================================================
    // ESTADO DA APLICAÇÃO
    // =====================================================
    
    let currentUser = null;
    let allProjects = [];
    let statusChart = null;
    let projectToDelete = null;
    let unsubscribeProjects = null;
    let unsubscribeComments = null;
    
    // Referências aos elementos de loading e toast
    const loadingOverlay = document.getElementById('loading-overlay');
    const toast = document.getElementById('toast');
    
    // =====================================================
    // AUTENTICAÇÃO
    // =====================================================
    
    // Observador de estado de autenticação
    auth.onAuthStateChanged((user) => {
        hideLoading();
        
        if (user) {
            currentUser = user;
            userEmailEl.textContent = user.email;
            loginScreen.classList.add('hidden');
            appContainer.classList.remove('hidden');
            
            // Iniciar listeners do Firestore
            startFirestoreListeners();
            
            // Carregar configurações personalizadas
            if (typeof loadSettings === 'function') {
                loadSettings();
            }
            
            // Iniciar listener de lembretes
            if (typeof startRemindersListener === 'function') {
                startRemindersListener();
            }
        } else {
            currentUser = null;
            loginScreen.classList.remove('hidden');
            appContainer.classList.add('hidden');
            
            // Limpar listeners
            if (unsubscribeProjects) unsubscribeProjects();
            if (unsubscribeComments) unsubscribeComments();
        }
    });
    
    // Login
    loginForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        loginError.textContent = '';
        showLoading();
        
        try {
            await auth.signInWithEmailAndPassword(
                emailInput.value.trim(),
                passwordInput.value
            );
            showToast('Login realizado com sucesso!', 'success');
        } catch (error) {
            hideLoading();
            const messages = {
                'auth/user-not-found': 'Usuário não encontrado.',
                'auth/wrong-password': 'Senha incorreta.',
                'auth/invalid-email': 'E-mail inválido.',
                'auth/too-many-requests': 'Muitas tentativas. Tente novamente mais tarde.',
                'auth/invalid-credential': 'Credenciais inválidas.'
            };
            loginError.textContent = messages[error.code] || 'Erro ao fazer login.';
        }
    });
    
    // Recuperação de senha
    forgotPasswordBtn.addEventListener('click', () => {
        openModal(forgotModal);
    });
    
    forgotForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        forgotMessage.textContent = '';
        forgotMessage.style.color = '';
        
        const email = document.getElementById('forgot-email').value.trim();
        
        try {
            await auth.sendPasswordResetEmail(email);
            forgotMessage.style.color = 'var(--success)';
            forgotMessage.textContent = 'E-mail de recuperação enviado!';
        } catch (error) {
            forgotMessage.textContent = 'Erro ao enviar e-mail de recuperação.';
        }
    });
    
    // Logout
    logoutBtn.addEventListener('click', async () => {
        try {
            await auth.signOut();
            showToast('Logout realizado.', 'info');
        } catch (error) {
            showToast('Erro ao fazer logout.', 'error');
        }
    });
    
    // =====================================================
    // FIRESTORE - PROJETOS
    // =====================================================
    
    function startFirestoreListeners() {
        // Listener de projetos
        unsubscribeProjects = db.collection('projects')
            .orderBy('id', 'asc')
            .onSnapshot((snapshot) => {
                allProjects = [];
                snapshot.forEach((doc) => {
                    allProjects.push({ docId: doc.id, ...doc.data() });
                });
                // Sincronizar com variável global
                window.allProjects = allProjects;
                displayProjects(allProjects);
                updateDashboard(allProjects);
            }, (error) => {
                console.error('Erro ao carregar projetos:', error);
                showToast('Erro ao carregar projetos.', 'error');
            });
        
        // Listener de comentários
        unsubscribeComments = db.collection('comments')
            .orderBy('createdAt', 'desc')
            .onSnapshot((snapshot) => {
                displayComments(snapshot);
            });
    }
    
    // Exibir projetos na tabela
    function displayProjects(projects) {
        const filterValue = statusFilter.value.toLowerCase();
        
        let filtered = projects;
        if (filterValue !== 'todos') {
            filtered = projects.filter(p => 
                p.status && p.status.toLowerCase() === filterValue
            );
        }
        
        projectsTableBody.innerHTML = '';
        
        if (filtered.length === 0) {
            projectsTableBody.innerHTML = `
                <tr>
                    <td colspan="8" style="text-align: center; padding: 2rem;">
                        <i class="fas fa-folder-open" style="font-size: 2rem; color: var(--text-muted); margin-bottom: 0.5rem; display: block;"></i>
                        Nenhum projeto encontrado.
                    </td>
                </tr>
            `;
            return;
        }
        
        filtered.forEach((project) => {
            const row = document.createElement('tr');
            
            const deadlineDate = parseDate(project.prazo);
            const today = new Date();
            today.setHours(0, 0, 0, 0);
            
            let prazoClass = '';
            if (deadlineDate && deadlineDate < today && 
                project.status && project.status.toLowerCase() !== 'concluído') {
                prazoClass = 'overdue';
            }
            
            const nextSteps = project.proximos_passos || [];
            const nextStepsHTML = nextSteps.length > 0 
                ? nextSteps.slice(0, 2).map(step => `<li>${step}</li>`).join('')
                : '<li style="color: var(--text-muted);">-</li>';
            
            const statusClass = project.status 
                ? project.status.toLowerCase().replace(/ /g, '-').normalize('NFD').replace(/[\u0300-\u036f]/g, '')
                : '';
            
            // Renderizar badge de anexos
            const arquivos = project.arquivos || [];
            const attachmentsBadge = typeof renderAttachmentsBadge === 'function' 
                ? renderAttachmentsBadge(arquivos)
                : (arquivos.length > 0 ? `<span class="attachments-badge"><i class="fas fa-paperclip"></i> ${arquivos.length}</span>` : '-');
            
            row.innerHTML = `
                <td>${project.id || '-'}</td>
                <td class="project-name">
                    <a href="#" class="view-project" data-id="${project.docId}">${project.nome || 'Sem nome'}</a>
                </td>
                <td class="next-steps"><ul>${nextStepsHTML}</ul></td>
                <td>
                    <span class="status-badge status-${statusClass}">
                        ${project.status || '-'}
                    </span>
                </td>
                <td class="progress-cell">
                    <div class="progress-bar-background">
                        <div class="progress-bar-foreground" style="width: ${project.progresso || 0}%;"></div>
                    </div>
                    <span>${project.progresso || 0}%</span>
                </td>
                <td class="${prazoClass}">${formatDateBR(project.prazo)}</td>
                <td>${attachmentsBadge}</td>
                <td class="actions-cell">
                    <button class="btn-icon btn-view view-project" data-id="${project.docId}" title="Ver detalhes">
                        <i class="fas fa-eye"></i>
                    </button>
                    <button class="btn-icon btn-edit edit-project" data-id="${project.docId}" title="Editar">
                        <i class="fas fa-edit"></i>
                    </button>
                    <button class="btn-icon btn-delete delete-project" data-id="${project.docId}" data-name="${project.nome}" title="Excluir">
                        <i class="fas fa-trash"></i>
                    </button>
                </td>
            `;
            
            projectsTableBody.appendChild(row);
        });
    }
    
    // Atualizar dashboard
    function updateDashboard(projects) {
        const total = projects.length;
        const ongoing = projects.filter(p => p.status && p.status.toLowerCase() === 'em andamento').length;
        const completed = projects.filter(p => p.status && p.status.toLowerCase() === 'concluído').length;
        const planned = projects.filter(p => p.status && p.status.toLowerCase() === 'planejado').length;
        const notStarted = projects.filter(p => p.status && p.status.toLowerCase() === 'não iniciado').length;
        const suspended = projects.filter(p => p.status && p.status.toLowerCase() === 'suspenso').length;
        
        totalProjectsEl.textContent = total;
        ongoingProjectsEl.textContent = ongoing;
        completedProjectsEl.textContent = completed;
        plannedProjectsEl.textContent = planned;
        
        // Progresso médio
        const totalProgress = projects.reduce((sum, p) => sum + (p.progresso || 0), 0);
        const avgProgress = total > 0 ? Math.round(totalProgress / total) : 0;
        avgProgressBar.style.width = `${avgProgress}%`;
        avgProgressText.textContent = `${avgProgress}%`;
        
        // Prazos
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        const nextWeek = new Date();
        nextWeek.setDate(today.getDate() + 7);
        
        const overdue = projects.filter(p => {
            const deadline = parseDate(p.prazo);
            return deadline && deadline < today && 
                   p.status && p.status.toLowerCase() !== 'concluído';
        }).length;
        
        const upcoming = projects.filter(p => {
            const deadline = parseDate(p.prazo);
            return deadline && deadline >= today && deadline <= nextWeek;
        }).length;
        
        overdueDeadlinesEl.textContent = overdue;
        upcomingDeadlinesEl.textContent = upcoming;
        
        // Gráfico
        updateChart({
            'Em Andamento': ongoing,
            'Concluído': completed,
            'Planejado': planned,
            'Não Iniciado': notStarted,
            'Suspenso': suspended
        });
    }
    
    // Atualizar gráfico
    function updateChart(statusCounts) {
        const chartData = {
            labels: Object.keys(statusCounts),
            datasets: [{
                data: Object.values(statusCounts),
                backgroundColor: [
                    '#58a6ff',
                    '#3fb950',
                    '#d29922',
                    '#6e7681',
                    '#f85149'
                ],
                borderColor: '#161b22',
                borderWidth: 2
            }]
        };
        
        if (statusChart) {
            statusChart.destroy();
        }
        
        statusChart = new Chart(statusChartCanvas, {
            type: 'doughnut',
            data: chartData,
            options: {
                responsive: true,
                maintainAspectRatio: false,
                plugins: {
                    legend: {
                        position: 'bottom',
                        labels: {
                            color: '#e6edf3',
                            font: { family: "'DM Sans', sans-serif", size: 11 },
                            padding: 10,
                            usePointStyle: true
                        }
                    }
                },
                cutout: '65%'
            }
        });
    }
    
    // Filtro de status
    statusFilter.addEventListener('change', () => {
        displayProjects(allProjects);
    });
    
    // =====================================================
    // CRUD DE PROJETOS
    // =====================================================
    
    // Abrir modal para novo projeto
    addProjectBtn.addEventListener('click', () => {
        resetProjectForm();
        modalTitle.textContent = 'Novo Projeto';
        
        // Sugerir próximo ID
        const maxId = allProjects.reduce((max, p) => Math.max(max, p.id || 0), 0);
        document.getElementById('project-id').value = '';
        
        openModal(projectModal);
    });
    
    // Reset do formulário
    function resetProjectForm() {
        projectForm.reset();
        projectIdInput.value = '';
        
        nextStepsContainer.innerHTML = `
            <div class="next-step-item">
                <input type="text" class="next-step-input" placeholder="Descreva o próximo passo">
                <button type="button" class="btn-remove-step"><i class="fas fa-times"></i></button>
            </div>
        `;
        
        goalsContainer.innerHTML = `
            <div class="goal-item">
                <input type="text" class="goal-input" placeholder="Descreva uma meta">
                <button type="button" class="btn-remove-goal"><i class="fas fa-times"></i></button>
            </div>
        `;
    }
    
    // Adicionar campo de próximo passo
    addStepBtn.addEventListener('click', () => {
        const item = document.createElement('div');
        item.className = 'next-step-item';
        item.innerHTML = `
            <input type="text" class="next-step-input" placeholder="Descreva o próximo passo">
            <button type="button" class="btn-remove-step"><i class="fas fa-times"></i></button>
        `;
        nextStepsContainer.appendChild(item);
    });
    
    // Remover campo de próximo passo
    nextStepsContainer.addEventListener('click', (e) => {
        if (e.target.closest('.btn-remove-step')) {
            const items = nextStepsContainer.querySelectorAll('.next-step-item');
            if (items.length > 1) {
                e.target.closest('.next-step-item').remove();
            }
        }
    });
    
    // Adicionar campo de meta
    addGoalBtn.addEventListener('click', () => {
        const item = document.createElement('div');
        item.className = 'goal-item';
        item.innerHTML = `
            <input type="text" class="goal-input" placeholder="Descreva uma meta">
            <button type="button" class="btn-remove-goal"><i class="fas fa-times"></i></button>
        `;
        goalsContainer.appendChild(item);
    });
    
    // Remover campo de meta
    goalsContainer.addEventListener('click', (e) => {
        if (e.target.closest('.btn-remove-goal')) {
            const items = goalsContainer.querySelectorAll('.goal-item');
            if (items.length > 1) {
                e.target.closest('.goal-item').remove();
            }
        }
    });
    
    // Salvar projeto
    projectForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        showLoading();
        
        // Coletar próximos passos
        const nextSteps = [];
        document.querySelectorAll('.next-step-input').forEach(input => {
            if (input.value.trim()) nextSteps.push(input.value.trim());
        });
        
        // Coletar metas
        const goals = [];
        document.querySelectorAll('.goal-input').forEach(input => {
            if (input.value.trim()) goals.push(input.value.trim());
        });
        
        // Formatar prazo
        const deadlineInput = document.getElementById('project-deadline').value;
        let prazo = '';
        if (deadlineInput) {
            const date = new Date(deadlineInput + 'T00:00:00');
            prazo = date.toLocaleDateString('pt-BR');
        }
        
        const projectData = {
            nome: document.getElementById('project-name').value.trim(),
            status: document.getElementById('project-status').value,
            progresso: parseInt(document.getElementById('project-progress').value) || 0,
            prazo: prazo,
            descricao: document.getElementById('project-description').value.trim(),
            objetivo: document.getElementById('project-objective').value.trim(),
            responsavel: document.getElementById('project-responsible').value.trim(),
            proximos_passos: nextSteps,
            metas: goals,
            swot: {
                forcas: document.getElementById('swot-strengths').value.trim(),
                fraquezas: document.getElementById('swot-weaknesses').value.trim(),
                oportunidades: document.getElementById('swot-opportunities').value.trim(),
                ameacas: document.getElementById('swot-threats').value.trim()
            },
            updatedAt: firebase.firestore.FieldValue.serverTimestamp()
        };
        
        try {
            const docId = projectIdInput.value;
            let projectDocId = docId;
            
            if (docId) {
                // Atualizar existente
                await db.collection('projects').doc(docId).update(projectData);
                showToast('Projeto atualizado com sucesso!', 'success');
            } else {
                // Criar novo
                const maxId = allProjects.reduce((max, p) => Math.max(max, p.id || 0), 0);
                projectData.id = maxId + 1;
                projectData.createdAt = firebase.firestore.FieldValue.serverTimestamp();
                projectData.arquivos = [];
                
                const docRef = await db.collection('projects').add(projectData);
                projectDocId = docRef.id;
                showToast('Projeto criado com sucesso!', 'success');
            }
            
            // Processar arquivos anexos (se a função existir)
            if (typeof processProjectFiles === 'function' && projectDocId) {
                const files = await processProjectFiles(projectDocId);
                if (files && files.length > 0) {
                    await db.collection('projects').doc(projectDocId).update({
                        arquivos: files
                    });
                }
            }
            
            closeModal(projectModal);
            resetProjectForm();
            
            // Limpar seleção de arquivos
            if (typeof clearFileSelection === 'function') {
                clearFileSelection();
            }
        } catch (error) {
            console.error('Erro ao salvar projeto:', error);
            showToast('Erro ao salvar projeto.', 'error');
        } finally {
            hideLoading();
        }
    });
    
    // Editar projeto
    projectsTableBody.addEventListener('click', (e) => {
        // Ver detalhes
        if (e.target.closest('.view-project')) {
            e.preventDefault();
            const docId = e.target.closest('.view-project').dataset.id;
            showProjectDetails(docId);
        }
        
        // Editar
        if (e.target.closest('.edit-project')) {
            const docId = e.target.closest('.edit-project').dataset.id;
            editProject(docId);
        }
        
        // Excluir
        if (e.target.closest('.delete-project')) {
            const btn = e.target.closest('.delete-project');
            projectToDelete = btn.dataset.id;
            deleteProjectName.textContent = btn.dataset.name;
            openModal(deleteModal);
        }
    });
    
    // Carregar dados para edição
    function editProject(docId) {
        const project = allProjects.find(p => p.docId === docId);
        if (!project) return;
        
        modalTitle.textContent = 'Editar Projeto';
        projectIdInput.value = docId;
        
        document.getElementById('project-name').value = project.nome || '';
        document.getElementById('project-status').value = project.status || 'Não iniciado';
        document.getElementById('project-progress').value = project.progresso || 0;
        document.getElementById('project-deadline').value = formatDateISO(project.prazo);
        document.getElementById('project-description').value = project.descricao || '';
        document.getElementById('project-objective').value = project.objetivo || '';
        document.getElementById('project-responsible').value = project.responsavel || '';
        
        // SWOT
        const swot = project.swot || {};
        document.getElementById('swot-strengths').value = swot.forcas || '';
        document.getElementById('swot-weaknesses').value = swot.fraquezas || '';
        document.getElementById('swot-opportunities').value = swot.oportunidades || '';
        document.getElementById('swot-threats').value = swot.ameacas || '';
        
        // Próximos passos
        const steps = project.proximos_passos || [];
        nextStepsContainer.innerHTML = '';
        if (steps.length === 0) {
            nextStepsContainer.innerHTML = `
                <div class="next-step-item">
                    <input type="text" class="next-step-input" placeholder="Descreva o próximo passo">
                    <button type="button" class="btn-remove-step"><i class="fas fa-times"></i></button>
                </div>
            `;
        } else {
            steps.forEach(step => {
                const item = document.createElement('div');
                item.className = 'next-step-item';
                item.innerHTML = `
                    <input type="text" class="next-step-input" value="${step}" placeholder="Descreva o próximo passo">
                    <button type="button" class="btn-remove-step"><i class="fas fa-times"></i></button>
                `;
                nextStepsContainer.appendChild(item);
            });
        }
        
        // Metas
        const goals = project.metas || [];
        goalsContainer.innerHTML = '';
        if (goals.length === 0) {
            goalsContainer.innerHTML = `
                <div class="goal-item">
                    <input type="text" class="goal-input" placeholder="Descreva uma meta">
                    <button type="button" class="btn-remove-goal"><i class="fas fa-times"></i></button>
                </div>
            `;
        } else {
            goals.forEach(goal => {
                const item = document.createElement('div');
                item.className = 'goal-item';
                item.innerHTML = `
                    <input type="text" class="goal-input" value="${goal}" placeholder="Descreva uma meta">
                    <button type="button" class="btn-remove-goal"><i class="fas fa-times"></i></button>
                `;
                goalsContainer.appendChild(item);
            });
        }
        
        // Carregar arquivos existentes
        if (typeof renderExistingFiles === 'function') {
            renderExistingFiles(project.arquivos || []);
        }
        if (typeof clearFileSelection === 'function') {
            // Limpar novos arquivos selecionados, mas manter os existentes
            const preview = document.getElementById('files-preview');
            if (preview) preview.innerHTML = '';
        }
        
        openModal(projectModal);
    }
    
    // Mostrar detalhes do projeto
    function showProjectDetails(docId) {
        const project = allProjects.find(p => p.docId === docId);
        if (!project) return;
        
        detailsTitle.textContent = project.nome || 'Detalhes do Projeto';
        
        const swot = project.swot || {};
        const nextSteps = project.proximos_passos || [];
        const goals = project.metas || [];
        
        const statusClass = project.status 
            ? project.status.toLowerCase().replace(/ /g, '-').normalize('NFD').replace(/[\u0300-\u036f]/g, '')
            : '';
        
        projectDetailsContent.innerHTML = `
            <div class="detail-section">
                <h3><i class="fas fa-info-circle"></i> Informações Gerais</h3>
                <div class="detail-grid">
                    <div class="detail-item">
                        <label>Status</label>
                        <span class="status-badge status-${statusClass}">${project.status || '-'}</span>
                    </div>
                    <div class="detail-item">
                        <label>Progresso</label>
                        <span>${project.progresso || 0}%</span>
                    </div>
                    <div class="detail-item">
                        <label>Prazo</label>
                        <span>${formatDateBR(project.prazo)}</span>
                    </div>
                    <div class="detail-item">
                        <label>Responsável</label>
                        <span>${project.responsavel || '-'}</span>
                    </div>
                </div>
            </div>
            
            ${project.descricao ? `
            <div class="detail-section">
                <h3><i class="fas fa-align-left"></i> Descrição</h3>
                <div class="detail-text">${project.descricao}</div>
            </div>
            ` : ''}
            
            ${project.objetivo ? `
            <div class="detail-section">
                <h3><i class="fas fa-bullseye"></i> Objetivo</h3>
                <div class="detail-text">${project.objetivo}</div>
            </div>
            ` : ''}
            
            ${nextSteps.length > 0 ? `
            <div class="detail-section">
                <h3><i class="fas fa-list-check"></i> Próximos Passos</h3>
                <ul class="detail-list">
                    ${nextSteps.map(step => `<li>${step}</li>`).join('')}
                </ul>
            </div>
            ` : ''}
            
            ${goals.length > 0 ? `
            <div class="detail-section">
                <h3><i class="fas fa-flag-checkered"></i> Metas</h3>
                <ul class="detail-list">
                    ${goals.map(goal => `<li>${goal}</li>`).join('')}
                </ul>
            </div>
            ` : ''}
            
            ${(swot.forcas || swot.fraquezas || swot.oportunidades || swot.ameacas) ? `
            <div class="detail-section">
                <h3><i class="fas fa-chart-pie"></i> Análise SWOT</h3>
                <div class="swot-detail-grid">
                    <div class="swot-card strength">
                        <h4><i class="fas fa-plus-circle"></i> Forças</h4>
                        <p>${swot.forcas || '-'}</p>
                    </div>
                    <div class="swot-card weakness">
                        <h4><i class="fas fa-minus-circle"></i> Fraquezas</h4>
                        <p>${swot.fraquezas || '-'}</p>
                    </div>
                    <div class="swot-card opportunity">
                        <h4><i class="fas fa-lightbulb"></i> Oportunidades</h4>
                        <p>${swot.oportunidades || '-'}</p>
                    </div>
                    <div class="swot-card threat">
                        <h4><i class="fas fa-exclamation-triangle"></i> Ameaças</h4>
                        <p>${swot.ameacas || '-'}</p>
                    </div>
                </div>
            </div>
            ` : ''}
        `;
        
        openModal(projectDetailsModal);
    }
    
    // Confirmar exclusão
    confirmDeleteBtn.addEventListener('click', async () => {
        if (!projectToDelete) return;
        
        showLoading();
        
        try {
            await db.collection('projects').doc(projectToDelete).delete();
            showToast('Projeto excluído com sucesso!', 'success');
            closeModal(deleteModal);
            projectToDelete = null;
        } catch (error) {
            console.error('Erro ao excluir projeto:', error);
            showToast('Erro ao excluir projeto.', 'error');
        } finally {
            hideLoading();
        }
    });
    
    // =====================================================
    // COMENTÁRIOS
    // =====================================================
    
    function displayComments(snapshot) {
        commentsList.innerHTML = '';
        
        snapshot.forEach((doc) => {
            const comment = doc.data();
            const commentEl = document.createElement('div');
            commentEl.classList.add('comment');
            
            let dateStr = '-';
            if (comment.createdAt) {
                const date = comment.createdAt.toDate();
                dateStr = date.toLocaleString('pt-BR');
            }
            
            commentEl.innerHTML = `
                <p class="comment-text">${comment.text}</p>
                <span class="comment-date">${dateStr}</span>
                <button class="delete-comment-btn" data-id="${doc.id}">
                    <i class="fas fa-times"></i>
                </button>
            `;
            
            commentsList.appendChild(commentEl);
        });
    }
    
    // Adicionar comentário
    addCommentBtn.addEventListener('click', async () => {
        const text = commentInput.value.trim();
        if (!text) return;
        
        try {
            await db.collection('comments').add({
                text: text,
                createdAt: firebase.firestore.FieldValue.serverTimestamp(),
                userId: currentUser.uid
            });
            
            commentInput.value = '';
            showToast('Comentário adicionado!', 'success');
        } catch (error) {
            console.error('Erro ao adicionar comentário:', error);
            showToast('Erro ao adicionar comentário.', 'error');
        }
    });
    
    // Deletar comentário
    commentsList.addEventListener('click', async (e) => {
        if (e.target.closest('.delete-comment-btn')) {
            const id = e.target.closest('.delete-comment-btn').dataset.id;
            
            try {
                await db.collection('comments').doc(id).delete();
                showToast('Comentário removido.', 'info');
            } catch (error) {
                console.error('Erro ao deletar comentário:', error);
                showToast('Erro ao remover comentário.', 'error');
            }
        }
    });
    
    // =====================================================
    // FECHAR MODAIS
    // =====================================================
    
    // Fechar por botão
    document.querySelectorAll('.modal-close, .btn-cancel').forEach(btn => {
        btn.addEventListener('click', () => {
            const modalId = btn.dataset.modal;
            if (modalId) {
                closeModal(document.getElementById(modalId));
            }
        });
    });
    
    // Fechar clicando fora
    document.querySelectorAll('.modal').forEach(modal => {
        modal.addEventListener('click', (e) => {
            if (e.target === modal) {
                closeModal(modal);
            }
        });
    });
    
    // Fechar com ESC
    document.addEventListener('keydown', (e) => {
        if (e.key === 'Escape') {
            document.querySelectorAll('.modal.active').forEach(modal => {
                closeModal(modal);
            });
        }
    });
    
    // =====================================================
    // EXPORTAÇÃO E IMPORTAÇÃO
    // =====================================================
    
    // Exportar XLSX
    document.getElementById('export-xlsx').addEventListener('click', () => {
        exportToXLSX(allProjects);
    });
    
    // Exportar CSV
    document.getElementById('export-csv').addEventListener('click', () => {
        exportToCSV(allProjects);
    });
    
    // Exportar PDF
    document.getElementById('export-pdf').addEventListener('click', () => {
        exportToPDF(allProjects);
    });
    
    // Importar XLSX
    document.getElementById('import-xlsx').addEventListener('click', () => {
        const fileInput = document.getElementById('file-input');
        fileInput.accept = '.xlsx,.xls';
        fileInput.onchange = (e) => handleFileImport(e, 'xlsx');
        fileInput.click();
    });
    
    // Importar CSV
    document.getElementById('import-csv').addEventListener('click', () => {
        const fileInput = document.getElementById('file-input');
        fileInput.accept = '.csv';
        fileInput.onchange = (e) => handleFileImport(e, 'csv');
        fileInput.click();
    });
    
    async function handleFileImport(event, type) {
        const file = event.target.files[0];
        if (!file) return;
        
        showLoading();
        
        try {
            const projects = await parseImportFile(file, type);
            
            if (projects.length === 0) {
                showToast('Nenhum projeto encontrado no arquivo.', 'warning');
                hideLoading();
                return;
            }
            
            // Importar projetos para o Firebase
            const batch = db.batch();
            
            projects.forEach((project) => {
                const docRef = db.collection('projects').doc();
                batch.set(docRef, {
                    ...project,
                    createdAt: firebase.firestore.FieldValue.serverTimestamp(),
                    updatedAt: firebase.firestore.FieldValue.serverTimestamp()
                });
            });
            
            await batch.commit();
            
            showToast(`${projects.length} projeto(s) importado(s) com sucesso!`, 'success');
        } catch (error) {
            console.error('Erro ao importar:', error);
            showToast('Erro ao importar arquivo.', 'error');
        } finally {
            hideLoading();
            event.target.value = '';
        }
    }
    
    // Inicialização
    showLoading();

    // =====================================================
    // PAINEL DE PRÓXIMOS PASSOS
    // =====================================================

    const tasksPanel = document.getElementById('tasks-panel');
    const tasksPanelOverlay = document.getElementById('tasks-panel-overlay');
    const openTasksBtn = document.getElementById('open-tasks-btn');
    const closeTasksBtn = document.getElementById('close-tasks-panel');
    const tasksList = document.getElementById('tasks-list');
    const tasksCountBadge = document.getElementById('tasks-count');
    const tasksProjectFilter = document.getElementById('tasks-project-filter');
    const tasksStatusFilter = document.getElementById('tasks-status-filter');

    // Estatísticas
    const statTotalTasks = document.getElementById('stat-total-tasks');
    const statPendingTasks = document.getElementById('stat-pending-tasks');
    const statScheduledTasks = document.getElementById('stat-scheduled-tasks');
    const statCompletedTasks = document.getElementById('stat-completed-tasks');

    // Schedule Modal
    const scheduleModal = document.getElementById('schedule-modal');
    const scheduleForm = document.getElementById('schedule-form');

    // Estado das tarefas (armazenado no Firebase)
    let tasksState = {}; // { projectId_taskIndex: { status: 'pendente'|'agendado'|'concluido', scheduledDate: null } }
    let unsubscribeTasks = null;

    // Abrir painel
    openTasksBtn.addEventListener('click', () => {
        openTasksPanel();
    });

    // Fechar painel
    closeTasksBtn.addEventListener('click', closeTasksPanel);
    tasksPanelOverlay.addEventListener('click', closeTasksPanel);

    function openTasksPanel() {
        tasksPanel.classList.add('active');
        tasksPanelOverlay.classList.add('active');
        document.body.style.overflow = 'hidden';
        loadTasksState();
        updateProjectFilter();
        renderTasks();
    }

    function closeTasksPanel() {
        tasksPanel.classList.remove('active');
        tasksPanelOverlay.classList.remove('active');
        document.body.style.overflow = '';
    }

    // Carregar estado das tarefas do Firebase
    function loadTasksState() {
        if (unsubscribeTasks) unsubscribeTasks();

        unsubscribeTasks = db.collection('tasksState').doc('state')
            .onSnapshot((doc) => {
                if (doc.exists) {
                    tasksState = doc.data() || {};
                } else {
                    tasksState = {};
                }
                renderTasks();
                updateTasksCount();
            });
    }

    // Salvar estado das tarefas no Firebase
    async function saveTasksState() {
        try {
            await db.collection('tasksState').doc('state').set(tasksState);
        } catch (error) {
            console.error('Erro ao salvar estado das tarefas:', error);
        }
    }

    // Atualizar filtro de projetos
    function updateProjectFilter() {
        const currentValue = tasksProjectFilter.value;
        tasksProjectFilter.innerHTML = '<option value="todos">Todos os projetos</option>';

        allProjects.forEach(project => {
            if (project.proximos_passos && project.proximos_passos.length > 0) {
                const option = document.createElement('option');
                option.value = project.docId;
                option.textContent = project.nome || `Projeto ${project.id}`;
                tasksProjectFilter.appendChild(option);
            }
        });

        tasksProjectFilter.value = currentValue;
    }

    // Filtros
    tasksProjectFilter.addEventListener('change', renderTasks);
    tasksStatusFilter.addEventListener('change', renderTasks);

    // Renderizar lista de tarefas
    function renderTasks() {
        const projectFilter = tasksProjectFilter.value;
        const statusFilter = tasksStatusFilter.value;

        // Coletar todas as tarefas
        let allTasks = [];

        allProjects.forEach(project => {
            const steps = project.proximos_passos || [];
            steps.forEach((step, index) => {
                const taskId = `${project.docId}_${index}`;
                const taskState = tasksState[taskId] || { status: 'pendente', scheduledDate: null, scheduledTime: null };

                allTasks.push({
                    id: taskId,
                    text: step,
                    projectDocId: project.docId,
                    projectId: project.id,
                    projectName: project.nome || `Projeto ${project.id}`,
                    projectDeadline: project.prazo,
                    projectStatus: project.status,
                    taskIndex: index,
                    status: taskState.status,
                    scheduledDate: taskState.scheduledDate,
                    scheduledTime: taskState.scheduledTime
                });
            });
        });

        // Filtrar por projeto
        if (projectFilter !== 'todos') {
            allTasks = allTasks.filter(t => t.projectDocId === projectFilter);
        }

        // Filtrar por status
        if (statusFilter !== 'todos') {
            allTasks = allTasks.filter(t => t.status === statusFilter);
        }

        // Atualizar estatísticas
        const total = allTasks.length;
        const pending = allTasks.filter(t => t.status === 'pendente').length;
        const scheduled = allTasks.filter(t => t.status === 'agendado').length;
        const completed = allTasks.filter(t => t.status === 'concluido').length;

        statTotalTasks.textContent = total;
        statPendingTasks.textContent = pending;
        statScheduledTasks.textContent = scheduled;
        statCompletedTasks.textContent = completed;

        // Renderizar
        if (allTasks.length === 0) {
            tasksList.innerHTML = `
                <div class="tasks-empty">
                    <i class="fas fa-clipboard-check"></i>
                    <p>Nenhum próximo passo encontrado.</p>
                </div>
            `;
            return;
        }

        // Agrupar por projeto
        const groupedTasks = {};
        allTasks.forEach(task => {
            if (!groupedTasks[task.projectDocId]) {
                groupedTasks[task.projectDocId] = {
                    projectName: task.projectName,
                    projectId: task.projectId,
                    projectDeadline: task.projectDeadline,
                    tasks: []
                };
            }
            groupedTasks[task.projectDocId].tasks.push(task);
        });

        // Gerar HTML
        let html = '';

        Object.keys(groupedTasks).forEach(projectDocId => {
            const group = groupedTasks[projectDocId];
            const deadlineInfo = getDeadlineInfo(group.projectDeadline);

            html += `
                <div class="task-group">
                    <div class="task-group-header">
                        <div class="task-group-title">
                            <i class="fas fa-folder-open"></i>
                            <span>${group.projectName}</span>
                        </div>
                        <span class="task-group-count">${group.tasks.length} tarefa(s)</span>
                    </div>
                    ${group.tasks.map(task => renderTaskItem(task, deadlineInfo)).join('')}
                </div>
            `;
        });

        tasksList.innerHTML = html;

        // Adicionar event listeners
        attachTaskEventListeners();
    }

    function getDeadlineInfo(deadline) {
        if (!deadline) return { class: '', text: '' };

        const date = parseDate(deadline);
        if (!date) return { class: '', text: deadline };

        const today = new Date();
        today.setHours(0, 0, 0, 0);

        const diffDays = Math.ceil((date - today) / (1000 * 60 * 60 * 24));

        if (diffDays < 0) {
            return { class: 'overdue', text: `Vencido há ${Math.abs(diffDays)} dia(s)` };
        } else if (diffDays === 0) {
            return { class: 'soon', text: 'Vence hoje' };
        } else if (diffDays <= 7) {
            return { class: 'soon', text: `Vence em ${diffDays} dia(s)` };
        } else {
            return { class: '', text: formatDateBR(deadline) };
        }
    }

    function renderTaskItem(task, deadlineInfo) {
        const isCompleted = task.status === 'concluido';
        const isScheduled = task.status === 'agendado';

        let scheduledInfo = '';
        if (isScheduled && task.scheduledDate) {
            const schedDate = new Date(task.scheduledDate);
            const timeStr = task.scheduledTime || '09:00';
            scheduledInfo = `
                <span class="task-scheduled-info">
                    <i class="fas fa-calendar-check"></i>
                    ${schedDate.toLocaleDateString('pt-BR')} às ${timeStr}
                </span>
            `;
        }

        return `
            <div class="task-item ${isCompleted ? 'completed' : ''} ${isScheduled ? 'scheduled' : ''}" data-task-id="${task.id}">
                <div class="task-item-header">
                    <div class="task-checkbox ${isCompleted ? 'checked' : ''}" data-task-id="${task.id}"></div>
                    <div class="task-text">${task.text}</div>
                </div>
                <div class="task-meta">
                    <span class="task-project-tag">
                        <i class="fas fa-hashtag"></i>
                        Projeto ${task.projectId}
                    </span>
                    ${deadlineInfo.text ? `
                        <span class="task-deadline ${deadlineInfo.class}">
                            <i class="fas fa-clock"></i>
                            ${deadlineInfo.text}
                        </span>
                    ` : ''}
                    ${scheduledInfo}
                </div>
                <div class="task-actions">
                    <button class="btn-task-action btn-schedule" data-task-id="${task.id}" data-project-id="${task.projectDocId}" data-text="${encodeURIComponent(task.text)}" data-project-name="${encodeURIComponent(task.projectName)}">
                        <i class="fas fa-calendar-plus"></i>
                        ${isScheduled ? 'Reagendar' : 'Agendar'}
                    </button>
                    <button class="btn-task-action btn-gcal" data-task-id="${task.id}" data-text="${encodeURIComponent(task.text)}" data-project-name="${encodeURIComponent(task.projectName)}" data-deadline="${task.projectDeadline || ''}">
                        <i class="fab fa-google"></i>
                        Abrir no Calendar
                    </button>
                </div>
            </div>
        `;
    }

    function attachTaskEventListeners() {
        // Checkbox toggle
        document.querySelectorAll('.task-checkbox').forEach(checkbox => {
            checkbox.addEventListener('click', (e) => {
                const taskId = e.target.dataset.taskId;
                toggleTaskCompletion(taskId);
            });
        });

        // Agendar
        document.querySelectorAll('.btn-schedule').forEach(btn => {
            btn.addEventListener('click', (e) => {
                const taskId = e.target.closest('.btn-schedule').dataset.taskId;
                const projectId = e.target.closest('.btn-schedule').dataset.projectId;
                const text = decodeURIComponent(e.target.closest('.btn-schedule').dataset.text);
                const projectName = decodeURIComponent(e.target.closest('.btn-schedule').dataset.projectName);
                openScheduleModal(taskId, projectId, text, projectName);
            });
        });

        // Abrir direto no Google Calendar
        document.querySelectorAll('.btn-gcal').forEach(btn => {
            btn.addEventListener('click', (e) => {
                const btnEl = e.target.closest('.btn-gcal');
                const text = decodeURIComponent(btnEl.dataset.text);
                const projectName = decodeURIComponent(btnEl.dataset.projectName);
                const deadline = btnEl.dataset.deadline;
                openGoogleCalendarDirect(text, projectName, deadline);
            });
        });
    }

    function toggleTaskCompletion(taskId) {
        const currentState = tasksState[taskId] || { status: 'pendente' };

        if (currentState.status === 'concluido') {
            currentState.status = 'pendente';
        } else {
            currentState.status = 'concluido';
        }

        tasksState[taskId] = currentState;
        saveTasksState();
        renderTasks();
        updateTasksCount();

        const message = currentState.status === 'concluido' 
            ? 'Tarefa marcada como concluída!' 
            : 'Tarefa reaberta.';
        showToast(message, currentState.status === 'concluido' ? 'success' : 'info');
    }

    // Modal de agendamento
    function openScheduleModal(taskId, projectId, text, projectName) {
        document.getElementById('schedule-task-id').value = taskId;
        document.getElementById('schedule-project-id').value = projectId;
        document.getElementById('schedule-project-name').textContent = projectName;
        document.getElementById('schedule-task-text').textContent = text;
        document.getElementById('schedule-title').value = `[${projectName}] ${text}`;

        // Data padrão: amanhã
        const tomorrow = new Date();
        tomorrow.setDate(tomorrow.getDate() + 1);
        document.getElementById('schedule-date').value = tomorrow.toISOString().split('T')[0];

        document.getElementById('schedule-time').value = '09:00';
        document.getElementById('schedule-duration').value = '60';
        document.getElementById('schedule-reminder').value = '30';
        document.getElementById('schedule-description').value = `Próximo passo do projeto "${projectName}":\n\n${text}`;
        document.getElementById('schedule-location').value = '';

        openModal(scheduleModal);
    }

    // Submissão do formulário de agendamento
    scheduleForm.addEventListener('submit', (e) => {
        e.preventDefault();

        const taskId = document.getElementById('schedule-task-id').value;
        const title = document.getElementById('schedule-title').value;
        const date = document.getElementById('schedule-date').value;
        const time = document.getElementById('schedule-time').value;
        const duration = parseInt(document.getElementById('schedule-duration').value);
        const reminder = document.getElementById('schedule-reminder').value;
        const description = document.getElementById('schedule-description').value;
        const location = document.getElementById('schedule-location').value;

        // Atualizar estado da tarefa
        tasksState[taskId] = {
            status: 'agendado',
            scheduledDate: date,
            scheduledTime: time
        };
        saveTasksState();

        // Abrir Google Calendar
        const url = buildGoogleCalendarUrl(title, date, time, duration, description, location, reminder);
        window.open(url, '_blank');

        closeModal(scheduleModal);
        renderTasks();
        updateTasksCount();
        showToast('Tarefa agendada! Google Calendar aberto.', 'success');
    });

    // Abrir Google Calendar diretamente (sem modal)
    function openGoogleCalendarDirect(text, projectName, deadline) {
        const title = `[${projectName}] ${text}`;
        const description = `Próximo passo do projeto "${projectName}":\n\n${text}`;

        // Usar prazo do projeto ou amanhã
        let date;
        if (deadline) {
            const parsedDate = parseDate(deadline);
            if (parsedDate && parsedDate > new Date()) {
                date = parsedDate.toISOString().split('T')[0];
            } else {
                const tomorrow = new Date();
                tomorrow.setDate(tomorrow.getDate() + 1);
                date = tomorrow.toISOString().split('T')[0];
            }
        } else {
            const tomorrow = new Date();
            tomorrow.setDate(tomorrow.getDate() + 1);
            date = tomorrow.toISOString().split('T')[0];
        }

        const url = buildGoogleCalendarUrl(title, date, '09:00', 60, description, '', '30');
        window.open(url, '_blank');
    }

    // Construir URL do Google Calendar
    function buildGoogleCalendarUrl(title, date, time, durationMinutes, description, location, reminder) {
        // Formatar datas para o formato do Google Calendar (YYYYMMDDTHHmmss)
        const startDateTime = new Date(`${date}T${time}`);
        const endDateTime = new Date(startDateTime.getTime() + durationMinutes * 60000);

        const formatGCalDate = (d) => {
            return d.toISOString().replace(/[-:]/g, '').split('.')[0] + 'Z';
        };

        // Para eventos locais (sem Z no final)
        const formatLocalDate = (d) => {
            const pad = n => n.toString().padStart(2, '0');
            return `${d.getFullYear()}${pad(d.getMonth() + 1)}${pad(d.getDate())}T${pad(d.getHours())}${pad(d.getMinutes())}00`;
        };

        const params = new URLSearchParams({
            action: 'TEMPLATE',
            text: title,
            dates: `${formatLocalDate(startDateTime)}/${formatLocalDate(endDateTime)}`,
            details: description,
            location: location,
            trp: 'false',
            sprop: 'website:painel-executivo'
        });

        // Adicionar lembrete se especificado
        if (reminder) {
            params.append('reminder', reminder);
        }

        return `https://calendar.google.com/calendar/render?${params.toString()}`;
    }

    // Atualizar contador de tarefas no botão
    function updateTasksCount() {
        let pendingCount = 0;

        allProjects.forEach(project => {
            const steps = project.proximos_passos || [];
            steps.forEach((step, index) => {
                const taskId = `${project.docId}_${index}`;
                const taskState = tasksState[taskId] || { status: 'pendente' };
                if (taskState.status === 'pendente') {
                    pendingCount++;
                }
            });
        });

        tasksCountBadge.textContent = pendingCount;
        tasksCountBadge.style.display = pendingCount > 0 ? 'block' : 'none';
    }

    // Exportar múltiplas tarefas para Google Calendar
    document.getElementById('export-tasks-calendar').addEventListener('click', () => {
        const pendingTasks = [];

        allProjects.forEach(project => {
            const steps = project.proximos_passos || [];
            steps.forEach((step, index) => {
                const taskId = `${project.docId}_${index}`;
                const taskState = tasksState[taskId] || { status: 'pendente' };
                if (taskState.status === 'pendente') {
                    pendingTasks.push({
                        text: step,
                        projectName: project.nome || `Projeto ${project.id}`,
                        deadline: project.prazo
                    });
                }
            });
        });

        if (pendingTasks.length === 0) {
            showToast('Não há tarefas pendentes para exportar.', 'warning');
            return;
        }

        // Abrir o primeiro e avisar que só é possível um por vez
        const first = pendingTasks[0];
        openGoogleCalendarDirect(first.text, first.projectName, first.deadline);

        if (pendingTasks.length > 1) {
            showToast(`Google Calendar aberto com a primeira tarefa. Há mais ${pendingTasks.length - 1} tarefa(s) pendente(s).`, 'info');
        }
    });

    // Atualizar contagem quando projetos mudam
    const originalUpdateDashboard = updateDashboard;
    updateDashboard = function(projects) {
        originalUpdateDashboard(projects);
        updateTasksCount();
        updateProjectFilter();
        
        // Verificar prazos e enviar notificações
        if (typeof checkDeadlinesAndNotify === 'function') {
            checkDeadlinesAndNotify(projects);
        }
    };

    // =====================================================
    // INICIALIZAÇÃO DAS NOVAS FUNCIONALIDADES
    // =====================================================

    // Inicializar configurações personalizáveis
    if (typeof initSettingsListeners === 'function') {
        initSettingsListeners();
    }

    // Inicializar lembretes
    if (typeof initRemindersListeners === 'function') {
        initRemindersListeners();
    }

    // Inicializar upload de arquivos
    if (typeof initFilesListeners === 'function') {
        initFilesListeners();
    }

    // Inicializar relatórios
    if (typeof initReportsListeners === 'function') {
        initReportsListeners();
    }
});
