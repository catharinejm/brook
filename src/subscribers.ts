import { Publisher, Subscriber, Subscription } from './brook'
import * as Util from './util'

export abstract class BaseSubscriber<T> implements Subscriber<T> {
  protected _sub: Subscription | null

  onSubscribe(sub: Subscription) {
    this._sub = sub
    this._requestElems()
  }

  get isSubscribed(): boolean { return this._sub != null }

  protected abstract _requestElems()

  abstract onNext(t: T)

  abstract onError(err: any)

  onComplete() {
    this._sub = null
  }

  abstract process(t: T): Promise<void>

  afterComplete() { }
}

export abstract class BufferedSubscriber<T> extends BaseSubscriber<T> {
  private _remaining: number
  private _processing: Promise<void> = Promise.resolve(undefined)

  constructor(private _cap: number) {
    super()
    this._remaining = _cap
  }

  get cap() { return this._cap }

  onNext(t: T) {
    this._processing = this._processing
      .then(_ => this.process(t))
      .then(_ => {
        if (--this._remaining == 0 && this.isSubscribed) {
          this._requestElems()
        }
      })
  }

  onComplete() {
    super.onComplete()
    this._processing.then(_ => this.afterComplete())
  }

  protected _requestElems() {
    this._remaining = this.cap
    this._sub!.request(this.cap)
  }
}

export abstract class UnbufferedSubscriber<T> extends BaseSubscriber<T> {
  onNext(t: T) {
    this.process(t).then(_ => {
      if (this.isSubscribed)
        this._requestElems()
    })
  }

  protected _requestElems() {
    this._sub!.request(1)
  }

  onComplete() {
    super.onComplete()
    this.afterComplete()
  }
}
