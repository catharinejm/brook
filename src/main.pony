use "collections"
use "promises"
use "time"
use "random"

actor Main
  new create(env: Env) =>
    let timers = Timers
    let pub = IteratorPublisher[I32](recover Range[I32](0, 20) end, env)
    let sub = BufferedSubscriber[I32](
      5,
      {(n: I32): Promise[None] =>
        let p = Promise[None]
        (let s, let ns) = Time.now()
        let timeout = Rand(s.u64(), ns.u64()).u64() % 300 + 50
        let timer = Timer(
          let _env: Env = env
          object iso is TimerNotify
            fun ref apply(timer: Timer, count: U64): Bool =>
              (let s, ns) = Time.now()
              let t = (s * 1000) + (ns / 1000000)
              _env.out.print("["+t.string()+"] received " + n.string())
              p(None)
              false
          end, 
          timeout * 1_000_000
        )
        timers(consume timer)
        p
      } val,
      recover env.out~print("done!") end
    )
    pub.subscribe(sub)

interface tag Publisher[T: Stringable val]
  be subscribe(sub: Subscriber[T])

interface tag Subscriber[T: Stringable val]
  be on_subscribe(s: Subscription)
  be on_next(t: T)
  be on_error(err: Any)
  be on_complete()

interface tag Subscription
  be request(n: ISize)
  be cancel()

type Processor[T: Stringable val, R: Stringable val] is (Subscriber[T] & Publisher[R])

