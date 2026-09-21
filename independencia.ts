//5% de tolerância
const TORELANCIA_INDEPENDENCIA = 0.8;
const NUM_SIMULACOES = 100000;


let arestas : any = [];
let d_separadores : any = {};
let estados : any = [];


function combinacoes(vetor: string[], n: number, remover_repeticao: boolean = true): string[][]{
    if(n == 1){
        return vetor.map( e => [e]);
    }
    
    /* vetor = [a, b, c, d]

    n = 2;

    let sub = [ 
        [a]
        [b]
        [c]
        [d]
    ]

    */

    let sub = combinacoes(vetor, n - 1);
    let resposta = [];

    for(let sub_combinacao of sub){
        for(let elemento of vetor){
            const contem_repeticao = sub_combinacao.indexOf(elemento) !== -1;

            if(contem_repeticao && remover_repeticao){
                //resposta.push([...sub_combinacao]);
            }else{
                resposta.push([...sub_combinacao, elemento])
            }
        }
    }

    return resposta;
}

function combinacoes_valores(estados: string[]): Condicao[][]{
    const valores_possiveis = [0, 1];

    let [primeiro_estado, ...demais_estados] = estados;

    if(!primeiro_estado)
        return [[]];

    if(demais_estados.length == 0){
        let resposta = [];
        for(let valor of valores_possiveis){
            resposta.push( [{estado: primeiro_estado, valor}]);
        }
        return resposta;
    }

    let parciais_demais_estados : Condicao[][] = combinacoes_valores(demais_estados);

    let resposta = [];
    for(let valor of valores_possiveis){
        for(let parcial of parciais_demais_estados){
            resposta.push(
                [{estado: primeiro_estado, valor}, ...parcial]
            );
        }
    }

    return resposta;    
}

// X_||_Y | Z
function independencia_condicional(X: string, Y: string, Z: string[]){
    let valores_possiveis = [0, 1];

    let combinacoes_Z = combinacoes_valores(Z);

    //para cada valor de X
    for(let Vx of valores_possiveis){
        for(let Cz of combinacoes_Z){
            let pX_Z = probabilidade_condicional(X, Vx, [...Cz]);

            let txt_Z = Cz.map(e => `${e.estado}=${e.valor}`).join(',');

            logProbabilidade(`P(${X}=${Vx}|${txt_Z}) = ${pX_Z.toFixed(2)}`);

            for(let Vy of valores_possiveis){
                let pXY_Z = probabilidade_condicional(X, Vx, [{ estado: Y, valor: Vy }, ...Cz]);
                let diff = (100 * Math.abs(pXY_Z - pX_Z))

                logProbabilidade(`P(${X}=${Vx}|${Y}=${Vy}, ${txt_Z}) = ${pXY_Z.toFixed(2)}`);

                //console.log({pXY_Z, pX_Z, diff: `${diff.toFixed(2)}%`})

                if(diff >= TORELANCIA_INDEPENDENCIA){
                    return false;
                }
            }
        }
    }
    
    return true;
}

interface Dependencia {
    dependencia: string[] | null
}

type Relacoes = {
    [estado: string]: Dependencia
}

type Ocorrencia = {
    [estado: string] : 0 | 1
}

function gerar_simulacao(relacoes: Relacoes){
    const estados = Object.keys(relacoes);

    let ocorrencia : Ocorrencia = {};

    for(let estado of estados){
        let {dependencia} = relacoes[estado];

        if(!dependencia){
            ocorrencia[estado] = Math.random() > 0.5 ? 1 : 0;
        }else{
            let valores = dependencia.map(d => {
                let valor = ocorrencia[d]

                if(valor === 1) 
                    return Math.random() < 0.8 ? 1 : 0;

                return Math.random() < 0.2 ? 1 : 0;
            })  

            ocorrencia[estado] = valores.some(v => v == 1) ? 1 : 0;
        }
    }

    return ocorrencia;
}

type Distribuicao = {
    ocorrencia: Ocorrencia,
    qnt: number
}[]

let distribuicao: Distribuicao = [];

function gerar_distribuicao_conjunta(relacoes: Relacoes){
    // indentifica os estados envolvidos
    estados = Object.keys(relacoes);

    if(json_distribuicao){
        distribuicao = json_distribuicao;
        return;
    }
    
    distribuicao = [];

    for(let i = 0; i < NUM_SIMULACOES; i++){
        let ocorrencia = gerar_simulacao(relacoes);
        
        let registro = distribuicao.find(d => JSON.stringify(d.ocorrencia) ===  JSON.stringify(ocorrencia))

        if(registro){
            registro.qnt += 1;
        }else{
            distribuicao.push({
                qnt: 1,
                ocorrencia
            });
        }
    }
}

interface Condicao {
    estado: string,
    valor: 0 | 1
};

function probabilidade_condicional(estado: string, valor: 0|1, condicoes?: Condicao[]){
    const conjunto_universo = condicoes ? 
                                distribuicao.filter( d => condicoes.every(c => d.ocorrencia[c.estado] == c.valor)):
                                distribuicao;
    const selecao = conjunto_universo.filter(d => d.ocorrencia[estado] == valor);

    const tamanho_conjunto_universo = conjunto_universo.reduce((acc, curr) => acc += curr.qnt, 0);
    const tamanho_selecao = selecao.reduce((acc, curr) => acc += curr.qnt, 0);
    
    // Proteção contra divisão por zero (NaN)
    if (tamanho_conjunto_universo === 0) {
        let txt_cond = !condicoes ? 'Ω' : condicoes.map(c => `${c.estado}=${c.valor}`).join(',');
        //console.log(`p(${estado}=${valor}|${txt_cond}) = 0 (Universo vazio)`);
        return 0;
    }

    const probabilidade = tamanho_selecao / tamanho_conjunto_universo;

    // mera exibição
    let txt_condicoes = !condicoes ? 'Ω' : condicoes.map(c => `${c.estado}=${c.valor}`).join(',');
    //console.log(`p(${estado}=${valor}|${txt_condicoes}) = ${probabilidade}`);

    // retorno da probabilidade condicional calculada.
    return probabilidade;
}

