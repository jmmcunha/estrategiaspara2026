/**
 * CONFIGURAÇÕES DO PAINEL
 * =======================
 * Personalização de cores, textos e notificações
 */

// Configurações padrão
const defaultSettings = {
    colors: {
        primary: '#58a6ff',
        sidebar: '#161b22',
        background: '#0d1117',
        cards: '#161b22',
        statusAndamento: '#58a6ff',
        statusConcluido: '#3fb950',
        statusPlanejado: '#d29922',
        statusSuspenso: '#f85149'
    },
    texts: {
        mainTitle: 'Painel Executivo',
        subtitle: 'Projetos Estratégicos',
        pageTitle: 'Visão Geral dos Projetos',
        cardTotal: 'Projetos Totais',
        cardOngoing: 'Em Andamento',
        cardCompleted: 'Concluídos',
        cardPlanned: 'Planejados',
        orgName: '',
        reportHeader: ''
    },
    notifications: {
        email: '',
        deadline7: true,
        deadline3: true,
        deadline1: true,
        deadlineDay: false,
        overdue: true,
        emailjsPublicKey: '',
        emailjsServiceId: '',
        emailjsTemplateId: ''
    }
};

// Temas predefinidos
const themes = {
    dark: {
        primary: '#58a6ff',
        sidebar: '#161b22',
        background: '#0d1117',
        cards: '#161b22',
        statusAndamento: '#58a6ff',
        statusConcluido: '#3fb950',
        statusPlanejado: '#d29922',
        statusSuspenso: '#f85149'
    },
    light: {
        primary: '#0969da',
        sidebar: '#f6f8fa',
        background: '#ffffff',
        cards: '#f6f8fa',
        statusAndamento: '#0969da',
        statusConcluido: '#1a7f37',
        statusPlanejado: '#9a6700',
        statusSuspenso: '#cf222e'
    },
    blue: {
        primary: '#2563eb',
        sidebar: '#1e3a5f',
        background: '#0f172a',
        cards: '#1e3a5f',
        statusAndamento: '#3b82f6',
        statusConcluido: '#22c55e',
        statusPlanejado: '#eab308',
        statusSuspenso: '#ef4444'
    },
    green: {
        primary: '#10b981',
        sidebar: '#14532d',
        background: '#052e16',
        cards: '#14532d',
        statusAndamento: '#10b981',
        statusConcluido: '#22c55e',
        statusPlanejado: '#fbbf24',
        statusSuspenso: '#f87171'
    }
};

// Estado atual das configurações
let currentSettings = JSON.parse(JSON.stringify(defaultSettings));

// Carregar configurações do Firebase
async function loadSettings() {
    try {
        const doc = await db.collection('settings').doc('config').get();
        if (doc.exists) {
            const saved = doc.data();
            currentSettings = mergeDeep(defaultSettings, saved);
        }
        applySettings();
        populateSettingsForm();
    } catch (error) {
        console.error('Erro ao carregar configurações:', error);
        applySettings();
    }
}

// Salvar configurações no Firebase
async function saveSettings() {
    try {
        await db.collection('settings').doc('config').set(currentSettings);
        showToast('Configurações salvas com sucesso!', 'success');
    } catch (error) {
        console.error('Erro ao salvar configurações:', error);
        showToast('Erro ao salvar configurações.', 'error');
    }
}

