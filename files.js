/**
 * GERENCIAMENTO DE ARQUIVOS
 * =========================
 * Upload, visualização e exclusão de anexos
 */

// Arquivos selecionados para upload
let selectedFiles = [];
let existingProjectFiles = [];

// Inicializar listeners de arquivos
function initFilesListeners() {
    const fileInput = document.getElementById('project-files');
    const uploadArea = document.getElementById('file-upload-area');

    if (fileInput) {
        fileInput.addEventListener('change', handleFileSelect);
    }

    if (uploadArea) {
        // Clique na área de upload
        uploadArea.addEventListener('click', () => {
            fileInput.click();
        });

        // Drag and drop
        uploadArea.addEventListener('dragover', (e) => {
            e.preventDefault();
            uploadArea.classList.add('dragover');
        });

        uploadArea.addEventListener('dragleave', () => {
            uploadArea.classList.remove('dragover');
        });

        uploadArea.addEventListener('drop', (e) => {
            e.preventDefault();
            uploadArea.classList.remove('dragover');
            
            const files = Array.from(e.dataTransfer.files);
            addFilesToSelection(files);
        });
    }
}

// Manipular seleção de arquivos
function handleFileSelect(e) {
    const files = Array.from(e.target.files);
    addFilesToSelection(files);
}

// Adicionar arquivos à seleção
function addFilesToSelection(files) {
    const maxSize = 10 * 1024 * 1024; // 10MB
    const allowedTypes = [
        'application/pdf',
        'application/msword',
        'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
        'application/vnd.ms-excel',
        'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
        'image/jpeg',
        'image/png',
        'image/gif'
    ];

    files.forEach(file => {
        // Verificar tamanho
        if (file.size > maxSize) {
            showToast(`Arquivo "${file.name}" excede 10MB.`, 'error');
            return;
        }

        // Verificar tipo
        if (!allowedTypes.includes(file.type)) {
            showToast(`Tipo de arquivo não permitido: ${file.name}`, 'error');
            return;
        }

        // Verificar duplicatas
        if (selectedFiles.some(f => f.name === file.name)) {
            showToast(`Arquivo "${file.name}" já selecionado.`, 'warning');
            return;
        }

        selectedFiles.push(file);
    });

    renderFilesPreview();
}

// Renderizar preview dos arquivos selecionados
function renderFilesPreview() {
    const preview = document.getElementById('files-preview');
    if (!preview) return;

    if (selectedFiles.length === 0) {
        preview.innerHTML = '';
        return;
    }

    let html = '<h4>Novos arquivos:</h4><div class="files-grid">';

    selectedFiles.forEach((file, index) => {
        const icon = getFileIcon(file.type);
        const size = formatFileSize(file.size);

        html += `
            <div class="file-item new-file">
                <i class="${icon}"></i>
                <div class="file-info">
                    <span class="file-name">${file.name}</span>
                    <span class="file-size">${size}</span>
                </div>
                <button type="button" class="btn-remove-file" data-index="${index}">
                    <i class="fas fa-times"></i>
                </button>
            </div>
        `;
    });

    html += '</div>';
    preview.innerHTML = html;

    // Event listeners para remover
    preview.querySelectorAll('.btn-remove-file').forEach(btn => {
        btn.addEventListener('click', () => {
            const index = parseInt(btn.dataset.index);
            selectedFiles.splice(index, 1);
            renderFilesPreview();
        });
    });
}

// Renderizar arquivos existentes do projeto
function renderExistingFiles(files) {
    const container = document.getElementById('existing-files');
    if (!container) return;

    existingProjectFiles = files || [];

    if (existingProjectFiles.length === 0) {
        container.innerHTML = '';
        return;
    }

    let html = '<h4>Arquivos anexados:</h4><div class="files-grid">';

    existingProjectFiles.forEach((file, index) => {
        const icon = getFileIcon(file.type);
        const size = formatFileSize(file.size);

        html += `
            <div class="file-item existing-file">
                <i class="${icon}"></i>
                <div class="file-info">
                    <a href="${file.url}" target="_blank" class="file-name">${file.name}</a>
                    <span class="file-size">${size}</span>
                </div>
                <div class="file-actions">
                    <a href="${file.url}" target="_blank" class="btn-download-file" title="Baixar">
                        <i class="fas fa-download"></i>
                    </a>
                    <button type="button" class="btn-delete-existing-file" data-index="${index}" title="Excluir">
                        <i class="fas fa-trash"></i>
                    </button>
                </div>
            </div>
        `;
    });

    html += '</div>';
    container.innerHTML = html;

    // Event listeners para excluir
    container.querySelectorAll('.btn-delete-existing-file').forEach(btn => {
        btn.addEventListener('click', () => {
            const index = parseInt(btn.dataset.index);
            markFileForDeletion(index);
        });
    });
}

