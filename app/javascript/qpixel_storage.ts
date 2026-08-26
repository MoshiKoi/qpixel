interface QPixelStorageGetOptions {
  /**
   * Whether the value is supposed to be parsed after retrieval
   */
  parse?: boolean
}

interface QPixelStorage {
  /**
   * Storage prefix to avoid collisions
   */
  readonly prefix: string
  /**
   * Gets a value from storage by a given key
   * @param key key to get a value by
   * @param options optional configuration
   */
  get(key: string, options: Omit<QPixelStorageGetOptions, 'parse'> & { parse: true }): object | null;
  get(key: string, options: Omit<QPixelStorageGetOptions, 'parse'> & { parse: false }): string | null;
  get(key: string): string | null;
  get(key: string, options?: QPixelStorageGetOptions): unknown;
  /**
   * Removes a value from storage by a given key
   * @param key key to remove a value by
   */
  remove(key: string): this
  /**
   * Saves a given value to storage under a given key
   * @param key key to save the value under
   * @param value value to save (objects will be serialized)
   */
  set(key: string, value: unknown): this
}

class Storage implements QPixelStorage {
  #prefix: string;

  /**
   * @param {string} prefix storage prefix to avoid collisions
   */
  constructor(prefix: string) {
    this.#prefix = prefix;
  }

  get prefix() {
    return this.#prefix;
  }

  /**
   * @param {string} key unprefixed storage key
   * @param {QPixelStorageGetOptions} [options] optional configuration
   */
  get(key: string, options: QPixelStorageGetOptions = {}) {
    const value = localStorage.getItem(`${this.#prefix}.${key}`);

    if (value !== null && options.parse) {
      return JSON.parse(value);
    }

    return value;
  }

  /**
   * @param {string} key unprefixed storage key
   */
  remove(key: string) {
    localStorage.removeItem(`${this.#prefix}.${key}`);
    return this;
  }

  /**
   * @param {string} key unprefixed storage key
   * @param {unknown} value value to save
   */
  set(key: string, value: unknown) {
    const serialized = typeof value === 'string' ? value : JSON.stringify(value);
    localStorage.setItem(`${this.#prefix}.${key}`, serialized);
    return this;
  }
}

export default new Storage('qpixel');
