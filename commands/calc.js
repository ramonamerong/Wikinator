//Import config
const {prefix} = require('../config.json');
const calc = require('../personal_modules/calc.module.js');

module.exports = {

    //The command for discord
    data: {
        type: 'CHAT_INPUT',
        defaultPermission: true,
        name: 'calc',
        description: 'Calculate something like `/calc (2+3) * 5`.',
        options: [
            {
                type: 'STRING',
                name: 'expression',
                description: 'The mathematical expression to solve',
                required: false,
            }
        ]
    },

    //Additional info for permissions and help command
    longDescription: 'Use this command to calculate a simple arithmetical sum, only containing addition \'+\', subtraction \'-\', multiplication \'*\', division \'/\' and power \'^\'' +
        ' operators. You can also enclose something in brackets \'()\' to indicate that that should be calculated first.' +
        '\nExample: `/calc (2+3) * 5`',
    usage: '[mathematical expression]',
    guildOnly: false,
    adminOnly: false,
    dmOnly: false,

    //Command code
    async execute(interaction){
        const expression = args.join('');
        await interaction.reply('Answer: `' + calc.solveString(expression) + '`');
    }
};