// Aplicar configurações na interface
function applySettings() {
    const root = document.documentElement;
    const colors = currentSettings.colors;
    const texts = currentSettings.texts;

    // Aplicar cores
    root.style.setProperty('--accent-primary', colors.primary);
    root.style.setProperty('--sidebar-bg', colors.sidebar);
    root.style.setProperty('--main-bg', colors.background);
    root.style.setProperty('--card-bg', hexToRgba(colors.cards, 0.8));
    root.style.setProperty('--card-bg-hover', hexToRgba(colors.cards, 0.95));
    root.style.setProperty('--status-andamento', colors.statusAndamento);
    root.style.setProperty('--status-concluido', colors.statusConcluido);
    root.style.setProperty('--status-planejado', colors.statusPlanejado);
    root.style.setProperty('--status-suspenso', colors.statusSuspenso);

    // Detectar se é tema claro
    const isLight = isLightColor(colors.background);
    if (isLight) {
        root.style.setProperty('--text-color', '#1f2937');
        root.style.setProperty('--text-secondary', '#4b5563');
        root.style.setProperty('--text-muted', '#6b7280');
        root.style.setProperty('--border-color', '#e5e7eb');
        root.style.setProperty('--table-header-bg', '#f3f4f6');
        root.style.setProperty('--table-row-bg', hexToRgba(colors.cards, 0.5));
        document.body.classList.add('light-theme');
    } else {
        root.style.setProperty('--text-color', '#e6edf3');
        root.style.setProperty('--text-secondary', '#8b949e');
        root.style.setProperty('--text-muted', '#6e7681');
        root.style.setProperty('--border-color', '#30363d');
        root.style.setProperty('--table-header-bg', '#21262d');
        root.style.setProperty('--table-row-bg', hexToRgba(colors.cards, 0.6));
        document.body.classList.remove('light-theme');
    }

    // Aplicar textos
    const sidebarTitle = document.getElementById('sidebar-title');
    const sidebarSubtitle = document.getElementById('sidebar-subtitle');
    const mainTitle = document.getElementById('main-title');
    const loginTitle = document.getElementById('login-title');
    const loginSubtitle = document.getElementById('login-subtitle');
    const pageTitle = document.getElementById('page-title');

    if (sidebarTitle) sidebarTitle.textContent = texts.mainTitle;
    if (sidebarSubtitle) sidebarSubtitle.textContent = texts.subtitle;
    if (mainTitle) mainTitle.textContent = texts.pageTitle;
    if (loginTitle) loginTitle.textContent = texts.mainTitle;
    if (loginSubtitle) loginSubtitle.textContent = texts.subtitle;
    if (pageTitle) pageTitle.textContent = `${texts.mainTitle} - ${texts.subtitle}`;

    // Aplicar labels dos cards
    const cards = document.querySelectorAll('.card-content p');
    if (cards.length >= 4) {
        cards[0].textContent = texts.cardTotal;
        cards[1].textContent = texts.cardOngoing;
        cards[2].textContent = texts.cardCompleted;
        cards[3].textContent = texts.cardPlanned;
    }
}

// Preencher formulário de configurações
function populateSettingsForm() {
    const colors = currentSettings.colors;
    const texts = currentSettings.texts;
    const notif = currentSettings.notifications;

    // Cores
    setColorInput('color-primary', colors.primary);
    setColorInput('color-sidebar', colors.sidebar);
    setColorInput('color-background', colors.background);
    setColorInput('color-cards', colors.cards);
    setColorInput('color-status-andamento', colors.statusAndamento);
    setColorInput('color-status-concluido', colors.statusConcluido);
    setColorInput('color-status-planejado', colors.statusPlanejado);
    setColorInput('color-status-suspenso', colors.statusSuspenso);

    // Textos
    setInputValue('text-main-title', texts.mainTitle);
    setInputValue('text-subtitle', texts.subtitle);
    setInputValue('text-page-title', texts.pageTitle);
    setInputValue('text-card-total', texts.cardTotal);
    setInputValue('text-card-ongoing', texts.cardOngoing);
    setInputValue('text-card-completed', texts.cardCompleted);
    setInputValue('text-card-planned', texts.cardPlanned);
    setInputValue('text-org-name', texts.orgName);
    setInputValue('text-report-header', texts.reportHeader);

    // Notificações
    setInputValue('notification-email', notif.email);
    setCheckbox('notify-deadline-7', notif.deadline7);
    setCheckbox('notify-deadline-3', notif.deadline3);
    setCheckbox('notify-deadline-1', notif.deadline1);
    setCheckbox('notify-deadline-day', notif.deadlineDay);
    setCheckbox('notify-overdue', notif.overdue);
    setInputValue('emailjs-public-key', notif.emailjsPublicKey);
    setInputValue('emailjs-service-id', notif.emailjsServiceId);
    setInputValue('emailjs-template-id', notif.emailjsTemplateId);
}

