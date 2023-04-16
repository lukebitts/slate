import { TestBed } from '@angular/core/testing';
import { HistoryList } from './history-list';

describe('HistoryList', () => {
    let history: HistoryList<number>;

    beforeEach(() => {
        history = new HistoryList<number>(3);
    });

    it('should add new items to the history 2', () => {
        //history.next(1);
        expect(history._history).toEqual([undefined as any, undefined as any, undefined as any]);
        expect(() => history.undo()).toThrowError('[HistoryList::undo] nothing to undo');
    });

    it('should add new items to the history', () => {
        history.next(1);
        history.next(2);
        history.next(3);
        expect(history._history).toEqual([1, 2, 3]);
    });

    it('should remove the oldest item when adding new items and the buffer is full', () => {
        history.next(1);
        history.next(2);
        history.next(3);
        history.next(4);
        expect(history._history).toEqual([4, 2, 3]);
    });

    it('should set the current index to the end of the history when adding new items', () => {
        history.next(1);
        history.next(2);
        history.next(3);
        expect(history._nextHead).toEqual(0);
    });

    it('should set the current index correctly when using setWindow', () => {
        history.next(1);
        history.next(2);
        history.next(3);
        history.setWindow(1);
        expect(history._nextHead).toEqual(1);
    });

    it('should return the correct item when using get', () => {
        history.next(1);
        history.next(2);
        history.next(3);
        history.setWindow(2);
        expect(history.get()).toEqual(2);
    });

    it('setting a window outside of the range will throw an exception', () => {
        history.next(1);
        history.next(2);
        history.next(3);
        expect(() => history.setWindow(4)).toThrowError(`[HistoryList::setWindow] cant set window at 4 since the list only has 3`);
    });

    it('should throw an error when trying to get an item from an empty list', () => {
        expect(() => history.get()).toThrowError("[HistoryList::get] list is empty");
    });

    it('undoes and redoes successfully ', () => {
        history.next(1);
        history.next(2);
        history.next(3);
        history.undo();
        expect(history.get()).toEqual(2);
        history.undo();
        expect(history.get()).toEqual(1);
        expect(() => history.undo()).toThrow();
        history.redo();
        expect(history.get()).toEqual(2);
        history.redo();
        expect(history.get()).toEqual(3);
        expect(() => history.redo()).toThrow();
    });

    it('undoes and rewrites history successfully ', () => {
        history.next(1);
        history.next(2);
        history.next(3);
        history.undo();
        expect(history.get()).toEqual(2);
        history.next(4);
        expect(history.get()).toEqual(4);
        history.undo();
        expect(history.get()).toEqual(2);
        history.redo();
        expect(history.get()).toEqual(4);
    });

    it('if next is called after a setWindow call, it should clear future elements', () => {
        history.next(1);
        history.next(2);
        history.next(3);
        history.setWindow(1);
        expect(history.get()).toEqual(1);
        history.next(12);
        expect(history.get()).toEqual(12);
        expect(() => history.redo()).toThrow();
    });

    it('if next is called after a setWindow call, it should clear future elements', () => {
        history.next(1);
        expect(history._nextHead).toEqual(1);
        history.next(2);
        expect(history._nextHead).toEqual(2);
        history.next(3);
        expect(history._nextHead).toEqual(0);
        history.setWindow(1);
        expect(history.get()).toEqual(1);
        history.next(12);
        expect(history.get()).toEqual(12);
        history.undo();
        expect(history.get()).toEqual(1);
        history.redo();
        expect(history.get()).toEqual(12);
        expect(() => history.redo()).toThrow();
        expect(() => history.redo()).toThrow();
        expect(history.get()).toEqual(12);
        history.undo();
        expect(history.get()).toEqual(1);
    });

    it('make sure we dont lose elements from the past just because the forward in the buffer', () => {
        history.next(1);
        history.next(2);
        history.next(3);
        history.next(4);
        expect(history._history).toEqual([4, 2, 3]);
        history.undo();
        history.next(5);
        expect(history._history).toEqual([5, 2, 3]);
        history.undo();
        history.undo();
        history.next(6);
        expect(history._history).toEqual([undefined as any, 2, 6]);
    });

    it('make sure setwindow cant set a null value', () => {
        history.next(1);
        history.next(2);
        history.next(3);
        history.next(4);
        expect(history._history).toEqual([4, 2, 3]);
        history.undo();
        history.undo();
        history.next(5);
        expect(history._history).toEqual([undefined as any, 2, 5]);
        expect(() => history.setWindow(1)).toThrow();
        history.next(6);
        expect(history._history).toEqual([6, 2, 5]);
    });
});
