const CORES_MATERIALS = {
    "RAS":   "#003366", "PDG":   "#004080", "DP":    "#1F618D", "HWDP":  "#2874A6",
    "DC":    "#1B4F72", "CSG":   "#117A65", "TBG":   "#0E6655", "BHA":   "#922B21",
    "MUD":   "#7E5109", "MWD":   "#9A7D0A", "LWD":   "#B7950B", "CAM":   "#E91E63",
    "ORM":   "#8E44AD", "TOOL":  "#7F8C8D", "EXTRA": "#5D6D7E", "BOP":   "#212F3D",
    "ROV":   "#16A085", "WL":    "#D35400", "JAR":   "#A04000", "SUB":   "#566573"
};
const DEFAULT_COLOR = "#5D6D7E";

function sugerirTamanhoComercial(compReal) {
    if (compReal <= 0) return [0.0, "0.00m"];
    const tamanhos = [3.0, 6.0, 8.28, 10.0, 12.0, 14.0, 16.0];
    for (let tam of tamanhos) {
        if (compReal <= tam) return [tam, tam.toFixed(2) + "m"];
    }
    return [compReal, compReal.toFixed(2) + "m"];
}

function prefixoCor(nome) {
    let pref = String(nome).toUpperCase().replace(/[0-9]/g, '').trim();
    if (CORES_MATERIALS[pref]) return pref;
    for (let key in CORES_MATERIALS) {
        if (pref.startsWith(key)) return key;
    }
    return null;
}

function calcularPlanoCarga(configDb, ferramentasLista) {
    let L_CESTA = parseFloat(configDb.larg) || 2.5;
    let C_CESTA = parseFloat(configDb.comp) || 12.0;
    let cargaUtilMax = parseFloat(configDb.carga) || 7000.0;
    let taraCesta = parseFloat(configDb.tara) || 2000.0; 
    let numPernas = parseInt(configDb.pernas) || 4;       
    let anguloIçamento = parseFloat(configDb.angulo) || 60; 
    
    let cx = L_CESTA / 2;
    let cy = C_CESTA / 2;
    const ESPACAMENTO = 0.05; // 5cm de folga de segurança entre ferramentas

    // Filtra e mapeia as ferramentas informadas pelo usuário
    let ferramentas = ferramentasLista
        .filter(it => it.nome)
        .map(it => ({
            nome: String(it.nome),
            comp: parseFloat(it.comp) || 0,
            peso: parseFloat(it.peso) || 0,
            larg: parseFloat(it.larg) || 0.3
        }));
    
    // Ordenação estratégica: Prioriza itens mais compridos e mais pesados para a base
    ferramentas.sort((a, b) => (b.comp * b.larg) - (a.comp * a.larg) || (b.peso - a.peso));

    let resultadoCestas = [];

    for (let it of ferramentas) {
        let alocado = false;

        // Tenta encaixar a ferramenta em alguma cesta já existente
        for (let cesta of resultadoCestas) {
            let peso_atual = cesta.itens.reduce((acc, curr) => acc + curr.peso, 0);
            
            // Restrição de Capacidade de Carga de Segurança
            if (peso_atual + it.peso > cargaUtilMax) continue;

            // Executa o algoritmo de empacotamento 2D dinâmico baseado em prateleiras adaptativas
            let vagaEncontrada = encontrarVaga2D(cesta.itens, it, L_CESTA, C_CESTA, ESPACAMENTO);
            
            if (vagaEncontrada) {
                it.x_min = vagaEncontrada.x;
                it.y_min = vagaEncontrada.y;
                it.x = vagaEncontrada.x + (it.larg / 2); // Centro geométrico X do item
                it.y = vagaEncontrada.y + (it.comp / 2); // Centro geométrico Y do item
                
                cesta.itens.push({...it});
                alocado = true;
                break;
            }
        }

        // Se o item não coube em nenhuma cesta existente devido ao espaço 2D ou peso, abre uma nova cesta
        if (!alocado) {
            let novaCestaItens = [];
            // O primeiro item da nova cesta sempre começa na origem (considerando a folga)
            it.x_min = ESPACAMENTO;
            it.y_min = ESPACAMENTO;
            it.x = ESPACAMENTO + (it.larg / 2);
            it.y = ESPACAMENTO + (it.comp / 2);
            
            novaCestaItens.push({...it});
            resultadoCestas.push({ itens: novaCestaItens, metricas: {} });
        }
    }

    // Pós-processamento matemático: Centro de Gravidade Dinâmico e Rigging
    resultadoCestas.forEach(cesta => {
        let somaMomentoX = 0;
        let somaMomentoY = 0;
        let pesoTotalFerramentas = 0;

        cesta.itens.forEach(it => {
            somaMomentoX += it.peso * it.x;
            somaMomentoY += it.peso * it.y;
            pesoTotalFerramentas += it.peso;
        });

        let pesoBrutoTotal = pesoTotalFerramentas + taraCesta;
        let cgX = pesoTotalFerramentas > 0 ? (somaMomentoX / pesoTotalFerramentas) : cx;
        let cgY = pesoTotalFerramentas > 0 ? (somaMomentoY / pesoTotalFerramentas) : cy;

        // Cálculos de Rigging baseados em normas de Içamento Offshore
        let anguloRad = (anguloIçamento * Math.PI) / 180;
        let fatorAngulo = 1 / Math.sin(anguloRad); // FA = 1 / sen(alpha)
        let tensaoPorPernaIdeal = (pesoBrutoTotal * fatorAngulo) / numPernas;

        // Excentricidade (Desvios em relação ao centro geométrico da cesta)
        let desvioX = cgX - cx;
        let desvioY = cgY - cy;

        cesta.metricas = {
            pesoFerramentas: pesoTotalFerramentas,
            pesoBrutoTotal: pesoBrutoTotal,
            cgX: cgX,
            cgY: cgY,
            desvioX: desvioX,
            desvioY: desvioY,
            fatorAngulo: fatorAngulo,
            tensaoPorPernaIdeal: tensaoPorPernaIdeal,
            estabilidadeOk: (Math.abs(desvioY) <= (C_CESTA * 0.1)) && (Math.abs(desvioX) <= (L_CESTA * 0.1)) 
        };
    });

    return { 
        cestas: resultadoCestas, 
        L_CESTA, 
        C_CESTA, 
        cargaUtilMax, 
        taraCesta,
        numPernas,
        anguloIçamento,
        cx, 
        cy 
    };
}

