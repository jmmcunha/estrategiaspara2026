/**
 * GERAÇÃO DE RELATÓRIOS
 * =====================
 * Relatórios executivos em PDF formatados
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

    // Preencher com dados das configurações
    const reportTitle = document.getElementById('report-title');
    const reportAuthor = document.getElementById('report-author');

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

// Gerar relatório executivo
function generateExecutiveReport() {
    const { jsPDF } = window.jspdf;
    const doc = new jsPDF();

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

    // Cores do tema (convertidas para RGB)
    const primaryColor = hexToRgb(colors.primary || '#58a6ff');
    const darkColor = [30, 41, 59];
    const lightGray = [148, 163, 184];

    let y = 20;

    // ==================== CABEÇALHO ====================
    if (texts.reportHeader) {
        doc.setFontSize(10);
        doc.setTextColor(...lightGray);
        doc.text(texts.reportHeader, 105, y, { align: 'center' });
        y += 8;
    }

    if (texts.orgName) {
        doc.setFontSize(12);
        doc.setTextColor(...darkColor);
        doc.setFont(undefined, 'bold');
        doc.text(texts.orgName, 105, y, { align: 'center' });
        y += 15;
    }

    // Título do relatório
    doc.setFontSize(20);
    doc.setTextColor(...primaryColor);
    doc.setFont(undefined, 'bold');
    doc.text(config.title, 105, y, { align: 'center' });
    y += 10;

    // Período
    if (config.period) {
        doc.setFontSize(12);
        doc.setTextColor(...lightGray);
        doc.setFont(undefined, 'normal');
        doc.text(config.period, 105, y, { align: 'center' });
        y += 15;
    }

    // Linha divisória
    doc.setDrawColor(...primaryColor);
    doc.setLineWidth(0.5);
    doc.line(20, y, 190, y);
    y += 15;

    // ==================== RESUMO EXECUTIVO ====================
    if (config.includeSummary) {
        doc.setFontSize(14);
        doc.setTextColor(...darkColor);
        doc.setFont(undefined, 'bold');
        doc.text('Resumo Executivo', 20, y);
        y += 10;

        // Estatísticas
        const stats = calculateStats(projects);
        
        doc.setFontSize(10);
        doc.setFont(undefined, 'normal');
        doc.setTextColor(60, 60, 60);

        const summaryLines = [
            `Total de Projetos: ${stats.total}`,
            `Em Andamento: ${stats.ongoing} (${stats.ongoingPercent}%)`,
            `Concluídos: ${stats.completed} (${stats.completedPercent}%)`,
            `Planejados: ${stats.planned} (${stats.plannedPercent}%)`,
            `Progresso Médio: ${stats.avgProgress}%`,
            `Prazos Vencidos: ${stats.overdue}`,
            `Próximos Prazos (7 dias): ${stats.upcoming}`
        ];

        summaryLines.forEach(line => {
            doc.text(line, 25, y);
            y += 6;
        });

        y += 10;
    }

    // ==================== GRÁFICO DE STATUS ====================
    if (config.includeChart) {
        const chartCanvas = document.getElementById('status-chart');
        if (chartCanvas) {
            try {
                const chartImage = chartCanvas.toDataURL('image/png');
                doc.addImage(chartImage, 'PNG', 60, y, 90, 60);
                y += 70;
            } catch (e) {
                console.warn('Não foi possível incluir o gráfico:', e);
            }
        }
    }

    // ==================== DETALHES DOS PROJETOS ====================
    if (config.includeDetails && projects.length > 0) {
        if (y > 200) {
            doc.addPage();
            y = 20;
        }

        doc.setFontSize(14);
        doc.setTextColor(...darkColor);
        doc.setFont(undefined, 'bold');
        doc.text('Detalhes dos Projetos', 20, y);
        y += 10;

        const tableData = projects.map((p, index) => [
            index + 1,
            p.nome || '',
            p.status || '',
            `${p.progresso || 0}%`,
            p.prazo || '-',
            p.responsavel || '-'
        ]);

        doc.autoTable({
            startY: y,
            head: [['#', 'Projeto', 'Status', 'Progresso', 'Prazo', 'Responsável']],
            body: tableData,
            theme: 'striped',
            headStyles: {
                fillColor: primaryColor,
                textColor: [255, 255, 255],
                fontStyle: 'bold'
            },
            styles: {
                fontSize: 9,
                cellPadding: 3
            },
            columnStyles: {
                0: { cellWidth: 10 },
                1: { cellWidth: 50 },
                2: { cellWidth: 25 },
                3: { cellWidth: 20 },
                4: { cellWidth: 25 },
                5: { cellWidth: 30 }
            }
        });

        y = doc.lastAutoTable.finalY + 15;
    }

    // ==================== PRÓXIMOS PASSOS CONSOLIDADOS ====================
    if (config.includeNextSteps) {
        // Coletar TODAS as ações de todos os projetos em uma lista única
        const allNextSteps = [];
        
        projects.forEach(project => {
            const steps = project.proximos_passos || [];
            steps.forEach(step => {
                allNextSteps.push({
                    acao: step,
                    projeto: project.nome || `Projeto ${project.id}`,
                    prazo: project.prazo || '-',
                    status: project.status || '-',
                    responsavel: project.responsavel || '-'
                });
            });
        });
        
        if (allNextSteps.length > 0) {
            // Nova página para próximos passos
            doc.addPage();
            y = 20;

            // Título da seção
            doc.setFontSize(16);
            doc.setTextColor(...primaryColor);
            doc.setFont(undefined, 'bold');
            doc.text('PRÓXIMAS AÇÕES CONSOLIDADAS', 105, y, { align: 'center' });
            y += 5;

            // Subtítulo
            doc.setFontSize(10);
            doc.setTextColor(...lightGray);
            doc.setFont(undefined, 'normal');
            doc.text(`Total: ${allNextSteps.length} ação(ões) pendente(s)`, 105, y, { align: 'center' });
            y += 10;

            // Linha divisória
            doc.setDrawColor(...primaryColor);
            doc.setLineWidth(0.3);
            doc.line(20, y, 190, y);
            y += 10;

            // Tabela consolidada de próximas ações
            const stepsTableData = allNextSteps.map((item, index) => [
                index + 1,
                item.acao,
                item.projeto,
                item.prazo,
                item.responsavel
            ]);

            doc.autoTable({
                startY: y,
                head: [['#', 'Ação', 'Projeto', 'Prazo', 'Responsável']],
                body: stepsTableData,
                theme: 'striped',
                headStyles: {
                    fillColor: primaryColor,
                    textColor: [255, 255, 255],
                    fontStyle: 'bold',
                    fontSize: 10
                },
                styles: {
                    fontSize: 9,
                    cellPadding: 4,
                    overflow: 'linebreak'
                },
                columnStyles: {
                    0: { cellWidth: 10, halign: 'center' },
                    1: { cellWidth: 70 },
                    2: { cellWidth: 40 },
                    3: { cellWidth: 25, halign: 'center' },
                    4: { cellWidth: 25 }
                },
                alternateRowStyles: {
                    fillColor: [245, 247, 250]
                },
                didDrawPage: function(data) {
                    // Adicionar cabeçalho em cada página
                    if (data.pageNumber > 1) {
                        doc.setFontSize(10);
                        doc.setTextColor(...lightGray);
                        doc.text('Próximas Ações (continuação)', 20, 15);
                    }
                }
            });

            y = doc.lastAutoTable.finalY + 15;

            // Resumo por projeto
            if (y < 250) {
                doc.setFontSize(11);
                doc.setTextColor(...darkColor);
                doc.setFont(undefined, 'bold');
                doc.text('Resumo por Projeto:', 20, y);
                y += 8;

                doc.setFontSize(9);
                doc.setFont(undefined, 'normal');

                const projectCounts = {};
                allNextSteps.forEach(step => {
                    projectCounts[step.projeto] = (projectCounts[step.projeto] || 0) + 1;
                });

                Object.entries(projectCounts).forEach(([projeto, count]) => {
                    if (y > 275) {
                        doc.addPage();
                        y = 20;
                    }
                    doc.text(`• ${projeto}: ${count} ação(ões)`, 25, y);
                    y += 5;
                });
            }
        }
    }

    // ==================== ANÁLISE SWOT ====================
    if (config.includeSwot) {
        const projectsWithSwot = projects.filter(p => 
            (p.swot && (p.swot.forcas || p.swot.fraquezas || p.swot.oportunidades || p.swot.ameacas))
        );

        if (projectsWithSwot.length > 0) {
            doc.addPage();
            y = 20;

            doc.setFontSize(14);
            doc.setTextColor(...darkColor);
            doc.setFont(undefined, 'bold');
            doc.text('Análise SWOT', 20, y);
            y += 15;

            projectsWithSwot.forEach(project => {
                if (y > 200) {
                    doc.addPage();
                    y = 20;
                }

                const swot = project.swot || {};

                doc.setFontSize(12);
                doc.setFont(undefined, 'bold');
                doc.setTextColor(...primaryColor);
                doc.text(project.nome, 20, y);
                y += 8;

                // Tabela SWOT
                const swotData = [
                    ['Forças', swot.forcas || '-'],
                    ['Fraquezas', swot.fraquezas || '-'],
                    ['Oportunidades', swot.oportunidades || '-'],
                    ['Ameaças', swot.ameacas || '-']
                ];

                doc.autoTable({
                    startY: y,
                    body: swotData,
                    theme: 'grid',
                    styles: {
                        fontSize: 9,
                        cellPadding: 4
                    },
                    columnStyles: {
                        0: { cellWidth: 35, fontStyle: 'bold', fillColor: [240, 240, 240] },
                        1: { cellWidth: 125 }
                    }
                });

                y = doc.lastAutoTable.finalY + 15;
            });
        }
    }

    // ==================== RODAPÉ ====================
    const pageCount = doc.internal.getNumberOfPages();
    for (let i = 1; i <= pageCount; i++) {
        doc.setPage(i);
        
        // Data de geração
        doc.setFontSize(8);
        doc.setTextColor(...lightGray);
        const now = new Date();
        doc.text(
            `Gerado em: ${now.toLocaleDateString('pt-BR')} às ${now.toLocaleTimeString('pt-BR')}`,
            20, 285
        );

        // Autor
        if (config.author) {
            doc.text(`Elaborado por: ${config.author}`, 105, 285, { align: 'center' });
        }

        // Página
        doc.text(`Página ${i} de ${pageCount}`, 190, 285, { align: 'right' });
    }

    // Salvar
    const fileName = `Relatorio_${config.period.replace(/\s/g, '_')}_${formatDateForFile(new Date())}.pdf`;
    doc.save(fileName);

    showToast('Relatório gerado com sucesso!', 'success');
    closeModal(document.getElementById('report-modal'));
}

// Calcular estatísticas
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

// Parse de data para relatórios
function parseReportDate(dateString) {
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

// Utilitários
function hexToRgb(hex) {
    const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
    return result ? [
        parseInt(result[1], 16),
        parseInt(result[2], 16),
        parseInt(result[3], 16)
    ] : [88, 166, 255];
}

function formatDateForFile(date) {
    const d = date.getDate().toString().padStart(2, '0');
    const m = (date.getMonth() + 1).toString().padStart(2, '0');
    const y = date.getFullYear();
    return `${d}-${m}-${y}`;
}

// Exportar funções
window.initReportsListeners = initReportsListeners;
