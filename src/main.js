// Dados e Estados Iniciais Padrão
const FERRAMENTAS_PADRAO = [
    {"nome": "TOOL",   "comp": 3.50, "peso": 600.0, "larg": 0.80},
    {"nome": "TOOL2",  "comp": 3.50, "peso": 440.0, "larg": 0.80},
    {"nome": "CAM",    "comp": 2.00, "peso": 250.0, "larg": 0.60},
    {"nome": "RAS",    "comp": 7.62, "peso": 450.0, "larg": 0.70},
    {"nome": "DP",     "comp": 9.14, "peso": 280.0, "larg": 0.13},
    {"nome": "DC",     "comp": 9.14, "peso": 700.0, "larg": 0.20}
];

const CONFIG_PADRAO = {
    "tag": "CBR-01", "comp": "10.00", "larg": "2.000",
    "alt": "2.000", "tara": "1500", "carga": "7000", "camadas": true
};

let currentUser = null;
let equipamentosMemoria = null;

window.addEventListener('DOMContentLoaded', () => {
    inicializarLegendas();
    verificarSessao();
});

function verificarSessao() {
    const logado = sessionStorage.getItem("user_ativo");
    if (logado) {
        currentUser = JSON.parse(logado);
        document.getElementById("auth-screen").classList.add("hidden");
        document.getElementById("main-panel").classList.remove("hidden");
        document.getElementById("user-welcome-banner").innerText = `Relatório Técnico de Engenharia Logística | ${currentUser.nome} — ${currentUser.empresa}`;
        document.getElementById("user-email-display").innerText = `📧 Usuário conectado: ${currentUser.email}`;
        carregarConfigInterface();
        carregarEquipamentosNaMemoria();
    }
}

function switchAuthTab(type) {
    document.querySelectorAll('.tab-auth-btn').forEach(b => b.classList.remove('active'));
    if (type === 'login') {
        document.querySelector('.tab-auth-btn:nth-child(1)').classList.add('active');
        document.getElementById('form-login').classList.remove('hidden');
        document.getElementById('form-cadastro').classList.add('hidden');
    } else {
        document.querySelector('.tab-auth-btn:nth-child(2)').classList.add('active');
        document.getElementById('form-login').classList.add('hidden');
        document.getElementById('form-cadastro').classList.remove('hidden');
    }
}

function switchMainTab(tabId) {
    document.querySelectorAll('.tab-btn').forEach(b => b.classList.remove('active'));
    document.querySelectorAll('.tab-content').forEach(c => c.classList.add('hidden'));
    
    event.target.classList.add('active');
    document.getElementById('tab-' + tabId).classList.remove('hidden');
}

function executarLogin() {
    const email = document.getElementById("login-email").value.trim().toLowerCase();
    const pwd = document.getElementById("login-pwd").value;
    const leads = carregarJSONSeguro(KEY_LEADS, []);
    
    const user = leads.find(l => l.email === email);
    if (!user) {
        document.getElementById("auth-message").innerHTML = "<span style='color:red;'>E-mail não localizado. Cadastre-se.</span>";
        return;
    }
    if (user.senha_hash && !verifyPassword(pwd, user.senha_hash)) {
        document.getElementById("auth-message").innerHTML = "<span style='color:red;'>Senha incorreta.</span>";
        return;
    }
    sessionStorage.setItem("user_ativo", JSON.stringify(user));
    verificarSessao();
}

function executarCadastro() {
    const nome = document.getElementById("cad-nome").value.trim();
    const email = document.getElementById("cad-email").value.trim().toLowerCase();
    const empresa = document.getElementById("cad-empresa").value.trim();
    const cargo = document.getElementById("cad-cargo").value.trim();
    const local = document.getElementById("cad-local").value.trim();
    const pwd = document.getElementById("cad-pwd").value;

    if (!nome || !email || !empresa || !cargo || !local) {
        alert("Preencha todos os campos obrigatórios (*).");
        return;
    }

    let leads = carregarJSONSeguro(KEY_LEADS, []);
    if (leads.some(l => l.email === email)) {
        alert("E-mail já cadastrado.");
        return;
    }

    const novoUser = { nome, email, empresa, cargo, local, senha_hash: pwd ? hashPassword(pwd) : "" };
    leads.push(novoUser);
    salvarJSON(KEY_LEADS, leads);
    sessionStorage.setItem("user_ativo", JSON.stringify(novoUser));
    verificarSessao();
}

