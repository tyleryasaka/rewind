const S = 3
const W = 4
const T = 50

function run () {
  // generate a set of rules
  let rules = generateRules(S)
  let start = generateInitialState(S, W)
  let story = generateStory(rules, start, T)
  // console.log(rules)
  // console.log(start)
  console.log(story)
}

function generateRules (s) {
  let rules = []
  for (let sLeft = 0; sLeft < s; sLeft++) {
    rules.push([])
    for (let sRight = 0; sRight < s; sRight++) {
      rules[sLeft].push(Math.floor(Math.random() * s))
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
    let right = previous[(e + 1) % previous.length]
    current.push(rules[left][right])
  }
  return generateStory(rules, current, t, sequence)
}

run()
