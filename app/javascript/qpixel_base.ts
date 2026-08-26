import QPixel from "./qpixel_api.ts";

interface ElementOffset {
  top: number;
  left: number;
  bottom: number;
  right: number;
}

interface PostValidatorMessage {
  type: "error" | "warning" | "error";
  message: string;
}

type PostValidator = (postText: string) => [boolean, PostValidatorMessage[]];

interface UserPreferences {
  community: Record<string, string | null>;
  global: Record<string, string | null>;
}

type QPixelUser = {
  id: number
  is_standard: boolean
  is_moderator: boolean
  is_admin: boolean
  is_global_moderator: boolean
  is_global_admin: boolean
  se_acct_id: string | null
  trust_level: number
  username: string
}

type QPixelFilterSource = 'any' | 'native' | 'imported'
type QPixelFilterStatus = 'any' | 'closed' | 'open'

type QPixelFilter = {
  exclude_tags: [string, number][]
  include_tags: [string, number][]
  max_answers: number | null
  max_score: number | null
  min_answers: number | null
  min_score: number | null
  source: QPixelFilterSource
  status: QPixelFilterStatus
  system: boolean
}

type QPixelSuccessResponseStatusJSON = 'success' | 'modified'
type QPixelFailedResponseStatusJSON = 'failed'
type QPixelResponseStatusJSON = QPixelSuccessResponseStatusJSON | QPixelFailedResponseStatusJSON

type QPixelBaseResponseJSON = {
  status: QPixelResponseStatusJSON
  message?: string
}

type QPixelSuccessResponseJSON = QPixelBaseResponseJSON & {
  status: QPixelSuccessResponseStatusJSON
}

type QPixelFailedResponseJSON = QPixelBaseResponseJSON & {
  errors?: string[]
}

type QPixelResponseJSON<Success extends object = object> =
  (Success & QPixelSuccessResponseJSON) | QPixelFailedResponseJSON

type QPixelUploadResponseJSON = QPixelResponseJSON<{
  link: string
}>

type QPixelVoteResponseJSON = QPixelResponseJSON<{
  vote_id: number
  upvotes: number
  downvotes: number
  score: number
}>

type QPixelRetractVoteResponseJSON = QPixelResponseJSON<{
  score: number
  downvotes: number
  upvotes: number
}>

type QPixelComment = {
  id: number
  created_at: string
  updated_at: string
  post_id: number
  content: string
  deleted: boolean
  user_id: number
  community_id: number
  comment_thread_id: number
  has_reference: false
  reference_text: string | null
  references_comment_id: string | null
}

type QPixelNotification = {
  community_id: number
  community_name: string
  content: string
  created_at: string
  id: number
  is_read: boolean
  link: string
  updated_at: string
  user_id: number
}

type QPixelDraft = {
  body: string
  comment?: string
  excerpt?: string
  license?: string
  tag_name?: string
  tags?: string[]
  title?: string
}

type QPixelFlagData = {
  flag_type: number | null
  post_id: string
  post_type: 'Comment' | 'Post'
  reason?: string
}

interface GetThreadContentOptions {
  inline?: boolean
  showDeleted?: boolean
}

const validators: PostValidator[] = [];

/** Counts notifications popped up at any time. */
let popped_modals_ct = 0;

type NotificationType = "warning" | "success" | "danger";

