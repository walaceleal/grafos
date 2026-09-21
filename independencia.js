const TORELANCIA_INDEPENDENCIA = 2;
const NUM_SIMULACOES = 3e5;
let arestas = [];
let d_separadores = {};
let estados = [];
function combinacoes(vetor, n, remover_repeticao = true) {
  if (n == 1) {
    return vetor.map((e) => [e]);
  }
  let sub = combinacoes(vetor, n - 1);
  let resposta = [];
  for (let sub_combinacao of sub) {
    for (let elemento of vetor) {
      const contem_repeticao = sub_combinacao.indexOf(elemento) !== -1;
      if (contem_repeticao && remover_repeticao) {
      } else {
        resposta.push([...sub_combinacao, elemento]);
      }
    }
  }
  return resposta;
}
function combinacoes_valores(estados2) {
  const valores_possiveis = [0, 1];
  let [primeiro_estado, ...demais_estados] = estados2;
  if (!primeiro_estado)
    return [[]];
  if (demais_estados.length == 0) {
    let resposta2 = [];
    for (let valor of valores_possiveis) {
      resposta2.push([{ estado: primeiro_estado, valor }]);
    }
    return resposta2;
  }
  let parciais_demais_estados = combinacoes_valores(demais_estados);
  let resposta = [];
  for (let valor of valores_possiveis) {
    for (let parcial of parciais_demais_estados) {
      resposta.push(
        [{ estado: primeiro_estado, valor }, ...parcial]
      );
    }
  }
  return resposta;
}
function independencia_condicional(X, Y, Z) {
  let valores_possiveis = [0, 1];
  let combinacoes_Z = combinacoes_valores(Z);
  for (let Vx of valores_possiveis) {
    for (let Cz of combinacoes_Z) {
      let pX_Z = probabilidade_condicional(X, Vx, [...Cz]);
      let txt_Z = Cz.map((e) => `${e.estado}=${e.valor}`).join(",");
      logProbabilidade(`P(${X}=${Vx}|${txt_Z}) = ${pX_Z.toFixed(2)}`);
      for (let Vy of valores_possiveis) {
        let pXY_Z = probabilidade_condicional(X, Vx, [{ estado: Y, valor: Vy }, ...Cz]);
        let diff = 100 * Math.abs(pXY_Z - pX_Z);
        logProbabilidade(`P(${X}=${Vx}|${Y}=${Vy}, ${txt_Z}) = ${pXY_Z.toFixed(2)}`);
        if (diff >= TORELANCIA_INDEPENDENCIA) {
          return false;
        }
      }
    }
  }
  return true;
}
function gerar_simulacao(relacoes2) {
  const estados2 = Object.keys(relacoes2);
  let ocorrencia = {};
  for (let estado of estados2) {
    let { dependencia } = relacoes2[estado];
    if (!dependencia) {
      ocorrencia[estado] = Math.random() > 0.5 ? 1 : 0;
    } else {
      let valores = dependencia.map((d) => {
        let valor = ocorrencia[d];
        if (valor === 1)
          return Math.random() < 0.8 ? 1 : 0;
        return Math.random() < 0.2 ? 1 : 0;
      });
      ocorrencia[estado] = valores.some((v) => v == 1) ? 1 : 0;
    }
  }
  return ocorrencia;
}
let distribuicao = [];
function gerar_distribuicao_conjunta(relacoes2) {
  estados = Object.keys(relacoes2);
  if (window.json_distribuicao) {
    distribuicao = window.json_distribuicao;
    return;
  }
  distribuicao = [];
  for (let i = 0; i < NUM_SIMULACOES; i++) {
    let ocorrencia = gerar_simulacao(relacoes2);
    let registro = distribuicao.find((d) => JSON.stringify(d.ocorrencia) === JSON.stringify(ocorrencia));
    if (registro) {
      registro.qnt += 1;
    } else {
      distribuicao.push({
        qnt: 1,
        ocorrencia
      });
    }
  }
}
;
function probabilidade_condicional(estado, valor, condicoes) {
  const conjunto_universo = condicoes ? distribuicao.filter((d) => condicoes.every((c) => d.ocorrencia[c.estado] == c.valor)) : distribuicao;
  const selecao = conjunto_universo.filter((d) => d.ocorrencia[estado] == valor);
  const tamanho_conjunto_universo = conjunto_universo.reduce((acc, curr) => acc += curr.qnt, 0);
  const tamanho_selecao = selecao.reduce((acc, curr) => acc += curr.qnt, 0);
  if (tamanho_conjunto_universo === 0) {
    let txt_cond = !condicoes ? "\u03A9" : condicoes.map((c) => `${c.estado}=${c.valor}`).join(",");
    return 0;
  }
  const probabilidade = tamanho_selecao / tamanho_conjunto_universo;
  let txt_condicoes = !condicoes ? "\u03A9" : condicoes.map((c) => `${c.estado}=${c.valor}`).join(",");
  return probabilidade;
}
let nos = {};
function desenhar_relacoes(estados2) {
  window.cy = configurar_grafo();
  for (let estado of estados2) {
    nos[estado] = createNode(estado, {
      x: Math.random() * 400,
      y: Math.random() * 400
    });
  }
}
function analisar_conjuntos_d_separacao() {
  arestas = [];
  d_separadores = {};
  $("#log").html("");
  const conexoes_possiveis = combinacoes(estados, 2);
  for (let conexao of conexoes_possiveis) {
    const [x, y] = conexao;
    let d_separador = conjunto_d_separacao(x, y, estados);
    log_d_separacao(x, y, d_separador);
    if (!d_separador) {
      const representacao_grafica = createEdge(nos[x], nos[y], "?");
      arestas.push({
        origem: x,
        destino: y,
        d_separador,
        representacao_grafica
      });
    } else {
      if (!d_separadores[x]) {
        d_separadores[x] = {};
      }
      d_separadores[x][y] = d_separador;
    }
  }
}
function analisar_orientacao() {
  for (let x of estados) {
    for (let y of estados) {
      if (x == y)
        continue;
      let sao_adjacentes = arestas.find((e) => e.origem == x && e.destino == y);
      if (sao_adjacentes)
        continue;
      let vizinhos_x = arestas.filter((e) => e.origem == x).map((e) => e.destino);
      let vizinhos_y = arestas.filter((e) => e.origem == y).map((e) => e.destino);
      let vizinhos_comuns = vizinhos_x.filter((ex) => vizinhos_y.find((ey) => ey == ex));
      if (vizinhos_comuns.length > 0) {
        for (let vizinho of vizinhos_comuns) {
          const separou_x_y = d_separadores[x][y].indexOf(vizinho) !== -1;
          if (separou_x_y) {
            console.log(`${vizinho} separou ${x} - ${y}`);
          } else {
            console.log(`${vizinho} N\xC3O separou ${x} - ${y}`, d_separadores[x][y], d_separadores[y][x]);
            let ax = arestas.findIndex((e) => e.origem == x && e.destino == vizinho);
            let ay = arestas.findIndex((e) => e.origem == y && e.destino == vizinho);
            cy.remove(`#${generateEdgeId(nos[vizinho].id(), nos[x].id())}`);
            cy.remove(`#${generateEdgeId(nos[vizinho].id(), nos[y].id())}`);
          }
        }
      }
    }
  }
}
function descrever_relacoes(relacoes2) {
  for (let i = 0; i < relacoes2.length; i++) {
    gerar_distribuicao_conjunta(relacoes2[i]);
    desenhar_relacoes(estados);
    analisar_conjuntos_d_separacao();
    analisar_orientacao();
  }
}
function conjunto_d_separacao(X, Y, conjunto) {
  const sub_conjunto = conjunto.filter((e) => e !== X && e !== Y);
  let xy = independencia_condicional(X, Y, []);
  if (xy)
    return [];
  for (let i = 0; i < sub_conjunto.length; i++) {
    let possivel_separador = combinacoes(sub_conjunto, i + 1);
    for (let z of possivel_separador) {
      let xyz = independencia_condicional(X, Y, z);
      if (xyz)
        return z;
    }
  }
  return null;
}
let r1 = {
  "A": { dependencia: null },
  "B": { dependencia: ["A"] },
  "C": { dependencia: ["A"] }
};
let r2 = {
  "A": { dependencia: null },
  "B": { dependencia: null },
  "C": { dependencia: ["A", "B"] }
};
let r3 = {
  "A": { dependencia: null },
  "B": { dependencia: ["A"] },
  "C": { dependencia: ["B"] }
};
let r4 = {
  "A": { dependencia: null },
  "B": { dependencia: null },
  "C": { dependencia: null },
  "D": { dependencia: ["A", "B"] },
  "E": { dependencia: ["B", "C"] },
  "F": { dependencia: ["A"] },
  "G": { dependencia: ["D", "E"] },
  "H": { dependencia: ["C"] }
};
let relacoes = [r1, r2, r3, r4];
