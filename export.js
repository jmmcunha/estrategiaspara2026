/**
 * EXPORTAÇÃO PERSONALIZADA DE PROJETOS
 * =====================================
 * Sistema de exportação com seleção de campos
 */

let currentExportFormat = 'xlsx';

// =====================================================
// INICIALIZAÇÃO
// =====================================================

document.addEventListener('DOMContentLoaded', () => {
    initExportModal();
});

function initExportModal() {
    const exportForm = document.getElementById('export-form');
    const tabs = document.querySelectorAll('.export-tab');
    const pdfOptions = document.querySelector('.export-options-pdf');

    // Alternar abas
    tabs.forEach(tab => {
        tab.addEventListener('click', () => {
            tabs.forEach(t => t.classList.remove('active'));
            tab.classList.add('active');
            currentExportFormat = tab.dataset.format;

            if (pdfOptions) {
                pdfOptions.style.display = currentExportFormat === 'pdf' ? 'block' : 'none';
            }

            const btn = document.getElementById('export-submit-btn');
            if (btn) {
                const names = { xlsx: 'Excel', pdf: 'PDF', csv: 'CSV' };
                btn.innerHTML = `<i class="fas fa-download"></i> Exportar ${names[currentExportFormat]}`;
            }
        });
    });

    // Selecionar todos
    const selectAll = document.getElementById('export-select-all');
    if (selectAll) {
        selectAll.addEventListener('click', () => {
            document.querySelectorAll('input[id^="export-field-"]').forEach(cb => cb.checked = true);
        });
    }

    // Desmarcar todos
    const selectNone = document.getElementById('export-select-none');
    if (selectNone) {
        selectNone.addEventListener('click', () => {
            document.querySelectorAll('input[id^="export-field-"]').forEach(cb => cb.checked = false);
        });
    }

    // Submit
    if (exportForm) {
        exportForm.addEventListener('submit', (e) => {
            e.preventDefault();
            runExport();
        });
    }
}

// =====================================================
// FUNÇÕES PÚBLICAS (chamadas pelo app.js)
// =====================================================

function exportToXLSX(projects) {
    currentExportFormat = 'xlsx';
    openExportModal('xlsx');
}

function exportToCSV(projects) {
    currentExportFormat = 'csv';
    openExportModal('csv');
}

function exportToPDF(projects) {
    currentExportFormat = 'pdf';
    openExportModal('pdf');
}

function openExportModal(format) {
    const modal = document.getElementById('export-modal');
    if (!modal) {
        console.error('Modal de exportação não encontrado');
        return;
    }

    // Ativar aba correta
    document.querySelectorAll('.export-tab').forEach(t => {
        t.classList.toggle('active', t.dataset.format === format);
    });

    // Mostrar/ocultar opções PDF
    const pdfOptions = document.querySelector('.export-options-pdf');
    if (pdfOptions) {
        pdfOptions.style.display = format === 'pdf' ? 'block' : 'none';
    }

    // Atualizar botão
    const btn = document.getElementById('export-submit-btn');
    if (btn) {
        const names = { xlsx: 'Excel', pdf: 'PDF', csv: 'CSV' };
        btn.innerHTML = `<i class="fas fa-download"></i> Exportar ${names[format]}`;
    }

    openModal(modal);
}

// =====================================================
// EXECUTAR EXPORTAÇÃO
// =====================================================

function runExport() {
    const fields = getSelectedFields();
    const projects = getFilteredProjects();

    if (fields.length === 0) {
        showToast('Selecione pelo menos um campo.', 'warning');
        return;
    }

    if (projects.length === 0) {
        showToast('Nenhum projeto encontrado.', 'warning');
        return;
    }

    try {
        switch (currentExportFormat) {
            case 'xlsx':
                doExportXLSX(projects, fields);
                break;
            case 'csv':
                doExportCSV(projects, fields);
                break;
            case 'pdf':
                doExportPDF(projects, fields);
                break;
        }
        closeModal(document.getElementById('export-modal'));
    } catch (error) {
        console.error('Erro na exportação:', error);
        showToast('Erro ao exportar: ' + error.message, 'error');
    }
}

// =====================================================
// CAMPOS SELECIONADOS
// =====================================================

