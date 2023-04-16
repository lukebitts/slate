export class HistoryList<T> {
    _history: T[];
    _nextHead: number;
    _tail: number;
    _capacity: number;
    _count: number;

    constructor(capacity: number) {
        this._capacity = capacity;
        this._history = new Array<T>(capacity);
        this._nextHead = 0;
        this._tail = 0;
        this._count = 0;
    }

    get(): T {
        if (this._count == 0) throw new Error('[HistoryList::get] list is empty');
        return this._history[(this._nextHead - 1 + this._capacity) % this._capacity];
    }

    public next(element: T) {
        if (this._nextHead == this._tail && this._count == this._capacity) {
            this._tail = (this._tail + 1) % this._capacity;
            this._count--;
        }
        this._history[this._nextHead] = element;
        this._nextHead = (this._nextHead + 1) % this._capacity;
        this._count++;

        let nextAfterHead = this._nextHead;
        while (nextAfterHead != this._tail) {
            delete this._history[nextAfterHead];
            nextAfterHead = (nextAfterHead + 1) % this._capacity;
        }
    }

    public setWindow(idx: number) {
        if (idx <= 0 || idx > this._count) {
            throw new Error(`[HistoryList::setWindow] cant set window at ${idx} since the list only has ${this._count}`);
        }
        let head = (idx - 1 + this._capacity) % this._capacity;
        if (!this._history[head]) {
            throw new Error(`[HistoryList::setWindow] cant set window at ${idx} since it is a null slot`);
        }
        this._nextHead = idx % this._capacity;
    }

    public undo() {
        if (this._nextHead == (this._tail + 1) % this._capacity || this._count === 0) { 
            throw new Error('[HistoryList::undo] nothing to undo');
        }
        this._nextHead = (this._nextHead - 1 + this._capacity) % this._capacity;
    }

    public redo() {
        if (this._nextHead == this._tail || this._history[this._nextHead % this._capacity] == undefined) { 
            throw new Error('[HistoryList::redo] nothing to redo') ;
        }
        this._nextHead = (this._nextHead + 1) % this._capacity;
    }
}

(window as any).HistoryList = HistoryList;