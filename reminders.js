/**
 * LEMBRETES RECORRENTES
 * =====================
 * Gerenciamento de lembretes com recorrência
 */

let allReminders = [];
let unsubscribeReminders = null;

// Inicializar listeners de lembretes
function initRemindersListeners() {
    const openRemindersBtn = document.getElementById('open-reminders-btn');
    const remindersModal = document.getElementById('reminders-modal');
    const addReminderBtn = document.getElementById('add-reminder-btn');
    const reminderFormModal = document.getElementById('reminder-form-modal');
    const reminderForm = document.getElementById('reminder-form');
    const recurrenceSelect = document.getElementById('reminder-recurrence');

    // Abrir modal de lembretes
    if (openRemindersBtn) {
        openRemindersBtn.addEventListener('click', () => {
            openModal(remindersModal);
        });
    }

    // Adicionar novo lembrete
    if (addReminderBtn) {
        addReminderBtn.addEventListener('click', () => {
            resetReminderForm();
            document.getElementById('reminder-modal-title').textContent = 'Novo Lembrete';
            populateProjectsSelect();
            openModal(reminderFormModal);
        });
    }

    // Mostrar/ocultar opções de recorrência
    if (recurrenceSelect) {
        recurrenceSelect.addEventListener('change', () => {
            const options = document.getElementById('recurrence-options');
            if (recurrenceSelect.value !== 'none') {
                options.classList.remove('hidden');
            } else {
                options.classList.add('hidden');
            }
        });
    }

    // Salvar lembrete
    if (reminderForm) {
        reminderForm.addEventListener('submit', async (e) => {
            e.preventDefault();
            await saveReminder();
        });
    }
}

// Carregar lembretes do Firebase
function startRemindersListener() {
    if (unsubscribeReminders) unsubscribeReminders();

    unsubscribeReminders = db.collection('reminders')
        .orderBy('date', 'asc')
        .onSnapshot((snapshot) => {
            allReminders = [];
            snapshot.forEach((doc) => {
                allReminders.push({ docId: doc.id, ...doc.data() });
            });
            renderReminders();
            updateRemindersCount();
            checkRemindersToday();
        }, (error) => {
            console.error('Erro ao carregar lembretes:', error);
        });
}

// Renderizar lista de lembretes
function renderReminders() {
    const list = document.getElementById('reminders-list');
    if (!list) return;

    if (allReminders.length === 0) {
        list.innerHTML = `
            <div class="empty-state">
                <i class="fas fa-bell-slash"></i>
                <p>Nenhum lembrete cadastrado.</p>
            </div>
        `;
        return;
    }

    const today = new Date();
    today.setHours(0, 0, 0, 0);

    // Agrupar por período
    const overdue = [];
    const todayReminders = [];
    const upcoming = [];
    const future = [];

    allReminders.forEach(reminder => {
        const date = new Date(reminder.date);
        date.setHours(0, 0, 0, 0);
        const diffDays = Math.ceil((date - today) / (1000 * 60 * 60 * 24));

        if (diffDays < 0) overdue.push(reminder);
        else if (diffDays === 0) todayReminders.push(reminder);
        else if (diffDays <= 7) upcoming.push(reminder);
        else future.push(reminder);
    });

    let html = '';

    if (overdue.length > 0) {
        html += renderReminderGroup('Atrasados', overdue, 'overdue');
    }
    if (todayReminders.length > 0) {
        html += renderReminderGroup('Hoje', todayReminders, 'today');
    }
    if (upcoming.length > 0) {
        html += renderReminderGroup('Próximos 7 dias', upcoming, 'upcoming');
    }
    if (future.length > 0) {
        html += renderReminderGroup('Futuros', future, 'future');
    }

    list.innerHTML = html;

    // Event listeners
    list.querySelectorAll('.btn-edit-reminder').forEach(btn => {
        btn.addEventListener('click', () => editReminder(btn.dataset.id));
    });

    list.querySelectorAll('.btn-delete-reminder').forEach(btn => {
        btn.addEventListener('click', () => deleteReminder(btn.dataset.id));
    });

    list.querySelectorAll('.btn-complete-reminder').forEach(btn => {
        btn.addEventListener('click', () => completeReminder(btn.dataset.id));
    });

    list.querySelectorAll('.btn-calendar-reminder').forEach(btn => {
        btn.addEventListener('click', () => openReminderInCalendar(btn.dataset.id));
    });
}

