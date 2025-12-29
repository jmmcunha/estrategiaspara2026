/**
 * GERAÇÃO DE RELATÓRIOS EXECUTIVOS
 * =================================
 * Relatórios PDF formatados para impressão A4
 */

// Inicializar listeners de relatórios
function initReportsListeners() {
    const exportReportBtn = document.getElementById('export-report');
    const reportModal = document.getElementById('report-modal');
    const reportForm = document.getElementById('report-form');

    if (exportReportBtn) {
        exportReportBtn.addEventListener('click', () => {
            prepareReportModal();
            openModal(reportModal);
        });
    }

    if (reportForm) {
        reportForm.addEventListener('submit', (e) => {
            e.preventDefault();
            generateExecutiveReport();
        });
    }
}

// Preparar modal de relatório
function prepareReportModal() {
    const settings = window.currentSettings || {};
    const texts = settings.texts || {};

    const reportTitle = document.getElementById('report-title');
    if (reportTitle && texts.orgName) {
        reportTitle.value = `Relatório Executivo - ${texts.orgName}`;
    }

    // Período padrão: mês atual
    const now = new Date();
    const monthNames = ['Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho',
                        'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro'];
    const periodInput = document.getElementById('report-period');
    if (periodInput) {
        periodInput.value = `${monthNames[now.getMonth()]} de ${now.getFullYear()}`;
    }
}

// =====================================================
// GERAÇÃO DO RELATÓRIO EXECUTIVO
// =====================================================

