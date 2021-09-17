//Import config file for prefix
const {prefix} = require('../config.json');
const helper = require('../personal_modules/helper.module.js');

module.exports = {
    name: 'help',
    aliases: ['h', 'commands'],
    shortDesc: 'List all commands or get help for a single command.',
    description: 'This command can be used to get a list of all commands or more info about a certain command.',
    usage: '[Command Name]',
    argsOpt: true,
    guildOnly: false,
    ownerOnly: false,
    dmOnly: false,
    delGuildMsg: false,
    async execute(message, args){
        //Import the commands and make empty data array
        const{commands} = message.client;
        const data = [];

        //When no arguments are specified, return a list of all possible commands, categorized by a given category.
        if(!args.length){
            data.push('These are all of my commands:');

            //Setup the categories
            const categories = {};
            commands.forEach(command => {
                let category = command.category || 'Other';
                if(categories[category] == null) categories[category] = [];
                categories[category].push(command)
            });

            //Add the commands to the message
            Object.entries(categories).forEach(cat => {
                if (cat[0] !== 'Other'){
                    data.push('\n__*'+cat[0]+'*__');
                    data.push(cat[1].map(command => '`'+prefix + command.name+'`' + (command.ownerOnly? ' (owner only)' : '') + (command.adminOnly? ' (admin only)' : '')
                        + (command.shortDesc != null? ' | ' + command.shortDesc : '')).join('\n'));
                }
            });
            data.push('\n__*Other*__');
            data.push(categories['Other'].map(command => '`'+prefix + command.name+'`' + (command.ownerOnly? ' (owner only)' : '') + (command.adminOnly? ' (admin only)' : '')
                + (command.shortDesc != null? ' | ' + command.shortDesc : '')).join('\n'));
            data.push('\nType `' + prefix + 'help [command name]` to get more info about a specific command.');

            return message.reply(data.join('\n')).catch(console.error);
        }

        //Send specific information about a command.
        const commandName = args[0].toLowerCase();
        const command = commands.get(commandName) || commands.find(cmd => cmd.aliases && cmd.aliases.includes(commandName));

        if(!command){
            return message.reply('That is not a valid command.').catch(console.error)
        }

        data.push('\n**Command: **`' + prefix + command.name + (command.usage? ' ' + command.usage : '') + '`');
        if(command.extraFunc) data.push('\n' + await command.extraFunc(message));
        if(command.aliases) data.push('\n**Aliases: **' + command.aliases.join(', '));
        if(command.description) data.push('\n**Description: **' + command.description);
        return message.reply(data.join('\n')).catch(console.error);
    }
};