
/**
 * @class The Error when the page is invalid.
 */
class InvalidPageError extends Error {
    constructor(message) {
        super(message);
        this.name = 'Invalid Page Error';
    }
}