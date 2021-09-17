//Import config
const {prefix} = require('../config.json');
const calc = require('../personal_modules/calc.module.js');

module.exports = {
    name: 'calc',
    aliases: ['c'],
    shortDesc: 'Calculate something.',
    category: 'Utilities',
    description: 'Use this command to calculate a simple arithmetical sum, only containing addition \'+\', subtraction \'-\', multiplication \'*\', division \'/\' and power \'^\'' +
        ' operators. You can also enclose something in brackets \'()\' to indicate that that should be calculated first.' +
        '\nExample: `'+prefix+'calc (2+3) * 5`',
    usage: '[Arithmetic Sum]',
    argsOpt: false,
    guildOnly: false,
    adminOnly: false,
    dmOnly: false,
    delGuildMsg: false,
    async execute(message, args){
        const sum = args.join('');
        message.reply('Answer: `' + calc.solveString(sum) + '`');
    }
};