function renderReminderGroup(title, reminders, className) {
    const recurrenceLabels = {
        'none': '',
        'daily': 'Diário',
        'weekly': 'Semanal',
        'biweekly': 'Quinzenal',
        'monthly': 'Mensal'
    };

    let html = `
        <div class="reminder-group ${className}">
            <h3 class="reminder-group-title">${title} <span>(${reminders.length})</span></h3>
    `;

    reminders.forEach(reminder => {
        const date = new Date(reminder.date);
        const dateStr = date.toLocaleDateString('pt-BR');
        const timeStr = reminder.time || '';
        const recurrence = recurrenceLabels[reminder.recurrence] || '';
        const projectName = reminder.projectName || '';

        html += `
            <div class="reminder-item ${reminder.completed ? 'completed' : ''}">
                <div class="reminder-content">
                    <div class="reminder-header">
                        <h4>${reminder.title}</h4>
                        ${recurrence ? `<span class="recurrence-badge"><i class="fas fa-repeat"></i> ${recurrence}</span>` : ''}
                    </div>
                    ${reminder.description ? `<p class="reminder-description">${reminder.description}</p>` : ''}
                    <div class="reminder-meta">
                        <span class="reminder-date">
                            <i class="fas fa-calendar"></i> ${dateStr} ${timeStr ? `às ${timeStr}` : ''}
                        </span>
                        ${projectName ? `<span class="reminder-project"><i class="fas fa-folder"></i> ${projectName}</span>` : ''}
                    </div>
                </div>
                <div class="reminder-actions">
                    <button class="btn-icon btn-complete-reminder" data-id="${reminder.docId}" title="Marcar como concluído">
                        <i class="fas ${reminder.completed ? 'fa-undo' : 'fa-check'}"></i>
                    </button>
                    <button class="btn-icon btn-calendar-reminder" data-id="${reminder.docId}" title="Abrir no Calendar">
                        <i class="fab fa-google"></i>
                    </button>
                    <button class="btn-icon btn-edit-reminder" data-id="${reminder.docId}" title="Editar">
                        <i class="fas fa-edit"></i>
                    </button>
                    <button class="btn-icon btn-delete-reminder" data-id="${reminder.docId}" title="Excluir">
                        <i class="fas fa-trash"></i>
                    </button>
                </div>
            </div>
        `;
    });

    html += '</div>';
    return html;
}

// Atualizar contador de lembretes
function updateRemindersCount() {
    const badge = document.getElementById('reminders-count');
    if (!badge) return;

    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const pending = allReminders.filter(r => {
        if (r.completed) return false;
        const date = new Date(r.date);
        date.setHours(0, 0, 0, 0);
        return date <= today;
    }).length;

    badge.textContent = pending;
    badge.style.display = pending > 0 ? 'block' : 'none';
}

// Preencher select de projetos
function populateProjectsSelect() {
    const select = document.getElementById('reminder-project');
    if (!select) return;

    select.innerHTML = '<option value="">Nenhum (lembrete geral)</option>';
    
    if (typeof allProjects !== 'undefined') {
        allProjects.forEach(project => {
            const option = document.createElement('option');
            option.value = project.docId;
            option.textContent = project.nome || `Projeto ${project.id}`;
            select.appendChild(option);
        });
    }
}

// Resetar formulário
function resetReminderForm() {
    const form = document.getElementById('reminder-form');
    if (form) form.reset();
    
    document.getElementById('reminder-id').value = '';
    
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    document.getElementById('reminder-date').value = tomorrow.toISOString().split('T')[0];
    
    document.getElementById('recurrence-options').classList.add('hidden');
}