export default {
  /**
   * Create a notification popup - not an inbox notification.
   * @param type the type to apply to the popup - warning, danger, etc.
   * @param message the message to show
   */
  createNotification: (type: NotificationType, message: string) => {
    // Some messages include a date stamp, `append_date` governs that.
    let append_date = false;
    let message_with_date = message;
    if (type === 'danger') {
      if (popped_modals_ct > 0) {
        /* At the time of writing, modals stack each one exactly on top of previous one, so repeating an errored action
         * over and over again is going to create multiple error modals in the same exact place. While this happens this
         * way, an user closing the error modal will not have an immediate visual action feedback if two or more error
         * modals have been printed. A date is stamped in order to cope with that. Could be anything. Probably a cycle
         * of different emoji characters would be cuter while having the purpose met. But if so, make sure character in
         * step `i` is actually different than character in step `i + 1`. And then you could print an emoji just every
         * time a modal is popped up, not just from the second one; removing `message_with_date`, using only `message`,
         * and removing `append_date` and the different situations guarded by it. */
        append_date = true;
      }
    }
    if (append_date) {
      message_with_date += ' (' + new Date(Date.now()).toISOString() + ')';
    }
    const span = '<span aria-hidden="true">&times;</span>';
    const button = ('<button type="button" class="button is-close-button" data-dismiss="alert" aria-label="Close">' +
      span + '</button>');
    $('<div></div>')
      .addClass('notice has-shadow-3 is-' + type)
      .html(button + '<p>' + message_with_date + '</p>')
      .css({
        'position': 'fixed',
        'top': '50px',
        'left': '50%',
        'transform': 'translateX(-50%)',
        'width': '100%',
        'max-width': '800px',
        'cursor': 'pointer'
      })
      .on('click', function (_ev) {
        $(this).fadeOut(200, function () {
          $(this).remove();
          popped_modals_ct = popped_modals_ct > 0 ? (popped_modals_ct - 1) : 0;
        });
      })
      .appendTo(document.body);
    popped_modals_ct += 1;
  },


  /**
   * Get a list of supported canonical locales for {@link Intl.NumberFormat} based on {@link QPixel.LOCALE}.
   */
  supportedNumberLocales: (): string[] => {
    try {
      return Intl.NumberFormat.supportedLocalesOf(
        Intl.getCanonicalLocales(QPixel.LOCALE ?? 'en')
      );
    } catch {
      return ['en']
    }
  },

  /**
   * Format a given {@link value} into a human-friendly representation.
   * @param value value (in bytes) to format
   */
  numberToHumanSize: (value: number): string => {
    const unitMap: [number, string][] = [
      [1024 ** 4, 'terabyte'],
      [1024 ** 3, 'gigabyte'],
      [1024 ** 2, 'megabyte'],
      [1024 ** 1, 'kilobyte'],
      [0, 'byte']
    ];

    const [size, unit] = unitMap.find(([size]) => value >= size) ?? [0, 'byte'];

    return new Intl.NumberFormat(QPixel.supportedNumberLocales(), {
      notation: 'compact',
      style: 'unit',
      unit,
      unitDisplay: 'narrow',
    }).format(size ? value / size : value).toUpperCase();
  },

  /**
   * Get the absolute offset of an element.
   * @param element the element for which to find the offset.
   * @returns element offset information
   */
  offset: (element: HTMLElement): ElementOffset => {
    const topLeft = $(element).offset()!;
    return {
      top: topLeft.top,
      left: topLeft.left,
      bottom: topLeft.top + $(element).outerHeight()!,
      right: topLeft.left + $(element).outerWidth()!
    };
  },

  /**
   * Add a button to the Markdown editor.
   * @param $buttonHtml the HTML content that the button should show - just text, if you like, or
   *                    something more complex if you want to.
   * @param shortName a short name for the action that will be used as the title and aria-label attributes.
   * @param callback a function that will be passed as the click event callback.
   */
  addEditorButton: ($buttonHtml: JQuery.htmlString, shortName: string, callback: () => void) => {
    const html = `<a href="javascript:void(0)" class="button is-muted is-outlined" title="${shortName}"
                     aria-label="${shortName}"></a>`;
    const $button = $(html).html($buttonHtml);

    const insertButton = () => {
      $('.js-markdown-tools').each((i, e) => {
        const $tgt = $(e);
        let $customGroup = $tgt.find('.button-list.js-custom-tools');
        if ($customGroup.length === 0) {
          $customGroup = $(`<div class="button-list is-gutterless js-custom-tools"></div>`);
          $customGroup.appendTo($tgt);
        }

        $button.clone().on('click', callback).appendTo($customGroup);
      });
    };

    insertButton();
  },

  /**
   * Add a validator that will be called before creating a post.
   * callback should take one parameter, the post text, and should return an array in
   * the following format:
   *
   * [
   *   true | false,  // is the post valid for this check?
   *   [
   *     { type: 'warning', message: 'warning message - will not block posting' },
   *     { type: 'error', message: 'error message - will block posting' }
   *   ]
   * ]
   */
  addPrePostValidation: (callback: PostValidator) => {
    validators.push(callback);
  },

  /**
   * Internal. Called just before a post is sent to the server to validate that it passes
   * all custom checks.
   */
  validatePost: (postText: string): [boolean, PostValidatorMessage[] | null] => {
    const results = validators.map((x) => x(postText));
    const valid = results.every((x) => x[0]);
    if (valid) {
      return [true, null];
    }
    else {
      return [false, results.map((x) => x[1]).flat()];
    }
  },

  _filters: null as Record<string, QPixelFilter> | null,
  _pendingUser: null as Promise<QPixelUser> | null,
  _user: null as QPixelUser | null,


  /**
   * FIFO-style fetch wrapper for /users/me requests
   */
  _fetchUser: (): Promise<QPixelUser | null> => {
    if (QPixel._pendingUser) {
      return QPixel._pendingUser;
    }

    const myselfPromise = QPixel
      .fetch('/users/me', {
        headers: {
          'Accept': 'application/json',
          'Cache-Control': 'no-cache',
        }
      })
      .then((resp) => resp.json())
      .catch(() => null)
      .finally(() => {
        QPixel._pendingUser = null;
      });

    QPixel._pendingUser = myselfPromise;

    return myselfPromise;
  },

  /**
   * Get the user object for the current user.
   * @returns JSON object containing user details
   */
  user: async (): Promise<QPixelUser | null> => {
    if (QPixel._user != null || document.body.dataset.userId === 'none') {
      return QPixel._user;
    }

    QPixel._user = await QPixel._fetchUser();

    return QPixel._user;
  },

  _preferences: null as UserPreferences | null,


  /**
   * Get an object containing the current user's preferences. Loads, in order of precedence, from local variable,
   * {@link QPixelStorage}, or Redis via AJAX.
   * @returns user preferences or `null` on failure
   */
  _getPreferences: async (): Promise<UserPreferences | null> => {
    // Early return for the most frequent case (local variable already contains the preferences)
    if (QPixel._preferences != null) {
      return QPixel._preferences;
    }

    // Early return the preferences from storage unless null or undefined
    const key = QPixel._preferencesLocalStorageKey();
    const storedPreferences = QPixel.Storage?.get(key, { parse: true });
    if (storedPreferences) {
      return (QPixel._preferences = /** @type {UserPreferences} */(storedPreferences));
    }

    // If preferences are absent in storage, load them via AJAX
    await QPixel._cachedFetchPreferences();
    return QPixel._preferences;
  },

  /**
   * Get a single user preference by name.
   * @param name the name of the requested preference
   * @param community is the requested preference community-local (true), or network-wide (false)?
   * @returns the value of the requested preference
   */
  preference: async (name: string, community?: boolean): Promise<string | null> => {
    const user = await QPixel.user();

    if (!user) {
      return null;
    }

    let prefs = await QPixel._getPreferences();
    let value = community ? prefs?.community[name] : prefs?.global[name];

    // Note that null is a valid value for a preference, but undefined means we haven't fetched it.
    if (typeof value !== 'undefined') {
      return value;
    }
    // If we haven't fetched a preference, that probably means it's new - run a full re-fetch.
    await QPixel._cachedFetchPreferences();

    prefs = await QPixel._getPreferences();
    value = community ? prefs?.community[name] : prefs?.global[name];
    value ??= null;
    return value;
  },


  /**
   * Set a user preference by name to the value provided.
   * @param name the name of the preference to set
   * @param value the value to set to - must respond to toString() for {@link QPixelStorage} and Redis
   * @param community is this preference community-local (true), or network-wide (false)?
   */
  setPreference: async (name: string, value: unknown, community: boolean = false): Promise<void> => {
    const resp = await QPixel.fetchJSON('/users/me/preferences', { name, value, community }, {
      headers: { 'Accept': 'application/json' }
    });

    /** @type {QPixelResponseJSON<{ preferences: UserPreferences }>} */
    const data: QPixelResponseJSON<{ preferences: UserPreferences; }> = await QPixel.parseJSONResponse(resp, 'Failed to save preference');

    QPixel.handleJSONResponse(data, (data) => {
      QPixel._updatePreferencesLocally(data.preferences);
    });
  },

  filters: async (): Promise<Record<string, QPixelFilter>> => {
    if (QPixel._filters == null) {
      // If they're still absent after loading from storage, load from the API.
      const resp = await QPixel.getJSON('/users/me/filters');
      const data = await resp.json();

      QPixel.Storage?.set('user_filters', data);
      QPixel._filters = data;
    }

    return QPixel._filters!;
  },

  /**
   * Fetches default user filter for a given category
   * @param categoryId id of the category to fetch
   */
  defaultFilter: async (categoryId: string): Promise<string> => {
    const user = await QPixel.user();

    if (!user) {
      return '';
    }

    const resp = await QPixel.getJSON(`/users/me/filters/default?category=${categoryId}`);

    const data = await resp.json();
    return data.name;
  },

  setFilter: async (name: string, filter: QPixelFilter, category: string, isDefault: boolean): Promise<void> => {
    const resp = await QPixel.fetchJSON('/users/me/filters',
      Object.assign(filter, { name, category, is_default: isDefault }), {
      headers: { 'Accept': 'application/json' }
    });

    /** @type {QPixelResponseJSON<{ filters: Record<string, QPixelFilter> }>} */
    const data: QPixelResponseJSON<{ filters: Record<string, QPixelFilter>; }> = await QPixel.parseJSONResponse(resp, 'Failed to save filter');

    QPixel.handleJSONResponse(data, (data) => {
      QPixel._filters = data.filters;
      QPixel.Storage?.set('user_filters', QPixel._filters);
    });
  },

  deleteFilter: async (name: string, system: boolean = false): Promise<void> => {
    const resp = await QPixel.fetchJSON('/users/me/filters', { name, system }, {
      headers: { 'Accept': 'application/json' },
      method: 'DELETE'
    });

    /** @type {QPixelResponseJSON<{ filters: Record<string, QPixelFilter> }>} */
    const data: QPixelResponseJSON<{ filters: Record<string, QPixelFilter>; }> = await QPixel.parseJSONResponse(resp, 'Failed to delete filter');

    QPixel.handleJSONResponse(data, (data) => {
      QPixel._filters = data.filters;
      QPixel.Storage?.set('user_filters', QPixel._filters);
    });
  },

  /**
   * Get the key to use for storing user preferences in storage, to avoid conflating users
   * @returns string the storage key
   */
  _preferencesLocalStorageKey: (): string => {
    const id = document.body.dataset.userId;
    const key = `user_${id}_preferences`;
    QPixel._preferencesLocalStorageKey = () => key;
    return key;
  },

  /**
   * Call _fetchPreferences but only the first time to prevent redundant HTTP requests
   */
  _cachedFetchPreferences: async (): Promise<void> => {
    // No 'await' because we want the promise not its value
    const cachedPromise = QPixel._fetchPreferences();
    // Redefine this function to await this same initial promise on every subsequent call
    // This prevents multiple calls from triggering multiple redundant '_fetchPreferences' calls
    QPixel._cachedFetchPreferences = async () => {
      await cachedPromise;
    };
    // Remember to await the promise so the very first call does not return before '_fetchPreferences' returns
    await cachedPromise;
  },

  /**
   * Update local variable _preferences and storage with an AJAX call for the user preferences
   */
  _fetchPreferences: async (): Promise<void> => {
    const resp = await QPixel.getJSON('/users/me/preferences');
    const data = await resp.json();
    QPixel._updatePreferencesLocally(data);
  },

  /**
   * Set local variable _preferences and storage to new preferences data
   * @param data an object, containing the new preferences data
   */
  _updatePreferencesLocally: (data: UserPreferences) => {
    QPixel._preferences = data;
    const key = QPixel._preferencesLocalStorageKey();
    QPixel.Storage?.set(key, QPixel._preferences);
  },

  /**
   * Get the word in a string that the given position is in, and the position within that word.
   * @param splat an array, containing the string already split by however you define a "word"
   * @param posIdx the index to search for
   * @returns the word the given position is in, and the position within that word
   */
  currentCaretSequence: (splat: string[], posIdx: number): [string, number] => {
    let searchIdx = 0;
    let splatIdx = 0;
    let posInSeq;
    let currentSequence;
    do {
      currentSequence = splat[splatIdx];
      posInSeq = posIdx - (splatIdx === 0 ? searchIdx : searchIdx + 1);
      searchIdx += currentSequence.length + (splatIdx === 0 ? 0 : 1);
      splatIdx += 1;
    } while (searchIdx < posIdx);
    return [currentSequence, posInSeq];
  },

  /**
   * Wrapper around {@link fetch} to ensure credentials, CSRF token, and X-Requested-With are always sent
   * @param uri target URI of the request
   * @param options options to pass to {@link fetch}
   */
  fetch: async (uri: string | URL, options?: RequestInit): Promise<Response> => {
    const defaultHeaders = {
      // X-Requested-With is necessary for request.xhr? to work
      'X-Requested-With': 'XMLHttpRequest',
    };

    const { headers = {}, ...restInit } = options ?? {};

    /** @type {RequestInit} */
    const requestInit: RequestInit = {
      headers: {
        ...defaultHeaders,
        ...headers,
      },
      credentials: 'include',
      ...restInit,
    };

    return fetch(uri, requestInit);
  },

  /**
   * Send a request with JSON data, pre-authorized with QPixel credentials for the signed in user.
   * @param uri The URI to which to send the request.
   * @param data An object containing data to send to the server. Must be acceptable by JSON.stringify.
   * @param options An optional {@link RequestInit} to override the defaults provided by this method.
   * @returns The Response promise returned by {@link fetch}.
   */
  fetchJSON: async (uri: string, data: any, options: RequestInit = {}): Promise<Response> => {
    const { headers = {}, ...restOptions } = options

    /** @type {RequestInit} */
    const requestInit: RequestInit = {
      method: 'POST',
      body: options.method === 'GET' ? void 0 : JSON.stringify(data),
      headers: {
        'Content-Type': 'application/json',
        ...headers,
      },
      ...restOptions,
    };

    return QPixel.fetch(uri, requestInit);
  },

  /**
   * @param uri The URI to which to send the request.
   * @param options An optional {@link RequestInit} to override the defaults provided by {@link fetchJSON}
   */
  getJSON: async (uri: string, options: Omit<RequestInit, 'method'> = {}): Promise<Response> => {
    const { headers = {} } = options ?? {};

    return QPixel.fetchJSON(uri, {}, {
      ...options,
      headers: {
        'Accept': 'application/json',
        'X-Requested-With': 'XMLHttpRequest',
        ...headers,
      },
      method: 'GET',
    });
  },

  /**
   * Attempts to get a JSON representation of a comment
   * @param id id of the comment to get
   */
  getComment: async (id: string): Promise<QPixelComment> => {
    const resp = await QPixel.getJSON(`/comments/${id}`);

    const data = await resp.json();

    return data;
  },

  /**
   * Attempts to get a list of notifications for the current user
   */
  getNotifications: async (): Promise<QPixelNotification[]> => {
    const resp = await QPixel.getJSON(`/users/me/notifications`, {
      headers: { 'Cache-Control': 'no-cache' }
    });

    const data = await resp.json();

    return data;
  },

  /**
   * Attempts to dynamically load thread content
   * @param id id of the comment thread
   * @param options configuration options
   */
  getThreadContent: async (id: string, options?: GetThreadContentOptions): Promise<string> => {
    const inline = options?.inline ?? true;
    const showDeleted = options?.showDeleted ?? false;

    const url = new URL(`/comments/thread/${id}/content`, window.location.origin);
    url.searchParams.append('inline', `${inline}`);
    url.searchParams.append('show_deleted_comments', `${showDeleted ? 1 : 0}`);

    const resp = await QPixel.fetch(url.toString(), {
      headers: { 'Accept': 'text/html' }
    });

    if (!resp.ok) {
      return '';
    }

    const content = await resp.text();

    return content;
  },

  /**
   * Attempts to dynamically load a list of comment threads for a given post
   * @param id id of the post to load
   */
  getThreadsListContent: async (id: string): Promise<string> => {
    const url = new URL(`/comments/post/${id}`, window.location.origin);

    const resp = await QPixel.fetch(url.toString(), {
      headers: { 'Accept': 'text/html' }
    });

    const content = await resp.text();

    return content;
  },

  /**
   * Safely parses a JSON response from QPixel API
   * @param response API response to parse
   * @param errorMessage error to set on failure to parse
   */
  parseJSONResponse: async <T extends QPixelResponseJSON>(response: Response, errorMessage: string): Promise<T | ((QPixelBaseResponseJSON & { status: 'failed' }))> => {
    try {
      const data = await response.json();

      return data;
    }
    catch (error) {
      if (response.ok) {
        console.error(error);
      }

      return {
        status: 'failed',
        message: errorMessage
      };
    }
  },

  /**
   * Processes JSON responses from QPixel API
   * @param data parsed response JSON body from the API
   * @param onSuccess callback to call for successful requests
   * @param onFinally callback to call for all requests
   */
  handleJSONResponse: <T extends QPixelResponseJSON>(
    data: T,
    onSuccess: (data: Extract<T, QPixelSuccessResponseJSON>) => void,
    onFinally?: (data: T) => void): boolean => {
    const isFailed = data.status === 'failed';

    if (isFailed) {
      const { errors = [], message } = data;

      if (message) {
        const fullMessage =
          errors.length > 1
            ? `${message}:<ul>${errors.map((e) => `<li>${e.trim()}</li>`).join('')}</ul>`
            : errors.length === 1
              ? `${message} (${errors[0].toLowerCase().trim()})`
              : message;

        QPixel.createNotification('danger', fullMessage);
      }
      else {
        for (const error of errors) {
          QPixel.createNotification('danger', error);
        }
      }
    }
    else {
      onSuccess(data as Parameters<typeof onSuccess>[0]);
    }

    onFinally?.(data);

    return !isFailed;
  },

  /**
   * Attempts to raise a flag
   * @param flag new flag data
   */
  flag: async (flag: QPixelFlagData): Promise<QPixelResponseJSON> => {
    const resp = await QPixel.fetchJSON(`/flags/new`, { ...flag }, {
      headers: { 'Accept': 'application/json' }
    });

    return QPixel.parseJSONResponse(resp, 'Failed to flag');
  },

  /**
   * Attempts to vote on a given post
   * @param postId id of the post to vote on
   * @param voteType type of the vote
   */
  vote: async (postId: string, voteType: string): Promise<QPixelVoteResponseJSON> => {
    const resp = await QPixel.fetchJSON('/votes/new', {
      post_id: postId,
      vote_type: voteType
    });

    return QPixel.parseJSONResponse(resp, 'Failed to vote');
  },

  /**
   * @param url upload endpoint URL (differs between routes)
   * @param form upload form to get the file from
   */
  upload: async (url: string, form: HTMLFormElement): Promise<QPixelUploadResponseJSON> => {
    const resp = await QPixel.fetch(url, {
      method: 'POST',
      body: new FormData(form)
    });

    return QPixel.parseJSONResponse(resp, 'Failed to upload');
  },

  /**
   * Attempts to archive a comment thread
   * @param id id of the thread to archive
   * @returns result of the operation
   */
  archiveThread: async (id: string): Promise<QPixelResponseJSON> => {
    const resp = await QPixel.fetchJSON(`/comments/thread/${id}/archive`, {}, {
      headers: { 'Accept': 'application/json' },
    });

    return QPixel.parseJSONResponse(resp, 'Failed to archive thread');
  },

  /**
   * Attempts to delete a comment thread
   * @param id id of the thread to delete
   * @returns result of the operation
   */
  deleteThread: async (id: string): Promise<QPixelResponseJSON> => {
    const resp = await QPixel.fetchJSON(`/comments/thread/${id}/delete`, {}, {
      headers: { 'Accept': 'application/json' },
    });

    return QPixel.parseJSONResponse(resp, 'Failed to delete thread');
  },

  /**
   * Attempts to follow a comment thread
   * @param id id of the thread to follow
   * @returns result of the operation
   */
  followThread: async (id: string): Promise<QPixelResponseJSON> => {
    const resp = await QPixel.fetchJSON(`/comments/thread/${id}/follow`, {}, {
      headers: { 'Accept': 'application/json' },
    });

    return QPixel.parseJSONResponse(resp, 'Failed to follow thread');
  },

  /**
   * Attempts to unfollow a comment thread
   * @param id id of the thread to unfollow
   * @returns result of the operation
   */
  unfollowThread: async (id: string): Promise<QPixelResponseJSON> => {
    const resp = await QPixel.fetchJSON(`/comments/thread/${id}/unfollow`, {}, {
      headers: { 'Accept': 'application/json' },
    });

    return QPixel.parseJSONResponse(resp, 'Failed to unfollow thread');
  },

  /**
   * Attempts to lock a comment thread
   * @param id id of the comment thread to lock
   * @param duration how long should the thread be locked for, in days
   * @returns result of the operation
   */
  lockThread: async (id: string, duration?: number): Promise<QPixelResponseJSON> => {
    const resp = await QPixel.fetchJSON(`/comments/thread/${id}/lock`, {
      duration,
    });

    return QPixel.parseJSONResponse(resp, 'Failed to lock thread');
  },

  /**
   * Attempts to delete a comment
   * @param id id of the comment to delete
   * @returns result of the operation
   */
  deleteComment: async (id: string): Promise<QPixelResponseJSON> => {
    const resp = await QPixel.fetchJSON(`/comments/${id}/delete`, {}, {
      headers: { 'Accept': 'application/json' },
      method: 'DELETE'
    });

    return QPixel.parseJSONResponse(resp, 'Failed to delete comment');
  },

  /**
   * Attempts to start following comments on a given post
   * @param postId id of the post to follow comments on
   * @returns result of the operation
   */
  followComments: async (postId: string): Promise<QPixelResponseJSON> => {
    const resp = await QPixel.fetchJSON(`/comments/post/${postId}/follow`, {}, {
      headers: { 'Accept': 'application/json' }
    });

    return QPixel.parseJSONResponse(resp, 'Failed to follow post comments');
  },

  /**
   * Attempts to delete a given post draft
   * @returns result of the operation
   */
  deleteDraft: async (): Promise<QPixelResponseJSON> => {
    const resp = await QPixel.fetchJSON(`/posts/delete-draft`, {
      path: location.pathname
    }, {
      headers: { 'Accept': 'application/json' }
    });

    return QPixel.parseJSONResponse(resp, 'Failed to delete post draft');
  },

  /**
   * Attempts to undelete a comment
   * @param id id of the comment to undelete
   * @returns result of the operation
   */
  undeleteComment: async (id: string): Promise<QPixelResponseJSON> => {
    const resp = await QPixel.fetchJSON(`/comments/${id}/delete`, {}, {
      headers: { 'Accept': 'application/json' },
      method: 'PATCH'
    });

    return QPixel.parseJSONResponse(resp, 'Failed to undelete comment');
  },

  /**
   * Attempts to stop following comments on a given post
   * @param postId id of the post to stop following comments on
   * @returns result of the operation
   */
  unfollowComments: async (postId: string): Promise<QPixelResponseJSON> => {
    const resp = await QPixel.fetchJSON(`/comments/post/${postId}/unfollow`, {}, {
      headers: { 'Accept': 'application/json' }
    });

    return QPixel.parseJSONResponse(resp, 'Failed to unfollow post comments');
  },

  /**
   * Attempts to rename a tag
   * @param categoryId id of the category to rename the tag in
   * @param tagId id of the tag to rename
   * @param name new tag name
   * @returns result of the operation
   */
  renameTag: async (categoryId: string, tagId: string, name: string): Promise<QPixelResponseJSON> => {
    const resp = await QPixel.fetchJSON(`/categories/${categoryId}/tags/${tagId}/rename`, { name }, {
      headers: { 'Accept': 'application/json' }
    });

    return QPixel.parseJSONResponse(resp, 'Failed to rename tag');
  },

  /**
   * Attempts to retract a vote
   * @param id id of the vote to retract
   * @returns result of the operation
   */
  retractVote: async (id: string): Promise<QPixelRetractVoteResponseJSON> => {
    const resp = await QPixel.fetchJSON(`/votes/${id}`, {}, { method: 'DELETE' });

    return QPixel.parseJSONResponse(resp, 'Failed to retract vote');
  },

  /**
   * Attempts to save a post draft
   * @param draft draft to save
   * @returns result of the operation
   */
  saveDraft: async (draft: QPixelDraft): Promise<QPixelResponseJSON> => {
    const resp = await QPixel.fetchJSON('/posts/save-draft', {
      ...draft,
      path: location.pathname
    });

    return QPixel.parseJSONResponse(resp, 'Failed to save draft');
  },
};
