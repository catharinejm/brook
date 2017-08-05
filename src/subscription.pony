use "collections"
use "promises"

actor MagicSubscription[T: Stringable val] is Subscription
  var _active: Bool = true
  let _pub: BasePublisher[T]
  let _sub: Subscriber[T]
  let _env: Env

  new create(pub': BasePublisher[T], sub': Subscriber[T], env': Env) =>
    _pub = pub'
    _sub = sub'
    _env = env'

  be request(n: ISize) =>
    let sender = _Sender[T](n, _sub, _pub, _env)
    let res = Promise[None]
    sender.send_next(res)
    res.next[None](
      Ignore1,
      recover this~cancel() end
    )

  be cancel() =>
    _active = false

actor _Sender[T: Stringable val]
  var _rem: ISize
  let _sub: Subscriber[T]
  let _pub: BasePublisher[T]
  let _env: Env

  new create(rem': ISize, sub': Subscriber[T], pub': BasePublisher[T], env': Env) =>
    _rem = rem'
    _sub = sub'
    _pub = pub'
    _env = env'

  be send_next(done: Promise[None]) =>
    if _rem > 0 then
      _rem = _rem - 1
      let p = Promise[(T | None)]
      _pub.next_elem(p)
      p.next[None](
        {(mt: (T | None))(self = recover this end) =>
          try
            let t = mt as T
            _env.out.print("sending " + t.string())
            _sub.on_next(t)
            self.send_next(done)
          else
            done.reject()
            _sub.on_complete()
          end
        } iso,
        NoOp
      )
    else
      done(None)
    end
