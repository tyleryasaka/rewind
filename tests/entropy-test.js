const {
  entropy,
  Relation,
  isRelationEquivalent
} = require('../entropy')

const row = [1, 2, 1, 4, 1, 2]
// const row = [1, 2, 4, 4, 1, 2, 4]
entropy(row)

const relation1 = new Relation(5, 4, 1, 5)
const relation2 = new Relation(4, 5, 4, 5)
// console.log(relation1.id, relation2.id)
// console.log(isRelationEquivalent(relation1, relation2))
