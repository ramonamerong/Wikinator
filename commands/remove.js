//Import modules
const helper = require('../personal_modules/helper.module.js');
const db = require('../personal_modules/database.module.js');

//Import config file for prefix
const {prefix} = require('../config.json');

module.exports = {
    name: 'remove',
    shortDesc: 'Remove a wiki from this server.',
    category: 'Wiki - Managing',
    description: 'With this command you can remove a wiki from your server. You can do this by providing either the wiki\'s abbreviation, name or url (in the format `https://example.com`).',
    usage: '[Wiki abbreviation, name or url]',
    argsOpt: false,
    guildOnly: true,
    adminOnly: true,
    dmOnly: false,
    delGuildMsg: false,
    async execute(message, args){

        //Try to delete the wiki
        let msg;
        try{
            const res = await db.query('delete from wiki where guild_id = $1 and (abbreviation = $2 or url = $2 or name ilike $2)',
                [message.guild.id, args[0].replace(/\/+$/, '')]);
            msg = res.rowCount > 0? 'The wiki has been deleted!' : 'There exists no wiki with that abbreviation, name or url.';
        }
        catch(e) {
            msg = 'Something went wrong.';
            console.error(e)
        }

        message.reply(msg).catch(console.error)
    }
};