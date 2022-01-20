//Import modules
const { SlashCommandBuilder } = require('@discordjs/builders');
const fs = require('fs');
const helper = require('../personal_modules/helper.module.js');

//Create the help command for discord
slashCommand =  {
    type: 'CHAT_INPUT',
    defaultPermission: true,
    name: 'help',
    description: 'List all commands (no arguments) or get extended help for a single command.',
    options: [
        {
            type: 'STRING',
            name: 'command',
            description: 'The command to provide extended help for.',
            required: false,
            autocomplete: true
        }
    ]
},

module.exports = {

    //The command for discord
    data: slashCommand,
                
    //Additional info for permissions and help command
    longDescription: 'This command can be used to get a list of all commands (no arguments) or more info about a certain command.',
    usage: '[command name - optional]',
    guildOnly: false,

    //Command code
    async execute(interaction){

        //Import all commands and make empty data array
        const {commands} = interaction.client;
        const data = [];

        //When no arguments are specified, return a list of all possible commands, categorized by a given category.
        const helpCommand = interaction.options.getString('command');
        if(helpCommand == null){
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
                    data.push(cat[1].map(command => '`/' + command.data.name +'`' + (command.botOwnerOnly? ' (bot owner only)' : '') + (command.ownerOnly? ' (owner only)' : '') + (command.adminOnly? ' (admin only)' : '')
                        + '\t' + command.data.description).join('\n'));
                }
            });
            data.push('\n__*Other*__');
            data.push(categories['Other'].map(command => '`/' + command.data.name +'`' + (command.botOwnerOnly? ' (bot owner only)' : '') + (command.ownerOnly? ' (owner only)' : '') + (command.adminOnly? ' (admin only)' : '')
                + '\t' + command.data.description).join('\n'));
            data.push('\nType `/' + 'help [command name]` to get more info about a specific command.');

            return interaction.reply({content: data.join('\n'), ephemeral: true});
        }

        //Send specific information about a command.
        const command = commands.get(helpCommand)

        if(!command){
            return interaction.reply({content: 'That is not a valid command.', ephemeral: true})
        }

        data.push('\n**Command: **`/' + helpCommand + (command.usage? ' ' + command.usage : '') + '`');
        if(command.dynamicUsage){
            dynamicUsage = await command.dynamicUsage(interaction);
            data.push('\n' + dynamicUsage);
        }
        if(command.longDescription) data.push('\n**Description: **' + command.longDescription);
        return interaction.reply({content: data.join('\n'), ephemeral: true});
    },

    //Function for autocompletions
    async autocomplete(currentArgument, currentValue, interaction){
        commands = await interaction.client.application.commands.fetch();
        return commands
            .filter(command => command.name.includes(currentValue))
            .map(command => command.name);
    }
};

