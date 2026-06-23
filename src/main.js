// Chaves para simulação do LocalStorage (Sincronizado com database.js)
const KEY_LEADS = "offshore_leads";
const KEY_CONFIG = "offshore_config";
const KEY_CONTAINERS = "offshore_containers";
const KEY_FERRAMENTAS = "offshore_ferramentas";

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
    "alt": "2.000", "tara": "1500", "carga": "7000", 
    "camadas": true, "pernas": "4", "angulo": "60"
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
    
    if (event && event.target) {
        event.target.classList.add('active');
    }
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
    
    if (document.getElementById("cfg-pernas")) document.getElementById("cfg-pernas").value = cfg.pernas || "4";
    if (document.getElementById("cfg-angulo")) document.getElementById("cfg-angulo").value = cfg.angulo || "60";
    
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
        camadas: document.getElementById("cfg-camadas").checked,
        pernas: document.getElementById("cfg-pernas") ? document.getElementById("cfg-pernas").value : "4",
        angulo: document.getElementById("cfg-angulo") ? document.getElementById("cfg-angulo").value : "60"
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
    if (!tbody) return;
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
    if (!containerLista) return;
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
        camadas: document.getElementById("cfg-camadas").checked,
        pernas: document.getElementById("cfg-pernas") ? document.getElementById("cfg-pernas").value : "4",
        angulo: document.getElementById("cfg-angulo") ? document.getElementById("cfg-angulo").value : "60"
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

class GradeContainer2D {
    constructor(largura, comprimento, resolucao = 0.10) {
        this.largura = largura;      
        this.comprimento = comprimento; 
        this.resolucao = resolucao;  
        this.cx = largura / 2;
        this.cy = comprimento / 2;
        this.cols = Math.ceil(largura / resolucao);
        this.rows = Math.ceil(comprimento / resolucao);
        this.grid = Array.from({ length: this.rows }, () => Array(this.cols).fill(null));
        this.itens = [];
    }

    realParaGrid(x, y) {
        const gx = Math.floor(x / this.resolucao);
        const gy = Math.floor(y / this.resolucao);
        return { gx, gy };
    }

    gridParaReal(gx, gy) {
        const x = (gx + 0.5) * this.resolucao;
        const y = (gy + 0.5) * this.resolucao;
        return { x, y };
    }

    areaLivre(x, y, largura, comprimento) {
        const { gx: startX, gy: startY } = this.realParaGrid(x, y);
        const { gx: endX, gy: endY } = this.realParaGrid(x + largura, y + comprimento);
        
        for (let gy = startY; gy <= endY && gy < this.rows; gy++) {
            for (let gx = startX; gx <= endX && gx < this.cols; gx++) {
                if (gy < 0 || gx < 0 || gy >= this.rows || gx >= this.cols || this.grid[gy][gx] !== null) return false;
            }
        }
        return true;
    }

    ocuparArea(x, y, largura, comprimento, item) {
        const { gx: startX, gy: startY } = this.realParaGrid(x, y);
        const { gx: endX, gy: endY } = this.realParaGrid(x + largura, y + comprimento);
        
        for (let gy = startY; gy <= endY && gy < this.rows; gy++) {
            for (let gx = startX; gx <= endX && gx < this.cols; gx++) {
                if (gy >= 0 && gx >= 0 && gy < this.rows && gx < this.cols) this.grid[gy][gx] = item;
            }
        }
    }

    encontrarPosicao(item) {
        const [nome, comp, peso, larg] = item;
        const centros = [];
        for (let gy = 0; gy < this.rows; gy++) {
            for (let gx = 0; gx < this.cols; gx++) {
                const { x, y } = this.gridParaReal(gx, gy);
                const distCentro = Math.sqrt((x - this.cx)**2 + (y - this.cy)**2);
                centros.push({ gx, gy, x, y, distCentro });
            }
        }
        
        centros.sort((a, b) => a.distCentro - b.distCentro);
        
        for (const pos of centros) {
            const x = pos.x - larg / 2;
            const y = pos.y - comp / 2; 
            
            if (x >= 0 && y >= 0 && x + larg <= this.largura && y + comp <= this.comprimento) {
                if (this.areaLivre(x, y, larg, comp)) {
                    return { x, y, px: x + larg / 2, py: y + comp / 2 };
                }
            }
        }
        return null;
    }

    posicionar(item) {
        const pos = this.encontrarPosicao(item);
        if (!pos) return null;
        
        const [nome, comp, peso, larg] = item;
        this.ocuparArea(pos.x, pos.y, larg, comp, nome);
        
        const itemPosicionado = {
            nome, comp, peso, larg,
            x: pos.x, y: pos.y,
            px: pos.px, py: pos.py,
            rotacionado: false
        };
        
        this.itens.push(itemPosicionado);
        return itemPosicionado;
    }

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
}

