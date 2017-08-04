import { Subscriber, Subscription } from './brook'
import { BasePublisher } from './publishers'
import * as Util from './util'

export class MagicSubscription<T> implements Subscription {
  _id = Util.nextId()
  _active = true

  constructor(private _pub: BasePublisher<T>, private _sub: Subscriber<T>) { }

  get id() { return this._id }
  get pub() { return this._pub }
  get sub() { return this._sub }

  request(n: number) {
    const sendNext: (number) => Promise<void> = (i: number) => {
      if (i >= n || !this._active) return Promise.resolve(undefined)
      return this.pub.nextElem()
        .then(e => {
          if (e != null) {
            console.log(`sending element ${e}`)
            this.sub.onNext(e)
            return sendNext(i + 1)
          } else {
            this.cancel()
            this.sub.onComplete()
            return
          }
        }).catch(err => this.sub.onError(err))
    }
    sendNext(0)
  }

  cancel() {
    this._active = false
  }
}

