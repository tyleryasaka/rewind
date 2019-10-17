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
  this.id = `${this.a}-${this.b}-${this.distance}`
}

function isRelationEquivalent (relation1, relation2) {
  return relation1.id === relation2.id
}

function allRelations (row, fullRowLength, relations = []) {
  if (row.length === 0) {
    return relations
  }
  const head = row[0]
  const tail = row.slice(1)
  tail.forEach((tailItem, tailIndex) => {
    relations.push(new Relation(head, tailItem, tailIndex + 1, fullRowLength))
  })
  return allRelations(tail, fullRowLength, relations)
}

function duplicateRelations (relations, duplicates = {}) {
  if (relations.length === 0) {
    return duplicates
  }
  const head = relations[0]
  const tail = relations.slice(1)
  tail.forEach(tailItem => {
    if (isRelationEquivalent(head, tailItem)) {
      duplicates[head.id] = duplicates[head.id] ? duplicates[head.id] + 1 : 2
    }
  })
  return duplicateRelations(tail, duplicates)
}

function allTokens (row) {
  const relations = allRelations(row, row.length)
  // relations.forEach(r => {
  //   console.log(r.id)
  // })
  const duplicates = duplicateRelations(relations)
  console.log(duplicates)
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