// Coletar dados do formulário
function collectSettingsFromForm() {
    currentSettings.colors = {
        primary: getColorValue('color-primary'),
        sidebar: getColorValue('color-sidebar'),
        background: getColorValue('color-background'),
        cards: getColorValue('color-cards'),
        statusAndamento: getColorValue('color-status-andamento'),
        statusConcluido: getColorValue('color-status-concluido'),
        statusPlanejado: getColorValue('color-status-planejado'),
        statusSuspenso: getColorValue('color-status-suspenso')
    };

    currentSettings.texts = {
        mainTitle: getInputValue('text-main-title'),
        subtitle: getInputValue('text-subtitle'),
        pageTitle: getInputValue('text-page-title'),
        cardTotal: getInputValue('text-card-total'),
        cardOngoing: getInputValue('text-card-ongoing'),
        cardCompleted: getInputValue('text-card-completed'),
        cardPlanned: getInputValue('text-card-planned'),
        orgName: getInputValue('text-org-name'),
        reportHeader: getInputValue('text-report-header')
    };

    currentSettings.notifications = {
        email: getInputValue('notification-email'),
        deadline7: getCheckbox('notify-deadline-7'),
        deadline3: getCheckbox('notify-deadline-3'),
        deadline1: getCheckbox('notify-deadline-1'),
        deadlineDay: getCheckbox('notify-deadline-day'),
        overdue: getCheckbox('notify-overdue'),
        emailjsPublicKey: getInputValue('emailjs-public-key'),
        emailjsServiceId: getInputValue('emailjs-service-id'),
        emailjsTemplateId: getInputValue('emailjs-template-id')
    };
}

// Aplicar tema predefinido
function applyTheme(themeName) {
    if (themes[themeName]) {
        currentSettings.colors = { ...themes[themeName] };
        populateSettingsForm();
        applySettings();
    }
}

// Restaurar padrões
function resetSettings() {
    currentSettings = JSON.parse(JSON.stringify(defaultSettings));
    populateSettingsForm();
    applySettings();
    showToast('Configurações restauradas para o padrão.', 'info');
}

// Utilitários
function setColorInput(id, value) {
    const colorInput = document.getElementById(id);
    const hexInput = document.getElementById(`${id}-hex`);
    if (colorInput) colorInput.value = value;
    if (hexInput) hexInput.value = value;
}

function getColorValue(id) {
    const hexInput = document.getElementById(`${id}-hex`);
    return hexInput ? hexInput.value : '#000000';
}

function setInputValue(id, value) {
    const input = document.getElementById(id);
    if (input) input.value = value || '';
}

function getInputValue(id) {
    const input = document.getElementById(id);
    return input ? input.value : '';
}

function setCheckbox(id, value) {
    const checkbox = document.getElementById(id);
    if (checkbox) checkbox.checked = value;
}

function getCheckbox(id) {
    const checkbox = document.getElementById(id);
    return checkbox ? checkbox.checked : false;
}

function hexToRgba(hex, alpha) {
    const r = parseInt(hex.slice(1, 3), 16);
    const g = parseInt(hex.slice(3, 5), 16);
    const b = parseInt(hex.slice(5, 7), 16);
    return `rgba(${r}, ${g}, ${b}, ${alpha})`;
}

function isLightColor(hex) {
    const r = parseInt(hex.slice(1, 3), 16);
    const g = parseInt(hex.slice(3, 5), 16);
    const b = parseInt(hex.slice(5, 7), 16);
    const luminance = (0.299 * r + 0.587 * g + 0.114 * b) / 255;
    return luminance > 0.5;
}

function mergeDeep(target, source) {
    const output = { ...target };
    for (const key in source) {
        if (source[key] instanceof Object && key in target) {
            output[key] = mergeDeep(target[key], source[key]);
        } else {
            output[key] = source[key];
        }
    }
    return output;
}

// Inicialização dos event listeners de configurações
function initSettingsListeners() {
    const settingsBtn = document.getElementById('settings-btn');
    const settingsModal = document.getElementById('settings-modal');
    const settingsForm = document.getElementById('settings-form');
    const resetBtn = document.getElementById('reset-settings-btn');
    const testEmailBtn = document.getElementById('test-email-btn');

    // Abrir modal
    if (settingsBtn) {
        settingsBtn.addEventListener('click', () => {
            populateSettingsForm();
            openModal(settingsModal);
        });
    }

    // Salvar configurações
    if (settingsForm) {
        settingsForm.addEventListener('submit', async (e) => {
            e.preventDefault();
            collectSettingsFromForm();
            applySettings();
            await saveSettings();
            closeModal(settingsModal);
        });
    }

    // Restaurar padrões
    if (resetBtn) {
        resetBtn.addEventListener('click', resetSettings);
    }

    // Testar e-mail
    if (testEmailBtn) {
        testEmailBtn.addEventListener('click', testEmailSend);
    }

    // Abas
    document.querySelectorAll('.tab-btn').forEach(btn => {
        btn.addEventListener('click', () => {
            const tabId = btn.dataset.tab;
            
            document.querySelectorAll('.tab-btn').forEach(b => b.classList.remove('active'));
            document.querySelectorAll('.tab-content').forEach(c => c.classList.remove('active'));
            
            btn.classList.add('active');
            document.getElementById(`tab-${tabId}`).classList.add('active');
        });
    });

    // Temas predefinidos
    document.querySelectorAll('.theme-btn').forEach(btn => {
        btn.addEventListener('click', () => {
            applyTheme(btn.dataset.theme);
        });
    });

    // Sincronizar inputs de cor
    document.querySelectorAll('input[type="color"]').forEach(colorInput => {
        const hexInput = document.getElementById(`${colorInput.id}-hex`);
        
        colorInput.addEventListener('input', () => {
            if (hexInput) hexInput.value = colorInput.value;
        });

        if (hexInput) {
            hexInput.addEventListener('input', () => {
                if (/^#[0-9A-Fa-f]{6}$/.test(hexInput.value)) {
                    colorInput.value = hexInput.value;
                }
            });
        }
    });
}

