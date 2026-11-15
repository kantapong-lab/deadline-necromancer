// สัดส่วนฝั่งตามจำนวนผู้เล่น [แสง, มืด, อิสระ] (ตาม player_rules)
const COMP = { 6: [4, 2, 0], 7: [4, 2, 1], 8: [5, 2, 1], 9: [5, 2, 2], 10: [6, 2, 2], 11: [6, 2, 3], 12: [7, 2, 3] };
const MIN_PLAYERS = 6, MAX_PLAYERS = 12;
const EMOJIS = ['👍', '🤔', '😡', '😂', '🙏'];

module.exports = { COMP, MIN_PLAYERS, MAX_PLAYERS, EMOJIS };
