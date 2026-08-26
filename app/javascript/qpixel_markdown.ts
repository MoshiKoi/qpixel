import QPixel from './qpixel_api';


interface StripMarkdownOptions {
  /**
   * Whether to strip away the leading quote ("> content"), if any
   * @default false
   */
  removeLeadingQuote?: boolean
}


export default {
  /**
   * Inserts text around a given {@link $field}'s selection
   * @param $field field to insert text into
   * @param start text to insert at selection start
   * @param end text to insert at selection end, if any
   */
  insertIntoField($field: JQuery<HTMLInputElement | HTMLTextAreaElement>, start: string, end?: string | null) {
    let value = $field.val();

    value = QPixel.MD.stringInsert(value!, $field[0].selectionStart!, start);

    if (end) {
      value = QPixel.MD.stringInsert(value, $field[0].selectionEnd! + start.length, end);
    }

    $field.val(value).trigger('markdown');
  },

  /**
   * Replace the selected text in an input field with a provided replacement.
   * @param $field the field in which to replace text
   * @param text the text with which to replace the selection
   */
  replaceSelection($field: JQuery<HTMLInputElement | HTMLTextAreaElement>, text: string) {
    const prev = $field.val()?.toString() as string;
    $field.val(prev.substring(0, $field[0].selectionStart!) + text + prev.substring($field[0].selectionEnd!));
  },

  /**
    * Inserts text at a given {@link idx} in a given {@link str}
    * @param str text to insert into
    * @param idx position to insert at
    * @param insert text to insert
    */
  stringInsert(str: string, idx: number, insert: string): string {
    return str.slice(0, idx) + insert + str.slice(idx);
  },

  /**
   * See [strip_markdown](app/helpers/application_helper.rb) application helper
   */
  stripMarkdown(content: string, options?: StripMarkdownOptions): string {
    const stripped = content
      .replace(/(?:^#+ +|^-{3,}|^\[[^\]]+\]: ?.+$|^!\[[^\]]+\](?:\([^)]+\)|\[[^\]]+\])$|<[^>]+>)/g, '')
      .replace(/[*_~]+/g, '')
      .replace(/!?\[([^\]]+)\](?:\([^)]+\)|\[[^\]]+\])/g, '$1');

    if (options?.removeLeadingQuote ?? false) {
      return stripped.replace(/^>.+?$/g, '');
    }

    return stripped;
  },
};