function executarLogout() {
    sessionStorage.clear();
    location.reload();
}

function carregarConfigInterface() {
    const configCompleta = carregarJSONSeguro(KEY_CONFIG, {});
    if (!configCompleta[currentUser.email]) {
        configCompleta[currentUser.email] = { ...CONFIG_PADRAO };
        salvarJSON(KEY_CONFIG, configCompleta);
    }
    const cfg = configCompleta[currentUser.email];
    document.getElementById("cfg-tag").value = cfg.tag;
    document.getElementById("cfg-comp").value = cfg.comp;
    document.getElementById("cfg-larg").value = cfg.larg;
    document.getElementById("cfg-alt").value = cfg.alt;
    document.getElementById("cfg-tara").value = cfg.tara;
    document.getElementById("cfg-carga").value = cfg.carga;
    document.getElementById("cfg-camadas").checked = cfg.camadas;
    renderizarListaContainers();
}

function salvarConfigAtiva() {
    const configCompleta = carregarJSONSeguro(KEY_CONFIG, {});
    configCompleta[currentUser.email] = {
        tag: document.getElementById("cfg-tag").value,
        comp: document.getElementById("cfg-comp").value,
        larg: document.getElementById("cfg-larg").value,
        alt: document.getElementById("cfg-alt").value,
        tara: document.getElementById("cfg-tara").value,
        carga: document.getElementById("cfg-carga").value,
        camadas: document.getElementById("cfg-camadas").checked
    };
    salvarJSON(KEY_CONFIG, configCompleta);
    alert("Configuração salva com sucesso!");
}

function carregarEquipamentosNaMemoria() {
    const dados = carregarJSONSeguro(KEY_FERRAMENTAS, {});
    equipamentosMemoria = dados[currentUser.email] || [...FERRAMENTAS_PADRAO];
    renderizarGridEquipamentos();
}

function renderizarGridEquipamentos() {
    const tbody = document.getElementById("grid-equipamentos-body");
    tbody.innerHTML = "";
    equipamentosMemoria.forEach((eq, index) => {
        const tr = document.createElement("tr");
        tr.innerHTML = `
            <td><input type="text" value="${eq.nome}" onchange="atualizarCampoGrid(${index}, 'nome', this.value)"></td>
            <td><input type="number" step="0.01" value="${eq.comp}" onchange="atualizarCampoGrid(${index}, 'comp', this.value)"></td>
            <td><input type="number" value="${eq.peso}" onchange="atualizarCampoGrid(${index}, 'peso', this.value)"></td>
            <td><input type="number" step="0.01" value="${eq.larg}" onchange="atualizarCampoGrid(${index}, 'larg', this.value)"></td>
            <td><button class="btn btn-danger" style="padding:4px 8px;" onclick="removerLinhaGrid(${index})">🗑️</button></td>
        `;
        tbody.appendChild(tr);
    });
}

function atualizarCampoGrid(index, campo, valor) {
    equipamentosMemoria[index][campo] = campo === 'nome' ? valor : parseFloat(valor);
}

function adicionarLinhaGrid() {
    equipamentosMemoria.push({"nome": "NOVO", "comp": 2.0, "peso": 200, "larg": 0.5});
    renderizarGridEquipamentos();
}

function removerLinhaGrid(index) {
    equipamentosMemoria.splice(index, 1);
    renderizarGridEquipamentos();
}

function consolidarMemoriaGrid() {
    alert("Dados consolidados na memória de sessão.");
}

function salvarGridDisco() {
    const dados = carregarJSONSeguro(KEY_FERRAMENTAS, {});
    dados[currentUser.email] = equipamentosMemoria;
    salvarJSON(KEY_FERRAMENTAS, dados);
    alert("Equipamentos salvos na memória do navegador.");
}

