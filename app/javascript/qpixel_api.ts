import qpixel_base from "./qpixel_base.ts";
import qpixel_dom from "./qpixel_dom.ts";
import qpixel_markdown from "./qpixel_markdown.ts";
import qpixel_storage from "./qpixel_storage.ts";

export default {
  ...globalThis.exposedProperties,
  ...qpixel_base,
  DOM: qpixel_dom,
  MD: qpixel_markdown,
  Storage: qpixel_storage,
};