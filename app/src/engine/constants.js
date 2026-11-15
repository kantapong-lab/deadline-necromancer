// สัดส่วนฝั่งตามจำนวนผู้เล่น [แสง, มืด, อิสระ] (ตาม player_rules)
const COMP = { 6: [4, 1, 1], 7: [4, 2, 1], 8: [5, 2, 1], 9: [6, 2, 1], 10: [7, 2, 1], 11: [7, 2, 2], 12: [7, 2, 3] };
const MIN_PLAYERS = 6, MAX_PLAYERS = 12;
const EMOJIS = ['👍', '🤔', '😡', '😂', '🙏'];

module.exports = { COMP, MIN_PLAYERS, MAX_PLAYERS, EMOJIS };
