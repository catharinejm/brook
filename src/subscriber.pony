use "promises"

trait BaseSubscriber[T: Any #share] is Subscriber[T]
  fun _sub(): (Subscription | None)

  fun is_subscribed(): Bool =>
    match _sub()
      | let _: Subscription => true
      | None => false
    end

  be _request_elems()

  be process(t: T, result: Promise[None])

  be after_complete() =>
    None
