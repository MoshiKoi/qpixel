import QPixel from './qpixel_api';
import moment from 'moment';

type ClassWatcherCallback = (element: HTMLElement) => void;

const classWatchers: Record<string, ClassWatcherCallback[]> = {};

new MutationObserver((records) => {
  const watchers = Object.entries(classWatchers);

  for (const { target } of records) {
    for (const [selector, callbacks] of watchers) {
      if (QPixel.DOM.isHTMLElement(target) && target.matches(selector)) {
        for (const callback of callbacks) {
          callback(target);
        }
      }
    }
  }
}).observe(document, {
  attributeFilter: ['class'],
  subtree: true
});


interface DelegatedListener {
  event: string;
  selector: string;
  callback: EventListener;
}

export default {
  _delegatedListeners: [] as DelegatedListener[],
  _eventListeners: {} as Record<string, (ev: Event) => void>,


  /**
   * Adds a delegated event listener. Use when an event listener is required that will fire for elements added to the
   * DOM dynamically after the delegated listener is added.
   * @param event An event name to listen for.
   * @param selector A CSS selector representing elements on which to apply the listener.
   * @param callback A callback function to pass to the event listener.
   */
  addDelegatedListener(event: string, selector: string, callback: EventListener) {
    if (!QPixel.DOM._eventListeners[event]) {
      const listener: EventListener = (ev) => {
        QPixel.DOM._delegatedListeners
          .filter((x) => x.event === event)
          .forEach((listener) => {
            if ((ev.target as Element).matches(listener.selector)) {
              listener.callback(ev);
            }
          });
      };
      document.addEventListener(event, listener);
      QPixel.DOM._eventListeners[event] = listener;
    }
    QPixel.DOM._delegatedListeners.push({ event, selector, callback });
  },

  /**
   * Adds an event listener to _all_ elements that currently match a selector.
   * @param event An event name to listen for.
   * @param selector A CSS selector representing elements on which to apply the listener.
   * @param callback A callback function to pass to the event listener.
   */
  addSelectorListener(event: string, selector: string, callback: EventListener) {
    document.querySelectorAll(selector).forEach((el) => {
      el.addEventListener(event, callback);
    });
  },

  /**
   * Smoothly fade an element out of view, then remove it.
   * @param element The element to fade out.
   * @param duration A duration for the effect in milliseconds.
   */
  fadeOut(element: HTMLElement, duration: number) {
    element.style.transition = `${duration}ms`;
    element.style.opacity = '0';
    setTimeout(() => {
      element.remove();
    }, duration);
  },

  /**
   * Formats a given {@link timestamp} with the standard format
   * @param timestamp timestamp to format
   */
  formatTimestamp(timestamp: string | number | Date): string {
    return moment(timestamp).format('YYYY-MM-DD HH:mm:ss UTC');
  },

  /**
   * Checks common modifier states on a given keyboard event
   * @param event 
   */
  getModifierState(e: KeyboardEvent | MouseEvent | JQuery.KeyboardEventBase): boolean {
    return !!e.altKey || !!e.ctrlKey || !!e.metaKey || !!e.shiftKey;
  },

  /**
   * Is a given event target an HTMLElement?
   * @param target event target to check
   */
  isHTMLElement(target: EventTarget): target is HTMLElement {
    return target instanceof HTMLElement;
  },

  /**
  * Sets visibility of an element or array of elements. Uses display: none so should work with screen readers.
  * @param elements An element or array of elements to set visibility for.
  * @param visible Whether or not the elements should be visible.
  */
  setVisible(elements: HTMLElement | HTMLElement[], visible: boolean) {
    if (!Array.isArray(elements)) {
      elements = [elements];
    }
    elements.forEach((el) => (el.style.display = visible ? '' : 'none'));
  },

  /**
   * Registers a callback to run on class list change
   * @param selector CSS selector to watch for
   * @param callback callback to call on match
   */
  watchClass(selector: string, callback: ClassWatcherCallback) {
    const callbacks = (classWatchers[selector] ||= []);
    callbacks.push(callback);
  }
};