function generateExecutiveReport() {
    const { jsPDF } = window.jspdf;
    const doc = new jsPDF({
        orientation: 'portrait',
        unit: 'mm',
        format: 'a4'
    });

    // Configurações do relatório
    const config = {
        title: document.getElementById('report-title').value || 'Relatório Executivo',
        period: document.getElementById('report-period').value || '',
        author: document.getElementById('report-author').value || '',
        includeSummary: document.getElementById('report-summary').checked,
        includeChart: document.getElementById('report-chart').checked,
        includeDetails: document.getElementById('report-details').checked,
        includeSwot: document.getElementById('report-swot').checked,
        includeNextSteps: document.getElementById('report-next-steps').checked,
        filter: document.getElementById('report-filter').value
    };

    // Obter configurações personalizadas
    const settings = window.currentSettings || {};
    const texts = settings.texts || {};
    const colors = settings.colors || {};

    // Filtrar projetos
    let projects = [...(window.allProjects || [])];
    if (config.filter !== 'todos') {
        projects = projects.filter(p => p.status === config.filter);
    }

    // Paleta de cores
    const primaryColor = hexToRgb(colors.primary || '#1e40af');
    const headerBg = [30, 64, 175]; // Azul escuro
    const lightBg = [248, 250, 252]; // Cinza muito claro
    const darkText = [30, 41, 59];
    const mutedText = [100, 116, 139];
    const successColor = [34, 197, 94];
    const warningColor = [245, 158, 11];
    const dangerColor = [239, 68, 68];

    // Margens A4
    const margin = { left: 15, right: 15, top: 15 };
    const pageWidth = 210;
    const contentWidth = pageWidth - margin.left - margin.right;
    
    let y = margin.top;

    // ==================== CAPA ====================
    drawCoverPage(doc, config, texts, primaryColor, darkText, mutedText);
    
    // ==================== PÁGINAS DE CONTEÚDO ====================
    doc.addPage();
    y = margin.top;

    // Cabeçalho da página
    y = drawPageHeader(doc, config.title, config.period, primaryColor, y);

    // ==================== RESUMO EXECUTIVO ====================
    if (config.includeSummary) {
        y = drawSectionTitle(doc, 'RESUMO EXECUTIVO', primaryColor, y, margin.left);
        y = drawExecutiveSummary(doc, projects, y, margin.left, contentWidth, darkText, mutedText, successColor, warningColor, dangerColor);
        y += 10;
    }

    // ==================== GRÁFICO ====================
    if (config.includeChart) {
        if (y > 180) {
            doc.addPage();
            y = margin.top;
            y = drawPageHeader(doc, config.title, config.period, primaryColor, y);
        }
        y = drawSectionTitle(doc, 'DISTRIBUIÇÃO POR STATUS', primaryColor, y, margin.left);
        y = drawChart(doc, y, margin.left, contentWidth);
        y += 10;
    }

    // ==================== TABELA DE PROJETOS ====================
    if (config.includeDetails && projects.length > 0) {
        if (y > 160) {
            doc.addPage();
            y = margin.top;
            y = drawPageHeader(doc, config.title, config.period, primaryColor, y);
        }
        y = drawSectionTitle(doc, 'VISÃO GERAL DOS PROJETOS', primaryColor, y, margin.left);
        y = drawProjectsTable(doc, projects, y, margin.left, contentWidth, headerBg, lightBg, darkText);
    }

    // ==================== PRÓXIMAS AÇÕES CONSOLIDADAS ====================
    if (config.includeNextSteps) {
        // Coletar todas as ações
        const allActions = [];
        projects.forEach(project => {
            const steps = project.proximos_passos || [];
            steps.forEach(step => {
                allActions.push({
                    acao: step,
                    projeto: project.nome || `Projeto ${project.id}`,
                    prazo: project.prazo || '-',
                    responsavel: project.responsavel || '-',
                    status: project.status || '-'
                });
            });
        });

        if (allActions.length > 0) {
            doc.addPage();
            y = margin.top;
            y = drawPageHeader(doc, config.title, config.period, primaryColor, y);
            y = drawNextActionsPage(doc, allActions, y, margin.left, contentWidth, headerBg, lightBg, darkText, mutedText, primaryColor);
        }
    }

    // ==================== ANÁLISE SWOT ====================
    if (config.includeSwot) {
        const projectsWithSwot = projects.filter(p => 
            p.swot && (p.swot.forcas || p.swot.fraquezas || p.swot.oportunidades || p.swot.ameacas)
        );

        if (projectsWithSwot.length > 0) {
            doc.addPage();
            y = margin.top;
            y = drawPageHeader(doc, config.title, config.period, primaryColor, y);
            y = drawSectionTitle(doc, 'ANÁLISE SWOT', primaryColor, y, margin.left);
            y = drawSwotAnalysis(doc, projectsWithSwot, y, margin.left, contentWidth, headerBg, lightBg, darkText);
        }
    }

    // ==================== RODAPÉ EM TODAS AS PÁGINAS ====================
    addFooterToAllPages(doc, config.author, mutedText);

    // Salvar
    const fileName = `Relatorio_Executivo_${formatDateForFile(new Date())}.pdf`;
    doc.save(fileName);

    showToast('Relatório gerado com sucesso!', 'success');
    closeModal(document.getElementById('report-modal'));
}

// =====================================================
// FUNÇÕES DE DESENHO
// =====================================================

function drawCoverPage(doc, config, texts, primaryColor, darkText, mutedText) {
    const pageWidth = 210;
    const pageHeight = 297;
    
    // Faixa superior colorida
    doc.setFillColor(...primaryColor);
    doc.rect(0, 0, pageWidth, 60, 'F');
    
    // Título da organização
    if (texts.orgName) {
        doc.setFontSize(14);
        doc.setTextColor(255, 255, 255);
        doc.setFont(undefined, 'normal');
        doc.text(texts.orgName.toUpperCase(), pageWidth / 2, 25, { align: 'center' });
    }

    if (texts.reportHeader) {
        doc.setFontSize(10);
        doc.text(texts.reportHeader, pageWidth / 2, 35, { align: 'center' });
    }

    // Título do relatório (centralizado)
    doc.setFontSize(28);
    doc.setTextColor(...darkText);
    doc.setFont(undefined, 'bold');
    doc.text(config.title.toUpperCase(), pageWidth / 2, 120, { align: 'center' });

    // Período
    if (config.period) {
        doc.setFontSize(16);
        doc.setFont(undefined, 'normal');
        doc.setTextColor(...mutedText);
        doc.text(config.period, pageWidth / 2, 135, { align: 'center' });
    }

    // Linha decorativa
    doc.setDrawColor(...primaryColor);
    doc.setLineWidth(1);
    doc.line(70, 145, 140, 145);

    // Data de geração
    const now = new Date();
    doc.setFontSize(10);
    doc.setTextColor(...mutedText);
    doc.text(`Gerado em ${now.toLocaleDateString('pt-BR')}`, pageWidth / 2, 250, { align: 'center' });

    // Autor
    if (config.author) {
        doc.setFontSize(11);
        doc.text(`Elaborado por: ${config.author}`, pageWidth / 2, 260, { align: 'center' });
    }

    // Faixa inferior
    doc.setFillColor(...primaryColor);
    doc.rect(0, pageHeight - 15, pageWidth, 15, 'F');
}

