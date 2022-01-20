//Import modules
const helper = require('../personal_modules/helper.module.js');
const db = require('../personal_modules/database.module.js');
const embed = require('../personal_modules/embed.module.js');

//Import config file for prefix
const {prefix} = require('../config.json');

module.exports = {

    //The command for discord
    data: {
        type: 'CHAT_INPUT',
        defaultPermission: true,
        name: 'remove',
        description: 'Remove a wiki from this server.',
        options: [
            {
                type: 'STRING',
                name: 'wiki',
                description: 'The abbreviation, name or url of the wiki to remove.',
                required: true,
                autocomplete: true
            }
        ]
    },

    //Additional info for permissions and help command
    category: 'Wiki',
    longDescription: 'With this command you can remove a wiki from your server. You can do this by providing either the wiki\'s abbreviation, name or url (in the format `https://example.com`).',
    usage: '[wiki abbreviation, name or url]',
    guildOnly: true,
    adminOnly: true,
    dmOnly: false,

    //Command code
    async execute(interaction){

        //Try to delete the wiki
        let msg;
        try{
            const res = await db.query('delete from wiki where guild_id = $1 and (abbreviation = $2 or url = $2 or name ilike $2)',
                [interaction.guild.id, interaction.options.getString('wiki').replace(/\/+$/, '')]);
            msg = {content: (res.rowCount > 0? 'The wiki has been deleted!' : 'There exists no wiki with that abbreviation, name or url.'), ephemeral: true};
        }
        catch(e) {
            msg = embed.createErrorEmbed();
            console.error(e)
        }

        interaction.reply(msg).catch(console.error)
    },

    //Function for autocompletions
    async autocomplete(currentArgument, currentValue, interaction){

        //Retrieve all wikis registrered for this server
        const res = await db.query('select name, abbreviation, url from wiki where guild_id = $1', [interaction.guild.id]);

        //Create and return suggestions
        let suggestions = [];
        for(row of res.rows)
            for(value of Object.values(row)) 
                if(value.toLowerCase().includes(currentValue.toLowerCase())) 
                    suggestions.push(value); 
        
        return suggestions.sort();
    }
};