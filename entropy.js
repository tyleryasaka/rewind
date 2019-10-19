const { Graph, json, alg } = require("@dagrejs/graphlib")

function count (counter, index, init = 1) {
  counter[index] = counter[index] ? counter[index] + 1 : init
}

function collect (cabinet, index, item) {
  cabinet[index] = cabinet[index] || []
  if (!cabinet[index].includes(item)) {
    cabinet[index].push(item)
  }
}

function Relation (a, b, distance, rowLength) {
  if (a < b) {
    this.a = a
    this.b = b
    this.distance = distance
  } else {
    this.a = b
    this.b = a
    this.distance = rowLength - distance
  }
  this.id = `${this.a}-${this.b}:${this.distance}`
}

function isRelationEquivalent (relation1, relation2) {
  return relation1.id === relation2.id
}

function allRelations (row, fullRowLength, index = 0, { relations = [], byPosition = {} } = {}) {
  if (row.length === 1) {
    return { relations, byPosition }
  }
  const head = row[0]
  const tail = row.slice(1)
  tail.forEach((tailItem, tailIndex) => {
    const relation = new Relation(head, tailItem, tailIndex + 1, fullRowLength)
    relations.push(relation)
    collect(byPosition, String(index), relation.id)
    collect(byPosition, String(index + tailIndex + 1), relation.id)
  })
  return allRelations(tail, fullRowLength, index + 1, { relations, byPosition })
}

function duplicateRelations (relations, duplicates = {}) {
  if (relations.length === 0) {
    return duplicates
  }
  const head = relations[0]
  const tail = relations.slice(1)
  tail.forEach(tailItem => {
    if (isRelationEquivalent(head, tailItem)) {
      count(duplicates, head.id, 2)
    }
  })
  return duplicateRelations(tail, duplicates)
}

function allTokens (row) {
  const { relations, byPosition } = allRelations(row, row.length)
  const duplicates = duplicateRelations(relations)
  const duplicatesGraph = new Graph({ directed: true })
  Object.keys(duplicates).forEach(relation => {
    row.forEach((cellState, cellPosition) => {
      if (byPosition[cellPosition].includes(relation)) {
        duplicatesGraph.setEdge(`cell:${cellPosition}`, `rel:${relation}`)
      }
    })
  })
  console.log(alg.tarjan(duplicatesGraph))
}

function allRecursions (row) {

}

function allTokenRecursions (row) {

}

function entropy (row) {
  return allTokens(row)
}

module.exports = {
  entropy,
  isRelationEquivalent,
  Relation
}
