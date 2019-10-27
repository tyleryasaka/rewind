const {
  getEntropy,
  combinations,
  shannonEntropy
} = require('../entropy')

// const row = ['a', 'b', 'a', 'b', 'a', 'b', 'a', 'b']
const row = ['c', 'd', 'd', 'c', 'b', 'd', 'a', 'a', 'a', 'c']

const result = getEntropy(row, 4)
console.log('entropy', result.distance, result.path.map(p => JSON.stringify(p)))

// console.log('shannon entropy', shannonEntropy(20, 10))

// const comb = combinations([1,2,3,4,5])
// console.log('comb', comb)

// console.log(relation1.id, relation2.id)
// console.log(isRelationEquivalent(relation1, relation2))
