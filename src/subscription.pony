use "collections"
use "promises"

actor MagicSubscription[T: Any #share] is Subscription
  var _active: Bool = true
  let _pub: BasePublisher[T]
  let _sub: Subscriber[T]

  new create(pub': BasePublisher[T], sub': Subscriber[T]) =>
    _pub = pub'
    _sub = sub'

  be request(n: USize) =>
    var p: Promise[None] = Promise[None]
    for i in Range(0, n) do
      match _send_next()
        | let p': Promise[None] => p = p'.next[None]({(x: None) => p(None)} iso, {() => None} iso)
        | None => break
      end
    end

  be cancel() =>
    _active = false

  fun _send_next(): (Promise[None] | None) =>
    if (not _active) then return None end
    let p = Promise[(T | None)]
    _pub.next_elem(p)
    let self: MagicSubscription[T] tag = this
    let fulfill =
      object iso is Fulfill[(T | None), None]
        fun ref apply(mt: (T | None)): None =>
          try
            _sub.on_next(mt as T)
          else
            self.cancel()
            _sub.on_complete()
          end
      end
    let reject =
      object iso is Reject[None]
        fun ref apply(): None =>
          _sub.on_error("Error")
      end
    p.next[None](consume fulfill, consume reject)
