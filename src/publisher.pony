use "promises"

trait tag BasePublisher[T: Any #share] is Publisher[T]
  be next_elem(p: Promise[(T | None)])
  be subscribe(sub: Subscriber[T]) =>
    sub.on_subscribe(MagicSubscription[T](this, sub))
