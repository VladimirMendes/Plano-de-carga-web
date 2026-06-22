# Plano-de-carga-web
O objetivo principal é calcular, organizar e renderizar graficamente a disposição de ferramentas e cargas pesadas (como tubos de perfuração, comandos, ferramentas de completação) dentro de contêineres/cestas offshore, monitorando limites de carga e o equilíbrio/balanceamento estático da operação.

📋 SUMÁRIO EXECUTIVO: PLANO DE CARGA OFFSHORE ESTÁTICO
A aplicação foi migrada de uma infraestrutura baseada em servidor (Streamlit) para uma solução 100% Client-Side hospedada no GitHub Pages. Toda a lógica de processamento matemático, renderização e persistência de dados ocorre em tempo de execução no navegador do usuário.

🏗️ PILAR 1: Estrutura de Arquivos e Divisão de Responsabilidades
O projeto está modularizado dentro do repositório para garantir fácil manutenção, separando a estrutura (HTML), a estética (CSS) e o comportamento (JS) de forma limpa:

seu-repositorio/
├── index.html        (A estrutura da tela: abas, tabelas, inputs e botões)
├── style.css         (O design corporativo e as regras severas de PDF)
└── src/              (Diretório de scripts lógicos da aplicação)
    ├── main.js       (O controlador de interface: abas, login e eventos)
    ├── database.js   (A camada de persistência: localStorage/sessionStorage)
    └── algorithm.js  (O motor matemático de alocação 2D e balanço de torque)
    
Fluxo de Dependência no index.html:

    <script src="src/database.js"></script>
    <script src="src/algorithm.js"></script>
    <script src="src/main.js"></script>
</body>

🧠 PILAR 2: Divisão de Lógica do JavaScript (src/)
​1. src/main.js (Interface e Orquestração)
​Função: Capturar as ações do usuário (cliques, mudanças de aba, inputs) e atualizar o DOM.
​Escopo: Alternância entre telas de login e cadastro, gerenciamento do painel principal, acionamento do botão "Calcular" e desenho das tabelas cartesianas e blocos visuais na tela.
​2. src/database.js (Banco de Dados Local)
​Função: Isolar a leitura e gravação de dados, substituindo o backend por persistência local.
​Escopo: Salvamento seguro em localStorage das listas de ferramentas customizadas e novos contêineres, além de gerenciar a sessão ativa do usuário autenticado no sessionStorage para evitar perda de dados ao atualizar a página.
​3. src/algorithm.js (Motor Matemático de Engenharia)
Função: Processar os cálculos físicos e espaciais sem interferir na interface gráfica.
Algoritmo de Grade 2D: Ordena os itens decrescentemente por peso para garantir estabilidade. Distribui as ferramentas de forma autônoma no plano cartesiano considerando as dimensões reais de comprimento e largura (otimizando o espaço de contêineres de 2 metros de largura). Quebra "linhas" em Y automaticamente se estourar a largura lateral e gera novas camadas ou cestas se o comprimento limite for atingido.
Balanço de Torques: Encontra o centro geométrico do container (X_{centro}, Y_{centro}) e calcula o braço de alavanca de cada item para gerar os momentos de torque:
Torque x  = peso x (posição x - x centro)
Torque y = peso y (posição y - y centro)

🎨 PILAR 3: Design e Motor de Impressão (style.css)
Visual Proporcional Dinâmico: Utiliza Flexbox/Grid e propriedades como flex-wrap: wrap nas fileiras do contêiner. Os blocos gráficos de ferramentas (.bloco-ferramenta) herdam comprimentos e larguras percentuais proporcionais à escala real calculada pelo algoritmo, adaptando-se perfeitamente na tela.
Fidelidade de Impressão Absoluta (PDF): Utiliza a diretiva @media print para ocultar botões, cabeçalhos, barras de ferramentas e formulários de autenticação durante a impressão. Ativa as propriedades fundamentais para forçar o navegador a gerar o PDF mantendo as cores corporativas de fundo e bordas intocadas:

-webkit-print-color-adjust: exact !important;
print-color-adjust: exact !important;

🔄 PILAR 4: O Ciclo de Execução (Como tudo se conecta)

[Usuário Clica em Calcular] 
           │
           ▼
     (src/main.js) ──► Requisita dados ao ──► (src/database.js)
           │                                          │
           ▼                                          ▼
     Recebe os dados ◄──────────────────────── Retorna listas salvas
           │
           ▼
     Envia ferramentas para processamento ──► (src/algorithm.js)
           │                                          │
           ▼                                          ▼
     Recebe matriz (X, Y, Torques) ◄───────── Executa a matemática 2D
           │
           ▼
[src/main.js Atualiza a Tela e Gera os Gráficos Proporcionais em CSS]
