// Type declarations for _expose.html.erb
declare global {
    interface ExposedProperties {
        /**
         * List of HTML tags allowed in posts, supplied by the server
         */
        readonly ALLOWED_POST_TAGS?: readonly string[]
        /**
         * List of attributes allowed on HTML tags in posts, supplied by the server
         */
        readonly ALLOWED_POST_ATTRS?: readonly string[]
        /**
         * Currently used locale (BCP 47 language tag), supplied by the server
         */
        readonly LOCALE?: string
        /**
         * Maximum file upload size (in bytes), supplied by the server
         */
        readonly MAX_UPLOAD_SIZE?: number
    }

    var exposedProperties: ExposedProperties;
}

export { };