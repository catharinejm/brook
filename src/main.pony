actor Main
  new create(env: Env) =>
    env.out.print("sup")

interface tag Publisher[T: Any #share]
  be subscribe(sub: Subscriber[T])

interface tag Subscriber[T: Any #share]
  be on_subscribe(s: Subscription)
  be on_next(t: T)
  be on_error(err: Any)
  be on_complete()

interface tag Subscription
  be request(n: USize)
  be cancel()

type Processor[T: Any #share, R: Any #share] is (Subscriber[T] & Publisher[R])