// Salvar lembrete
async function saveReminder() {
    showLoading();

    const docId = document.getElementById('reminder-id').value;
    const projectId = document.getElementById('reminder-project').value;
    
    let projectName = '';
    if (projectId && typeof allProjects !== 'undefined') {
        const project = allProjects.find(p => p.docId === projectId);
        if (project) projectName = project.nome;
    }

    const reminderData = {
        title: document.getElementById('reminder-title').value.trim(),
        description: document.getElementById('reminder-description').value.trim(),
        projectId: projectId,
        projectName: projectName,
        date: document.getElementById('reminder-date').value,
        time: document.getElementById('reminder-time').value,
        recurrence: document.getElementById('reminder-recurrence').value,
        endDate: document.getElementById('reminder-end-date').value || null,
        notify: document.getElementById('reminder-notify').checked,
        addToCalendar: document.getElementById('reminder-calendar').checked,
        completed: false,
        updatedAt: firebase.firestore.FieldValue.serverTimestamp()
    };

    try {
        if (docId) {
            await db.collection('reminders').doc(docId).update(reminderData);
            showToast('Lembrete atualizado!', 'success');
        } else {
            reminderData.createdAt = firebase.firestore.FieldValue.serverTimestamp();
            const docRef = await db.collection('reminders').add(reminderData);

            // Criar próximas ocorrências se for recorrente
            if (reminderData.recurrence !== 'none') {
                await createRecurringReminders(docRef.id, reminderData);
            }

            // Abrir no Google Calendar se solicitado
            if (reminderData.addToCalendar) {
                openReminderInCalendarDirect(reminderData);
            }

            showToast('Lembrete criado!', 'success');
        }

        closeModal(document.getElementById('reminder-form-modal'));
        resetReminderForm();
    } catch (error) {
        console.error('Erro ao salvar lembrete:', error);
        showToast('Erro ao salvar lembrete.', 'error');
    } finally {
        hideLoading();
    }
}

// Criar lembretes recorrentes
async function createRecurringReminders(parentId, data) {
    if (!data.endDate) return;

    const startDate = new Date(data.date);
    const endDate = new Date(data.endDate);
    const batch = db.batch();
    let currentDate = new Date(startDate);
    let count = 0;
    const maxOccurrences = 52; // Máximo de 1 ano semanal

    while (currentDate <= endDate && count < maxOccurrences) {
        // Avançar para próxima data
        switch (data.recurrence) {
            case 'daily':
                currentDate.setDate(currentDate.getDate() + 1);
                break;
            case 'weekly':
                currentDate.setDate(currentDate.getDate() + 7);
                break;
            case 'biweekly':
                currentDate.setDate(currentDate.getDate() + 14);
                break;
            case 'monthly':
                currentDate.setMonth(currentDate.getMonth() + 1);
                break;
        }

        if (currentDate > endDate) break;

        const occurrence = {
            ...data,
            date: currentDate.toISOString().split('T')[0],
            parentId: parentId,
            createdAt: firebase.firestore.FieldValue.serverTimestamp()
        };

        const docRef = db.collection('reminders').doc();
        batch.set(docRef, occurrence);
        count++;
    }

    if (count > 0) {
        await batch.commit();
        showToast(`${count} ocorrências recorrentes criadas.`, 'info');
    }
}

// Editar lembrete
function editReminder(docId) {
    const reminder = allReminders.find(r => r.docId === docId);
    if (!reminder) return;

    document.getElementById('reminder-id').value = docId;
    document.getElementById('reminder-title').value = reminder.title;
    document.getElementById('reminder-description').value = reminder.description || '';
    document.getElementById('reminder-date').value = reminder.date;
    document.getElementById('reminder-time').value = reminder.time || '09:00';
    document.getElementById('reminder-recurrence').value = reminder.recurrence || 'none';
    document.getElementById('reminder-end-date').value = reminder.endDate || '';
    document.getElementById('reminder-notify').checked = reminder.notify !== false;
    document.getElementById('reminder-calendar').checked = reminder.addToCalendar || false;

    populateProjectsSelect();
    document.getElementById('reminder-project').value = reminder.projectId || '';

    if (reminder.recurrence && reminder.recurrence !== 'none') {
        document.getElementById('recurrence-options').classList.remove('hidden');
    }

    document.getElementById('reminder-modal-title').textContent = 'Editar Lembrete';
    openModal(document.getElementById('reminder-form-modal'));
}

