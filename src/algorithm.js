// ==========================================
// ALGORITMO DE DISTRIBUIÇÃO E RIGGING OFFSHORE
// ==========================================

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
