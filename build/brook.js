"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const process_1 = require("process");
class ArrayPublisher {
    constructor(_ary) {
        this._ary = _ary;
        this._isDone = false;
    }
    subscribe(sub) {
        this._sub = {
            request: (n) => {
                for (var i = 0; i < n && this._ary.length > 0; i++) {
                    process_1.nextTick(sub.onNext, this._ary.shift());
                }
                if (!this._isDone && this._ary.length === 0) {
                    process_1.nextTick(sub.onComplete);
                    this._isDone = true;
                }
            },
            cancel: () => { }
        };
        sub.onSubscribe(this._sub);
    }
}
class RingBuf {
    constructor(_cap) {
        this._cap = _cap;
        this._top = 0;
        this._bot = 0;
        this._ary = new Array(_cap + 1);
    }
    isEmpty() {
        return this._top === this._bot;
    }
    isFull() {
        return (this._top + 1) % this._ary.length === this._bot;
    }
    size() {
        return Math.abs((this._top + this._ary.length) - this._bot) % this._ary.length;
    }
    cap() {
        return this._cap;
    }
    push(t) {
        if (!this.isFull()) {
            this._ary[this._top] = t;
            this._top = (this._top + 1) % this._ary.length;
        }
        else
            throw "Attempt to push to full buffer!";
    }
    pop() {
        if (!this.isEmpty()) {
            let ret = this._ary[this._bot];
            this._ary[this._bot] = undefined;
            this._bot = (this._bot + 1) % this._ary.length;
            return ret;
        }
        else
            throw "Attempt to pop empty buffer!";
    }
}
class BufProcessor {
    constructor(_cap, _timeout) {
        this._cap = _cap;
        this._timeout = _timeout;
        this._toSend = 0;
        this._timer = null;
        this._upstreamComplete = false;
        this._downstreamComplete = false;
        this.onSubscribe = (s) => {
            this._upstream = s;
            this._upstream.request(this._cap);
        };
        this.onNext = (t) => {
            this._buf.push(t);
            if (this._buf.isFull()) {
                this._clearTimer();
                this._sendAndSet();
            }
        };
        this.onComplete = () => {
            this._clearTimer();
            this._upstreamComplete = true;
        };
        this.onError = (err) => {
            if (this._downstream != null)
                this._downstream.onError(err);
        };
        this._buf = new RingBuf(_cap);
    }
    subscribe(sub) {
        this._downstream = sub;
        let subscription = {
            request: (n) => {
                this._toSend = n;
                if (this._upstreamComplete) {
                    this._sendData();
                    if (this._buf.isEmpty() && !this._downstreamComplete) {
                        this._downstreamComplete = true;
                        process_1.nextTick(sub.onComplete);
                    }
                }
            },
            cancel: () => { if (this._upstream != null)
                this._upstream.cancel(); },
        };
        sub.onSubscribe(subscription);
        this._setTimer();
    }
    _clearTimer() {
        if (this._timer != null)
            clearTimeout(this._timer);
    }
    _setTimer() {
        this._timer = setTimeout(() => this._sendAndSet(), this._timeout);
    }
    _sendAndSet() {
        this._sendData();
        this._setTimer();
    }
    _sendData() {
        if (this._downstream != null) {
            for (; this._toSend > 0 && !this._buf.isEmpty(); this._toSend--)
                process_1.nextTick(this._downstream.onNext, this._buf.pop());
            if (this._buf.isEmpty() && this._upstream != null)
                process_1.nextTick(this._upstream.request, this._cap);
        }
    }
}
class EchoSubscriber {
    constructor() {
        this.onSubscribe = (s) => {
            this._sub = s;
            this._sub.request(1);
        };
        this.onNext = (t) => {
            console.log(`[${+new Date}] received: ${t}`);
            if (this._sub != null)
                this._sub.request(1);
        };
        this.onError = (err) => {
            console.error(`ERROR: ${err}`);
        };
        this.onComplete = () => {
            console.log("done!");
            this._sub = null;
        };
    }
}
function range(min, max) {
    if (max == null) {
        max = min;
        min = 0;
    }
    return Array.from(new Array(max - min).keys(), (n) => n + min);
}
let pub = new ArrayPublisher(range(10));
let buf = new BufProcessor(5, 10);
let sub = new EchoSubscriber();
pub.subscribe(buf);
buf.subscribe(sub);
