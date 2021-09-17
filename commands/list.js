//Import modules
const helper = require('../personal_modules/helper.module.js');
const db = require('../personal_modules/database.module.js');
const embed = require('../personal_modules/embed.module.js');

//Import config file for prefix
const {prefix} = require('../config.json');
const wikiConfig = require('../config.json').commands.wiki;

module.exports = {
    name: 'list',
    shortDesc: 'List all available wikis on this server.',
    category: 'Wiki - Browsing',
    description: 'Use this command to get a list of all available wikis to this server. The wiki\'s name and abbreviation will both be displayed.',
    usage: '',
    argsOpt: true,
    guildOnly: true,
    ownerOnly: false,
    dmOnly: false,
    delGuildMsg: false,
    async execute(message, args){

        //Try to retrieve all wikis from this server the wiki
        let msg;
        try{

            //Retrieve everything from the database
            const res = await db.query('select * from wiki where guild_id = $1',
                [message.guild.id]);

            //Create an embed
            const e = embed.createListEmbed(
                wikiConfig.embed,
                'Wikis available on this server',
                'Below is a list of all available wikis with their abbreviations.' +
                '\nClick on a wiki to go to the website.',
                null,
                null,
                'Wiki name | Abbreviation',
                null,
                res.rows.map(r => {
                    r.title = r.name + ' | `' + r.abbreviation + '`';
                    return r;
                }),
                false
            );

            return await embed.sendEmbed(wikiConfig.embed, message, e)
        }
        catch(e) {
            msg = 'Something went wrong.';
            console.error(e)
        }

        message.reply(msg).catch(console.error)
    }
};