import { Publisher, Subscriber } from './brook'
import { RingBuf } from './ringbuf'
import { MagicSubscription } from './subscription'
import * as UDP from 'dgram'

export abstract class BasePublisher<T> implements Publisher<T> {
  abstract nextElem(): Promise<T | void>

  subscribe(sub: Subscriber<T>) {
    sub.onSubscribe(new MagicSubscription(this, sub))
  }
}

class ArrayPublisher<T> extends BasePublisher<T> {
  _i = 0

  constructor(private _ary: Array<T>) { super() }

  nextElem(): Promise<T | void> {
    return Promise.resolve(this._ary[this._i++])
  }
}

class IteratorPublisher<T> extends BasePublisher<T> {
  constructor(private _iter: Iterator<T>) { super() }

  nextElem(): Promise<T | void> {
    return new Promise((resolve, reject) => {
      try {
        resolve(this._iter.next().value)
      } catch (err) {
        reject(err)
      }
    })
  }
}

type DeferredPromise<T> = { resolve: (T) => void, reject: (any) => void }

class UDPPublisher extends BasePublisher<string> {
  _sock = UDP.createSocket('udp4')
  _deferredNexts: Array<DeferredPromise<string>> = []
  _msgBuf: Array<string> = []
  _isClosed = false

  constructor(private _port: number) {
    super()
    this._sock.on('message', (msg, rinfo) => {
      let trimmed = msg.toString().trim()
      if (trimmed == 'DIE') {
        this._sock.close()
      } else {
        this._resolveNext(msg.toString())
      }
    })
    this._sock.on('close', () => { this._isClosed = true })
    this._sock.bind(_port)
  }

  nextElem(): Promise<string | void> {
    if (!this._isClosed) {
      let msg = this._msgBuf.shift()
      if (msg != null) {
        return Promise.resolve(msg)
      } else {
        return new Promise((resolve, reject) => {
          this._deferredNexts.push({ resolve, reject })
        })
      }
    } else {
      return Promise.resolve(undefined)
    }
  }

  _resolveNext(msg: string) {
    let p = this._deferredNexts.shift()
    if (p != null) {
      p.resolve(msg.trim())
    } else {
      this._msgBuf.push(msg.trim())
    }
  }
}

export function fromArray<T>(ary: Array<T>): Publisher<T> {
  return new ArrayPublisher(ary)
}

export function fromIterator<T>(iter: Iterator<T>): Publisher<T> {
  return new IteratorPublisher(iter)
}

export function fromUDPSocket(port: number): Publisher<string> {
  return new UDPPublisher(port)
}
