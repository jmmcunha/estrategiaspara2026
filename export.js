/**
 * EXPORTAÇÃO PERSONALIZADA DE PROJETOS
 * =====================================
 * Sistema de exportação com formatação clara de próximos passos
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

// =====================================================
// FORMATAÇÃO DE PRÓXIMOS PASSOS (NOVA ESTRUTURA)
// =====================================================

function formatProximosPassos(steps, format = 'text') {
    if (!steps || !Array.isArray(steps) || steps.length === 0) {
        return '';
    }

    const statusLabels = {
        'pendente': '⏳ Pendente',
        'em_andamento': '🔄 Em Andamento',
        'concluido': '✅ Concluído'
    };

    const statusLabelsSimple = {
        'pendente': 'Pendente',
        'em_andamento': 'Em Andamento',
        'concluido': 'Concluído'
    };

    return steps.map((step, index) => {
        // Compatibilidade: string antiga ou objeto novo
        if (typeof step === 'string') {
            return format === 'pdf' 
                ? `${index + 1}. ${step}`
                : `${index + 1}. ${step}`;
        }

        const texto = step.texto || '';
        const status = step.status || 'pendente';
        const prazo = step.prazo ? formatDateBR(step.prazo) : '';
        const responsavel = step.responsavel || '';

        if (format === 'xlsx' || format === 'csv') {
            // Formato estruturado para planilhas
            let linha = `${index + 1}. [${statusLabelsSimple[status] || status}] ${texto}`;
            if (prazo) linha += ` | Prazo: ${prazo}`;
            if (responsavel) linha += ` | Resp: ${responsavel}`;
            return linha;
        } else if (format === 'pdf') {
            // Formato para PDF com mais detalhes
            let linha = `${index + 1}. ${texto}`;
            let detalhes = [];
            detalhes.push(statusLabelsSimple[status] || status);
            if (prazo) detalhes.push(`Prazo: ${prazo}`);
            if (responsavel) detalhes.push(`Resp: ${responsavel}`);
            if (detalhes.length > 0) {
                linha += `\n     → ${detalhes.join(' | ')}`;
            }
            return linha;
        } else {
            // Formato texto simples
            return `${index + 1}. ${texto} (${statusLabelsSimple[status]})`;
        }
    }).join('\n');
}

function formatDateBR(dateStr) {
    if (!dateStr) return '';
    
    // Se já está no formato BR (DD/MM/YYYY)
    if (dateStr.includes('/')) return dateStr;
    
    // Se está no formato ISO (YYYY-MM-DD)
    try {
        const date = new Date(dateStr + 'T00:00:00');
        return date.toLocaleDateString('pt-BR');
    } catch {
        return dateStr;
    }
}

function formatMetas(metas) {
    if (!metas || !Array.isArray(metas) || metas.length === 0) {
        return '';
    }
    return metas.map((meta, index) => `${index + 1}. ${meta}`).join('\n');
}

function formatValue(value, key, format = 'text') {
    if (value === null || value === undefined) return '';
    
    // Formatação especial para próximos passos
    if (key === 'proximos_passos') {
        return formatProximosPassos(value, format);
    }
    
    // Formatação especial para metas
    if (key === 'metas') {
        return formatMetas(value);
    }
    
    if (Array.isArray(value)) return value.join('\n');
    if (key === 'progresso') return `${value}%`;
    return String(value);
}

// =====================================================
// EXPORTAR XLSX (MELHORADO)
// =====================================================

function doExportXLSX(projects, fields) {
    if (typeof XLSX === 'undefined') {
        showToast('Biblioteca XLSX não carregada.', 'error');
        return;
    }

    const wb = XLSX.utils.book_new();

    // ===== ABA 1: PROJETOS =====
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

    // ===== ABA 2: PRÓXIMOS PASSOS (DETALHADA) =====
    const stepsHeaders = ['Projeto', 'ID Projeto', 'Nº', 'Ação', 'Status', 'Prazo', 'Responsável'];
    const stepsData = [stepsHeaders];

    projects.forEach(project => {
        const steps = project.proximos_passos || [];
        steps.forEach((step, index) => {
            const isObject = typeof step === 'object';
            const texto = isObject ? (step.texto || '') : step;
            const status = isObject ? (step.status || 'Pendente') : 'Pendente';
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
            { wch: 30 },  // Projeto
            { wch: 10 },  // ID
            { wch: 5 },   // Nº
            { wch: 50 },  // Ação
            { wch: 15 },  // Status
            { wch: 12 },  // Prazo
            { wch: 20 }   // Responsável
        ];
        XLSX.utils.book_append_sheet(wb, wsSteps, 'Próximos Passos');
    }

    // ===== ABA 3: RESUMO POR STATUS =====
    const resumoHeaders = ['Status', 'Quantidade', 'Percentual'];
    const allSteps = projects.flatMap(p => p.proximos_passos || []);
    const totalSteps = allSteps.length;

    const countByStatus = {
        'Pendente': 0,
        'Em Andamento': 0,
        'Concluído': 0
    };

    allSteps.forEach(step => {
        const isObject = typeof step === 'object';
        const status = isObject ? (step.status || 'pendente') : 'pendente';
        if (status === 'pendente') countByStatus['Pendente']++;
        else if (status === 'em_andamento') countByStatus['Em Andamento']++;
        else if (status === 'concluido') countByStatus['Concluído']++;
    });

    const resumoData = [resumoHeaders];
    Object.entries(countByStatus).forEach(([status, count]) => {
        const pct = totalSteps > 0 ? ((count / totalSteps) * 100).toFixed(1) + '%' : '0%';
        resumoData.push([status, count, pct]);
    });
    resumoData.push(['TOTAL', totalSteps, '100%']);

    const wsResumo = XLSX.utils.aoa_to_sheet(resumoData);
    wsResumo['!cols'] = [{ wch: 15 }, { wch: 12 }, { wch: 12 }];
    XLSX.utils.book_append_sheet(wb, wsResumo, 'Resumo Ações');

    // Salvar
    const fileName = `Projetos_${getDateStr()}.xlsx`;
    XLSX.writeFile(wb, fileName);

    showToast(`${projects.length} projeto(s) exportado(s) para Excel com 3 abas!`, 'success');
}

// =====================================================
// EXPORTAR CSV (MELHORADO)
// =====================================================

function doExportCSV(projects, fields) {
    // Cabeçalhos
    const headers = fields.map(f => `"${f.label}"`).join(';');

    // Dados
    const rows = projects.map(project => {
        return fields.map(field => {
            const value = getFieldValue(project, field.key);
            const formatted = formatValue(value, field.key, 'csv');
            // Escapar aspas e manter quebras de linha
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
// EXPORTAR PDF (MELHORADO COM SEÇÃO DE AÇÕES)
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

    // ===== PÁGINA 1: TABELA DE PROJETOS =====
    
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

    // Filtrar campos para tabela principal (excluir próximos passos da tabela)
    const tableFields = fields.filter(f => f.key !== 'proximos_passos');
    const hasProximosPassos = fields.some(f => f.key === 'proximos_passos');

    // Preparar dados da tabela
    const headers = tableFields.map(f => f.label);
    const tableData = projects.map(project => {
        return tableFields.map(field => {
            const value = getFieldValue(project, field.key);
            return formatValue(value, field.key, 'pdf');
        });
    });

    // Calcular larguras proporcionais
    const totalWidth = tableFields.reduce((sum, f) => sum + f.width, 0);
    const colStyles = {};
    tableFields.forEach((field, idx) => {
        const width = (field.width / totalWidth) * contentWidth;
        colStyles[idx] = { 
            cellWidth: width,
            valign: 'top'
        };
    });

    // Gerar tabela de projetos
    if (tableFields.length > 0) {
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
            columnStyles: colStyles
        });
    }

    // ===== PÁGINAS SEGUINTES: PRÓXIMOS PASSOS POR PROJETO =====
    
    if (hasProximosPassos) {
        doc.addPage();
        y = margin;

        // Título da seção
        if (includeHeader) {
            doc.setFillColor(99, 102, 241);
            doc.rect(0, 0, pageWidth, 15, 'F');

            doc.setFontSize(12);
            doc.setTextColor(255, 255, 255);
            doc.setFont(undefined, 'bold');
            doc.text('Próximos Passos por Projeto', margin, 10);

            doc.setFontSize(9);
            doc.setFont(undefined, 'normal');
            const now = new Date();
            doc.text(`${now.toLocaleDateString('pt-BR')}`, pageWidth - margin, 10, { align: 'right' });

            y = 22;
        }

        // Tabela de ações detalhada
        const stepsHeaders = ['Projeto', 'Nº', 'Ação', 'Status', 'Prazo', 'Responsável'];
        const stepsData = [];

        projects.forEach(project => {
            const steps = project.proximos_passos || [];
            if (steps.length === 0) return;

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
                    fillColor: [59, 130, 246],
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
                columnStyles: {
                    0: { cellWidth: 45 },  // Projeto
                    1: { cellWidth: 10, halign: 'center' },  // Nº
                    2: { cellWidth: 'auto' },  // Ação
                    3: { cellWidth: 30 },  // Status
                    4: { cellWidth: 25 },  // Prazo
                    5: { cellWidth: 30 }   // Responsável
                },
                // Agrupar visualmente por projeto
                didParseCell: function(data) {
                    if (data.section === 'body' && data.column.index === 0) {
                        // Verificar se é a primeira linha do projeto
                        const currentProject = data.cell.raw;
                        const prevRow = data.row.index > 0 ? stepsData[data.row.index - 1][0] : null;
                        
                        if (prevRow === currentProject) {
                            // Mesma projeto, diminuir opacidade
                            data.cell.text = [''];
                            data.cell.styles.textColor = [150, 150, 150];
                        }
                    }
                    
                    // Colorir status
                    if (data.section === 'body' && data.column.index === 3) {
                        const status = data.cell.raw;
                        if (status === 'Concluído') {
                            data.cell.styles.textColor = [16, 185, 129];
                            data.cell.styles.fontStyle = 'bold';
                        } else if (status === 'Em Andamento') {
                            data.cell.styles.textColor = [59, 130, 246];
                            data.cell.styles.fontStyle = 'bold';
                        } else if (status === 'Pendente') {
                            data.cell.styles.textColor = [100, 116, 139];
                        }
                    }
                }
            });
        }

        // ===== PÁGINA FINAL: RESUMO DE STATUS =====
        doc.addPage();
        y = margin;

        if (includeHeader) {
            doc.setFillColor(99, 102, 241);
            doc.rect(0, 0, pageWidth, 15, 'F');

            doc.setFontSize(12);
            doc.setTextColor(255, 255, 255);
            doc.setFont(undefined, 'bold');
            doc.text('Resumo de Status das Ações', margin, 10);

            y = 22;
        }

        // Calcular estatísticas
        const allSteps = projects.flatMap(p => p.proximos_passos || []);
        const totalSteps = allSteps.length;
        
        const countByStatus = {
            'pendente': 0,
            'em_andamento': 0,
            'concluido': 0
        };

        allSteps.forEach(step => {
            const isObject = typeof step === 'object';
            const status = isObject ? (step.status || 'pendente') : 'pendente';
            if (countByStatus.hasOwnProperty(status)) {
                countByStatus[status]++;
            }
        });

        // Tabela de resumo
        const resumoHeaders = ['Status', 'Quantidade', 'Percentual'];
        const resumoData = [
            ['Pendente', countByStatus.pendente, totalSteps > 0 ? ((countByStatus.pendente / totalSteps) * 100).toFixed(1) + '%' : '0%'],
            ['Em Andamento', countByStatus.em_andamento, totalSteps > 0 ? ((countByStatus.em_andamento / totalSteps) * 100).toFixed(1) + '%' : '0%'],
            ['Concluído', countByStatus.concluido, totalSteps > 0 ? ((countByStatus.concluido / totalSteps) * 100).toFixed(1) + '%' : '0%'],
            ['TOTAL', totalSteps, '100%']
        ];

        doc.autoTable({
            startY: y,
            head: [resumoHeaders],
            body: resumoData,
            margin: { left: margin, right: margin },
            theme: 'grid',
            styles: {
                fontSize: 10,
                cellPadding: 4,
                halign: 'center'
            },
            headStyles: {
                fillColor: [16, 185, 129],
                textColor: [255, 255, 255],
                fontStyle: 'bold'
            },
            bodyStyles: {
                textColor: [30, 41, 59]
            },
            columnStyles: {
                0: { cellWidth: 50, halign: 'left' },
                1: { cellWidth: 30 },
                2: { cellWidth: 30 }
            },
            // Destacar linha de total e colorir status
            didParseCell: function(data) {
                if (data.section === 'body') {
                    // Linha total
                    if (data.row.index === 3) {
                        data.cell.styles.fontStyle = 'bold';
                        data.cell.styles.fillColor = [241, 245, 249];
                    }
                    // Colorir status
                    if (data.column.index === 0) {
                        if (data.row.index === 0) data.cell.styles.textColor = [100, 116, 139];
                        if (data.row.index === 1) data.cell.styles.textColor = [59, 130, 246];
                        if (data.row.index === 2) data.cell.styles.textColor = [16, 185, 129];
                    }
                }
            }
        });

        // Gráfico visual simples (barras)
        const barY = doc.lastAutoTable.finalY + 15;
        const barHeight = 20;
        const barMaxWidth = 150;

        doc.setFontSize(10);
        doc.setTextColor(30, 41, 59);
        doc.text('Distribuição Visual:', margin, barY);

        const barData = [
            { label: 'Pendente', value: countByStatus.pendente, color: [100, 116, 139] },
            { label: 'Em Andamento', value: countByStatus.em_andamento, color: [59, 130, 246] },
            { label: 'Concluído', value: countByStatus.concluido, color: [16, 185, 129] }
        ];

        let currentBarY = barY + 8;
        barData.forEach(bar => {
            const barWidth = totalSteps > 0 ? (bar.value / totalSteps) * barMaxWidth : 0;
            
            // Fundo
            doc.setFillColor(241, 245, 249);
            doc.rect(margin, currentBarY, barMaxWidth, barHeight - 5, 'F');
            
            // Barra
            doc.setFillColor(...bar.color);
            doc.rect(margin, currentBarY, barWidth, barHeight - 5, 'F');
            
            // Label
            doc.setFontSize(9);
            doc.setTextColor(30, 41, 59);
            doc.text(`${bar.label}: ${bar.value}`, margin + barMaxWidth + 5, currentBarY + 8);
            
            currentBarY += barHeight;
        });
    }

    // Adicionar rodapé em todas as páginas
    if (includeFooter) {
        const pageCount = doc.internal.getNumberOfPages();
        for (let i = 1; i <= pageCount; i++) {
            doc.setPage(i);
            doc.setFontSize(8);
            doc.setTextColor(100, 116, 139);
            doc.text(
                `Página ${i} de ${pageCount}`,
                pageWidth / 2,
                pageHeight - 7,
                { align: 'center' }
            );
        }
    }

    // Salvar
    const fileName = `${title.replace(/\s+/g, '_')}_${getDateStr()}.pdf`;
    doc.save(fileName);

    showToast(`${projects.length} projeto(s) exportado(s) para PDF com detalhamento de ações!`, 'success');
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