// Função auxiliar: Algoritmo de varredura bidimensional de geometria para localizar coordenadas (X, Y) livres
function encontrarVaga2D(itensExistentes, novoItem, largCesta, compCesta, espacamento) {
    // Ordena os pontos potenciais de alocação (cantos superiores e laterais dos itens existentes)
    let pontosCandidatos = [{ x: espacamento, y: espacamento }];
    
    itensExistentes.forEach(it => {
        // Ponto logo à direita do item existente
        pontosCandidatos.push({ x: it.x_min + it.larg + espacamento, y: it.y_min });
        // Ponto logo acima do item existente
        pontosCandidatos.push({ x: it.x_min, y: it.y_min + it.comp + espacamento });
    });

    // Ordena os pontos candidatos para priorizar o preenchimento compacto de baixo para cima, da esquerda para a direita
    pontosCandidatos.sort((a, b) => a.y - b.y || a.x - b.x);

    for (let pt of pontosCandidatos) {
        let x_max_item = pt.x + novoItem.larg;
        let y_max_item = pt.y + novoItem.comp;

        // Valida limites físicos das paredes da cesta
        if (x_max_item > largCesta - espacamento || y_max_item > compCesta - espacamento) {
            continue;
        }

        // Verifica se há colisão/sobreposição geométrica com qualquer ferramenta já alocada
        let colisao = itensExistentes.some(existente => {
            return !(x_max_item <= existente.x_min || 
                     pt.x >= existente.x_min + existente.larg || 
                     y_max_item <= existente.y_min || 
                     pt.y >= existente.y_min + existente.comp);
        });

        if (!colisao) {
            return pt; // Retorna a coordenada ideal encontrada
        }
    }
    return null; // Não há espaço geométrico contínuo que comporte o item nesta cesta
}