function drawPageHeader(doc, title, period, primaryColor, y) {
    const pageWidth = 210;
    
    // Linha colorida no topo
    doc.setFillColor(...primaryColor);
    doc.rect(0, 0, pageWidth, 5, 'F');
    
    // Título e período
    doc.setFontSize(10);
    doc.setTextColor(...primaryColor);
    doc.setFont(undefined, 'bold');
    doc.text(title, 15, 12);
    
    if (period) {
        doc.setFont(undefined, 'normal');
        doc.setTextColor(100, 116, 139);
        doc.text(period, 195, 12, { align: 'right' });
    }

    return 25;
}

function drawSectionTitle(doc, title, primaryColor, y, marginLeft) {
    doc.setFillColor(...primaryColor);
    doc.rect(marginLeft, y, 4, 8, 'F');
    
    doc.setFontSize(14);
    doc.setTextColor(...primaryColor);
    doc.setFont(undefined, 'bold');
    doc.text(title, marginLeft + 8, y + 6);
    
    return y + 15;
}

function drawExecutiveSummary(doc, projects, y, marginLeft, contentWidth, darkText, mutedText, successColor, warningColor, dangerColor) {
    const stats = calculateStats(projects);
    
    // Cards de resumo
    const cardWidth = (contentWidth - 15) / 4;
    const cardHeight = 25;
    const cardY = y;
    
    const cards = [
        { label: 'Total', value: stats.total, color: [59, 130, 246] },
        { label: 'Em Andamento', value: stats.ongoing, color: [59, 130, 246] },
        { label: 'Concluídos', value: stats.completed, color: successColor },
        { label: 'Planejados', value: stats.planned, color: warningColor }
    ];

    cards.forEach((card, index) => {
        const x = marginLeft + (index * (cardWidth + 5));
        
        // Fundo do card
        doc.setFillColor(248, 250, 252);
        doc.roundedRect(x, cardY, cardWidth, cardHeight, 2, 2, 'F');
        
        // Borda esquerda colorida
        doc.setFillColor(...card.color);
        doc.rect(x, cardY, 3, cardHeight, 'F');
        
        // Valor
        doc.setFontSize(18);
        doc.setTextColor(...darkText);
        doc.setFont(undefined, 'bold');
        doc.text(String(card.value), x + cardWidth / 2 + 2, cardY + 10, { align: 'center' });
        
        // Label
        doc.setFontSize(8);
        doc.setTextColor(...mutedText);
        doc.setFont(undefined, 'normal');
        doc.text(card.label, x + cardWidth / 2 + 2, cardY + 18, { align: 'center' });
    });

    y = cardY + cardHeight + 10;

    // Métricas adicionais
    doc.setFontSize(10);
    doc.setTextColor(...darkText);
    doc.setFont(undefined, 'normal');
    
    const metrics = [
        `Progresso médio: ${stats.avgProgress}%`,
        `Prazos vencidos: ${stats.overdue}`,
        `Próximos 7 dias: ${stats.upcoming} prazo(s)`
    ];

    metrics.forEach((metric, index) => {
        doc.text(`• ${metric}`, marginLeft + 5, y + (index * 6));
    });

    return y + 20;
}

