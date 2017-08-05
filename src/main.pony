use "collections"
use "promises"

class EndRange[A: (Real[A] val & Number) = USize] is Iterator[A]
  """
  Produces [min, max).
  """
  let _min: A
  let _max: A
  let _inc: A
  var _idx: A

  new create(min: A, max: A, inc: A = 1) =>
    _min = min
    _max = max
    _inc = inc
    _idx = min

  fun has_next(): Bool =>
    _idx < _max

  fun ref next(): A ? =>
    if has_next() then
      _idx = _idx + _inc
    else
      error
    end

  fun ref rewind() =>
    _idx = _min

actor Main
  new create(env: Env) =>
    let pub = IteratorPublisher[I32](recover EndRange[I32](1, 50) end)
    let sub = BufferedSubscriber[I32](
      5,
      {(n: I32): Promise[None] =>
        env.out.print("received " + n.string())
        let p = Promise[None]
        p(None)
        p
      } val
    )
    pub.subscribe(sub)

interface tag Publisher[T: Any #share]
  be subscribe(sub: Subscriber[T])

interface tag Subscriber[T: Any #share]
  be on_subscribe(s: Subscription)
  be on_next(t: T)
  be on_error(err: Any)
  be on_complete()

interface tag Subscription
  be request(n: ISize)
  be cancel()

type Processor[T: Any #share, R: Any #share] is (Subscriber[T] & Publisher[R])

