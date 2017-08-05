use "random"
use "time"

class val ID
  let _id: U64

  new val create() =>
    (let sec, let nsec) = Time.now()
    _id = Rand(sec.u64(), nsec.u64()).u64()

  fun val eq(other: ID val): Bool =>
    _id == other._id

  fun val u64(): U64 =>
    _id

class iso NoOp
  fun apply() => None

class iso Ignore1
  fun apply(a: Any) => None
