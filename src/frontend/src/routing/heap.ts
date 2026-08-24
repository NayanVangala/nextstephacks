/**
 * 小根堆。A* 之開集若以線掃取最小,萬節之圖則遲鈍不堪用。
 *
 * Lazy deletion: a node may be pushed more than once with improving keys. Pop
 * returns the best copy first; stale copies are discarded by the caller via a
 * visited check. This is cheaper than implementing decrease-key.
 */
export class MinHeap<T> {
  private items: { key: number; value: T }[] = [];

  get size(): number {
    return this.items.length;
  }

  push(key: number, value: T): void {
    this.items.push({ key, value });
    let i = this.items.length - 1;
    while (i > 0) {
      const parent = (i - 1) >> 1;
      if (this.items[parent].key <= this.items[i].key) break;
      [this.items[parent], this.items[i]] = [this.items[i], this.items[parent]];
      i = parent;
    }
  }

  pop(): T | undefined {
    if (this.items.length === 0) return undefined;
    const top = this.items[0];
    const last = this.items.pop()!;
    if (this.items.length > 0) {
      this.items[0] = last;
      let i = 0;
      for (;;) {
        const l = 2 * i + 1;
        const r = l + 1;
        let smallest = i;
        if (l < this.items.length && this.items[l].key < this.items[smallest].key) smallest = l;
        if (r < this.items.length && this.items[r].key < this.items[smallest].key) smallest = r;
        if (smallest === i) break;
        [this.items[smallest], this.items[i]] = [this.items[i], this.items[smallest]];
        i = smallest;
      }
    }
    return top.value;
  }
}
