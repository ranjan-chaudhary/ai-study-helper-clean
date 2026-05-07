// ==========================================
// 1. LRU Cache (Doubly Linked List + Map)
// ==========================================

class DNode {
  constructor(key, value) {
    this.key = key;
    this.value = value;
    this.prev = null;
    this.next = null;
  }
}

export class LRUCache {
  constructor(capacity) {
    this.capacity = capacity;
    this.cache = new Map(); // key -> DNode
    // Dummy head and tail to avoid edge cases
    this.head = new DNode("head", "head");
    this.tail = new DNode("tail", "tail");
    this.head.next = this.tail;
    this.tail.prev = this.head;
  }

  _removeNode(node) {
    node.prev.next = node.next;
    node.next.prev = node.prev;
  }

  _addNodeToHead(node) {
    node.prev = this.head;
    node.next = this.head.next;
    this.head.next.prev = node;
    this.head.next = node;
  }

  get(key) {
    if (!this.cache.has(key)) return null;
    const node = this.cache.get(key);
    // Move to most recently used (head)
    this._removeNode(node);
    this._addNodeToHead(node);
    return node.value;
  }

  put(key, value) {
    if (this.cache.has(key)) {
      const node = this.cache.get(key);
      node.value = value;
      this._removeNode(node);
      this._addNodeToHead(node);
    } else {
      if (this.cache.size >= this.capacity) {
        // Remove least recently used (tail.prev)
        const lruNode = this.tail.prev;
        this._removeNode(lruNode);
        this.cache.delete(lruNode.key);
      }
      const newNode = new DNode(key, value);
      this.cache.set(key, newNode);
      this._addNodeToHead(newNode);
    }
  }
}


// ==========================================
// 2. Queue (Linked List Implementation)
// ==========================================

class QNode {
  constructor(value) {
    this.value = value;
    this.next = null;
  }
}

export class Queue {
  constructor() {
    this.head = null;
    this.tail = null;
    this.size = 0;
  }

  enqueue(value) {
    const newNode = new QNode(value);
    if (!this.tail) {
      this.head = newNode;
      this.tail = newNode;
    } else {
      this.tail.next = newNode;
      this.tail = newNode;
    }
    this.size++;
  }

  dequeue() {
    if (!this.head) return null;
    const value = this.head.value;
    this.head = this.head.next;
    if (!this.head) {
      this.tail = null;
    }
    this.size--;
    return value;
  }

  isEmpty() {
    return this.size === 0;
  }
}


// ==========================================
// 3. Merge Sort Algorithm
// ==========================================

// Custom merge sort to handle objects with a custom compare function
export function mergeSort(arr, compareFn) {
  if (arr.length <= 1) return arr;

  const mid = Math.floor(arr.length / 2);
  const left = mergeSort(arr.slice(0, mid), compareFn);
  const right = mergeSort(arr.slice(mid), compareFn);

  return merge(left, right, compareFn);
}

function merge(left, right, compareFn) {
  let result = [];
  let i = 0;
  let j = 0;

  while (i < left.length && j < right.length) {
    // compareFn returns < 0 if left should come before right
    if (compareFn(left[i], right[j]) <= 0) {
      result.push(left[i]);
      i++;
    } else {
      result.push(right[j]);
      j++;
    }
  }

  return result.concat(left.slice(i)).concat(right.slice(j));
}
