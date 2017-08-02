import { Publishers, BufferedSubscriber, UnbufferedSubscriber } from './stream'

function range(min: number, max?: number): Array<number> {
  if (max == null) {
    max = min
    min = 0
  }
  return Array.from(new Array(max - min).keys(), (n) => n + min)
}

// let pub = Publishers.fromArray(range(10))
let pub = (() => {
  let n = 0
  return Publishers.fromIterator({
    next: () => {
      return {
        value: n++,
        done: false
      }
    }
  })
})()

class EchoSubscriber extends BufferedSubscriber<number> {
  constructor() { super(5) }
  // class EchoSubscriber extends UnbufferedSubscriber<number> {
  //   constructor() { super() }

  process(n: number): Promise<void> {
    // console.log(`[${+new Date}] received: ${n}`)
    // return Promise.resolve(undefined)
    return new Promise(resolve => {
      setTimeout(() => resolve(console.log(`[${+new Date}] received: ${n}`)), Math.random() * 500 + 100)
    })
  }

  afterComplete() {
    console.log("done!")
  }
}

let sub = new EchoSubscriber

// pub.subscribe(buf)
// buf.subscribe(sub)
pub.subscribe(sub)