function drawChart(doc, y, marginLeft, contentWidth) {
    const chartCanvas = document.getElementById('status-chart');
    if (chartCanvas) {
        try {
            const chartImage = chartCanvas.toDataURL('image/png');
            const chartWidth = 80;
            const chartHeight = 50;
            const chartX = marginLeft + (contentWidth - chartWidth) / 2;
            doc.addImage(chartImage, 'PNG', chartX, y, chartWidth, chartHeight);
            return y + chartHeight + 5;
        } catch (e) {
            console.warn('Não foi possível incluir o gráfico:', e);
        }
    }
    return y;
}

function drawProjectsTable(doc, projects, y, marginLeft, contentWidth, headerBg, lightBg, darkText) {
    const tableData = projects.map((p, index) => [
        String(index + 1),
        truncateText(p.nome || '-', 35),
        p.status || '-',
        `${p.progresso || 0}%`,
        p.prazo || '-',
        truncateText(p.responsavel || '-', 15)
    ]);

    doc.autoTable({
        startY: y,
        head: [['#', 'Projeto', 'Status', 'Progresso', 'Prazo', 'Responsável']],
        body: tableData,
        margin: { left: marginLeft, right: 15 },
        theme: 'plain',
        headStyles: {
            fillColor: headerBg,
            textColor: [255, 255, 255],
            fontStyle: 'bold',
            fontSize: 9,
            cellPadding: 4
        },
        bodyStyles: {
            fontSize: 9,
            cellPadding: 4,
            textColor: darkText
        },
        alternateRowStyles: {
            fillColor: lightBg
        },
        columnStyles: {
            0: { cellWidth: 10, halign: 'center' },
            1: { cellWidth: 55 },
            2: { cellWidth: 28, halign: 'center' },
            3: { cellWidth: 22, halign: 'center' },
            4: { cellWidth: 25, halign: 'center' },
            5: { cellWidth: 30 }
        },
        didParseCell: function(data) {
            // Colorir status
            if (data.column.index === 2 && data.section === 'body') {
                const status = data.cell.raw.toLowerCase();
                if (status.includes('andamento')) {
                    data.cell.styles.textColor = [59, 130, 246];
                } else if (status.includes('conclu')) {
                    data.cell.styles.textColor = [34, 197, 94];
                } else if (status.includes('planejado')) {
                    data.cell.styles.textColor = [245, 158, 11];
                } else if (status.includes('suspenso')) {
                    data.cell.styles.textColor = [239, 68, 68];
                }
                data.cell.styles.fontStyle = 'bold';
            }
        }
    });

    return doc.lastAutoTable.finalY + 10;
}

