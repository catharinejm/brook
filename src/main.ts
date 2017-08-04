import { BufferedSubscriber, UnbufferedSubscriber } from './subscribers'
import * as Publishers from './publishers'
import { range } from './util'

// let pub = Publishers.fromArray(range(10))
let pub = Publishers.fromIterator((function* () {
  let x = 0
  for (; ;) {
    if (x < 20) {
      yield x++
    } else {
      throw "oh sniz"
    }
  }
})())

class EchoSubscriber<T> extends BufferedSubscriber<T> {
  constructor(private _name: string) { super(5) }

  get name(): string { return this._name }

  process(n: T): Promise<void> {
    return new Promise(resolve => {
      setTimeout(() => resolve(console.log(`[${+new Date}] (${this.name}) received: ${n}`)), Math.random() * 500 + 100)
    })
  }

  afterComplete() {
    console.log(`(${this.name}) done!`)
  }

  onError(err: any) {
    console.error(`ERROR (${this.name}): ${err}`)
  }
}

// let pub = Publishers.fromUDPSocket(12345)
let sub = new EchoSubscriber<number>("Bob")
let sub2 = new EchoSubscriber<number>("Fred")
let sub3 = new EchoSubscriber<number>("Sally")

// pub.subscribe(buf)
// buf.subscribe(sub)
pub.subscribe(sub)
pub.subscribe(sub2)
pub.subscribe(sub3)
