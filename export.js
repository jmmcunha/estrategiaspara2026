/**
 * FUNÇÕES DE EXPORTAÇÃO
 * =====================
 * Exportar dados para XLSX, CSV e PDF
 */

/**
 * Exportar para Excel (.xlsx)
 */
function exportToXLSX(projects) {
    if (projects.length === 0) {
        showToast('Não há projetos para exportar.', 'warning');
        return;
    }

    try {
        // Preparar dados
        const data = projects.map(p => ({
            'ID': p.id || '',
            'Nome': p.nome || '',
            'Status': p.status || '',
            'Progresso (%)': p.progresso || 0,
            'Prazo': p.prazo || '',
            'Responsável': p.responsavel || '',
            'Descrição': p.descricao || '',
            'Objetivo': p.objetivo || '',
            'Próximos Passos': (p.proximos_passos || []).join('; '),
            'Metas': (p.metas || []).join('; '),
            'Forças (SWOT)': p.swot?.forcas || '',
            'Fraquezas (SWOT)': p.swot?.fraquezas || '',
            'Oportunidades (SWOT)': p.swot?.oportunidades || '',
            'Ameaças (SWOT)': p.swot?.ameacas || ''
        }));

        // Criar workbook
        const ws = XLSX.utils.json_to_sheet(data);
        const wb = XLSX.utils.book_new();
        XLSX.utils.book_append_sheet(wb, ws, 'Projetos');

        // Ajustar largura das colunas
        const colWidths = [
            { wch: 5 },   // ID
            { wch: 30 },  // Nome
            { wch: 15 },  // Status
            { wch: 12 },  // Progresso
            { wch: 12 },  // Prazo
            { wch: 20 },  // Responsável
            { wch: 40 },  // Descrição
            { wch: 40 },  // Objetivo
            { wch: 40 },  // Próximos Passos
            { wch: 40 },  // Metas
            { wch: 30 },  // Forças
            { wch: 30 },  // Fraquezas
            { wch: 30 },  // Oportunidades
            { wch: 30 }   // Ameaças
        ];
        ws['!cols'] = colWidths;

        // Download
        const fileName = `projetos_${formatDateFileName()}.xlsx`;
        XLSX.writeFile(wb, fileName);

        showToast('Arquivo Excel exportado com sucesso!', 'success');
    } catch (error) {
        console.error('Erro ao exportar XLSX:', error);
        showToast('Erro ao exportar arquivo Excel.', 'error');
    }
}

/**
 * Exportar para CSV
 */
function exportToCSV(projects) {
    if (projects.length === 0) {
        showToast('Não há projetos para exportar.', 'warning');
        return;
    }

    try {
        // Cabeçalho
        const headers = [
            'ID',
            'Nome',
            'Status',
            'Progresso (%)',
            'Prazo',
            'Responsável',
            'Descrição',
            'Objetivo',
            'Próximos Passos',
            'Metas',
            'Forças (SWOT)',
            'Fraquezas (SWOT)',
            'Oportunidades (SWOT)',
            'Ameaças (SWOT)'
        ];

        // Dados
        const rows = projects.map(p => [
            p.id || '',
            escapeCSV(p.nome || ''),
            escapeCSV(p.status || ''),
            p.progresso || 0,
            escapeCSV(p.prazo || ''),
            escapeCSV(p.responsavel || ''),
            escapeCSV(p.descricao || ''),
            escapeCSV(p.objetivo || ''),
            escapeCSV((p.proximos_passos || []).join('; ')),
            escapeCSV((p.metas || []).join('; ')),
            escapeCSV(p.swot?.forcas || ''),
            escapeCSV(p.swot?.fraquezas || ''),
            escapeCSV(p.swot?.oportunidades || ''),
            escapeCSV(p.swot?.ameacas || '')
        ]);

        // Montar CSV
        const csvContent = [
            headers.join(','),
            ...rows.map(row => row.join(','))
        ].join('\n');

        // BOM para UTF-8
        const bom = '\uFEFF';
        const blob = new Blob([bom + csvContent], { type: 'text/csv;charset=utf-8;' });

        // Download
        const link = document.createElement('a');
        link.href = URL.createObjectURL(blob);
        link.download = `projetos_${formatDateFileName()}.csv`;
        link.click();
        URL.revokeObjectURL(link.href);

        showToast('Arquivo CSV exportado com sucesso!', 'success');
    } catch (error) {
        console.error('Erro ao exportar CSV:', error);
        showToast('Erro ao exportar arquivo CSV.', 'error');
    }
}

