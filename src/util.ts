const _idGen = (function* () {
  var x = 0
  for (; ;) { yield x++ }
})()

export function nextId(): number {
  return _idGen.next().value
}

export function range(min: number, max?: number): Array<number> {
  if (max == null) {
    max = min
    min = 0
  }
  return Array.from(new Array(max - min).keys(), (n) => n + min)
}

export function undef<T>(): T { throw "undefined!" }