function toggleExpander() {
    document.getElementById("expander-content").classList.toggle("hidden");
}

function adicionarNovoContainer() {
    const tag = document.getElementById("new-cnt-tag").value.toUpperCase().trim();
    if(!tag) return alert("Insira uma TAG válida.");
    let db = carregarJSONSeguro(KEY_CONTAINERS, {});
    if(!db[currentUser.email]) db[currentUser.email] = [];
    db[currentUser.email].push({
        tag: tag,
        comp: parseFloat(document.getElementById("new-cnt-comp").value),
        larg: parseFloat(document.getElementById("new-cnt-larg").value),
        alt: parseFloat(document.getElementById("new-cnt-alt").value),
        tara: parseInt(document.getElementById("new-cnt-tara").value),
        carga: parseInt(document.getElementById("new-cnt-carga").value)
    });
    salvarJSON(KEY_CONTAINERS, db);
    renderizarListaContainers();
    toggleExpander();
}

function renderizarListaContainers() {
    const containerLista = document.getElementById("lista-containers-cadastrados");
    containerLista.innerHTML = "";
    const db = carregarJSONSeguro(KEY_CONTAINERS, {});
    const lista = db[currentUser.email] || [];
    if(lista.length === 0) {
        containerLista.innerHTML = "<p class='caption'>Nenhum contêiner customizado cadastrado.</p>";
        return;
    }
    lista.forEach((cnt, idx) => {
        const div = document.createElement("div");
        div.style = "display:flex; justify-content:space-between; background:#F3F4F6; padding:8px; margin-bottom:5px; border-radius:4px; font-size:12px;";
        div.innerHTML = `
            <div>📦 <b>${cnt.tag}</b> — ${cnt.comp}m × ${cnt.larg}m | Carga: ${cnt.carga}kg</div>
            <div>
                <button class="btn btn-primary" style="padding:2px 8px; font-size:11px;" onclick="ativarContainer(${idx})">Ativar</button>
                <button class="btn btn-danger" style="padding:2px 6px; font-size:11px;" onclick="removerContainer(${idx})">🗑️</button>
            </div>
        `;
        containerLista.appendChild(div);
    });
}

function ativarContainer(idx) {
    const db = carregarJSONSeguro(KEY_CONTAINERS, {});
    const cnt = db[currentUser.email][idx];
    const configCompleta = carregarJSONSeguro(KEY_CONFIG, {});
    configCompleta[currentUser.email] = {
        tag: cnt.tag, comp: cnt.comp.toFixed(2), larg: cnt.larg.toFixed(3),
        alt: cnt.alt.toFixed(3), tara: String(cnt.tara), carga: String(cnt.carga),
        camadas: document.getElementById("cfg-camadas").checked
    };
    salvarJSON(KEY_CONFIG, configCompleta);
    carregarConfigInterface();
    alert(`Contêiner ${cnt.tag} ativado!`);
}

function removerContainer(idx) {
    const db = carregarJSONSeguro(KEY_CONTAINERS, {});
    db[currentUser.email].splice(idx, 1);
    salvarJSON(KEY_CONTAINERS, db);
    renderizarListaContainers();
}

// ============================================================
// CLASSE GRADE BIDIMENSIONAL DINÂMICA (X, Y)
// ============================================================
class GradeContainer2D {
    constructor(largura, comprimento, resolucao = 0.10) {
        // Dimensões em metros
        this.largura = largura;      // Eixo X (largura do container)
        this.comprimento = comprimento; // Eixo Y (comprimento do container)
        this.resolucao = resolucao;  // Tamanho da célula da grade em metros
        
        // Centro do container
        this.cx = largura / 2;
        this.cy = comprimento / 2;
        
        // Grade: array 2D [y][x], null = vazio
        this.cols = Math.ceil(largura / resolucao);
        this.rows = Math.ceil(comprimento / resolucao);
        this.grid = Array.from({ length: this.rows }, () => Array(this.cols).fill(null));
        
        // Itens posicionados: array de objetos {nome, comp, peso, larg, x, y, px, py}
        this.itens = [];
    }