/**
 * Exportar para PDF
 */
function exportToPDF(projects) {
    if (projects.length === 0) {
        showToast('Não há projetos para exportar.', 'warning');
        return;
    }

    try {
        const { jsPDF } = window.jspdf;
        const doc = new jsPDF('landscape', 'mm', 'a4');

        // Título
        doc.setFontSize(18);
        doc.setTextColor(88, 166, 255);
        doc.text('Painel Executivo de Projetos', 14, 20);

        // Subtítulo com data
        doc.setFontSize(10);
        doc.setTextColor(139, 148, 158);
        doc.text(`Exportado em: ${new Date().toLocaleString('pt-BR')}`, 14, 28);

        // Resumo
        const total = projects.length;
        const andamento = projects.filter(p => p.status?.toLowerCase() === 'em andamento').length;
        const concluidos = projects.filter(p => p.status?.toLowerCase() === 'concluído').length;
        const planejados = projects.filter(p => p.status?.toLowerCase() === 'planejado').length;

        doc.setFontSize(9);
        doc.setTextColor(110, 118, 129);
        doc.text(`Total: ${total} | Em Andamento: ${andamento} | Concluídos: ${concluidos} | Planejados: ${planejados}`, 14, 34);

        // Dados da tabela
        const tableData = projects.map(p => [
            p.id || '-',
            truncateText(p.nome || '-', 35),
            p.status || '-',
            `${p.progresso || 0}%`,
            p.prazo || '-',
            truncateText(p.responsavel || '-', 20),
            truncateText((p.proximos_passos || []).slice(0, 2).join('; '), 40)
        ]);

        // Tabela
        doc.autoTable({
            startY: 40,
            head: [[
                'ID',
                'Nome do Projeto',
                'Status',
                'Progresso',
                'Prazo',
                'Responsável',
                'Próximos Passos'
            ]],
            body: tableData,
            theme: 'grid',
            styles: {
                fontSize: 8,
                cellPadding: 3,
                textColor: [230, 237, 243],
                fillColor: [22, 27, 34]
            },
            headStyles: {
                fillColor: [33, 38, 45],
                textColor: [230, 237, 243],
                fontStyle: 'bold',
                fontSize: 8
            },
            alternateRowStyles: {
                fillColor: [13, 17, 23]
            },
            columnStyles: {
                0: { cellWidth: 10 },
                1: { cellWidth: 50 },
                2: { cellWidth: 25 },
                3: { cellWidth: 20 },
                4: { cellWidth: 25 },
                5: { cellWidth: 35 },
                6: { cellWidth: 'auto' }
            },
            didParseCell: function(data) {
                // Colorir status
                if (data.column.index === 2 && data.section === 'body') {
                    const status = data.cell.raw?.toLowerCase() || '';
                    if (status === 'em andamento') {
                        data.cell.styles.textColor = [88, 166, 255];
                    } else if (status === 'concluído') {
                        data.cell.styles.textColor = [63, 185, 80];
                    } else if (status === 'planejado') {
                        data.cell.styles.textColor = [210, 153, 34];
                    } else if (status === 'suspenso') {
                        data.cell.styles.textColor = [248, 81, 73];
                    }
                }
            }
        });

        // Rodapé
        const pageCount = doc.internal.getNumberOfPages();
        for (let i = 1; i <= pageCount; i++) {
            doc.setPage(i);
            doc.setFontSize(8);
            doc.setTextColor(110, 118, 129);
            doc.text(
                `Página ${i} de ${pageCount}`,
                doc.internal.pageSize.getWidth() / 2,
                doc.internal.pageSize.getHeight() - 10,
                { align: 'center' }
            );
        }

        // Download
        doc.save(`projetos_${formatDateFileName()}.pdf`);

        showToast('Arquivo PDF exportado com sucesso!', 'success');
    } catch (error) {
        console.error('Erro ao exportar PDF:', error);
        showToast('Erro ao exportar arquivo PDF.', 'error');
    }
}

/**
 * Utilitários
 */

function escapeCSV(value) {
    if (typeof value !== 'string') return value;
    if (value.includes(',') || value.includes('"') || value.includes('\n')) {
        return `"${value.replace(/"/g, '""')}"`;
    }
    return value;
}

function truncateText(text, maxLength) {
    if (!text || text.length <= maxLength) return text;
    return text.substring(0, maxLength - 3) + '...';
}

function formatDateFileName() {
    const now = new Date();
    return now.toISOString().split('T')[0].replace(/-/g, '');
}
