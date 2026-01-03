/**
 * EXPORTAÇÃO UNIFICADA DE PROJETOS
 * =================================
 * Modal único com seleção de formato, filtros e campos
 */

// =====================================================
// INICIALIZAÇÃO
// =====================================================

document.addEventListener('DOMContentLoaded', () => {
    initExportModal();
});

function initExportModal() {
    const exportForm = document.getElementById('export-form');
    const formatRadios = document.querySelectorAll('input[name="export-format"]');
    const pdfOptions = document.querySelector('.export-options-pdf');

    // Alternar formato via radio buttons
    formatRadios.forEach(radio => {
        radio.addEventListener('change', () => {
            const format = radio.value;
            if (pdfOptions) {
                pdfOptions.style.display = format === 'pdf' ? 'block' : 'none';
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
// FUNÇÕES PÚBLICAS
// =====================================================

function openExportModal() {
    const modal = document.getElementById('export-modal');
    if (!modal) return;

    // Preencher select de projetos
    populateProjectFilter();
    
    // Reset para Excel
    const xlsxRadio = document.querySelector('input[name="export-format"][value="xlsx"]');
    if (xlsxRadio) xlsxRadio.checked = true;
    
    const pdfOptions = document.querySelector('.export-options-pdf');
    if (pdfOptions) pdfOptions.style.display = 'none';

    openModal(modal);
}

function populateProjectFilter() {
    const select = document.getElementById('export-project-filter');
    if (!select) return;

    const projects = window.allProjects || [];
    
    // Limpar opções existentes (exceto "Todos")
    select.innerHTML = '<option value="todos">Todos os projetos</option>';
    
    // Adicionar cada projeto
    projects.forEach(project => {
        const option = document.createElement('option');
        option.value = project.docId;
        option.textContent = `${project.id || '?'}. ${project.nome || 'Sem nome'}`;
        select.appendChild(option);
    });
}

// Funções legadas para compatibilidade
function exportToXLSX() { openExportModal(); }
function exportToCSV() { openExportModal(); }
function exportToPDF() { openExportModal(); }

// =====================================================
// EXECUTAR EXPORTAÇÃO
// =====================================================

function runExport() {
    const fields = getSelectedFields();
    const projects = getFilteredProjects();
    const format = document.querySelector('input[name="export-format"]:checked')?.value || 'xlsx';

    if (fields.length === 0) {
        showToast('Selecione pelo menos um campo.', 'warning');
        return;
    }

    if (projects.length === 0) {
        showToast('Nenhum projeto encontrado com os filtros selecionados.', 'warning');
        return;
    }

    try {
        switch (format) {
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
// CAMPOS E FILTROS
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
        'export-field-proximos': { key: 'proximos_passos', label: 'Próximos Passos', width: 50 },
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
    const statusFilter = document.getElementById('export-status-filter');
    const projectFilter = document.getElementById('export-project-filter');
    
    const statusValue = statusFilter ? statusFilter.value : 'todos';
    const projectValue = projectFilter ? projectFilter.value : 'todos';
    
    let projects = [...(window.allProjects || [])];

    // Filtrar por status
    if (statusValue !== 'todos') {
        projects = projects.filter(p => p.status === statusValue);
    }

    // Filtrar por projeto específico
    if (projectValue !== 'todos') {
        projects = projects.filter(p => p.docId === projectValue);
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

// =====================================================
// FORMATAÇÃO
// =====================================================

function formatProximosPassos(steps, format = 'text') {
    if (!steps || !Array.isArray(steps) || steps.length === 0) return '';

    const statusLabels = {
        'pendente': 'Pendente',
        'em_andamento': 'Em Andamento',
        'concluido': 'Concluído'
    };

    return steps.map((step, index) => {
        if (typeof step === 'string') {
            return `${index + 1}. ${step}`;
        }

        const texto = step.texto || '';
        const status = step.status || 'pendente';
        const prazo = step.prazo ? formatDateBR(step.prazo) : '';
        const responsavel = step.responsavel || '';

        let linha = `${index + 1}. [${statusLabels[status] || status}] ${texto}`;
        if (prazo) linha += ` | Prazo: ${prazo}`;
        if (responsavel) linha += ` | Resp: ${responsavel}`;
        return linha;
    }).join('\n');
}

function formatDateBR(dateStr) {
    if (!dateStr) return '';
    if (dateStr.includes('/')) return dateStr;
    try {
        const date = new Date(dateStr + 'T00:00:00');
        return date.toLocaleDateString('pt-BR');
    } catch {
        return dateStr;
    }
}

function formatMetas(metas) {
    if (!metas || !Array.isArray(metas) || metas.length === 0) return '';
    return metas.map((meta, index) => `${index + 1}. ${meta}`).join('\n');
}

function formatValue(value, key, format = 'text') {
    if (value === null || value === undefined) return '';
    if (key === 'proximos_passos') return formatProximosPassos(value, format);
    if (key === 'metas') return formatMetas(value);
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

    const wb = XLSX.utils.book_new();

    // ABA 1: PROJETOS
    const headers = fields.map(f => f.label);
    const data = [headers];

    projects.forEach(project => {
        const row = fields.map(field => {
            const value = getFieldValue(project, field.key);
            return formatValue(value, field.key, 'xlsx');
        });
        data.push(row);
    });

    const wsProjects = XLSX.utils.aoa_to_sheet(data);
    wsProjects['!cols'] = fields.map(f => ({ wch: f.width }));
    XLSX.utils.book_append_sheet(wb, wsProjects, 'Projetos');

    // ABA 2: PRÓXIMOS PASSOS
    const stepsHeaders = ['Projeto', 'ID', 'Nº', 'Ação', 'Status', 'Prazo', 'Responsável'];
    const stepsData = [stepsHeaders];

    projects.forEach(project => {
        const steps = project.proximos_passos || [];
        steps.forEach((step, index) => {
            const isObject = typeof step === 'object';
            const texto = isObject ? (step.texto || '') : step;
            const status = isObject ? (step.status || 'pendente') : 'pendente';
            const prazo = isObject && step.prazo ? formatDateBR(step.prazo) : '';
            const responsavel = isObject ? (step.responsavel || '') : '';

            const statusLabel = {
                'pendente': 'Pendente',
                'em_andamento': 'Em Andamento',
                'concluido': 'Concluído'
            }[status] || status;

            stepsData.push([
                project.nome || `Projeto ${project.id}`,
                project.id || '',
                index + 1,
                texto,
                statusLabel,
                prazo,
                responsavel
            ]);
        });
    });

    if (stepsData.length > 1) {
        const wsSteps = XLSX.utils.aoa_to_sheet(stepsData);
        wsSteps['!cols'] = [
            { wch: 30 }, { wch: 8 }, { wch: 5 }, { wch: 50 }, { wch: 15 }, { wch: 12 }, { wch: 20 }
        ];
        XLSX.utils.book_append_sheet(wb, wsSteps, 'Próximos Passos');
    }

    // ABA 3: RESUMO
    const allSteps = projects.flatMap(p => p.proximos_passos || []);
    const totalSteps = allSteps.length;
    const countByStatus = { 'Pendente': 0, 'Em Andamento': 0, 'Concluído': 0 };

    allSteps.forEach(step => {
        const isObject = typeof step === 'object';
        const status = isObject ? (step.status || 'pendente') : 'pendente';
        if (status === 'pendente') countByStatus['Pendente']++;
        else if (status === 'em_andamento') countByStatus['Em Andamento']++;
        else if (status === 'concluido') countByStatus['Concluído']++;
    });

    const resumoData = [['Status', 'Quantidade', 'Percentual']];
    Object.entries(countByStatus).forEach(([status, count]) => {
        const pct = totalSteps > 0 ? ((count / totalSteps) * 100).toFixed(1) + '%' : '0%';
        resumoData.push([status, count, pct]);
    });
    resumoData.push(['TOTAL', totalSteps, '100%']);

    const wsResumo = XLSX.utils.aoa_to_sheet(resumoData);
    wsResumo['!cols'] = [{ wch: 15 }, { wch: 12 }, { wch: 12 }];
    XLSX.utils.book_append_sheet(wb, wsResumo, 'Resumo');

    const fileName = `Projetos_${getDateStr()}.xlsx`;
    XLSX.writeFile(wb, fileName);
    showToast(`${projects.length} projeto(s) exportado(s)!`, 'success');
}

// =====================================================
// EXPORTAR CSV
// =====================================================

function doExportCSV(projects, fields) {
    const headers = fields.map(f => `"${f.label}"`).join(';');
    const rows = projects.map(project => {
        return fields.map(field => {
            const value = getFieldValue(project, field.key);
            const formatted = formatValue(value, field.key, 'csv');
            const escaped = formatted.replace(/"/g, '""');
            return `"${escaped}"`;
        }).join(';');
    });

    const bom = '\uFEFF';
    const csv = bom + headers + '\n' + rows.join('\n');

    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = `Projetos_${getDateStr()}.csv`;
    link.click();
    URL.revokeObjectURL(link.href);

    showToast(`${projects.length} projeto(s) exportado(s)!`, 'success');
}

// =====================================================
// EXPORTAR PDF
// =====================================================

function doExportPDF(projects, fields) {
    const { jsPDF } = window.jspdf;

    const titleInput = document.getElementById('export-pdf-title');
    const orientationInput = document.getElementById('export-pdf-orientation');
    const headerCheck = document.getElementById('export-pdf-header');
    const footerCheck = document.getElementById('export-pdf-footer');

    const title = titleInput ? titleInput.value : 'Relatório de Projetos';
    const orientation = orientationInput ? orientationInput.value : 'landscape';
    const includeHeader = headerCheck ? headerCheck.checked : true;
    const includeFooter = footerCheck ? footerCheck.checked : true;

    const doc = new jsPDF({ orientation, unit: 'mm', format: 'a4' });

    const pageWidth = orientation === 'landscape' ? 297 : 210;
    const pageHeight = orientation === 'landscape' ? 210 : 297;
    const margin = 10;
    const contentWidth = pageWidth - (margin * 2);

    let y = margin;

    // Cabeçalho (azul profissional)
    if (includeHeader) {
        doc.setFillColor(29, 155, 240);
        doc.rect(0, 0, pageWidth, 15, 'F');
        doc.setFontSize(12);
        doc.setTextColor(255, 255, 255);
        doc.setFont(undefined, 'bold');
        doc.text(title, margin, 10);
        doc.setFontSize(9);
        doc.setFont(undefined, 'normal');
        doc.text(`${new Date().toLocaleDateString('pt-BR')}`, pageWidth - margin, 10, { align: 'right' });
        y = 22;
    }

    // Tabela de projetos (sem próximos passos)
    const tableFields = fields.filter(f => f.key !== 'proximos_passos');
    const hasProximosPassos = fields.some(f => f.key === 'proximos_passos');

    const headers = tableFields.map(f => f.label);
    const tableData = projects.map(project => {
        return tableFields.map(field => {
            const value = getFieldValue(project, field.key);
            return formatValue(value, field.key, 'pdf');
        });
    });

    const totalWidth = tableFields.reduce((sum, f) => sum + f.width, 0);
    const colStyles = {};
    tableFields.forEach((field, idx) => {
        colStyles[idx] = { cellWidth: (field.width / totalWidth) * contentWidth, valign: 'top' };
    });

    if (tableFields.length > 0) {
        doc.autoTable({
            startY: y,
            head: [headers],
            body: tableData,
            margin: { left: margin, right: margin, bottom: margin + 10 },
            theme: 'grid',
            styles: { fontSize: 8, cellPadding: 2, overflow: 'linebreak', valign: 'top' },
            headStyles: { fillColor: [29, 155, 240], textColor: [255, 255, 255], fontStyle: 'bold', halign: 'center' },
            bodyStyles: { textColor: [15, 20, 25] },
            alternateRowStyles: { fillColor: [247, 249, 249] },
            columnStyles: colStyles
        });
    }

    // Página de Próximos Passos
    if (hasProximosPassos) {
        doc.addPage();
        y = margin;

        if (includeHeader) {
            doc.setFillColor(29, 155, 240);
            doc.rect(0, 0, pageWidth, 15, 'F');
            doc.setFontSize(12);
            doc.setTextColor(255, 255, 255);
            doc.setFont(undefined, 'bold');
            doc.text('Próximos Passos', margin, 10);
            y = 22;
        }

        const stepsHeaders = ['Projeto', 'Nº', 'Ação', 'Status', 'Prazo', 'Responsável'];
        const stepsData = [];

        projects.forEach(project => {
            const steps = project.proximos_passos || [];
            steps.forEach((step, index) => {
                const isObject = typeof step === 'object';
                const texto = isObject ? (step.texto || '') : step;
                const status = isObject ? (step.status || 'pendente') : 'pendente';
                const prazo = isObject && step.prazo ? formatDateBR(step.prazo) : '-';
                const responsavel = isObject ? (step.responsavel || '-') : '-';

                const statusLabel = {
                    'pendente': 'Pendente',
                    'em_andamento': 'Em Andamento',
                    'concluido': 'Concluído'
                }[status] || status;

                stepsData.push([
                    project.nome || `Projeto ${project.id}`,
                    String(index + 1),
                    texto,
                    statusLabel,
                    prazo,
                    responsavel
                ]);
            });
        });

        if (stepsData.length > 0) {
            doc.autoTable({
                startY: y,
                head: [stepsHeaders],
                body: stepsData,
                margin: { left: margin, right: margin, bottom: margin + 10 },
                theme: 'grid',
                styles: { fontSize: 8, cellPadding: 2, overflow: 'linebreak', valign: 'top' },
                headStyles: { fillColor: [29, 155, 240], textColor: [255, 255, 255], fontStyle: 'bold', halign: 'center' },
                bodyStyles: { textColor: [15, 20, 25] },
                alternateRowStyles: { fillColor: [247, 249, 249] },
                columnStyles: {
                    0: { cellWidth: 45 },
                    1: { cellWidth: 10, halign: 'center' },
                    2: { cellWidth: 'auto' },
                    3: { cellWidth: 28 },
                    4: { cellWidth: 22 },
                    5: { cellWidth: 28 }
                },
                didParseCell: function(data) {
                    if (data.section === 'body' && data.column.index === 0) {
                        const currentProject = data.cell.raw;
                        const prevRow = data.row.index > 0 ? stepsData[data.row.index - 1][0] : null;
                        if (prevRow === currentProject) {
                            data.cell.text = [''];
                        }
                    }
                    if (data.section === 'body' && data.column.index === 3) {
                        const status = data.cell.raw;
                        if (status === 'Concluído') {
                            data.cell.styles.textColor = [0, 186, 124];
                            data.cell.styles.fontStyle = 'bold';
                        } else if (status === 'Em Andamento') {
                            data.cell.styles.textColor = [29, 155, 240];
                            data.cell.styles.fontStyle = 'bold';
                        }
                    }
                }
            });
        }
    }

    // Rodapé
    if (includeFooter) {
        const pageCount = doc.internal.getNumberOfPages();
        for (let i = 1; i <= pageCount; i++) {
            doc.setPage(i);
            doc.setFontSize(8);
            doc.setTextColor(100, 100, 100);
            doc.text(`Página ${i} de ${pageCount}`, pageWidth / 2, pageHeight - 7, { align: 'center' });
        }
    }

    const fileName = `${title.replace(/\s+/g, '_')}_${getDateStr()}.pdf`;
    doc.save(fileName);
    showToast(`${projects.length} projeto(s) exportado(s)!`, 'success');
}

// =====================================================
// EXPORTAR AÇÕES DE UM PROJETO ESPECÍFICO
// =====================================================

function exportProjectActions(docId) {
    const project = (window.allProjects || []).find(p => p.docId === docId);
    if (!project) {
        showToast('Projeto não encontrado.', 'error');
        return;
    }

    const steps = project.proximos_passos || [];
    if (steps.length === 0) {
        showToast('Este projeto não possui próximos passos.', 'warning');
        return;
    }

    // Perguntar formato
    const format = prompt('Escolha o formato de exportação:\n\n1 - Excel (.xlsx)\n2 - PDF\n3 - CSV\n\nDigite 1, 2 ou 3:');
    
    if (!format || !['1', '2', '3'].includes(format.trim())) {
        return;
    }

    const projectName = project.nome || `Projeto ${project.id}`;
    const fileName = `Acoes_${projectName.replace(/[^a-zA-Z0-9]/g, '_')}_${getDateStr()}`;

    switch (format.trim()) {
        case '1':
            exportProjectActionsXLSX(project, steps, fileName);
            break;
        case '2':
            exportProjectActionsPDF(project, steps, fileName);
            break;
        case '3':
            exportProjectActionsCSV(project, steps, fileName);
            break;
    }
}

function exportProjectActionsXLSX(project, steps, fileName) {
    if (typeof XLSX === 'undefined') {
        showToast('Biblioteca XLSX não carregada.', 'error');
        return;
    }

    const headers = ['Nº', 'Ação', 'Status', 'Prazo', 'Responsável'];
    const data = [headers];

    steps.forEach((step, index) => {
        const isObject = typeof step === 'object';
        const texto = isObject ? (step.texto || '') : step;
        const status = isObject ? (step.status || 'pendente') : 'pendente';
        const prazo = isObject && step.prazo ? formatDateBR(step.prazo) : '';
        const responsavel = isObject ? (step.responsavel || '') : '';

        const statusLabel = {
            'pendente': 'Pendente',
            'em_andamento': 'Em Andamento',
            'concluido': 'Concluído'
        }[status] || status;

        data.push([index + 1, texto, statusLabel, prazo, responsavel]);
    });

    const ws = XLSX.utils.aoa_to_sheet(data);
    ws['!cols'] = [
        { wch: 5 },   // Nº
        { wch: 60 },  // Ação
        { wch: 15 },  // Status
        { wch: 12 },  // Prazo
        { wch: 20 }   // Responsável
    ];

    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Ações');
    XLSX.writeFile(wb, `${fileName}.xlsx`);

    showToast(`${steps.length} ação(ões) exportada(s)!`, 'success');
}

function exportProjectActionsPDF(project, steps, fileName) {
    const { jsPDF } = window.jspdf;
    const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });

    const pageWidth = 210;
    const margin = 15;

    // Cabeçalho
    doc.setFillColor(29, 155, 240);
    doc.rect(0, 0, pageWidth, 20, 'F');
    doc.setFontSize(14);
    doc.setTextColor(255, 255, 255);
    doc.setFont(undefined, 'bold');
    doc.text(`Ações: ${project.nome || 'Projeto'}`, margin, 13);

    // Subtítulo
    doc.setFontSize(10);
    doc.setTextColor(100, 100, 100);
    doc.setFont(undefined, 'normal');
    doc.text(`Exportado em ${new Date().toLocaleDateString('pt-BR')}`, margin, 28);

    // Preparar dados
    const headers = ['Nº', 'Ação', 'Status', 'Prazo', 'Responsável'];
    const tableData = steps.map((step, index) => {
        const isObject = typeof step === 'object';
        const texto = isObject ? (step.texto || '') : step;
        const status = isObject ? (step.status || 'pendente') : 'pendente';
        const prazo = isObject && step.prazo ? formatDateBR(step.prazo) : '-';
        const responsavel = isObject ? (step.responsavel || '-') : '-';

        const statusLabel = {
            'pendente': 'Pendente',
            'em_andamento': 'Em Andamento',
            'concluido': 'Concluído'
        }[status] || status;

        return [String(index + 1), texto, statusLabel, prazo, responsavel];
    });

    doc.autoTable({
        startY: 35,
        head: [headers],
        body: tableData,
        margin: { left: margin, right: margin },
        theme: 'grid',
        styles: { fontSize: 9, cellPadding: 3, overflow: 'linebreak', valign: 'top' },
        headStyles: { fillColor: [29, 155, 240], textColor: [255, 255, 255], fontStyle: 'bold', halign: 'center' },
        bodyStyles: { textColor: [15, 20, 25] },
        alternateRowStyles: { fillColor: [247, 249, 249] },
        columnStyles: {
            0: { cellWidth: 10, halign: 'center' },
            1: { cellWidth: 'auto' },
            2: { cellWidth: 28 },
            3: { cellWidth: 22 },
            4: { cellWidth: 28 }
        },
        didParseCell: function(data) {
            if (data.section === 'body' && data.column.index === 2) {
                const status = data.cell.raw;
                if (status === 'Concluído') {
                    data.cell.styles.textColor = [0, 186, 124];
                    data.cell.styles.fontStyle = 'bold';
                } else if (status === 'Em Andamento') {
                    data.cell.styles.textColor = [29, 155, 240];
                    data.cell.styles.fontStyle = 'bold';
                }
            }
        }
    });

    // Rodapé
    const pageCount = doc.internal.getNumberOfPages();
    for (let i = 1; i <= pageCount; i++) {
        doc.setPage(i);
        doc.setFontSize(8);
        doc.setTextColor(100, 100, 100);
        doc.text(`Página ${i} de ${pageCount}`, pageWidth / 2, 290, { align: 'center' });
    }

    doc.save(`${fileName}.pdf`);
    showToast(`${steps.length} ação(ões) exportada(s)!`, 'success');
}

function exportProjectActionsCSV(project, steps, fileName) {
    const headers = ['Nº', 'Ação', 'Status', 'Prazo', 'Responsável'];
    const rows = steps.map((step, index) => {
        const isObject = typeof step === 'object';
        const texto = isObject ? (step.texto || '') : step;
        const status = isObject ? (step.status || 'pendente') : 'pendente';
        const prazo = isObject && step.prazo ? formatDateBR(step.prazo) : '';
        const responsavel = isObject ? (step.responsavel || '') : '';

        const statusLabel = {
            'pendente': 'Pendente',
            'em_andamento': 'Em Andamento',
            'concluido': 'Concluído'
        }[status] || status;

        return [index + 1, `"${texto.replace(/"/g, '""')}"`, statusLabel, prazo, responsavel].join(';');
    });

    const bom = '\uFEFF';
    const csv = bom + headers.join(';') + '\n' + rows.join('\n');

    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = `${fileName}.csv`;
    link.click();
    URL.revokeObjectURL(link.href);

    showToast(`${steps.length} ação(ões) exportada(s)!`, 'success');
}

// =====================================================
// UTILITÁRIOS
// =====================================================

function getDateStr() {
    const now = new Date();
    return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;
}

// Exportar funções globais
window.exportToXLSX = exportToXLSX;
window.exportToCSV = exportToCSV;
window.exportToPDF = exportToPDF;
window.openExportModal = openExportModal;
window.exportProjectActions = exportProjectActions;
