import { Publisher, Subscriber, Subscription } from './brook'
import { RingBuf } from './ringbuf'

namespace Util {
  export const nextId: () => number =
    (() => {
      var x = 0
      return () => { return x++ }
    })()
}

class MagicSubscription<T> implements Subscription {
  _id = Util.nextId()
  _active = true

  get id() { return this._id }
  constructor(private _pub: BasePublisher<T>, private _sub: Subscriber<T>) { }
  get pub() { return this._pub }
  get sub() { return this._sub }

  request(n: number) {
    if (!this._active) return
    let p: Promise<T> | null = null
    for (let i = 0; i < n && this.pub.hasNext(); i++) {
      p = this.pub.nextElem()
        .catch(err => this.sub.onError(err))
        .then(e => {
          console.log(`sending element ${e}`)
          return this.sub.onNext(e)
        })
    }
    if (this.pub.isExhausted) {
      this.cancel()
      if (p != null)
        p.then(_ => this.sub.onComplete())
      else
        this.sub.onComplete()
    }
  }

  cancel() {
    this._active = false
    this.pub.unsub(this)
  }
}

abstract class BasePublisher<T> implements Publisher<T> {
  _subs: { [key: number]: MagicSubscription<T> } = {}

  abstract get isExhausted(): boolean

  abstract hasNext(): boolean
  abstract nextElem(): Promise<T>

  subscribe(sub: Subscriber<T>) {
    let subscription = new MagicSubscription(this, sub)
    this._subs[subscription.id] = subscription
    sub.onSubscribe(subscription)
  }

  unsub(sub: MagicSubscription<T>) {
    delete this._subs[sub.id]
  }
}

class ArrayPublisher<T> extends BasePublisher<T> {
  _i = 0

  constructor(private _ary: Array<T>) { super() }

  get isExhausted(): boolean { return !this.hasNext() }

  hasNext(): boolean {
    return this._i < this._ary.length
  }

  nextElem(): Promise<T> {
    if (this.hasNext())
      return Promise.resolve(this._ary[this._i++])
    else
      throw "No more elements"
  }
}

class IteratorPublisher<T> extends BasePublisher<T> {
  _cur: IteratorResult<T>
  constructor(private _iter: Iterator<T>) {
    super()
    this._cur = _iter.next()
  }

  get isExhausted(): boolean { return !this.hasNext() }

  hasNext(): boolean {
    return !this._cur.done
  }

  nextElem(): Promise<T> {
    if (this.hasNext()) {
      let cur = this._cur.value
      this._cur = this._iter.next()
      return Promise.resolve(cur)
    }
    throw "No more elements"
  }
}

abstract class BaseSubscriber<T> implements Subscriber<T> {
  protected _sub: Subscription | null

  onSubscribe(sub: Subscription) {
    this._sub = sub
    this._requestElems()
  }

  protected abstract _requestElems()

  abstract onNext(t: T)

  onError(err: any) {
    console.error(`ERROR: ${err}`)
  }

  onComplete() {
    this._sub = null
  }

  abstract process(t: T): Promise<void>

  afterComplete() { }
}

export abstract class BufferedSubscriber<T> extends BaseSubscriber<T> {
  private _count: number = 0
  private _processing: Promise<void> = Promise.resolve(undefined)

  constructor(private _cap: number) { super() }

  get cap() { return this._cap }

  onNext(t: T) {
    this._count++
    this._processing = this._processing
      .then(_ => this.process(t))
      .then(_ => {
        if (--this._count == 0) {
          if (this._sub != null) {
            this._requestElems()
          } else {
            this.afterComplete()
          }
        }
      })
  }

  protected _requestElems() {
    this._sub!.request(this.cap)
  }
}

export abstract class UnbufferedSubscriber<T> extends BaseSubscriber<T> {
  onNext(t: T) {
    this.process(t).then(_ => {
      if (this._sub != null)
        this._requestElems()
      else
        this.afterComplete()
    })
  }

  protected _requestElems() {
    this._sub!.request(1)
  }
}

export namespace Publishers {
  export function fromArray<T>(ary: Array<T>): Publisher<T> {
    return new ArrayPublisher(ary)
  }

  export function fromIterator<T>(iter: Iterator<T>): Publisher<T> {
    return new IteratorPublisher(iter)
  }
}