function drawNextActionsPage(doc, allActions, y, marginLeft, contentWidth, headerBg, lightBg, darkText, mutedText, primaryColor) {
    // Título da seção
    y = drawSectionTitle(doc, 'PRÓXIMAS AÇÕES CONSOLIDADAS', primaryColor, y, marginLeft);

    // Subtítulo com contagem
    doc.setFontSize(10);
    doc.setTextColor(...mutedText);
    doc.setFont(undefined, 'normal');
    doc.text(`Total de ${allActions.length} ação(ões) pendente(s) em ${countUniqueProjects(allActions)} projeto(s)`, marginLeft, y);
    y += 10;

    // Tabela de ações
    const tableData = allActions.map((item, index) => [
        String(index + 1),
        truncateText(item.acao, 55),
        truncateText(item.projeto, 30),
        item.prazo,
        truncateText(item.responsavel, 18)
    ]);

    doc.autoTable({
        startY: y,
        head: [['#', 'Ação / Próximo Passo', 'Projeto', 'Prazo', 'Responsável']],
        body: tableData,
        margin: { left: marginLeft, right: 15 },
        theme: 'plain',
        headStyles: {
            fillColor: headerBg,
            textColor: [255, 255, 255],
            fontStyle: 'bold',
            fontSize: 9,
            cellPadding: 5
        },
        bodyStyles: {
            fontSize: 9,
            cellPadding: 5,
            textColor: darkText,
            lineColor: [226, 232, 240],
            lineWidth: 0.1
        },
        alternateRowStyles: {
            fillColor: lightBg
        },
        columnStyles: {
            0: { cellWidth: 10, halign: 'center', fontStyle: 'bold' },
            1: { cellWidth: 75 },
            2: { cellWidth: 40 },
            3: { cellWidth: 25, halign: 'center' },
            4: { cellWidth: 25 }
        },
        didParseCell: function(data) {
            // Destacar prazos vencidos
            if (data.column.index === 3 && data.section === 'body') {
                const prazo = data.cell.raw;
                if (prazo && prazo !== '-') {
                    const prazoDate = parseReportDate(prazo);
                    if (prazoDate && prazoDate < new Date()) {
                        data.cell.styles.textColor = [239, 68, 68];
                        data.cell.styles.fontStyle = 'bold';
                    }
                }
            }
        },
        didDrawPage: function(data) {
            // Cabeçalho em páginas adicionais
            if (data.pageNumber > 1) {
                doc.setFillColor(...primaryColor);
                doc.rect(0, 0, 210, 5, 'F');
                doc.setFontSize(9);
                doc.setTextColor(...mutedText);
                doc.text('Próximas Ações (continuação)', marginLeft, 12);
            }
        }
    });

    y = doc.lastAutoTable.finalY + 15;

    // Resumo por projeto (se couber na página)
    if (y < 230) {
        doc.setFontSize(11);
        doc.setTextColor(...darkText);
        doc.setFont(undefined, 'bold');
        doc.text('Resumo por Projeto', marginLeft, y);
        y += 8;

        const projectCounts = {};
        allActions.forEach(action => {
            projectCounts[action.projeto] = (projectCounts[action.projeto] || 0) + 1;
        });

        doc.setFontSize(9);
        doc.setFont(undefined, 'normal');

        Object.entries(projectCounts)
            .sort((a, b) => b[1] - a[1])
            .forEach(([projeto, count]) => {
                if (y > 270) return;
                
                // Barra visual
                const barWidth = Math.min(count * 15, 100);
                doc.setFillColor(219, 234, 254);
                doc.rect(marginLeft, y - 3, barWidth, 5, 'F');
                
                doc.setTextColor(...darkText);
                doc.text(`${projeto}: ${count} ação(ões)`, marginLeft + 2, y);
                y += 8;
            });
    }

    return y;
}

function drawSwotAnalysis(doc, projectsWithSwot, y, marginLeft, contentWidth, headerBg, lightBg, darkText) {
    projectsWithSwot.forEach((project, index) => {
        if (y > 200) {
            doc.addPage();
            y = 25;
        }

        const swot = project.swot || {};

        // Nome do projeto
        doc.setFontSize(11);
        doc.setFont(undefined, 'bold');
        doc.setTextColor(...headerBg);
        doc.text(`${index + 1}. ${project.nome}`, marginLeft, y);
        y += 8;

        // Tabela SWOT 2x2
        const halfWidth = (contentWidth - 5) / 2;
        const cellHeight = 25;

        const swotItems = [
            { label: 'FORÇAS', content: swot.forcas || '-', color: [34, 197, 94], x: marginLeft, y: y },
            { label: 'FRAQUEZAS', content: swot.fraquezas || '-', color: [239, 68, 68], x: marginLeft + halfWidth + 5, y: y },
            { label: 'OPORTUNIDADES', content: swot.oportunidades || '-', color: [59, 130, 246], x: marginLeft, y: y + cellHeight + 3 },
            { label: 'AMEAÇAS', content: swot.ameacas || '-', color: [245, 158, 11], x: marginLeft + halfWidth + 5, y: y + cellHeight + 3 }
        ];

        swotItems.forEach(item => {
            // Fundo
            doc.setFillColor(248, 250, 252);
            doc.roundedRect(item.x, item.y, halfWidth, cellHeight, 2, 2, 'F');
            
            // Borda superior colorida
            doc.setFillColor(...item.color);
            doc.rect(item.x, item.y, halfWidth, 3, 'F');
            
            // Label
            doc.setFontSize(8);
            doc.setTextColor(...item.color);
            doc.setFont(undefined, 'bold');
            doc.text(item.label, item.x + 3, item.y + 8);
            
            // Conteúdo
            doc.setFontSize(8);
            doc.setTextColor(...darkText);
            doc.setFont(undefined, 'normal');
            const lines = doc.splitTextToSize(item.content, halfWidth - 6);
            doc.text(lines.slice(0, 3), item.x + 3, item.y + 14);
        });

        y += (cellHeight * 2) + 15;
    });

    return y;
}

