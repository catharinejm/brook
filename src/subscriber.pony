use "promises"

trait tag BaseSubscriber[T: Stringable val] is Subscriber[T]
  be process(t: T, result: Promise[None])

  be _request_elems()

actor BufferedSubscriber[T: Stringable val] is BaseSubscriber[T]
  var _sub: (Subscription | None) = None
  var _remaining: ISize
  var _cap: ISize
  var _processing: Promise[None] = Promise[None]
  let _after_complete: {()} val
  let _process_fn: {(T): Promise[None]} val
  
  new create(cap': ISize, process_fn: {(T): Promise[None]} val, after_complete: {()} val = NoOp) =>
    _cap = cap'
    _remaining = cap'
    _after_complete = after_complete
    _process_fn = process_fn
    _processing(None)

  be on_subscribe(s: Subscription) =>
    _sub = s
    _request_elems()

  be on_next(t: T) =>
    _remaining = _remaining - 1
    let p = Promise[None]
    _processing.next[None](
      { (none: None)(self = recover this end) =>
        self.process(t, p)
      } iso,
      NoOp
    )
    _processing = p.next[None](
      { (none: None)(self = recover this end) =>
        try
          _sub as Subscription // bail if None
          if _remaining == 0 then
            self._request_elems()
          end
        end
      } iso,
      NoOp
    )

  be on_error(err: Any) =>
    None

  be on_complete() =>
    _sub = None
    _after_complete()

  be process(t: T, result: Promise[None]) =>
    _process_fn(t).next[None]({(none: None) => result(None)} iso, NoOp)

  be _request_elems() =>
    _remaining = _cap
    try (_sub as Subscription).request(_cap) end
