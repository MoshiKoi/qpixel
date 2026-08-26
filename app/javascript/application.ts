// function importAll(r) {
//   r.keys().forEach(r);
// }

// importAll(
//   import.meta.webpackContext("../components/", {
//     recursive: true,
//     regExp: /\.js$/,
//   }),
// );

import 'chartkick/chart.js';
import QPixel from './qpixel_api.ts';

document.addEventListener('DOMContentLoaded', async () => {
  QPixel.DOM.addSelectorListener('click', 'a.flag-dialog-link', (ev) => {
    ev.preventDefault();
    const tgt = ev.target as HTMLElement;
    const flagDialog = tgt.closest('.post--body')!.querySelector('.js-flag-box')!;
    flagDialog.classList.toggle('is-active');
  });

  QPixel.DOM.addSelectorListener('click', '.close-dialog-link', (ev) => {
    ev.preventDefault();
    const tgt = ev.target as HTMLElement;
    const dialog = tgt.closest('.post--body')!.querySelector('.js-close-box')!;
    dialog.classList.toggle('is-active');
  });

  QPixel.DOM.addSelectorListener('click', '.show-all-flags-dialog-link', (ev) => {
    ev.preventDefault();
    const tgt = ev.target as HTMLElement;
    const dialog = tgt.closest('.post--body')!.querySelector('.js-flags')!;
    dialog.classList.toggle('is-active');
  });

  if (document.cookie.indexOf('dismiss_fvn') === -1) {
    QPixel.DOM.addSelectorListener('click', '#fvn-dismiss', (_ev) => {
      document.cookie = 'dismiss_fvn=true; path=/; expires=Fri, 31 Dec 9999 23:59:59 GMT';
    });
  }
});

const cssVar = (name: string) => window.getComputedStyle(document.documentElement).getPropertyValue(`--${name}`).trim();

// @ts-ignore Chartkick doesn't have any type information
Chartkick.setDefaultOptions({
  colors: Array.from(Array(5).keys()).map((idx) => cssVar(`data-${idx}`))
});
