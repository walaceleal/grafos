let nodeCounter = 1;

function configurar_grafo() {
    return cytoscape({
        container: document.getElementById('cy'),

        elements: [],

        style: [

            {
                selector: 'node',
                style: {
                    'background-color': '#3498db',
                    'text-wrap': 'wrap',

                    'label': 'data(label)',

                    'color': '#ffffff',

                    'text-valign': 'center',

                    'text-halign': 'center',

                    'font-size': '14px',

                    'width': 100,

                    'height': 100,

                    'border-width': 2,

                    'border-color': '#2980b9'
                }
            },

            {
                selector: 'node:selected',

                style: {
                    'background-color': '#e74c3c',

                    'border-color': '#c0392b',

                    'border-width': 4
                }
            },

            {
                selector: 'edge',

                style: {
                    'width': 2,
                    'text-wrap': 'wrap',
                    
                    'line-color': '#7f8c8d',

                    'target-arrow-color': '#7f8c8d',

                    'target-arrow-shape': 'triangle',

                    'curve-style': 'bezier',

                    'label': 'data(probability)',

                    'arrow-scale': 3,
                    'font-size': 12,

                    'color': '#333',

                    'text-background-color': '#ffffff',

                    'text-background-opacity': 1,

                    'text-background-padding': '3px'
                }
            },

            {
                selector: 'edge:selected',

                style: {
                    'width': 4,

                    'line-color': '#e74c3c',

                    'target-arrow-color': '#e74c3c',

                    'color': '#e74c3c'
                }
            }
        ],

        layout: {
            name: 'preset'
        },

        boxSelectionEnabled: true,

        userZoomingEnabled: true,

        userPanningEnabled: true
    });
}

function generateNodeId(label) {

    nodeCounter++;

    return `state-${nodeCounter}`;
}


function generateEdgeId(source, target) {

    return `${source}-${target}`;
}

function createNode(label, position) {

    const id = generateNodeId(label);

    cy.add({
        group: 'nodes',

        data: {
            id: id,
            label: label
        },

        position: position
    });

    const no = cy.getElementById(id);
    no.data('label_original', label);

    return no;
}

function createEdge(source, target, label) {

    const id = generateEdgeId(
        source.id(),
        target.id()
    );


    const edge = cy.add({
        group: 'edges',

        data: {
            id: id,

            source: source.id(),
            target: target.id(),

            probability: label
        }
    });

    return edge;
}

window.createEdge = createEdge;
window.createNode = createNode;
window.configurar_grafo = configurar_grafo;
window.generateEdgeId = generateEdgeId;