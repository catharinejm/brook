import { nextTick } from 'process'

export interface Publisher<T> {
  subscribe(sub: Subscriber<T>)
}

export interface Subscriber<T> {
  onSubscribe(s: Subscription)
  onNext(t: T)
  onError(err: any)
  onComplete()
}

export interface Subscription {
  request(n: number)
  cancel()
}

export type Processor<T, R> = Subscriber<T> & Publisher<R>

class ArrayPublisher<T> implements Publisher<T> {
  _sub: Subscription | null
  _isDone = false

  constructor(private _ary: Array<T>) { }

  subscribe(sub: Subscriber<T>) {
    this._sub = {
      request: (n: number) => {
        for (var i = 0; i < n && this._ary.length > 0; i++) {
          nextTick(sub.onNext, this._ary.shift())
        }
        if (!this._isDone && this._ary.length === 0) {
          nextTick(sub.onComplete)
          this._isDone = true
        }
      },
      cancel: () => { }
    }
    sub.onSubscribe(this._sub)
  }
}

class RingBuf<T> {
  _ary: Array<T | void>;
  _top: number = 0
  _bot: number = 0
  constructor(private _cap: number) {
    this._ary = new Array(_cap + 1)
  }

  isEmpty(): boolean {
    return this._top === this._bot
  }

  isFull(): boolean {
    return (this._top + 1) % this._ary.length === this._bot
  }

  size(): number {
    return Math.abs((this._top + this._ary.length) - this._bot) % this._ary.length
  }

  cap(): number {
    return this._cap
  }

  push(t: T) {
    if (!this.isFull()) {
      this._ary[this._top] = t
      this._top = (this._top + 1) % this._ary.length
    } else
      throw "Attempt to push to full buffer!"
  }

  pop(): T {
    if (!this.isEmpty()) {
      let ret = this._ary[this._bot]!
      this._ary[this._bot] = undefined
      this._bot = (this._bot + 1) % this._ary.length
      return ret
    } else
      throw "Attempt to pop empty buffer!"
  }
}

class BufProcessor<T> implements Processor<T, T> {
  _buf: RingBuf<T>;
  _downstream: Subscriber<T> | null
  _upstream: Subscription | null
  _toSend: number = 0
  _timer: NodeJS.Timer | null = null
  _upstreamComplete = false
  _downstreamComplete = false
  constructor(private _cap: number, private _timeout: number) {
    this._buf = new RingBuf(_cap)
  }

  subscribe(sub: Subscriber<T>) {
    this._downstream = sub
    let subscription = {
      request: (n: number) => {
        this._toSend = n
        if (this._upstreamComplete) {
          this._sendData()
          if (this._buf.isEmpty() && !this._downstreamComplete) {
            this._downstreamComplete = true
            nextTick(sub.onComplete)
          }
        }
      },
      cancel: () => { if (this._upstream != null) this._upstream.cancel() },
    }
    sub.onSubscribe(subscription)
    this._setTimer()
  }

  _clearTimer() {
    if (this._timer != null)
      clearTimeout(this._timer)
  }

  _setTimer() {
    this._timer = setTimeout(() => this._sendAndSet(), this._timeout)
  }

  _sendAndSet() {
    this._sendData()
    this._setTimer()
  }

  _sendData() {
    if (this._downstream != null) {
      for (; this._toSend > 0 && !this._buf.isEmpty(); this._toSend--)
        nextTick(this._downstream.onNext, this._buf.pop())
      if (this._buf.isEmpty() && this._upstream != null)
        nextTick(this._upstream.request, this._cap)
    }
  }

  public onSubscribe = (s: Subscription) => {
    this._upstream = s
    this._upstream.request(this._cap)
  }

  public onNext = (t: T) => {
    this._buf.push(t)
    if (this._buf.isFull()) {
      this._clearTimer()
      this._sendAndSet()
    }
  }

  public onComplete = () => {
    this._clearTimer()
    this._upstreamComplete = true
  }

  public onError = (err: any) => {
    if (this._downstream != null)
      this._downstream.onError(err)
  }
}


class EchoSubscriber<T> implements Subscriber<T> {
  _sub: Subscription | null

  public onSubscribe = (s: Subscription) => {
    this._sub = s
    this._sub.request(1)
  }

  public onNext = (t: T) => {
    console.log(`[${+new Date}] received: ${t}`)
    if (this._sub != null)
      this._sub.request(1)
  }

  public onError = (err: any) => {
    console.error(`ERROR: ${err}`)
  }

  public onComplete = () => {
    console.log("done!")
    this._sub = null
  }
}

function range(min: number, max?: number): Array<number> {
  if (max == null) {
    max = min
    min = 0
  }
  return Array.from(new Array(max - min).keys(), (n) => n + min)
}

let pub = new ArrayPublisher(range(10))
let buf = new BufProcessor(5, 10)
let sub = new EchoSubscriber()

pub.subscribe(buf)
buf.subscribe(sub)