// Teste de envio de e-mail
async function testEmailSend() {
    const publicKey = getInputValue('emailjs-public-key');
    const serviceId = getInputValue('emailjs-service-id');
    const templateId = getInputValue('emailjs-template-id');
    const email = getInputValue('notification-email');

    if (!publicKey || !serviceId || !templateId || !email) {
        showToast('Preencha todas as configurações do EmailJS e o e-mail.', 'warning');
        return;
    }

    try {
        emailjs.init(publicKey);
        
        await emailjs.send(serviceId, templateId, {
            to_email: email,
            subject: 'Teste de Notificação - Painel Executivo',
            message: 'Este é um e-mail de teste do seu Painel Executivo de Projetos. Se você recebeu este e-mail, as notificações estão funcionando corretamente!'
        });

        showToast('E-mail de teste enviado com sucesso!', 'success');
    } catch (error) {
        console.error('Erro ao enviar e-mail:', error);
        showToast('Erro ao enviar e-mail. Verifique as configurações.', 'error');
    }
}

// Enviar notificação de prazo
async function sendDeadlineNotification(project, daysUntil) {
    const notif = currentSettings.notifications;
    
    if (!notif.email || !notif.emailjsPublicKey || !notif.emailjsServiceId || !notif.emailjsTemplateId) {
        return;
    }

    let message = '';
    if (daysUntil < 0) {
        message = `O projeto "${project.nome}" está com prazo vencido há ${Math.abs(daysUntil)} dia(s).`;
    } else if (daysUntil === 0) {
        message = `O projeto "${project.nome}" vence HOJE!`;
    } else {
        message = `O projeto "${project.nome}" vence em ${daysUntil} dia(s).`;
    }

    try {
        emailjs.init(notif.emailjsPublicKey);
        
        await emailjs.send(notif.emailjsServiceId, notif.emailjsTemplateId, {
            to_email: notif.email,
            subject: `[Painel Executivo] Alerta de Prazo - ${project.nome}`,
            message: message,
            project_name: project.nome,
            deadline: project.prazo,
            status: project.status,
            progress: project.progresso + '%'
        });

        console.log('Notificação enviada:', project.nome);
    } catch (error) {
        console.error('Erro ao enviar notificação:', error);
    }
}

// Verificar prazos e enviar notificações
async function checkDeadlinesAndNotify(projects) {
    const notif = currentSettings.notifications;
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    for (const project of projects) {
        if (!project.prazo || project.status === 'Concluído') continue;

        const deadline = parseDate(project.prazo);
        if (!deadline) continue;

        const diffDays = Math.ceil((deadline - today) / (1000 * 60 * 60 * 24));

        // Verificar se já notificamos hoje
        const notifiedKey = `notified_${project.docId}_${today.toISOString().split('T')[0]}`;
        const alreadyNotified = localStorage.getItem(notifiedKey);
        if (alreadyNotified) continue;

        let shouldNotify = false;

        if (diffDays < 0 && notif.overdue) shouldNotify = true;
        if (diffDays === 0 && notif.deadlineDay) shouldNotify = true;
        if (diffDays === 1 && notif.deadline1) shouldNotify = true;
        if (diffDays === 3 && notif.deadline3) shouldNotify = true;
        if (diffDays === 7 && notif.deadline7) shouldNotify = true;

        if (shouldNotify) {
            await sendDeadlineNotification(project, diffDays);
            localStorage.setItem(notifiedKey, 'true');
        }
    }
}

// Exportar funções
window.loadSettings = loadSettings;
window.currentSettings = currentSettings;
window.checkDeadlinesAndNotify = checkDeadlinesAndNotify;
window.initSettingsListeners = initSettingsListeners;
