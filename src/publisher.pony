use "promises"

trait tag BasePublisher[T: Stringable val] is Publisher[T]
  be next_elem(p: Promise[(T | None)])

  fun mk_subscription(sub: Subscriber[T]): Subscription

  be subscribe(sub: Subscriber[T]) =>
    sub.on_subscribe(mk_subscription(sub))

actor IteratorPublisher[T: Stringable val] is BasePublisher[T]
  let _iter: Iterator[T] iso
  let _env: Env

  new create(iter': Iterator[T] iso, env': Env) =>
    _iter = consume iter'
    _env = env'

  fun mk_subscription(sub: Subscriber[T]): Subscription =>
    MagicSubscription[T](this, sub, _env)

  be next_elem(p: Promise[(T | None)]) =>
    if (_iter.has_next()) then
      try p(_iter.next()?); return end
    end
    p(None)
