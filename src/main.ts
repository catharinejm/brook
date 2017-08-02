import { Publishers, BufferedSubscriber } from './stream'

function range(min: number, max?: number): Array<number> {
  if (max == null) {
    max = min
    min = 0
  }
  return Array.from(new Array(max - min).keys(), (n) => n + min)
}

let pub = Publishers.fromArray(range(10))
// let buf = new BufProcessor(5, 10)

class EchoSubscriber extends BufferedSubscriber<number> {
  constructor() { super(5) }

  process(n: number) {
    console.log(`[${+new Date}] received: ${n}`)
  }

  afterComplete() {
    console.log("done!")
  }
}

let sub = new EchoSubscriber

// pub.subscribe(buf)
// buf.subscribe(sub)
pub.subscribe(sub)