// Marcar arquivo para exclusão
function markFileForDeletion(index) {
    if (!confirm('Deseja excluir este arquivo?')) return;
    
    existingProjectFiles[index].toDelete = true;
    
    const fileItem = document.querySelector(`.btn-delete-existing-file[data-index="${index}"]`).closest('.file-item');
    if (fileItem) {
        fileItem.classList.add('marked-for-deletion');
    }
    
    showToast('Arquivo marcado para exclusão. Salve o projeto para confirmar.', 'info');
}

// Upload de arquivos para Firebase Storage
async function uploadProjectFiles(projectId) {
    if (selectedFiles.length === 0) return [];

    const uploadedFiles = [];
    const storage = firebase.storage();

    for (const file of selectedFiles) {
        try {
            const fileName = `${Date.now()}_${file.name}`;
            const filePath = `projects/${projectId}/${fileName}`;
            const storageRef = storage.ref(filePath);

            // Upload
            const snapshot = await storageRef.put(file);
            const url = await snapshot.ref.getDownloadURL();

            uploadedFiles.push({
                name: file.name,
                type: file.type,
                size: file.size,
                path: filePath,
                url: url,
                uploadedAt: new Date().toISOString()
            });

        } catch (error) {
            console.error('Erro ao fazer upload:', error);
            showToast(`Erro ao enviar ${file.name}`, 'error');
        }
    }

    // Limpar seleção após upload
    selectedFiles = [];
    renderFilesPreview();

    return uploadedFiles;
}

// Excluir arquivos marcados do Firebase Storage
async function deleteMarkedFiles() {
    const storage = firebase.storage();
    const toDelete = existingProjectFiles.filter(f => f.toDelete);

    for (const file of toDelete) {
        try {
            const storageRef = storage.ref(file.path);
            await storageRef.delete();
        } catch (error) {
            console.error('Erro ao excluir arquivo:', error);
        }
    }

    // Retornar apenas os não excluídos
    return existingProjectFiles.filter(f => !f.toDelete);
}

// Obter todos os arquivos (existentes + novos) após processamento
async function processProjectFiles(projectId) {
    // Excluir marcados
    const remainingFiles = await deleteMarkedFiles();
    
    // Upload novos
    const newFiles = await uploadProjectFiles(projectId);
    
    // Combinar
    return [...remainingFiles, ...newFiles];
}

// Limpar seleção
function clearFileSelection() {
    selectedFiles = [];
    existingProjectFiles = [];
    renderFilesPreview();
    
    const existingContainer = document.getElementById('existing-files');
    if (existingContainer) existingContainer.innerHTML = '';
    
    const fileInput = document.getElementById('project-files');
    if (fileInput) fileInput.value = '';
}

// Utilitários
function getFileIcon(mimeType) {
    if (mimeType.includes('pdf')) return 'fas fa-file-pdf';
    if (mimeType.includes('word') || mimeType.includes('document')) return 'fas fa-file-word';
    if (mimeType.includes('excel') || mimeType.includes('spreadsheet')) return 'fas fa-file-excel';
    if (mimeType.includes('image')) return 'fas fa-file-image';
    return 'fas fa-file';
}

function formatFileSize(bytes) {
    if (bytes < 1024) return bytes + ' B';
    if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB';
    return (bytes / (1024 * 1024)).toFixed(1) + ' MB';
}

// Renderizar contagem de anexos na tabela
function renderAttachmentsBadge(files) {
    const count = files?.length || 0;
    if (count === 0) return '<span class="no-attachments">-</span>';
    
    return `
        <span class="attachments-badge" title="${count} arquivo(s)">
            <i class="fas fa-paperclip"></i> ${count}
        </span>
    `;
}

// Exportar funções
window.initFilesListeners = initFilesListeners;
window.renderExistingFiles = renderExistingFiles;
window.processProjectFiles = processProjectFiles;
window.clearFileSelection = clearFileSelection;
window.renderAttachmentsBadge = renderAttachmentsBadge;