    // Converte coordenadas reais (metros) para índices da grade
    realParaGrid(x, y) {
        const gx = Math.floor(x / this.resolucao);
        const gy = Math.floor(y / this.resolucao);
        return { gx, gy };
    }

    // Converte índices da grade para coordenadas reais (centro da célula)
    gridParaReal(gx, gy) {
        const x = (gx + 0.5) * this.resolucao;
        const y = (gy + 0.5) * this.resolucao;
        return { x, y };
    }

    // Verifica se uma área retangular está livre na grade
    areaLivre(x, y, largura, comprimento) {
        const { gx: startX, gy: startY } = this.realParaGrid(x, y);
        const { gx: endX, gy: endY } = this.realParaGrid(x + largura, y + comprimento);
        
        for (let gy = startY; gy <= endY && gy < this.rows; gy++) {
            for (let gx = startX; gx <= endX && gx < this.cols; gx++) {
                if (gy < 0 || gx < 0 || this.grid[gy][gx] !== null) return false;
            }
        }
        return true;
    }

    // Marca uma área na grade como ocupada
    ocuparArea(x, y, largura, comprimento, item) {
        const { gx: startX, gy: startY } = this.realParaGrid(x, y);
        const { gx: endX, gy: endY } = this.realParaGrid(x + largura, y + comprimento);
        
        for (let gy = startY; gy <= endY && gy < this.rows; gy++) {
            for (let gx = startX; gx <= endX && gx < this.cols; gx++) {
                if (gy >= 0 && gx >= 0) this.grid[gy][gx] = item;
            }
        }
    }

    // Encontra posição livre para um item usando heurística de melhor encaixe
    // Retorna {x, y, px, py} ou null se não couber
    encontrarPosicao(item) {
        const [nome, comp, peso, larg] = item;
        
        // Heurística: tentar posicionar próximo ao centro para balanceamento
        // Varredura em espiral a partir do centro
        const centros = [];
        for (let gy = 0; gy < this.rows; gy++) {
            for (let gx = 0; gx < this.cols; gx++) {
                const { x, y } = this.gridParaReal(gx, gy);
                // Distância ao centro do container
                const distCentro = Math.sqrt((x - this.cx)**2 + (y - this.cy)**2);
                centros.push({ gx, gy, x, y, distCentro });
            }
        }
        
        // Ordenar por proximidade ao centro (balanceamento)
        centros.sort((a, b) => a.distCentro - b.distCentro);
        
        for (const pos of centros) {
            // Tentar posicionar com o item alinhado ao eixo Y (comprimento)
            const x = pos.x - larg / 2;
            const y = pos.y;
            
            if (x >= 0 && y >= 0 && x + larg <= this.largura && y + comp <= this.comprimento) {
                if (this.areaLivre(x, y, larg, comp)) {
                    const px = x + larg / 2;  // Centro de massa X
                    const py = y + comp / 2;  // Centro de massa Y
                    return { x, y, px, py };
                }
            }
            
            // Tentar rotacionado (largura e comprimento trocados)
            if (larg !== comp) {
                const xRot = pos.x - comp / 2;
                const yRot = pos.y;
                if (xRot >= 0 && yRot >= 0 && xRot + comp <= this.largura && yRot + larg <= this.comprimento) {
                    if (this.areaLivre(xRot, yRot, comp, larg)) {
                        const px = xRot + comp / 2;
                        const py = yRot + larg / 2;
                        return { x: xRot, y: yRot, px, py, rotacionado: true };
                    }
                }
            }
        }
        return null;
    }

    // Posiciona um item na grade
    posicionar(item) {
        const pos = this.encontrarPosicao(item);
        if (!pos) return null;
        
        const [nome, comp, peso, larg] = item;
        const dimX = pos.rotacionado ? comp : larg;
        const dimY = pos.rotacionado ? larg : comp;
        
        this.ocuparArea(pos.x, pos.y, dimX, dimY, nome);
        
        const itemPosicionado = {
            nome, comp, peso, larg,
            x: pos.x, y: pos.y,
            px: pos.px, py: pos.py,
            rotacionado: pos.rotacionado || false
        };
        
        this.itens.push(itemPosicionado);
        return itemPosicionado;
    }

