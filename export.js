/**
 * EXPORTAÇÃO PERSONALIZADA DE PROJETOS
 * =====================================
 * Sistema de exportação com seleção de campos
 * Suporta XLSX, PDF e CSV
 */

// Estado da exportação
let currentExportFormat = 'xlsx';

// Inicializar modal de exportação
function initExportModal() {
    const exportModal = document.getElementById('export-modal');
    const exportForm = document.getElementById('export-form');
    const tabs = document.querySelectorAll('.export-tab');
    const pdfOptions = document.querySelector('.export-options-pdf');

    // Alternar abas de formato
    tabs.forEach(tab => {
        tab.addEventListener('click', () => {
            tabs.forEach(t => t.classList.remove('active'));
            tab.classList.add('active');
            currentExportFormat = tab.dataset.format;

            // Mostrar/ocultar opções de PDF
            if (currentExportFormat === 'pdf') {
                pdfOptions.style.display = 'block';
            } else {
                pdfOptions.style.display = 'none';
            }

            // Atualizar texto do botão
            const submitBtn = document.getElementById('export-submit-btn');
            const formatNames = { xlsx: 'Excel', pdf: 'PDF', csv: 'CSV' };
            submitBtn.innerHTML = `<i class="fas fa-download"></i> Exportar ${formatNames[currentExportFormat]}`;
        });
    });

    // Selecionar todos / nenhum
    document.getElementById('export-select-all').addEventListener('click', () => {
        document.querySelectorAll('#export-modal input[type="checkbox"][id^="export-field-"]').forEach(cb => {
            cb.checked = true;
        });
    });

    document.getElementById('export-select-none').addEventListener('click', () => {
        document.querySelectorAll('#export-modal input[type="checkbox"][id^="export-field-"]').forEach(cb => {
            cb.checked = false;
        });
    });

    // Submissão do formulário
    exportForm.addEventListener('submit', (e) => {
        e.preventDefault();
        executeExport();
    });
}

// Abrir modal de exportação
function openExportModal() {
    const modal = document.getElementById('export-modal');
    openModal(modal);
}

// Obter campos selecionados
function getSelectedFields() {
    const fields = [];
    const fieldMap = {
        'export-field-id': { key: 'id', label: 'ID' },
        'export-field-nome': { key: 'nome', label: 'Nome do Projeto' },
        'export-field-status': { key: 'status', label: 'Status' },
        'export-field-progresso': { key: 'progresso', label: 'Progresso (%)' },
        'export-field-prazo': { key: 'prazo', label: 'Prazo' },
        'export-field-responsavel': { key: 'responsavel', label: 'Responsável' },
        'export-field-descricao': { key: 'descricao', label: 'Descrição' },
        'export-field-objetivo': { key: 'objetivo', label: 'Objetivo' },
        'export-field-proximos': { key: 'proximos_passos', label: 'Próximos Passos' },
        'export-field-metas': { key: 'metas', label: 'Metas' },
        'export-field-forcas': { key: 'swot.forcas', label: 'Forças' },
        'export-field-fraquezas': { key: 'swot.fraquezas', label: 'Fraquezas' },
        'export-field-oportunidades': { key: 'swot.oportunidades', label: 'Oportunidades' },
        'export-field-ameacas': { key: 'swot.ameacas', label: 'Ameaças' }
    };

    Object.keys(fieldMap).forEach(id => {
        const checkbox = document.getElementById(id);
        if (checkbox && checkbox.checked) {
            fields.push(fieldMap[id]);
        }
    });

    return fields;
}

// Obter projetos filtrados
function getFilteredProjects() {
    const filter = document.getElementById('export-project-filter').value;
    let projects = [...(window.allProjects || [])];

    if (filter !== 'todos') {
        projects = projects.filter(p => p.status === filter);
    }

    return projects;
}

// Obter valor de um campo (suporta campos aninhados)
function getFieldValue(project, fieldKey) {
    if (fieldKey.includes('.')) {
        const parts = fieldKey.split('.');
        let value = project;
        for (const part of parts) {
            value = value ? value[part] : null;
        }
        return value;
    }
    return project[fieldKey];
}

// Formatar valor para exibição
function formatValue(value, fieldKey) {
    if (value === null || value === undefined) {
        return '';
    }

    // Arrays (próximos passos, metas)
    if (Array.isArray(value)) {
        return value.join('\n');
    }

    // Progresso
    if (fieldKey === 'progresso') {
        return `${value}%`;
    }

    return String(value);
}

// Executar exportação
function executeExport() {
    const fields = getSelectedFields();
    const projects = getFilteredProjects();

    if (fields.length === 0) {
        showToast('Selecione pelo menos um campo para exportar.', 'warning');
        return;
    }

    if (projects.length === 0) {
        showToast('Nenhum projeto encontrado com o filtro selecionado.', 'warning');
        return;
    }

    switch (currentExportFormat) {
        case 'xlsx':
            exportToXLSX(projects, fields);
            break;
        case 'pdf':
            exportToPDF(projects, fields);
            break;
        case 'csv':
            exportToCSV(projects, fields);
            break;
    }

    closeModal(document.getElementById('export-modal'));
}

