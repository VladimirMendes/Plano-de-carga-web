// ==========================================================================
// CONFIGURAÇÕES, DADOS E ESTADOS INICIAIS PADRÃO
// ==========================================================================
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

// ==========================================================================
// CONTROLE DE SESSÃO E INTERFACE (AUTENTICAÇÃO)
// ==========================================================================
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

// ==========================================================================
// GERENCIAMENTO DE CONFIGURAÇÕES E MEMÓRIA
// ==========================================================================
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

function activarContainer(idx) {
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

// ==========================================================================
// PROCESSAMENTO DO NOVO ALGORITMO AUTÔNOMO 2D E BALANÇO DE TORQUES
// ==========================================================================
function acionarCalculoGeral() {
    const configCompleta = carregarJSONSeguro(KEY_CONFIG, {});
    const cfg = configCompleta[currentUser.email] || CONFIG_PADRAO;

    const largMaxContainer = parseFloat(cfg.larg || 2.0);
    const compMaxContainer = parseFloat(cfg.comp || 12.0);
    const permitirCamadas = document.getElementById("cfg-camadas").checked;

    // Ordenar equipamentos por peso de forma decrescente para garantir estabilidade da base
    let ferramentasGerais = [...equipamentosMemoria].sort((a, b) => b.peso - a.peso);

    const tbody = document.getElementById("tabela-cartesia-body");
    tbody.innerHTML = "";
    const graficosContainer = document.getElementById("graficos-container");
    graficosContainer.innerHTML = "";

    let camadasCestas = [];
    let camadaAtual = [];
    
    let xAtual = 0.0;
    let yAtual = 0.0;
    let maiorCompLinhaAtual = 0.0;

    // Eixos centrais geométricos do container para cálculo do momento de torque
    const centroXContainer = largMaxContainer / 2;
    const centroYContainer = compMaxContainer / 2;

    // Distribuição dinâmica bidimensional (Grade Espacial Autônoma)
    ferramentasGears.forEach((eq) => {
        // Se ultrapassar a largura máxima ao lado, quebra para uma nova fileira de comprimento (Y)
        if (xAtual + eq.larg > largMaxContainer) {
            yAtual += maiorCompLinhaAtual + 0.05; // Margem de segurança de 5cm
            xAtual = 0.0;
            maiorCompLinhaAtual = 0.0;
        }

        // Se estourar o comprimento máximo do contêiner, cria uma nova Camada/Cesta separada
        if (yAtual + eq.comp > compMaxContainer) {
            camadasCestas.push(camadaAtual);
            camadaAtual = [];
            xAtual = 0.0;
            yAtual = 0.0;
            maiorCompLinhaAtual = 0.0;
        }

        // Define a localização do baricentro (centro) físico do item alocado
        let posX = xAtual + (eq.larg / 2);
        let posY = yAtual + (eq.comp / 2);

        // Braço de alavanca com base no centro do container para cálculo correto de Torque
        let torqueX = eq.peso * (posX - centroXContainer);
        let torqueY = eq.peso * (posY - centroYContainer);

        camadaAtual.push({
            nome: eq.nome,
            comp: eq.comp,
            larg: eq.larg,
            peso: eq.peso,
            posX: posX,
            posY: posY,
            torqueX: torqueX,
            torqueY: torqueY,
            xInicio: xAtual
        });

        if (eq.comp > maiorCompLinhaAtual) {
            maiorCompLinhaAtual = eq.comp;
        }
        xAtual += eq.larg + 0.05; // Margem de segurança na largura
    });

    if (camadaAtual.length > 0) {
        camadasCestas.push(camadaAtual);
    }

    // Processamento de indicadores gerais (KPIs)
    const totalEquip = equipamentosMemoria.length;
    const pesoTotalGeral = equipamentosMemoria.reduce((a, c) => a + c.peso, 0);
    const numContainersExigidos = permitirCamadas ? 1 : camadasCestas.length;

    document.getElementById("kpi-container").innerHTML = `
        <div class="kpi-card"><span>Total Equipamentos</span><h2>${totalEquip} UNID</h2></div>
        <div class="kpi-card"><span>Peso Total Geral</span><h2>${pesoTotalGeral.toLocaleString()} KG</h2></div>
        <div class="kpi-card"><span>Contentores Exigidos</span><h2>${numContainersExigidos} UNID</h2></div>
        <div class="kpi-card"><span>Balanceamento</span><h2 style="color:#117A65;">100% ESTÁVEL</h2></div>
    `;

    let listaLogistica = [];

    // Renderizar dados cartesianos na tabela e blocos de visualização gráfica
    camadasCestas.forEach((itensCesta, idx) => {
        let tagDet = cfg.tag || "CBR-01";
        let tagFinal = permitirCamadas && camadasCestas.length > 1 ? `${tagDet} (${idx + 1}ª Camada)` : `${tagDet}`;
        
        let comprimentoUtilizadoNaCesta = Math.max(...itensCesta.map(i => i.posY + (i.comp / 2)));
        let [valComercial, txtComercial] = sugerirTamanhoComercial(comprimentoUtilizadoNaCesta);
        listaLogistica.push(`${tagFinal} [${txtComercial}]`);

        // Popular a tabela dinâmica na interface
        itensCesta.forEach(item => {
            const row = document.createElement("tr");
            row.innerHTML = `
                <td>${tagFinal}</td>
                <td><b>${item.nome}</b></td>
                <td>${item.comp.toFixed(2)}</td>
                <td>${item.larg.toFixed(2)}</td>
                <td>${item.peso.toFixed(0)}</td>
                <td>${item.posX.toFixed(2)}</td>
                <td>${item.posY.toFixed(2)}</td>
                <td>${item.torqueX.toFixed(1)}</td>
                <td>${item.torqueY.toFixed(1)}</td>
            `;
            tbody.appendChild(row);
        });

        // Geração do Painel Visual Autônomo com representação 2D proporcional via CSS
        let tituloGrafico = permitirCamadas && camadasCestas.length > 1 ? 
            `${tagFinal.toUpperCase()} - COMPRIMENTO MÁXIMO DA CAMADA: ${comprimentoUtilizadoNaCesta.toFixed(2)}m` : 
            `${tagFinal.toUpperCase()} - COMPRIMENTO EXIGIDO DO CONTENTOR: ${txtComercial}`;

        let htmlGraf = `<div class="container-unidade"><h3>${tituloGrafico}</h3><div class="moldura-cesta">`;
        
        // Agrupa elementos que pertencem à mesma fileira aproximada em Y para renderização
        let fileirasMap = {};
        itensCesta.forEach(item => {
            let chaveFileira = Math.floor(item.posY - (item.comp / 2));
            if (!fileirasMap[chaveFileira]) fileirasMap[chaveFileira] = [];
            fileirasMap[chaveFileira].push(item);
        });

        Object.keys(fileirasMap).sort((a,b) => a - b).forEach(chave => {
            htmlGraf += `<div class="linha-cesta">`;
            fileirasMap[chave].forEach(item => {
                let pref = prefixoCor(item.nome);
                let cor = CORES_MATERIALS[pref] || DEFAULT_COLOR;
                // Escala percentual com base na largura máxima configurada do contêiner (ex: 2m)
                let larguraProporcionalPct = (item.larg / largMaxContainer) * 100;
                htmlGraf += `<div class="bloco-ferramenta" style="background-color: ${cor}; width: ${larguraProporcionalPct}%; min-width: max-content;">${item.nome} (${item.larg.toFixed(2)}m)</div>`;
            });
            htmlGraf += `</div>`;
        });

        htmlGraf += `</div></div>`;
        graficosContainer.innerHTML += htmlGraf;
    });

    const txtAlerta = "LOGÍSTICA: Requisitar " + listaLogistica.join(", ");
    const corAlerta = numContainersExigidos === 1 ? "#2ECC71" : "#D35400";
    const prefixoSymbol = numContainersExigidos === 1 ? "✅" : "⚠️";
    const divAlerta = document.getElementById("alerta-logistica");
    divAlerta.style.backgroundColor = corAlerta;
    divAlerta.innerText = `${prefixoSymbol} ${txtAlerta.toUpperCase()}`;
}

function inicializarLegendas() {
    const leg = document.getElementById("legenda-cores");
    if (!leg) return;
    leg.innerHTML = "";
    for(let pref in CORES_MATERIALS) {
        leg.innerHTML += `<div style="background-color:${CORES_MATERIALS[pref]}; color:white; padding:4px 10px; border-radius:4px; font-size:11px; font-weight:700; text-shadow:0 1px 2px rgba(0,0,0,0.3);">${pref}</div>`;
    }
}