function acionarCalculoGeral() {
    const configCompleta = carregarJSONSeguro(KEY_CONFIG, {});
    const cfg = configCompleta[currentUser?.email] || CONFIG_PADRAO;
    
    const largura = parseFloat(document.getElementById("cfg-larg")?.value || cfg.larg);
    const comprimento = parseFloat(document.getElementById("cfg-comp")?.value || cfg.comp);
    const cargaMax = parseInt(document.getElementById("cfg-carga")?.value || cfg.carga);
    const taraCesta = parseFloat(document.getElementById("cfg-tara")?.value || cfg.tara) || 1500.0;
    const numPernas = parseInt(document.getElementById("cfg-pernas")?.value || cfg.pernas) || 4;
    const anguloIçamento = parseFloat(document.getElementById("cfg-angulo")?.value || cfg.angulo) || 60;
    const permitirCamadas = document.getElementById("cfg-camadas") ? document.getElementById("cfg-camadas").checked : true;
    
    if(!equipamentosMemoria || equipamentosMemoria.length === 0){
        equipamentosMemoria = [...FERRAMENTAS_PADRAO];
    }

    const itens = equipamentosMemoria.map(f => [f.nome, f.comp, f.peso, f.larg])
        .sort((a, b) => (b[1] * b[3]) - (a[1] * a[3])); 
    
    const cestas = [];
    let itensRestantes = [...itens];
    
    while (itensRestantes.length > 0) {
        const grade = new GradeContainer2D(largura, comprimento);
        const cestaAtual = [];
        let pesoAtual = 0;
        
        for (let i = 0; i < itensRestantes.length; i++) {
            const item = itensRestantes[i];
            if (pesoAtual + item[2] > cargaMax) continue;
            
            const posicionado = grade.posicionar(item);
            if (posicionado) {
                cestaAtual.push(posicionado);
                pesoAtual += item[2];
                itensRestantes.splice(i, 1);
                i--; 
            }
        }
        
        if (cestaAtual.length === 0) break;
        
        const cm = grade.calcularCentroMassa();
        const pesoBrutoTotal = pesoAtual + taraCesta;
        const anguloRad = (anguloIçamento * Math.PI) / 180;
        const fatorAngulo = 1 / Math.sin(anguloRad);
        const tensaoPorPernaIdeal = (pesoBrutoTotal * fatorAngulo) / numPernas;
        
        const desvioX = cm.cx - grade.cx;
        const desvioY = cm.cy - grade.cy;
        const estavel = (Math.abs(desvioX) <= largura * 0.1) && (Math.abs(desvioY) <= comprimento * 0.1);

        cestas.push({
            itens: cestaAtual,
            grade: grade,
            pesoTotal: pesoAtual,
            rigging: {
                pesoBrutoTotal,
                fatorAngulo,
                tensaoPorPernaIdeal,
                desvioX,
                desvioY,
                estavel,
                cmX: cm.cx,
                cmY: cm.cy
            }
        });
        
        if (!permitirCamadas) break;
    }
    
    const totalEquip = equipamentosMemoria.length;
    const pesoTotalGeral = equipamentosMemoria.reduce((a, c) => a + c.peso, 0);
    const numContainers = cestas.length;
    let todasEstaveis = cestas.every(c => c.rigging.estavel);
    
    document.getElementById("kpi-container").innerHTML = `
        <div class="kpi-card"><span>Total Equipamentos</span><h2>${totalEquip} UNID</h2></div>
        <div class="kpi-card"><span>Peso Total Geral</span><h2>${pesoTotalGeral.toLocaleString()} KG</h2></div>
        <div class="kpi-card"><span>Cestas Exigidas</span><h2>${numContainers} UNID</h2></div>
        <div class="kpi-card"><span>Segurança Rigging</span><h2 style="color:${todasEstaveis ? '#117A65' : '#D35400'};">${todasEstaveis ? '100% SEGURO' : '⚠️ AJUSTAR CG'}</h2></div>
    `;

    const tbody = document.getElementById("tabela-cartesia-body");
    tbody.innerHTML = "";
    const graficosContainer = document.getElementById("graficos-container");
    graficosContainer.innerHTML = "";

    let listaLogistica = [];

    cestas.forEach((cesta, idxCesta) => {
        const tagFinal = permitirCamadas ? `${cfg.tag || "CBR-01"} (Cesta ${idxCesta + 1})` : (cfg.tag || "CBR-01");
        listaLogistica.push(tagFinal);

        cesta.itens.forEach(item => {
            const row = document.createElement("tr");
            row.innerHTML = `
                <td>${tagFinal}</td>
                <td><b>${item.nome}</b></td>
                <td>${item.comp.toFixed(2)}m</td>
                <td>${item.larg.toFixed(2)}m</td>
                <td>${item.peso.toFixed(0)} kg</td>
                <td>${item.px.toFixed(2)}m</td>
                <td>${item.py.toFixed(2)}m</td>
                <td>${(item.peso * (item.px - cesta.grade.cx)).toFixed(1)}</td>
                <td>${(item.peso * (item.py - cesta.grade.cy)).toFixed(1)}</td>
            `;
            tbody.appendChild(row);
        });

        let htmlGraf = `<div class="container-unidade" style="margin-bottom: 30px; background: white; padding: 15px; border-radius: 6px; border: 1px solid #ddd;">`;
        htmlGraf += `<h3>📊 ${tagFinal.toUpperCase()} - PLANO DE ALOCAÇÃO E RIGGING</h3>`;
        
        const escala = 500 / comprimento; 
        const svgWidth = largura * escala;
        const svgHeight = comprimento * escala;
        
        htmlGraf += `<div style="position: relative; width: ${svgWidth}px; height: ${svgHeight}px; border: 3px solid #2C3E50; background: #ECF0F1; margin: 15px auto;">`;
        
        htmlGraf += `<div style="position: absolute; left: ${(largura/2 * escala) - 5}px; top: ${(comprimento/2 * escala) - 5}px; width: 10px; height: 10px; background: #E74C3C; border-radius: 50%; z-index: 20; border: 1px solid white;" title="Centro Geométrico"></div>`;
        
        htmlGraf += `<div style="position: absolute; left: ${(cesta.rigging.cmX * escala) - 6}px; top: ${(cesta.rigging.cmY * escala) - 6}px; width: 12px; height: 12px; background: #2980B9; border-radius: 50%; z-index: 21; border: 2px solid white;" title="Centro de Gravidade"></div>`;
        
        cesta.itens.forEach(item => {
            const pref = prefixoCor(item.nome);
            const cor = CORES_MATERIALS[pref] || DEFAULT_COLOR;
            const w = item.larg * escala;
            const h = item.comp * escala;
            const xLeft = (item.px - item.larg/2) * escala;
            const yTop = (item.py - item.comp/2) * escala;
            
            htmlGraf += `
                <div style="position: absolute; left: ${xLeft}px; top: ${yTop}px; 
                     width: ${w}px; height: ${h}px; 
                     background-color: ${cor}; border: 1px solid #2C3E50; 
                     display: flex; flex-direction: column; align-items: center; justify-content: center;
                     font-size: 10px; font-weight: bold; color: white;">
                    <span>${item.nome}</span>
                    <span style="font-size:8px; font-weight:normal;">${item.peso}kg</span>
                </div>
            `;
        });
        
        htmlGraf += `</div>`;
        
        htmlGraf += `
            <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(200px, 1fr)); gap: 10px; background: #F8F9FA; padding: 12px; border-radius: 4px; border-left: 5px solid ${cesta.rigging.estavel ? '#2ECC71' : '#E74C3C'}; margin-top: 15px; font-size:12px; text-align: left; color:#333;">
                <div><b>Carga Líquida:</b> ${cesta.pesoTotal.toFixed(0)} kg</div>
                <div><b>Peso Bruto (Líquido + Tara):</b> ${cesta.rigging.pesoBrutoTotal.toFixed(0)} kg</div>
                <div><b>Centro de Gravidade (CG):</b> X: ${cesta.rigging.cmX.toFixed(2)}m | Y: ${cesta.rigging.cmY.toFixed(2)}m</div>
                <div><b>Desvio de Excentricidade:</b> X: ${cesta.rigging.desvioX.toFixed(2)}m | Y: ${cesta.rigging.desvioY.toFixed(2)}m</div>
                <div><b>Fator de Ângulo (FA):</b> ${cesta.rigging.fatorAngulo.toFixed(3)}</div>
                <div><b>Tensão Estimada por Perna:</b> <span style="font-weight:bold; color:#2980B9;">${cesta.rigging.tensaoPorPernaIdeal.toFixed(0)} kgf</span></div>
                <div style="grid-column: 1 / -1; font-weight: bold; color: ${cesta.rigging.estavel ? '#27AE60' : '#C0392B'};">
                    Status Estabilidade: ${cesta.rigging.estavel ? '✅ DENTRO DOS LIMITES DE SEGURANÇA (MÁX 10% DESVIO)' : '⚠️ CRÍTICO: CG EXCÊNTRICO! REARRANJE AS FERRAMENTAS PEZADAS'}
                </div>
            </div>
        `;
        
        htmlGraf += `</div>`;
        graficosContainer.innerHTML += htmlGraf;
    });

    const divAlerta = document.getElementById("alerta-logistica");
    divAlerta.style.backgroundColor = todasEstaveis ? "#2ECC71" : "#D35400";
    divAlerta.innerText = `REQUISITAR: ${listaLogistica.join(" E ").toUpperCase()} | STATUS: ${todasEstaveis ? 'APROVADO PARA IÇAMENTO' : 'REPROVADO POR EXCENTRICIDADE DE CG'}`;
}

function inicializarLegendas() {
    const leg = document.getElementById("legenda-cores");
    if (!leg) return;
    leg.innerHTML = "";
    for(let pref in CORES_MATERIALS) {
        leg.innerHTML += `<div style="background-color:${CORES_MATERIALS[pref]}; color:white; padding:4px 10px; border-radius:4px; font-size:11px; font-weight:700; text-shadow:0 1px 2px rgba(0,0,0,0.3);">${pref}</div>`;
    }
}