function addFooterToAllPages(doc, author, mutedText) {
    const pageCount = doc.internal.getNumberOfPages();
    const now = new Date();
    
    for (let i = 2; i <= pageCount; i++) { // Pula a capa
        doc.setPage(i);
        
        // Linha divisória
        doc.setDrawColor(226, 232, 240);
        doc.setLineWidth(0.3);
        doc.line(15, 282, 195, 282);
        
        // Data de geração
        doc.setFontSize(8);
        doc.setTextColor(...mutedText);
        doc.text(`Gerado em ${now.toLocaleDateString('pt-BR')} às ${now.toLocaleTimeString('pt-BR')}`, 15, 288);
        
        // Página
        doc.text(`Página ${i - 1} de ${pageCount - 1}`, 195, 288, { align: 'right' });
        
        // Autor no centro
        if (author) {
            doc.text(author, 105, 288, { align: 'center' });
        }
    }
}

// =====================================================
// FUNÇÕES AUXILIARES
// =====================================================

function calculateStats(projects) {
    const total = projects.length;
    const ongoing = projects.filter(p => p.status && p.status.toLowerCase() === 'em andamento').length;
    const completed = projects.filter(p => p.status && p.status.toLowerCase() === 'concluído').length;
    const planned = projects.filter(p => p.status && p.status.toLowerCase() === 'planejado').length;

    const progressSum = projects.reduce((sum, p) => sum + (parseInt(p.progresso) || 0), 0);
    const avgProgress = total > 0 ? Math.round(progressSum / total) : 0;

    const today = new Date();
    today.setHours(0, 0, 0, 0);

    let overdue = 0;
    let upcoming = 0;

    projects.forEach(p => {
        if (!p.prazo || (p.status && p.status.toLowerCase() === 'concluído')) return;
        
        const deadline = parseReportDate(p.prazo);
        if (!deadline) return;

        const diffDays = Math.ceil((deadline - today) / (1000 * 60 * 60 * 24));
        
        if (diffDays < 0) overdue++;
        else if (diffDays <= 7) upcoming++;
    });

    return {
        total,
        ongoing,
        completed,
        planned,
        ongoingPercent: total > 0 ? Math.round(ongoing / total * 100) : 0,
        completedPercent: total > 0 ? Math.round(completed / total * 100) : 0,
        plannedPercent: total > 0 ? Math.round(planned / total * 100) : 0,
        avgProgress,
        overdue,
        upcoming
    };
}

function parseReportDate(dateString) {
    if (!dateString || typeof dateString !== 'string') return null;
    
    const parts = dateString.split('/');
    if (parts.length === 3) {
        return new Date(parts[2], parts[1] - 1, parts[0]);
    }
    
    const isoDate = new Date(dateString);
    if (!isNaN(isoDate.getTime())) {
        return isoDate;
    }
    
    return null;
}

function hexToRgb(hex) {
    const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
    return result ? [
        parseInt(result[1], 16),
        parseInt(result[2], 16),
        parseInt(result[3], 16)
    ] : [30, 64, 175];
}

function formatDateForFile(date) {
    const d = date.getDate().toString().padStart(2, '0');
    const m = (date.getMonth() + 1).toString().padStart(2, '0');
    const y = date.getFullYear();
    return `${y}-${m}-${d}`;
}

function truncateText(text, maxLength) {
    if (!text) return '-';
    if (text.length <= maxLength) return text;
    return text.substring(0, maxLength - 3) + '...';
}

function countUniqueProjects(actions) {
    const unique = new Set(actions.map(a => a.projeto));
    return unique.size;
}

// Exportar funções
window.initReportsListeners = initReportsListeners;
