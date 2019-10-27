const { Graph, json, alg } = require('@dagrejs/graphlib')
const sha256 = require('js-sha256')
const _ = require('lodash')

// unique "identifier" for a sequence of states and spaces
// This is needed (rather than just serializing the data) because
// the data is really a ring rather than a string.
// So order matters, but where you "cut" the ring as the start/end points
// should not affect the hash.
// Thus needs to be a sum of hashes of all relationships between adjacent cells
// (including relationship between last and first, adjacent by wrapping)
function tokenHash (states, spaces) {
  return states.reduce((acc, state1, s) => {
    const space = spaces[s]
    const state2 = states[(s + 1) % states.length]
    const relation = `${state1}-${space}-${state2}`
    const asArr = sha256.digest(relation)
    const asInt = asArr.reduce((subTotal, item) => {
      return subTotal + Math.pow(item, 3)
    }, 0)
    return acc + asInt
  }, 0)
}

function asRelation (a, b, distance, rowLength) {
  let normalizedA, normalizedB, normalizedDiff
  if (a < b) {
    normalizedA = a
    normalizedB = b
    normalizedDiff = distance
  } else {
    normalizedA = b
    normalizedB = a
    normalizedDiff = rowLength - distance
  }
  return `${normalizedA}-${normalizedB}:${normalizedDiff}`
}

function buildRelationGraph (row, fullRowLength, index = 0, graph = new Graph({ directed: false })) {
  if (row.length === 1) {
    return graph
  }
  const head = row[0]
  const tail = _.slice(row, 1)
  tail.forEach((tailItem, tailIndex) => {
    const relation = asRelation(head, tailItem, tailIndex + 1, fullRowLength)
    graph.setEdge(index, index + tailIndex + 1, relation)
  })
  return buildRelationGraph(tail, fullRowLength, index + 1, graph)
}

function duplicateRelations (relationsGraph, duplicates = {}, remainingNodes = []) {
  const relations = relationsGraph.edges().map(e => relationsGraph.edge(e))
  const counts = _.countBy(relations)
  const duplicatesObj = _.pickBy(counts, count => count > 1)
  return _.keys(duplicatesObj)
}

function removeNonDuplicateRelations (relationGraph) {
  const duplicates = duplicateRelations(relationGraph)
  relationGraph.edges().forEach(e => {
    const edge = relationGraph.edge(e)
    if (!_.includes(duplicates, edge)) {
      relationGraph.removeEdge(e.v, e.w)
    }
  })
}

function getSubGraph (graph, nodes) {
  const subGraph = json.read(json.write(graph))
  graph.nodes().forEach(node => {
    if (!_.includes(nodes, node)) {
      subGraph.removeNode(node)
    }
  })
  return subGraph
}

function asToken (cells, row) {
  const orderedCells = _.sortBy(cells, Number)
  const spaces = orderedCells.map((cell1, c) => {
    const cell2 = orderedCells[(c + 1) % orderedCells.length]
    return (cell2 - cell1 + row.length) % row.length
  }).filter(c => c)
  const states = orderedCells.map(c => row[c])
  return { cells: orderedCells, states, spaces, hash: tokenHash(states, spaces) }
}

function isConnected (graph, nodes) {
  const subGraph = getSubGraph(graph, nodes)
  return alg.components(subGraph).length === 1
}

function nChooseK (arr, k) {
  if (k === 1) {
    return arr.map(item => [item])
  }
  if (arr.length < k) {
    throw new Error('nChooseK: array length must be >= k')
  }
  if (arr.length === k) {
    return [arr]
  }
  const val = _.range(1, arr.length - k + 2).reduce((acc, index) => {
    const slice = _.slice(arr, index)
    const item = arr[index - 1]
    const partialCombinations = nChooseK(slice, k - 1)
    const combinations = partialCombinations.map(pc => _.concat(pc, item))
    return _.concat(acc, combinations)
  }, [])
  return val
}

function combinations (arr) {
  return _.range(2, arr.length + 1).reduce((acc, k) => {
    const forK = nChooseK(arr, k)
    return _.concat(acc, forK)
  }, [])
}