// Excluir lembrete
async function deleteReminder(docId) {
    if (!confirm('Deseja excluir este lembrete?')) return;

    try {
        await db.collection('reminders').doc(docId).delete();
        showToast('Lembrete excluído.', 'info');
    } catch (error) {
        console.error('Erro ao excluir lembrete:', error);
        showToast('Erro ao excluir lembrete.', 'error');
    }
}

// Marcar como concluído
async function completeReminder(docId) {
    const reminder = allReminders.find(r => r.docId === docId);
    if (!reminder) return;

    try {
        await db.collection('reminders').doc(docId).update({
            completed: !reminder.completed,
            completedAt: !reminder.completed ? firebase.firestore.FieldValue.serverTimestamp() : null
        });

        showToast(
            reminder.completed ? 'Lembrete reaberto.' : 'Lembrete concluído!',
            reminder.completed ? 'info' : 'success'
        );
    } catch (error) {
        console.error('Erro ao atualizar lembrete:', error);
        showToast('Erro ao atualizar lembrete.', 'error');
    }
}

// Abrir lembrete no Google Calendar
function openReminderInCalendar(docId) {
    const reminder = allReminders.find(r => r.docId === docId);
    if (!reminder) return;
    openReminderInCalendarDirect(reminder);
}

function openReminderInCalendarDirect(reminder) {
    const startDateTime = new Date(`${reminder.date}T${reminder.time || '09:00'}`);
    const endDateTime = new Date(startDateTime.getTime() + 60 * 60000); // 1 hora

    const formatDate = (d) => {
        const pad = n => n.toString().padStart(2, '0');
        return `${d.getFullYear()}${pad(d.getMonth() + 1)}${pad(d.getDate())}T${pad(d.getHours())}${pad(d.getMinutes())}00`;
    };

    const params = new URLSearchParams({
        action: 'TEMPLATE',
        text: reminder.title,
        dates: `${formatDate(startDateTime)}/${formatDate(endDateTime)}`,
        details: reminder.description || '',
        trp: 'false'
    });

    // Adicionar recorrência
    if (reminder.recurrence && reminder.recurrence !== 'none') {
        let rrule = '';
        switch (reminder.recurrence) {
            case 'daily': rrule = 'RRULE:FREQ=DAILY'; break;
            case 'weekly': rrule = 'RRULE:FREQ=WEEKLY'; break;
            case 'biweekly': rrule = 'RRULE:FREQ=WEEKLY;INTERVAL=2'; break;
            case 'monthly': rrule = 'RRULE:FREQ=MONTHLY'; break;
        }
        if (rrule && reminder.endDate) {
            const endDate = new Date(reminder.endDate);
            rrule += `;UNTIL=${endDate.toISOString().replace(/[-:]/g, '').split('.')[0]}Z`;
        }
        params.append('recur', rrule);
    }

    window.open(`https://calendar.google.com/calendar/render?${params.toString()}`, '_blank');
}

// Verificar lembretes de hoje e notificar
async function checkRemindersToday() {
    const today = new Date().toISOString().split('T')[0];
    const notif = window.currentSettings?.notifications;
    
    if (!notif?.email || !notif?.emailjsPublicKey) return;

    const todayReminders = allReminders.filter(r => 
        r.date === today && !r.completed && r.notify
    );

    for (const reminder of todayReminders) {
        const notifiedKey = `reminder_notified_${reminder.docId}_${today}`;
        if (localStorage.getItem(notifiedKey)) continue;

        try {
            emailjs.init(notif.emailjsPublicKey);
            
            await emailjs.send(notif.emailjsServiceId, notif.emailjsTemplateId, {
                to_email: notif.email,
                subject: `[Lembrete] ${reminder.title}`,
                message: `Lembrete para hoje: ${reminder.title}\n\n${reminder.description || ''}`,
                project_name: reminder.projectName || 'Geral',
                deadline: reminder.date,
                status: 'Lembrete',
                progress: ''
            });

            localStorage.setItem(notifiedKey, 'true');
        } catch (error) {
            console.error('Erro ao enviar notificação de lembrete:', error);
        }
    }
}

// Exportar funções
window.initRemindersListeners = initRemindersListeners;
window.startRemindersListener = startRemindersListener;
window.allReminders = allReminders;
