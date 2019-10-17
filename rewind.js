const S = 4
const W = 180
const T = 40

const uncertaintyThreshold = 100

const colorsKey = {
  FgRed: '\x1b[31m',
  FgGreen: '\x1b[32m',
  FgYellow: '\x1b[33m',
  FgBlue: '\x1b[34m',
  FgMagenta: '\x1b[35m',
  FgCyan: '\x1b[36m',
  FgWhite: '\x1b[37m'
}

const colors = [
  'FgRed',
  'FgGreen',
  'FgBlue',
  'FgMagenta',
  'FgWhite',
  'FgCyan',
  'FgYellow'
]

function run () {
  // generate a set of rules
  let rules = generateRules(S)
  let start = generateInitialState(S, W)
  let story = generateStory(rules, start, T)
  rules.forEach(l => {
    l.forEach(r => {
      r.forEach(m => {
        process.stdout.write(colorsKey[colors[m]] + '\u2589 ')
      })
      process.stdout.write('\t')
    })
    process.stdout.write('\n')
  })
  process.stdout.write('\n')
  printStory(story, rules)
}

function generateRules (s) {
  let rules = []
  for (let sLeft = 0; sLeft < s; sLeft++) {
    rules.push([])
    for (let sRight = 0; sRight < s; sRight++) {
      rules[sLeft].push([])
      for (let sMiddle = 0; sMiddle < s; sMiddle++) {
        rules[sLeft][sRight].push(Math.floor(Math.random() * s))
      }
    }
  }
  return rules
}

function generateInitialState (s, w) {
  let initialState = []
  for (let wCurrent = 0; wCurrent < w; wCurrent++) {
    initialState.push(Math.floor(Math.random() * s))
  }
  return initialState
}

function generateStory (rules, previous, t, sequence = []) {
  sequence.push(previous)
  if (sequence.length === t) {
    return sequence
  }
  let current = []
  for (let e = 0; e < previous.length; e++) {
    let left = previous[(e - 1 + previous.length) % previous.length]
    let middle = previous[e]
    let right = previous[(e + 1) % previous.length]
    current.push(rules[left][right][middle])
  }
  return generateStory(rules, current, t, sequence)
}

function getReverseRules (rules) {
  const buckets = []
  for (let s = 0; s < S; s++) {
    buckets[s] = []
  }
  rules.forEach((left, l) => {
    left.forEach((right, r) => {
      right.forEach((child, m) => {
        buckets[child].push([l, r, m])
      })
    })
  })
  return buckets
}

function getTheory (ruleSets, hypothesis = [], state) {
  state = state || { found: 0 }
  if (state.found >= uncertaintyThreshold) {
    return []
  }
  let theories = []
  if (hypothesis.length === 0) {
    const firstRuleset = ruleSets[0]
    firstRuleset.forEach(firstRule => {
      let newHypothesis = []
      newHypothesis.push(firstRule)
      let newTheories = getTheory(ruleSets, newHypothesis, state)
      theories = theories.concat(newTheories)
    })
    return theories.slice(0)
  }
  if (hypothesis.length === ruleSets.length) {
    theories.push(hypothesis)
    state.found++
    return theories.slice(0)
  }
  const currentRule = hypothesis[hypothesis.length - 1]
  const nextRuleset = ruleSets[hypothesis.length % ruleSets.length]
  nextRuleset.forEach(nextRule => {
    let newHypothesis = hypothesis.slice(0)
    if ((currentRule[2] === nextRule[0]) && (currentRule[1] === nextRule[2])) {
      newHypothesis.push(nextRule)
      let newTheories = getTheory(ruleSets, newHypothesis, state)
      theories = theories.concat(newTheories)
    }
  })
  const copy = theories.slice(0)
  return copy
}

function printStory (story, rules) {
  for (let r = 0; r < story.length; r++) {
    for (let c = 0; c < story[r].length; c++) {
      const cell = story[r][c]
      process.stdout.write(colorsKey[colors[cell]] + '\u2589')
    }
    const reverseRules = getReverseRules(rules)
    const rulesets = story[r].map(c => {
      return reverseRules[c]
    })
    const theories = getTheory(rulesets)
    let numTheories = theories.length
    numTheories = (numTheories === uncertaintyThreshold) ? `${uncertaintyThreshold}+` : numTheories
    process.stdout.write(`${colorsKey['FgWhite']} ${numTheories}\n`)
  }
}

run()
