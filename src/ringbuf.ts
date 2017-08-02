export class RingBuf<T> {
  _ary: Array<T | void>;
  _top: number = 0
  _bot: number = 0
  constructor(private _cap: number) {
    this._ary = new Array(_cap + 1)
  }

  get isEmpty(): boolean {
    return this._top === this._bot
  }

  get isFull(): boolean {
    return (this._top + 1) % this._ary.length === this._bot
  }

  get size(): number {
    return Math.abs((this._top + this._ary.length) - this._bot) % this._ary.length
  }

  get cap(): number {
    return this._cap
  }

  push(t: T) {
    if (!this.isFull) {
      this._ary[this._top] = t
      this._top = (this._top + 1) % this._ary.length
    } else
      throw "Attempt to push to full buffer!"
  }

  pop(): T {
    if (!this.isEmpty) {
      let ret = this._ary[this._bot]!
      this._ary[this._bot] = undefined
      this._bot = (this._bot + 1) % this._ary.length
      return ret
    } else
      throw "Attempt to pop empty buffer!"
  }
}