    // Calcula torque em relação ao centro do container
    calcularTorque() {
        let torqueX = 0, torqueY = 0;
        for (const item of this.itens) {
            torqueX += item.peso * (item.px - this.cx);
            torqueY += item.peso * (item.py - this.cy);
        }
        return { torqueX, torqueY };
    }

    // Calcula centro de massa
    calcularCentroMassa() {
        let pesoTotal = 0, momentoX = 0, momentoY = 0;
        for (const item of this.itens) {
            pesoTotal += item.peso;
            momentoX += item.peso * item.px;
            momentoY += item.peso * item.py;
        }
        return {
            cx: pesoTotal > 0 ? momentoX / pesoTotal : this.cx,
            cy: pesoTotal > 0 ? momentoY / pesoTotal : this.cy,
            pesoTotal
        };
    }

    // Verifica estabilidade (torque dentro de limites aceitáveis)
    verificarEstabilidade(toleranciaPercentual = 5) {
        const { torqueX, torqueY } = this.calcularTorque();
        const cm = this.calcularCentroMassa();
        const maxTorqueX = (this.itens.reduce((s, i) => s + i.peso, 0) * this.largura / 2) * (toleranciaPercentual / 100);
        const maxTorqueY = (this.itens.reduce((s, i) => s + i.peso, 0) * this.comprimento / 2) * (toleranciaPercentual / 100);
        
        return {
            estavel: Math.abs(torqueX) <= maxTorqueX && Math.abs(torqueY) <= maxTorqueY,
            torqueX, torqueY,
            maxTorqueX, maxTorqueY,
            desvioX: cm.cx - this.cx,
            desvioY: cm.cy - this.cy
        };
    }

    // Taxa de ocupação da área
    taxaOcupacao() {
        const areaTotal = this.largura * this.comprimento;
        const areaOcupada = this.itens.reduce((s, i) => s + (i.comp * i.larg), 0);
        return (areaOcupada / areaTotal) * 100;
    }
}

// ============================================================
// FUNÇÃO DE CÁLCULO REFATORADA
// ============================================================
function calcularPlanoCarga2D(cfg, ferramentas) {
    const largura = parseFloat(cfg.larg);
    const comprimento = parseFloat(cfg.comp);
    const cargaMax = parseInt(cfg.carga);
    const permitirCamadas = cfg.camadas;
    
    // Ordenar ferramentas: maiores primeiro (best-fit decreasing)
    const itens = ferramentas.map(f => [f.nome, f.comp, f.peso, f.larg])
        .sort((a, b) => (b[1] * b[3]) - (a[1] * a[3])); // Ordena por área decrescente
    
    const cestas = [];
    let itensRestantes = [...itens];
    
    while (itensRestantes.length > 0) {
        const grade = new GradeContainer2D(largura, comprimento);
        const cestaAtual = [];
        let pesoAtual = 0;
        
        // Tentar posicionar cada item restante
        for (let i = 0; i < itensRestantes.length; i++) {
            const item = itensRestantes[i];
            const pesoItem = item[2];
            
            if (pesoAtual + pesoItem > cargaMax) continue;
            
            const posicionado = grade.posicionar(item);
            if (posicionado) {
                cestaAtual.push(posicionado);
                pesoAtual += pesoItem;
                itensRestantes.splice(i, 1);
                i--; // Ajustar índice após remoção
            }
        }
        
        if (cestaAtual.length === 0) {
            // Item não coube em nenhum lugar — evitar loop infinito
            console.warn("Item não cabe no container:", itensRestantes[0]);
            break;
        }
        
        cestas.push({
            itens: cestaAtual,
            grade: grade,
            pesoTotal: pesoAtual
        });
        
        if (!permitirCamadas) break;
    }
    
    return {
        cestas,
        permitirCamadas,
        ferramentas: itens,
        largura,
        comprimento,
        cargaMax
    };
}

