/**
 * FUNÇÕES DE IMPORTAÇÃO
 * =====================
 * Importar dados de XLSX e CSV
 */

/**
 * Parser principal de arquivos
 */
async function parseImportFile(file, type) {
    return new Promise((resolve, reject) => {
        const reader = new FileReader();

        reader.onload = async (e) => {
            try {
                let projects;

                if (type === 'xlsx') {
                    projects = parseXLSX(e.target.result);
                } else if (type === 'csv') {
                    projects = parseCSV(e.target.result);
                } else {
                    throw new Error('Tipo de arquivo não suportado.');
                }

                resolve(projects);
            } catch (error) {
                reject(error);
            }
        };

        reader.onerror = () => reject(new Error('Erro ao ler arquivo.'));

        if (type === 'xlsx') {
            reader.readAsArrayBuffer(file);
        } else {
            reader.readAsText(file, 'UTF-8');
        }
    });
}

/**
 * Parser de arquivos XLSX
 */
function parseXLSX(data) {
    const workbook = XLSX.read(data, { type: 'array' });
    const sheetName = workbook.SheetNames[0];
    const sheet = workbook.Sheets[sheetName];
    const jsonData = XLSX.utils.sheet_to_json(sheet, { defval: '' });

    return normalizeImportedData(jsonData);
}

/**
 * Parser de arquivos CSV
 */
function parseCSV(data) {
    const lines = data.split('\n').filter(line => line.trim());
    if (lines.length < 2) return [];

    // Detectar separador
    const separator = detectCSVSeparator(lines[0]);

    // Parse do cabeçalho
    const headers = parseCSVLine(lines[0], separator);

    // Parse das linhas de dados
    const jsonData = [];
    for (let i = 1; i < lines.length; i++) {
        const values = parseCSVLine(lines[i], separator);
        if (values.length === headers.length) {
            const row = {};
            headers.forEach((header, index) => {
                row[header.trim()] = values[index]?.trim() || '';
            });
            jsonData.push(row);
        }
    }

    return normalizeImportedData(jsonData);
}

/**
 * Detectar separador do CSV
 */
function detectCSVSeparator(headerLine) {
    const separators = [',', ';', '\t'];
    let maxCount = 0;
    let detectedSeparator = ',';

    separators.forEach(sep => {
        const count = (headerLine.match(new RegExp(sep, 'g')) || []).length;
        if (count > maxCount) {
            maxCount = count;
            detectedSeparator = sep;
        }
    });

    return detectedSeparator;
}

/**
 * Parse de linha CSV respeitando aspas
 */
function parseCSVLine(line, separator) {
    const values = [];
    let current = '';
    let inQuotes = false;

    for (let i = 0; i < line.length; i++) {
        const char = line[i];

        if (char === '"') {
            if (inQuotes && line[i + 1] === '"') {
                current += '"';
                i++;
            } else {
                inQuotes = !inQuotes;
            }
        } else if (char === separator && !inQuotes) {
            values.push(current);
            current = '';
        } else {
            current += char;
        }
    }

    values.push(current);
    return values;
}

/**
 * Normalizar dados importados
 */
function normalizeImportedData(jsonData) {
    const projects = [];

    // Mapeamento de possíveis nomes de colunas
    const columnMappings = {
        id: ['id', 'ID', 'Id', 'Nº', 'nº', 'numero', 'Numero', 'número', 'Número'],
        nome: ['nome', 'Nome', 'NOME', 'name', 'Name', 'projeto', 'Projeto', 'Nome do Projeto'],
        status: ['status', 'Status', 'STATUS', 'situação', 'Situação', 'situacao', 'Situacao'],
        progresso: ['progresso', 'Progresso', 'PROGRESSO', 'progress', 'Progress', 'Progresso (%)', '%'],
        prazo: ['prazo', 'Prazo', 'PRAZO', 'deadline', 'Deadline', 'data', 'Data', 'Data Prazo'],
        responsavel: ['responsavel', 'Responsavel', 'responsável', 'Responsável', 'owner', 'Owner'],
        descricao: ['descricao', 'Descricao', 'descrição', 'Descrição', 'description', 'Description'],
        objetivo: ['objetivo', 'Objetivo', 'OBJETIVO', 'objective', 'Objective', 'meta', 'Meta'],
        proximos_passos: ['proximos_passos', 'Próximos Passos', 'proximos passos', 'next steps', 'Next Steps'],
        metas: ['metas', 'Metas', 'METAS', 'goals', 'Goals'],
        forcas: ['forcas', 'Forças', 'forças', 'Forças (SWOT)', 'strengths', 'Strengths'],
        fraquezas: ['fraquezas', 'Fraquezas', 'Fraquezas (SWOT)', 'weaknesses', 'Weaknesses'],
        oportunidades: ['oportunidades', 'Oportunidades', 'Oportunidades (SWOT)', 'opportunities', 'Opportunities'],
        ameacas: ['ameacas', 'Ameaças', 'ameaças', 'Ameaças (SWOT)', 'threats', 'Threats']
    };

    // Função para encontrar valor em um objeto usando múltiplas chaves possíveis
    function getValue(row, possibleKeys) {
        for (const key of possibleKeys) {
            if (row[key] !== undefined && row[key] !== '') {
                return row[key];
            }
        }
        return '';
    }

    // Encontrar o maior ID existente
    let maxId = 0;

    jsonData.forEach((row, index) => {
        const idValue = getValue(row, columnMappings.id);
        const nomeValue = getValue(row, columnMappings.nome);

        // Pular linhas sem nome
        if (!nomeValue) return;

        // Determinar ID
        let id = parseInt(idValue);
        if (isNaN(id) || id <= 0) {
            id = maxId + 1;
        }
        maxId = Math.max(maxId, id);

        // Processar progresso
        let progresso = getValue(row, columnMappings.progresso);
        if (typeof progresso === 'string') {
            progresso = parseInt(progresso.replace('%', '').trim());
        }
        if (isNaN(progresso) || progresso < 0) progresso = 0;
        if (progresso > 100) progresso = 100;

        // Processar próximos passos
        const proximosPassosRaw = getValue(row, columnMappings.proximos_passos);
        const proximosPassos = parseListField(proximosPassosRaw);

        // Processar metas
        const metasRaw = getValue(row, columnMappings.metas);
        const metas = parseListField(metasRaw);

        // Normalizar status
        let status = getValue(row, columnMappings.status) || 'Não iniciado';
        status = normalizeStatus(status);

        // Montar projeto
        const project = {
            id: id,
            nome: String(nomeValue).trim(),
            status: status,
            progresso: progresso,
            prazo: normalizeDateField(getValue(row, columnMappings.prazo)),
            responsavel: String(getValue(row, columnMappings.responsavel)).trim(),
            descricao: String(getValue(row, columnMappings.descricao)).trim(),
            objetivo: String(getValue(row, columnMappings.objetivo)).trim(),
            proximos_passos: proximosPassos,
            metas: metas,
            swot: {
                forcas: String(getValue(row, columnMappings.forcas)).trim(),
                fraquezas: String(getValue(row, columnMappings.fraquezas)).trim(),
                oportunidades: String(getValue(row, columnMappings.oportunidades)).trim(),
                ameacas: String(getValue(row, columnMappings.ameacas)).trim()
            }
        };

        projects.push(project);
    });

    return projects;
}

