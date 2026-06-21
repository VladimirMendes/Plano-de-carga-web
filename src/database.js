// Chaves para simulação do LocalStorage (Substitutos de Arquivos JSON)
const KEY_LEADS = "offshore_leads";
const KEY_CONFIG = "offshore_config";
const KEY_CONTAINERS = "offshore_containers";
const KEY_FERRAMENTAS = "offshore_ferramentas";

function carregarJSONSeguro(localStorageKey, padrao) {
    try {
        const dados = localStorage.getItem(localStorageKey);
        return dados ? JSON.parse(dados) : padrao;
    } catch (e) {
        return padrao;
    }
}

function salvarJSON(localStorageKey, dados) {
    localStorage.setItem(localStorageKey, JSON.stringify(dados));
}

// Mecanismo determinístico simplificado para simulação estável em JS Front
function hashPassword(plain) {
    if(!plain) return "";
    let hash = 0;
    for (let i = 0; i < plain.length; i++) {
        const char = plain.charCodeAt(i);
        hash = ((hash << 5) - hash) + char;
        hash = hash & hash; // Converte para inteiro de 32 bits
    }
    return "js_hash$" + Math.abs(hash).toString(16);
}

function verifyPassword(plain, stored) {
    return hashPassword(plain) === stored;
}
