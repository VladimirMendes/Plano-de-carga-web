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
    let permitirCamadas = configDb.camadas !== false;
    
    let cx = L_CESTA / 2;
    let cy = C_CESTA / 2;

    // Filtra e mapeia ferramentas válidas
    let ferramentas = ferramentasLista
        .filter(it => it.nome)
        .map(it => [String(it.nome), parseFloat(it.comp), parseFloat(it.peso), parseFloat(it.larg)]);
    
    // Ordenação estável por peso decrescente
    ferramentas.sort((a, b) => b[2] - a[2]);

    let cestas = [];
    for (let it of ferramentas) {
        let alocado = false;
        let peso_it = it[2];

        for (let cesta of cestas) {
            let peso_atual = cesta.reduce((acc, current) => acc + current[2], 0);
            let lado_a = [], lado_b = [];
            let pa = 0, pb = 0;

            for (let existente of cesta) {
                if (pa <= pb) { lado_a.push(existente); pa += existente[2]; }
                else { lado_b.push(existente); pb += existente[2]; }
            }

            if (pa <= pb) lado_a.push(it);
            else lado_b.push(it);

            let comp_a = lado_a.reduce((acc, curr) => acc + curr[1], 0) + (lado_a.length * 0.1);
            let comp_b = lado_b.reduce((acc, curr) => acc + curr[1], 0) + (lado_b.length * 0.1);
            let max_comp = Math.max(comp_a, comp_b);

            if ((peso_atual + peso_it <= cargaUtilMax) && (max_comp <= C_CESTA)) {
                cesta.push(it);
                alocado = true;
                break;
            }
        }
        if (!alocado) {
            cestas.push([it]);
        }
    }

    return { cestas, ferramentas, L_CESTA, C_CESTA, cargaUtilMax, permitirCamadas, cx, cy };
}