function acionarCalculoGeral() {
    const configCompleta = carregarJSONSeguro(KEY_CONFIG, {});
    const cfg = configCompleta[currentUser.email] || CONFIG_PADRAO;
    
    // Usar o novo cálculo 2D
    const res = calcularPlanoCarga2D(cfg, equipamentosMemoria);
    
    // Processamento de KPIs
    const totalEquip = res.ferramentas.length;
    const pesoTotal = res.ferramentas.reduce((a, c) => a + c[2], 0);
    const numContainers = res.permitirCamadas ? res.cestas.length : 1;
    
    // Verificar estabilidade de todas as cestas
    let todasEstaveis = true;
    for (const cesta of res.cestas) {
        const estab = cesta.grade.verificarEstabilidade();
        if (!estab.estavel) todasEstaveis = false;
    }
    
    document.getElementById("kpi-container").innerHTML = `
        <div class="kpi-card"><span>Total Equipamentos</span><h2>${totalEquip} UNID</h2></div>
        <div class="kpi-card"><span>Peso Total Geral</span><h2>${pesoTotal.toLocaleString()} KG</h2></div>
        <div class="kpi-card"><span>Contentores Exigidos</span><h2>${numContainers} UNID</h2></div>
        <div class="kpi-card"><span>Balanceamento</span><h2 style="color:${todasEstaveis ? '#117A65' : '#D35400'};">${todasEstaveis ? '100% ESTÁVEL' : '⚠️ REVISAR'}</h2></div>
    `;

    // Processar e preencher a Tabela e os Gráficos Visuais
    const tbody = document.getElementById("tabela-cartesia-body");
    tbody.innerHTML = "";
    const graficosContainer = document.getElementById("graficos-container");
    graficosContainer.innerHTML = "";

    let listaLogistica = [];
    const dbContainers = carregarJSONSeguro(KEY_CONTAINERS, {});
    const invContainers = dbContainers[currentUser.email] || [];

    res.cestas.forEach((cesta, idxCesta) => {
        const grade = cesta.grade;
        const itens = cesta.itens;
        
        // Calcular dimensões necessárias
        const maxX = Math.max(...itens.map(i => i.x + i.larg));
        const maxY = Math.max(...itens.map(i => i.y + i.comp));
        const maxComp = Math.max(maxX, maxY); // Maior dimensão usada
        
        let [val_com, txt_com] = sugerirTamanhoComercial(maxComp);

        let tag_det = "";
        invContainers.sort((a, b) => a.comp - b.comp);
        for(let cnt of invContainers) {
            if (cnt.comp >= val_com) { tag_det = cnt.tag; break; }
        }
        if(!tag_det) tag_det = cfg.tag || "CBR-01";

        let tagFinal = res.permitirCamadas ? `${tag_det} (${idxCesta + 1}ª Camada)` : tag_det;
        listaLogistica.push(`${tagFinal} [${txt_com}]`);

        // Preencher tabela cartesiana com dados 2D reais
        const estab = grade.verificarEstabilidade();
        
        for (const item of itens) {
            const tx = item.peso * (item.px - grade.cx);
            const ty = item.peso * (item.py - grade.cy);
            
            const row = document.createElement("tr");
            row.innerHTML = `
                <td>${tagFinal}</td>
                <td><b>${item.nome}</b></td>
                <td>${item.comp.toFixed(2)}</td>
                <td>${item.larg.toFixed(2)}</td>
                <td>${item.peso.toFixed(0)}</td>
                <td>${item.px.toFixed(2)}</td>
                <td>${item.py.toFixed(2)}</td>
                <td>${tx.toFixed(1)}</td>
                <td>${ty.toFixed(1)}</td>
            `;
            tbody.appendChild(row);
        }

        // Renderização do Gráfico 2D da Cesta
        let titulo = res.permitirCamadas ? 
            `${tagFinal.toUpperCase()} - DIMENSÕES EXIGIDAS DA CAMADA: ${txt_com}` : 
            `${tagFinal.toUpperCase()} - DIMENSÕES EXIGIDAS DO CONTENTOR: ${txt_com}`;

        // Criar representação visual 2D
        let htmlGraf = `<div class="container-unidade"><h3>${titulo}</h3>`;
        
        // Container SVG para visualização 2D
        const escala = 400 / Math.max(grade.largura, grade.comprimento);
        const svgWidth = grade.largura * escala;
        const svgHeight = grade.comprimento * escala;
        
        htmlGraf += `<div style="position: relative; width: ${svgWidth}px; height: ${svgHeight}px; border: 2px solid #333; background: #f8f9fa; margin: 0 auto;">`;
        
        // Grid de fundo
        for (let gy = 0; gy < grade.rows; gy += 5) {
            for (let gx = 0; gx < grade.cols; gx += 5) {
                const { x, y } = grade.gridParaReal(gx, gy);
                htmlGraf += `<div style="position: absolute; left: ${x * escala}px; top: ${y * escala}px; width: ${5 * grade.resolucao * escala}px; height: ${5 * grade.resolucao * escala}px; border: 1px dashed #ddd;"></div>`;
            }
        }
        
        // Centro do container
        htmlGraf += `<div style="position: absolute; left: ${(grade.cx * escala) - 4}px; top: ${(grade.cy * escala) - 4}px; width: 8px; height: 8px; background: red; border-radius: 50%; z-index: 10;" title="Centro do Container"></div>`;
        
        // Centro de massa
        const cm = grade.calcularCentroMassa();
        htmlGraf += `<div style="position: absolute; left: ${(cm.cx * escala) - 4}px; top: ${(cm.cy * escala) - 4}px; width: 8px; height: 8px; background: blue; border-radius: 50%; z-index: 10;" title="Centro de Massa"></div>`;
        
        // Itens posicionados
        for (const item of itens) {
            const pref = prefixoCor(item.nome);
            const cor = CORES_MATERIALS[pref] || DEFAULT_COLOR;
            const itemWidth = (item.rotacionado ? item.comp : item.larg) * escala;
            const itemHeight = (item.rotacionado ? item.larg : item.comp) * escala;
            
            htmlGraf += `
                <div style="position: absolute; left: ${item.x * escala}px; top: ${item.y * escala}px; 
                     width: ${itemWidth}px; height: ${itemHeight}px; 
                     background-color: ${cor}; border: 1px solid #333; 
                     display: flex; align-items: center; justify-content: center;
                     font-size: 10px; font-weight: bold; color: white; text-shadow: 0 1px 2px rgba(0,0,0,0.5);">
                    ${item.nome}
                </div>
            `;
        }
        
        htmlGraf += `</div>`;
        
        // Informações de estabilidade
        htmlGraf += `<div style="margin-top: 10px; font-size: 12px; text-align: center;">`;
        htmlGraf += `Centro de Massa: (${cm.cx.toFixed(2)}, ${cm.cy.toFixed(2)}) | `;
        htmlGraf += `Peso: ${cesta.pesoTotal.toFixed(0)}kg | `;
        htmlGraf += `Ocupação: ${grade.taxaOcupacao().toFixed(1)}% | `;
        htmlGraf += `Estável: ${estab.estavel ? '✅' : '⚠️'}`;
        htmlGraf += `</div>`;
        
        htmlGraf += `</div>`;
        graficosContainer.innerHTML += htmlGraf;
    });

    const txtAlerta = "LOGÍSTICA: Requisitar " + listaLogistica.join(", ");
    const corAlerta = numContainers === 1 ? "#2ECC71" : "#D35400";
    const prefixo = numContainers === 1 ? "✅" : "⚠️";
    const divAlerta = document.getElementById("alerta-logistica");
    divAlerta.style.backgroundColor = corAlerta;
    divAlerta.innerText = `${prefixo} ${txtAlerta.toUpperCase()}`;
}

function inicializarLegendas() {
    const leg = document.getElementById("legenda-cores");
    leg.innerHTML = "";
    for(let pref in CORES_MATERIALS) {
        leg.innerHTML += `<div style="background-color:${CORES_MATERIALS[pref]}; color:white; padding:4px 10px; border-radius:4px; font-size:11px; font-weight:700; text-shadow:0 1px 2px rgba(0,0,0,0.3);">${pref}</div>`;
    }
}
