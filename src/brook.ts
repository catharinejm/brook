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