function uniqueTokens (row) {
  const relationGraph = buildRelationGraph(row, row.length)
  removeNonDuplicateRelations(relationGraph)
  const components = alg.components(relationGraph)
  const tokens = components.reduce((acc, component) => {
    const comb = combinations(component)
    return _.concat(acc, comb)
  }, []).filter(c => isConnected(relationGraph, c)).map(c => {
    return asToken(c, row)
  })
  const counts = _.countBy(tokens, ({ hash }) => hash)
  const duplicatedTokens = tokens.filter(token => {
    return counts[token.hash] > 1
  })
  const unique = _.groupBy(duplicatedTokens, token => token.hash)
  // "intersections" are instances of a token that share one or more cells
  // for token to be useful, instances have to cover mutually exclusive cells
  const withIntersectionsRemoved = _.mapValues(unique, token => {
    const nonintersectionGraph = buildNonintersectionGraph(token)
    const components = alg.components(nonintersectionGraph)
    // The largest component(s) is the largest mutually exclusive set of token instances.
    // Presumably, this maximizes the usefulness of the token
    // However, there is an element of non-determinism here in the case that there is a tie
    // And less "useful" tokens that we exclude here could theoretically still be more useful
    // in relation to the other tokens that are available.
    // But this should be good enough.
    const maximalComponent = _.maxBy(components, component => component.length)
    // return the token with only the instances in the maximal component
    return token.filter((instance, index) => {
      return maximalComponent.includes(String(index))
    })
  })
  const withMultipleInstances = _.pickBy(withIntersectionsRemoved, token => token.length > 1)
  return withMultipleInstances
  // For efficiency, further filter by tokens which do not cover the exact same cells with the same number of instances
  // Such tokens have equivalent usefulness in reducing entropy
  const tokenEquivalenceGraph = buildTokenEquivalenceGraph(withMultipleInstances)
  const equivalenceGroups = alg.components(tokenEquivalenceGraph)
  return _.pick(withMultipleInstances, equivalenceGroups.map(group => {
    // Just need token per group of equivalent tokens. Doesn't matter which.
    return group[0]
  }))
}

function buildNonintersectionGraph (token, index = 0, graph = new Graph({ directed: false })) {
  if (index === 0) {
    // initialize with nodes
    token.forEach((instance, index) => {
      graph.setNode(index)
    })
  }
  if (token.length === 1) {
    return graph
  }
  const head = token[0]
  const tail = _.slice(token, 1)
  tail.forEach((tailItem, tailIndex) => {
    // do these two instances share cells?
    const isIntersection = _.intersection(head.cells, tailItem.cells).length !== 0
    if (!isIntersection) {
      graph.setEdge(index, index + tailIndex + 1)
    }
  })
  return buildNonintersectionGraph(tail, index + 1, graph)
}

// Links together tokens which have equivalent usefulness (cover same cells and same number of instances)
function buildTokenEquivalenceGraph (tokens, index = 0, graph = new Graph({ directed: false })) {
  const tokenKeys = _.keys(tokens)
  if (tokenKeys.length === 0) {
    throw new Error('asdf')
  }
  if (index === 0) {
    // initialize with nodes
    tokenKeys.forEach((tokenKey) => {
      graph.setNode(tokenKey)
    })
  }
  if (tokenKeys.length === 1) {
    return graph
  }
  const head = tokenKeys[0]
  const tail = _.slice(tokenKeys, 1)
  tail.forEach((tailItem, tailIndex) => {
    // do these two instances share cells?
    const headCells = _.uniq(cellsForToken(tokens[head]))
    const tailCells = _.uniq(cellsForToken(tokens[tailItem]))
    const isEquivalent = (tokens[head].length === tokens[tailItem].length) && (_.xor(headCells, tailCells) === 0)
    if (isEquivalent) {
      graph.setEdge(head, tailItem)
    }
  })
  return buildTokenEquivalenceGraph(_.pick(tokens, tail), index + 1, graph)
}