function getSelectedFields() {
    const fieldMap = {
        'export-field-id': { key: 'id', label: 'ID', width: 8 },
        'export-field-nome': { key: 'nome', label: 'Nome do Projeto', width: 30 },
        'export-field-status': { key: 'status', label: 'Status', width: 15 },
        'export-field-progresso': { key: 'progresso', label: 'Progresso (%)', width: 12 },
        'export-field-prazo': { key: 'prazo', label: 'Prazo', width: 12 },
        'export-field-responsavel': { key: 'responsavel', label: 'Responsável', width: 20 },
        'export-field-descricao': { key: 'descricao', label: 'Descrição', width: 40 },
        'export-field-objetivo': { key: 'objetivo', label: 'Objetivo', width: 35 },
        'export-field-proximos': { key: 'proximos_passos', label: 'Próximos Passos', width: 40 },
        'export-field-metas': { key: 'metas', label: 'Metas', width: 35 },
        'export-field-forcas': { key: 'swot.forcas', label: 'Forças', width: 30 },
        'export-field-fraquezas': { key: 'swot.fraquezas', label: 'Fraquezas', width: 30 },
        'export-field-oportunidades': { key: 'swot.oportunidades', label: 'Oportunidades', width: 30 },
        'export-field-ameacas': { key: 'swot.ameacas', label: 'Ameaças', width: 30 }
    };

    const fields = [];
    Object.keys(fieldMap).forEach(id => {
        const cb = document.getElementById(id);
        if (cb && cb.checked) {
            fields.push(fieldMap[id]);
        }
    });

    return fields;
}

function getFilteredProjects() {
    const filter = document.getElementById('export-project-filter');
    const filterValue = filter ? filter.value : 'todos';
    let projects = [...(window.allProjects || [])];

    if (filterValue !== 'todos') {
        projects = projects.filter(p => p.status === filterValue);
    }

    return projects;
}

function getFieldValue(project, key) {
    if (key.includes('.')) {
        const parts = key.split('.');
        let val = project;
        for (const part of parts) {
            val = val ? val[part] : null;
        }
        return val;
    }
    return project[key];
}

function formatValue(value, key) {
    if (value === null || value === undefined) return '';
    if (Array.isArray(value)) return value.join('\n');
    if (key === 'progresso') return `${value}%`;
    return String(value);
}

// =====================================================
// EXPORTAR XLSX
// =====================================================

function doExportXLSX(projects, fields) {
    if (typeof XLSX === 'undefined') {
        showToast('Biblioteca XLSX não carregada.', 'error');
        return;
    }

    // Cabeçalhos
    const headers = fields.map(f => f.label);
    const data = [headers];

    // Dados
    projects.forEach(project => {
        const row = fields.map(field => {
            const value = getFieldValue(project, field.key);
            return formatValue(value, field.key);
        });
        data.push(row);
    });

    // Criar worksheet
    const ws = XLSX.utils.aoa_to_sheet(data);

    // Larguras das colunas
    ws['!cols'] = fields.map(f => ({ wch: f.width }));

    // Criar workbook
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Projetos');

    // Salvar
    const fileName = `Projetos_${getDateStr()}.xlsx`;
    XLSX.writeFile(wb, fileName);

    showToast(`${projects.length} projeto(s) exportado(s) para Excel!`, 'success');
}

// =====================================================
// EXPORTAR CSV
// =====================================================