// =====================================================
// EXPORTAÇÃO XLSX
// =====================================================

function exportToXLSX(projects, fields) {
    if (typeof XLSX === 'undefined') {
        showToast('Biblioteca XLSX não carregada.', 'error');
        return;
    }

    // Preparar dados
    const headers = fields.map(f => f.label);
    const data = [headers];

    projects.forEach(project => {
        const row = fields.map(field => {
            const value = getFieldValue(project, field.key);
            return formatValue(value, field.key);
        });
        data.push(row);
    });

    // Criar workbook
    const wb = XLSX.utils.book_new();
    const ws = XLSX.utils.aoa_to_sheet(data);

    // Configurar larguras de coluna baseadas no conteúdo
    const colWidths = fields.map((field, index) => {
        let maxLength = field.label.length;
        
        projects.forEach(project => {
            const value = formatValue(getFieldValue(project, field.key), field.key);
            const lines = value.split('\n');
            lines.forEach(line => {
                if (line.length > maxLength) {
                    maxLength = line.length;
                }
            });
        });

        // Limitar largura máxima mas permitir conteúdo completo
        return { wch: Math.min(Math.max(maxLength + 2, 12), 60) };
    });

    ws['!cols'] = colWidths;

    // Adicionar worksheet ao workbook
    XLSX.utils.book_append_sheet(wb, ws, 'Projetos');

    // Gerar arquivo
    const fileName = `Projetos_${formatDateForFile(new Date())}.xlsx`;
    XLSX.writeFile(wb, fileName);

    showToast(`${projects.length} projeto(s) exportado(s) para Excel!`, 'success');
}

// =====================================================
// EXPORTAÇÃO PDF
// =====================================================

function exportToPDF(projects, fields) {
    const { jsPDF } = window.jspdf;
    
    const orientation = document.getElementById('export-pdf-orientation').value;
    const title = document.getElementById('export-pdf-title').value || 'Relatório de Projetos';
    const includeHeader = document.getElementById('export-pdf-header').checked;
    const includeFooter = document.getElementById('export-pdf-footer').checked;

    const doc = new jsPDF({
        orientation: orientation,
        unit: 'mm',
        format: 'a4'
    });

    const pageWidth = orientation === 'landscape' ? 297 : 210;
    const pageHeight = orientation === 'landscape' ? 210 : 297;
    const margin = 15;
    const contentWidth = pageWidth - (margin * 2);

    let y = margin;

    // Cabeçalho
    if (includeHeader) {
        doc.setFillColor(30, 64, 175);
        doc.rect(0, 0, pageWidth, 20, 'F');

        doc.setFontSize(14);
        doc.setTextColor(255, 255, 255);
        doc.setFont(undefined, 'bold');
        doc.text(title, margin, 13);

        doc.setFontSize(10);
        doc.setFont(undefined, 'normal');
        const now = new Date();
        doc.text(`Gerado em ${now.toLocaleDateString('pt-BR')} às ${now.toLocaleTimeString('pt-BR')}`, pageWidth - margin, 13, { align: 'right' });

        y = 30;
    }

    // Preparar dados da tabela
    const headers = fields.map(f => f.label);
    const tableData = projects.map(project => {
        return fields.map(field => {
            const value = getFieldValue(project, field.key);
            return formatValue(value, field.key);
        });
    });

    // Calcular larguras proporcionais das colunas
    const columnStyles = {};
    const totalChars = fields.reduce((sum, field) => {
        // Estimar largura baseada no tipo de campo
        const widthMap = {
            'id': 8,
            'nome': 25,
            'status': 15,
            'progresso': 12,
            'prazo': 15,
            'responsavel': 20,
            'descricao': 40,
            'objetivo': 35,
            'proximos_passos': 45,
            'metas': 35,
            'swot.forcas': 30,
            'swot.fraquezas': 30,
            'swot.oportunidades': 30,
            'swot.ameacas': 30
        };
        return sum + (widthMap[field.key] || 20);
    }, 0);

    fields.forEach((field, index) => {
        const widthMap = {
            'id': 8,
            'nome': 25,
            'status': 15,
            'progresso': 12,
            'prazo': 15,
            'responsavel': 20,
            'descricao': 40,
            'objetivo': 35,
            'proximos_passos': 45,
            'metas': 35,
            'swot.forcas': 30,
            'swot.fraquezas': 30,
            'swot.oportunidades': 30,
            'swot.ameacas': 30
        };
        const proportion = (widthMap[field.key] || 20) / totalChars;
        columnStyles[index] = {
            cellWidth: contentWidth * proportion,
            valign: 'top'
        };
    });

    // Gerar tabela com autoTable
    doc.autoTable({
        startY: y,
        head: [headers],
        body: tableData,
        margin: { left: margin, right: margin, top: margin, bottom: margin + 10 },
        theme: 'grid',
        styles: {
            fontSize: 9,
            cellPadding: 4,
            overflow: 'linebreak',
            valign: 'top',
            lineColor: [200, 200, 200],
            lineWidth: 0.1
        },
        headStyles: {
            fillColor: [30, 64, 175],
            textColor: [255, 255, 255],
            fontStyle: 'bold',
            fontSize: 9,
            halign: 'center',
            valign: 'middle'
        },
        bodyStyles: {
            textColor: [30, 41, 59]
        },
        alternateRowStyles: {
            fillColor: [248, 250, 252]
        },
        columnStyles: columnStyles,
        // Garantir que o texto não seja cortado
        didParseCell: function(data) {
            // Forçar quebra de linha correta
            if (data.cell.text && Array.isArray(data.cell.text)) {
                // O texto já foi processado
            }
        },
        // Colorir status
        didDrawCell: function(data) {
            if (data.section === 'body') {
                const statusIndex = fields.findIndex(f => f.key === 'status');
                if (data.column.index === statusIndex) {
                    const status = data.cell.raw ? data.cell.raw.toLowerCase() : '';
                    let color = [30, 41, 59];
                    
                    if (status.includes('andamento')) color = [59, 130, 246];
                    else if (status.includes('conclu')) color = [34, 197, 94];
                    else if (status.includes('planejado')) color = [245, 158, 11];
                    else if (status.includes('suspenso')) color = [239, 68, 68];
                    
                    // Já foi desenhado, então não podemos mudar a cor aqui
                    // A cor é aplicada no didParseCell
                }
            }
        },
        didDrawPage: function(data) {
            // Rodapé em cada página
            if (includeFooter) {
                const pageCount = doc.internal.getNumberOfPages();
                const currentPage = doc.internal.getCurrentPageInfo().pageNumber;
                
                doc.setFontSize(8);
                doc.setTextColor(100, 116, 139);
                doc.text(
                    `Página ${currentPage} de ${pageCount}`,
                    pageWidth / 2,
                    pageHeight - 10,
                    { align: 'center' }
                );
            }
        }
    });

    // Salvar
    const fileName = `${title.replace(/\s+/g, '_')}_${formatDateForFile(new Date())}.pdf`;
    doc.save(fileName);

    showToast(`${projects.length} projeto(s) exportado(s) para PDF!`, 'success');
}

