/**
 * PAINEL EXECUTIVO - APLICAÇÃO PRINCIPAL
 * ======================================
 * Gerenciamento de projetos com Firebase
 * 
 * NOTA: Funções globais (openModal, closeModal, showToast, etc.)
 * estão definidas em utils.js
 */

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
    
    // Novos indicadores
    const completed2025El = document.getElementById('completed-2025');
    const goalBarEl = document.getElementById('goal-bar');
    const goalLabelEl = document.getElementById('goal-label');
    const stagnantProjectsEl = document.getElementById('stagnant-projects');
    const kpiStagnantEl = document.getElementById('kpi-stagnant');
    
    // Configuração de metas
    const GOAL_2025 = 5; // Meta de projetos concluídos em 2025
    const STAGNATION_DAYS = 14; // Dias sem atualização para considerar estagnado
    
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
            .onSnapshot(async (snapshot) => {
                allProjects = [];
                snapshot.forEach((doc) => {
                    allProjects.push({ docId: doc.id, ...doc.data() });
                });
                // Sincronizar com variável global
                window.allProjects = allProjects;
                
                // Verificar e corrigir IDs duplicados/faltantes
                await checkAndFixProjectIds(allProjects);
                
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
    
    // Verificar e corrigir IDs duplicados ou faltantes
    async function checkAndFixProjectIds(projects) {
        if (!projects || projects.length === 0) return;
        
        // Verificar se há IDs duplicados ou faltantes
        const ids = projects.map(p => p.id);
        const uniqueIds = new Set(ids);
        const hasDuplicates = ids.length !== uniqueIds.size;
        const hasMissing = projects.some(p => !p.id || p.id === 0);
        
        if (hasDuplicates || hasMissing) {
            console.log('Corrigindo IDs duplicados/faltantes...');
            
            // Ordenar por data de criação (mais antigos primeiro)
            // Se não tiver createdAt, usa o nome como fallback para ordenação estável
            const sorted = [...projects].sort((a, b) => {
                const dateA = a.createdAt?.toDate?.() || a.createdAt || null;
                const dateB = b.createdAt?.toDate?.() || b.createdAt || null;
                
                if (dateA && dateB) {
                    return new Date(dateA) - new Date(dateB);
                }
                // Se um não tem data, coloca por último
                if (dateA && !dateB) return -1;
                if (!dateA && dateB) return 1;
                // Se nenhum tem data, ordena por nome
                return (a.nome || '').localeCompare(b.nome || '');
            });
            
            // Atribuir IDs sequenciais
            const batch = db.batch();
            let needsUpdate = false;
            
            sorted.forEach((project, index) => {
                const newId = index + 1;
                if (project.id !== newId) {
                    needsUpdate = true;
                    const ref = db.collection('projects').doc(project.docId);
                    batch.update(ref, { id: newId });
                    // Atualiza localmente também para exibição imediata
                    project.id = newId;
                }
            });
            
            if (needsUpdate) {
                try {
                    await batch.commit();
                    console.log('IDs corrigidos com sucesso!');
                    // Reordena o array local
                    allProjects.sort((a, b) => (a.id || 0) - (b.id || 0));
                    window.allProjects = allProjects;
                } catch (error) {
                    console.error('Erro ao corrigir IDs:', error);
                }
            }
        }
    }
    
    // Exibir projetos na tabela
    function displayProjects(projects) {
        const filterValue = statusFilter.value.toLowerCase();
        
        // Primeiro, ordena por ID
        let sorted = [...projects].sort((a, b) => (a.id || 999) - (b.id || 999));
        
        let filtered = sorted;
        if (filterValue !== 'todos') {
            filtered = sorted.filter(p => 
                p.status && p.status.toLowerCase() === filterValue
            );
        }
        
        projectsTableBody.innerHTML = '';
        
        if (filtered.length === 0) {
            projectsTableBody.innerHTML = `
                <tr>
                    <td colspan="9" style="text-align: center; padding: 2rem;">
                        <i class="fas fa-folder-open" style="font-size: 2rem; color: var(--text-muted); margin-bottom: 0.5rem; display: block;"></i>
                        Nenhum projeto encontrado.
                    </td>
                </tr>
            `;
            return;
        }
        
        filtered.forEach((project, displayIndex) => {
            const row = document.createElement('tr');
            
            // Usa o ID do projeto se válido, senão usa o índice + 1
            const displayNumber = project.id || (displayIndex + 1);
            
            const deadlineDate = parseDate(project.prazo);
            const today = new Date();
            today.setHours(0, 0, 0, 0);
            
            let prazoClass = '';
            if (deadlineDate && deadlineDate < today && 
                project.status && project.status.toLowerCase() !== 'concluído') {
                prazoClass = 'overdue';
            }
            
            const nextSteps = project.proximos_passos || [];
            let nextStepsHTML = '<li style="color: var(--text-muted);">-</li>';
            if (nextSteps.length > 0) {
                nextStepsHTML = nextSteps.slice(0, 2).map(step => {
                    // Compatibilidade com formato antigo (string) e novo (objeto)
                    const isObject = typeof step === 'object';
                    const texto = isObject ? (step.texto || '') : step;
                    const status = isObject ? (step.status || 'pendente') : 'pendente';
                    
                    let statusIcon = '⏳';
                    let statusColor = 'var(--text-muted)';
                    if (status === 'em_andamento') {
                        statusIcon = '🔄';
                        statusColor = '#3b82f6';
                    } else if (status === 'concluido') {
                        statusIcon = '✅';
                        statusColor = '#10b981';
                    }
                    
                    const strikeStyle = status === 'concluido' ? 'text-decoration: line-through; opacity: 0.7;' : '';
                    return `<li style="${strikeStyle}"><span style="color: ${statusColor}">${statusIcon}</span> ${texto}</li>`;
                }).join('');
            }
            
            const statusClass = project.status 
                ? project.status.toLowerCase().replace(/ /g, '-').normalize('NFD').replace(/[\u0300-\u036f]/g, '')
                : '';
            
            // Renderizar badge de anexos
            const arquivos = project.arquivos || [];
            const attachmentsBadge = typeof renderAttachmentsBadge === 'function' 
                ? renderAttachmentsBadge(arquivos)
                : (arquivos.length > 0 ? `<span class="attachments-badge"><i class="fas fa-paperclip"></i> ${arquivos.length}</span>` : '-');
            
            // === VELOCIDADE: Dias desde última atualização ===
            const lastUpdate = project.updatedAt?.toDate?.() || project.updatedAt || project.createdAt?.toDate?.() || project.createdAt;
            let velocityHTML = '<span class="velocity-badge velocity-unknown" title="Sem dados">-</span>';
            
            if (lastUpdate) {
                const now = new Date();
                const updateDate = new Date(lastUpdate);
                const daysSinceUpdate = Math.floor((now - updateDate) / (1000 * 60 * 60 * 24));
                
                let velocityClass = 'velocity-good';
                let velocityIcon = '🟢';
                let velocityTitle = 'Atualizado recentemente';
                
                if (daysSinceUpdate >= 14) {
                    velocityClass = 'velocity-stagnant';
                    velocityIcon = '🔴';
                    velocityTitle = 'Estagnado! Precisa de atenção';
                } else if (daysSinceUpdate >= 7) {
                    velocityClass = 'velocity-slow';
                    velocityIcon = '🟡';
                    velocityTitle = 'Atenção: mais de uma semana';
                }
                
                const daysText = daysSinceUpdate === 0 ? 'Hoje' : 
                                 daysSinceUpdate === 1 ? '1 dia' : 
                                 `${daysSinceUpdate} dias`;
                
                velocityHTML = `<span class="velocity-badge ${velocityClass}" title="${velocityTitle}">${velocityIcon} ${daysText}</span>`;
            }
            
            row.innerHTML = `
                <td>${displayNumber}</td>
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
                <td class="velocity-cell">${velocityHTML}</td>
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
        if (completedProjectsEl) completedProjectsEl.textContent = completed;
        plannedProjectsEl.textContent = planned;
        
        // === META 2025: Projetos concluídos no ano ===
        const currentYear = new Date().getFullYear();
        const completed2025 = projects.filter(p => {
            if (p.status && p.status.toLowerCase() === 'concluído') {
                // Verifica se foi concluído em 2025 (usando completedAt ou updatedAt)
                const completedDate = p.completedAt?.toDate?.() || p.completedAt || p.updatedAt?.toDate?.() || p.updatedAt;
                if (completedDate) {
                    const year = new Date(completedDate).getFullYear();
                    return year === currentYear;
                }
                return true; // Se não tem data, assume que é do ano atual
            }
            return false;
        }).length;
        
        if (completed2025El) {
            completed2025El.textContent = completed2025;
            // Animar se atingiu a meta
            if (completed2025 >= GOAL_2025) {
                completed2025El.classList.add('goal-achieved');
            } else {
                completed2025El.classList.remove('goal-achieved');
            }
        }
        if (goalBarEl) {
            const goalProgress = Math.min((completed2025 / GOAL_2025) * 100, 100);
            goalBarEl.style.width = `${goalProgress}%`;
            goalBarEl.className = 'goal-bar' + (completed2025 >= GOAL_2025 ? ' achieved' : '');
        }
        if (goalLabelEl) {
            goalLabelEl.textContent = `Meta: ${GOAL_2025}`;
        }
        
        // === PROJETOS ESTAGNADOS (14+ dias sem atualização) ===
        const now = new Date();
        const stagnantProjects = projects.filter(p => {
            // Só considera projetos em andamento ou planejados
            const status = p.status?.toLowerCase();
            if (status !== 'em andamento' && status !== 'planejado') return false;
            
            const lastUpdate = p.updatedAt?.toDate?.() || p.updatedAt || p.createdAt?.toDate?.() || p.createdAt;
            if (!lastUpdate) return true; // Sem data = estagnado
            
            const daysSinceUpdate = Math.floor((now - new Date(lastUpdate)) / (1000 * 60 * 60 * 24));
            return daysSinceUpdate >= STAGNATION_DAYS;
        });
        
        const stagnantCount = stagnantProjects.length;
        if (stagnantProjectsEl) {
            stagnantProjectsEl.textContent = stagnantCount;
        }
        if (kpiStagnantEl) {
            if (stagnantCount > 0) {
                kpiStagnantEl.classList.add('has-stagnant');
            } else {
                kpiStagnantEl.classList.remove('has-stagnant');
            }
        }
        
        // Mostrar alerta de estagnação (uma vez por sessão)
        if (stagnantCount > 0 && !window.stagnationAlertShown) {
            window.stagnationAlertShown = true;
            setTimeout(() => {
                const projectNames = stagnantProjects.slice(0, 3).map(p => p.nome).join(', ');
                const moreText = stagnantCount > 3 ? ` e mais ${stagnantCount - 3}` : '';
                showToast(`⚠️ ${stagnantCount} projeto(s) estagnado(s): ${projectNames}${moreText}`, 'warning', 8000);
            }, 2000);
        }
        
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
        
        // Atualizar contagem de aguardando resposta
        if (typeof updateWaitingCount === 'function') {
            updateWaitingCount(projects);
        }
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
        
        // Limpar passo crítico
        const criticalStepInput = document.getElementById('critical-step');
        if (criticalStepInput) criticalStepInput.value = '';
        
        nextStepsContainer.innerHTML = `
            <div class="next-step-item">
                <div class="step-main">
                    <input type="text" class="next-step-input" placeholder="Descreva o próximo passo">
                </div>
                <div class="step-details">
                    <select class="step-status">
                        <option value="pendente">⏳ Pendente</option>
                        <option value="em_andamento">🔄 Em Andamento</option>
                        <option value="aguardando">⏸️ Aguardando</option>
                        <option value="concluido">✅ Concluído</option>
                    </select>
                    <input type="text" class="step-aguardando" placeholder="Aguardando quem?" style="display: none;">
                    <input type="date" class="step-prazo" title="Prazo">
                    <input type="text" class="step-responsavel" placeholder="Responsável">
                </div>
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
            <div class="step-main">
                <input type="text" class="next-step-input" placeholder="Descreva o próximo passo">
            </div>
            <div class="step-details">
                <select class="step-status">
                    <option value="pendente">⏳ Pendente</option>
                    <option value="em_andamento">🔄 Em Andamento</option>
                    <option value="aguardando">⏸️ Aguardando</option>
                    <option value="concluido">✅ Concluído</option>
                </select>
                <input type="text" class="step-aguardando" placeholder="Aguardando quem?" style="display: none;">
                <input type="date" class="step-prazo" title="Prazo">
                <input type="text" class="step-responsavel" placeholder="Responsável">
            </div>
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
        
        // Buscar projeto existente para preservar dados de aguardandoDesde
        const existingDocId = projectIdInput.value;
        let existingProject = null;
        if (existingDocId) {
            existingProject = allProjects.find(p => p.docId === existingDocId);
        }
        const existingSteps = existingProject?.proximos_passos || [];
        
        // Coletar próximos passos (nova estrutura com objetos)
        const nextSteps = [];
        document.querySelectorAll('.next-step-item').forEach((item, index) => {
            const texto = item.querySelector('.next-step-input')?.value.trim();
            if (texto) {
                const status = item.querySelector('.step-status')?.value || 'pendente';
                const aguardando = item.querySelector('.step-aguardando')?.value.trim() || '';
                
                // Preservar aguardandoDesde se já existia, ou criar nova data se mudou para aguardando
                let aguardandoDesde = null;
                const existingStep = existingSteps[index];
                if (status === 'aguardando') {
                    if (existingStep && existingStep.status === 'aguardando' && existingStep.aguardandoDesde) {
                        aguardandoDesde = existingStep.aguardandoDesde;
                    } else {
                        aguardandoDesde = new Date().toISOString();
                    }
                }
                
                nextSteps.push({
                    texto: texto,
                    status: status,
                    prazo: item.querySelector('.step-prazo')?.value || '',
                    responsavel: item.querySelector('.step-responsavel')?.value.trim() || '',
                    aguardando: status === 'aguardando' ? aguardando : '',
                    aguardandoDesde: aguardandoDesde
                });
            }
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
        
        // Passo Crítico
        const passoCritico = document.getElementById('critical-step')?.value.trim() || '';
        
        const projectData = {
            nome: document.getElementById('project-name').value.trim(),
            status: document.getElementById('project-status').value,
            progresso: parseInt(document.getElementById('project-progress').value) || 0,
            prazo: prazo,
            descricao: document.getElementById('project-description').value.trim(),
            objetivo: document.getElementById('project-objective').value.trim(),
            responsavel: document.getElementById('project-responsible').value.trim(),
            passoCritico: passoCritico,
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
        
        // Se status é "Concluído", registra data de conclusão
        if (projectData.status.toLowerCase() === 'concluído') {
            projectData.completedAt = firebase.firestore.FieldValue.serverTimestamp();
        }
        
        try {
            const docId = projectIdInput.value;
            let projectDocId = docId;
            
            if (docId) {
                // Atualizar existente
                await db.collection('projects').doc(docId).update(projectData);
                showToast('Projeto atualizado com sucesso!', 'success');
            } else {
                // Criar novo - buscar maior ID de TODOS os projetos
                const snapshot = await db.collection('projects').get();
                let maxId = 0;
                snapshot.forEach(doc => {
                    const data = doc.data();
                    if (data.id && typeof data.id === 'number' && data.id > maxId) {
                        maxId = data.id;
                    }
                });
                
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
        
        // Passo Crítico
        const criticalStepInput = document.getElementById('critical-step');
        if (criticalStepInput) {
            criticalStepInput.value = project.passoCritico || '';
        }
        
        // SWOT
        const swot = project.swot || {};
        document.getElementById('swot-strengths').value = swot.forcas || '';
        document.getElementById('swot-weaknesses').value = swot.fraquezas || '';
        document.getElementById('swot-opportunities').value = swot.oportunidades || '';
        document.getElementById('swot-threats').value = swot.ameacas || '';
        
        // Próximos passos (suporta nova estrutura com objetos e formato antigo com strings)
        const steps = project.proximos_passos || [];
        nextStepsContainer.innerHTML = '';
        if (steps.length === 0) {
            nextStepsContainer.innerHTML = `
                <div class="next-step-item">
                    <div class="step-main">
                        <input type="text" class="next-step-input" placeholder="Descreva o próximo passo">
                    </div>
                    <div class="step-details">
                        <select class="step-status">
                            <option value="pendente">⏳ Pendente</option>
                            <option value="em_andamento">🔄 Em Andamento</option>
                            <option value="aguardando">⏸️ Aguardando</option>
                            <option value="concluido">✅ Concluído</option>
                        </select>
                        <input type="text" class="step-aguardando" placeholder="Aguardando quem?" style="display: none;">
                        <input type="date" class="step-prazo" title="Prazo">
                        <input type="text" class="step-responsavel" placeholder="Responsável">
                    </div>
                    <button type="button" class="btn-remove-step"><i class="fas fa-times"></i></button>
                </div>
            `;
        } else {
            steps.forEach(step => {
                // Compatibilidade: suporta string (formato antigo) ou objeto (novo formato)
                const isObject = typeof step === 'object';
                const texto = isObject ? (step.texto || '') : step;
                const status = isObject ? (step.status || 'pendente') : 'pendente';
                const prazo = isObject ? (step.prazo || '') : '';
                const responsavel = isObject ? (step.responsavel || '') : '';
                const aguardando = isObject ? (step.aguardando || '') : '';
                const showAguardando = status === 'aguardando' ? 'display: block;' : 'display: none;';
                
                const item = document.createElement('div');
                item.className = `next-step-item status-${status}`;
                item.innerHTML = `
                    <div class="step-main">
                        <input type="text" class="next-step-input" value="${texto}" placeholder="Descreva o próximo passo">
                    </div>
                    <div class="step-details">
                        <select class="step-status">
                            <option value="pendente" ${status === 'pendente' ? 'selected' : ''}>⏳ Pendente</option>
                            <option value="em_andamento" ${status === 'em_andamento' ? 'selected' : ''}>🔄 Em Andamento</option>
                            <option value="aguardando" ${status === 'aguardando' ? 'selected' : ''}>⏸️ Aguardando</option>
                            <option value="concluido" ${status === 'concluido' ? 'selected' : ''}>✅ Concluído</option>
                        </select>
                        <input type="text" class="step-aguardando" value="${aguardando}" placeholder="Aguardando quem?" style="${showAguardando}">
                        <input type="date" class="step-prazo" value="${prazo}" title="Prazo">
                        <input type="text" class="step-responsavel" value="${responsavel}" placeholder="Responsável">
                    </div>
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
            
            <div class="detail-section">
                <div class="tasks-header-actions">
                    <h3><i class="fas fa-list-check"></i> Próximos Passos (${nextSteps.length})</h3>
                    ${nextSteps.length > 0 ? `
                    <button class="btn-clear-all-tasks" data-docid="${docId}" data-type="proximos_passos">
                        <i class="fas fa-broom"></i> Limpar todos
                    </button>
                    ` : ''}
                </div>
                ${nextSteps.length > 0 ? `
                <div class="tasks-list-detail">
                    ${nextSteps.map((step, index) => {
                        // Compatibilidade: string antiga ou objeto novo
                        const isObject = typeof step === 'object';
                        const texto = isObject ? (step.texto || '') : step;
                        const status = isObject ? (step.status || 'pendente') : 'pendente';
                        const prazo = isObject && step.prazo ? step.prazo : '';
                        const responsavel = isObject ? (step.responsavel || '') : '';
                        
                        const statusIcons = {
                            'pendente': '⏳',
                            'em_andamento': '🔄',
                            'concluido': '✅'
                        };
                        const statusLabels = {
                            'pendente': 'Pendente',
                            'em_andamento': 'Em Andamento',
                            'concluido': 'Concluído'
                        };
                        const statusIcon = statusIcons[status] || '⏳';
                        const statusLabel = statusLabels[status] || 'Pendente';
                        const strikeClass = status === 'concluido' ? 'completed' : '';
                        
                        let detalhes = [];
                        if (prazo) {
                            const prazoDate = new Date(prazo + 'T00:00:00');
                            detalhes.push(`📅 ${prazoDate.toLocaleDateString('pt-BR')}`);
                        }
                        if (responsavel) {
                            detalhes.push(`👤 ${responsavel}`);
                        }
                        
                        return `
                        <div class="task-item-detail status-${status}">
                            <div class="task-content">
                                <span class="task-status-icon" title="${statusLabel}">${statusIcon}</span>
                                <span class="task-text ${strikeClass}">${texto}</span>
                            </div>
                            ${detalhes.length > 0 ? `<div class="task-details-info">${detalhes.join(' | ')}</div>` : ''}
                            <button class="btn-delete-task" data-docid="${docId}" data-type="proximos_passos" data-index="${index}" title="Excluir">
                                <i class="fas fa-times"></i>
                            </button>
                        </div>
                        `;
                    }).join('')}
                </div>
                ` : '<p class="empty-text">Nenhum próximo passo definido.</p>'}
            </div>
            
            <div class="detail-section">
                <div class="tasks-header-actions">
                    <h3><i class="fas fa-flag-checkered"></i> Metas (${goals.length})</h3>
                    ${goals.length > 0 ? `
                    <button class="btn-clear-all-tasks" data-docid="${docId}" data-type="metas">
                        <i class="fas fa-broom"></i> Limpar todas
                    </button>
                    ` : ''}
                </div>
                ${goals.length > 0 ? `
                <div class="tasks-list-detail">
                    ${goals.map((goal, index) => `
                    <div class="task-item-detail">
                        <span class="task-text">${goal}</span>
                        <button class="btn-delete-task" data-docid="${docId}" data-type="metas" data-index="${index}" title="Excluir">
                            <i class="fas fa-times"></i>
                        </button>
                    </div>
                    `).join('')}
                </div>
                ` : '<p class="empty-text">Nenhuma meta definida.</p>'}
            </div>
            
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
            
            <div class="detail-actions">
                <button class="btn-secondary btn-export-actions" data-docid="${docId}">
                    <i class="fas fa-download"></i> Exportar Ações
                </button>
                <button class="btn-primary btn-edit-from-details" data-docid="${docId}">
                    <i class="fas fa-edit"></i> Editar Projeto
                </button>
            </div>
        `;
        
        // Event listener para excluir tarefa individual
        projectDetailsContent.querySelectorAll('.btn-delete-task').forEach(btn => {
            btn.addEventListener('click', async () => {
                const projectDocId = btn.dataset.docid;
                const type = btn.dataset.type;
                const index = parseInt(btn.dataset.index);
                
                await deleteTaskFromProject(projectDocId, type, index);
                showProjectDetails(projectDocId); // Recarregar detalhes
            });
        });
        
        // Event listener para limpar todas as tarefas de um tipo
        projectDetailsContent.querySelectorAll('.btn-clear-all-tasks').forEach(btn => {
            btn.addEventListener('click', async () => {
                const projectDocId = btn.dataset.docid;
                const type = btn.dataset.type;
                
                if (confirm(`Tem certeza que deseja limpar ${type === 'proximos_passos' ? 'todos os próximos passos' : 'todas as metas'}?`)) {
                    await clearAllTasksFromProject(projectDocId, type);
                    showProjectDetails(projectDocId); // Recarregar detalhes
                }
            });
        });
        
        // Event listener para exportar ações do projeto
        const exportActionsBtn = projectDetailsContent.querySelector('.btn-export-actions');
        if (exportActionsBtn) {
            exportActionsBtn.addEventListener('click', () => {
                if (typeof exportProjectActions === 'function') {
                    exportProjectActions(docId);
                }
            });
        }
        
        // Event listener para editar projeto
        const editBtn = projectDetailsContent.querySelector('.btn-edit-from-details');
        if (editBtn) {
            editBtn.addEventListener('click', () => {
                closeModal(projectDetailsModal);
                editProject(docId);
            });
        }
        
        openModal(projectDetailsModal);
    }
    
    // Excluir tarefa individual de um projeto
    async function deleteTaskFromProject(docId, type, index) {
        showLoading();
        try {
            const project = allProjects.find(p => p.docId === docId);
            if (!project) throw new Error('Projeto não encontrado');
            
            const tasks = [...(project[type] || [])];
            tasks.splice(index, 1);
            
            await db.collection('projects').doc(docId).update({
                [type]: tasks
            });
            
            showToast('Item removido!', 'success');
        } catch (error) {
            console.error('Erro ao remover item:', error);
            showToast('Erro ao remover item.', 'error');
        } finally {
            hideLoading();
        }
    }
    
    // Limpar todas as tarefas de um tipo de um projeto
    async function clearAllTasksFromProject(docId, type) {
        showLoading();
        try {
            await db.collection('projects').doc(docId).update({
                [type]: []
            });
            
            showToast(type === 'proximos_passos' ? 'Próximos passos limpos!' : 'Metas limpas!', 'success');
        } catch (error) {
            console.error('Erro ao limpar:', error);
            showToast('Erro ao limpar.', 'error');
        } finally {
            hideLoading();
        }
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
    // APAGAR TODOS OS PROJETOS
    // =====================================================
    
    const deleteAllModal = document.getElementById('delete-all-modal');
    const confirmDeleteAllInput = document.getElementById('confirm-delete-all-input');
    const confirmDeleteAllBtn = document.getElementById('confirm-delete-all-btn');
    const deleteAllCount = document.getElementById('delete-all-count');
    
    // Abrir modal de apagar todos
    const clearAllProjectsBtn = document.getElementById('clear-all-projects');
    if (clearAllProjectsBtn) {
        clearAllProjectsBtn.addEventListener('click', () => {
            if (deleteAllCount) {
                deleteAllCount.textContent = allProjects.length;
            }
            if (confirmDeleteAllInput) {
                confirmDeleteAllInput.value = '';
            }
            if (confirmDeleteAllBtn) {
                confirmDeleteAllBtn.disabled = true;
            }
            openModal(deleteAllModal);
        });
    }
    
    // Habilitar botão quando digitar CONFIRMAR
    if (confirmDeleteAllInput) {
        confirmDeleteAllInput.addEventListener('input', () => {
            const isValid = confirmDeleteAllInput.value.toUpperCase() === 'CONFIRMAR';
            confirmDeleteAllBtn.disabled = !isValid;
        });
    }
    
    // Confirmar exclusão de todos
    if (confirmDeleteAllBtn) {
        confirmDeleteAllBtn.addEventListener('click', async () => {
            if (confirmDeleteAllInput.value.toUpperCase() !== 'CONFIRMAR') return;
            
            showLoading();
            
            try {
                const batch = db.batch();
                
                // Deletar todos os projetos
                for (const project of allProjects) {
                    const ref = db.collection('projects').doc(project.docId);
                    batch.delete(ref);
                }
                
                await batch.commit();
                
                // Deletar comentários órfãos
                const commentsSnapshot = await db.collection('comments').get();
                const commentsBatch = db.batch();
                commentsSnapshot.forEach(doc => {
                    commentsBatch.delete(doc.ref);
                });
                await commentsBatch.commit();
                
                showToast('Todos os projetos foram apagados!', 'success');
                closeModal(deleteAllModal);
                confirmDeleteAllInput.value = '';
                confirmDeleteAllBtn.disabled = true;
            } catch (error) {
                console.error('Erro ao apagar projetos:', error);
                showToast('Erro ao apagar projetos.', 'error');
            } finally {
                hideLoading();
            }
        });
    }

    // =====================================================
    // LIMPAR TODAS AS TAREFAS
    // =====================================================
    
    const clearTasksModal = document.getElementById('clear-tasks-modal');
    const clearTasksProjectSelect = document.getElementById('clear-tasks-project');
    const specificProjectSelect = document.getElementById('specific-project-select');
    const confirmClearTasksBtn = document.getElementById('confirm-clear-tasks-btn');
    
    // Abrir modal de limpar tarefas
    const clearAllTasksBtn = document.getElementById('clear-all-tasks');
    if (clearAllTasksBtn) {
        clearAllTasksBtn.addEventListener('click', () => {
            // Preencher select de projetos
            if (clearTasksProjectSelect) {
                clearTasksProjectSelect.innerHTML = allProjects.map(p => 
                    `<option value="${p.docId}">${p.nome}</option>`
                ).join('');
            }
            
            // Resetar opção para "todos"
            const radioAll = document.querySelector('input[name="clear-tasks-option"][value="all"]');
            if (radioAll) radioAll.checked = true;
            if (specificProjectSelect) specificProjectSelect.style.display = 'none';
            
            openModal(clearTasksModal);
        });
    }
    
    // Mostrar/ocultar select de projeto específico
    document.querySelectorAll('input[name="clear-tasks-option"]').forEach(radio => {
        radio.addEventListener('change', () => {
            if (specificProjectSelect) {
                specificProjectSelect.style.display = radio.value === 'specific' ? 'block' : 'none';
            }
        });
    });
    
    // Confirmar limpeza de tarefas
    if (confirmClearTasksBtn) {
        confirmClearTasksBtn.addEventListener('click', async () => {
            const option = document.querySelector('input[name="clear-tasks-option"]:checked').value;
            
            showLoading();
            
            try {
                if (option === 'all') {
                    // Limpar tarefas de todos os projetos
                    const batch = db.batch();
                    
                    for (const project of allProjects) {
                        const ref = db.collection('projects').doc(project.docId);
                        batch.update(ref, { 
                            proximos_passos: [],
                            metas: []
                        });
                    }
                    
                    await batch.commit();
                    showToast('Tarefas de todos os projetos foram limpas!', 'success');
                } else {
                    // Limpar tarefas de um projeto específico
                    const projectId = clearTasksProjectSelect.value;
                    
                    await db.collection('projects').doc(projectId).update({
                        proximos_passos: [],
                        metas: []
                    });
                    
                    const project = allProjects.find(p => p.docId === projectId);
                    showToast(`Tarefas do projeto "${project?.nome}" foram limpas!`, 'success');
                }
                
                closeModal(clearTasksModal);
            } catch (error) {
                console.error('Erro ao limpar tarefas:', error);
                showToast('Erro ao limpar tarefas.', 'error');
            } finally {
                hideLoading();
            }
        });
    }
    
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
    
    // Botão único de exportação
    const exportBtn = document.getElementById('export-btn');
    if (exportBtn) {
        exportBtn.addEventListener('click', () => {
            if (typeof openExportModal === 'function') {
                openExportModal();
            } else {
                // Fallback: abrir modal diretamente
                const modal = document.getElementById('export-modal');
                if (modal) openModal(modal);
            }
        });
    }
    
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
    const statInProgressTasks = document.getElementById('stat-in-progress-tasks');
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
                
                // Compatibilidade: suporta string (formato antigo) ou objeto (novo formato)
                const isObject = typeof step === 'object';
                const texto = isObject ? (step.texto || '') : step;
                const stepStatus = isObject ? (step.status || 'pendente') : 'pendente';
                const stepPrazo = isObject ? (step.prazo || '') : '';
                const stepResponsavel = isObject ? (step.responsavel || '') : '';
                
                // Usa o status do próprio passo (se existir) ou do tasksState
                const finalStatus = isObject && step.status ? step.status : taskState.status;

                allTasks.push({
                    id: taskId,
                    text: texto,
                    stepStatus: stepStatus,
                    stepPrazo: stepPrazo,
                    stepResponsavel: stepResponsavel,
                    projectDocId: project.docId,
                    projectId: project.id,
                    projectName: project.nome || `Projeto ${project.id}`,
                    projectDeadline: project.prazo,
                    projectStatus: project.status,
                    taskIndex: index,
                    status: finalStatus,
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
        const inProgress = allTasks.filter(t => t.status === 'em_andamento').length;
        const completed = allTasks.filter(t => t.status === 'concluido').length;

        statTotalTasks.textContent = total;
        statPendingTasks.textContent = pending;
        statInProgressTasks.textContent = inProgress;
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
        const isEmAndamento = task.status === 'em_andamento';

        let statusIcon = '⏳';
        let statusClass = 'status-pendente';
        if (isEmAndamento) {
            statusIcon = '🔄';
            statusClass = 'status-em-andamento';
        } else if (isCompleted) {
            statusIcon = '✅';
            statusClass = 'status-concluido';
        } else if (isScheduled) {
            statusIcon = '📅';
            statusClass = 'status-agendado';
        }

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

        // Info de prazo individual do passo
        let stepDeadlineInfo = '';
        if (task.stepPrazo) {
            const stepDate = new Date(task.stepPrazo + 'T00:00:00');
            const today = new Date();
            today.setHours(0, 0, 0, 0);
            const diffDays = Math.ceil((stepDate - today) / (1000 * 60 * 60 * 24));
            let deadlineClass = '';
            if (diffDays < 0) {
                deadlineClass = 'overdue';
            } else if (diffDays <= 3) {
                deadlineClass = 'soon';
            }
            stepDeadlineInfo = `
                <span class="task-deadline ${deadlineClass}">
                    <i class="fas fa-calendar-day"></i>
                    ${stepDate.toLocaleDateString('pt-BR')}
                </span>
            `;
        }

        // Info de responsável do passo
        let responsavelInfo = '';
        if (task.stepResponsavel) {
            responsavelInfo = `
                <span class="task-responsavel">
                    <i class="fas fa-user"></i>
                    ${task.stepResponsavel}
                </span>
            `;
        }

        return `
            <div class="task-item ${isCompleted ? 'completed' : ''} ${isScheduled ? 'scheduled' : ''} ${isEmAndamento ? 'em-andamento' : ''}" data-task-id="${task.id}">
                <div class="task-item-header">
                    <div class="task-checkbox ${isCompleted ? 'checked' : ''}" data-task-id="${task.id}"></div>
                    <div class="task-status-indicator ${statusClass}" title="${task.status}">${statusIcon}</div>
                    <div class="task-text">${task.text}</div>
                </div>
                <div class="task-meta">
                    <span class="task-project-tag">
                        <i class="fas fa-hashtag"></i>
                        Projeto ${task.projectId}
                    </span>
                    ${stepDeadlineInfo}
                    ${responsavelInfo}
                    ${deadlineInfo.text && !stepDeadlineInfo ? `
                        <span class="task-deadline ${deadlineInfo.class}">
                            <i class="fas fa-clock"></i>
                            ${deadlineInfo.text}
                        </span>
                    ` : ''}
                    ${scheduledInfo}
                </div>
                <div class="task-actions">
                    <select class="task-status-select" data-task-id="${task.id}" data-project-doc-id="${task.projectDocId}" data-task-index="${task.taskIndex}">
                        <option value="pendente" ${task.status === 'pendente' ? 'selected' : ''}>⏳ Pendente</option>
                        <option value="em_andamento" ${task.status === 'em_andamento' ? 'selected' : ''}>🔄 Em Andamento</option>
                        <option value="concluido" ${task.status === 'concluido' ? 'selected' : ''}>✅ Concluído</option>
                    </select>
                    <button class="btn-task-action btn-schedule" data-task-id="${task.id}" data-project-id="${task.projectDocId}" data-text="${encodeURIComponent(task.text)}" data-project-name="${encodeURIComponent(task.projectName)}">
                        <i class="fas fa-calendar-plus"></i>
                        ${isScheduled ? 'Reagendar' : 'Agendar'}
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

        // Status select - salvar diretamente no projeto
        document.querySelectorAll('.task-status-select').forEach(select => {
            select.addEventListener('change', async (e) => {
                const taskId = e.target.dataset.taskId;
                const projectDocId = e.target.dataset.projectDocId;
                const taskIndex = parseInt(e.target.dataset.taskIndex);
                const newStatus = e.target.value;
                
                try {
                    // Buscar projeto atual
                    const project = allProjects.find(p => p.docId === projectDocId);
                    if (!project) return;
                    
                    // Atualizar o status do passo
                    const steps = [...(project.proximos_passos || [])];
                    if (steps[taskIndex]) {
                        // Se for string antiga, converter para objeto
                        if (typeof steps[taskIndex] === 'string') {
                            steps[taskIndex] = {
                                texto: steps[taskIndex],
                                status: newStatus,
                                prazo: '',
                                responsavel: ''
                            };
                        } else {
                            steps[taskIndex].status = newStatus;
                        }
                        
                        // Salvar no Firebase
                        await db.collection('projects').doc(projectDocId).update({
                            proximos_passos: steps
                        });
                        
                        showToast(`Status atualizado para "${newStatus.replace('_', ' ')}"!`, 'success');
                    }
                } catch (error) {
                    console.error('Erro ao atualizar status:', error);
                    showToast('Erro ao atualizar status.', 'error');
                }
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
