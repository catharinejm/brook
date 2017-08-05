use "collections"
use "promises"

actor MagicSubscription[T: Any #share] is Subscription
  var _active: Bool = true
  let _pub: BasePublisher[T]
  let _sub: Subscriber[T]

  new create(pub': BasePublisher[T], sub': Subscriber[T]) =>
    _pub = pub'
    _sub = sub'

  be request(n: ISize) =>
    let sender = _Sender[T](n, _sub, _pub)
    let res = Promise[None]
    sender.send_next(res)
    res.next[None](
      Ignore1,
      { ()(self = recover this end) => self.cancel() } iso
    )

  be cancel() =>
    _active = false

actor _Sender[T: Any #share]
  var _rem: ISize
  let _sub: Subscriber[T]
  let _pub: BasePublisher[T]

  new create(rem': ISize, sub': Subscriber[T], pub': BasePublisher[T]) =>
    _rem = rem'
    _sub = sub'
    _pub = pub'

  be send_next(result: Promise[None]) =>
    if _rem > 0 then
      _rem = _rem - 1
      let p = Promise[(T | None)]
      _pub.next_elem(p)
      p.next[None](
        {(mt: (T | None))(self = recover this end) =>
          try
            _sub.on_next(mt as T)
            self.send_next(result)
          else
            result.reject()
            _sub.on_complete()
          end
        } iso,
        NoOp
      )
    else
      result(None)
    end
