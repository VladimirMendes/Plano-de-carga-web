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
    let taraCesta = parseFloat(configDb.tara) || 2000.0; // Adicionado: tara padrão da cesta
    let numPernas = parseInt(configDb.pernas) || 4;       // Adicionado: pernas de içamento
    let anguloIçamento = parseFloat(configDb.angulo) || 60; // Adicionado: ângulo com a horizontal
    
    let cx = L_CESTA / 2;
    let cy = C_CESTA / 2;

    // Filtra e mapeia ferramentas válidas
    let ferramentas = ferramentasLista
        .filter(it => it.nome)
        .map(it => {
            return {
                nome: String(it.nome),
                comp: parseFloat(it.comp) || 0,
                peso: parseFloat(it.peso) || 0,
                larg: parseFloat(it.larg) || 0.3 // Largura padrão se não informada
            };
        });
    
    // Ordenação estável por peso decrescente
    ferramentas.sort((a, b) => b.peso - a.peso);

    let resultadoCestas = [];

    for (let it of ferramentas) {
        let alocado = false;

        for (let cesta de resultadoCestas) {
            // Calcula o peso atual alocado nesta cesta
            let peso_atual = cesta.itens.reduce((acc, curr) => acc + curr.peso, 0);

            // Simulação de posicionamento usando a heurística de duas colunas (Lado A e Lado B)
            let lado_a = [], lado_b = [];
            let pa = 0, pb = 0;

            for (let existente of cesta.itens) {
                if (pa <= pb) { lado_a.push(existente); pa += existente.peso; }
                else { lado_b.push(existente); pb += existente.peso; }
            }

            // Testa o novo item temporariamente no lado mais leve
            if (pa <= pb) lado_a.push(it);
            else lado_b.push(it);

            // Calcula o comprimento necessário para cada lado considerando espaçamento de 10cm
            let comp_a = lado_a.reduce((acc, curr) => acc + curr.comp, 0) + (lado_a.length * 0.1);
            let comp_b = lado_b.reduce((acc, curr) => acc + curr.comp, 0) + (lado_b.length * 0.1);
            let max_comp = Math.max(comp_a, comp_b);

            // Verifica restrições de espaço e capacidade de carga útil
            if ((peso_atual + it.peso <= cargaUtilMax) && (max_comp <= C_CESTA)) {
                cesta.itens.push(it);
                alocado = true;
                break;
            }
        }

        // Se não couber em nenhuma cesta existente, cria uma nova
        if (!alocado) {
            resultadoCestas.push({ itens: [it], metricas: {} });
        }
    }

    // Pós-processamento: Calcula coordenadas cartesianas exatas, CG e Rigging para cada cesta
    resultadoCestas.forEach(cesta => {
        let atualY_A = 0.1;
        let atualY_B = 0.1;
        let pa = 0, pb = 0;
        
        let somaMomentoX = 0;
        let somaMomentoY = 0;
        let pesoTotalFerramentas = 0;

        // Atribui coordenadas cartesianas (X, Y) do centro de gravidade individual de cada ferramenta
        cesta.itens.forEach(it => {
            let posX = 0;
            let posY = 0;

            if (pa <= pb) {
                // Lado A (Esquerda da cesta) -> Centro em X = L_CESTA / 4
                posX = L_CESTA / 4;
                posY = atualY_A + (it.comp / 2);
                atualY_A += it.comp + 0.1;
                pa += it.peso;
            } else {
                // Lado B (Direita da cesta) -> Centro em X = (3 * L_CESTA) / 4
                posX = (3 * L_CESTA) / 4;
                posY = atualY_B + (it.comp / 2);
                atualY_B += it.comp + 0.1;
                pb += it.peso;
            }

            it.x = posX;
            it.y = posY;

            // Acumuladores para o cálculo do CG global
            somaMomentoX += it.peso * posX;
            somaMomentoY += it.peso * posY;
            pesoTotalFerramentas += it.peso;
        });

        // Peso Bruto Total do Içamento
        let pesoBrutoTotal = pesoTotalFerramentas + taraCesta;

        // Se a cesta estiver vazia, o CG é o centro geométrico da estrutura
        let cgX = pesoTotalFerramentas > 0 ? (somaMomentoX / pesoTotalFerramentas) : cx;
        let cgY = pesoTotalFerramentas > 0 ? (somaMomentoY / pesoTotalFerramentas) : cy;

        // Cálculos de Rigging (Içamento Offshore)
        // Converte o ângulo com a horizontal para radianos para aplicar na fórmula senoidal
        let anguloRad = (anguloIçamento * Math.PI) / 180;
        let fatorAngulo = 1 / Math.sin(anguloRad); // FA = 1 / sen(alpha)

        // Tensão teórica por perna de cabo de aço considerando distribuição simétrica ideal
        let tensaoPorPernaIdeal = (pesoBrutoTotal * fatorAngulo) / numPernas;

        // Cálculo de excentricidade (distância do CG ao centro geométrico real da cesta)
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
            estabilidadeOk: Math.abs(desvioY) <= (C_CESTA * 0.1) // Tolerância de até 10% do comprimento
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
