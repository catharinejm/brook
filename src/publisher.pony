use "promises"

trait tag BasePublisher[T: Any #share] is Publisher[T]
  be next_elem(p: Promise[(T | None)])
  be subscribe(sub: Subscriber[T]) =>
    sub.on_subscribe(MagicSubscription[T](this, sub))

actor IteratorPublisher[T: Any #share] is BasePublisher[T]
  let _iter: Iterator[T] iso

  new create(iter': Iterator[T] iso) =>
    _iter = consume iter'

  be next_elem(p: Promise[(T | None)]) =>
    if (_iter.has_next()) then
      try p(_iter.next()?); return end
    end
    p(None)
