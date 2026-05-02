/**
 * @typedef {Object} Player
 * @property {string} id
 * @property {string} name
 * @property {number} score
 * @property {number} rank
 * @property {string} avatar
 * @property {boolean} isCurrent
 * @property {boolean} isDrawing
 */

/**
 * @typedef {Object} Room
 * @property {string} id
 * @property {string} language
 * @property {number} round
 * @property {number} totalRounds
 */

/**
 * @typedef {Object} Message
 * @property {string} id
 * @property {string} playerName
 * @property {string} text
 * @property {"system"|"player"} type
 * @property {boolean} [isCorrect]
 */

export {};