function doExportCSV(projects, fields) {
    // Cabeçalhos
    const headers = fields.map(f => `"${f.label}"`).join(';');

    // Dados
    const rows = projects.map(project => {
        return fields.map(field => {
            const value = getFieldValue(project, field.key);
            const formatted = formatValue(value, field.key);
            // Escapar aspas e quebras de linha
            const escaped = formatted.replace(/"/g, '""');
            return `"${escaped}"`;
        }).join(';');
    });

    // CSV com BOM para UTF-8
    const bom = '\uFEFF';
    const csv = bom + headers + '\n' + rows.join('\n');

    // Download
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = `Projetos_${getDateStr()}.csv`;
    link.click();
    URL.revokeObjectURL(link.href);

    showToast(`${projects.length} projeto(s) exportado(s) para CSV!`, 'success');
}

// =====================================================
// EXPORTAR PDF
// =====================================================

function doExportPDF(projects, fields) {
    const { jsPDF } = window.jspdf;

    // Opções do PDF
    const titleInput = document.getElementById('export-pdf-title');
    const orientationInput = document.getElementById('export-pdf-orientation');
    const headerCheck = document.getElementById('export-pdf-header');
    const footerCheck = document.getElementById('export-pdf-footer');

    const title = titleInput ? titleInput.value : 'Relatório de Projetos';
    const orientation = orientationInput ? orientationInput.value : 'landscape';
    const includeHeader = headerCheck ? headerCheck.checked : true;
    const includeFooter = footerCheck ? footerCheck.checked : true;

    const doc = new jsPDF({
        orientation: orientation,
        unit: 'mm',
        format: 'a4'
    });

    const pageWidth = orientation === 'landscape' ? 297 : 210;
    const pageHeight = orientation === 'landscape' ? 210 : 297;
    const margin = 10;
    const contentWidth = pageWidth - (margin * 2);

    let y = margin;

    // Cabeçalho
    if (includeHeader) {
        doc.setFillColor(99, 102, 241);
        doc.rect(0, 0, pageWidth, 15, 'F');

        doc.setFontSize(12);
        doc.setTextColor(255, 255, 255);
        doc.setFont(undefined, 'bold');
        doc.text(title, margin, 10);

        doc.setFontSize(9);
        doc.setFont(undefined, 'normal');
        const now = new Date();
        doc.text(`${now.toLocaleDateString('pt-BR')}`, pageWidth - margin, 10, { align: 'right' });

        y = 22;
    }

    // Preparar dados da tabela
    const headers = fields.map(f => f.label);
    const tableData = projects.map(project => {
        return fields.map(field => {
            const value = getFieldValue(project, field.key);
            return formatValue(value, field.key);
        });
    });

    // Calcular larguras proporcionais
    const totalWidth = fields.reduce((sum, f) => sum + f.width, 0);
    const colStyles = {};
    fields.forEach((field, idx) => {
        const width = (field.width / totalWidth) * contentWidth;
        colStyles[idx] = { 
            cellWidth: width,
            valign: 'top'
        };
    });

    // Gerar tabela
    doc.autoTable({
        startY: y,
        head: [headers],
        body: tableData,
        margin: { left: margin, right: margin, top: margin, bottom: margin + 10 },
        theme: 'grid',
        styles: {
            fontSize: 8,
            cellPadding: 2,
            overflow: 'linebreak',
            valign: 'top',
            lineColor: [200, 200, 200],
            lineWidth: 0.1
        },
        headStyles: {
            fillColor: [99, 102, 241],
            textColor: [255, 255, 255],
            fontStyle: 'bold',
            fontSize: 8,
            halign: 'center',
            valign: 'middle'
        },
        bodyStyles: {
            textColor: [30, 41, 59]
        },
        alternateRowStyles: {
            fillColor: [248, 250, 252]
        },
        columnStyles: colStyles,
        didDrawPage: function(data) {
            if (includeFooter) {
                const pageCount = doc.internal.getNumberOfPages();
                const currentPage = doc.internal.getCurrentPageInfo().pageNumber;

                doc.setFontSize(8);
                doc.setTextColor(100, 116, 139);
                doc.text(
                    `Página ${currentPage} de ${pageCount}`,
                    pageWidth / 2,
                    pageHeight - 7,
                    { align: 'center' }
                );
            }
        }
    });

    // Salvar
    const fileName = `${title.replace(/\s+/g, '_')}_${getDateStr()}.pdf`;
    doc.save(fileName);

    showToast(`${projects.length} projeto(s) exportado(s) para PDF!`, 'success');
}

// =====================================================
// UTILITÁRIOS
// =====================================================

function getDateStr() {
    const now = new Date();
    const d = now.getDate().toString().padStart(2, '0');
    const m = (now.getMonth() + 1).toString().padStart(2, '0');
    const y = now.getFullYear();
    return `${y}-${m}-${d}`;
}

// Exportar funções globais
window.exportToXLSX = exportToXLSX;
window.exportToCSV = exportToCSV;
window.exportToPDF = exportToPDF;