// =====================================================
// EXPORTAÇÃO CSV
// =====================================================

function exportToCSV(projects, fields) {
    // Preparar cabeçalhos
    const headers = fields.map(f => `"${f.label}"`).join(';');
    
    // Preparar linhas
    const rows = projects.map(project => {
        return fields.map(field => {
            const value = getFieldValue(project, field.key);
            const formatted = formatValue(value, field.key);
            // Escapar aspas duplas e envolver em aspas
            return `"${formatted.replace(/"/g, '""')}"`;
        }).join(';');
    });

    // Montar CSV com BOM para UTF-8
    const bom = '\uFEFF';
    const csv = bom + headers + '\n' + rows.join('\n');

    // Download
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = `Projetos_${formatDateForFile(new Date())}.csv`;
    link.click();
    URL.revokeObjectURL(link.href);

    showToast(`${projects.length} projeto(s) exportado(s) para CSV!`, 'success');
}

// =====================================================
// UTILITÁRIOS
// =====================================================

function formatDateForFile(date) {
    const d = date.getDate().toString().padStart(2, '0');
    const m = (date.getMonth() + 1).toString().padStart(2, '0');
    const y = date.getFullYear();
    return `${y}-${m}-${d}`;
}

// =====================================================
// FUNÇÕES LEGADAS (compatibilidade)
// =====================================================

// Estas funções são chamadas pelos botões antigos no app.js
// Elas agora abrem o modal de exportação

function exportToXLSXLegacy(projects) {
    openExportModal();
}

function exportToCSVLegacy(projects) {
    document.querySelector('.export-tab[data-format="csv"]').click();
    openExportModal();
}

function exportToPDFLegacy(projects) {
    document.querySelector('.export-tab[data-format="pdf"]').click();
    openExportModal();
}

// =====================================================
// INICIALIZAÇÃO
// =====================================================

// Inicializar quando DOM carregar
document.addEventListener('DOMContentLoaded', () => {
    initExportModal();
});

// Exportar funções globais
window.openExportModal = openExportModal;
window.exportToXLSX = exportToXLSXLegacy;
window.exportToCSV = exportToCSVLegacy;
window.exportToPDF = exportToPDFLegacy;
