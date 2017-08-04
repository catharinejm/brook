import { Publisher, Subscriber, Subscription } from './brook'
import * as Util from './util'

export abstract class BaseSubscriber<T> implements Subscriber<T> {
  protected _sub: Subscription | null

  onSubscribe(sub: Subscription) {
    this._sub = sub
    this._requestElems()
  }

  protected abstract _requestElems()

  abstract onNext(t: T)

  abstract onError(err: any)

  onComplete() {
    this._sub = null
    this.afterComplete()
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
        if (--this._count == 0 && this._sub != null) {
          this._requestElems()
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
    })
  }

  protected _requestElems() {
    this._sub!.request(1)
  }
}