// "Dynamic" because the graph is not built in advance, to save potentially unnecessary computation
// Instead, the functions will build the graph as the algorithm progresses,
// and we won't waste time building out remote branches with no chance of being a shortest path
// If we built the graph in advance, we could use the graph library included in this file.
function dynamicDijkstra (node, isDestination, getNeighbors, getWeight, path = [], currentDistance = 0, shortCircuit = {}) {
  const newDistance = currentDistance + getWeight(node)
  const newPath = _.concat(path, {
    node,
    distance: newDistance
  })
  if (typeof shortCircuit.maxDistance !== 'undefined' && newDistance >= shortCircuit.maxDistance) {
    // Stop recursing if we know it's impossible to find a shorter path on this branch
    return { distnace: null, path: null }
  }
  if (isDestination(node)) {
    // We've arrived at our destination. Short circuit any paths that reach this distance.
    shortCircuit.maxDistance = shortCircuit.maxDistance ? _.max(shortCircuit.maxDistance, newDistance) : newDistance
    return { distance: newDistance, path: newPath }
  }
  const neighbors = getNeighbors(node)
  if (neighbors.length === 0) {
    // can't proceed if there are no neighbors
    return { distnace: null, path: null }
  }
  const withDistances = neighbors.map(neighbor => {
    const { distance, path } = dynamicDijkstra(neighbor, isDestination, getNeighbors, getWeight, newPath, newDistance, shortCircuit)
    return { neighbor, distance, path }
  })
  const excludeNull = withDistances.filter(({ distance }) => distance !== null)
  if (excludeNull.length === 0) {
    return { distance: null, path: null }
  }
  const min = _.minBy(excludeNull, ({ distance }) => distance)
  return {
    distance: min ? min.distance : null,
    path: min ? min.path : null
  }
}

function shannonEntropy (numCells, numStates) {
  const probability = 1 / numStates
  return -1 * numCells * (probability * Math.log2(probability))
}

function cellsForToken (token) {
  let cells = []
  token.forEach(tokenInstance => {
    cells = _.concat(cells, tokenInstance.cells)
  })
  return _.uniq(cells)
}

function getEntropy (row, numStates) {
  const unique = uniqueTokens(row)
  const allTokens = _.mapValues(unique, token => {
    return {
      instances: token,
      entropy: shannonEntropy(token[0].cells.length, numStates)
    }
  })
  const isDestination = (node) => {
    return node.takenCells.length === row.length
  }
  const getNeighbors = (node) => {
    let remainingTokens
    if (!node.currentToken) {
      // initial node - start with all tokens
      remainingTokens = allTokens
    } else {
      // identify the tokens which have cells which are not claimed by existing "nodes" in our "path"
      const remainingTokenKeys = _.keys(allTokens).filter(tokenKey => {
        const { instances } = allTokens[tokenKey]
        return _.intersection(cellsForToken(instances), node.takenCells).length === 0
      })
      remainingTokens = _.pick(allTokens, remainingTokenKeys)
    }
    // return an array of formatted "nodes", corresponding to the tokens identified as plausible next steps in a shortest path
    if (_.keys(remainingTokens).length !== 0) {
      return _.keys(remainingTokens).map(tokenKey => {
        const token = remainingTokens[tokenKey]
        return {
          takenCells: _.concat(node.takenCells, cellsForToken(token.instances)),
          currentToken: token
        }
      })
    } else {
      const remainingCells = _.difference(row.map((state, cell) => String(cell)), node.takenCells)
      return [{
        takenCells: _.concat(node.takenCells, remainingCells),
        currentToken: {
          instances: [{
            cells: remainingCells
          }],
          entropy: shannonEntropy(remainingCells.length, numStates)
        }
      }]
    }
  }
  const getWeight = (node) => {
    if (!node.currentToken) {
      // initial state
      return 0
    }
    return node.currentToken.entropy
  }
  return dynamicDijkstra({ takenCells: [], currentToken: null }, isDestination, getNeighbors, getWeight)
}

module.exports = {
  shannonEntropy,
  combinations,
  getEntropy
}