let nos: {[estado: string] : any} = {};

function desenhar_relacoes(estados: string[]){
    window.cy = configurar_grafo();

    for(let estado of estados){
        nos[estado] = createNode(estado, { 
            x: Math.random() * 400, 
            y: Math.random() * 400
        });
    }
}

function analisar_conjuntos_d_separacao(){
    arestas = [];
    d_separadores = {};
    $("#log").html('')

    // supõem que todos os estados estão conectados no grafo.
    const conexoes_possiveis = combinacoes(estados, 2);

    // para cada arresta (conexão)
    for(let conexao of conexoes_possiveis){
        const [x, y] = conexao;

        // verifica se conjunto é independemte condional ou marginalmente.
        let d_separador = conjunto_d_separacao(x, y,  estados );

        log_d_separacao(x, y, d_separador);

        // caso sejam dependentes, cria uma conexão (não orientada)
        if(!d_separador){
            const representacao_grafica = createEdge( nos[x] , nos[y], '?');

            arestas.push({
                origem: x,
                destino: y,
                d_separador,
                representacao_grafica
            })

            //console.log(`${x} -- ${y}`);
        }else{
            if(!d_separadores[x]){
                d_separadores[x] = {};
            }

            d_separadores[x][y] = d_separador;
        }
    }
}

function analisar_orientacao(){
    for(let x of estados){
        for(let y of estados){
            if(x == y)
                continue;

            // 2 nós são adjacentes de há uma aresta ligandos eles.
            let sao_adjacentes = arestas.find( e => e.origem == x && e.destino == y);

            if(sao_adjacentes)
                continue;

            let vizinhos_x = arestas.filter( e => e.origem == x ).map(e => e.destino);
            let vizinhos_y = arestas.filter( e => e.origem == y ).map(e => e.destino);

            let vizinhos_comuns = vizinhos_x.filter( ex => vizinhos_y.find(ey => ey == ex ));

            if(vizinhos_comuns.length > 0){
                //console.log({ x, y, vizinhos_comuns, })

                for(let vizinho of vizinhos_comuns){
                    const separou_x_y = d_separadores[x][y].indexOf(vizinho) !== -1;

                    if(separou_x_y){
                        console.log(`${vizinho} separou ${x} - ${y}`);
                    }else{
                        console.log(`${vizinho} NÃO separou ${x} - ${y}`, d_separadores[x][y], d_separadores[y][x]);
                        // Ele é um colisor.
                        let ax = arestas.findIndex(e => e.origem == x && e.destino == vizinho);
                        let ay = arestas.findIndex(e => e.origem == y && e.destino == vizinho);

                        // remove a representação visual.
                        cy.remove(`#${generateEdgeId(nos[vizinho].id(), nos[x].id())}`);
                        cy.remove(`#${generateEdgeId(nos[vizinho].id(), nos[y].id())}`);


                    }
                }
            }
        }
    }
}

function descrever_relacoes(relacoes: Relacoes[]){
    for(let i = 0; i < relacoes.length; i++){
        // gera a distribuição de probabilidade conjunta.
        gerar_distribuicao_conjunta(relacoes[i]);

        // desenha apenas os nós
        desenhar_relacoes(estados);

        analisar_conjuntos_d_separacao();

        analisar_orientacao();
        /*
        let abc = independencia_condicional("A", "B", ["C"]);
        let bca = independencia_condicional("B", "C", ["A"]);
        let cab = independencia_condicional("C", "A", ["B"]);

        let ab = independencia_condicional("A", "B", []);
        let ac = independencia_condicional("A", "C", []);
        let bc = independencia_condicional("B", "C", []);

        console.log(`na relação r${i+1}
            A_||_B | C = ${abc}
            B_||_C | A = ${bca}
            C_||_A | B = ${cab}

            A_||_B ${ab}
            A_||_C ${ac}
            B_||_C ${bc}
        `);
        */
    }
}


function conjunto_d_separacao(X: string, Y: string, conjunto: string[]): string[] | null{
    const sub_conjunto = conjunto.filter(e => e !== X && e !== Y);

    let xy = independencia_condicional(X, Y, []);

    if(xy)
        return [];


    for(let i = 1; i < sub_conjunto.length; i++){
        let possivel_separador = combinacoes( sub_conjunto, i );

        for(let z of possivel_separador){
            let xyz = independencia_condicional(X, Y, z);
            if(xyz)
                return z;
        }
    }

    return null;
}

let r1: Relacoes = {
    "A": { dependencia: null },
    "B": { dependencia: ["A"] },
    "C": { dependencia: ["A"] },
}

let r2: Relacoes = {
    "A": { dependencia: null },
    "B": { dependencia: null },
    "C": { dependencia: ["A", "B"] },
}

let r3: Relacoes = {
    "A": { dependencia: null },
    "B": { dependencia: ["A"] },
    "C": { dependencia: ["B"] },
}

let r4: Relacoes = {
    "A": { dependencia: null },
    "B": { dependencia: null },
    "C": { dependencia: null },
    "D": { dependencia: ["A", "B"] },
    "E": { dependencia: ["B", "C"] },
    "F": { dependencia: ["A"] },
    "G": { dependencia: ["D", "E"] },
    "H": { dependencia: ["C"] },
}

let relacoes = [r1, r2, r3, r4];

//descrever_relacoes(relacoes);