/**
 * Normalizar status
 */
function normalizeStatus(status) {
    const normalized = String(status).toLowerCase().trim();

    const mappings = {
        'em andamento': ['em andamento', 'andamento', 'in progress', 'ongoing', 'ativo', 'active'],
        'Concluído': ['concluido', 'concluído', 'completed', 'done', 'finalizado', 'finished'],
        'Planejado': ['planejado', 'planned', 'a fazer', 'todo', 'pendente'],
        'Suspenso': ['suspenso', 'suspended', 'pausado', 'paused', 'on hold'],
        'Não iniciado': ['não iniciado', 'nao iniciado', 'not started', 'novo', 'new']
    };

    for (const [canonical, variants] of Object.entries(mappings)) {
        if (variants.some(v => normalized.includes(v))) {
            return canonical;
        }
    }

    return 'Não iniciado';
}

/**
 * Normalizar campo de data
 */
function normalizeDateField(value) {
    if (!value) return '';

    const str = String(value).trim();

    // Se já está no formato dd/mm/yyyy
    if (/^\d{1,2}\/\d{1,2}\/\d{4}$/.test(str)) {
        return str;
    }

    // Tentar formato yyyy-mm-dd
    if (/^\d{4}-\d{2}-\d{2}/.test(str)) {
        const date = new Date(str);
        if (!isNaN(date.getTime())) {
            return date.toLocaleDateString('pt-BR');
        }
    }

    // Tentar Excel date serial number
    if (/^\d+$/.test(str)) {
        const serial = parseInt(str);
        if (serial > 1 && serial < 100000) {
            const date = excelSerialToDate(serial);
            if (date) {
                return date.toLocaleDateString('pt-BR');
            }
        }
    }

    // Outros formatos de data
    const date = new Date(str);
    if (!isNaN(date.getTime())) {
        return date.toLocaleDateString('pt-BR');
    }

    return str;
}

/**
 * Converter serial do Excel para Date
 */
function excelSerialToDate(serial) {
    // Excel usa 1/1/1900 como dia 1 (com bug do ano bissexto de 1900)
    const utc_days = Math.floor(serial - 25569);
    const date = new Date(utc_days * 86400 * 1000);
    return date;
}

/**
 * Parse de campo de lista (separado por ; ou ,)
 */
function parseListField(value) {
    if (!value) return [];

    const str = String(value).trim();
    if (!str) return [];

    // Tentar separar por ; primeiro, depois por ,
    let items = str.split(';');
    if (items.length === 1) {
        items = str.split(',');
    }

    return items
        .map(item => item.trim())
        .filter(item => item.length > 0);
}

/**
 * Modelo de planilha para download
 */
function downloadTemplateXLSX() {
    const template = [
        {
            'ID': 1,
            'Nome': 'Projeto Exemplo',
            'Status': 'Em andamento',
            'Progresso (%)': 50,
            'Prazo': '31/12/2025',
            'Responsável': 'João Silva',
            'Descrição': 'Descrição do projeto exemplo',
            'Objetivo': 'Objetivo principal do projeto',
            'Próximos Passos': 'Passo 1; Passo 2; Passo 3',
            'Metas': 'Meta 1; Meta 2',
            'Forças (SWOT)': 'Equipe qualificada',
            'Fraquezas (SWOT)': 'Orçamento limitado',
            'Oportunidades (SWOT)': 'Mercado em expansão',
            'Ameaças (SWOT)': 'Concorrência'
        }
    ];

    const ws = XLSX.utils.json_to_sheet(template);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Modelo');

    XLSX.writeFile(wb, 'modelo_importacao_projetos.xlsx');
}
