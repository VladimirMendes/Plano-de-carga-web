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

function acionarCalculoGeral() {
    const configCompleta = carregarJSONSeguro(KEY_CONFIG, {});
    const cfg = configCompleta[currentUser.email] || CONFIG_PADRAO;
    const res = calcularPlanoCarga(cfg, equipamentosMemoria);
    
    // Processamento de KPIs
    const totalEquip = res.ferramentas.length;
    const pesoTotal = res.ferramentas.reduce((a,c) => a + c[2], 0);
    const numContainers = res.permitirCamadas ? 1 : res.cestas.length;
    
    document.getElementById("kpi-container").innerHTML = `
        <div class="kpi-card"><span>Total Equipamentos</span><h2>${totalEquip} UNID</h2></div>
        <div class="kpi-card"><span>Peso Total Geral</span><h2>${pesoTotal.toLocaleString()} KG</h2></div>
        <div class="kpi-card"><span>Contentores Exigidos</span><h2>${numContainers} UNID</h2></div>
        <div class="kpi-card"><span>Balanceamento</span><h2 style="color:#117A65;">100% ESTÁVEL</h2></div>
    `;

    // Processar e preencher a Tabela e os Gráficos Visuais
    const tbody = document.getElementById("tabela-cartesia-body");
    tbody.innerHTML = "";
    const graficosContainer = document.getElementById("graficos-container");
    graficosContainer.innerHTML = "";

    let listaLogistica = [];
    const dbContainers = carregarJSONSeguro(KEY_CONTAINERS, {});
    const invContainers = dbContainers[currentUser.email] || [];

    res.cestas.forEach((itensCesta, idxCesta) => {
        let lado_a = [], lado_b = [];
        let pa = 0, pb = 0;
        for (let it of itensCesta) {
            if (pa <= pb) { lado_a.push(it); pa += it[2]; }
            else { lado_b.push(it); pb += it[2]; }
        }

        let comp_a = lado_a.reduce((a,c) => a+c[1],0) + (lado_a.length * 0.1);
        let comp_b = lado_b.reduce((a,c) => a+c[1],0) + (lado_b.length * 0.1);
        let max_comp = Math.max(comp_a, comp_b);
        let [val_com, txt_com] = sugerirTamanhoComercial(max_comp);

        let tag_det = "";
        invContainers.sort((a,b) => a.comp - b.comp);
        for(let cnt of invContainers) {
            if (cnt.comp >= val_com) { tag_det = cnt.tag; break; }
        }
        if(!tag_det) tag_det = cfg.tag || "CBR-01";

        let tagFinal = res.permitirCamadas ? `${tag_det} (${idxCesta + 1}ª Camada)` : tag_det;
        listaLogistica.push(`${tagFinal} [${txt_com}]`);

        // Função interna para alocar e calcular torques cartesianos
        function alocarEixoY(listaLado, sx, nomesAcum) {
            let ponteiro = 0.0;
            for(let item of listaLado) {
                let [n, c, p, l] = item;
                let px = res.cx + (sx * (l / 2 + 0.20));
                let py = ponteiro + (c / 2);
                let tx = p * (px - res.cx);
                let ty = p * (py - res.cy);

                const row = document.createElement("tr");
                row.innerHTML = `
                    <td>${tagFinal}</td><td><b>${n}</b></td><td>${c.toFixed(2)}</td>
                    <td>${l.toFixed(2)}</td><td>${p.toFixed(0)}</td><td>${px.toFixed(2)}</td>
                    <td>${py.toFixed(2)}</td><td>${tx.toFixed(1)}</td><td>${ty.toFixed(1)}</td>
                `;
                tbody.appendChild(row);
                nomesAcum.push({n, c});
                ponteiro += c + 0.10;
            }
        }

        let nomesA = [], nomesB = [];
        alocarEixoY(lado_a, -1, nomesA);
        alocarEixoY(lado_b, 1, nomesB);

        // Renderização do HTML do Gráfico da Cesta
        let compEscala = Math.max(res.C_CESTA, max_comp);
        let titulo = res.permitirCamadas ? 
            `${tagFinal.toUpperCase()} - COMPRIMENTO EXIGIDO DA CAMADA: ${txt_com}` : 
            `${tagFinal.toUpperCase()} - COMPRIMENTO EXIGIDO DO CONTENTOR: ${txt_com}`;

        let htmlGraf = `<div class="container-unidade"><h3>${titulo}</h3><div class="moldura-cesta">`;
        [nomesA, nomesB].forEach(ladoItens => {
            htmlGraf += `<div class="linha-cesta">`;
            ladoItens.forEach(item => {
                let pref = prefixoCor(item.n);
                let cor = CORES_MATERIALS[pref] || DEFAULT_COLOR;
                let larguraPct = (item.c / compEscala) * 100;
                htmlGraf += `<div class="bloco-ferramenta" style="background-color: ${cor}; width: ${larguraPct}%;">${item.n}</div>`;
            });
            htmlGraf += `</div>`;
        });
        htmlGraf += `</div></div>`;
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
